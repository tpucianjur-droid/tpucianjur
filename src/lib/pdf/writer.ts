import { deflateSync } from "node:zlib";

/**
 * Penulis PDF minimal (teks & vektor asli, bukan gambar) tanpa dependency.
 * Memakai font standar PDF Helvetica / Helvetica-Bold (tidak perlu di-embed) dengan WinAnsiEncoding,
 * sehingga ukuran file kecil dan teks tetap tajam, dapat dicari & disalin.
 */

export type FontKey = "regular" | "bold";
export type Rgb = readonly [number, number, number];

const FONT_RESOURCE: Record<FontKey, string> = { regular: "F1", bold: "F2" };

// Lebar glyph (per 1000 unit) karakter ASCII 32..126 dari metrik AFM standar Adobe.
// prettier-ignore
const HELVETICA = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];
// prettier-ignore
const HELVETICA_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

export const FONT_WIDTHS: Record<FontKey, readonly number[]> = { regular: HELVETICA, bold: HELVETICA_BOLD };

/** Karakter Unicode di luar Latin-1 yang ada di WinAnsiEncoding (0x80–0x9F). */
const WIN_ANSI_EXTRA: Record<string, number> = {
  "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87, "ˆ": 0x88, "‰": 0x89,
  "Š": 0x8a, "‹": 0x8b, "Œ": 0x8c, "Ž": 0x8e, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95,
  "–": 0x96, "—": 0x97, "˜": 0x98, "™": 0x99, "š": 0x9a, "›": 0x9b, "œ": 0x9c, "ž": 0x9e, "Ÿ": 0x9f,
};

/** Lebar (per 1000) untuk karakter non-ASCII yang umum; sisanya memakai huruf dasar atau rata-rata. */
const EXTRA_WIDTH: Record<number, number> = {
  0x85: 1000, 0x91: 222, 0x92: 222, 0x93: 333, 0x94: 333, 0x95: 350, 0x96: 556, 0x97: 1000, 0xa0: 278, 0xb7: 278,
};

/** Karakter => byte WinAnsi. Huruf beraksen di luar tabel diturunkan ke huruf dasarnya; sisanya "?". */
function toWinAnsi(char: string): number {
  const code = char.codePointAt(0) ?? 63;
  if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) return code;
  if (WIN_ANSI_EXTRA[char] !== undefined) return WIN_ANSI_EXTRA[char];
  if (char === "\t") return 0x20;
  const base = char.normalize("NFD").charAt(0);
  const baseCode = base.codePointAt(0) ?? 63;
  return base !== char && baseCode >= 0x20 && baseCode <= 0x7e ? baseCode : 63;
}

function encode(text: string): number[] {
  return Array.from(text.normalize("NFC").replace(/[\r\n]+/g, " "), toWinAnsi);
}

function byteWidth(byte: number, font: FontKey): number {
  if (byte >= 32 && byte <= 126) return FONT_WIDTHS[font][byte - 32];
  if (EXTRA_WIDTH[byte] !== undefined) return EXTRA_WIDTH[byte];
  if (byte >= 0xc0) {
    const base = String.fromCharCode(byte).normalize("NFD").charCodeAt(0);
    if (base >= 32 && base <= 126) return FONT_WIDTHS[font][base - 32];
  }
  return 556;
}

export function textWidth(text: string, font: FontKey, size: number): number {
  let units = 0;
  for (const byte of encode(text)) units += byteWidth(byte, font);
  return (units * size) / 1000;
}

/** Bungkus teks per kata agar muat di `maxWidth`; kata yang terlalu panjang dipotong per karakter. */
export function wrapText(text: string, font: FontKey, size: number, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(candidate, font, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    // Kata tunggal lebih lebar dari kolom: pecah per karakter.
    let chunk = "";
    for (const char of word) {
      if (chunk && textWidth(chunk + char, font, size) > maxWidth) {
        lines.push(chunk);
        chunk = "";
      }
      chunk += char;
    }
    line = chunk;
  }
  if (line) lines.push(line);
  return lines;
}

const num = (value: number) => (Math.round(value * 100) / 100).toString();
const color = ([r, g, b]: Rgb) => `${num(r)} ${num(g)} ${num(b)}`;

