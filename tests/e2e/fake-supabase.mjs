// Server tiruan Supabase (PostgREST + Auth + Storage) — HANYA untuk E2E lokal, tanpa Docker/DB.
// - Data: 149 baris CSV staging, disimpan in-memory (perubahan hilang saat server berhenti).
// - Endpoint publik (public_graves, RPC pencarian) hanya mengembalikan field publik, meniru view di database.
// - Endpoint tabel graves hanya melayani token Admin tiruan (meniru RLS is_admin()).
// - Upload storage SELALU gagal (meniru storage penuh) untuk menguji isolasi kegagalan foto.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.FAKE_SUPABASE_PORT ?? 54399);
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const FAKE_ADMIN = { email: "admin.e2e@tpu.test", password: "RahasiaE2E-123" };

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  const input = text.replace(/^﻿/, "");
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) rows.push([...row, cell]);
  const [header, ...data] = rows.filter((r) => r.some((c) => c !== ""));
  return data.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const now = () => new Date().toISOString();
const VERIFY = ["verify_deceased_name", "verify_death_date", "verify_heir_name", "verify_heir_phone", "verify_heir_address", "verify_location"];

const cemetery = {
  id: uuid(9001),
  name: "TPU Astana Pratiksha Cianjur",
  address: "Tempat Kerja, 548F+PCC, Nagrak, Kec. Cianjur, Kabupaten Cianjur, Jawa Barat 43215",
  google_maps_url: null,
  google_maps_query: "Tempat Kerja, 548F+PCC, Nagrak, Kec. Cianjur, Kabupaten Cianjur, Jawa Barat 43215",
  created_at: now(),
  updated_at: now(),
};
const blocks = ["A", "B", "C", "D"].map((code, i) => ({
  id: uuid(9100 + i),
  cemetery_id: cemetery.id,
  code,
  name: `Blok ${code}`,
  capacity: null,
  grid_rows: code === "A" ? 15 : null,
  grid_columns: code === "A" ? 10 : null,
  sort_order: i + 1,
  is_active: true,
  created_at: now(),
  updated_at: now(),
}));
const blockById = (id) => blocks.find((b) => b.id === id) ?? null;

/** Meniru trigger tg_graves_before_write. */
function normalizeGrave(g) {
  const block = blockById(g.block_id);
  if (block && g.grave_number) {
    const digits = String(g.grave_number);
    g.grave_code = `${block.code}-${digits.length < 3 ? digits.padStart(3, "0") : digits}`;
  }
  g.verification_status = VERIFY.some((k) => g[k]) ? "NEEDS_VERIFICATION" : "VERIFIED";
  return g;
}

const graves = parseCsv(readFileSync(join(root, "03_Data_Seed", "data_makam_149_blok_A_STAGING.csv"), "utf8")).map((r, i) =>
  normalizeGrave({
    id: uuid(i + 1),
    cemetery_id: cemetery.id,
    block_id: blocks[0].id,
    legacy_no: Number(r.legacy_no),
    grave_number: Number(r.plot_number),
    grave_code: r.grave_code,
    deceased_name: r.deceased_name,
    death_date: r.death_date || null,
    recorded_date_raw: r.recorded_date_raw || null,
    date_semantics: r.date_semantics,
    heir_name: r.heir_name || null,
    heir_phone: r.heir_phone || null,
    heir_address: r.heir_address || null,
    visual_x: null,
    visual_y: null,
    visual_row: null,
    visual_column: null,
    photo_path: null,
    ...Object.fromEntries(VERIFY.map((k) => [k, r[k] === "True"])),
    is_public: true,
    transcription_confidence: r.transcription_confidence || null,
    transcription_notes: r.transcription_notes || null,
    source_file: r.source_file || null,
    archived_at: null,
    created_at: now(),
    updated_at: now(),
  }),
);

/** View publik: dari ahli waris hanya nama, TANPA telepon/alamat (sama seperti public.public_graves). */
const publicGraves = () =>
  graves
    .filter((g) => g.is_public && !g.archived_at)
    .map((g) => {
      const block = blockById(g.block_id);
      return {
        id: g.id, grave_code: g.grave_code, deceased_name: g.deceased_name, death_date: g.death_date,
        block_code: block?.code ?? null, block_name: block?.name ?? null, grave_number: g.grave_number,
        visual_x: g.visual_x, visual_y: g.visual_y, visual_row: g.visual_row, visual_column: g.visual_column, photo_path: g.photo_path,
        heir_name: g.heir_name,
      };
    });

// ---------------- Auth tiruan ----------------
const adminUser = {
  id: uuid(7001), aud: "authenticated", role: "authenticated", email: FAKE_ADMIN.email,
  app_metadata: { provider: "email" }, user_metadata: {}, created_at: now(),
};
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const tokens = new Set();
function issueSession() {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const access_token = `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: adminUser.id, role: "authenticated", aud: "authenticated", exp, email: adminUser.email })}.fake`;
  tokens.add(access_token);
  return { access_token, token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: randomUUID(), user: adminUser };
}
const isAdmin = (req) => tokens.has((req.headers.authorization ?? "").replace(/^Bearer /, ""));

