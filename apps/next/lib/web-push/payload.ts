export type WebPushPayload = {
  title: string
  body: string
  url: string
  tag?: string
}

export function serializeWebPushPayload(payload: WebPushPayload): string {
  return JSON.stringify(payload)
}
