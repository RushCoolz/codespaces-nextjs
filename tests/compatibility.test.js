const assert = require('node:assert/strict')
const test = require('node:test')
const {
  matchAntiCheatGames,
  safeExternalUrl,
  searchCompatibility,
  wineAppDbLink,
} = require('../lib/compatibility')

test('matches anti-cheat reports by title and preserves attribution and update details', () => {
  const results = matchAntiCheatGames([
    {
      name: 'Example Arena',
      status: 'Denied',
      anticheats: ['Example Guard'],
      dateChanged: '2026-08-01T00:00:00.000Z',
      notes: [
        ['Community note', 'https://example.org/report'],
        ['Untrusted link', 'javascript:alert(1)'],
      ],
      updates: [{ name: 'Status checked', date: 'Aug 1, 2026' }],
      url: 'https://example.org/game',
    },
    { name: 'Another Title', status: 'Supported' },
  ], 'arena')

  assert.equal(results.length, 1)
  assert.equal(results[0].status, 'Denied')
  assert.equal(results[0].antiCheats[0], 'Example Guard')
  assert.equal(results[0].notes[0].reference, 'https://example.org/report')
  assert.equal(results[0].notes[1].reference, null)
  assert.equal(results[0].gameUrl, 'https://example.org/game')
  assert.equal(results[0].latestUpdate.name, 'Status checked')
})

test('only returns safe external HTTP links and creates an encoded WineHQ search', () => {
  assert.equal(safeExternalUrl('javascript:alert(1)'), null)
  assert.equal(safeExternalUrl('https://example.org/report'), 'https://example.org/report')

  const link = new URL(wineAppDbLink('Photo Shop'))
  assert.equal(link.hostname, 'appdb.winehq.org')
  assert.equal(link.searchParams.get('sClass'), 'application')
  assert.equal(link.searchParams.get('sTitle'), 'Photo Shop')
})

test('searches Steam, ProtonDB, anti-cheat, and Lutris with source-specific results', async () => {
  const originalFetch = global.fetch
  const requestedUrls = []
  global.fetch = async (input) => {
    const url = new URL(input)
    requestedUrls.push(url)
    if (url.hostname === 'store.steampowered.com') {
      return Response.json({
        items: [
          {
            type: 'app',
            id: 620,
            name: 'Portal 2',
            platforms: { linux: true },
          },
        ],
      })
    }
    if (url.hostname === 'www.protondb.com') {
      return Response.json({
        tier: 'platinum',
        confidence: 'strong',
        total: 21,
        score: 0.9,
      })
    }
    if (url.hostname === 'raw.githubusercontent.com') {
      return Response.json([
        {
          name: 'Portal 2',
          status: 'Supported',
          anticheats: ['Example Anti-cheat'],
          storeIds: { steam: '620' },
        },
      ])
    }
    if (url.hostname === 'lutris.net') {
      return Response.json({
        results: [
          {
            name: 'Portal 2',
            slug: 'portal-2',
            platforms: [{ name: 'Windows' }],
          },
        ],
      })
    }
    throw new Error(`Unexpected upstream URL: ${url}`)
  }

  try {
    const result = await searchCompatibility('Portal')
    assert.equal(result.sources.steam.results[0].name, 'Portal 2')
    assert.equal(result.sources.steam.results[0].protondb.tier, 'platinum')
    assert.equal(result.sources.antiCheat.results[0].status, 'Supported')
    assert.equal(result.sources.antiCheat.results[0].steamAppId, '620')
    assert.equal(result.sources.lutris.results[0].slug, 'portal-2')
    assert.equal(result.sources.wineAppDb.status, 'link-only')
    assert.match(result.sources.antiCheat.attribution, /MIT License/)
    assert.ok(requestedUrls.some((url) => url.hostname === 'www.protondb.com'))
    assert.ok(requestedUrls.some((url) => url.hostname === 'lutris.net'))
  } finally {
    global.fetch = originalFetch
  }
})
