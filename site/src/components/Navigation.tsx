'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { icon: 'analytics',   label: 'Dashboard', href: '/' },
  { icon: 'shield',      label: 'Presença',  href: '/presence' },
  { icon: 'biotech',     label: 'Zerg HQ',   href: '/zerg' },
  { icon: 'monitoring',  label: 'Stats',     href: '/stats' },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <>
      {NAV.map(n => {
        const active = pathname === n.href
        return (
          <Link key={n.href} href={n.href} style={{ textDecoration: 'none' }}>
            <button className={`nav-btn${active ? ' active' : ''}`}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{n.icon}</span>
              <span>{n.label}</span>
            </button>
          </Link>
        )
      })}
    </>
  )
}

export function BottomNav() {
  const pathname = usePathname()

  return (
    <>
      {NAV.map(n => {
        const active = pathname === n.href
        return (
          <Link key={n.href} href={n.href} style={{ textDecoration: 'none' }}>
            <button className={`nav-btn${active ? ' active' : ''}`}>
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{n.icon}</span>
              <span>{n.label}</span>
            </button>
          </Link>
        )
      })}
    </>
  )
}
