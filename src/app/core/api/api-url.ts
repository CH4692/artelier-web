/** Validate configuration once at the boundary; no secret-bearing URL forms are supported. */
export function apiBaseUrl(value: string, origin = globalThis.location.origin): URL {
  if (!/^(?:https?:\/\/|\/(?!\/))/i.test(value))
    throw new Error('API_BASE_URL must be absolute HTTP(S) or root-relative.');
  const url = new URL(value, origin);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !/\/api\/v1\/?$/.test(url.pathname)
  )
    throw new Error(
      'API_BASE_URL must be an HTTP(S) URL ending in /api/v1 without credentials, query or fragment.',
    );
  url.pathname = url.pathname.replace(/\/$/, '');
  return url;
}
export function isTrustedApiUrl(
  value: string,
  base: URL,
  origin = globalThis.location.origin,
): boolean {
  // App requests are root-relative or absolute; document-relative URLs are not trusted implicitly.
  if (!/^(?:https?:\/\/|\/)/i.test(value)) return false;
  try {
    const target = new URL(value, origin);
    return (
      target.origin === base.origin &&
      !target.username &&
      !target.password &&
      !/%(?:2f|5c|2e)/i.test(target.pathname) &&
      (target.pathname === base.pathname || target.pathname.startsWith(base.pathname + '/'))
    );
  } catch {
    return false;
  }
}
export function apiUrl(base: string, path: string): string {
  const configured = apiBaseUrl(base);
  if (
    /(?:^|\/)(?:\.|%2e){1,2}(?:\/|$)/i.test(path.split('?')[0]) ||
    /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(path) ||
    /[\\#]/.test(path)
  )
    throw new Error('API paths must be relative endpoint paths.');
  const target = new URL(path.replace(/^\/+/, ''), configured.href + '/');
  if (!isTrustedApiUrl(target.href, configured))
    throw new Error('API path escapes the configured API boundary.');
  return base.startsWith('/') ? target.pathname + target.search : target.href;
}
