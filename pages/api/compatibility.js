const { searchCompatibility } = require('../../lib/compatibility')

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

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!isLoopbackAddress(req.socket?.remoteAddress) || !isLoopbackHost(req.headers.host)) {
    return res.status(403).json({ error: 'Compatibility lookup is available only locally.' })
  }

  const origin = req.headers.origin
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) {
        return res.status(403).json({ error: 'Cross-origin lookups are not allowed.' })
      }
    } catch {
      return res.status(403).json({ error: 'Invalid request origin.' })
    }
  }

  const query = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  if (query.length < 2 || query.length > 80) {
    return res.status(400).json({ error: 'Enter a search term between 2 and 80 characters.' })
  }

  try {
    const result = await searchCompatibility(query)
    return res.status(200).json(result)
  } catch (error) {
    console.error('[Wayfinder] Compatibility lookup failed:', error)
    return res.status(502).json({
      error: 'Compatibility sources could not be searched. Try again later.',
    })
  }
}
