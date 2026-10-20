const communityThemeLinks = [
  {
    id: 'whitesur',
    name: 'WhiteSur',
    style: 'macOS-inspired',
    desktopSupport: 'GTK desktops; GNOME Shell options are available',
    description: 'A polished light or dark look with rounded window styling and optional matching components.',
    setup: 'Check the project requirements and choose the GTK, shell, icon, and optional tweaks you want. Follow its installation and removal instructions for your desktop.',
    url: 'https://github.com/vinceliuice/WhiteSur-gtk-theme',
    source: 'Project and install guide',
  },
  {
    id: 'fluent',
    name: 'Fluent GTK',
    style: 'Windows-inspired',
    desktopSupport: 'GTK desktops; some shell effects are GNOME-specific',
    description: 'A Fluent-inspired GTK theme with light and dark variants and optional panel and icon tweaks.',
    setup: 'Review the GTK and build requirements, select the variants you want, then use the project’s documented install or uninstall steps.',
    url: 'https://github.com/vinceliuice/Fluent-gtk-theme',
    source: 'Project and install guide',
  },
  {
    id: 'gnome-look',
    name: 'GNOME-Look.org',
    style: 'Community catalog',
    desktopSupport: 'GTK and GNOME resources; check each listing',
    description: 'Browse community-submitted GTK themes, icons, cursors, and GNOME Shell styles.',
    setup: 'Open an item’s details and check its supported desktop, release date, license, and install instructions before downloading.',
    url: 'https://www.gnome-look.org/',
    source: 'Browse GNOME themes',
  },
  {
    id: 'kde-store',
    name: 'KDE Store',
    style: 'Community catalog',
    desktopSupport: 'KDE Plasma; check each listing',
    description: 'Find Plasma global themes, desktop styles, icons, cursors, and other community add-ons.',
    setup: 'Open an item’s details and check its Plasma version, license, and install instructions. Some components are installed separately.',
    url: 'https://store.kde.org/',
    source: 'Browse Plasma themes',
  },
]

module.exports = { communityThemeLinks }
