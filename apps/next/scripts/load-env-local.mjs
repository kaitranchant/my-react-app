import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function loadEnvLocal() {
  for (const envPath of [
    resolve(__dirname, '../.env.local'),
    resolve(__dirname, '../../../.env.local'),
  ]) {
    if (!existsSync(envPath)) continue
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim().replace(/\r$/, '')
      if (!process.env[key]) process.env[key] = value
    }
  }
}

export default loadEnvLocal
