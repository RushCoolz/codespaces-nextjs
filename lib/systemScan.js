const fs = require('node:fs')
const osModule = require('node:os')
const path = require('node:path')

const secureBootGuid = '8be4df61-93ca-11d2-aa0d-00e098032b8c'

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8').trim()
  } catch {
    return null
  }
}

function listDirectory(directory) {
  try {
    return fs.readdirSync(directory)
  } catch {
    return null
  }
}

function pathExists(file) {
  try {
    fs.accessSync(file)
    return true
  } catch {
    return false
  }
}

function pathState(file) {
  try {
    fs.statSync(file)
    return true
  } catch (error) {
    return error.code === 'ENOENT' ? false : null
  }
}

function parseOsRelease(contents) {
  if (!contents) return {}

  const values = {}
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^(NAME|PRETTY_NAME|ID|ID_LIKE)=(.*)$/)
    if (!match) continue

    const value = match[2]
    values[match[1]] = value.replace(/^["']|["']$/g, '').replace(/\\"/g, '"')
  }
  return values
}

function check(id, name, status, summary, explanation, nextStep, evidence) {
  return { id, name, status, summary, explanation, nextStep, evidence }
}

function checkSecureBoot(efiRoot, efivarsRoot) {
  const efiState = pathState(efiRoot)
  if (efiState === false) {
    return check(
      'secure-boot',
      'Secure Boot',
      'unsupported',
      'UEFI boot not detected',
      'Secure Boot settings are available only when the computer starts in UEFI mode.',
      'Check whether the firmware offers UEFI boot. Switching boot modes can make an existing installation unbootable; back up first.',
      'The Linux EFI system directory is absent.'
    )
  }
  if (efiState === null) {
    return check(
      'secure-boot',
      'Secure Boot',
      'unknown',
      'Could not inspect UEFI state',
      'Linux could not read the EFI system directory.',
      'Check Secure Boot in your UEFI setup screen.',
      'Access to the Linux EFI system directory was denied.'
    )
  }

  const entries = listDirectory(efivarsRoot)
  if (!entries) {
    return check(
      'secure-boot',
      'Secure Boot',
      'unknown',
      'Could not read firmware state',
      'UEFI is present, but Linux did not expose the firmware Secure Boot variable.',
      'Inspect Secure Boot in your UEFI setup screen. This scan does not change firmware settings.',
      'The EFI variables directory is unavailable.'
    )
  }

  const variable = entries.find((entry) =>
    entry.toLowerCase() === `secureboot-${secureBootGuid}`
  )
  if (!variable) {
    return check(
      'secure-boot',
      'Secure Boot',
      'unknown',
      'Firmware state unavailable',
      'UEFI is present, but the Secure Boot variable was not exposed to Linux.',
      'Inspect Secure Boot in your UEFI setup screen. Firmware menus use different names.',
      'No SecureBoot EFI variable was found.'
    )
  }

  try {
    const value = fs.readFileSync(path.join(efivarsRoot, variable))
    if (value.length < 5 || value[4] > 1) throw new Error('Invalid EFI variable')
    const enabled = value[4] === 1
    return check(
      'secure-boot',
      'Secure Boot',
      enabled ? 'ready' : 'not-ready',
      enabled ? 'Enabled in firmware' : 'Disabled in firmware',
      'Read directly from the UEFI Secure Boot firmware variable.',
      enabled
        ? 'No action needed.'
        : 'If you want to enable it, check that your Linux bootloader and installed drivers support Secure Boot before changing firmware settings.',
      `UEFI variable value: ${value[4]}.`
    )
  } catch {
    return check(
      'secure-boot',
      'Secure Boot',
      'unknown',
      'Could not read firmware variable',
      'Linux exposed the Secure Boot variable, but its value could not be decoded.',
      'Check Secure Boot in your UEFI setup screen.',
      'The EFI variable was missing, unreadable, or malformed.'
    )
  }
}

