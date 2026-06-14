import { prototypeAsset } from '@/lib/prototype/serve'

export const runtime = 'nodejs'

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params

  return prototypeAsset(path)
}