// ---------------- Filter PostgREST (subset) ----------------
/** Riwayat audit tiruan (hanya kolom alias yang dibaca Dashboard), tersebar di beberapa bulan terakhir. */
function fakeAudit() {
  const day = 24 * 60 * 60 * 1000;
  return graves.slice(0, 40).map((g, i) => {
    const verify = i % 3 !== 0;
    return {
      id: i + 1,
      action: i % 7 === 0 ? "INSERT" : "UPDATE",
      created_at: new Date(Date.now() - i * 6 * day - (i % 5) * 3600_000).toISOString(),
      before_status: "NEEDS_VERIFICATION",
      after_status: verify && i % 7 !== 0 ? "VERIFIED" : "NEEDS_VERIFICATION",
      before_archived: null,
      after_archived: null,
      after_code: g.grave_code,
      after_name: g.deceased_name,
      before_code: g.grave_code,
      before_name: g.deceased_name,
    };
  });
}

function applyFilters(url, rows) {
  let out = rows;
  for (const [key, raw] of url.searchParams) {
    if (["select", "order", "limit", "offset", "columns"].includes(key)) continue;
    const value = decodeURIComponent(raw);
    if (key === "or") {
      const terms = value.replace(/^\(|\)$/g, "").split(",").map((t) => {
        const [col] = t.split(".");
        return { col, needle: t.slice(col.length + ".ilike.".length).replace(/\*/g, "").toLowerCase() };
      });
      out = out.filter((r) => terms.some(({ col, needle }) => String(r[col] ?? "").toLowerCase().includes(needle)));
    } else if (value.startsWith("eq.")) out = out.filter((r) => String(r[key]) === value.slice(3));
    else if (value === "is.null") out = out.filter((r) => r[key] === null);
    else if (value === "not.is.null") out = out.filter((r) => r[key] !== null);
    else if (value.startsWith("gt.")) out = out.filter((r) => String(r[key]) > value.slice(3));
  }
  const order = url.searchParams.get("order");
  if (order) {
    const [col, dir] = order.split(",")[0].split(".");
    out = [...out].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (dir === "desc" ? -1 : 1));
  }
  const total = out.length;
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const limit = Number(url.searchParams.get("limit") ?? 0);
  if (offset || limit) out = out.slice(offset, limit ? offset + limit : undefined);
  return { rows: out, total, offset };
}

function withEmbeds(url, rows) {
  if (!(url.searchParams.get("select") ?? "").includes("blocks(")) return rows;
  return rows.map((r) => {
    const b = blockById(r.block_id);
    return { ...r, blocks: b ? { code: b.code, name: b.name } : null };
  });
}

function search({ p_query = "", p_block = null, p_code = null, p_limit = 20, p_offset = 0 }) {
  const term = String(p_query).trim().replace(/\s+/g, " ").toLowerCase();
  if (term.length < 2) return [];
  const rank = (g) => {
    const n = g.deceased_name.toLowerCase();
    if (p_code && g.grave_code === p_code) return 0;
    if (n === term) return 1;
    if (n.startsWith(term)) return 2;
    if (n.includes(` ${term}`)) return 3;
    return 4;
  };
  const hits = publicGraves()
    .filter((g) => (g.deceased_name.toLowerCase().includes(term) || (p_code && g.grave_code === p_code)) && (!p_block || g.block_code === p_block))
    .sort((a, b) => rank(a) - rank(b) || a.deceased_name.localeCompare(b.deceased_name));
  return hits.slice(p_offset, p_offset + Math.min(p_limit, 50)).map(({ id, grave_code, deceased_name, death_date, block_code, grave_number, heir_name }) => ({
    id, grave_code, deceased_name, death_date, block_code, grave_number, heir_name, total_count: hits.length,
  }));
}

// ---------------- HTTP ----------------
function reply(req, res, status, body, extraHeaders = {}) {
  const wantsObject = (req.headers.accept ?? "").includes("vnd.pgrst.object");
  const payload = wantsObject && Array.isArray(body) ? (body[0] ?? null) : body;
  res.writeHead(status, { "Content-Type": "application/json", ...extraHeaders });
  res.end(req.method === "HEAD" || status === 204 ? undefined : JSON.stringify(payload));
}

