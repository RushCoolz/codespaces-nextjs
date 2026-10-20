const officialSupportStatuses = new Set([
  'unknown',
  'officially-supported',
  'officially-unsupported',
  'community-reports-only',
])

const reportOutcomes = new Set(['worked', 'partially-worked', 'failed'])
const outcomeLabels = {
  worked: 'Worked',
  'partially-worked': 'Partially worked',
  failed: 'Failed',
}
const officialSupportLabels = {
  unknown: 'Unknown / not checked',
  'officially-supported': 'Publisher explicitly supports Linux/Proton',
  'officially-unsupported': 'Publisher explicitly says unsupported',
  'community-reports-only': 'Community reports only',
}

function createDiagnosticReport(scan, { includeHardware = false } = {}) {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: 'Wayfinder local diagnostic scan',
    scope: 'Read-only indicators; not a game anti-cheat approval or compatibility verdict.',
    scannedAt: scan.scannedAt,
    distribution: scan.distro,
    kernel: scan.kernel,
    summary: scan.summary,
    checks: scan.checks.map(({ id, name, status, summary, nextStep }) => ({
      id,
      name,
      status,
      summary,
      nextStep,
    })),
    ...(includeHardware
      ? {
          hardware: {
            devices: scan.hardware.devices.map(
              ({ category, vendor, device, driver, driverReadable }) => ({
                category,
                vendor,
                device,
                driver,
                driverReadable,
              })
            ),
            firmware: {
              status: scan.hardware.firmware.status,
              summary: scan.hardware.firmware.summary,
            },
          },
        }
      : {}),
  }
}

function createCompatibilityReport(fields) {
  if (fields.consent !== true) {
    throw new Error('Review the report consent checkbox before generating an export.')
  }

  const required = [
    ['title', 'Enter a game or application name.'],
    ['distribution', 'Enter the Linux distribution used for this test.'],
    ['reproductionSteps', 'Describe the steps needed to reproduce this result.'],
  ]
  for (const [key, message] of required) {
    if (typeof fields[key] !== 'string' || !fields[key].trim()) {
      throw new Error(message)
    }
  }

  if (!reportOutcomes.has(fields.outcome)) {
    throw new Error('Choose the observed test outcome.')
  }
  if (!officialSupportStatuses.has(fields.officialSupport)) {
    throw new Error('Choose an official support status or leave it unknown.')
  }

  let officialSource = ''
  if (fields.officialSource?.trim()) {
    let url
    try {
      url = new URL(fields.officialSource.trim())
    } catch {
      throw new Error('The official support source must be a valid HTTPS URL.')
    }
    if (url.protocol !== 'https:') {
      throw new Error('The official support source must use HTTPS.')
    }
    officialSource = url.toString()
  }

  const lines = [
    `# Compatibility report: ${fields.title.trim()}`,
    '',
    `- Tested: ${new Date().toISOString()}`,
    `- Game/application version: ${fields.version?.trim() || 'Not provided'}`,
    `- Distribution: ${fields.distribution.trim()}`,
    `- Kernel: ${fields.kernel?.trim() || 'Not provided'}`,
    `- Runtime: ${fields.runtime?.trim() || 'Not provided'}`,
    `- Runtime version: ${fields.runtimeVersion?.trim() || 'Not provided'}`,
    `- GPU/driver: ${fields.gpuDriver?.trim() || 'Not provided'}`,
    `- Observed result: ${outcomeLabels[fields.outcome]}`,
    '',
    '## Reproduction steps',
    '',
    fields.reproductionSteps.trim(),
    '',
    '## Official support (separate from community compatibility reports)',
    '',
    `- Status: ${officialSupportLabels[fields.officialSupport]}`,
    `- Official source: ${officialSource || 'Not provided; status has not been independently verified.'}`,
    '',
    '## Privacy',
    '',
    'Prepared locally by Wayfinder. This report is not uploaded automatically. Review it and remove private information before sharing.',
    '',
  ]

  return lines.join('\n')
}

module.exports = { createCompatibilityReport, createDiagnosticReport }