function checkTpm(tpmRoot, deviceRoot) {
  const entries = listDirectory(tpmRoot)
  if (entries) {
    const tpmDevices = entries.filter((entry) => /^tpm\d+$/.test(entry))
    const versions = tpmDevices
      .map((entry) => readText(path.join(tpmRoot, entry, 'tpm_version_major')))
      .filter((version) => version !== null)

    if (versions.includes('2')) {
      return check(
        'tpm',
        'TPM 2.0',
        'ready',
        'TPM 2.0 detected',
        'Linux reports a TPM 2.0 device.',
        'No action needed.',
        'TPM major version: 2.'
      )
    }
    if (versions.includes('1')) {
      return check(
        'tpm',
        'TPM 2.0',
        'not-ready',
        'An older TPM was detected',
        'A TPM is present, but Linux reports version 1.x rather than TPM 2.0.',
        'Check UEFI for a firmware TPM option (often called Intel PTT or AMD fTPM). Availability depends on your hardware.',
        `Detected TPM major version: ${versions.join(', ')}.`
      )
    }
    if (tpmDevices.length > versions.length) {
      return check(
        'tpm',
        'TPM 2.0',
        'unknown',
        'TPM found; version unavailable',
        'Linux exposes a TPM device but did not expose its major version.',
        'Check your firmware TPM setting and your distribution’s TPM documentation.',
        'A TPM sysfs device exists, but its version could not be read.'
      )
    }
  }

  if (!entries && pathState(tpmRoot) === true) {
    return check(
      'tpm',
      'TPM 2.0',
      'unknown',
      'TPM information unavailable',
      'The TPM sysfs directory exists, but Linux did not allow Wayfinder to read it.',
      'Check your firmware TPM setting and your distribution’s TPM documentation.',
      'Could not list /sys/class/tpm.'
    )
  }

  if (pathExists(path.join(deviceRoot, 'tpmrm0')) || pathExists(path.join(deviceRoot, 'tpm0'))) {
    return check(
      'tpm',
      'TPM 2.0',
      'unknown',
      'TPM found; version unavailable',
      'A TPM device node exists, but Linux did not expose its version in sysfs.',
      'Check your firmware TPM setting and install your distribution’s TPM tools if you need more detail.',
      'TPM device node exists; version could not be read.'
    )
  }

  return check(
    'tpm',
    'TPM 2.0',
    'not-ready',
    'TPM 2.0 not detected',
    'No TPM 2.0 device was reported by Linux. It may be disabled in firmware or unsupported by the hardware.',
    'Look in UEFI settings for Intel PTT, AMD fTPM, or a TPM setting. Do not clear or reset a TPM as part of this check.',
    'No TPM version was reported in /sys/class/tpm and no TPM device node was found.'
  )
}

function checkMeasuredBoot(securityRoot) {
  const tpmEntries = listDirectory(securityRoot)
  if (!tpmEntries) {
    return check(
      'measured-boot',
      'Measured boot',
      'unknown',
      'Measurement log unavailable',
      'Linux securityfs is not readable, so the boot measurement log could not be checked.',
      'Check whether your kernel and distribution expose TPM event logs under /sys/kernel/security.',
      'The Linux securityfs directory is unavailable.'
    )
  }

  let logAccessDenied = false
  for (const entry of tpmEntries.filter((name) => /^tpm\d+$/.test(name))) {
    const logPath = path.join(securityRoot, entry, 'binary_bios_measurements')
    let descriptor
    try {
      descriptor = fs.openSync(logPath, 'r')
      const byte = Buffer.alloc(1)
      if (fs.readSync(descriptor, byte, 0, 1, null) > 0) {
        return check(
          'measured-boot',
          'Measured boot',
          'ready',
          'TPM boot log detected',
          'Linux exposes a non-empty TPM BIOS measurement log for this boot.',
          'No action needed. This checks for a local event log; it does not validate remote attestation.',
          `Read a non-empty event log at ${path.relative('/', logPath)}.`
        )
      }
    } catch (error) {
      if (error.code !== 'ENOENT') logAccessDenied = true
      // An absent per-TPM event log does not prevent checking other TPM devices.
    } finally {
      if (descriptor !== undefined) fs.closeSync(descriptor)
    }
  }

  if (logAccessDenied) {
    return check(
      'measured-boot',
      'Measured boot',
      'unknown',
      'Measurement log could not be read',
      'The TPM event log may exist, but Linux did not allow this process to read it.',
      'Check whether your distribution exposes TPM event logs under /sys/kernel/security.',
      'Access to at least one TPM event log was denied.'
    )
  }

  return check(
    'measured-boot',
    'Measured boot',
    'not-ready',
    'No TPM boot log detected',
    'No non-empty TPM BIOS measurement log was exposed under Linux securityfs.',
    'Check that TPM 2.0 is enabled and that your kernel and distribution expose TPM event logs. Measured boot support varies by firmware.',
    'No readable binary_bios_measurements event log was found.'
  )
}

