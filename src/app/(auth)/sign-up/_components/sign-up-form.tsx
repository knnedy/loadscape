"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Check, Lock, Mail, User } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  AuthError,
  AuthField,
  AuthSubmitButton,
} from "../../_components/auth-form-parts";

const MIN_PASSWORD_LENGTH = 8;

export function SignUpForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [password, setPassword] = useState("");
  const longEnough = password.length >= MIN_PASSWORD_LENGTH;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    setPending(true);

    const { error: signUpError } = await authClient.signUp.email({
      name: String(formData.get("name")),
      email: String(formData.get("email")),
      password: String(formData.get("password")),
    });

    if (signUpError) {
      setError(signUpError.message ?? "Couldn't create your account.");
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
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Design a system, then see how it holds up under load.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <AuthField
          id="name"
          label="Name"
          autoComplete="name"
          icon={<User />}
          autoFocus
          required
        />
        <AuthField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          icon={<Mail />}
          required
        />
        <div className="flex flex-col gap-2">
          <AuthField
            id="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            icon={<Lock />}
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <p
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors",
              longEnough ? "text-foreground" : "text-muted-foreground",
            )}>
            <Check
              size={13}
              className={longEnough ? "text-primary" : "opacity-40"}
            />
            At least {MIN_PASSWORD_LENGTH} characters
          </p>
        </div>
        {error && <AuthError message={error} />}
        <AuthSubmitButton pending={pending}>Create account</AuthSubmitButton>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={`/sign-in?redirect=${encodeURIComponent(redirectTo)}`}
          className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
