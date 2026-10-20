const steamSearchUrl = 'https://store.steampowered.com/api/storesearch/'
const protonSummaryUrl = 'https://www.protondb.com/api/v1/reports/summaries/'
const antiCheatDataUrl =
  'https://raw.githubusercontent.com/AreWeAntiCheatYet/AreWeAntiCheatYet/master/games.json'
const antiCheatProjectUrl = 'https://github.com/AreWeAntiCheatYet/AreWeAntiCheatYet'
const antiCheatLicenseUrl =
  'https://github.com/AreWeAntiCheatYet/AreWeAntiCheatYet/blob/master/LICENSE'
const lutrisSearchUrl = 'https://lutris.net/api/games'
const wineAppDbSearchUrl = 'https://appdb.winehq.org/objectManager.php'

const cacheTtlMs = 10 * 60 * 1000
const cacheMaxEntries = 50
const resultCache = new Map()
let antiCheatCatalog
let antiCheatCatalogExpiresAt = 0

function safeExternalUrl(value) {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

function cacheGet(key) {
  const item = resultCache.get(key)
  if (!item) return null
  if (item.expiresAt <= Date.now()) {
    resultCache.delete(key)
    return null
  }
  resultCache.delete(key)
  resultCache.set(key, item)
  return item.value
}

function cacheSet(key, value) {
  resultCache.set(key, { value, expiresAt: Date.now() + cacheTtlMs })
  while (resultCache.size > cacheMaxEntries) {
    resultCache.delete(resultCache.keys().next().value)
  }
}

function sourceFailure(source, error) {
  console.error(`[Wayfinder] ${source} lookup failed:`, error)
  return {
    status: 'unavailable',
    message: 'This source could not be reached. Try again later.',
  }
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) {
    throw new Error(`Source returned HTTP ${response.status}.`)
  }
  return response.json()
}

async function getAntiCheatCatalog() {
  if (antiCheatCatalog && antiCheatCatalogExpiresAt > Date.now()) {
    return antiCheatCatalog
  }
  if (!antiCheatCatalog) {
    antiCheatCatalog = fetchJson(antiCheatDataUrl)
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error('The anti-cheat catalog did not return a game list.')
        }
        antiCheatCatalogExpiresAt = Date.now() + 60 * 60 * 1000
        return data
      })
      .catch((error) => {
        antiCheatCatalog = undefined
        throw error
      })
  }
  return antiCheatCatalog
}

async function searchSteam(query) {
  try {
    const url = new URL(steamSearchUrl)
    url.searchParams.set('term', query)
    url.searchParams.set('l', 'english')
    url.searchParams.set('cc', 'US')
    const data = await fetchJson(url)
    if (!Array.isArray(data.items)) {
      throw new Error('Steam search did not return a game list.')
    }
    const games = data.items
      .filter((item) => item.type === 'app' && Number.isSafeInteger(item.id))
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        name: item.name,
        platforms: { linux: item.platforms?.linux === true },
      }))

    const enriched = await Promise.all(
      games.map(async (game, index) => {
        if (index >= 5) {
          return {
            ...game,
            protondb: {
              status: 'not-checked',
              message: 'Check this game on ProtonDB.',
              sourceUrl: `https://www.protondb.com/app/${game.id}`,
            },
          }
        }
        try {
          const summary = await fetchJson(
            `${protonSummaryUrl}${encodeURIComponent(game.id)}.json`
          )
          return {
            ...game,
            protondb: summary?.total
              ? {
                  status: 'reported',
                  tier: summary.tier || summary.bestReportedTier || null,
                  confidence: summary.confidence || null,
                  reportCount: summary.total,
                  score: Number.isFinite(summary.score) ? summary.score : null,
                  sourceUrl: `https://www.protondb.com/app/${game.id}`,
                }
              : {
                  status: 'no-reports',
                  message: 'No ProtonDB summary is available for this game.',
                  sourceUrl: `https://www.protondb.com/app/${game.id}`,
                },
          }
        } catch (error) {
          console.error(`[Wayfinder] ProtonDB lookup failed for app ${game.id}:`, error)
          return {
            ...game,
            protondb: {
              status: 'unavailable',
              message: 'ProtonDB could not be reached.',
              sourceUrl: `https://www.protondb.com/app/${game.id}`,
            },
          }
        }
      })
    )

    return {
      status: 'available',
      sourceUrl: 'https://store.steampowered.com/',
      protondbSourceUrl: 'https://www.protondb.com/',
      results: enriched,
    }
  } catch (error) {
    return sourceFailure('Steam search', error)
  }
}

