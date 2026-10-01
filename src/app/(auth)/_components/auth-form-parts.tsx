"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AuthFieldProps extends ComponentProps<"input"> {
  id: string;
  label: string;
  icon: ReactNode;
}

export function AuthField({
  id,
  label,
  icon,
  type = "text",
  className,
  ...props
}: AuthFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground [&_svg]:size-4">
          {icon}
        </span>
        <Input
          id={id}
          name={id}
          type={isPassword && revealed ? "text" : type}
          className={cn(
            "h-11 rounded-xl bg-background pl-10 dark:bg-background",
            isPassword && "pr-11",
            className,
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "Hide password" : "Show password"}
            className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
            {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

export function AuthSubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-11 w-full rounded-xl text-sm font-medium">
      {pending && <Loader2 size={16} className="animate-spin" />}
      {children}
    </Button>
  );
}
