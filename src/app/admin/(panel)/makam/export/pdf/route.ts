import { NextResponse, type NextRequest } from "next/server";
import { checkAdmin } from "@/lib/auth";
import { describeListFilters, getAdminBlocks, listGravesForExport, parseListFilters } from "@/lib/data/admin";
import { logError } from "@/lib/log";
import { buildGraveListPdf } from "@/lib/pdf/grave-list-pdf";

/** Export PDF Data Makam (A4 landscape) sesuai filter daftar yang aktif. Hanya Admin. Tanpa telepon/alamat ahli waris. */
export async function GET(request: NextRequest) {
  const check = await checkAdmin().catch(() => null);
  if (check?.status !== "ok") {
    return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  }

  const filters = parseListFilters(Object.fromEntries(request.nextUrl.searchParams));
  try {
    const [rows, blocks] = await Promise.all([listGravesForExport(filters), getAdminBlocks()]);
    const exportedAt = new Date();
    const pdf = buildGraveListPdf(
      rows.map((row) => ({
        code: row.grave_code,
        name: row.deceased_name,
        heirName: row.heir_name,
        deathDate: row.death_date,
        block: row.blocks?.code ?? null,
        number: row.grave_number,
        verified: row.verification_status === "VERIFIED",
      })),
      { exportedAt, filters: describeListFilters(filters, blocks) },
    );
    // Tanggal file mengikuti WIB.
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(exportedAt);
    return new NextResponse(pdf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="data-makam-tpu-astana-pratiksha-${date}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    logError("export.pdf", error);
    return NextResponse.json({ error: "Export PDF gagal. Coba lagi." }, { status: 500 });
  }
}
