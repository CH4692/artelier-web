/** Only known workshop destinations can be resumed after login. */
export function safeReturnUrl(value: string | null): string {
  if (!value || [...value].some((character) => character === '\\' || character.charCodeAt(0) <= 32))
    return '/dashboard';
  return /^\/(dashboard|customers(?:\/(?:new|[1-9]\d*(?:\/edit)?))?|instruments(?:\/(?:new|[1-9]\d*(?:\/edit)?))?|repairs)(?:[?#].*)?$/.test(
    value,
  )
    ? value
    : '/dashboard';
}
