// Audit keamanan LIVE terhadap Supabase HOSTED di level database/API (PostgREST, Auth, Storage) — bukan UI.
// Hanya memakai publishable key + akun uji dari .env.local (E2E_ADMIN_* terdaftar di admin_users, E2E_USER_* bukan Admin).
// Tidak memakai service-role/secret key. Data uji dibuat di Blok D lalu dihapus; 149 data awal tidak diubah.
// Jalankan: npm run test:security:live
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const envPath = join(process.cwd(), ".env.local");
const fileEnv = existsSync(envPath)
  ? Object.fromEntries(
      readFileSync(envPath, "utf8")
        .split(/\r?\n/)
        .filter((line) => /^[A-Z0-9_]+=/.test(line))
        .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1).trim()]),
    )
  : {};
const env = { ...fileEnv, ...process.env };
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
for (const name of ["E2E_ADMIN_EMAIL", "E2E_ADMIN_PASSWORD", "E2E_USER_EMAIL", "E2E_USER_PASSWORD"]) {
  if (!env[name]) throw new Error(`${name} belum diisi di .env.local`);
}
if (!URL_ || !KEY || URL_.includes("YOUR-PROJECT-REF")) throw new Error("Supabase hosted belum dikonfigurasi di .env.local");

const HEIR_NAME_A001 = "Indra Mawana Yusuf"; // ahli waris A-001 pada seed (nama boleh tampil di publik; telepon/alamat tidak)
const results = [];
function check(group, name, ok, detail = "") {
  results.push({ group, name, ok: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"}  [${group}] ${name}${detail && !ok ? ` — ${detail}` : ""}`);
}

async function call(token, method, path, body, extraHeaders = {}) {
  const headers = { apikey: KEY, ...extraHeaders };
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload = body;
  if (body !== undefined && !(body instanceof Uint8Array) && typeof body !== "string") {
    headers["Content-Type"] ??= "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(URL_ + path, { method, headers, body: payload });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { status: res.status, text, json };
}
const rest = (token, method, path, body, prefer = "return=representation") =>
  call(token, method, `/rest/v1/${path}`, body, prefer ? { Prefer: prefer } : {});
const denied = (r) => r.status >= 400;
const emptyList = (r) => r.status === 200 && Array.isArray(r.json) && r.json.length === 0;

async function login(email, password) {
  const r = await call(null, "POST", "/auth/v1/token?grant_type=password", { email, password });
  if (r.status !== 200 || !r.json?.access_token) throw new Error(`Login ${email} gagal (HTTP ${r.status})`);
  return { token: r.json.access_token, id: r.json.user.id };
}

const admin = await login(env.E2E_ADMIN_EMAIL, env.E2E_ADMIN_PASSWORD);
const user = await login(env.E2E_USER_EMAIL, env.E2E_USER_PASSWORD);

// Data referensi (dibaca Admin) untuk memastikan percobaan non-admin tidak mengubah apa pun.
const a001Before = (await rest(admin.token, "GET", "graves?grave_code=eq.A-001&select=id,deceased_name,heir_name,heir_phone,heir_address,updated_at", undefined, null)).json[0];
const blockD = (await rest(null, "GET", "blocks?code=eq.D&select=id,cemetery_id,name", undefined, null)).json[0];
const cemeteryBefore = (await rest(null, "GET", "cemeteries?select=id,name", undefined, null)).json[0];
const privateCols = ["heir_phone", "heir_address", "verify_", "transcription_", "source_file", "legacy_no", "recorded_date_raw", "archived_at", "is_public"];

// =====================================================================
// PUBLIC / ANON
// =====================================================================
{
  const g = "anon";
  check(g, "tabel graves ditolak", denied(await rest(null, "GET", "graves?select=id&limit=1", undefined, null)));
  check(g, "kolom ahli waris di graves ditolak", denied(await rest(null, "GET", "graves?select=heir_name,heir_phone,heir_address&limit=1", undefined, null)));
  const view = await rest(null, "GET", "public_graves?select=*&limit=1000", undefined, null);
  const cols = view.json?.[0] ? Object.keys(view.json[0]) : [];
  check(g, "public_graves terbaca 149 baris", view.status === 200 && view.json.length === 149, `HTTP ${view.status}, ${view.json?.length}`);
  check(g, "public_graves tanpa kolom privat/verifikasi", cols.length > 0 && !cols.some((c) => privateCols.some((p) => c.startsWith(p))), cols.join(","));
  check(g, "public_graves memuat nama ahli waris", view.text.includes(HEIR_NAME_A001));
  check(g, "respons publik tidak memuat telepon/alamat ahli waris", !(a001Before.heir_phone && view.text.includes(a001Before.heir_phone)) && !(a001Before.heir_address && view.text.includes(a001Before.heir_address)));
  check(g, "select heir_phone via view ditolak", denied(await rest(null, "GET", "public_graves?select=heir_phone", undefined, null)));
  check(g, "select heir_address via view ditolak", denied(await rest(null, "GET", "public_graves?select=heir_address", undefined, null)));
  const search = await rest(null, "POST", "rpc/search_public_graves", { p_query: "sutiar" }, null);
  check(g, "RPC pencarian publik jalan tanpa field privat", search.status === 200 && search.json.some((r) => r.grave_code === "A-001") && !/heir_phone|heir_address|verify_/.test(search.text));
  check(g, "audit_logs ditolak", denied(await rest(null, "GET", "audit_logs?select=id&limit=1", undefined, null)));
  check(g, "admin_users ditolak", denied(await rest(null, "GET", "admin_users?select=user_id", undefined, null)));
  check(g, "block_grave_counts ditolak", denied(await rest(null, "GET", "block_grave_counts?select=*", undefined, null)));
  check(g, "is_admin() = false", (await rest(null, "POST", "rpc/is_admin", {}, null)).json === false);
  check(g, "INSERT graves ditolak", denied(await rest(null, "POST", "graves", { cemetery_id: blockD.cemetery_id, block_id: blockD.id, grave_number: 99001, grave_code: "X", deceased_name: "Anon" })));
  check(g, "UPDATE graves ditolak", denied(await rest(null, "PATCH", `graves?id=eq.${a001Before.id}`, { deceased_name: "Diubah Anon" })));
  check(g, "DELETE graves ditolak", denied(await rest(null, "DELETE", `graves?id=eq.${a001Before.id}`)));
  check(g, "UPDATE cemeteries ditolak", denied(await rest(null, "PATCH", `cemeteries?id=eq.${cemeteryBefore.id}`, { name: "Diubah Anon" })));
  check(g, "INSERT blocks ditolak", denied(await rest(null, "POST", "blocks", { cemetery_id: blockD.cemetery_id, code: "Z", name: "Blok Z" })));
  const signup = await call(null, "POST", "/auth/v1/signup", { email: `signup.${Date.now()}@example.com`, password: "Sangat-Rahasia-123" });
  check(g, "signup publik dimatikan", signup.status >= 400, `HTTP ${signup.status}`);
  check(g, "upload storage ditolak", denied(await call(null, "POST", "/storage/v1/object/grave-photos/anon-test/cover.webp", new Uint8Array([1, 2, 3]), { "Content-Type": "image/webp" })));
  const list = await call(null, "POST", "/storage/v1/object/list/grave-photos", { prefix: "", limit: 100 });
  check(g, "listing bucket foto tidak membuka isi", denied(list) || emptyList(list), `HTTP ${list.status}`);
}

// =====================================================================
// AUTHENTICATED NON-ADMIN
// =====================================================================
{
  const g = "non-admin";
  const t = user.token;
  check(g, "is_admin() = false", (await rest(t, "POST", "rpc/is_admin", {}, null)).json === false);
  check(g, "graves (termasuk ahli waris) tidak terbaca", emptyList(await rest(t, "GET", "graves?select=id,heir_name,heir_phone,heir_address", undefined, null)));
  check(g, "audit_logs tidak terbaca", emptyList(await rest(t, "GET", "audit_logs?select=id", undefined, null)));
  check(g, "admin_users kosong untuk non-admin", emptyList(await rest(t, "GET", "admin_users?select=user_id", undefined, null)));
  check(g, "tidak bisa mendaftarkan diri sebagai Admin", denied(await rest(t, "POST", "admin_users", { user_id: user.id, email: env.E2E_USER_EMAIL })));
  check(g, "INSERT graves ditolak (RLS)", denied(await rest(t, "POST", "graves", { cemetery_id: blockD.cemetery_id, block_id: blockD.id, grave_number: 99002, grave_code: "X", deceased_name: "Non Admin" })));
  const upd = await rest(t, "PATCH", `graves?id=eq.${a001Before.id}`, { deceased_name: "Diubah NonAdmin", heir_phone: "000" });
  check(g, "UPDATE graves tidak mengubah baris", denied(upd) || emptyList(upd));
  const del = await rest(t, "DELETE", `graves?id=eq.${a001Before.id}`);
  check(g, "DELETE graves tidak menghapus baris", denied(del) || emptyList(del));
  const cem = await rest(t, "PATCH", `cemeteries?id=eq.${cemeteryBefore.id}`, { name: "Diubah NonAdmin" });
  check(g, "UPDATE cemeteries tidak mengubah baris", denied(cem) || emptyList(cem));
  check(g, "INSERT blocks ditolak", denied(await rest(t, "POST", "blocks", { cemetery_id: blockD.cemetery_id, code: "Z", name: "Blok Z" })));
  const blk = await rest(t, "PATCH", `blocks?id=eq.${blockD.id}`, { name: "Diubah NonAdmin" });
  check(g, "UPDATE blocks tidak mengubah baris", denied(blk) || emptyList(blk));
  const counts = await rest(t, "GET", "block_grave_counts?select=total", undefined, null);
  check(g, "statistik Admin tidak membuka jumlah data", counts.status === 200 && counts.json.every((r) => Number(r.total) === 0));
  check(g, "upload storage ditolak", denied(await call(t, "POST", `/storage/v1/object/grave-photos/${a001Before.id}/cover-1.webp`, new Uint8Array([1, 2, 3]), { "Content-Type": "image/webp" })));
  const list = await call(t, "POST", "/storage/v1/object/list/grave-photos", { prefix: "", limit: 100 });
  check(g, "listing bucket foto tidak membuka isi", denied(list) || emptyList(list), `HTTP ${list.status}`);

  const a001After = (await rest(admin.token, "GET", `graves?id=eq.${a001Before.id}&select=id,deceased_name,heir_name,heir_phone,heir_address,updated_at`, undefined, null)).json[0];
  check(g, "A-001 tetap utuh setelah percobaan anon/non-admin", JSON.stringify(a001After) === JSON.stringify(a001Before));
  const cemAfter = (await rest(null, "GET", "cemeteries?select=id,name", undefined, null)).json[0];
  check(g, "data TPU tetap utuh", cemAfter.name === cemeteryBefore.name);
}

// =====================================================================
// ADMIN — CRUD + storage (data uji di Blok D, dihapus di akhir)
// =====================================================================
let testId = null;
let photoPath = null;
try {
  const g = "admin";
  const t = admin.token;
  check(g, "is_admin() = true", (await rest(t, "POST", "rpc/is_admin", {}, null)).json === true);
  const all = await rest(t, "GET", "graves?select=id,heir_name,heir_phone,heir_address&limit=1000", undefined, null);
  check(g, "membaca 149 data termasuk kolom ahli waris", all.status === 200 && all.json.length === 149 && "heir_name" in all.json[0]);

  const number = 90000 + Math.floor(Math.random() * 9000);
  const ins = await rest(t, "POST", "graves", {
    cemetery_id: blockD.cemetery_id, block_id: blockD.id, grave_number: number, grave_code: "SEMENTARA",
    deceased_name: "  Uji   Keamanan  Live ", heir_name: "Ahli Waris Uji", heir_phone: "080000000000",
    heir_address: "Alamat uji", verify_heir_address: true,
  });
  testId = ins.json?.[0]?.id ?? null;
  check(g, "CREATE graves", ins.status === 201 && testId, `HTTP ${ins.status} ${ins.text.slice(0, 160)}`);
  if (!testId) throw new Error("CREATE gagal; tes Admin lanjutan dilewati");
  const row = ins.json[0];
  check(g, "kode makam & status dihitung database", row.grave_code === `D-${number}` && row.verification_status === "NEEDS_VERIFICATION" && row.deceased_name === "Uji Keamanan Live");
  const dup = await rest(t, "POST", "graves", { cemetery_id: blockD.cemetery_id, block_id: blockD.id, grave_number: number, grave_code: "X", deceased_name: "Duplikat" });
  check(g, "nomor makam ganda dalam satu blok ditolak", dup.status === 409, `HTTP ${dup.status}`);

  const upd = await rest(t, "PATCH", `graves?id=eq.${testId}`, { verify_heir_address: false });
  check(g, "UPDATE graves + status jadi VERIFIED", upd.status === 200 && upd.json[0]?.verification_status === "VERIFIED");
  const pub = await rest(null, "GET", `public_graves?id=eq.${testId}&select=*`, undefined, null);
  check(g, "data publik baru tampil di view tanpa telepon/alamat ahli waris", pub.json?.length === 1 && !pub.text.includes("080000000000") && !pub.text.includes("Alamat uji"));

  // Storage: foto opsional, maks. 1 per makam (logika aplikasi), hanya Admin yang menulis.
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x1a, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x4c, 0x0d, 0, 0, 0, 0x2f, 0, 0, 0, 0x10, 0x07, 0x10, 0x11, 0x11, 0x88, 0x88, 0xfe, 0x07, 0]);
  photoPath = `${testId}/cover-${Date.now()}.webp`;
  const up = await call(t, "POST", `/storage/v1/object/grave-photos/${photoPath}`, webp, { "Content-Type": "image/webp", "x-upsert": "false" });
  check(g, "upload foto WebP", up.status === 200, `HTTP ${up.status} ${up.text.slice(0, 160)}`);
  const setPhoto = await rest(t, "PATCH", `graves?id=eq.${testId}`, { photo_path: photoPath });
  check(g, "photo_path tersimpan", setPhoto.status === 200 && setPhoto.json[0]?.photo_path === photoPath);
  const publicUrl = `${URL_}/storage/v1/object/public/grave-photos/${photoPath}`;
  check(g, "foto dapat dibaca publik lewat URL", (await fetch(publicUrl)).status === 200);
  const replace = await call(t, "PUT", `/storage/v1/object/grave-photos/${photoPath}`, webp, { "Content-Type": "image/webp", "x-upsert": "true" });
  check(g, "update (ganti) foto", replace.status === 200, `HTTP ${replace.status}`);
  const txt = await call(t, "POST", `/storage/v1/object/grave-photos/${testId}/bukan-foto.txt`, "halo", { "Content-Type": "text/plain" });
  check(g, "file non-gambar ditolak bucket", denied(txt), `HTTP ${txt.status}`);
  const big = await call(t, "POST", `/storage/v1/object/grave-photos/${testId}/besar.jpg`, new Uint8Array(1_100_000), { "Content-Type": "image/jpeg" });
  check(g, "file > 1 MB ditolak bucket", denied(big), `HTTP ${big.status}`);

  const userDel = await call(user.token, "DELETE", "/storage/v1/object/grave-photos", { prefixes: [photoPath] });
  const anonDel = await call(null, "DELETE", "/storage/v1/object/grave-photos", { prefixes: [photoPath] });
  check("non-admin", "tidak bisa menghapus foto", (denied(userDel) || emptyList(userDel)) && (await fetch(publicUrl)).status === 200);
  check("anon", "tidak bisa menghapus foto", (denied(anonDel) || emptyList(anonDel)) && (await fetch(publicUrl)).status === 200);

  // Setelah dihapus, cek langsung ke storage (URL publik bisa masih dilayani cache CDN sesaat).
  const rm = await call(t, "DELETE", "/storage/v1/object/grave-photos", { prefixes: [photoPath] });
  const gone = await call(t, "GET", `/storage/v1/object/authenticated/grave-photos/${photoPath}`);
  const folder = await call(t, "POST", "/storage/v1/object/list/grave-photos", { prefix: testId, limit: 10 });
  check(g, "hapus foto", rm.status === 200 && rm.json?.length === 1 && gone.status >= 400 && emptyList(folder), `rm ${rm.status}/${rm.json?.length}, get ${gone.status}, list ${folder.status}/${folder.json?.length}`);
  photoPath = null;

  const arch = await rest(t, "PATCH", `graves?id=eq.${testId}`, { archived_at: new Date().toISOString() });
  check(g, "arsipkan data", arch.status === 200 && arch.json[0]?.archived_at);
  check(g, "data arsip hilang dari view publik", emptyList(await rest(null, "GET", `public_graves?id=eq.${testId}&select=id`, undefined, null)));
  const logs = await rest(t, "GET", `audit_logs?entity_id=eq.${testId}&select=action,actor_user_id`, undefined, null);
  check(g, "audit log mencatat aktor Admin", logs.status === 200 && logs.json.length >= 3 && logs.json.every((l) => l.actor_user_id === admin.id));
  check("non-admin", "audit log data uji tidak terbaca", emptyList(await rest(user.token, "GET", `audit_logs?entity_id=eq.${testId}&select=id`, undefined, null)));

  const delRes = await rest(t, "DELETE", `graves?id=eq.${testId}`);
  check(g, "DELETE graves", delRes.status === 200 && delRes.json?.length === 1);
  if (delRes.json?.length === 1) testId = null;
} finally {
  if (photoPath) await call(admin.token, "DELETE", "/storage/v1/object/grave-photos", { prefixes: [photoPath] });
  if (testId) await rest(admin.token, "DELETE", `graves?id=eq.${testId}`);
}

const total = (await rest(admin.token, "GET", "graves?select=id", undefined, "count=exact")).json.length;
check("admin", "jumlah data kembali 149 setelah tes", total === 149, String(total));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