/** Kanvas satu halaman. Koordinat memakai sumbu y dari ATAS halaman (seperti layout web), dikonversi saat ditulis. */
export class PdfPage {
  private readonly ops: string[] = [];
  constructor(readonly width: number, readonly height: number) {}

  text(value: string, x: number, y: number, opts: { font?: FontKey; size: number; color?: Rgb; align?: "left" | "center" | "right" }) {
    const font = opts.font ?? "regular";
    const w = opts.align && opts.align !== "left" ? textWidth(value, font, opts.size) : 0;
    const left = opts.align === "center" ? x - w / 2 : opts.align === "right" ? x - w : x;
    const hex = encode(value)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    this.ops.push(
      `BT /${FONT_RESOURCE[font]} ${num(opts.size)} Tf ${color(opts.color ?? [0, 0, 0])} rg ${num(left)} ${num(this.height - y)} Td <${hex}> Tj ET`,
    );
  }

  rect(x: number, y: number, w: number, h: number, opts: { fill?: Rgb; stroke?: Rgb; lineWidth?: number }) {
    const parts = [`${num(x)} ${num(this.height - y - h)} ${num(w)} ${num(h)} re`];
    if (opts.fill) parts.unshift(`${color(opts.fill)} rg`);
    if (opts.stroke) parts.unshift(`${color(opts.stroke)} RG ${num(opts.lineWidth ?? 0.5)} w`);
    parts.push(opts.fill && opts.stroke ? "B" : opts.fill ? "f" : "S");
    this.ops.push(parts.join(" "));
  }

  line(x1: number, y1: number, x2: number, y2: number, opts: { stroke: Rgb; lineWidth?: number }) {
    this.ops.push(
      `${color(opts.stroke)} RG ${num(opts.lineWidth ?? 0.5)} w ${num(x1)} ${num(this.height - y1)} m ${num(x2)} ${num(this.height - y2)} l S`,
    );
  }

  content(): string {
    return this.ops.join("\n");
  }
}

function pdfString(value: string) {
  return `<${"feff"}${Array.from(value)
    .map((c) => (c.codePointAt(0) ?? 63).toString(16).padStart(4, "0"))
    .join("")}>`;
}

/** Susun dokumen PDF 1.4 dari halaman-halaman (content stream dikompres Flate). */
export function buildPdf(pages: PdfPage[], info: { title: string; createdAt: Date }): Uint8Array {
  const chunks: Buffer[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (data: string | Buffer) => {
    const buffer = typeof data === "string" ? Buffer.from(data, "latin1") : data;
    chunks.push(buffer);
    length += buffer.length;
  };
  const object = (id: number, body: string | Buffer[]) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
    if (typeof body === "string") push(body);
    else body.forEach(push);
    push("\nendobj\n");
  };

  // 1 katalog, 2 pages, 3-4 font, 5 info, lalu per halaman: page + content.
  const firstPageId = 6;
  const pageIds = pages.map((_, i) => firstPageId + i * 2);
  push("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n");
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  const first = pages[0];
  object(
    2,
    `<< /Type /Pages /Count ${pages.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /MediaBox [0 0 ${num(first?.width ?? 842)} ${num(first?.height ?? 595)}] >>`,
  );
  object(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  object(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const d = info.createdAt;
  const stamp = `D:${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  object(5, `<< /Title ${pdfString(info.title)} /Producer (TPU Astana Pratiksha) /CreationDate (${stamp}) >>`);

  pages.forEach((page, i) => {
    const pageId = pageIds[i];
    const stream = deflateSync(Buffer.from(page.content(), "latin1"));
    object(
      pageId,
      `<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageId + 1} 0 R >>`,
    );
    object(pageId + 1, [Buffer.from(`<< /Length ${stream.length} /Filter /FlateDecode >>\nstream\n`, "latin1"), stream, Buffer.from("\nendstream", "latin1")]);
  });

  const total = firstPageId + pages.length * 2;
  const xrefOffset = length;
  push(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let id = 1; id < total; id++) push(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${total} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
  return new Uint8Array(Buffer.concat(chunks));
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
