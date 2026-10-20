const assert = require('node:assert/strict')
const test = require('node:test')
const { findWindowsAlternatives, windowsAlternatives } = require('../lib/windowsAlternatives')

test('finds Linux-capable alternatives for IDM and other common Windows apps', () => {
  const idm = findWindowsAlternatives('IDM')
  assert.equal(idm.length, 1)
  assert.equal(idm[0].windowsApp, 'Internet Download Manager (IDM)')
  assert.ok(idm[0].options.some((option) => option.name === 'JDownloader 2'))
  assert.match(idm[0].options.find((option) => option.name.includes('Xtreme')).detail, /pre-release/)

  assert.equal(findWindowsAlternatives('Photoshop')[0].windowsApp, 'Adobe Photoshop')
  assert.equal(findWindowsAlternatives('Excel')[0].windowsApp, 'Microsoft Office')
  assert.equal(findWindowsAlternatives('unknown app').length, 0)
})

test('all curated alternatives link to HTTPS project sources and include caveats', () => {
  for (const entry of windowsAlternatives) {
    assert.ok(entry.caveat)
    for (const option of entry.options) {
      assert.equal(new URL(option.url).protocol, 'https:')
    }
  }
})
