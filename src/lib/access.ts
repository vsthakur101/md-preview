/**
 * Sign-in access control.
 *
 * By default the app accepts any Google account (open sign-up). Set either
 * `AUTH_ALLOWED_EMAILS` (comma-separated addresses) and/or `AUTH_ALLOWED_DOMAINS`
 * (comma-separated email domains, e.g. `example.com`) to restrict who can sign
 * in. If either is set, only matching accounts are allowed.
 *
 * Pure and dependency-free so it can run on the Edge runtime (it is called from
 * the `signIn` callback in the edge-safe auth config).
 */
function parseList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email: string | null | undefined): boolean {
  const allowedEmails = parseList(process.env.AUTH_ALLOWED_EMAILS);
  const allowedDomains = parseList(process.env.AUTH_ALLOWED_DOMAINS);

  // No allowlist configured → open sign-up (preserves default behavior).
  if (allowedEmails.length === 0 && allowedDomains.length === 0) {
    return true;
  }

  if (!email) {
    return false;
  }

  const normalized = email.trim().toLowerCase();
  if (allowedEmails.includes(normalized)) {
    return true;
  }

  const domain = normalized.split('@')[1];
  return domain ? allowedDomains.includes(domain) : false;
}
