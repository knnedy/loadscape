import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, type Session } from "@/server/auth";

export const getSession = cache(
  async (): Promise<Session | null> =>
    auth.api.getSession({ headers: await headers() }),
);

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
}
