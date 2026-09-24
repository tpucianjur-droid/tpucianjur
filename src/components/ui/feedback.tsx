import type { CSSProperties, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "./cn";

type Tone = "info" | "success" | "warning" | "error";

const ALERT_TONES: Record<Tone, { box: string; icon: ReactNode }> = {
  info: { box: "border-sage-strong bg-sage text-ink", icon: <Info className="size-5 text-primary" /> },
  success: { box: "border-primary/30 bg-primary-soft text-ink", icon: <CheckCircle2 className="size-5 text-primary" /> },
  warning: { box: "border-gold/40 bg-gold-soft text-ink", icon: <AlertTriangle className="size-5 text-gold" /> },
  error: { box: "border-danger/40 bg-danger-soft text-ink", icon: <XCircle className="size-5 text-danger" /> },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
  live = false,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  className?: string;
  live?: boolean;
}) {
  const style = ALERT_TONES[tone];
  return (
    <div
      role={live ? (tone === "error" ? "alert" : "status") : undefined}
      className={cn("flex gap-3 rounded-xl border px-4 py-3", style.box, className)}
    >
      <span className="mt-0.5 shrink-0" aria-hidden="true">
        {style.icon}
      </span>
      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-[0.95rem] leading-relaxed [overflow-wrap:anywhere]">{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-white px-6 py-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-sage text-primary" aria-hidden="true">
        {icon}
      </span>
      <p className="font-serif text-xl font-semibold">{title}</p>
      {children && <div className="max-w-md text-muted">{children}</div>}
      {action}
    </div>
  );
}

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-line/60", className)} style={style} aria-hidden="true">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-linear-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}
