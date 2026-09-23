/**
 * Minimal stand-in for the Take Off API, used by the detail-page e2e specs.
 *
 * The detail pages are Server Components, so their fetches leave the Node
 * process and never pass through the browser — Playwright's page.route() cannot
 * intercept them. This serves deterministic fixtures instead.
 *
 * Scenarios are selected by id rather than by mutable server state, so tests
 * stay independent and can run in any order.
 *
 *   node tests/fixtures/api-server.cjs [port]
 */
const http = require('node:http')

const IDS = {
  product: '11111111-1111-4111-8111-111111111111',
  productSoldOut: '11111111-1111-4111-8111-1111111111a0',
  productInactive: '11111111-1111-4111-8111-1111111111b0',
  coach: '22222222-2222-4222-8222-222222222222',
  coach2: '33333333-3333-4333-8333-333333333333',
  tournament: '44444444-4444-4444-8444-444444444444',
  tournamentFull: '44444444-4444-4444-8444-4444444444f0',
  tournamentCancelled: '44444444-4444-4444-8444-4444444444c0',
  missing: '99999999-9999-4999-8999-999999999999',
  outage: '88888888-8888-4888-8888-888888888888',
}

const product = (id, over = {}) => ({
  id,
  name: 'Raquette Test Pro',
  category: 'RACKETS',
  priceDt: 349.5,
  description: 'Une raquette de test pour la suite automatisee.',
  imageUrls: [],
  hasSizes: false,
  stock: 7,
  isActive: true,
  ...over,
})

const coach = (id, first, last, over = {}) => ({
  id,
  firstName: first,
  lastName: last,
  roleTitle: 'Head Coach',
  bio: 'Biographie de test.',
  specs: ['Technique', 'Competition'],
  achievements: ['Champion regional 2024'],
  photoUrl: null,
  activity: 'PADEL',
  ...over,
})

const tournament = (id, over = {}) => ({
  id,
  title: 'Coupe de Test',
  description: 'Tournoi de test.',
  bannerUrl: null,
  format: 'Americano',
  category: 'OPEN',
  startsAt: '2026-11-14T09:00:00Z',
  endsAt: null,
  entryFeeDt: 60,
  prize: '1000 DT',
  status: 'PUBLISHED',
  maxParticipants: 16,
  registrationDeadline: '2026-11-10T22:00:00Z',
  currentRegistrations: 5,
  ...over,
})

function resolve(pathname) {
  const seg = pathname.split('/').filter(Boolean)
  const [, , kind, id] = seg // api v1 <kind> <id>

  if (id === IDS.outage) return { status: 503, body: { message: 'Synthetic outage' } }
  if (id === IDS.missing) return { status: 404, body: { message: 'Not found' } }

  if (kind === 'products' && id) {
    if (id === IDS.productSoldOut) return { status: 200, body: product(id, { stock: 0 }) }
    if (id === IDS.productInactive) return { status: 200, body: product(id, { isActive: false }) }
    if (id === IDS.product) return { status: 200, body: product(id) }
    return { status: 404, body: { message: 'Not found' } }
  }

  if (kind === 'coaches') {
    if (!id) {
      return {
        status: 200,
        body: [
          coach(IDS.coach, 'Amel', 'Fixture'),
          coach(IDS.coach2, 'Karim', 'Second', { roleTitle: 'Coach' }),
        ],
      }
    }
    if (id === IDS.coach) return { status: 200, body: coach(id, 'Amel', 'Fixture') }
    if (id === IDS.coach2) return { status: 200, body: coach(id, 'Karim', 'Second') }
    return { status: 404, body: { message: 'Not found' } }
  }

  if (kind === 'tournaments') {
    if (!id) return { status: 200, body: [tournament(IDS.tournament)] }
    if (id === IDS.tournament) return { status: 200, body: tournament(id) }
    if (id === IDS.tournamentFull) {
      return { status: 200, body: tournament(id, { currentRegistrations: 16 }) }
    }
    if (id === IDS.tournamentCancelled) {
      return { status: 200, body: tournament(id, { status: 'CANCELLED' }) }
    }
    return { status: 404, body: { message: 'Not found' } }
  }

  return { status: 200, body: [] }
}

function start(port) {
  return http
    .createServer((req, res) => {
      const { pathname } = new URL(req.url, 'http://localhost')
      const { status, body } = resolve(pathname)
      res.writeHead(status, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
    })
    .listen(port, '127.0.0.1', () => {
      console.log('fixture api on ' + port)
    })
}

// Importing this module (for IDS) must not start a server; only running it does.
if (require.main === module) start(Number(process.argv[2] || 4599))

module.exports = { IDS, start }
