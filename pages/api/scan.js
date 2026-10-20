const { scanSystem } = require('../../lib/systemScan')

function isLoopbackAddress(address = '') {
  return address === '::1' || address === '::ffff:127.0.0.1' || address.startsWith('127.')
}

function isLoopbackHost(header = '') {
  try {
    const hostname = new URL(`http://${header}`).hostname.toLowerCase()
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
  } catch {
    return false
  }
}

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (
    !isLoopbackAddress(req.socket?.remoteAddress) ||
    !isLoopbackHost(req.headers.host)
  ) {
    return res.status(403).json({
      error: 'System scans are available only to the local computer.',
    })
  }

  const origin = req.headers.origin
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) {
        return res.status(403).json({ error: 'Cross-origin scans are not allowed.' })
      }
    } catch {
      return res.status(403).json({ error: 'Invalid request origin.' })
    }
  }

  return res.status(200).json(scanSystem())
}
