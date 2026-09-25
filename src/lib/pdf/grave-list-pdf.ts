import { buildPdf, PdfPage, textWidth, wrapText, type FontKey, type Rgb } from "./writer";

/** Baris export PDF. Sengaja TANPA telepon & alamat ahli waris. */
export type GravePdfRow = {
  code: string;
  name: string;
  heirName: string | null;
  deathDate: string | null;
  block: string | null;
  number: number | null;
  verified: boolean;
};

export type GravePdfMeta = {
  exportedAt: Date;
  /** Ringkasan filter aktif, mis. ["Blok: Blok A", "Status: Terverifikasi"]; kosong = tanpa filter. */
  filters: string[];
};

// A4 landscape (pt).
const PAGE = { width: 842, height: 595 } as const;
const MARGIN = { x: 32, top: 30, bottom: 30 } as const;
const CONTENT_WIDTH = PAGE.width - MARGIN.x * 2;
const FOOTER_HEIGHT = 22;

const BODY = { size: 8.5, lineHeight: 10.5, padX: 5, padY: 4.5 } as const;
const HEAD = { size: 8, lineHeight: 10 } as const;

const INK: Rgb = [0.082, 0.212, 0.176];
const PRIMARY: Rgb = [0.09, 0.29, 0.227];
const MUTED: Rgb = [0.32, 0.4, 0.37];
const LINE: Rgb = [0.84, 0.88, 0.86];
const HEAD_FILL: Rgb = [0.91, 0.953, 0.929];
const ZEBRA: Rgb = [0.975, 0.984, 0.98];
const OK: { fill: Rgb; text: Rgb } = { fill: [0.91, 0.953, 0.929], text: [0.09, 0.42, 0.29] };
const NEEDS: { fill: Rgb; text: Rgb } = { fill: [0.992, 0.945, 0.941], text: [0.77, 0.235, 0.224] };

type Column = { key: string; label: string; width: number; align?: "left" | "center" | "right" };

/** Lebar kolom menjumlah tepat CONTENT_WIDTH (778pt) agar tidak ada kolom terpotong. */
const COLUMNS: Column[] = [
  { key: "no", label: "No.", width: 30, align: "center" },
  { key: "code", label: "Kode Makam", width: 64 },
  { key: "name", label: "Nama", width: 206 },
  { key: "heir", label: "Ahli Waris", width: 196 },
  { key: "date", label: "Tanggal Wafat", width: 84 },
  { key: "block", label: "Blok", width: 38, align: "center" },
  { key: "number", label: "Nomor Makam", width: 56, align: "center" },
  { key: "status", label: "Status", width: 104 },
];

const DATE_SHORT = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const EXPORT_DATE = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
const EXPORT_TIME = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

type Cell = { lines: string[]; font: FontKey; color: Rgb };
type LaidRow = { cells: Cell[]; height: number; verified: boolean };

export function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? "—" : DATE_SHORT.format(date).replace(/\./g, "");
}

function layoutRow(row: GravePdfRow, index: number): LaidRow {
  const values: Record<string, { text: string; font?: FontKey; color?: Rgb }> = {
    no: { text: String(index + 1), color: MUTED },
    code: { text: row.code, font: "bold" },
    name: { text: row.name, font: "bold" },
    heir: row.heirName?.trim() ? { text: row.heirName.trim() } : { text: "Belum diisi", color: MUTED },
    date: { text: shortDate(row.deathDate) },
    block: { text: row.block ?? "—" },
    number: { text: row.number != null ? String(row.number).padStart(3, "0") : "—" },
    status: { text: "" }, // digambar sebagai badge
  };
  const cells = COLUMNS.map((col) => {
    const value = values[col.key];
    const font = value.font ?? "regular";
    return { lines: wrapText(value.text, font, BODY.size, col.width - BODY.padX * 2), font, color: value.color ?? INK };
  });
  const lines = Math.max(...cells.map((c) => c.lines.length));
  return { cells, height: lines * BODY.lineHeight + BODY.padY * 2, verified: row.verified };
}

