const windowsAlternatives = [
  {
    id: 'idm',
    windowsApp: 'Internet Download Manager (IDM)',
    aliases: ['idm', 'internet download manager', 'download manager', 'idm downloader'],
    category: 'Downloads',
    summary: 'Download manager with queues, pause/resume, and browser integration.',
    options: [
      {
        name: 'JDownloader 2',
        type: 'Linux-capable alternative',
        detail: 'Download queues, pause/resume, and supported-site link collection. Not an exact IDM clone.',
        url: 'https://jdownloader.org/download/index',
      },
      {
        name: 'Xtreme Download Manager (XDM 9)',
        type: 'Linux-native preview',
        detail: 'The project currently labels XDM 9 as a pre-release; expect rough edges.',
        url: 'https://xtremedownloadmanager.com/',
      },
    ],
    caveat: 'Browser capture and video-site support vary. Use the official download page and review installer prompts.',
  },
  {
    id: 'office',
    windowsApp: 'Microsoft Office',
    aliases: ['office', 'microsoft office', 'word', 'excel', 'powerpoint', 'ms office'],
    category: 'Office',
    summary: 'For common documents and spreadsheets, try a desktop suite or the web apps.',
    options: [
      {
        name: 'LibreOffice',
        type: 'Linux desktop suite',
        detail: 'Opens and edits common Office formats; complex layouts, macros, and formatting can differ.',
        url: 'https://www.libreoffice.org/download/',
      },
      {
        name: 'Microsoft 365 on the web',
        type: 'Web option',
        detail: 'Use Microsoft’s browser apps with an account; features and plan requirements vary.',
        url: 'https://www.microsoft365.com/',
      },
    ],
    caveat: 'Check important files for layout and feature fidelity before moving a team workflow.',
  },
  {
    id: 'photoshop',
    windowsApp: 'Adobe Photoshop',
    aliases: ['photoshop', 'adobe photoshop', 'psd editor'],
    category: 'Image editing',
    summary: 'Choose based on your work: photo editing and painting are different needs.',
    options: [
      {
        name: 'GIMP',
        type: 'Linux image editor',
        detail: 'General image editing; Photoshop workflows, plugins, and some PSD features differ.',
        url: 'https://www.gimp.org/downloads/',
      },
      {
        name: 'Krita',
        type: 'Linux painting and illustration',
        detail: 'Strong for digital painting and illustration; not a Photoshop replacement for every photo workflow.',
        url: 'https://krita.org/en/download/',
      },
    ],
    caveat: 'If you depend on specific Adobe plugins or exact PSD behavior, test your files before migrating.',
  },
  {
    id: 'premiere',
    windowsApp: 'Adobe Premiere Pro',
    aliases: ['premiere', 'premiere pro', 'adobe premiere', 'video editor'],
    category: 'Video editing',
    summary: 'Kdenlive is a native Linux editor for many timeline-based workflows.',
    options: [
      {
        name: 'Kdenlive',
        type: 'Linux video editor',
        detail: 'Open-source non-linear video editor; project files and effects are not interchangeable with Premiere.',
        url: 'https://kdenlive.org/en/download/',
      },
    ],
    caveat: 'Check codec support, effects, and collaboration needs with a sample project.',
  },
  {
    id: 'outlook',
    windowsApp: 'Microsoft Outlook',
    aliases: ['outlook', 'microsoft outlook', 'email client'],
    category: 'Email',
    summary: 'Thunderbird is a Linux email app; account policies and enterprise features may differ.',
    options: [
      {
        name: 'Thunderbird',
        type: 'Linux email application',
        detail: 'Email, calendar, and contacts; verify your organization permits its sign-in and sync method.',
        url: 'https://www.thunderbird.net/',
      },
      {
        name: 'Outlook on the web',
        type: 'Web option',
        detail: 'Keep using Microsoft’s browser version if your account and organization allow it.',
        url: 'https://outlook.office.com/',
      },
    ],
    caveat: 'Work or school accounts may require organization-approved clients or device policies.',
  },
  {
    id: 'winrar',
    windowsApp: 'WinRAR',
    aliases: ['winrar', 'rar', 'archive manager', 'zip utility'],
    category: 'Files and archives',
    summary: 'PeaZip provides a graphical archive manager for Linux.',
    options: [
      {
        name: 'PeaZip',
        type: 'Linux archive manager',
        detail: 'Creates and opens many common archive formats; check format and encryption support for your files.',
        url: 'https://peazip.github.io/peazip-linux.html',
      },
    ],
    caveat: 'Some formats have licensing or feature limitations; keep an original copy of important archives.',
  },
  {
    id: 'notepad-plus-plus',
    windowsApp: 'Notepad++',
    aliases: ['notepad++', 'notepad plus plus', 'text editor', 'code editor'],
    category: 'Text and code',
    summary: 'Kate is a native editor with syntax highlighting and developer features.',
    options: [
      {
        name: 'Kate',
        type: 'Linux text and code editor',
        detail: 'A capable editor, but Notepad++ plugins and exact shortcuts may not transfer.',
        url: 'https://kate-editor.org/',
      },
    ],
    caveat: 'If you rely on a particular plugin or automation, check for an equivalent before switching.',
  },
]

function findWindowsAlternatives(query = '') {
  const normalized = query.trim().toLocaleLowerCase()
  if (!normalized) return windowsAlternatives

  return windowsAlternatives.filter((entry) =>
    [
      entry.windowsApp,
      entry.category,
      entry.summary,
      ...entry.aliases,
      ...entry.options.flatMap((option) => [option.name, option.detail]),
    ]
      .join(' ')
      .toLocaleLowerCase()
      .includes(normalized)
  )
}

module.exports = { findWindowsAlternatives, windowsAlternatives }
