# Wayfinder

Wayfinder is an installable Linux desktop wrapper for a read-only system
readiness checker and a source-attributed application compatibility finder. It
keeps system indicators separate from a game's actual Linux/Proton support:
Wayfinder cannot approve a PC for a publisher's anti-cheat system.
The interface is organized into short tabs: Start here, System check, Games &
apps, Windows alternatives, Theme studio, and Hardware.

## Build and run locally

Install Node.js 20.9 or newer, then run:

```sh
npm install
npm run app
```

This builds the Next.js app, prepares its local server, and opens Wayfinder in
an Electron desktop window. Use `npm test` for the system scanner and
compatibility source tests.

## Build a Linux desktop app

Build a portable AppImage on a Linux machine:

```sh
npm run electron:dist
```

The AppImage runs on Ubuntu, Fedora, Arch, and other compatible Linux
distributions without replacing the user's operating system or requiring a
distro-specific package. Make it executable, then run it:

```sh
chmod +x ./release/Wayfinder-0.1.0-x86_64.AppImage
./release/Wayfinder-0.1.0-x86_64.AppImage
```

The build targets the architecture of the build machine. Native `.deb`, `.rpm`,
and Arch package outputs are not currently enabled: their package metadata
requires the project's public homepage and a maintainer contact.

## Linux guide

The **From install to gaming** guide links to original installation guides for
Linux Mint, Ubuntu, Fedora, and Arch, then points to distro setup instructions,
Steam/Proton, compatibility reports, support communities, and recovery advice.
Wayfinder links to these resources instead of copying their documentation.
Community material is labeled as community-maintained and may be outdated;
check the source and make sure advice matches your distro and hardware.

For community help, choose the distro forum or Q&A linked in the guide and
include the app version, distro, kernel, runtime, steps to reproduce, and
relevant error details. Review logs and remove personal information before
posting. To contribute a game report, use its ProtonDB page; for anti-cheat
tracking, follow the Are We Anti-Cheat Yet? project's contribution instructions.
Wayfinder can prepare a report locally but does not submit it for you.

## Data sources and limitations

- **Steam store search** supplies game names, Steam IDs, and whether a native
  Linux version is listed. This listing is not itself a compatibility rating.
- **ProtonDB** provides community-submitted Proton report summaries for up to
  the first five Steam search results. The tier, confidence, and report count
  describe user reports; they are not a guarantee for a particular machine.
- **Are We Anti-Cheat Yet?** supplies community-tracked anti-cheat status,
  listed anti-cheat names, update dates, and cited notes. This status can become
  stale. The project is MIT-licensed; its attribution and license are included
  in the app and `licenses/AreWeAntiCheatYet-MIT.txt`.
- **Lutris** supplies game catalog matches. A catalog entry or install script
  does not prove that a game works.
- **WineHQ AppDB** is linked as a title-specific search. Wayfinder does not
  copy AppDB reports or claim to verify them.

Compatibility searches require an internet connection and send the search
term to Steam and Lutris, request ProtonDB summaries for matching Steam IDs,
and retrieve the community anti-cheat catalog from GitHub. Results are cached
in memory for up to ten minutes; the anti-cheat catalog is cached for up to one
hour. Wayfinder shows when it checked the sources, but that is not the date of
each underlying community report. System scan results are not sent to these
services. Publisher support is not inferred from community reports; where it
is unknown, Wayfinder says so.

For Steam matches, Wayfinder now combines the Steam Linux listing, ProtonDB
summary, and an exact-name or Steam-ID match in the anti-cheat tracker into a
short quick read. A detected distro, kernel, and graphics driver are shown as
your local configuration context; Wayfinder does not compare them with game
requirements or promise that a game will run. A missing anti-cheat entry means
unknown, not supported. The scan reads the Linux environment running
Wayfinder; in a hosted web preview that can be a remote development container,
not the computer displaying the browser.

## Windows app alternatives

The Windows alternatives finder has a small curated list for common migration
needs, including Internet Download Manager (IDM), Office, Photoshop, Premiere,
Outlook, WinRAR, and Notepad++. It links to each alternative's official project
site and explains where features or workflows differ. In particular, XDM 9 is
currently labeled by its project as a pre-release. These suggestions are not
claims of exact feature parity. Check licensing, organization requirements,
file compatibility, and the upstream project before moving an important
workflow.

## Theme studio

Theme studio offers starter desktop looks that users can clone into their own
profiles. A profile can describe its desktop environment, colors, icon theme,
dock position, and favorite apps. Profiles are saved in the current browser or
Electron app's local storage and can be exported as `.wayfinder-theme.json`
files for manual sharing and imported by another user. The preview and recipe
are informational: Wayfinder does not install themes or apps, run commands, or
change desktop settings. The community links point to upstream projects and
catalogs such as WhiteSur, Fluent GTK, GNOME-Look.org, and the KDE Store. Check
each project's desktop support, requirements, license, and instructions;
individual theme components may need separate setup. Imported files are
size-limited and validated as plain profile data; they are not executable
setup bundles.

## Suggested next steps

The next useful improvements are to grow the app-alternatives catalog with
community-requested entries and clear caveats, let users filter game reports
by distro/runtime when the sources provide that detail, and add more distro-
specific official driver and recovery links. For Theme studio, a later step
could add distro- and desktop-specific application guidance while keeping
installation opt-in and reviewable. Prefer links to the projects that own the
information; do not imply that Wayfinder has tested compatibility when it has
only summarized third-party reports.

## Optional reports and privacy

After a local scan, choose **Review export** to inspect a diagnostic JSON file
before saving it. Hardware details are excluded unless you explicitly select
them; PCI IDs are not included. Wayfinder does not upload the diagnostic file.

The compatibility report form creates a Markdown report for manual sharing.
It separates reproducible community test results from official support status
and an optional publisher/vendor source URL. Generating and downloading require
explicit consent; reports are not sent to Wayfinder or any game project. Review
the preview and remove anything identifying or private before sharing. A
report is a local file, not a submitted issue or a verified publisher statement.

The local readiness scan reads Linux firmware, TPM, kernel-security, and
selected PCI-device files. The embedded server listens only on loopback and
the API rejects non-local and cross-origin requests. The scan does not change
firmware, kernel settings, drivers, or files. An unavailable interface is
reported as unknown, not as a passing result. Hardware inspection only checks
selected PCI devices for a bound driver; it does not test that all device
features work. Firmware support checks whether `fwupd` is installed; it does
not query update servers or install firmware.
