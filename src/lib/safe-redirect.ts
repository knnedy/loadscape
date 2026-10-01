const DEFAULT_REDIRECT = "/projects";

export function getSafeRedirect(value: string | string[] | undefined): string {
  if (typeof value !== "string") return DEFAULT_REDIRECT;
  if (!value.startsWith("/")) return DEFAULT_REDIRECT;
  if (value.startsWith("//") || value.startsWith("/\\"))
    return DEFAULT_REDIRECT;
  return value;
}
