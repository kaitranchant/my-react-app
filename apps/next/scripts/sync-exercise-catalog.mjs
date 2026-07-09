/**
 * Download Free ExerciseDB JSON + images into apps/next.
 * Run: yarn workspace next-app sync:exercise-catalog
 *
 * Uses committed data/exercises.json when present (CI/Vercel builds).
 * Set EXERCISE_CATALOG_FORCE_SYNC=1 to always re-download.
 */
import { execSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(scriptDir, '..')
const dataDir = path.join(appRoot, 'data')
const publicExercisesDir = path.join(appRoot, 'public', 'exercises')
const jsonPath = path.join(dataDir, 'exercises.json')
const jsonUrl =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
const repoUrl = 'https://github.com/yuhonas/free-exercise-db.git'
const tmpDir = path.join(appRoot, '.tmp', 'free-exercise-db')

const forceSync = process.env.EXERCISE_CATALOG_FORCE_SYNC === '1'

function readCachedJson() {
  if (!existsSync(jsonPath)) return null

  try {
    const exercises = JSON.parse(readFileSync(jsonPath, 'utf8'))
    if (!Array.isArray(exercises) || exercises.length === 0) return null
    return exercises
  } catch {
    return null
  }
}

function hasCachedImages() {
  if (!existsSync(publicExercisesDir)) return false

  try {
    return readdirSync(publicExercisesDir).length > 0
  } catch {
    return false
  }
}

async function fetchWithRetry(url, label, { maxAttempts = 4 } = {}) {
  let lastError

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(url)
    if (response.ok) return response

    if (response.status === 429 || response.status >= 500) {
      const retryAfterHeader = response.headers.get('retry-after')
      const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN
      const delayMs = Number.isFinite(retryAfterSeconds)
        ? retryAfterSeconds * 1000
        : Math.min(1000 * 2 ** (attempt - 1), 8000)

      console.warn(
        `${label} download failed (${response.status}), retrying in ${delayMs}ms (${attempt}/${maxAttempts})…`
      )
      await new Promise((resolve) => setTimeout(resolve, delayMs))
      lastError = new Error(`Failed to download ${label} (${response.status})`)
      continue
    }

    throw new Error(`Failed to download ${label} (${response.status})`)
  }

  throw lastError ?? new Error(`Failed to download ${label}`)
}

async function downloadJson() {
  mkdirSync(dataDir, { recursive: true })

  const cached = readCachedJson()
  if (!forceSync && cached) {
    console.log(`Using cached exercises.json (${cached.length} exercises)`)
    return
  }

  console.log('Downloading exercises.json…')

  try {
    const response = await fetchWithRetry(jsonUrl, 'exercises.json')
    const body = await response.text()
    writeFileSync(jsonPath, body, 'utf8')

    const exercises = JSON.parse(body)
    console.log(`Saved ${exercises.length} exercises to ${jsonPath}`)
  } catch (error) {
    if (cached) {
      console.warn(
        `Could not refresh exercises.json (${error.message}). Using cached copy (${cached.length} exercises).`
      )
      return
    }
    throw error
  }
}

function downloadImages() {
  if (!forceSync && hasCachedImages()) {
    console.log(`Using cached exercise images in ${publicExercisesDir}`)
    return
  }

  try {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true })
    }

    mkdirSync(path.dirname(tmpDir), { recursive: true })
    console.log('Cloning exercise images (sparse checkout)…')
    execSync(
      `git clone --depth 1 --filter=blob:none --sparse "${repoUrl}" "${tmpDir}"`,
      {
        stdio: 'inherit',
      }
    )
    execSync('git sparse-checkout set exercises', {
      cwd: tmpDir,
      stdio: 'inherit',
    })

    if (existsSync(publicExercisesDir)) {
      rmSync(publicExercisesDir, { recursive: true, force: true })
    }

    cpSync(path.join(tmpDir, 'exercises'), publicExercisesDir, {
      recursive: true,
    })
    rmSync(tmpDir, { recursive: true, force: true })
    console.log(`Copied images to ${publicExercisesDir}`)
  } catch (error) {
    if (hasCachedImages()) {
      console.warn(
        `Exercise image sync failed (${error.message}). Using cached images.`
      )
      return
    }

    console.warn(
      `Exercise image sync failed (${error.message}). Continuing without local images.`
    )
  }
}

await downloadJson()
downloadImages()
console.log('Exercise catalog sync complete.')
