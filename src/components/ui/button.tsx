import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";
import { Spinner } from "./spinner";

type Variant = "primary" | "secondary" | "soft" | "ghost" | "danger" | "dangerSolid";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover shadow-sm",
  secondary: "bg-white text-primary border border-line hover:border-primary/40 hover:bg-primary-soft",
  soft: "bg-sage text-primary hover:bg-sage-strong",
  ghost: "text-primary hover:bg-primary-soft",
  danger: "bg-white text-danger border border-danger/40 hover:bg-danger-soft",
  dangerSolid: "bg-danger text-white hover:bg-danger-hover shadow-sm",
};

const SIZES: Record<Size, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-[0.95rem]",
  lg: "min-h-13 px-6 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-150",
    "disabled:cursor-not-allowed disabled:not-aria-busy:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 aria-busy:cursor-wait",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

type LoadingProps = {
  /** Proses async sedang berjalan: tombol dinonaktifkan (cegah double submit) dan menampilkan spinner. */
  loading?: boolean;
  /** Teks saat memproses, mis. "Menyimpan…". Lebar tombol tetap (tidak loncat) karena kedua label ditumpuk. */
  loadingText?: ReactNode;
};

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size; icon?: ReactNode } & LoadingProps;

export function Button({
  variant,
  size,
  icon,
  className,
  children,
  type = "button",
  loading = false,
  loadingText,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      <ButtonContent icon={icon} loading={loading} loadingText={loadingText}>
        {children}
      </ButtonContent>
    </button>
  );
}

/**
 * Isi tombol dengan state loading. Label normal & label loading ditumpuk di satu sel grid,
 * sehingga ukuran tombol selalu mengikuti label terpanjang dan tidak berubah saat memproses.
 */
export function ButtonContent({ icon, loading = false, loadingText, children }: { icon?: ReactNode; children?: ReactNode } & LoadingProps) {
  if (loadingText === undefined) {
    return (
      <>
        {loading ? <Spinner className="size-[1.15em]" /> : icon}
        {children}
      </>
    );
  }
  return (
    <span className="grid place-items-center">
      <span className={cn("col-start-1 row-start-1 inline-flex items-center gap-2", loading && "invisible")}>
        {icon}
        {children}
      </span>
      <span className={cn("col-start-1 row-start-1 inline-flex items-center gap-2", !loading && "invisible")} aria-hidden={!loading}>
        <Spinner className="size-[1.15em]" />
        {loadingText}
      </span>
    </span>
  );
}

type LinkButtonProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size; icon?: ReactNode };

export function LinkButton({ variant, size, icon, className, children, ...props }: LinkButtonProps) {
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}

type ExternalButtonProps = ComponentProps<"a"> & { variant?: Variant; size?: Size; icon?: ReactNode };

/** Tautan eksternal (Google Maps) yang dibuka di tab/aplikasi baru. */
export function ExternalLinkButton({ variant, size, icon, className, children, ...props }: ExternalButtonProps) {
  return (
    <a target="_blank" rel="noopener noreferrer" className={buttonClass(variant, size, className)} {...props}>
      {icon}
      {children}
    </a>
  );
}
