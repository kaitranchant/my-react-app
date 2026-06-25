/**
 * Sync USDA FoodData Central Foundation + filtered SR Legacy foods
 * into apps/next/data/foods.json.
 * Run: yarn workspace next-app sync:food-catalog
 */
import { execSync } from 'node:child_process'
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(scriptDir, '..')
const dataDir = path.join(appRoot, 'data')
const tmpDir = path.join(appRoot, '.tmp', 'usda')
const jsonPath = path.join(dataDir, 'foods.json')

const SR_LEGACY_ZIP_URL =
  'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip'
const FOUNDATION_SUBSET_CSV_URL =
  'https://raw.githubusercontent.com/kafkade/fond/main/data/usda/usda_nutrition_subset.csv'

const EXCLUDED_SR_CATEGORY_IDS = new Set([
  '3', // Baby Foods
  '21', // Fast Foods
  '22', // Meals, Entrees, and Side Dishes
  '24', // American Indian/Alaska Native Foods
  '25', // Restaurant Foods
  '26', // Branded Food Products Database
  '27', // Quality Control Materials
])

const EXCLUDED_SR_CATEGORY_NAMES = new Set([
  'Baby Foods',
  'Fast Foods',
  'Restaurant Foods',
  'Meals, Entrees, and Side Dishes',
  'American Indian/Alaska Native Foods',
])

const EXCLUDED_SR_KEYWORDS = [
  'infant formula',
  'meal replacement',
  'military ration',
  'supplement',
  'baby food',
  'fast food',
  'restaurant',
]

const MACRO_NUTRIENT_IDS = {
  caloriesKcal: '1008',
  proteinG: '1003',
  fatG: '1004',
  carbsG: '1005',
  fiberG: '1079',
}

async function downloadFile(url, destination) {
  console.log(`Downloading ${url}…`)
  mkdirSync(path.dirname(destination), { recursive: true })
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download ${url} (${response.status})`)
  }
  if (!response.body) {
    throw new Error(`Empty response body for ${url}`)
  }
  await pipeline(response.body, createWriteStream(destination))
}

function extractZip(zipPath, destinationDir) {
  mkdirSync(destinationDir, { recursive: true })
  if (process.platform === 'win32') {
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destinationDir.replace(/'/g, "''")}' -Force"`,
      { stdio: 'inherit' }
    )
    return
  }
  execSync(`unzip -o "${zipPath}" -d "${destinationDir}"`, { stdio: 'inherit' })
}

function parseCsv(content) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    const next = content[index + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"'
        index += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }

    if (char === ',') {
      row.push(field)
      field = ''
      continue
    }

    if (char === '\n') {
      row.push(field)
      if (row.some((value) => value.length > 0)) rows.push(row)
      row = []
      field = ''
      continue
    }

    if (char !== '\r') field += char
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  const [header, ...dataRows] = rows
  return dataRows.map((values) =>
    Object.fromEntries(header.map((key, index) => [key, values[index] ?? '']))
  )
}

function shouldIncludeSrLegacyFood(description, categoryName) {
  if (EXCLUDED_SR_CATEGORY_NAMES.has(categoryName)) return false

  const normalized = description.toLowerCase()
  if (EXCLUDED_SR_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return false
  }

  return true
}

function roundMacro(value) {
  return Math.round(Number(value) * 10) / 10
}

function buildFoodRecord({ id, name, category, per100g }) {
  if (
    !name ||
    per100g.caloriesKcal == null ||
    per100g.proteinG == null ||
    per100g.fatG == null ||
    per100g.carbsG == null
  ) {
    return null
  }

  return {
    id: String(id),
    name,
    category,
    source: 'usda',
    per100g: {
      caloriesKcal: roundMacro(per100g.caloriesKcal),
      proteinG: roundMacro(per100g.proteinG),
      fatG: roundMacro(per100g.fatG),
      carbsG: roundMacro(per100g.carbsG),
      ...(per100g.fiberG != null
        ? { fiberG: roundMacro(per100g.fiberG) }
        : {}),
    },
  }
}

