const assert = require('node:assert/strict')
const test = require('node:test')
const {
  createCompatibilityReport,
  createDiagnosticReport,
} = require('../lib/reportExports')

const scan = {
  scannedAt: '2026-10-20T20:00:00.000Z',
  distro: 'Test Linux',
  summary: { ready: 2, needsAttention: 1, unknown: 2, unsupported: 0, total: 5 },
  checks: [
    {
      id: 'secure-boot',
      name: 'Secure Boot',
      status: 'ready',
      summary: 'Enabled',
      nextStep: 'No action.',
      evidence: 'Sensitive details not included in export.',
    },
  ],
  hardware: {
    devices: [
      {
        id: '0000:01:00.0',
        category: 'Graphics',
        vendor: '0x1234',
        device: '0xabcd',
        driver: 'example',
        driverReadable: true,
      },
    ],
    firmware: { status: 'available', summary: 'fwupd is installed' },
  },
}

test('diagnostic export is minimal by default and includes hardware only when selected', () => {
  const standard = createDiagnosticReport(scan)
  assert.equal(standard.distribution, 'Test Linux')
  assert.equal(standard.checks[0].status, 'ready')
  assert.equal('evidence' in standard.checks[0], false)
  assert.equal('hardware' in standard, false)

  const withHardware = createDiagnosticReport(scan, { includeHardware: true })
  assert.equal(withHardware.hardware.devices[0].driver, 'example')
  assert.equal('id' in withHardware.hardware.devices[0], false)
})

test('compatibility report requires explicit consent and reproducible details', () => {
  const fields = {
    consent: false,
    title: 'Example Game',
    distribution: 'Test Linux',
    reproductionSteps: 'Launch with the listed runtime.',
    outcome: 'worked',
    officialSupport: 'unknown',
  }
  assert.throws(() => createCompatibilityReport(fields), /consent/)

  fields.consent = true
  const markdown = createCompatibilityReport(fields)
  assert.match(markdown, /Observed result: Worked/)
  assert.match(markdown, /Official support \(separate from community compatibility reports\)/)
  assert.match(markdown, /not been independently verified/)
  assert.match(markdown, /not uploaded automatically/)
})

test('compatibility report validates outcomes and official source URLs', () => {
  const fields = {
    consent: true,
    title: 'Example Game',
    distribution: 'Test Linux',
    reproductionSteps: 'Launch the game.',
    outcome: 'unknown-value',
    officialSupport: 'officially-supported',
  }
  assert.throws(() => createCompatibilityReport(fields), /outcome/)

  fields.outcome = 'worked'
  fields.officialSource = 'http://example.org/support'
  assert.throws(() => createCompatibilityReport(fields), /HTTPS/)

  fields.officialSource = 'https://example.org/support'
  assert.match(createCompatibilityReport(fields), /https:\/\/example\.org\/support/)
})
