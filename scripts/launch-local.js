const { spawn } = require('node:child_process')
const fs = require('node:fs')
const net = require('node:net')
const path = require('node:path')

const projectRoot = path.resolve(__dirname, '..')
const serverEntry = path.join(projectRoot, '.next', 'standalone', 'server.js')
const host = '127.0.0.1'
let server
let serverError

function findPort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer()
    probe.once('error', reject)
    probe.listen(0, host, () => {
      const address = probe.address()
      probe.close((error) => (error ? reject(error) : resolve(address.port)))
    })
  })
}

async function waitUntilReady(url) {
  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    if (serverError) throw serverError
    if (server.exitCode !== null) {
      throw new Error(`The local app exited with code ${server.exitCode}.`)
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) })
      if (response.ok) return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }
  throw new Error('The local app did not start within 20 seconds.')
}

async function main() {
  const configuredPort = process.env.WAYFINDER_PORT
  const port = configuredPort ? Number(configuredPort) : await findPort()
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('WAYFINDER_PORT must be a port number between 1 and 65535.')
  }
  const url = `http://${host}:${port}`
  if (!fs.existsSync(serverEntry)) {
    throw new Error('The standalone server is missing. Run npm run build first.')
  }
  server = spawn(
    process.execPath,
    [serverEntry],
    {
      cwd: path.dirname(serverEntry),
      stdio: 'inherit',
      env: {
        ...process.env,
        HOSTNAME: host,
        PORT: String(port),
        NODE_ENV: 'production',
        NEXT_TELEMETRY_DISABLED: '1',
      },
    }
  )
  server.once('error', (error) => {
    serverError = error
  })
  server.once('close', (code) => {
    if (code !== null) process.exitCode = code
  })
  await waitUntilReady(url)

  console.log(`Wayfinder is running locally: ${url}`)
  console.log('System scan data stays on this computer. Press Ctrl+C to stop.')

  const opener = spawn('xdg-open', [url], { stdio: 'ignore' })
  let openerFailed = false
  opener.on('error', () => {
    openerFailed = true
    console.warn(`Could not open a browser automatically. Visit ${url}`)
  })
  opener.on('close', (code) => {
    if (code !== null && code !== 0 && !openerFailed) {
      console.warn(`Could not open a browser automatically. Visit ${url}`)
    }
  })
  opener.unref()
}

function stopServer() {
  if (server && server.exitCode === null) server.kill('SIGINT')
}

process.once('SIGINT', stopServer)
process.once('SIGTERM', stopServer)

main().catch((error) => {
  console.error(`Could not start Wayfinder: ${error.message}`)
  stopServer()
  process.exitCode = 1
})
