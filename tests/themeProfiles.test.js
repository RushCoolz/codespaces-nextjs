const assert = require('node:assert/strict')
const test = require('node:test')
const {
  createThemeFile,
  readThemeFile,
  starterThemes,
  validateThemeProfile,
} = require('../lib/themeProfiles')

test('starter themes use valid, portable profile data', () => {
  for (const theme of starterThemes) {
    assert.deepEqual(validateThemeProfile(theme), theme)
  }
})

test('theme files can be exported and imported without accepting executable fields', () => {
  const exported = createThemeFile(starterThemes[0])
  assert.equal(exported.format, 'wayfinder-theme')
  assert.deepEqual(readThemeFile(exported), starterThemes[0])
  assert.equal('setupCommand' in readThemeFile(exported), false)
})

test('rejects malformed theme colors, app lists, and unsupported file versions', () => {
  assert.throws(() => validateThemeProfile({ ...starterThemes[0], accentColor: 'red' }), /six-digit hex/)
  assert.throws(() => validateThemeProfile({ ...starterThemes[0], apps: Array(13).fill('App') }), /up to 12/)
  assert.throws(() => readThemeFile({ format: 'wayfinder-theme', version: 99, theme: starterThemes[0] }), /not a supported/)
})