function matchAntiCheatGames(data, query) {
  if (!Array.isArray(data)) {
    throw new Error('The anti-cheat catalog did not return a game list.')
  }
  const normalized = query.trim().toLocaleLowerCase()
  return data
    .filter((game) =>
      typeof game?.name === 'string' &&
      game.name.toLocaleLowerCase().includes(normalized)
    )
    .slice(0, 12)
    .map((game) => {
      const updates = Array.isArray(game.updates) ? game.updates : []
      const notes = Array.isArray(game.notes)
        ? game.notes
            .filter((note) => Array.isArray(note) && typeof note[0] === 'string')
            .slice(0, 3)
            .map(([text, reference]) => ({
              text,
              reference: safeExternalUrl(reference),
            }))
        : []
      const newestUpdate = updates.at(-1)

      return {
        name: game.name,
        steamAppId: game.storeIds?.steam ? String(game.storeIds.steam) : null,
        status: typeof game.status === 'string' ? game.status : 'Unknown',
        antiCheats: Array.isArray(game.anticheats) ? game.anticheats : [],
        native: game.native === true,
        dateChanged: game.dateChanged || null,
        latestUpdate: newestUpdate
          ? { name: newestUpdate.name, date: newestUpdate.date || null }
          : null,
        notes,
        gameUrl: safeExternalUrl(game.url),
        sourceUrl: 'https://areweanticheatyet.com/',
      }
    })
}

async function searchAntiCheat(query) {
  try {
    const data = await getAntiCheatCatalog()
    return {
      status: 'available',
      sourceUrl: antiCheatProjectUrl,
      licenseUrl: antiCheatLicenseUrl,
      attribution: 'Are We Anti-Cheat Yet? community-maintained data, MIT License.',
      results: matchAntiCheatGames(data, query),
    }
  } catch (error) {
    return sourceFailure('Are We Anti-Cheat Yet', error)
  }
}

async function searchLutris(query) {
  try {
    const url = new URL(lutrisSearchUrl)
    url.searchParams.set('search', query)
    const data = await fetchJson(url)
    if (!Array.isArray(data.results)) {
      throw new Error('Lutris search did not return a game list.')
    }
    return {
      status: 'available',
      sourceUrl: 'https://lutris.net/',
      results: data.results
        .filter((game) => typeof game?.name === 'string')
        .slice(0, 8)
        .map((game) => ({
          name: game.name,
          slug: game.slug || null,
          year: game.year || null,
          platforms: Array.isArray(game.platforms)
            ? game.platforms.map((platform) => platform.name).filter(Boolean)
            : [],
          gameUrl: typeof game.slug === 'string'
            ? `https://lutris.net/games/${encodeURIComponent(game.slug)}/`
            : 'https://lutris.net/games/',
        })),
    }
  } catch (error) {
    return sourceFailure('Lutris search', error)
  }
}

function wineAppDbLink(query) {
  const url = new URL(wineAppDbSearchUrl)
  url.searchParams.set('sClass', 'application')
  url.searchParams.set('sTitle', query)
  return url.toString()
}

async function searchSources(query) {
  const [steam, antiCheat, lutris] = await Promise.all([
    searchSteam(query),
    searchAntiCheat(query),
    searchLutris(query),
  ])
  return {
    query,
    searchedAt: new Date().toISOString(),
    sources: {
      steam,
      antiCheat,
      lutris,
      wineAppDb: {
        status: 'link-only',
        sourceUrl: wineAppDbLink(query),
        catalogUrl: 'https://appdb.winehq.org/',
        message:
          'WineHQ AppDB reports are community-maintained. Wayfinder links to the search results and does not copy or independently verify them.',
      },
    },
  }
}

async function searchCompatibility(query) {
  const normalized = query.trim()
  const cacheKey = normalized.toLocaleLowerCase()
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  const result = await searchSources(normalized)
  cacheSet(cacheKey, result)
  return result
}

module.exports = {
  matchAntiCheatGames,
  safeExternalUrl,
  searchCompatibility,
  wineAppDbLink,
}
