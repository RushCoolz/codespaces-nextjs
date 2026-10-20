const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const { scanSystem } = require('../lib/systemScan')

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wayfinder-system-scan-'))
  const sysRoot = path.join(root, 'sys')
  const deviceRoot = path.join(root, 'dev')
  const osReleasePath = path.join(root, 'os-release')
  const fwupdPaths = [path.join(root, 'bin/fwupdmgr')]

  t.after(() => fs.rmSync(root, { recursive: true, force: true }))

  return {
    root,
    sysRoot,
    deviceRoot,
    osReleasePath,
    fwupdPaths,
    write(relativePath, contents = '') {
      const file = path.join(root, relativePath)
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, contents)
      return file
    },
    scan() {
      return scanSystem({ sysRoot, deviceRoot, osReleasePath, fwupdPaths })
    },
  }
}

test('reports actual fixture values for firmware, TPM, lockdown, and BPF LSM', (t) => {
  const env = fixture(t)
  env.write('sys/firmware/efi/efivars/SecureBoot-8be4df61-93ca-11d2-aa0d-00e098032b8c')
  fs.writeFileSync(
    path.join(
      env.root,
      'sys/firmware/efi/efivars/SecureBoot-8be4df61-93ca-11d2-aa0d-00e098032b8c'
    ),
    Buffer.from([7, 0, 0, 0, 1])
  )
  env.write('sys/class/tpm/tpm0/tpm_version_major', '2\n')
  env.write('sys/kernel/security/lockdown', 'none [integrity] confidentiality\n')
  env.write('sys/kernel/security/lsm', 'capability,landlock,bpf\n')
  env.write('sys/kernel/security/tpm0/binary_bios_measurements', 'event log')
  env.write('os-release', 'PRETTY_NAME="Test Linux"\nID=debian\n')
  env.write('bin/fwupdmgr', '#!/bin/sh\n')
  fs.chmodSync(path.join(env.root, 'bin/fwupdmgr'), 0o755)

  const result = env.scan()
  assert.equal(result.distro, 'Test Linux')
  assert.equal(typeof result.kernel, 'string')
  assert.ok(result.kernel.length > 0)
  assert.deepEqual(
    Object.fromEntries(result.checks.map(({ id, status }) => [id, status])),
    {
      'secure-boot': 'ready',
      tpm: 'ready',
      'measured-boot': 'ready',
      'kernel-lockdown': 'ready',
      'bpf-lsm': 'ready',
    }
  )
  assert.equal(result.summary.ready, 5)
  assert.equal(result.hardware.firmware.status, 'available')
})

test('does not mistake missing or unreadable system state for a passing check', (t) => {
  const result = fixture(t).scan()

  assert.deepEqual(
    Object.fromEntries(result.checks.map(({ id, status }) => [id, status])),
    {
      'secure-boot': 'unsupported',
      tpm: 'not-ready',
      'measured-boot': 'unknown',
      'kernel-lockdown': 'unknown',
      'bpf-lsm': 'unknown',
    }
  )
  assert.equal(result.summary.ready, 0)
  assert.equal(result.hardware.status, 'unknown')
})

test('reports disabled Secure Boot and lockdown accurately', (t) => {
  const env = fixture(t)
  const variable = env.write(
    'sys/firmware/efi/efivars/SecureBoot-8be4df61-93ca-11d2-aa0d-00e098032b8c'
  )
  fs.writeFileSync(variable, Buffer.from([7, 0, 0, 0, 0]))
  env.write('sys/kernel/security/lockdown', '[none] integrity confidentiality\n')

  const result = env.scan()
  assert.equal(result.checks.find(({ id }) => id === 'secure-boot').status, 'not-ready')
  assert.equal(result.checks.find(({ id }) => id === 'kernel-lockdown').status, 'not-ready')
})

test('reports a TPM with an unavailable version as unknown', (t) => {
  const env = fixture(t)
  env.write('sys/class/tpm/tpm0/description', 'TPM device')

  const result = env.scan()
  assert.equal(result.checks.find(({ id }) => id === 'tpm').status, 'unknown')
})

test('identifies selected PCI devices without a driver and distro package guidance', (t) => {
  const env = fixture(t)
  env.write('os-release', 'PRETTY_NAME="Example Ubuntu"\nID=ubuntu\n')
  env.write('sys/bus/pci/devices/0000:01:00.0/class', '0x030000\n')
  env.write('sys/bus/pci/devices/0000:01:00.0/vendor', '0x1234\n')
  env.write('sys/bus/pci/devices/0000:01:00.0/device', '0xabcd\n')

  const result = env.scan()
  assert.equal(result.hardware.status, 'needs-attention')
  assert.match(result.hardware.summary, /1 device.*without a detected driver/)
  assert.equal(result.hardware.devices[0].category, 'Graphics')
  assert.match(result.hardware.firmware.nextStep, /sudo apt install fwupd/)
})
