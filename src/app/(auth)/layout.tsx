import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <Link
        href="/"
        className="text-lg font-semibold tracking-tight text-foreground">
        Loadscape
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
