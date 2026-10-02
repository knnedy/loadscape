"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Lock, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
  AuthError,
  AuthField,
  AuthSubmitButton,
} from "../../_components/auth-form-parts";

export function SignInForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    setPending(true);

    const { error: signInError } = await authClient.signIn.email({
      email: String(formData.get("email")),
      password: String(formData.get("password")),
    });

    if (signInError) {
      setError(signInError.message ?? "Couldn't sign in. Please try again.");
      setPending(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Sign in to Loadscape
        </h1>
        <p className="text-sm text-muted-foreground">
          Pick up your diagrams where you left off.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <AuthField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          icon={<Mail />}
          autoFocus
          required
        />
        <AuthField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          icon={<Lock />}
          required
        />
        {error && <AuthError message={error} />}
        <AuthSubmitButton pending={pending}>Sign in</AuthSubmitButton>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link
          href={`/sign-up?redirect=${encodeURIComponent(redirectTo)}`}
          className="font-medium text-primary underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
