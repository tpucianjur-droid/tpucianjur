import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const VERIFY_FIELDS = [
  "verify_deceased_name",
  "verify_death_date",
  "verify_heir_name",
  "verify_heir_phone",
  "verify_heir_address",
  "verify_location",
];

const SNAPSHOT_FIELDS = ["id", "grave_code", "verification_status", ...VERIFY_FIELDS, "updated_at"];
const RECOVERY_DIR = path.resolve("recovery");
const RECOVERY_START_AUDIT_ID = 224;

async function loadEnv(fileName = ".env.local") {
  const raw = await fs.readFile(path.resolve(fileName), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

async function getAdminSession() {
  await loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!url || !key || !email || !password) throw new Error("Konfigurasi Supabase/admin tidak lengkap di .env.local");

  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(`Login admin gagal (${response.status}): ${await response.text()}`);
  const auth = await response.json();
  return { url, key, token: auth.access_token };
}

async function fetchAll(session, table, select, queryParams = {}) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const params = new URLSearchParams({ select, ...queryParams });
    const response = await fetch(`${session.url}/rest/v1/${table}?${params}`, {
      headers: {
        apikey: session.key,
        authorization: `Bearer ${session.token}`,
        range: `${from}-${from + pageSize - 1}`,
      },
    });
    if (!response.ok) throw new Error(`Query ${table} gagal (${response.status}): ${await response.text()}`);
    const data = await response.json();
    rows.push(...data);
    if (data.length < pageSize) return rows;
  }
}

