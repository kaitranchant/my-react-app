const MIN_CONTAINS_TOKEN_LENGTH = 3

const GIVEN_NAME_ALIASES: Record<string, readonly string[]> = {
  liz: ['elizabeth', 'lizzy'],
  lizzy: ['elizabeth', 'liz'],
  beth: ['elizabeth'],
  elizabeth: ['liz', 'lizzy', 'beth'],
}

export function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function compactSearchText(value: string) {
  return normalizeSearchText(value).replace(/[^a-z0-9]+/g, '')
}

export function tokenizeSearchQuery(query: string) {
  return normalizeSearchText(query)
    .split(/[\s,]+/)
    .map((token) => token.replace(/[^a-z0-9]+/g, ''))
    .filter(Boolean)
}

function escapeIlikeWildcards(value: string) {
  return value.replace(/[%_]/g, '\\$&')
}

export function simpleIlikeContains(query: string) {
  const tokens = tokenizeSearchQuery(query)
  if (tokens.length === 0) return null

  const token =
    tokens.reduce((longest, current) =>
      current.length > longest.length ? current : longest
    ) ?? tokens[0]

  return `%${escapeIlikeWildcards(token)}%`
}

function quotePostgrestValue(value: string) {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function expandTokenAliases(token: string) {
  const aliases = GIVEN_NAME_ALIASES[token]
  if (!aliases?.length) return [token]
  return [token, ...aliases.filter((alias) => alias !== token)]
}

function ilikePatternsForToken(token: string) {
  const patterns = new Set<string>()

  for (const variant of expandTokenAliases(token)) {
    const escaped = escapeIlikeWildcards(variant)
    patterns.add(`${escaped}%`)
    patterns.add(`% ${escaped}%`)
    if (token.length >= MIN_CONTAINS_TOKEN_LENGTH) {
      patterns.add(`%${escaped}%`)
    }
  }

  return Array.from(patterns)
}

export function buildPostgrestIlikeOrFilter(
  columns: readonly string[],
  query: string
) {
  const tokens = tokenizeSearchQuery(query)
  if (columns.length === 0 || tokens.length === 0) return null

  const token =
    tokens.reduce((longest, current) =>
      current.length > longest.length ? current : longest
    ) ?? tokens[0]

  const clauses = ilikePatternsForToken(token).flatMap((pattern) => {
    const quoted = quotePostgrestValue(pattern)
    return columns.map((column) => `${column}.ilike.${quoted}`)
  })

  return clauses.length > 0 ? clauses.join(',') : null
}

export function applyIlikeOrFilter<Query extends { or: (value: string) => Query }>(
  query: Query,
  columns: readonly string[],
  search: string
) {
  const filter = buildPostgrestIlikeOrFilter(columns, search)
  if (!filter) return query
  return query.or(filter)
}

function searchWords(value: string) {
  return tokenizeSearchQuery(value)
}

function tokenMatchScore(token: string, fields: readonly string[]) {
  const words = fields.flatMap(searchWords)
  const first = words[0] ?? ''
  const last = words[words.length - 1] ?? ''
  const haystack = normalizeSearchText(fields.filter(Boolean).join(' '))
  const compactHaystack = compactSearchText(fields.filter(Boolean).join(' '))
  const variants = expandTokenAliases(token)

  let best = 0

  for (const variant of variants) {
    const compactVariant = compactSearchText(variant)
    if (first === variant || last === variant) best = Math.max(best, 100)
    if (words.some((word) => word === variant)) best = Math.max(best, 90)
    if (first.startsWith(variant) || last.startsWith(variant)) {
      best = Math.max(best, 80)
    }
    if (words.some((word) => word.startsWith(variant))) best = Math.max(best, 70)
    if (compactVariant && compactHaystack.includes(compactVariant)) {
      best = Math.max(best, 55)
    }
    if (haystack.includes(variant)) best = Math.max(best, 40)
  }

  return best
}

export function scoreSearchMatch(fields: readonly string[], query: string) {
  const tokens = tokenizeSearchQuery(query)
  if (tokens.length === 0) return -1

  let score = 0
  for (const token of tokens) {
    const tokenScore = tokenMatchScore(token, fields)
    if (tokenScore <= 0) return -1
    score += tokenScore
  }

  const compactQuery = compactSearchText(query)
  const compactPrimary = compactSearchText(fields[0] ?? '')
  if (compactQuery && compactPrimary === compactQuery) score += 40

  return score
}

export function matchesSearchQuery(fields: readonly string[], query: string) {
  return scoreSearchMatch(fields, query) >= 0
}

export function rankBySearch<T>(
  items: readonly T[],
  query: string,
  getFields: (item: T) => readonly string[],
  limit: number
) {
  return items
    .map((item, index) => ({
      item,
      index,
      score: scoreSearchMatch(getFields(item), query),
    }))
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      const leftName = getFields(left.item)[0] ?? ''
      const rightName = getFields(right.item)[0] ?? ''
      const byName = leftName.localeCompare(rightName, undefined, {
        sensitivity: 'base',
      })
      if (byName !== 0) return byName
      return left.index - right.index
    })
    .slice(0, limit)
    .map((entry) => entry.item)
}