function tableResponse(req, res, url, rows) {
  const { rows: page, total, offset } = applyFilters(url, rows);
  const wantsCount = (req.headers.prefer ?? "").includes("count=exact");
  const headers = wantsCount ? { "Content-Range": `${page.length ? `${offset}-${offset + page.length - 1}` : "*"}/${total}` } : {};
  reply(req, res, 200, withEmbeds(url, page), headers);
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
  });
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const path = url.pathname;
  const method = req.method;

  if (path === "/health") return reply(req, res, 200, { ok: true });

  // Auth
  if (path === "/auth/v1/token" && method === "POST") {
    const body = await readBody(req);
    if (body.email === FAKE_ADMIN.email && body.password === FAKE_ADMIN.password) return reply(req, res, 200, issueSession());
    return reply(req, res, 400, { code: "invalid_credentials", error_code: "invalid_credentials", msg: "Invalid login credentials" });
  }
  if (path === "/auth/v1/user") return isAdmin(req) ? reply(req, res, 200, adminUser) : reply(req, res, 401, { code: 401, msg: "Invalid JWT" });
  if (path === "/auth/v1/logout") return reply(req, res, 204, null);
  if (path.startsWith("/auth/v1/")) return reply(req, res, 401, { code: 401, msg: "Invalid JWT" });

  // Storage: selalu gagal (storage penuh)
  if (path.startsWith("/storage/v1/")) return reply(req, res, 413, { statusCode: "413", error: "Payload too large", message: "The object exceeded the maximum allowed size" });

  // Publik
  if (method === "GET" && path === "/rest/v1/cemeteries") return reply(req, res, 200, [cemetery]);
  if (method === "GET" && path === "/rest/v1/blocks") {
    const visible = isAdmin(req) ? blocks : blocks.filter((b) => b.is_active);
    return tableResponse(req, res, url, visible);
  }
  if (method === "GET" && path === "/rest/v1/public_graves") return tableResponse(req, res, url, publicGraves());
  if (method === "POST" && path === "/rest/v1/rpc/search_public_graves") return reply(req, res, 200, search(await readBody(req)));

  // Admin (meniru RLS: tanpa token Admin => kosong)
  const admin = isAdmin(req);
  if ((method === "GET" || method === "HEAD") && path === "/rest/v1/admin_users") {
    return reply(req, res, 200, admin ? [{ user_id: adminUser.id, display_name: "Operator E2E", email: adminUser.email }] : []);
  }
  if ((method === "GET" || method === "HEAD") && path === "/rest/v1/graves") return tableResponse(req, res, url, admin ? graves : []);
  if (method === "GET" && path === "/rest/v1/block_grave_counts") {
    return reply(req, res, 200, admin ? blocks.map((b) => ({
      block_id: b.id, code: b.code,
      total: graves.filter((g) => g.block_id === b.id && !g.archived_at).length,
      needs_verification: graves.filter((g) => g.block_id === b.id && !g.archived_at && g.verification_status === "NEEDS_VERIFICATION").length,
    })) : []);
  }
  if (method === "GET" && path === "/rest/v1/audit_logs") {
    if (!admin) return reply(req, res, 200, []);
    // Dashboard: select=created_at => transisi ke VERIFIED (grafik bulanan); selain itu => aktivitas terbaru.
    const rows = fakeAudit();
    if (url.searchParams.get("select") === "created_at") {
      return reply(req, res, 200, rows.filter((r) => r.after_status === "VERIFIED" && r.before_status !== "VERIFIED").map((r) => ({ created_at: r.created_at })));
    }
    const limit = Number(url.searchParams.get("limit") ?? 5);
    return reply(req, res, 200, [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit));
  }

  if (path === "/rest/v1/graves" && (method === "PATCH" || method === "POST")) {
    if (!admin) return reply(req, res, 401, { code: "42501", message: "permission denied" });
    const body = await readBody(req);
    if (method === "POST") {
      const row = normalizeGrave({
        ...Object.fromEntries(Object.keys(graves[0]).map((k) => [k, null])),
        ...Object.fromEntries(VERIFY.map((k) => [k, false])),
        is_public: true, date_semantics: "WAFAT",
        ...body, id: randomUUID(), created_at: now(), updated_at: now(),
      });
      if (graves.some((g) => g.block_id === row.block_id && g.grave_number === row.grave_number)) {
        return reply(req, res, 409, { code: "23505", message: "duplicate key value violates unique constraint \"uq_graves_block_number\"" });
      }
      graves.push(row);
      return reply(req, res, 201, [row]);
    }
    const { rows: targets } = applyFilters(url, graves);
    for (const target of targets) {
      const candidate = { ...target, ...body };
      if (graves.some((g) => g.id !== target.id && g.block_id === candidate.block_id && g.grave_number === candidate.grave_number)) {
        return reply(req, res, 409, { code: "23505", message: "duplicate key value violates unique constraint \"uq_graves_block_number\"" });
      }
      Object.assign(target, body, { updated_at: now() });
      normalizeGrave(target);
    }
    return reply(req, res, 200, targets);
  }

  // DELETE meniru RLS graves_admin_delete: tanpa token Admin => 0 baris terhapus (bukan error).
  if (path === "/rest/v1/graves" && method === "DELETE") {
    if (!admin) return reply(req, res, 200, []);
    const { rows: targets } = applyFilters(url, graves);
    for (const target of targets) graves.splice(graves.indexOf(target), 1);
    return reply(req, res, 200, targets);
  }

  reply(req, res, 404, { message: `fake-supabase: ${method} ${path} tidak didukung` });
}).listen(PORT, "127.0.0.1", () => console.log(`fake-supabase listening on ${PORT}`));
