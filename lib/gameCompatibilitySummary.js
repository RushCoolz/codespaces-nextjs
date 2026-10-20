function normalizeTitle(value = '') {
  return value
    .toLocaleLowerCase()
    .replace(/[™®©]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function findAntiCheatEntry(game, antiCheatEntries = []) {
  const steamId = String(game.id)
  const gameName = normalizeTitle(game.name)
  return antiCheatEntries.find((entry) => {
    const entrySteamId = entry.steamAppId || entry.storeIds?.steam
    if (entrySteamId && String(entrySteamId) === steamId) return true
    const entryName = normalizeTitle(entry.name)
    return entryName === gameName
  })
}

function protonMessage(protondb) {
  if (protondb?.status === 'reported') {
    const tier = protondb.tier?.toLocaleLowerCase()
    const reports = protondb.reportCount
      ? `Based on ${protondb.reportCount} community report${protondb.reportCount === 1 ? '' : 's'}.`
      : 'Community report summary available.'
    if (tier === 'platinum' || tier === 'gold') {
      return {
        headline: 'Positive Proton community reports',
        detail: `${reports} Individual results vary by game update, runtime, and hardware.`,
        tone: 'positive',
      }
    }
    if (tier === 'silver') {
      return {
        headline: 'Mixed Proton community reports',
        detail: `${reports} Some players report extra setup or issues.`,
        tone: 'caution',
      }
    }
    if (tier === 'bronze' || tier === 'borked') {
      return {
        headline: 'Proton community reports flag problems',
        detail: `${reports} Check recent reports before buying or troubleshooting.`,
        tone: 'caution',
      }
    }
    return {
      headline: 'Proton community reports available',
      detail: `${reports} The source does not provide a familiar compatibility tier.`,
      tone: 'unknown',
    }
  }
  if (protondb?.status === 'no-reports') {
    return {
      headline: 'No ProtonDB summary found',
      detail: 'There is not enough community data here to estimate how it will run.',
      tone: 'unknown',
    }
  }
  if (protondb?.status === 'unavailable') {
    return {
      headline: 'ProtonDB could not be checked',
      detail: 'Try again later or open the source directly.',
      tone: 'unknown',
    }
  }
  return {
    headline: 'No ProtonDB summary checked',
    detail: 'Open ProtonDB directly to review the game’s community reports.',
    tone: 'unknown',
  }
}

function antiCheatMessage(entry) {
  if (!entry) {
    return {
      headline: 'No exact anti-cheat tracker entry found',
      detail: 'That does not mean the game has no anti-cheat or that it works on Linux.',
      tone: 'unknown',
    }
  }

  const status = entry.status?.toLocaleLowerCase()
  if (status === 'denied') {
    return {
      headline: 'Community tracker says Linux support is denied',
      detail: 'This may prevent online play. The tracker can be outdated; check its latest evidence and the publisher.',
      tone: 'caution',
    }
  }
  if (status === 'supported') {
    return {
      headline: 'Community tracker lists anti-cheat support',
      detail: 'This is not a publisher guarantee and may not cover every game mode or update.',
      tone: 'positive',
    }
  }
  return {
    headline: `Anti-cheat tracker status: ${entry.status || 'unknown'}`,
    detail: 'Community-maintained status; open the tracker entry and review its date and evidence.',
    tone: 'unknown',
  }
}

function configurationSummary(systemReport) {
  if (!systemReport) {
    return {
      available: false,
      message: 'Run the local scan to add your distro, kernel, and detected graphics-driver context.',
    }
  }

  const graphics = systemReport.hardware.devices
    .filter((device) => device.category === 'Graphics')
    .map((device) => ({
      label: device.driver
        ? `${device.vendor || 'Graphics device'} · ${device.driver} driver detected`
        : device.driverReadable
          ? `${device.vendor || 'Graphics device'} · no driver detected`
          : `${device.vendor || 'Graphics device'} · driver status unknown`,
      status: device.driver ? 'detected' : device.driverReadable ? 'missing' : 'unknown',
    }))

  return {
    available: true,
    distro: systemReport.distro,
    kernel: systemReport.kernel || 'Not reported',
    scannedAt: systemReport.scannedAt,
    graphics,
    message: graphics.length
      ? 'This is Wayfinder’s host system, not a check against the game’s requirements. In a hosted preview, it may be a remote container.'
      : 'No supported graphics device was identified. This scan does not compare hardware with game requirements; a hosted preview may be scanning a remote container.',
  }
}

function summarizeGameCompatibility(game, antiCheatEntries = [], systemReport = null) {
  const proton = protonMessage(game.protondb)
  const nativeLinux = game.platforms?.linux === true
  const antiCheat = antiCheatMessage(findAntiCheatEntry(game, antiCheatEntries))

  let headline = proton.headline
  let detail = proton.detail
  let tone = proton.tone
  if (nativeLinux) {
    headline = 'A native Linux version is listed'
    detail = 'This is a store listing, not a test result. Check the game’s recent community reports too.'
    tone = 'positive'
  }
  if (antiCheat.tone === 'caution') {
    headline = antiCheat.headline
    detail = antiCheat.detail
    tone = 'caution'
  }

  return {
    headline,
    detail,
    tone,
    nativeLinux,
    proton,
    antiCheat,
    configuration: configurationSummary(systemReport),
  }
}

module.exports = { summarizeGameCompatibility }
