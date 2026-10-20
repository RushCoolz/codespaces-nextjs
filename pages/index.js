import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import { createCompatibilityReport, createDiagnosticReport } from '../lib/reportExports'
import { summarizeGameCompatibility } from '../lib/gameCompatibilitySummary'
import { guideSteps } from '../lib/guideResources'
import { communityThemeLinks } from '../lib/themeCatalog'
import {
  createThemeFile,
  createThemeId,
  readThemeFile,
  starterThemes,
  validateThemeProfile,
} from '../lib/themeProfiles'
import { findWindowsAlternatives } from '../lib/windowsAlternatives'
import styles from '../styles/home.module.css'

const sourceSections = [
  { id: 'steam', title: 'Steam & ProtonDB', detail: 'Steam finds game listings; ProtonDB adds community reports.' },
  { id: 'antiCheat', title: 'Anti-cheat status', detail: 'Community-tracked anti-cheat support; status can become stale.' },
  { id: 'lutris', title: 'Lutris game catalog', detail: 'Game discovery and install-script listings, not compatibility guarantees.' },
  { id: 'wineAppDb', title: 'WineHQ AppDB', detail: 'Open the WineHQ community database search; Wayfinder does not copy its reports.' },
]
const sourceFilters = [
  { id: 'all', label: 'All sources' },
  { id: 'steam', label: 'Steam + ProtonDB' },
  { id: 'antiCheat', label: 'Anti-cheat' },
  { id: 'lutris', label: 'Lutris' },
  { id: 'wineAppDb', label: 'WineHQ AppDB' },
]
const checkIcons = {
  'secure-boot': 'shield',
  tpm: 'chip',
  'measured-boot': 'activity',
  'kernel-lockdown': 'lock',
  'bpf-lsm': 'terminal',
}
const appTabs = [
  { id: 'start', label: 'Start here', sectionId: 'guide' },
  { id: 'readiness', label: 'System check', sectionId: 'readiness' },
  { id: 'games', label: 'Games & apps', sectionId: 'compatibility' },
  { id: 'alternatives', label: 'Windows alternatives', sectionId: 'alternatives' },
  { id: 'themes', label: 'Theme studio', sectionId: 'themes' },
  { id: 'hardware', label: 'Hardware', sectionId: 'hardware' },
]
const statusLabels = {
  ready: 'Ready',
  'not-ready': 'Needs attention',
  unsupported: 'Not available',
  unknown: 'Could not check',
}

function toneForStatus(status) {
  if (status === 'ready') return 'good'
  if (status === 'not-ready') return 'warn'
  if (status === 'unsupported') return 'off'
  return 'neutral'
}

function formatTier(tier) {
  if (!tier) return 'No ProtonDB report'
  return tier.charAt(0).toUpperCase() + tier.slice(1)
}

function formatCheckedAt(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'time unavailable' : date.toLocaleString()
}

function readableTextColor(hex) {
  const red = parseInt(hex.slice(1, 3), 16)
  const green = parseInt(hex.slice(3, 5), 16)
  const blue = parseInt(hex.slice(5, 7), 16)
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000
  return brightness > 145 ? '#263027' : '#f5f6f2'
}

function GameQuickAnswer({ game, antiCheatEntries, systemReport }) {
  const summary = summarizeGameCompatibility(game, antiCheatEntries, systemReport)

  return (
    <div className={`${styles.gameAnswer} ${styles[`answer_${summary.tone}`]}`}>
      <span className={styles.gameAnswerLabel}>QUICK READ · NOT A GUARANTEE</span>
      <strong>{summary.headline}</strong>
      <p>{summary.detail}</p>
      {summary.antiCheat.tone !== 'unknown' &&
        summary.headline !== summary.antiCheat.headline && (
        <p className={styles.gameAntiCheat}>
          {summary.antiCheat.headline}: {summary.antiCheat.detail}
        </p>
      )}
      <div className={styles.configSummary}>
        <strong>System scan context</strong>
        {summary.configuration.available ? (
          <>
            <span>{summary.configuration.distro} · kernel {summary.configuration.kernel}</span>
            {summary.configuration.graphics.length ? (
              summary.configuration.graphics.map((device, index) => (
                <span key={`${game.id}-graphics-${index}`}>{device.label}</span>
              ))
            ) : (
              <span>No graphics device identified by this scan.</span>
            )}
            {summary.configuration.scannedAt && (
              <small>Scan: {formatCheckedAt(summary.configuration.scannedAt)}</small>
            )}
            <small>{summary.configuration.message}</small>
          </>
        ) : (
          <span>{summary.configuration.message}</span>
        )}
      </div>
    </div>
  )
}

