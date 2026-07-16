import { prototypeHtml } from '@/lib/prototype/serve'

export const runtime = 'nodejs'

export function GET() {
  return prototypeHtml('Take Off - Padel Reserve.dc.html')
}
