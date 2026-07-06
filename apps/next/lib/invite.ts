import { CLIENT_INVITE_EXPIRY_DAYS } from '@/lib/constants'
import { getAppBaseUrl } from '@/lib/email/config'

export function buildClientInviteUrl(token: string, origin: string) {
  return `${origin.replace(/\/$/, '')}/signup?invite=${token}`
}

export function buildGymInviteUrl(token: string, origin: string) {
  return `${origin.replace(/\/$/, '')}/signup?gym_invite=${token}`
}

export function buildGymJoinUrl(token: string, origin: string) {
  return `${origin.replace(/\/$/, '')}/gym/join?invite=${token}`
}

export function buildOnboardingSignUrl(token: string, origin?: string) {
  const base = (origin ?? getAppBaseUrl()).replace(/\/$/, '')
  return `${base}/sign?token=${token}`
}

export function buildOnboardingInPersonSignUrl(clientId: string, packetId: string) {
  return `/clients/${clientId}/onboard/sign?packet=${packetId}`
}

export function getOnboardingSignExpiryDate(now = new Date()) {
  const expires = new Date(now)
  expires.setDate(expires.getDate() + CLIENT_INVITE_EXPIRY_DAYS)
  return expires.toISOString()
}
