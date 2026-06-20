export function buildClientInviteUrl(token: string, origin: string) {
  return `${origin.replace(/\/$/, '')}/signup?invite=${token}`
}

export function buildGymInviteUrl(token: string, origin: string) {
  return `${origin.replace(/\/$/, '')}/signup?gym_invite=${token}`
}

export function buildGymJoinUrl(token: string, origin: string) {
  return `${origin.replace(/\/$/, '')}/gym/join?invite=${token}`
}
