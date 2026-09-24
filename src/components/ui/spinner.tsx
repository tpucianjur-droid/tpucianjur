import { cn } from "./cn";

/** Spinner kecil & halus untuk umpan balik proses (tombol, input, overlay). Warna mengikuti `currentColor`. */
export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role={label ? "status" : undefined} className={cn("inline-flex shrink-0", className ?? "size-5")}>
      <svg viewBox="0 0 24 24" fill="none" className="size-full animate-spin [animation-duration:700ms]" aria-hidden="true">
        <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeOpacity="0.22" strokeWidth="3" />
        <path d="M21.5 12a9.5 9.5 0 0 0-9.5-9.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}
