export function buildClientInviteUrl(token: string, origin: string) {
  return `${origin.replace(/\/$/, '')}/signup?invite=${token}`
}
