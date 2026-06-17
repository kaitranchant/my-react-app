export const AVATAR_SIZE_PX = 128
export const AVATAR_MAX_UPLOAD_BYTES = 102_400

export function clientAvatarStoragePath(clientId: string) {
  return `clients/${clientId}/avatar.webp`
}

export function withAvatarCacheBuster(url: string, version?: string | number) {
  const v = version ?? Date.now()
  return url.includes('?') ? `${url}&v=${v}` : `${url}?v=${v}`
}