const headerCells = COLUMNS.map((col) => wrapText(col.label, "bold", HEAD.size, col.width - BODY.padX * 2));
const HEADER_ROW_HEIGHT = Math.max(...headerCells.map((l) => l.length)) * HEAD.lineHeight + BODY.padY * 2;

/** Tinggi kop halaman (judul + ringkasan filter). */
function pageHeaderHeight(meta: GravePdfMeta) {
  return 50 + (meta.filters.length > 0 ? 14 : 0) + 8;
}

function drawPageHeader(page: PdfPage, meta: GravePdfMeta, total: number) {
  const top = MARGIN.top;
  // Kiri: identitas TPU.
  page.rect(MARGIN.x, top, 4, 30, { fill: PRIMARY });
  page.text("TPU", MARGIN.x + 10, top + 9, { font: "bold", size: 8.5, color: PRIMARY });
  page.text("Astana Pratiksha", MARGIN.x + 10, top + 19.5, { font: "bold", size: 8.5, color: PRIMARY });
  page.text("Cianjur", MARGIN.x + 10, top + 30, { font: "bold", size: 8.5, color: PRIMARY });

  // Tengah: judul.
  page.text("DATA MAKAM", PAGE.width / 2, top + 14, { font: "bold", size: 16, color: INK, align: "center" });
  page.text("TPU ASTANA PRATIKSHA CIANJUR", PAGE.width / 2, top + 28, { font: "bold", size: 9.5, color: INK, align: "center" });

  // Kanan: waktu export (WIB).
  const right = PAGE.width - MARGIN.x;
  page.text(`Tanggal export: ${EXPORT_DATE.format(meta.exportedAt)}`, right, top + 9, { size: 8, color: MUTED, align: "right" });
  page.text(`Pukul: ${EXPORT_TIME.format(meta.exportedAt).replace(":", ".")} WIB`, right, top + 19.5, { size: 8, color: MUTED, align: "right" });
  page.text(`Jumlah data: ${total.toLocaleString("id-ID")}`, right, top + 30, { font: "bold", size: 8, color: INK, align: "right" });

  let y = top + 44;
  page.line(MARGIN.x, y, right, y, { stroke: LINE, lineWidth: 0.75 });
  if (meta.filters.length > 0) {
    y += 12;
    const label = "Filter: ";
    page.text(label, MARGIN.x, y, { font: "bold", size: 8, color: INK });
    const summary = meta.filters.join(" • ");
    const maxWidth = CONTENT_WIDTH - textWidth(label, "bold", 8);
    // Satu baris saja; bila terlalu panjang (kata kunci panjang) dipotong dengan "…".
    const lines = wrapText(summary, "regular", 8, maxWidth - textWidth(" …", "regular", 8));
    page.text(lines.length === 1 ? summary : `${lines[0]} …`, MARGIN.x + textWidth(label, "bold", 8), y, {
      size: 8,
      color: INK,
    });
  }
}

function drawTableHeader(page: PdfPage, y: number) {
  page.rect(MARGIN.x, y, CONTENT_WIDTH, HEADER_ROW_HEIGHT, { fill: HEAD_FILL, stroke: LINE });
  let x = MARGIN.x;
  COLUMNS.forEach((col, i) => {
    if (i > 0) page.line(x, y, x, y + HEADER_ROW_HEIGHT, { stroke: LINE });
    headerCells[i].forEach((line, li) => {
      const ty = y + BODY.padY + HEAD.size + li * HEAD.lineHeight - 0.5;
      page.text(line, alignX(col, x, line, "bold", HEAD.size), ty, { font: "bold", size: HEAD.size, color: INK });
    });
    x += col.width;
  });
}