async function loadSrLegacyFoods() {
  const datasetDir = path.join(tmpDir, 'sr_legacy')
  const zipPath = path.join(datasetDir, 'sr_legacy.zip')
  const extractDir = path.join(datasetDir, 'extracted')

  mkdirSync(datasetDir, { recursive: true })
  await downloadFile(SR_LEGACY_ZIP_URL, zipPath)
  extractZip(zipPath, extractDir)

  const rootDir = readdirSync(extractDir)
    .map((entry) => path.join(extractDir, entry))
    .find((entryPath) => existsSync(path.join(entryPath, 'food.csv')))

  if (!rootDir) {
    throw new Error('SR Legacy CSV bundle is missing food.csv')
  }

  const foods = parseCsv(readFileSync(path.join(rootDir, 'food.csv'), 'utf8'))
  const categories = parseCsv(
    readFileSync(path.join(rootDir, 'food_category.csv'), 'utf8')
  )
  const nutrients = parseCsv(
    readFileSync(path.join(rootDir, 'food_nutrient.csv'), 'utf8')
  )

  const categoryById = new Map(
    categories.map((row) => [row.id, row.description])
  )

  const nutrientsByFoodId = new Map()
  for (const row of nutrients) {
    const nutrientId = row.nutrient_id
    if (!Object.values(MACRO_NUTRIENT_IDS).includes(nutrientId)) continue

    const bucket = nutrientsByFoodId.get(row.fdc_id) ?? {}
    if (nutrientId === MACRO_NUTRIENT_IDS.caloriesKcal) {
      bucket.caloriesKcal = row.amount
    } else if (nutrientId === MACRO_NUTRIENT_IDS.proteinG) {
      bucket.proteinG = row.amount
    } else if (nutrientId === MACRO_NUTRIENT_IDS.fatG) {
      bucket.fatG = row.amount
    } else if (nutrientId === MACRO_NUTRIENT_IDS.carbsG) {
      bucket.carbsG = row.amount
    } else if (nutrientId === MACRO_NUTRIENT_IDS.fiberG) {
      bucket.fiberG = row.amount
    }
    nutrientsByFoodId.set(row.fdc_id, bucket)
  }

  const records = []
  for (const food of foods) {
    if (EXCLUDED_SR_CATEGORY_IDS.has(food.food_category_id)) continue

    const category = categoryById.get(food.food_category_id) ?? 'Other'
    if (!shouldIncludeSrLegacyFood(food.description, category)) continue

    const per100g = nutrientsByFoodId.get(food.fdc_id)
    const record = buildFoodRecord({
      id: food.fdc_id,
      name: food.description,
      category,
      per100g: per100g ?? {},
    })
    if (record) records.push(record)
  }

  console.log(`Parsed ${records.length} SR Legacy foods`)
  return records
}

async function loadFoundationFoods() {
  const csvPath = path.join(tmpDir, 'foundation_subset.csv')
  await downloadFile(FOUNDATION_SUBSET_CSV_URL, csvPath)

  const rows = parseCsv(readFileSync(csvPath, 'utf8'))
  const records = rows
    .filter((row) => row.data_type === 'foundation')
    .map((row) =>
      buildFoodRecord({
        id: row.fdc_id,
        name: row.description,
        category: row.category || 'Foundation Foods',
        per100g: {
          caloriesKcal: row.kcal,
          proteinG: row.protein_g,
          fatG: row.fat_g,
          carbsG: row.carb_g,
        },
      })
    )
    .filter(Boolean)

  console.log(`Parsed ${records.length} Foundation foods`)
  return records
}

async function main() {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true })
  }
  mkdirSync(dataDir, { recursive: true })

  const byId = new Map()

  for (const record of await loadFoundationFoods()) {
    byId.set(record.id, record)
  }

  for (const record of await loadSrLegacyFoods()) {
    if (!byId.has(record.id)) {
      byId.set(record.id, record)
    }
  }

  const catalog = [...byId.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  writeFileSync(jsonPath, JSON.stringify(catalog), 'utf8')
  console.log(`Saved ${catalog.length} foods to ${jsonPath}`)
}

await main()