function checkKernelLockdown(securityRoot) {
  const value = readText(path.join(securityRoot, 'lockdown'))
  if (value === null) {
    return check(
      'kernel-lockdown',
      'Kernel lockdown',
      'unknown',
      'Lockdown state unavailable',
      'The kernel lockdown status file is not readable on this system.',
      'Check your kernel configuration and whether securityfs is mounted.',
      'Could not read /sys/kernel/security/lockdown.'
    )
  }

  const selected = value.match(/\[([^\]]+)\]/)?.[1]
  if (!selected) {
    return check(
      'kernel-lockdown',
      'Kernel lockdown',
      'unknown',
      'Lockdown state unclear',
      'Linux returned a lockdown status that could not be interpreted.',
      'Check your distribution’s kernel documentation.',
      `Kernel reported: ${value}.`
    )
  }

  const active = selected === 'integrity' || selected === 'confidentiality'
  return check(
    'kernel-lockdown',
    'Kernel lockdown',
    active ? 'ready' : 'not-ready',
    active ? `Active (${selected} mode)` : 'Not active',
    'Kernel lockdown restricts some kernel features, including unsigned kernel changes.',
    active
      ? 'No action needed.'
      : 'Some distributions enable lockdown only with Secure Boot. Check your distro documentation before changing boot or kernel settings.',
    `Selected kernel mode: ${selected}.`
  )
}

function checkBpfLsm(securityRoot) {
  const value = readText(path.join(securityRoot, 'lsm'))
  if (value === null) {
    return check(
      'bpf-lsm',
      'BPF LSM',
      'unknown',
      'Active security modules unavailable',
      'Linux did not expose its active security module list.',
      'Check your kernel configuration and your distribution’s LSM documentation.',
      'Could not read /sys/kernel/security/lsm.'
    )
  }

  const active = value.split(',').map((name) => name.trim()).includes('bpf')
  return check(
    'bpf-lsm',
    'BPF LSM',
    active ? 'ready' : 'not-ready',
    active ? 'Active' : 'Not active',
    'BPF LSM lets compatible security tools attach policies through Linux’s security module interface.',
    active
      ? 'No action needed.'
      : 'BPF LSM needs kernel support and activation in the boot configuration. Check your distro documentation; this scan does not change boot settings.',
    `Active Linux security modules: ${value}.`
  )
}

const hardwareClasses = [
  { prefix: '0x03', name: 'Graphics' },
  { prefix: '0x02', name: 'Network' },
  { prefix: '0x0108', name: 'NVMe storage' },
  { prefix: '0x0403', name: 'Audio' },
  { prefix: '0x0c03', name: 'USB controller' },
]

