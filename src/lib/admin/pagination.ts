/** [1, null, 4, 5, 6, null, 15] — null = celah "…". */
export function pageList(page: number, pages: number): (number | null)[] {
  const wanted = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  if (page <= 3) [2, 3, 4].forEach((p) => p <= pages && wanted.add(p));
  if (page >= pages - 2) [pages - 3, pages - 2, pages - 1].forEach((p) => p >= 1 && wanted.add(p));
  const sorted = [...wanted].sort((a, b) => a - b);
  const result: (number | null)[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push(p - sorted[i - 1] === 2 ? p - 1 : null);
    result.push(p);
  });
  return result;
}
