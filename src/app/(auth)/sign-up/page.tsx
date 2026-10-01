import { redirect } from "next/navigation";
import { getSession } from "@/server/session";
import { getSafeRedirect } from "@/lib/safe-redirect";
import { SignUpForm } from "./_components/sign-up-form";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[] }>;
}) {
  const { redirect: redirectParam } = await searchParams;
  const redirectTo = getSafeRedirect(redirectParam);

  if (await getSession()) redirect(redirectTo);

  return <SignUpForm redirectTo={redirectTo} />;
}
