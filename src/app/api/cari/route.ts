import { NextResponse, type NextRequest } from "next/server";
import { SEARCH } from "@/lib/config";
import { searchPublicGraves } from "@/lib/data/public";
import { buildSearchInput, isSearchable } from "@/lib/search/normalize";

/**
 * GET /api/cari?q=rita&blok=A&offset=0
 * Hanya mengembalikan field publik (dari RPC search_public_graves di atas view public_graves).
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const input = buildSearchInput(params.get("q"), params.get("blok"));
  const offset = Math.max(0, Math.min(Number.parseInt(params.get("offset") ?? "0", 10) || 0, 10_000));

  if (!isSearchable(input.term)) {
    return NextResponse.json(
      { error: `Ketik minimal ${SEARCH.minChars} huruf.`, items: [], total: 0 },
      { status: 400 },
    );
  }

  try {
    const page = await searchPublicGraves(input, offset);
    return NextResponse.json(page, {
      headers: {
        "Cache-Control": `public, max-age=0, s-maxage=${SEARCH.cdnMaxAgeSeconds}, stale-while-revalidate=60`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Data belum dapat dimuat. Coba lagi.", items: [], total: 0 },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
