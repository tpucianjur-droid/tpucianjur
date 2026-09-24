"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, X, XCircle } from "lucide-react";
import { cn } from "./cn";

type ToastTone = "success" | "warning" | "error";
type ToastItem = { id: number; tone: ToastTone; message: string };
type ToastFn = (message: string, tone?: ToastTone) => void;

const ToastContext = createContext<ToastFn>(() => {});

const ICONS = {
  success: <CheckCircle2 className="size-5 text-primary" aria-hidden="true" />,
  warning: <AlertTriangle className="size-5 text-gold" aria-hidden="true" />,
  error: <XCircle className="size-5 text-danger" aria-hidden="true" />,
} as const;

const DURATION_MS = { success: 3500, warning: 6000, error: 6000 } as const;

/** Notifikasi singkat (toast) ringan tanpa library: "Data berhasil disimpan.", dsb. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((item) => item.id !== id)), []);

  const toast = useCallback<ToastFn>(
    (message, tone = "success") => {
      const id = ++nextId.current;
      setItems((list) => [...list.filter((item) => item.message !== message), { id, tone, message }].slice(-3));
      window.setTimeout(() => dismiss(id), DURATION_MS[tone]);
    },
    [dismiss],
  );

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+4.75rem)] z-[60] flex flex-col items-center gap-2 px-4 lg:top-6 lg:items-end lg:px-6"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role={item.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-xl border bg-white py-3 pl-4 pr-2 text-[0.95rem] shadow-(--shadow-lift)",
              item.tone === "success" && "border-primary/25",
              item.tone === "warning" && "border-gold/40",
              item.tone === "error" && "border-danger/40",
            )}
          >
            <span className="mt-0.5 shrink-0">{ICONS[item.tone]}</span>
            <p className="min-w-0 flex-1 py-0.5 font-medium text-ink">{item.message}</p>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink"
            >
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">Tutup notifikasi</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastFn {
  return useContext(ToastContext);
}
