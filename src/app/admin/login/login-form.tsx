"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { FieldMessage, inputClass, Label } from "@/components/ui/field";
import { cn } from "@/components/ui/cn";
import { signIn } from "@/lib/actions/auth";
import { IDLE, type ActionResult } from "@/lib/actions/result";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(signIn, IDLE);
  const [showPassword, setShowPassword] = useState(false);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={action} noValidate>
      <fieldset disabled={pending} className="space-y-5">
        <input type="hidden" name="next" value={next} />
        {state.status === "error" && (
          <Alert tone="error" live>
            {state.message}
          </Alert>
        )}

        <div>
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              required
              placeholder="contoh: admin@tpu.go.id"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "email-msg" : undefined}
              className={cn(inputClass(Boolean(errors.email)), "pl-12")}
            />
          </div>
          <FieldMessage id="email-msg" error={errors.email} />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? "password-msg" : undefined}
              className={cn(inputClass(Boolean(errors.password)), "pl-12 pr-14")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
              className="absolute right-1.5 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:text-ink"
            >
              {showPassword ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
              <span className="sr-only">{showPassword ? "Sembunyikan password" : "Tampilkan password"}</span>
            </button>
          </div>
          <FieldMessage id="password-msg" error={errors.password} />
        </div>

        <Button type="submit" size="lg" className="w-full" loading={pending} loadingText="Memverifikasi…">
          Masuk
          <ArrowRight className="size-5" aria-hidden="true" />
        </Button>
      </fieldset>
    </form>
  );
}