function scanHardware(pciRoot, os, fwupdPaths) {
  const entries = listDirectory(pciRoot)
  if (!entries) {
    return {
      status: 'unknown',
      summary: 'PCI devices unavailable',
      devices: [],
      nextStep: 'Check whether Linux exposes PCI devices under /sys/bus/pci/devices.',
      firmware: scanFirmware(os, fwupdPaths),
    }
  }

  const devices = []
  for (const entry of entries) {
    const devicePath = path.join(pciRoot, entry)
    const classCode = readText(path.join(devicePath, 'class'))
    const kind = hardwareClasses.find(({ prefix }) => classCode?.startsWith(prefix))
    if (!kind) continue

    let driver = null
    let driverReadable = true
    try {
      driver = path.basename(fs.realpathSync(path.join(devicePath, 'driver')))
    } catch (error) {
      if (error.code !== 'ENOENT') driverReadable = false
    }

    devices.push({
      id: entry,
      category: kind.name,
      vendor: readText(path.join(devicePath, 'vendor')),
      device: readText(path.join(devicePath, 'device')),
      driver,
      driverReadable,
    })
  }

  const unbound = devices.filter((device) => device.driverReadable && !device.driver)
  const unreadable = devices.filter((device) => !device.driverReadable).length
  return {
    status: unbound.length
      ? 'needs-attention'
      : unreadable || devices.length === 0
        ? 'unknown'
        : 'ready',
    summary: devices.length
      ? `${devices.length} device${devices.length === 1 ? '' : 's'} checked; ${unbound.length} without a detected driver${unreadable ? `; ${unreadable} unreadable` : ''}`
      : 'No supported PCI devices detected',
    devices: devices.slice(0, 12),
    nextStep: unreadable
      ? 'Linux did not allow the driver status for some devices to be checked.'
      : unbound.length
      ? 'An unbound PCI device is not always a problem (some are unused or virtual). Identify it before installing any driver.'
      : 'This checks selected PCI devices for a bound kernel driver. It does not test whether every device feature works.',
    firmware: scanFirmware(os, fwupdPaths),
  }
}

function packageHint(os) {
  const ids = `${os.ID || ''} ${os.ID_LIKE || ''}`.toLowerCase()
  if (/\b(ubuntu|debian|linuxmint|pop)\b/.test(ids)) return 'sudo apt install fwupd'
  if (/\b(fedora|rhel|centos)\b/.test(ids)) return 'sudo dnf install fwupd'
  if (/\barch\b/.test(ids)) return 'sudo pacman -S fwupd'
  if (/\bopensuse\b/.test(ids)) return 'sudo zypper install fwupd'
  return 'Use your distribution’s package manager to find and install fwupd.'
}

function scanFirmware(os, binaryPaths = ['/usr/bin/fwupdmgr', '/usr/local/bin/fwupdmgr', '/bin/fwupdmgr']) {
  const installed = binaryPaths.some((binary) => {
    try {
      fs.accessSync(binary, fs.constants.X_OK)
      return true
    } catch {
      return false
    }
  })

  return {
    status: installed ? 'available' : 'not-installed',
    summary: installed ? 'fwupd is installed' : 'fwupd not found',
    detail: installed
      ? 'This scan checks whether fwupd is installed; it does not query update servers or install firmware.'
      : 'fwupd is a common Linux firmware update service. Whether it can update your hardware depends on the device vendor.',
    nextStep: installed
      ? 'To inspect updates, run fwupdmgr get-updates yourself and review each proposed change.'
      : packageHint(os),
  }
}

function scanSystem({
  sysRoot = '/sys',
  deviceRoot = '/dev',
  osReleasePath = '/etc/os-release',
  fwupdPaths,
} = {}) {
  const os = parseOsRelease(readText(osReleasePath))
  const securityRoot = path.join(sysRoot, 'kernel/security')
  const checks = [
    checkSecureBoot(path.join(sysRoot, 'firmware/efi'), path.join(sysRoot, 'firmware/efi/efivars')),
    checkTpm(path.join(sysRoot, 'class/tpm'), deviceRoot),
    checkMeasuredBoot(securityRoot),
    checkKernelLockdown(securityRoot),
    checkBpfLsm(securityRoot),
  ]

  return {
    scannedAt: new Date().toISOString(),
    distro: os.PRETTY_NAME || os.NAME || 'Linux distribution not identified',
    kernel: osModule.release(),
    checks,
    hardware: scanHardware(path.join(sysRoot, 'bus/pci/devices'), os, fwupdPaths),
    summary: {
      ready: checks.filter((item) => item.status === 'ready').length,
      needsAttention: checks.filter((item) => item.status === 'not-ready').length,
      unknown: checks.filter((item) => item.status === 'unknown').length,
      unsupported: checks.filter((item) => item.status === 'unsupported').length,
      total: checks.length,
    },
  }
}

module.exports = { scanSystem }
