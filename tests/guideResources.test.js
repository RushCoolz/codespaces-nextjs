const assert = require('node:assert/strict')
const test = require('node:test')
const { guideSteps } = require('../lib/guideResources')

test('Linux guide has five ordered steps and uses secure external resource links', () => {
  assert.equal(guideSteps.length, 5)
  assert.deepEqual(guideSteps.map(({ number }) => number), ['01', '02', '03', '04', '05'])

  for (const step of guideSteps) {
    assert.ok(step.title)
    assert.ok(step.summary)
    assert.ok(step.note)
    assert.ok(step.resources.length > 0)
    for (const resource of step.resources) {
      assert.ok(resource.name)
      assert.ok(resource.kind)
      if (resource.url) assert.equal(new URL(resource.url).protocol, 'https:')
      else assert.match(resource.href, /^#[a-z-]+$/)
    }
  }

  assert.ok(guideSteps[0].resources.some((resource) => /Arch Linux/.test(resource.name)))
  assert.ok(guideSteps[2].resources.some((resource) => /ProtonDB/.test(resource.name)))
  assert.ok(guideSteps[4].resources.some((resource) => resource.href === '#compatibility'))
})
