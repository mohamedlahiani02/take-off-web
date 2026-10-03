import { Nav } from '@/components/layout/nav'
import { Footer } from '@/components/layout/footer'
import { requireAuth } from '@/lib/auth/server-guards'
import { AccountNav } from './account-nav'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireAuth()

  return (
    <>
      <Nav theme="dark" />
      <div className="min-h-screen bg-navy pt-[74px]">
        {/* Phone: the account sections as a horizontal scroller. Desktop:
            the sidebar below. */}
        <AccountNav variant="bar" />

        <div className="flex">
          <aside className="hidden w-56 flex-none flex-col gap-1 border-r border-white/8 px-6 py-10 md:flex">
            <p className="mb-6 font-mono text-[10px] tracking-[0.32em] text-white/30">MON COMPTE</p>
            <AccountNav variant="sidebar" />
            <div className="mt-auto pt-10">
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="font-mono text-[10px] tracking-[0.22em] text-white/30 transition-colors hover:text-white/60"
                >
                  DÉCONNEXION
                </button>
              </form>
            </div>
          </aside>

          <main className="min-w-0 flex-1 px-[5vw] py-10">{children}</main>
        </div>

        {/* Phone: sign out has no sidebar to live in. */}
        <div className="border-t border-white/8 px-[5vw] py-6 md:hidden">
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="font-mono text-[10px] tracking-[0.22em] text-white/30 transition-colors hover:text-white/60"
            >
              DÉCONNEXION
            </button>
          </form>
        </div>
      </div>
      <Footer theme="dark" />
    </>
  )
}
