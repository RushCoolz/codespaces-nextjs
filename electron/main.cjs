const { app, BrowserWindow, dialog, shell } = require('electron')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const net = require('node:net')
const path = require('node:path')

const host = '127.0.0.1'
let serverProcess
let serverError
let appWindow
let serverUrl
let shuttingDown = false

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer()
    probe.once('error', reject)
    probe.listen(0, host, () => {
      const { port } = probe.address()
      probe.close((error) => (error ? reject(error) : resolve(port)))
    })
  })
}

function getServerPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'wayfinder', 'server.js')
    : path.join(__dirname, '..', 'electron-resources', 'wayfinder', 'server.js')
}

function waitForExit() {
  if (!serverProcess || serverProcess.exitCode !== null) return Promise.resolve()
  return new Promise((resolve) => serverProcess.once('exit', resolve))
}

async function waitForServer(url) {
  const deadline = Date.now() + 30000
  while (Date.now() < deadline) {
    if (serverError) throw serverError
    if (serverProcess.exitCode !== null) {
      throw new Error(`The local server exited with code ${serverProcess.exitCode}.`)
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1500) })
      if (response.ok) return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }
  throw new Error('The local server did not start within 30 seconds.')
}

async function startServer() {
  const serverPath = getServerPath()
  if (!fs.existsSync(serverPath)) {
    throw new Error('The bundled Wayfinder server was not found. Rebuild the desktop app.')
  }
  const port = await findAvailablePort()
  const url = `http://${host}:${port}`
  serverUrl = url

  serverProcess = spawn(process.execPath, [serverPath], {
    cwd: path.dirname(serverPath),
    stdio: 'ignore',
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      HOSTNAME: host,
      PORT: String(port),
      NODE_ENV: 'production',
      NEXT_TELEMETRY_DISABLED: '1',
    },
  })
  serverProcess.once('error', (error) => {
    serverError = error
  })

  await waitForServer(url)
  return url
}

function createWindow(url) {
  appWindow = new BrowserWindow({
    width: 1180,
    height: 850,
    minWidth: 720,
    minHeight: 640,
    show: false,
    backgroundColor: '#f6f7f4',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })

  appWindow.webContents.setWindowOpenHandler(({ url: requestedUrl }) => {
    try {
      if (new URL(requestedUrl).protocol === 'https:') {
        shell.openExternal(requestedUrl).catch((error) => {
          console.error('[Wayfinder] Could not open external link:', error)
        })
      }
    } catch (error) {
      console.error('[Wayfinder] Could not open external link:', error)
    }
    return { action: 'deny' }
  })
  appWindow.webContents.on('will-navigate', (event, requestedUrl) => {
    if (requestedUrl !== url && !requestedUrl.startsWith(`${url}/`)) {
      event.preventDefault()
    }
  })
  appWindow.once('ready-to-show', () => appWindow.show())
  appWindow.on('closed', () => {
    appWindow = null
  })
  appWindow.loadURL(url).catch((error) => {
    console.error('[Wayfinder] Could not load the local app:', error)
    dialog.showErrorBox('Wayfinder could not open', error.message)
    app.quit()
  })
}

async function stopServer() {
  if (!serverProcess || serverProcess.exitCode !== null) return
  const exited = waitForExit()
  serverProcess.kill('SIGTERM')
  const timeout = setTimeout(() => {
    if (serverProcess.exitCode === null) serverProcess.kill('SIGKILL')
  }, 3000)
  await exited
  serverUrl = null
  clearTimeout(timeout)
}

app.whenReady().then(async () => {
  try {
    const url = await startServer()
    createWindow(url)
  } catch (error) {
    console.error('[Wayfinder] Desktop startup failed:', error)
    dialog.showErrorBox(
      'Wayfinder could not start',
      `${error.message}\n\nTry rebuilding or reinstalling the application.`
    )
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && !shuttingDown) {
    (serverUrl && serverProcess?.exitCode === null
      ? Promise.resolve(serverUrl)
      : startServer())
      .then(createWindow)
      .catch((error) => {
        console.error('[Wayfinder] Could not reopen the desktop window:', error)
        dialog.showErrorBox('Wayfinder could not open', error.message)
      })
  }
})

app.on('before-quit', (event) => {
  if (!serverProcess || serverProcess.exitCode !== null) return
  if (shuttingDown) return
  shuttingDown = true
  event.preventDefault()
  stopServer()
    .catch((error) => console.error('[Wayfinder] Could not stop local server:', error))
    .finally(() => app.quit())
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
