/**
 * Download Free ExerciseDB JSON + images into apps/next.
 * Run: yarn workspace next-app sync:exercise-catalog
 */
import { execSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
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

async function downloadJson() {
  mkdirSync(dataDir, { recursive: true })
  console.log('Downloading exercises.json…')
  const response = await fetch(jsonUrl)
  if (!response.ok) {
    throw new Error(`Failed to download exercises.json (${response.status})`)
  }

  const body = await response.text()
  writeFileSync(jsonPath, body, 'utf8')

  const exercises = JSON.parse(body)
  console.log(`Saved ${exercises.length} exercises to ${jsonPath}`)
}

function downloadImages() {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true })
  }

  mkdirSync(path.dirname(tmpDir), { recursive: true })
  console.log('Cloning exercise images (sparse checkout)…')
  execSync(`git clone --depth 1 --filter=blob:none --sparse "${repoUrl}" "${tmpDir}"`, {
    stdio: 'inherit',
  })
  execSync('git sparse-checkout set exercises', {
    cwd: tmpDir,
    stdio: 'inherit',
  })

  if (existsSync(publicExercisesDir)) {
    rmSync(publicExercisesDir, { recursive: true, force: true })
  }

  cpSync(path.join(tmpDir, 'exercises'), publicExercisesDir, { recursive: true })
  rmSync(tmpDir, { recursive: true, force: true })
  console.log(`Copied images to ${publicExercisesDir}`)
}

await downloadJson()
downloadImages()
console.log('Exercise catalog sync complete.')
