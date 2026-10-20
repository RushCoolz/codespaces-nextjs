const fs = require('node:fs')
const path = require('node:path')

const projectRoot = path.resolve(__dirname, '..')
const standalone = path.join(projectRoot, '.next', 'standalone')
const staticAssets = path.join(projectRoot, '.next', 'static')
const destination = path.join(projectRoot, 'electron-resources', 'wayfinder')

if (!fs.existsSync(path.join(standalone, 'server.js'))) {
  throw new Error('Next.js standalone server is missing. Run npm run build first.')
}
if (!fs.existsSync(staticAssets)) {
  throw new Error('Next.js static assets are missing. Run npm run build first.')
}

fs.rmSync(destination, { recursive: true, force: true })
fs.mkdirSync(path.dirname(destination), { recursive: true })
fs.cpSync(standalone, destination, { recursive: true })
fs.mkdirSync(path.join(destination, '.next'), { recursive: true })
fs.cpSync(staticAssets, path.join(destination, '.next', 'static'), { recursive: true })

const publicAssets = path.join(projectRoot, 'public')
if (fs.existsSync(publicAssets)) {
  fs.cpSync(publicAssets, path.join(destination, 'public'), { recursive: true })
}

console.log(`Prepared local Next.js server at ${path.relative(projectRoot, destination)}.`)
