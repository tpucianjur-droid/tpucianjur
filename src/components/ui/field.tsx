import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "./cn";

/** Kontrol form Admin: teks >= 16px, tinggi >= 48px, label eksplisit (UX V1 §3). */
export const inputClass = (invalid?: boolean, flagged?: boolean) =>
  cn(
    "block w-full rounded-xl border bg-white px-4 text-[1.0625rem] text-ink placeholder:text-muted/70",
    "min-h-12 transition-colors focus:outline-none focus:ring-3",
    invalid || flagged
      ? "border-danger bg-danger-soft/60 focus:border-danger focus:ring-danger/20"
      : "border-line focus:border-primary focus:ring-primary/15",
    flagged && "pr-11",
  );

export function Label({ htmlFor, children, required }: { htmlFor: string; children: ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-[0.95rem] font-semibold text-ink">
      {children}
      {required && (
        <span className="text-danger" aria-hidden="true">
          {" "}
          *
        </span>
      )}
      {required && <span className="sr-only"> (wajib)</span>}
    </label>
  );
}

export function FieldMessage({ id, error, hint }: { id: string; error?: string; hint?: ReactNode }) {
  if (error) {
    return (
      <p id={id} className="mt-2 flex items-start gap-1.5 text-[0.9rem] font-medium text-danger">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {error}
      </p>
    );
  }
  if (hint) {
    return (
      <p id={id} className="mt-2 text-[0.9rem] text-muted">
        {hint}
      </p>
    );
  }
  return null;
}

type TextFieldProps = ComponentProps<"input"> & {
  label: string;
  name: string;
  error?: string;
  hint?: ReactNode;
  icon?: ReactNode;
};

export function TextField({ label, name, error, hint, icon, required, className, id, ...props }: TextFieldProps) {
  const fieldId = id ?? `f-${name}`;
  const messageId = `${fieldId}-msg`;
  return (
    <div className={className}>
      <Label htmlFor={fieldId} required={required}>
        {label}
      </Label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted" aria-hidden="true">
            {icon}
          </span>
        )}
        <input
          id={fieldId}
          name={name}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          className={cn(inputClass(Boolean(error)), icon ? "pl-11" : undefined)}
          {...props}
        />
      </div>
      <FieldMessage id={messageId} error={error} hint={hint} />
    </div>
  );
}

type SelectFieldProps = ComponentProps<"select"> & { label: string; name: string; error?: string; hint?: ReactNode };

export function SelectField({ label, name, error, hint, required, className, id, children, ...props }: SelectFieldProps) {
  const fieldId = id ?? `f-${name}`;
  const messageId = `${fieldId}-msg`;
  return (
    <div className={className}>
      <Label htmlFor={fieldId} required={required}>
        {label}
      </Label>
      <select
        id={fieldId}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={cn(inputClass(Boolean(error)), "appearance-auto")}
        {...props}
      >
        {children}
      </select>
      <FieldMessage id={messageId} error={error} hint={hint} />
    </div>
  );
}

export function CheckboxField({
  name,
  label,
  description,
  defaultChecked,
  id,
}: {
  name: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
  id?: string;
}) {
  const fieldId = id ?? `f-${name}`;
  return (
    <label htmlFor={fieldId} className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-line bg-white px-4 py-3">
      <input
        id={fieldId}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-0.5 size-5 shrink-0 accent-(--color-primary)"
      />
      <span>
        <span className="block font-semibold">{label}</span>
        {description && <span className="block text-[0.9rem] text-muted">{description}</span>}
      </span>
    </label>
  );
}
