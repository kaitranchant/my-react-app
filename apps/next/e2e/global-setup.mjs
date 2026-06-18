import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import loadEnvLocal from '../scripts/load-env-local.mjs'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export default function globalSetup() {
  loadEnvLocal()
  execSync('node scripts/seed-e2e.mjs', {
    cwd: appRoot,
    stdio: 'inherit',
    env: process.env,
  })
}
