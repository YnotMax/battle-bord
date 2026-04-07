'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { icon: 'analytics',    label: 'Dashboard', href: '/' },
  { icon: 'shield',       label: 'Presença',  href: '/presence' },
  { icon: 'biotech',      label: 'Zerg HQ',   href: '/zerg' },
  { icon: 'military_tech', label: 'Mentoria', href: '/guild' },
  { icon: 'person',       label: 'Operador',  href: '/player' },
  { icon: 'monitoring',   label: 'Stats',     href: '/stats' },
]

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function SearchInput({ style }: { style?: any }) {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/player/${encodeURIComponent(query.trim())}`)
      setQuery('')
    }
  }

  return (
    <form onSubmit={handleSearch} style={{ width: '100%', ...style }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px',
        background: 'rgba(15,23,42,0.04)', border: '1px solid rgba(15,23,42,0.1)',
        borderRadius: 100, width: '100%'
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--text-400)' }}>search</span>
        <input
          placeholder="BUSCAR OPERADOR..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            background: 'none', border: 'none', outline: 'none',
            fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em',
            color: 'var(--text-700)', width: '100%',
          }}
        />
      </div>
    </form>
  )
}

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
      <div style={{ padding: '0 8px 16px 8px' }}>
        <SearchInput />
      </div>
      
      {NAV.map(n => {
        const active = pathname === n.href || (n.href !== '/' && pathname?.startsWith(n.href))
        return (
          <Link key={n.href} href={n.href} style={{ textDecoration: 'none' }}>
            <button className={`nav-btn${active ? ' active' : ''}`}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{n.icon}</span>
              <span>{n.label}</span>
            </button>
          </Link>
        )
      })}
    </div>
  )
}

export function BottomNav() {
  const pathname = usePathname()

  return (
    <>
      {NAV.map(n => {
        const active = pathname === n.href || (n.href !== '/' && pathname?.startsWith(n.href))
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
