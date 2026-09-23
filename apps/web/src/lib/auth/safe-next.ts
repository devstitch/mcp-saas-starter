/**
 * Allow only same-app relative paths. Rejects protocol-relative URLs
 * (`//evil.example`) and backslash tricks that some browsers treat as hosts.
 */
export function safeInternalPath(
  value: string | null | undefined,
  fallback = '/dashboard',
): string {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback;
  }
  if (value.includes('\\') || value.includes('://')) {
    return fallback;
  }
  return value;
}
