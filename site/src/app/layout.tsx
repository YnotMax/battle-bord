import type { Metadata } from 'next'
import './globals.css'
import { SidebarNav, BottomNav } from '@/components/Navigation'

export const metadata: Metadata = {
  title: 'I M O R T A I S | Guild Admin Hub',
  description: 'Painel administrativo de batalhas ZvZ, presença e estatísticas da guilda I M O R T A I S no Albion Online.',
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="app-root">

          {/* ── HEADER ─────────────────────────────────────── */}
          <header className="app-header">
            {/* Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <div style={{
                width: 32, height: 32, background: '#0f172a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transform: 'rotate(45deg)', borderRadius: 4, flexShrink: 0,
              }}>
                <span className="material-symbols-outlined"
                  style={{ color: '#fff', fontSize: 16, transform: 'rotate(-45deg)' }}>
                  admin_panel_settings
                </span>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '0.22em', color: 'var(--text-900)', lineHeight: 1 }}>
                  I M O R T A I S
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.18em', color: 'var(--cyan)', marginTop: 2 }}>
                  GUILD ADMIN HUB
                </div>
              </div>
            </div>

            {/* Center: quick stats (hidden on mobile) */}
            <div className="hide-mobile"
              style={{ display: 'flex', alignItems: 'center', gap: 24, flex: 1, justifyContent: 'center' }}>
              <div style={{ height: 28, width: 1, background: 'var(--border-lo)' }} />
              <div style={{ display: 'flex', gap: 24 }}>
                <div>
                  <div className="label">Battle Stats</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--text-900)' }}>
                    — K/D AVG
                  </div>
                </div>
                <div>
                  <div className="label">Win Rate</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--cyan)' }}>
                    LIVE
                  </div>
                </div>
              </div>
            </div>

            {/* Right: live badge + search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px',
                background: 'rgba(0,255,157,0.08)', border: '1px solid rgba(0,255,157,0.2)',
                borderRadius: 100,
              }}>
                <span className="live-dot" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.12em', color: '#059669', fontWeight: 700 }}>
                  LIVE · ALBIONBB
                </span>
              </div>

              <div className="hide-mobile" style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 12px',
                background: 'rgba(15,23,42,0.04)', border: '1px solid rgba(15,23,42,0.08)',
                borderRadius: 100,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--text-400)' }}>search</span>
                <input
                  placeholder="PESQUISAR..."
                  style={{
                    background: 'none', border: 'none', outline: 'none',
                    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em',
                    color: 'var(--text-700)', width: 120,
                  }}
                />
              </div>
            </div>
          </header>

          {/* ── BODY ───────────────────────────────────────── */}
          <div className="app-body">

            {/* Sidebar (desktop) */}
            <aside className="app-sidebar">
              <SidebarNav />

              {/* Spacer + logout */}
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, transparent, var(--cyan-20), transparent)' }} />
                <button className="nav-btn" style={{ color: 'var(--text-400)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>settings</span>
                  <span>Config</span>
                </button>
              </div>
            </aside>

            {/* Page content */}
            <main className="app-main">
              <div className="page-content scroll">
                {children}
              </div>
            </main>
          </div>

          {/* ── BOTTOM TAB BAR (mobile) ────────────────────── */}
          <nav className="bottom-nav">
            <BottomNav />
          </nav>

        </div>
      </body>
    </html>
  )
}