function Icon({ name, size = 20 }) {
  const paths = {
    activity: <><path d="M3 12h4l3-8 4 16 3-8h4" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    chip: <><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 9h6v6H9zM9 2v4m6-4v4m0 12v4m-6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4" /></>,
    desktop: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></>,
    game: <><path d="M6 10h12a4 4 0 0 1 3.8 5l-.7 2.3a2 2 0 0 1-3.3.8L15 15H9l-2.8 3.1a2 2 0 0 1-3.3-.8L2.2 15A4 4 0 0 1 6 10Z" /><path d="M7 12v4m-2-2h4m7-1h.01M18 15h.01" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" /></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 5v2" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    terminal: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 9 3 3-3 3m6 0h4" /></>,
    wrench: <><path d="M14.7 6.3a5 5 0 0 0-6.4 6.4l-5.6 5.6a2 2 0 0 0 2.8 2.8l5.6-5.6a5 5 0 0 0 6.4-6.4L14 12.6 11.4 10l3.3-3.7Z" /></>,
  }

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

function Home() {
  const [activeTab, setActiveTab] = useState('start')
  const [themes, setThemes] = useState(starterThemes)
  const [selectedThemeId, setSelectedThemeId] = useState(starterThemes[0].id)
  const [themeStorageLoaded, setThemeStorageLoaded] = useState(false)
  const [themeStorageWritable, setThemeStorageWritable] = useState(true)
  const [themeMessage, setThemeMessage] = useState('')
  const [themeError, setThemeError] = useState('')
  const [themeForm, setThemeForm] = useState({
    name: 'My Linux look',
    author: 'You',
    desktop: 'GNOME',
    accentColor: '#39734e',
    surfaceColor: '#f3f5ef',
    wallpaperColor: '#bdcfb5',
    iconTheme: 'Adwaita',
    dockPosition: 'Bottom',
    apps: 'Firefox, LibreOffice, Steam',
  })
  const [query, setQuery] = useState('')
  const [alternativeQuery, setAlternativeQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [compatibilityResults, setCompatibilityResults] = useState(null)
  const [compatibilityState, setCompatibilityState] = useState('idle')
  const [compatibilityError, setCompatibilityError] = useState('')
  const [systemReport, setSystemReport] = useState(null)
  const [scanState, setScanState] = useState('idle')
  const [scanError, setScanError] = useState('')
  const [expandedCheck, setExpandedCheck] = useState(null)
  const [showDiagnosticPreview, setShowDiagnosticPreview] = useState(false)
  const [includeDiagnosticHardware, setIncludeDiagnosticHardware] = useState(false)
  const [diagnosticReviewed, setDiagnosticReviewed] = useState(false)
  const [compatibilityReportFields, setCompatibilityReportFields] = useState({
    title: '',
    version: '',
    distribution: '',
    kernel: '',
    runtime: '',
    runtimeVersion: '',
    gpuDriver: '',
    outcome: 'worked',
    reproductionSteps: '',
    officialSupport: 'unknown',
    officialSource: '',
    consent: false,
  })
  const [compatibilityReportText, setCompatibilityReportText] = useState('')
  const [compatibilityReportError, setCompatibilityReportError] = useState('')

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('wayfinder-theme-profiles')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (!Array.isArray(parsed.themes)) throw new Error('Saved theme collection is not valid.')
        const restoredThemes = parsed.themes.map(validateThemeProfile)
        setThemes([...starterThemes, ...restoredThemes.filter(
          (theme) => !starterThemes.some((starter) => starter.id === theme.id)
        )])
        if (restoredThemes.some((theme) => theme.id === parsed.selectedThemeId) ||
          starterThemes.some((theme) => theme.id === parsed.selectedThemeId)) {
          setSelectedThemeId(parsed.selectedThemeId)
        }
      }
    } catch (error) {
      setThemeStorageWritable(false)
      setThemeError(`Could not load saved themes: ${error.message}`)
    } finally {
      setThemeStorageLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!themeStorageLoaded || !themeStorageWritable) return
    try {
      const customThemes = themes.filter(
        (theme) => !starterThemes.some((starter) => starter.id === theme.id)
      )
      window.localStorage.setItem('wayfinder-theme-profiles', JSON.stringify({
        themes: customThemes,
        selectedThemeId,
      }))
    } catch (error) {
      setThemeError(`Could not save themes on this device: ${error.message}`)
    }
  }, [themes, selectedThemeId, themeStorageLoaded, themeStorageWritable])

  async function searchApps(event) {
    event.preventDefault()
    const searchTerm = query.trim()
    if (searchTerm.length < 2) {
      setCompatibilityError('Enter at least 2 characters to search.')
      return
    }

    setCompatibilityState('searching')
    setCompatibilityError('')
    try {
      const response = await fetch(`/api/compatibility?q=${encodeURIComponent(searchTerm)}`, {
        cache: 'no-store',
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'The compatibility search failed.')
      setCompatibilityResults(result)
      setCompatibilityState('complete')
    } catch (error) {
      setCompatibilityError(
        error.message || 'Could not search compatibility sources. Check your internet connection and try again.'
      )
      setCompatibilityState('error')
    }
  }

  async function scanThisComputer() {
    setScanState('scanning')
    setScanError('')
    setShowDiagnosticPreview(false)
    setDiagnosticReviewed(false)
    try {
      const response = await fetch('/api/scan', { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'The system scan failed.')
      setSystemReport(result)
      setCompatibilityReportFields((current) => ({
        ...current,
        distribution: current.distribution || result.distro,
        kernel: current.kernel || result.kernel,
        consent: false,
      }))
      setCompatibilityReportText('')
      setScanState('complete')
    } catch (error) {
      setScanError(error.message || 'Could not scan this computer. Check that Wayfinder is running locally and try again.')
      setScanState('error')
    }
  }

  const diagnosticExport = systemReport
    ? createDiagnosticReport(systemReport, { includeHardware: includeDiagnosticHardware })
    : null

  function downloadTextFile(filename, contents, contentType) {
    const blob = new Blob([contents], { type: contentType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function exportDiagnosticReport() {
    if (!diagnosticExport || !diagnosticReviewed) return
    downloadTextFile(
      'wayfinder-diagnostics.json',
      JSON.stringify(diagnosticExport, null, 2),
      'application/json'
    )
  }

  function updateCompatibilityReportField(event) {
    const { name, type, checked, value } = event.target
    setCompatibilityReportFields((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'consent' ? {} : { consent: false }),
    }))
    setCompatibilityReportText('')
    setCompatibilityReportError('')
  }

  function generateCompatibilityReport(event) {
    event.preventDefault()
    setCompatibilityReportError('')
    try {
      setCompatibilityReportText(createCompatibilityReport(compatibilityReportFields))
    } catch (error) {
      setCompatibilityReportError(error.message)
    }
  }

  function updateThemeField(event) {
    const { name, value } = event.target
    setThemeForm((current) => ({ ...current, [name]: value }))
    setThemeError('')
    setThemeMessage('')
  }

  function editTheme(theme) {
    setThemeForm({
      name: `${theme.name} copy`,
      author: 'You',
      desktop: theme.desktop,
      accentColor: theme.accentColor,
      surfaceColor: theme.surfaceColor,
      wallpaperColor: theme.wallpaperColor,
      iconTheme: theme.iconTheme,
      dockPosition: theme.dockPosition,
      apps: theme.apps.join(', '),
    })
    setThemeMessage('Starter look copied into the editor. Make it yours, then save it.')
    setThemeError('')
    document.getElementById('theme-editor-name')?.focus()
  }

  function saveTheme(event) {
    event.preventDefault()
    setThemeError('')
    setThemeMessage('')
    try {
      const profile = validateThemeProfile({
        ...themeForm,
        id: createThemeId(),
        apps: themeForm.apps.split(/[,\n]/).map((app) => app.trim()).filter(Boolean),
      })
      setThemes((current) => [...current, profile])
      setSelectedThemeId(profile.id)
      setThemeMessage(`“${profile.name}” is saved on this device. Export it to share with someone else.`)
    } catch (error) {
      setThemeError(error.message)
    }
  }

  async function importTheme(event) {
    const input = event.target
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    setThemeError('')
    setThemeMessage('')
    if (file.size > 100_000) {
      setThemeError('Theme files must be smaller than 100 KB.')
      return
    }
    try {
      const profile = readThemeFile(JSON.parse(await file.text()))
      const importedTheme = { ...profile, id: createThemeId() }
      setThemes((current) => [...current, importedTheme])
      setSelectedThemeId(importedTheme.id)
      setThemeMessage(`Imported “${importedTheme.name}”. Review its settings before using the recipe.`)
    } catch (error) {
      setThemeError(`Could not import this theme: ${error.message}`)
    }
  }

  function exportTheme(theme) {
    downloadTextFile(
      `${theme.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'linux-theme'}.wayfinder-theme.json`,
      JSON.stringify(createThemeFile(theme), null, 2),
      'application/json'
    )
    setThemeMessage(`Exported “${theme.name}”. Share the .wayfinder-theme.json file with others.`)
    setThemeError('')
  }

  const visibleSources = useMemo(
    () => sourceSections.filter((source) => sourceFilter === 'all' || source.id === sourceFilter),
    [sourceFilter]
  )
  const visibleAlternatives = useMemo(
    () => findWindowsAlternatives(alternativeQuery),
    [alternativeQuery]
  )
  const selectedTheme = themes.find((theme) => theme.id === selectedThemeId) || starterThemes[0]

  function handleTabKeyDown(event, currentIndex) {
    let nextIndex
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % appTabs.length
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + appTabs.length) % appTabs.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = appTabs.length - 1
    else return

    event.preventDefault()
    const nextTab = appTabs[nextIndex]
    setActiveTab(nextTab.id)
    document.getElementById(`tab-${nextTab.id}`)?.focus()
  }

  function selectTabFromLink(event, sectionId) {
    const tab = appTabs.find((item) => item.sectionId === sectionId)
    if (!tab) return
    event.preventDefault()
    setActiveTab(tab.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <Head>
        <title>Wayfinder — Linux, ready for what you need</title>
        <meta
          name="description"
          content="A transparent guide to Linux system readiness, app compatibility, and missing hardware support."
        />
        <meta name="theme-color" content="#f6f7f4" />
      </Head>
      <div className={styles.page}>
        <header className={styles.header}>
          <a className={styles.brand} href="#home" aria-label="Wayfinder home">
            <span className={styles.brandMark}><Icon name="activity" size={19} /></span>
            <span>wayfinder</span>
          </a>
          <div className={styles.nav} role="tablist" aria-label="Wayfinder sections">
            {appTabs.map((tab, index) => (
              <button
                aria-controls="wayfinder-tab-panel"
                aria-selected={activeTab === tab.id}
                className={activeTab === tab.id ? styles.navActive : ''}
                id={`tab-${tab.id}`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                role="tab"
                tabIndex={activeTab === tab.id ? 0 : -1}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button className={styles.headerCta} onClick={() => setActiveTab('games')} type="button">
            Check a game or app <Icon name="arrow" size={16} />
          </button>
        </header>

        <main id="home">
          <section className={styles.hero}>
            <div className={styles.heroCopy}>
              <div className={styles.eyebrow}>
                <span className={styles.eyebrowDot} /> YOUR PC. YOUR DISTRO. YOUR CHOICE.
              </div>
              <h1>Linux, ready for <span>what you need.</span></h1>
              <p className={styles.heroText}>
                Know what your system can do, what your apps need, and what to
                try next. No OS switch required. No wishful thinking.
              </p>
              <div className={styles.heroActions}>
                <button className={styles.primaryButton} onClick={() => setActiveTab('start')} type="button">
                  Start with the 5-step guide <Icon name="arrow" size={17} />
                </button>
                <button className={styles.textButton} onClick={() => setActiveTab('games')} type="button">
                  Find an app <Icon name="arrow" size={16} />
                </button>
              </div>
              <div className={styles.trustNote}>
                <Icon name="shield" size={16} />
                <span>Free and open source <i /> Works with your existing distro</span>
              </div>
            </div>

            <div className={styles.heroCard} aria-label="Local system readiness">
              <div className={styles.heroCardTop}>
                <span className={styles.cardLabel}>SYSTEM READINESS</span>
                <span className={styles.demoPill}>
                  {scanState === 'complete' ? 'LOCAL SCAN' : scanState === 'scanning' ? 'SCANNING' : 'NOT SCANNED'}
                </span>
              </div>
              <div className={styles.scoreRow}>
                <div className={styles.score}>
                  {systemReport ? systemReport.summary.ready : '—'}
                  <span>/{systemReport ? systemReport.summary.total : 5}</span>
                </div>
                <div>
                  <div className={styles.scoreTitle}>
                    {systemReport ? systemReport.distro : 'Check this computer'}
                  </div>
                  <div className={styles.scoreSub}>
                    {systemReport
                      ? `${systemReport.summary.needsAttention} need attention · ${systemReport.summary.unknown + systemReport.summary.unsupported} unresolved`
                      : 'No system data has been collected'}
                  </div>
                </div>
              </div>
              <div
                className={styles.scoreTrack}
                aria-label={systemReport ? `${systemReport.summary.ready} of ${systemReport.summary.total} checks ready` : 'System not yet scanned'}
              >
                {(systemReport?.checks || Array.from({ length: 5 })).map((check, index) => (
                  <span
                    className={check ? styles[`track_${check.status}`] : ''}
                    key={check ? check.id : index}
                  />
                ))}
              </div>
              <div className={styles.previewChecks}>
                {(systemReport?.checks || []).slice(0, 4).map((check) => (
                  <div className={styles.previewCheck} key={check.id}>
                    <span className={`${styles.statusIcon} ${styles[toneForStatus(check.status)]}`}>
                      <Icon name={check.status === 'ready' ? 'check' : 'activity'} size={14} />
                    </span>
                    <span>{check.name}</span>
                    <span className={styles.previewStatus}>{statusLabels[check.status]}</span>
                  </div>
                ))}
                {!systemReport && (
                  <div className={styles.previewEmpty}>Run a read-only scan to see your results.</div>
                )}
              </div>
              <div className={styles.cardFootnote}>
                <Icon name="activity" size={14} />
                <span>Read-only local scan · results stay on this computer</span>
              </div>
            </div>
          </section>

          <div
            aria-labelledby={`tab-${activeTab}`}
            className={styles.tabPanel}
            id="wayfinder-tab-panel"
            role="tabpanel"
            tabIndex={0}
          >
          {activeTab === 'start' && (
          <section className={styles.guideSection} id="guide">
            <div className={styles.sectionHeading}>
              <div>
                <div className={styles.sectionKicker}>A SIMPLE LINUX PATH</div>
                <h2>From install to gaming.</h2>
                <p>Five practical steps. Start with your distro, use the original sources, and ask before changing anything.</p>
              </div>
              <span className={styles.communityLabel}>
                <span /> CURATED LINKS · NOT OUR DOCUMENTATION
              </span>
            </div>
            <div className={styles.guideGrid}>
              {guideSteps.map((step) => (
                <article className={styles.guideCard} key={step.number}>
                  <div className={styles.guideCardHeader}>
                    <span className={styles.guideNumber}>{step.number}</span>
                    <h3>{step.title}</h3>
                  </div>
                  <p className={styles.guideSummary}>{step.summary}</p>
                  <p className={styles.guideNote}>{step.note}</p>
                  <ul className={styles.guideLinks}>
                    {step.resources.map((resource) => (
                      <li key={resource.name}>
                        <a
                          href={resource.url || resource.href}
                          target={resource.url ? '_blank' : undefined}
                          rel={resource.url ? 'noreferrer' : undefined}
                          onClick={resource.href
                            ? (event) => selectTabFromLink(event, resource.href.slice(1))
                            : undefined}
                        >
                          <span>
                            <strong>{resource.name}</strong>
                            <small>{resource.kind}</small>
                          </span>
                          <Icon name="arrow" size={14} />
                        </a>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
            <p className={styles.guideDisclaimer}>
              These links go to independent projects and communities. Their
              content and instructions can change; check the date, distro, and
              hardware match before following advice.
            </p>
          </section>
          )}

          {activeTab === 'readiness' && (
          <section className={styles.readinessSection} id="readiness">
            <div className={styles.sectionHeading}>
              <div>
                <div className={styles.sectionKicker}>01 / KNOW YOUR SYSTEM</div>
                <h2>What does your PC support?</h2>
                <p>See selected security indicators, what they mean, and what you might do next.</p>
              </div>
              <button
                className={styles.outlineButton}
                type="button"
                onClick={scanThisComputer}
                disabled={scanState === 'scanning'}
              >
                {scanState === 'scanning' ? 'Scanning this computer…' : systemReport ? 'Scan again' : 'Scan this Linux PC'}
                <Icon name="activity" size={16} />
              </button>
            </div>

            {scanError && (
              <div className={styles.sampleNotice} role="alert">
                <span className={styles.noticeDot} />
                {scanError}
              </div>
            )}
            {systemReport && (
              <div className={styles.sampleNotice} role="status">
                <span className={styles.noticeDot} />
                Read-only scan of <strong>{systemReport.distro}</strong> completed
                {' · '} {new Date(systemReport.scannedAt).toLocaleString()}
                {' · '}No settings were changed and no scan data was sent to a remote service.
              </div>
            )}

            <div className={styles.checkGrid}>
              {(systemReport?.checks || []).map((check) => {
                const tone = toneForStatus(check.status)
                const expanded = expandedCheck === check.id
                return (
                <article className={styles.checkCard} key={check.id}>
                  <div className={styles.checkCardTop}>
                    <span className={`${styles.checkIcon} ${styles[tone]}`}>
                      <Icon name={checkIcons[check.id]} size={18} />
                    </span>
                    <span className={`${styles.statusPill} ${styles[tone]}`}>
                      {statusLabels[check.status]}
                    </span>
                  </div>
                  <h3>{check.name}</h3>
                  <p>{check.summary}</p>
                  <button
                    aria-expanded={expanded}
                    className={styles.learnLink}
                    onClick={() => setExpandedCheck(expanded ? null : check.id)}
                    type="button"
                  >
                    {expanded ? 'Hide details' : 'Why and what next?'}
                    <Icon name="arrow" size={13} />
                  </button>
                  {expanded && (
                    <div className={styles.checkDetails}>
                      <p>{check.explanation}</p>
                      <p><strong>Next step:</strong> {check.nextStep}</p>
                      <small>{check.evidence}</small>
                    </div>
                  )}
                </article>
              )})}
              {!systemReport && scanState !== 'scanning' && (
                <div className={styles.scanPrompt}>
                  Run a local scan to check your actual firmware, kernel, and TPM state.
                </div>
              )}
              {scanState === 'scanning' && (
                <div className={styles.scanPrompt} role="status">Reading Linux system information…</div>
              )}
            </div>
            {systemReport && (
              <p className={styles.scanPrivacy}>
                These indicators are not universal anti-cheat requirements and do not mean a game will approve your PC. Game support depends on its publisher and anti-cheat vendor. “Unknown” means information was unavailable—not that a check passed.
              </p>
            )}
            {systemReport && (
              <div className={styles.exportPanel}>
                <div>
                  <strong>Share a diagnostic report—only if you choose</strong>
                  <p>Preview the local scan export before saving it. Wayfinder never uploads it.</p>
                </div>
                <button
                  className={styles.reportButton}
                  type="button"
                  onClick={() => {
                    setShowDiagnosticPreview((visible) => !visible)
                    setDiagnosticReviewed(false)
                  }}
                  aria-expanded={showDiagnosticPreview}
                >
                  {showDiagnosticPreview ? 'Hide preview' : 'Review export'}
                  <Icon name="arrow" size={14} />
                </button>
                {showDiagnosticPreview && diagnosticExport && (
                  <div className={styles.exportPreview}>
                    <label className={styles.reportCheckbox}>
                      <input
                        type="checkbox"
                        checked={includeDiagnosticHardware}
                        onChange={(event) => {
                          setIncludeDiagnosticHardware(event.target.checked)
                          setDiagnosticReviewed(false)
                        }}
                      />
                      Include selected hardware category, vendor, device, and driver details
                      (PCI IDs are excluded)
                    </label>
                    <pre>{JSON.stringify(diagnosticExport, null, 2)}</pre>
                    <label className={styles.reportCheckbox}>
                      <input
                        type="checkbox"
                        checked={diagnosticReviewed}
                        onChange={(event) => setDiagnosticReviewed(event.target.checked)}
                      />
                      I reviewed this preview and choose to save the file locally.
                    </label>
                    <button
                      className={styles.reportButton}
                      type="button"
                      onClick={exportDiagnosticReport}
                      disabled={!diagnosticReviewed}
                    >
                      Save diagnostic JSON <Icon name="download" size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
            <div className={styles.infoStrip} id="how-it-works">
              <span className={styles.infoIcon}><Icon name="shield" size={17} /></span>
              <p>
                <strong>Requirements depend on the app.</strong> A missing check
                doesn’t mean Linux can’t run it. We explain what each requirement
                does and point to distro-specific next steps.
              </p>
              <button type="button" onClick={() => setActiveTab('games')}>
                See your options <Icon name="arrow" size={14} />
              </button>
            </div>
          </section>
          )}

          {activeTab === 'games' && (
          <section className={styles.compatSection} id="compatibility">
            <div className={styles.sectionHeading}>
              <div>
                <div className={styles.sectionKicker}>02 / FIND YOUR WAY</div>
                <h2>Your apps, with the honest answer.</h2>
                <p>Find a practical way to run what you use—plus the caveats.</p>
              </div>
              <span className={styles.communityLabel}>
                <span /> STARTING POINTS · NOT VERIFIED
              </span>
            </div>

            <form className={styles.appToolbar} onSubmit={searchApps}>
              <label className={styles.searchBox}>
                <Icon name="search" size={18} />
                <input
                  type="search"
                  placeholder="Search a game or Windows app..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Search compatibility sources"
                  minLength={2}
                  maxLength={80}
                />
              </label>
              <button
                className={styles.searchButton}
                type="submit"
                disabled={compatibilityState === 'searching'}
              >
                {compatibilityState === 'searching' ? 'Searching…' : 'Search sources'}
                <Icon name="arrow" size={15} />
              </button>
            </form>
            <div className={styles.filters} aria-label="Filter compatibility sources">
              {sourceFilters.map((filter) => (
                <button
                  className={sourceFilter === filter.id ? styles.filterActive : ''}
                  key={filter.id}
                  type="button"
                  aria-pressed={sourceFilter === filter.id}
                  onClick={() => setSourceFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <p className={styles.compatPrivacy}>
              The name is sent to Steam and Lutris; ProtonDB is queried by
              matching Steam ID, and the anti-cheat catalog is retrieved from
              GitHub. System scan results are never sent. Community data is not
              publisher confirmation.
            </p>

            {compatibilityError && (
              <div className={styles.sampleNotice} role="alert">{compatibilityError}</div>
            )}
            {compatibilityState === 'searching' && (
              <div className={styles.scanPrompt} role="status">
                Searching Steam, ProtonDB, anti-cheat reports, and Lutris…
              </div>
            )}
            {compatibilityResults && compatibilityState === 'complete' && (
              <>
                <p className={styles.compatNote}>
                  Results for <strong>{compatibilityResults.query}</strong> · searched{' '}
                  {formatCheckedAt(compatibilityResults.searchedAt)}. This is when
                  Wayfinder checked the sources; it does not tell when every report
                  was authored. Community data is not a publisher support statement
                  or a guarantee of current compatibility.
                </p>
                <div className={styles.sourceSections}>
                  {visibleSources.map((source) => {
                    const data = compatibilityResults.sources[source.id]
                    return (
                      <section className={styles.sourceSection} key={source.id}>
                        <div className={styles.sourceHeading}>
                          <div>
                            <h3>{source.title}</h3>
                            <p>{source.detail}</p>
                            <small className={styles.sourceCheckedAt}>
                              Checked by Wayfinder: {formatCheckedAt(compatibilityResults.searchedAt)}
                            </small>
                          </div>
                          {data?.sourceUrl && (
                            <a href={data.sourceUrl} target="_blank" rel="noreferrer">
                              Source <Icon name="arrow" size={13} />
                            </a>
                          )}
                        </div>
                        {data?.status === 'unavailable' && (
                          <div className={styles.sourceMessage} role="status">{data.message}</div>
                        )}
                        {source.id === 'steam' && data?.status === 'available' && (
                          data.results.length ? (
                            <div className={`${styles.appGrid} ${styles.gameGrid}`}>
                              {data.results.map((game) => (
                                <article className={styles.appCard} key={game.id}>
                                  <GameQuickAnswer
                                    game={game}
                                    antiCheatEntries={compatibilityResults.sources.antiCheat?.results || []}
                                    systemReport={systemReport}
                                  />
                                  <div className={styles.appCardTop}>
                                    <span className={styles.appIcon}><Icon name="game" size={20} /></span>
                                    <span className={styles.appStatus}>
                                      {game.platforms?.linux ? 'Native Linux listed' : 'Steam listing'}
                                    </span>
                                  </div>
                                  <h4>{game.name}</h4>
                                  <p>
                                    {game.protondb.status === 'reported'
                                    ? `${formatTier(game.protondb.tier)} ProtonDB reports · ${game.protondb.reportCount} report${game.protondb.reportCount === 1 ? '' : 's'} · ${game.protondb.confidence || 'confidence not reported'} confidence. Community data, not publisher confirmation or a guarantee.`
                                      : game.protondb.status === 'no-reports'
                                        ? game.protondb.message
                                        : game.protondb.status === 'unavailable'
                                          ? game.protondb.message
                                          : 'Steam listing found; ProtonDB summary not checked for this result.'}
                                  </p>
                                  <div className={styles.sourceLinks}>
                                    <a href={`https://store.steampowered.com/app/${game.id}/`} target="_blank" rel="noreferrer">
                                      Steam store <Icon name="arrow" size={12} />
                                    </a>
                                    {game.protondb.sourceUrl && (
                                      <a href={game.protondb.sourceUrl} target="_blank" rel="noreferrer">
                                        ProtonDB <Icon name="arrow" size={12} />
                                      </a>
                                    )}
                                  </div>
                                </article>
                              ))}
                            </div>
                          ) : <div className={styles.sourceMessage}>No Steam games matched this search.</div>
                        )}
                        {source.id === 'antiCheat' && data?.status === 'available' && (
                          <>
                            <p className={styles.sourceAttribution}>
                              {data.attribution} Community tracker; status may be outdated.
                            </p>
                            {data.results.length ? (
                              <div className={styles.appGrid}>
                                {data.results.map((game) => (
                                  <article className={styles.appCard} key={game.name}>
                                    <div className={styles.appCardTop}>
                                      <span className={styles.appIcon}><Icon name="shield" size={19} /></span>
                                      <span className={styles.appStatus}>{game.status} (community tracker)</span>
                                    </div>
                                    <h4>{game.name}</h4>
                                    <p>
                                      {game.antiCheats.length
                                        ? `Anti-cheat: ${game.antiCheats.join(', ')}.`
                                        : 'No anti-cheat name listed in this report.'}
                                      {' '}Last data change: {game.dateChanged
                                        ? new Date(game.dateChanged).toLocaleDateString()
                                        : 'not provided'}.
                                    </p>
                                    {game.notes.map((note, index) => (
                                      <p className={styles.reportNote} key={`${game.name}-${index}`}>
                                        {note.text}
                                        {note.reference && (
                                          <> · <a href={note.reference} target="_blank" rel="noreferrer">evidence</a></>
                                        )}
                                      </p>
                                    ))}
                                    <div className={styles.sourceLinks}>
                                      <a href={game.gameUrl || game.sourceUrl} target="_blank" rel="noreferrer">
                                        Tracker entry <Icon name="arrow" size={12} />
                                      </a>
                                      <a href={data.sourceUrl} target="_blank" rel="noreferrer">
                                        Data &amp; updates <Icon name="arrow" size={12} />
                                      </a>
                                    </div>
                                  </article>
                                ))}
                              </div>
                            ) : <div className={styles.sourceMessage}>No anti-cheat tracker entries matched this search.</div>}
                          </>
                        )}
                        {source.id === 'lutris' && data?.status === 'available' && (
                          data.results.length ? (
                            <div className={styles.appGrid}>
                              {data.results.map((game) => (
                                <article className={styles.appCard} key={game.slug || game.name}>
                                  <div className={styles.appCardTop}>
                                    <span className={styles.appIcon}><Icon name="desktop" size={19} /></span>
                                    <span className={styles.appStatus}>Catalog listing only</span>
                                  </div>
                                  <h4>{game.name}</h4>
                                  <p>
                                    {game.platforms.length
                                      ? `Listed platform${game.platforms.length === 1 ? '' : 's'}: ${game.platforms.join(', ')}.`
                                      : 'No platform details supplied.'}
                                    {' '}A listing or installer does not verify compatibility.
                                  </p>
                                  <div className={styles.sourceLinks}>
                                    <a href={game.gameUrl} target="_blank" rel="noreferrer">
                                      Lutris listing <Icon name="arrow" size={12} />
                                    </a>
                                  </div>
                                </article>
                              ))}
                            </div>
                          ) : <div className={styles.sourceMessage}>No Lutris catalog entries matched this search.</div>
                        )}
                        {source.id === 'wineAppDb' && data?.status === 'link-only' && (
                          <div className={styles.wineSearchCard}>
                            <p>{data.message}</p>
                            <a className={styles.primaryButton} href={data.sourceUrl} target="_blank" rel="noreferrer">
                              Search WineHQ AppDB <Icon name="arrow" size={14} />
                            </a>
                          </div>
                        )}
                      </section>
                    )
                  })}
                </div>
              </>
            )}
            <details className={styles.compatReport}>
              <summary>Contribute a reproducible compatibility report</summary>
              <p className={styles.compatReportIntro}>
                Prepare a report developers can use to investigate. It stays in
                this app until you download it; Wayfinder does not submit it to
                a server or any community project.
              </p>
              <form className={styles.reportForm} onSubmit={generateCompatibilityReport}>
                <label>
                  Game or application <span aria-hidden="true">*</span>
                  <input name="title" value={compatibilityReportFields.title} onChange={updateCompatibilityReportField} required maxLength={120} />
                </label>
                <label>
                  Game/application version
                  <input name="version" value={compatibilityReportFields.version} onChange={updateCompatibilityReportField} maxLength={100} />
                </label>
                <label>
                  Linux distribution <span aria-hidden="true">*</span>
                  <input
                    name="distribution"
                    value={compatibilityReportFields.distribution}
                    onChange={updateCompatibilityReportField}
                    placeholder={systemReport?.distro || 'e.g. Fedora 43'}
                    required
                    maxLength={120}
                  />
                </label>
                <label>
                  Kernel version
                  <input name="kernel" value={compatibilityReportFields.kernel} onChange={updateCompatibilityReportField} placeholder="e.g. 6.x" maxLength={80} />
                </label>
                <label>
                  Runtime
                  <select name="runtime" value={compatibilityReportFields.runtime} onChange={updateCompatibilityReportField}>
                    <option value="">Choose if known</option>
                    <option value="Native Linux">Native Linux</option>
                    <option value="Steam Proton">Steam Proton</option>
                    <option value="Wine">Wine</option>
                    <option value="Virtual machine">Virtual machine</option>
                    <option value="Other / unknown">Other / unknown</option>
                  </select>
                </label>
                <label>
                  Runtime version
                  <input name="runtimeVersion" value={compatibilityReportFields.runtimeVersion} onChange={updateCompatibilityReportField} maxLength={100} />
                </label>
                <label className={styles.reportWideField}>
                  GPU and driver (optional)
                  <input name="gpuDriver" value={compatibilityReportFields.gpuDriver} onChange={updateCompatibilityReportField} maxLength={160} />
                </label>
                <label>
                  Observed result
                  <select name="outcome" value={compatibilityReportFields.outcome} onChange={updateCompatibilityReportField}>
                    <option value="worked">Worked</option>
                    <option value="partially-worked">Partially worked</option>
                    <option value="failed">Failed</option>
                  </select>
                </label>
                <label>
                  Official support status
                  <select name="officialSupport" value={compatibilityReportFields.officialSupport} onChange={updateCompatibilityReportField}>
                    <option value="unknown">Unknown / not checked</option>
                    <option value="officially-supported">Publisher explicitly supports Linux/Proton</option>
                    <option value="officially-unsupported">Publisher explicitly says unsupported</option>
                    <option value="community-reports-only">Community reports only</option>
                  </select>
                </label>
                <label className={styles.reportWideField}>
                  Official publisher/vendor source URL (optional)
                  <input name="officialSource" type="url" value={compatibilityReportFields.officialSource} onChange={updateCompatibilityReportField} placeholder="https://…" />
                  <small>Keep publisher statements separate from community compatibility reports.</small>
                </label>
                <label className={styles.reportWideField}>
                  Steps to reproduce <span aria-hidden="true">*</span>
                  <textarea name="reproductionSteps" value={compatibilityReportFields.reproductionSteps} onChange={updateCompatibilityReportField} required rows={4} maxLength={3000} placeholder="Include the relevant launch steps and what happened." />
                </label>
                <label className={`${styles.reportCheckbox} ${styles.reportWideField}`}>
                  <input name="consent" type="checkbox" checked={compatibilityReportFields.consent} onChange={updateCompatibilityReportField} required />
                  I consent to generating and downloading this report locally. I will review it and remove private information before sharing.
                </label>
                {compatibilityReportError && (
                  <p className={styles.reportError} role="alert">{compatibilityReportError}</p>
                )}
                <button className={styles.reportButton} type="submit">
                  Prepare report preview <Icon name="arrow" size={14} />
                </button>
              </form>
              {compatibilityReportText && (
                <div className={styles.exportPreview}>
                  <strong>Review this report before sharing</strong>
                  <pre>{compatibilityReportText}</pre>
                  <button
                    className={styles.reportButton}
                    type="button"
                    onClick={() => downloadTextFile(
                      'wayfinder-compatibility-report.md',
                      compatibilityReportText,
                      'text/markdown'
                    )}
                  >
                    Download report <Icon name="download" size={14} />
                  </button>
                </div>
              )}
            </details>
            {!compatibilityResults && compatibilityState === 'idle' && (
              <div className={styles.emptyState}>
                <Icon name="search" size={22} />
                <strong>Search real community sources</strong>
                <span>Steam, ProtonDB, Are We Anti-Cheat Yet?, Lutris, and WineHQ AppDB.</span>
              </div>
            )}
          </section>
          )}

          {activeTab === 'alternatives' && (
          <section className={styles.alternativesSection} id="alternatives">
            <div className={styles.sectionHeading}>
              <div>
                <div className={styles.sectionKicker}>WINDOWS APP ALTERNATIVES</div>
                <h2>Find a Linux option for an app you use.</h2>
                <p>Search by Windows app name, including IDM. These are alternatives, not guaranteed one-to-one replacements.</p>
              </div>
            </div>
            <label className={styles.alternativeSearch}>
              <Icon name="search" size={17} />
              <input
                type="search"
                value={alternativeQuery}
                onChange={(event) => setAlternativeQuery(event.target.value)}
                placeholder="Try IDM, Office, Photoshop, Outlook…"
                aria-label="Search Windows applications and Linux alternatives"
              />
            </label>
            {visibleAlternatives.length ? (
              <div className={styles.alternativeGrid}>
                {visibleAlternatives.map((entry) => (
                  <article className={styles.alternativeCard} key={entry.id}>
                    <div className={styles.alternativeCardHeader}>
                      <span>{entry.category}</span>
                      <h3>{entry.windowsApp}</h3>
                    </div>
                    <p>{entry.summary}</p>
                    <ul>
                      {entry.options.map((option) => (
                        <li key={option.name}>
                          <div>
                            <strong>{option.name}</strong>
                            <span>{option.type}</span>
                            <p>{option.detail}</p>
                          </div>
                          <a href={option.url} target="_blank" rel="noreferrer">
                            Official site <Icon name="arrow" size={12} />
                          </a>
                        </li>
                      ))}
                    </ul>
                    <p className={styles.alternativeCaveat}>{entry.caveat}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.sourceMessage}>
                No curated match yet. Try the Windows app’s common name, or open
                the Games &amp; apps tab to search compatibility sources.
              </div>
            )}
            <p className={styles.alternativesDisclaimer}>
              Suggestions are a starting point, not endorsements or exact feature
              matches. Check the publisher’s official site and your organization’s
              requirements before moving important work.
            </p>
          </section>
          )}

          {activeTab === 'themes' && (
          <section className={styles.themeSection} id="themes">
            <div className={styles.sectionHeading}>
              <div>
                <div className={styles.sectionKicker}>MAKE LINUX FEEL LIKE YOURS</div>
                <h2>A look you can take with you.</h2>
                <p>Clone a starter setup, personalize the recipe, then export a small theme file to share.</p>
              </div>
              <label className={styles.outlineButton}>
                Import theme
                <input
                  accept=".json,.wayfinder-theme.json,application/json"
                  className={styles.themeFileInput}
                  onChange={importTheme}
                  type="file"
                />
              </label>
            </div>

            {themeError && <div className={styles.themeNoticeError} role="alert">{themeError}</div>}
            {themeMessage && <div className={styles.themeNotice} role="status">{themeMessage}</div>}

            <div className={styles.themeWorkspace}>
              <div className={styles.themeGallery}>
                <div className={styles.themeSubheading}>
                  <div>
                    <strong>Choose a starting look</strong>
                    <span>Built-in ideas and your saved profiles</span>
                  </div>
                  <span>{themes.length} looks</span>
                </div>
                <div className={styles.themeCards}>
                  {themes.map((theme) => (
                    <article
                      aria-current={selectedThemeId === theme.id ? 'true' : undefined}
                      className={`${styles.themeCard} ${selectedThemeId === theme.id ? styles.themeCardSelected : ''}`}
                      key={theme.id}
                    >
                      <button
                        aria-pressed={selectedThemeId === theme.id}
                        className={styles.themeSelect}
                        onClick={() => {
                          setSelectedThemeId(theme.id)
                          setThemeMessage(`Previewing “${theme.name}”.`)
                          setThemeError('')
                        }}
                        type="button"
                      >
                        <span
                          aria-hidden="true"
                          className={styles.themeSwatch}
                          style={{
                            background: `linear-gradient(135deg, ${theme.wallpaperColor} 0 48%, ${theme.surfaceColor} 48% 100%)`,
                            borderColor: theme.accentColor,
                          }}
                        >
                          <i style={{ backgroundColor: theme.accentColor }} />
                          <i style={{ backgroundColor: theme.surfaceColor }} />
                        </span>
                        <span className={styles.themeCardText}>
                          <strong>{theme.name}</strong>
                          <small>{theme.desktop} · by {theme.author}</small>
                        </span>
                      </button>
                      <button className={styles.themeClone} onClick={() => editTheme(theme)} type="button">
                        Make it yours
                      </button>
                    </article>
                  ))}
                </div>
              </div>

              <div className={styles.themePreviewPanel}>
                <div className={styles.themeSubheading}>
                  <div>
                    <strong>Live look preview</strong>
                    <span>{selectedTheme.desktop} · {selectedTheme.iconTheme} icons</span>
                  </div>
                  <button
                    className={styles.themeExport}
                    onClick={() => exportTheme(selectedTheme)}
                    type="button"
                  >
                    <Icon name="download" size={14} /> Share file
                  </button>
                </div>
                <div
                  className={styles.themeDesktopPreview}
                  style={{ backgroundColor: selectedTheme.wallpaperColor }}
                >
                  <div className={styles.themeMockTopbar}>
                    <span>Activities</span><span>{selectedTheme.desktop}</span><span>● ◐</span>
                  </div>
                  <div
                    className={styles.themeMockWindow}
                    style={{
                      backgroundColor: selectedTheme.surfaceColor,
                      color: readableTextColor(selectedTheme.surfaceColor),
                    }}
                  >
                    <div className={styles.themeMockWindowBar}>
                      <i style={{ backgroundColor: selectedTheme.accentColor }} />
                      <i />
                      <i />
                      <span>My desktop</span>
                    </div>
                    <strong>{selectedTheme.name}</strong>
                    <p>{selectedTheme.apps.slice(0, 3).join(' · ') || 'Add favorite apps in your recipe'}</p>
                    <span
                      className={styles.themeMockAction}
                      style={{ backgroundColor: selectedTheme.accentColor }}
                    >
                      Open favorite app
                    </span>
                  </div>
                  <div className={`${styles.themeMockDock} ${
                    selectedTheme.dockPosition === 'Left'
                      ? styles.themeDockLeft
                      : selectedTheme.dockPosition === 'Right'
                        ? styles.themeDockRight
                        : selectedTheme.dockPosition === 'Hidden'
                          ? styles.themeDockHidden
                          : ''
                  }`}>
                    {selectedTheme.apps.slice(0, 4).map((app, index) => (
                      <span
                        aria-label={app}
                        key={`${app}-${index}`}
                        style={{ backgroundColor: index === 0 ? selectedTheme.accentColor : selectedTheme.surfaceColor }}
                      />
                    ))}
                  </div>
                </div>
                <div className={styles.themeRecipe}>
                  <strong>Setup recipe</strong>
                  <span>Desktop: {selectedTheme.desktop}</span>
                  <span>Icons: {selectedTheme.iconTheme} · Dock: {selectedTheme.dockPosition}</span>
                  <span>Favorite apps: {selectedTheme.apps.join(', ') || 'None listed'}</span>
                </div>
              </div>
            </div>

            <form className={styles.themeEditor} onSubmit={saveTheme}>
              <div className={styles.themeSubheading}>
                <div>
                  <strong>Create your own look</strong>
                  <span>Saved in this browser. Export it to share the profile file.</span>
                </div>
              </div>
              <div className={styles.themeFormGrid}>
                <label>
                  Theme name
                  <input
                    id="theme-editor-name"
                    maxLength={50}
                    name="name"
                    onChange={updateThemeField}
                    required
                    value={themeForm.name}
                  />
                </label>
                <label>
                  Creator name
                  <input maxLength={40} name="author" onChange={updateThemeField} required value={themeForm.author} />
                </label>
                <label>
                  Desktop environment
                  <select name="desktop" onChange={updateThemeField} value={themeForm.desktop}>
                    {['GNOME', 'KDE Plasma', 'Xfce', 'Cinnamon', 'Other'].map((desktop) => (
                      <option key={desktop}>{desktop}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Icon theme
                  <input maxLength={50} name="iconTheme" onChange={updateThemeField} required value={themeForm.iconTheme} />
                </label>
                <label>
                  Dock position
                  <select name="dockPosition" onChange={updateThemeField} value={themeForm.dockPosition}>
                    {['Bottom', 'Left', 'Right', 'Hidden'].map((position) => (
                      <option key={position}>{position}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Favorite apps (comma separated)
                  <input
                    maxLength={700}
                    name="apps"
                    onChange={updateThemeField}
                    placeholder="Firefox, Steam, Krita"
                    value={themeForm.apps}
                  />
                </label>
                <label>
                  Accent color
                  <span className={styles.themeColorInput}>
                    <input name="accentColor" onChange={updateThemeField} type="color" value={themeForm.accentColor} />
                    <code>{themeForm.accentColor}</code>
                  </span>
                </label>
                <label>
                  Window color
                  <span className={styles.themeColorInput}>
                    <input name="surfaceColor" onChange={updateThemeField} type="color" value={themeForm.surfaceColor} />
                    <code>{themeForm.surfaceColor}</code>
                  </span>
                </label>
                <label>
                  Wallpaper color
                  <span className={styles.themeColorInput}>
                    <input name="wallpaperColor" onChange={updateThemeField} type="color" value={themeForm.wallpaperColor} />
                    <code>{themeForm.wallpaperColor}</code>
                  </span>
                </label>
              </div>
              <div className={styles.themeFormFooter}>
                <p>Theme files contain display preferences and app names only. They do not run commands, install apps, or change your Linux desktop.</p>
                <button className={styles.primaryButton} type="submit">
                  Save this look <Icon name="arrow" size={15} />
                </button>
              </div>
            </form>

            <section aria-labelledby="community-themes-title" className={styles.communityThemes}>
              <div className={styles.themeSubheading}>
                <div>
                  <strong id="community-themes-title">Explore themes from their creators</strong>
                  <span>Real projects and community catalogs, with setup guidance—not one-click installs.</span>
                </div>
              </div>
              <div className={styles.communityThemeGrid}>
                {communityThemeLinks.map((theme) => (
                  <article className={styles.communityThemeCard} key={theme.id}>
                    <div className={styles.communityThemeMeta}>
                      <span>{theme.style}</span>
                      <span>{theme.desktopSupport}</span>
                    </div>
                    <h3>{theme.name}</h3>
                    <p>{theme.description}</p>
                    <p className={styles.communityThemeSetup}>{theme.setup}</p>
                    <a href={theme.url} rel="noreferrer" target="_blank">
                      {theme.source} <Icon name="arrow" size={12} />
                    </a>
                  </article>
                ))}
              </div>
              <p className={styles.communityThemeNote}>
                Theme components are desktop-specific and may need separate setup.
                Wayfinder links to upstream projects; review their instructions and
                license before installing. Nothing is downloaded or changed automatically.
              </p>
            </section>
          </section>
          )}

          {activeTab === 'hardware' && (
          <section className={styles.hardwareSection} id="hardware">
            <div className={styles.hardwareCopy}>
              <div className={styles.sectionKicker}>03 / GET THE RIGHT SUPPORT</div>
              <h2>Missing a driver? Let’s find out.</h2>
              <p>
                Spot hardware that needs a driver or firmware update, then get
                steps matched to your distro. Your hardware should work for you,
                not the other way around.
              </p>
              <p className={styles.hardwareHint}>Run the System check tab to refresh your local hardware snapshot.</p>
            </div>
            <div className={styles.hardwarePreview}>
              <div className={styles.hardwareTitle}>
                <span className={styles.hardwareTitleIcon}><Icon name="wrench" size={17} /></span>
                <span>Hardware check</span>
                <span className={styles.previewTag}>
                  {systemReport ? 'LOCAL SCAN' : 'NOT SCANNED'}
                </span>
              </div>
              {systemReport?.hardware.devices.map((device) => (
                <div className={styles.hardwareRow} key={device.id}>
                  <span className={styles.deviceIcon}>
                    <Icon name={device.category === 'Graphics' ? 'activity' : 'chip'} size={17} />
                  </span>
                  <span>
                    <strong>{device.category}</strong>
                    <small>{device.vendor || 'Unknown vendor'}:{device.device || 'unknown device'} · {device.id}</small>
                  </span>
                  <span className={`${styles.deviceStatus} ${
                    device.driver ? styles.good : device.driverReadable ? styles.warn : styles.neutral
                  }`}>
                    {device.driver
                      ? `Driver: ${device.driver}`
                      : device.driverReadable
                        ? 'No driver bound'
                        : 'Could not check'}
                  </span>
                </div>
              ))}
              {systemReport && systemReport.hardware.devices.length === 0 && (
                <div className={styles.hardwareEmpty}>
                  Linux exposed no supported PCI devices, or the device list could not be read.
                </div>
              )}
              {!systemReport && (
                <div className={styles.hardwareEmpty}>
                  Run the local scan to check selected PCI devices for a bound driver.
                </div>
              )}
              {systemReport && (
                <>
                  <div className={styles.hardwareSummary}>
                    <strong>{systemReport.hardware.summary}</strong>
                    <span>{systemReport.hardware.nextStep}</span>
                  </div>
                  <div className={styles.hardwareRow}>
                    <span className={styles.deviceIcon}><Icon name="wrench" size={17} /></span>
                    <span>
                      <strong>Firmware updates</strong>
                      <small>{systemReport.hardware.firmware.detail}</small>
                    </span>
                    <span className={`${styles.deviceStatus} ${styles.neutral}`}>
                      {systemReport.hardware.firmware.summary}
                    </span>
                  </div>
                  <div className={styles.hardwareSummary}>
                    <strong>Suggested next step</strong>
                    <span>{systemReport.hardware.firmware.nextStep}</span>
                  </div>
                </>
              )}
              <div className={styles.hardwareDisclaimer}>
                Read-only · Only selected PCI devices are checked · No firmware changes are made
              </div>
            </div>
          </section>
          )}

          {activeTab === 'start' && (
          <section className={styles.closingCallout}>
            <div className={styles.calloutMark}><Icon name="activity" size={19} /></div>
            <div>
              <h2>Keep your setup. Get a clearer picture.</h2>
              <p>Open source, distro-friendly, and upfront about the rough edges.</p>
            </div>
            <button onClick={() => setActiveTab('readiness')} className={styles.calloutButton} type="button">
              Check this system <Icon name="arrow" size={16} />
            </button>
          </section>
          )}
          </div>
        </main>

        <footer className={styles.footer} id="footer">
          <a className={styles.brand} href="#home">
            <span className={styles.brandMark}><Icon name="activity" size={17} /></span>
            <span>wayfinder</span>
          </a>
          <span>Built for Linux users. Not affiliated with any game publisher.</span>
          <span>Free · Open source · Your distro</span>
        </footer>
      </div>
    </>
  )
}

export default Home
