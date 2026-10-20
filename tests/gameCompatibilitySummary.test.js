const assert = require('node:assert/strict')
const test = require('node:test')
const { summarizeGameCompatibility } = require('../lib/gameCompatibilitySummary')

const systemReport = {
  distro: 'Test Linux',
  kernel: '6.12.1',
  hardware: {
    devices: [
      { category: 'Graphics', vendor: 'Example GPU', driver: 'example', driverReadable: true },
      { category: 'Network', vendor: 'Example NIC', driver: 'network', driverReadable: true },
    ],
  },
}

test('summarizes Proton reports and current config without claiming a hardware compatibility test', () => {
  const result = summarizeGameCompatibility({
    id: 100,
    name: 'Example Game',
    platforms: { linux: false },
    protondb: { status: 'reported', tier: 'gold', reportCount: 45 },
  }, [], systemReport)

  assert.equal(result.headline, 'Positive Proton community reports')
  assert.match(result.detail, /Individual results vary/)
  assert.equal(result.configuration.distro, 'Test Linux')
  assert.equal(result.configuration.kernel, '6.12.1')
  assert.equal(result.configuration.graphics.length, 1)
  assert.match(result.configuration.message, /not a check against the game/)
})

test('matches anti-cheat entries by Steam app ID and prioritizes a denied status', () => {
  const result = summarizeGameCompatibility({
    id: 123,
    name: 'Example Game',
    platforms: { linux: true },
    protondb: { status: 'reported', tier: 'platinum', reportCount: 12 },
  }, [
    { name: 'An unrelated title', steamAppId: '123', status: 'Denied' },
    { name: 'Example Game Deluxe', status: 'Supported' },
  ])

  assert.equal(result.headline, 'Community tracker says Linux support is denied')
  assert.equal(result.tone, 'caution')
  assert.match(result.antiCheat.detail, /tracker can be outdated/)
})

test('does not infer anti-cheat support from a missing tracker entry', () => {
  const result = summarizeGameCompatibility({
    id: 456,
    name: 'Unknown Game',
    platforms: { linux: false },
    protondb: { status: 'no-reports' },
  })

  assert.equal(result.antiCheat.tone, 'unknown')
  assert.match(result.antiCheat.detail, /does not mean the game has no anti-cheat/)
  assert.equal(result.headline, 'No ProtonDB summary found')
  assert.equal(result.configuration.available, false)
})
