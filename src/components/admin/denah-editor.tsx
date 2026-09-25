"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { MousePointerClick, Pencil, RotateCcw, Save } from "lucide-react";
import { GraveMap, type MapGrave } from "@/components/denah/grave-map";
import { Legend } from "@/components/denah/public-denah";
import { Button, buttonClass } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { inputClass, Label } from "@/components/ui/field";
import { LoadingOverlay } from "@/components/ui/skeletons";
import { useToast } from "@/components/ui/toast";
import { setGravePosition } from "@/lib/actions/graves";
import { cellKey, resolvePosition, type BlockGridInput } from "@/lib/denah/layout";

type Props = {
  block: BlockGridInput & { code: string; name: string };
  graves: (MapGrave & { verify_location: boolean })[];
};

const SOURCE_LABEL = {
  free: "Posisi bebas (X/Y)",
  grid: "Diatur manual (baris/kolom)",
  layout: "Otomatis dari layout baris blok",
  auto: "Otomatis dari nomor (simulasi)",
} as const;

/**
 * Editor posisi: pilih makam (klik di denah atau dari daftar) → klik petak kosong untuk memindahkan.
 * Setiap perubahan langsung disimpan dan tercermin di halaman publik.
 */
export function DenahEditor({ block, graves: initialGraves }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [graves, setGraves] = useState(initialGraves);
  const [action, setAction] = useState<"move" | "manual" | "reset" | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [rowInput, setRowInput] = useState("");
  const [colInput, setColInput] = useState("");

  const selected = graves.find((g) => g.id === selectedId) ?? null;
  const selectedPos = selected ? resolvePosition(selected, block) : null;

  const stats = useMemo(() => {
    const seen = new Map<string, number>();
    let unplaced = 0;
    for (const grave of graves) {
      const pos = resolvePosition(grave, block);
      if (!pos) {
        unplaced++;
        continue;
      }
      const key = cellKey(pos);
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    const overlaps = [...seen.values()].filter((count) => count > 1).length;
    return { unplaced, overlaps };
  }, [graves, block]);

  const select = (id: string) => {
    setSelectedId(id);
    setMessage(null);
    const grave = graves.find((g) => g.id === id);
    const pos = grave ? resolvePosition(grave, block) : null;
    setRowInput(pos ? String(Math.round(pos.y)) : "");
    setColInput(pos ? String(Math.round(pos.x)) : "");
  };

  const save = (graveId: string, row: number | null, column: number | null, kind: "move" | "manual" | "reset") => {
    if (pending) return;
    setAction(kind);
    const previous = graves;
    setGraves((list) =>
      list.map((g) => (g.id === graveId ? { ...g, visual_row: row, visual_column: column, visual_x: null, visual_y: null } : g)),
    );
    startTransition(async () => {
      const result = await setGravePosition({ grave_id: graveId, visual_row: row, visual_column: column, visual_x: null, visual_y: null });
      if (result.status === "error") {
        setGraves(previous);
        setMessage({ tone: "error", text: result.message });
        toast(result.message, "error");
        return;
      }
      if (result.status === "success") {
        setMessage({ tone: "success", text: result.message });
        toast(result.message);
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="relative">
          {pending && <LoadingOverlay label="Menyimpan posisi…" className="rounded-2xl" />}
          <GraveMap
            block={block}
            graves={graves}
            targetId={selectedId}
            onSelectGrave={select}
            editable
            onSelectCell={(x, y) => {
              if (!selected) {
                setMessage({ tone: "error", text: "Pilih makam terlebih dahulu, lalu klik petak kosong." });
                return;
              }
              setRowInput(String(y));
              setColInput(String(x));
              save(selected.id, y, x, "move");
            }}
            className="h-[60vh] min-h-96"
            ariaLabel={`Editor denah ${block.name}`}
          />
        </div>

        <div className="space-y-4 rounded-2xl border border-line bg-white p-4">
          <div>
            <Label htmlFor="pick-grave">Pilih makam</Label>
            <select id="pick-grave" value={selectedId ?? ""} onChange={(e) => e.target.value && select(e.target.value)} className={inputClass()}>
              <option value="">— pilih dari daftar —</option>
              {graves.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.grave_code} · {g.deceased_name}
                </option>
              ))}
            </select>
          </div>

          {selected ? (
            <div className="space-y-3">
              <div>
                <p className="text-lg font-bold">{selected.deceased_name}</p>
                <p className="text-muted">{selected.grave_code}</p>
                <p className="mt-1 text-sm">
                  {selectedPos ? SOURCE_LABEL[selectedPos.source] : "Belum punya posisi"}
                  {selected.verify_location && <span className="ml-1 font-semibold text-danger">· lokasi perlu dicek</span>}
                </p>
              </div>
              <p className="flex items-start gap-2 rounded-xl bg-sage p-3 text-sm">
                <MousePointerClick className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                Klik petak kosong (garis putus-putus) di denah untuk memindahkan makam ini.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="pos-row">Baris</Label>
                  <input id="pos-row" type="number" min={1} max={500} inputMode="numeric" value={rowInput} onChange={(e) => setRowInput(e.target.value)} className={inputClass()} />
                </div>
                <div>
                  <Label htmlFor="pos-col">Kolom</Label>
                  <input id="pos-col" type="number" min={1} max={500} inputMode="numeric" value={colInput} onChange={(e) => setColInput(e.target.value)} className={inputClass()} />
                </div>
              </div>
              <Button
                size="lg"
                className="w-full"
                disabled={pending || !rowInput || !colInput}
                loading={pending && action === "manual"}
                loadingText="Menyimpan…"
                onClick={() => save(selected.id, Number(rowInput), Number(colInput), "manual")}
                icon={<Save className="size-5" aria-hidden="true" />}
              >
                Simpan posisi
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                disabled={pending}
                loading={pending && action === "reset"}
                loadingText="Memproses…"
                onClick={() => save(selected.id, null, null, "reset")}
                icon={<RotateCcw className="size-5" aria-hidden="true" />}
              >
                Kembalikan ke otomatis
              </Button>
              <Link href={`/admin/makam/${selected.id}/edit`} className={buttonClass("ghost", "lg", "w-full")}>
                <Pencil className="size-5" aria-hidden="true" />
                Edit data makam
              </Link>
            </div>
          ) : (
            <p className="text-muted">Klik makam pada denah atau pilih dari daftar untuk mengatur posisinya.</p>
          )}

          {message && (
            <Alert tone={message.tone} live>
              {message.text}
            </Alert>
          )}
        </div>
      </div>

      <Legend editor />
      {(stats.overlaps > 0 || stats.unplaced > 0) && (
        <Alert tone="warning">
          {stats.overlaps > 0 && <p>{stats.overlaps} petak berisi lebih dari satu makam. Pindahkan salah satunya.</p>}
          {stats.unplaced > 0 && (
            <p>{stats.unplaced} makam belum punya posisi (isi jumlah kolom blok atau atur baris/kolom per makam).</p>
          )}
        </Alert>
      )}
    </div>
  );
}
