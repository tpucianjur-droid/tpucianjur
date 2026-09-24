import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-line/70 bg-white shadow-(--shadow-card)", className)} {...props} />;
}

export function IconBadge({ children, tone = "sage", className }: { children: ReactNode; tone?: "sage" | "gold" | "danger" | "primary"; className?: string }) {
  const tones = {
    sage: "bg-sage text-primary",
    gold: "bg-gold-soft text-gold",
    danger: "bg-danger-soft text-danger",
    primary: "bg-primary text-white",
  } as const;
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex size-11 shrink-0 items-center justify-center rounded-full", tones[tone], className)}
    >
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  align?: "center" | "left";
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("space-y-2", align === "center" && "text-center")}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <Tag className="font-serif text-2xl font-semibold text-ink sm:text-3xl">{title}</Tag>
      {description && <p className={cn("text-muted", align === "center" && "mx-auto max-w-2xl")}>{description}</p>}
    </div>
  );
}
