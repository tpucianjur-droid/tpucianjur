"use client";

import { useSyncExternalStore } from "react";
import { CalendarDays } from "lucide-react";

const DATE = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
const TIME = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

const subscribe = (onChange: () => void) => {
  const id = window.setInterval(onChange, 15_000);
  return () => window.clearInterval(id);
};
const getMinute = () => Math.floor(Date.now() / 60_000);
const getServerMinute = () => null;

/** Tanggal & jam (WIB) di header Admin. Dirender di klien agar tidak terjadi hydration mismatch. */
export function AdminClock() {
  const minute = useSyncExternalStore(subscribe, getMinute, getServerMinute);
  const now = minute === null ? null : new Date(minute * 60_000);
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <CalendarDays className="size-5 text-muted" aria-hidden="true" />
      <p className="leading-tight">
        <span className="block min-w-36 font-semibold text-ink">{now ? DATE.format(now) : " "}</span>
        <span className="text-muted">{now ? `${TIME.format(now).replace(".", ":")} WIB` : " "}</span>
      </p>
    </div>
  );
}
