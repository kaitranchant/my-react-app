/**
 * Create Stripe products/prices for Swift Coach plans and print env vars.
 * Run: node apps/next/scripts/setup-stripe-prices.mjs
 *
 * Requires STRIPE_SECRET_KEY in apps/next/.env.local or repo root .env.local
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import Stripe from 'stripe'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnvLocal() {
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
      const key = trimmed.slice(0, eq)
      const value = trimmed.slice(eq + 1)
      if (!process.env[key]) process.env[key] = value
    }
  }
}

loadEnvLocal()

const secretKey = process.env.STRIPE_SECRET_KEY?.trim()
if (!secretKey) {
  console.error('Missing STRIPE_SECRET_KEY in .env.local')
  process.exit(1)
}

const stripe = new Stripe(secretKey, { typescript: true })

const PLANS = [
  {
    plan: 'growth',
    name: 'Growth',
    description: 'Up to 25 clients, scheduling, compliance, and form review.',
    monthlyCents: 3900,
    annualCents: 39000,
  },
  {
    plan: 'scale',
    name: 'Scale',
    description: 'Unlimited clients, nutrition, teams, and leaderboards.',
    monthlyCents: 7900,
    annualCents: 79000,
  },
  {
    plan: 'facility',
    name: 'Facility',
    description: 'Everything in Scale for up to 8 coaches with gym tools.',
    monthlyCents: 19900,
    annualCents: 199000,
  },
]

async function findExistingPrice(plan, interval) {
  const prices = await stripe.prices.list({ limit: 100, active: true })
  return (
    prices.data.find(
      (price) =>
        price.metadata?.plan === plan &&
        price.metadata?.interval === interval &&
        price.recurring
    ) ?? null
  )
}

async function ensurePrice(product, plan, interval, amountCents) {
  const existing = await findExistingPrice(plan, interval)
  if (existing) {
    console.log(`  reuse ${plan} ${interval}: ${existing.id}`)
    return existing.id
  }

  const price = await stripe.prices.create({
    product: product.id,
    currency: 'usd',
    unit_amount: amountCents,
    recurring: { interval: interval === 'monthly' ? 'month' : 'year' },
    metadata: { plan, interval },
  })
  console.log(`  created ${plan} ${interval}: ${price.id}`)
  return price.id
}

async function ensureProduct(config) {
  const products = await stripe.products.list({ limit: 100, active: true })
  const existing = products.data.find((p) => p.metadata?.plan === config.plan)
  if (existing) {
    console.log(`Product ${config.name}: ${existing.id} (existing)`)
    return existing
  }

  const product = await stripe.products.create({
    name: config.name,
    description: config.description,
    metadata: { plan: config.plan },
  })
  console.log(`Product ${config.name}: ${product.id} (created)`)
  return product
}

async function main() {
  const envKeys = {}

  for (const config of PLANS) {
    const product = await ensureProduct(config)
    envKeys[`STRIPE_PRICE_${config.plan.toUpperCase()}_MONTHLY`] =
      await ensurePrice(product, config.plan, 'monthly', config.monthlyCents)
    envKeys[`STRIPE_PRICE_${config.plan.toUpperCase()}_ANNUAL`] =
      await ensurePrice(product, config.plan, 'annual', config.annualCents)
  }

  console.log('\nAdd these to apps/next/.env.local:\n')
  for (const [key, value] of Object.entries(envKeys)) {
    console.log(`${key}=${value}`)
  }

  const envPath = resolve(__dirname, '../.env.local')
  if (existsSync(envPath)) {
    let content = readFileSync(envPath, 'utf8')
    for (const [key, value] of Object.entries(envKeys)) {
      const pattern = new RegExp(`^${key}=.*$`, 'm')
      if (pattern.test(content)) {
        content = content.replace(pattern, `${key}=${value}`)
      } else {
        content = `${content.trimEnd()}\n${key}=${value}\n`
      }
    }
    writeFileSync(envPath, content)
    console.log(`\nUpdated ${envPath}`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