async function patchRows(session, table, ids, values) {
  const params = new URLSearchParams({
    id: `in.(${ids.join(",")})`,
    archived_at: "is.null",
    select: "id,grave_code,verification_status," + VERIFY_FIELDS.join(","),
  });
  const response = await fetch(`${session.url}/rest/v1/${table}?${params}`, {
    method: "PATCH",
    headers: {
      apikey: session.key,
      authorization: `Bearer ${session.token}`,
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: JSON.stringify(values),
  });
  if (!response.ok) throw new Error(`Update ${table} gagal (${response.status}): ${await response.text()}`);
  return response.json();
}

function compactState(row) {
  return Object.fromEntries(SNAPSHOT_FIELDS.map((field) => [field, row?.[field] ?? null]));
}

function timestampForFile() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function latestFile(prefix) {
  const names = await fs.readdir(RECOVERY_DIR);
  const candidates = names.filter((name) => name.startsWith(prefix) && name.endsWith(".json")).sort();
  if (!candidates.length) throw new Error(`File ${prefix}*.json tidak ditemukan`);
  return path.join(RECOVERY_DIR, candidates.at(-1));
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function snapshot() {
  const session = await getAdminSession();
  const graves = await fetchAll(session, "graves", SNAPSHOT_FIELDS.join(","), {
    archived_at: "is.null",
    order: "grave_code.asc",
  });
  await fs.mkdir(RECOVERY_DIR, { recursive: true });
  const file = path.join(RECOVERY_DIR, `verification-backup-${timestampForFile()}.json`);
  const payload = {
    created_at: new Date().toISOString(),
    source: process.env.NEXT_PUBLIC_SUPABASE_URL,
    filter: "archived_at IS NULL",
    record_count: graves.length,
    records: graves.map(compactState),
  };
  await fs.writeFile(file, `${JSON.stringify(payload, null, 2)}\n`, { flag: "wx" });
  console.log(JSON.stringify({ file, record_count: graves.length }, null, 2));
}

async function snapshotFull() {
  const session = await getAdminSession();
  const graves = await fetchAll(session, "graves", "*", {
    archived_at: "is.null",
    order: "grave_code.asc",
  });
  await fs.mkdir(RECOVERY_DIR, { recursive: true });
  const file = path.join(RECOVERY_DIR, `grave-integrity-before-${timestampForFile()}.json`);
  await fs.writeFile(
    file,
    `${JSON.stringify({ created_at: new Date().toISOString(), record_count: graves.length, records: graves }, null, 2)}\n`,
    { flag: "wx" },
  );
  console.log(JSON.stringify({ file, record_count: graves.length }, null, 2));
}

async function exportAudit() {
  const session = await getAdminSession();
  const logs = await fetchAll(
    session,
    "audit_logs",
    "id,actor_user_id,entity_type,entity_id,action,before_data,after_data,created_at",
    { entity_type: "eq.graves", order: "created_at.asc,id.asc" },
  );
  await fs.mkdir(RECOVERY_DIR, { recursive: true });
  const file = path.join(RECOVERY_DIR, `grave-audit-export-${timestampForFile()}.json`);
  await fs.writeFile(file, `${JSON.stringify({ created_at: new Date().toISOString(), record_count: logs.length, logs }, null, 2)}\n`, {
    flag: "wx",
  });
  console.log(JSON.stringify({ file, record_count: logs.length }, null, 2));
}

function verificationState(row) {
  return Object.fromEntries(["verification_status", ...VERIFY_FIELDS].map((field) => [field, row?.[field] ?? null]));
}

function sameState(left, right) {
  return JSON.stringify(verificationState(left)) === JSON.stringify(verificationState(right));
}

function countStatuses(records) {
  return {
    VERIFIED: records.filter((row) => row.verification_status === "VERIFIED").length,
    NEEDS_VERIFICATION: records.filter((row) => row.verification_status === "NEEDS_VERIFICATION").length,
  };
}

async function buildPlan() {
  const backupFile = await latestFile("verification-backup-");
  const auditFile = await latestFile("grave-audit-export-");
  const backup = await readJson(backupFile);
  const audit = await readJson(auditFile);
  const activeIds = new Set(backup.records.map((row) => row.id));
  const reconstructed = new Map(backup.records.map((row) => [row.id, { ...row }]));
  const rollbackLogs = audit.logs
    .filter((log) => Number(log.id) >= RECOVERY_START_AUDIT_ID && activeIds.has(log.entity_id))
    .sort((a, b) => Number(b.id) - Number(a.id));

  for (const log of rollbackLogs) {
    if (log.action === "UPDATE" && log.before_data) reconstructed.set(log.entity_id, { ...reconstructed.get(log.entity_id), ...log.before_data });
  }

  const firstEvent = audit.logs.find((log) => Number(log.id) === RECOVERY_START_AUDIT_ID);
  if (!firstEvent?.before_data || firstEvent.before_data.grave_code !== "A-003") {
    throw new Error("Guard gagal: audit awal recovery bukan A-003/update yang diharapkan");
  }

  const records = backup.records
    .map((current) => {
      const target = reconstructed.get(current.id);
      if (sameState(current, target)) return null;
      const restoredFields = VERIFY_FIELDS.filter((field) => current[field] !== target[field]);
      return {
        id: current.id,
        grave_code: current.grave_code,
        current: verificationState(current),
        restore: verificationState(target),
        restored_fields: restoredFields,
      };
    })
    .filter(Boolean);

  const targetRecords = backup.records.map((current) => ({ ...current, ...verificationState(reconstructed.get(current.id)) }));
  const plan = {
    created_at: new Date().toISOString(),
    source_backup: backupFile,
    source_audit: auditFile,
    recovery_point: {
      before_audit_id: RECOVERY_START_AUDIT_ID,
      before_timestamp_utc: firstEvent.created_at,
      before_timestamp_jakarta: new Date(firstEvent.created_at).toLocaleString("sv-SE", { timeZone: "Asia/Jakarta" }) + " +07:00",
      first_affected_record: firstEvent.before_data.grave_code,
      actor_user_id: firstEvent.actor_user_id,
    },
    active_total: backup.records.length,
    current_counts: countStatuses(backup.records),
    restore_counts: countStatuses(targetRecords),
    unchanged_verified: targetRecords.filter((row) => row.verification_status === "VERIFIED").length,
    records_to_restore: records,
  };
  await fs.mkdir(RECOVERY_DIR, { recursive: true });
  const file = path.join(RECOVERY_DIR, `verification-recovery-plan-${timestampForFile()}.json`);
  await fs.writeFile(file, `${JSON.stringify(plan, null, 2)}\n`, { flag: "wx" });
  console.log(
    JSON.stringify(
      {
        file,
        recovery_point: plan.recovery_point,
        active_total: plan.active_total,
        current_counts: plan.current_counts,
        restore_counts: plan.restore_counts,
        records_to_restore: records.length,
        codes: records.map((record) => record.grave_code),
        preview: records.map((record) => ({
          grave_code: record.grave_code,
          current: record.current.verification_status,
          restore_to: record.restore.verification_status,
          verify_fields_restored: record.restored_fields,
        })),
      },
      null,
      2,
    ),
  );
}

function withoutVerification(row) {
  const excluded = new Set(["updated_at", "verification_status", ...VERIFY_FIELDS]);
  return Object.fromEntries(Object.entries(row).filter(([key]) => !excluded.has(key)));
}

async function applyPlan() {
  const planFile = await latestFile("verification-recovery-plan-");
  const integrityFile = await latestFile("grave-integrity-before-");
  const plan = await readJson(planFile);
  const integrity = await readJson(integrityFile);
  const session = await getAdminSession();
  const current = await fetchAll(session, "graves", SNAPSHOT_FIELDS.join(","), {
    archived_at: "is.null",
    order: "grave_code.asc",
  });
  const currentById = new Map(current.map((row) => [row.id, row]));

  if (current.length !== plan.active_total) throw new Error(`Guard gagal: total aktif berubah (${current.length})`);
  for (const record of plan.records_to_restore) {
    const actual = currentById.get(record.id);
    if (!actual || !sameState(actual, record.current)) {
      throw new Error(`Guard gagal: state ${record.grave_code} berubah setelah preview`);
    }
  }

  const groups = new Map();
  for (const record of plan.records_to_restore) {
    const key = JSON.stringify(record.restore);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }

  let updated = 0;
  for (const [serializedState, records] of groups) {
    const state = JSON.parse(serializedState);
    for (let index = 0; index < records.length; index += 20) {
      const chunk = records.slice(index, index + 20);
      const result = await patchRows(session, "graves", chunk.map((record) => record.id), state);
      if (result.length !== chunk.length) {
        throw new Error(`Update parsial: diminta ${chunk.length}, database mengembalikan ${result.length}`);
      }
      for (const row of result) {
        const expected = chunk.find((record) => record.id === row.id);
        if (!expected || !sameState(row, expected.restore)) throw new Error(`Hasil update tidak sesuai untuk ${row.grave_code}`);
      }
      updated += result.length;
      console.log(`Restored ${updated}/${plan.records_to_restore.length}`);
    }
  }

  const after = await fetchAll(session, "graves", "*", { archived_at: "is.null", order: "grave_code.asc" });
  const afterById = new Map(after.map((row) => [row.id, row]));
  const stateMismatches = [];
  for (const record of plan.records_to_restore) {
    const actual = afterById.get(record.id);
    if (!actual || !sameState(actual, record.restore)) stateMismatches.push(record.grave_code);
  }

  const integrityMismatches = [];
  for (const before of integrity.records) {
    const actual = afterById.get(before.id);
    if (!actual || JSON.stringify(withoutVerification(actual)) !== JSON.stringify(withoutVerification(before))) {
      integrityMismatches.push(before.grave_code);
    }
  }

  const allRows = await fetchAll(session, "graves", "id,grave_code,verification_status,archived_at", {
    order: "grave_code.asc",
  });
  const archived = allRows.filter((row) => row.archived_at !== null).length;
  const counts = countStatuses(after);
  const report = {
    applied_at: new Date().toISOString(),
    plan_file: planFile,
    integrity_source: integrityFile,
    records_updated: updated,
    active_total: after.length,
    verified: counts.VERIFIED,
    needs_verification: counts.NEEDS_VERIFICATION,
    archived,
    state_mismatches: stateMismatches,
    non_verification_data_mismatches: integrityMismatches,
  };
  const reportFile = path.join(RECOVERY_DIR, `verification-recovery-result-${timestampForFile()}.json`);
  await fs.writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
  console.log(JSON.stringify({ report_file: reportFile, ...report }, null, 2));

  if (updated !== plan.records_to_restore.length || stateMismatches.length || integrityMismatches.length) {
    throw new Error("Validasi recovery gagal; lihat report_file");
  }
  if (counts.VERIFIED !== plan.restore_counts.VERIFIED || counts.NEEDS_VERIFICATION !== plan.restore_counts.NEEDS_VERIFICATION) {
    throw new Error("Count setelah recovery tidak sama dengan hasil rekonstruksi audit");
  }
}

const command = process.argv[2];
if (command === "snapshot") await snapshot();
else if (command === "snapshot-full") await snapshotFull();
else if (command === "export-audit") await exportAudit();
else if (command === "plan") await buildPlan();
else if (command === "apply") await applyPlan();
else throw new Error("Gunakan: node scripts/verification-recovery.mjs snapshot|snapshot-full|export-audit|plan|apply");
