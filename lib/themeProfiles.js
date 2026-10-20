const MAX_APPS = 12
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i
const DESKTOP_ENVIRONMENTS = ['GNOME', 'KDE Plasma', 'Xfce', 'Cinnamon', 'Other']
const DOCK_POSITIONS = ['Bottom', 'Left', 'Right', 'Hidden']

const themeFormatVersion = 1

const starterThemes = [
  {
    id: 'moss-and-minimal',
    name: 'Moss & minimal',
    author: 'Wayfinder',
    desktop: 'GNOME',
    accentColor: '#39734e',
    surfaceColor: '#f3f5ef',
    wallpaperColor: '#bdcfb5',
    iconTheme: 'Adwaita',
    dockPosition: 'Bottom',
    apps: ['Firefox', 'LibreOffice', 'Steam'],
  },
  {
    id: 'midnight-studio',
    name: 'Midnight studio',
    author: 'Wayfinder',
    desktop: 'KDE Plasma',
    accentColor: '#6f74d2',
    surfaceColor: '#242631',
    wallpaperColor: '#34364d',
    iconTheme: 'Breeze',
    dockPosition: 'Left',
    apps: ['Firefox', 'Krita', 'Steam'],
  },
  {
    id: 'sunrise-focus',
    name: 'Sunrise focus',
    author: 'Wayfinder',
    desktop: 'Xfce',
    accentColor: '#bd6848',
    surfaceColor: '#faf2e8',
    wallpaperColor: '#e6b789',
    iconTheme: 'Papirus',
    dockPosition: 'Bottom',
    apps: ['Firefox', 'Obsidian', 'VLC'],
  },
]

function isText(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength
}

function validateThemeProfile(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('The theme file must contain a theme object.')
  }

  const { id, name, author, desktop, accentColor, surfaceColor, wallpaperColor, iconTheme, dockPosition, apps } = value
  if (!isText(name, 50)) throw new Error('Theme name must be between 1 and 50 characters.')
  if (!isText(author, 40)) throw new Error('Creator name must be between 1 and 40 characters.')
  if (!DESKTOP_ENVIRONMENTS.includes(desktop)) throw new Error('Choose a supported desktop environment.')
  if (!COLOR_PATTERN.test(accentColor) || !COLOR_PATTERN.test(surfaceColor) || !COLOR_PATTERN.test(wallpaperColor)) {
    throw new Error('Theme colors must use six-digit hex values, such as #39734e.')
  }
  if (!isText(iconTheme, 50)) throw new Error('Icon theme must be between 1 and 50 characters.')
  if (!DOCK_POSITIONS.includes(dockPosition)) throw new Error('Choose a supported dock position.')
  if (!Array.isArray(apps) || apps.length > MAX_APPS || apps.some((app) => !isText(app, 50))) {
    throw new Error(`Add up to ${MAX_APPS} app names, each no longer than 50 characters.`)
  }

  return {
    id: isText(id, 80) ? id.trim() : `theme-${Date.now()}`,
    name: name.trim(),
    author: author.trim(),
    desktop,
    accentColor: accentColor.toLowerCase(),
    surfaceColor: surfaceColor.toLowerCase(),
    wallpaperColor: wallpaperColor.toLowerCase(),
    iconTheme: iconTheme.trim(),
    dockPosition,
    apps: apps.map((app) => app.trim()),
  }
}

function createThemeFile(profile) {
  return {
    format: 'wayfinder-theme',
    version: themeFormatVersion,
    theme: validateThemeProfile(profile),
  }
}

function readThemeFile(value) {
  if (!value || value.format !== 'wayfinder-theme' || value.version !== themeFormatVersion) {
    throw new Error('This is not a supported Wayfinder theme file.')
  }
  return validateThemeProfile(value.theme)
}

function createThemeId() {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

module.exports = {
  createThemeFile,
  createThemeId,
  readThemeFile,
  starterThemes,
  themeFormatVersion,
  validateThemeProfile,
}