function drawRow(page: PdfPage, row: LaidRow, y: number, zebra: boolean) {
  page.rect(MARGIN.x, y, CONTENT_WIDTH, row.height, { fill: zebra ? ZEBRA : undefined, stroke: LINE });
  let x = MARGIN.x;
  COLUMNS.forEach((col, i) => {
    if (i > 0) page.line(x, y, x, y + row.height, { stroke: LINE });
    if (col.key === "status") {
      drawStatus(page, x, y, row.verified);
    } else {
      const cell = row.cells[i];
      cell.lines.forEach((line, li) => {
        const ty = y + BODY.padY + BODY.size - 1 + li * BODY.lineHeight;
        page.text(line, alignX(col, x, line, cell.font, BODY.size), ty, { font: cell.font, size: BODY.size, color: cell.color });
      });
    }
    x += col.width;
  });
}

function drawStatus(page: PdfPage, x: number, y: number, verified: boolean) {
  const label = verified ? "Terverifikasi" : "Perlu Verifikasi";
  const tone = verified ? OK : NEEDS;
  const size = 7.5;
  const w = textWidth(label, "bold", size) + 10;
  page.rect(x + BODY.padX, y + BODY.padY - 1, w, BODY.lineHeight + 2, { fill: tone.fill });
  page.text(label, x + BODY.padX + 5, y + BODY.padY + size, { font: "bold", size, color: tone.text });
}

function alignX(col: Column, x: number, text: string, font: FontKey, size: number) {
  if (col.align === "center") return x + (col.width - textWidth(text, font, size)) / 2;
  if (col.align === "right") return x + col.width - BODY.padX - textWidth(text, font, size);
  return x + BODY.padX;
}

function drawFooter(page: PdfPage, pageNumber: number, pageCount: number) {
  const y = PAGE.height - MARGIN.bottom;
  page.line(MARGIN.x, y - 10, PAGE.width - MARGIN.x, y - 10, { stroke: LINE, lineWidth: 0.75 });
  page.text("TPU Astana Pratiksha Cianjur", MARGIN.x, y, { size: 7.5, color: MUTED });
  page.text(`Halaman ${pageNumber} dari ${pageCount}`, PAGE.width - MARGIN.x, y, { size: 7.5, color: MUTED, align: "right" });
}

/**
 * PDF Data Makam A4 landscape: kop + header tabel diulang di setiap halaman, baris tidak pernah terbelah,
 * nama/ahli waris panjang dibungkus, footer "Halaman X dari Y". Aman untuk ribuan baris.
 */
export function buildGraveListPdf(rows: GravePdfRow[], meta: GravePdfMeta): Uint8Array {
  const laid = rows.map(layoutRow);
  const tableTop = MARGIN.top + pageHeaderHeight(meta);
  const tableBottom = PAGE.height - MARGIN.bottom - FOOTER_HEIGHT;

  // 1) Bagi baris ke halaman (jumlah halaman harus diketahui sebelum menulis "Halaman X dari Y").
  const pagesRows: LaidRow[][] = [[]];
  let y = tableTop + HEADER_ROW_HEIGHT;
  for (const row of laid) {
    if (y + row.height > tableBottom && pagesRows[pagesRows.length - 1].length > 0) {
      pagesRows.push([]);
      y = tableTop + HEADER_ROW_HEIGHT;
    }
    pagesRows[pagesRows.length - 1].push(row);
    y += row.height;
  }

  // 2) Gambar.
  let index = 0;
  const pages = pagesRows.map((pageRows, p) => {
    const page = new PdfPage(PAGE.width, PAGE.height);
    drawPageHeader(page, meta, rows.length);
    drawTableHeader(page, tableTop);
    let cursor = tableTop + HEADER_ROW_HEIGHT;
    if (rows.length === 0) {
      page.rect(MARGIN.x, cursor, CONTENT_WIDTH, 28, { stroke: LINE });
      page.text("Tidak ada data sesuai filter.", PAGE.width / 2, cursor + 17, { size: 9, color: MUTED, align: "center" });
    }
    for (const row of pageRows) {
      drawRow(page, row, cursor, index % 2 === 1);
      cursor += row.height;
      index++;
    }
    drawFooter(page, p + 1, pagesRows.length);
    return page;
  });

  return buildPdf(pages, { title: "Data Makam TPU Astana Pratiksha Cianjur", createdAt: meta.exportedAt });
}
