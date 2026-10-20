const guideSteps = [
  {
    number: '01',
    title: 'Choose and install Linux',
    summary: 'Pick a distro, back up important files, and follow its own install guide.',
    note: 'Install steps can erase data. Try a live session first when available, and read disk and dual-boot choices carefully.',
    resources: [
      {
        name: 'Linux Mint installation guide',
        kind: 'Official: download, live USB, install, drivers, snapshots',
        url: 'https://linuxmint-installation-guide.readthedocs.io/en/latest/',
      },
      {
        name: 'Install Ubuntu Desktop',
        kind: 'Official: installer and installation choices',
        url: 'https://ubuntu.com/tutorials/install-ubuntu-desktop',
      },
      {
        name: 'Fedora installation guide',
        kind: 'Official: Workstation and other Fedora editions',
        url: 'https://docs.fedoraproject.org/en-US/fedora/latest/getting-started/',
      },
      {
        name: 'Arch Linux installation guide',
        kind: 'Official wiki: hands-on installation; for users comfortable following a detailed guide',
        url: 'https://wiki.archlinux.org/title/Installation_guide',
      },
    ],
  },
  {
    number: '02',
    title: 'Set up drivers and updates',
    summary: 'Use your distro’s update and driver tools before adding third-party installers.',
    note: 'Wayfinder can show selected detected devices; it cannot confirm every feature works.',
    resources: [
      {
        name: 'Linux Mint: hardware drivers',
        kind: 'Official installation guide',
        url: 'https://linuxmint-installation-guide.readthedocs.io/en/latest/drivers.html',
      },
      {
        name: 'Linux Mint: system snapshots',
        kind: 'Official recovery guidance',
        url: 'https://linuxmint-installation-guide.readthedocs.io/en/latest/timeshift.html',
      },
      {
        name: 'ArchWiki: gaming',
        kind: 'Community-maintained technical wiki; follow instructions for your setup',
        url: 'https://wiki.archlinux.org/title/Gaming',
      },
      {
        name: 'Lutris: prepare your system',
        kind: 'Project guidance on graphics drivers, Vulkan, and Wine',
        url: 'https://lutris.net/about',
      },
    ],
  },
  {
    number: '03',
    title: 'Check games and choose how to run them',
    summary: 'Look up the specific title. A store listing, installer, or community report is not a guarantee.',
    note: 'Anti-cheat compatibility may depend on the game publisher enabling support; a local readiness scan cannot enable it.',
    resources: [
      {
        name: 'Install Steam',
        kind: 'Official Steam download page',
        url: 'https://store.steampowered.com/about/',
      },
      {
        name: 'Steam / Proton documentation',
        kind: 'Official: Proton and developer-side anti-cheat setup',
        url: 'https://partner.steamgames.com/doc/steamhardware/proton',
      },
      {
        name: 'ProtonDB',
        kind: 'Community-submitted game reports',
        url: 'https://www.protondb.com/',
      },
      {
        name: 'Are We Anti-Cheat Yet?',
        kind: 'Community-maintained anti-cheat tracking',
        url: 'https://areweanticheatyet.com/',
      },
      {
        name: 'Lutris game catalog',
        kind: 'Community game installers and catalog',
        url: 'https://lutris.net/games/',
      },
      {
        name: 'WineHQ AppDB',
        kind: 'Community Wine application reports',
        url: 'https://appdb.winehq.org/',
      },
    ],
  },
  {
    number: '04',
    title: 'Troubleshoot with useful evidence',
    summary: 'Check recent reports, then ask the community for your distro with steps to reproduce.',
    note: 'Share only logs you have reviewed. Remove usernames, tokens, private paths, and other personal details.',
    resources: [
      {
        name: 'Ask Ubuntu',
        kind: 'Ubuntu community Q&A',
        url: 'https://askubuntu.com/',
      },
      {
        name: 'Fedora Discussion',
        kind: 'Fedora community forum',
        url: 'https://discussion.fedoraproject.org/',
      },
      {
        name: 'Arch Linux forums',
        kind: 'Arch community support',
        url: 'https://bbs.archlinux.org/',
      },
      {
        name: 'Linux Mint forums',
        kind: 'Linux Mint community support',
        url: 'https://forums.linuxmint.com/',
      },
      {
        name: 'Lutris forums',
        kind: 'Game launcher support; review diagnostic output before posting',
        url: 'https://forums.lutris.net/',
      },
    ],
  },
  {
    number: '05',
    title: 'Share what worked—and recover safely',
    summary: 'Contribute to the source that owns the data. Keep backups before system changes.',
    note: 'Wayfinder creates local report files; it does not submit issues or publish your system information.',
    resources: [
      {
        name: 'ProtonDB game reports',
        kind: 'Add a firsthand report on that game’s ProtonDB page',
        url: 'https://www.protondb.com/',
      },
      {
        name: 'Anti-cheat tracker contributions',
        kind: 'Check the project’s contribution instructions and existing issues',
        url: 'https://github.com/AreWeAntiCheatYet/AreWeAntiCheatYet',
      },
      {
        name: 'Lutris community support',
        kind: 'Ask or share launcher troubleshooting details',
        url: 'https://forums.lutris.net/',
      },
      {
        name: 'Create a Wayfinder report',
        kind: 'Prepare a local, reviewable report in the compatibility section below',
        href: '#compatibility',
      },
      {
        name: 'Backups before changes',
        kind: 'Read your distro’s recovery guidance before changing disks, firmware, or boot settings',
        url: 'https://linuxmint-installation-guide.readthedocs.io/en/latest/timeshift.html',
      },
    ],
  },
]

module.exports = { guideSteps }
