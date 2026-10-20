const assert = require('node:assert/strict')
const test = require('node:test')
const { communityThemeLinks } = require('../lib/themeCatalog')

test('community theme links are attributed HTTPS sources with setup guidance', () => {
  assert.ok(communityThemeLinks.some((theme) => theme.style === 'macOS-inspired'))
  assert.ok(communityThemeLinks.some((theme) => theme.style === 'Windows-inspired'))

  for (const theme of communityThemeLinks) {
    assert.match(theme.url, /^https:\/\//)
    assert.ok(theme.desktopSupport.length > 0)
    assert.ok(theme.setup.length > 0)
    assert.ok(theme.source.length > 0)
  }
})
