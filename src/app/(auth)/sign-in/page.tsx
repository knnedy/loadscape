import { redirect } from "next/navigation";
import { getSession } from "@/server/session";
import { getSafeRedirect } from "@/lib/safe-redirect";
import { SignInForm } from "./_components/sign-in-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[] }>;
}) {
  const { redirect: redirectParam } = await searchParams;
  const redirectTo = getSafeRedirect(redirectParam);

  if (await getSession()) redirect(redirectTo);

  return <SignInForm redirectTo={redirectTo} />;
}
