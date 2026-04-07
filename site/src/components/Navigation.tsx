'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { icon: 'analytics',    label: 'Dashboard', href: '/' },
  { icon: 'person',       label: 'Operador',  href: '/player' },
  { icon: 'shield',       label: 'Presença',  href: '/presence' },
  { icon: 'biotech',      label: 'Zerg HQ',   href: '/zerg' },
  { icon: 'military_tech', label: 'Mentoria', href: '/guild' },
  { icon: 'monitoring',   label: 'Stats',     href: '/stats' },
]

import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export function SearchInput({ style }: { style?: any }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.trim().length < 2) {
        setSuggestions([])
        return
      }
      
      const { data } = await sb
        .from('player_stats')
        .select('player_name')
        .ilike('player_name', `%${query}%`)
        .limit(8)

      if (data) {
        const uniqueNames = Array.from(new Set(data.map(d => d.player_name)))
        setSuggestions(uniqueNames)
        setShowDropdown(uniqueNames.length > 0)
      }
    }

    const timer = setTimeout(fetchSuggestions, 300)
    return () => clearTimeout(timer)
  }, [query])

  const handleSearch = (e?: React.FormEvent, name?: string) => {
    e?.preventDefault()
    const target = name || query.trim()
    if (target) {
      router.push(`/player/${encodeURIComponent(target)}`)
      setQuery('')
      setShowDropdown(false)
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', ...style }} ref={dropdownRef}>
      <form onSubmit={handleSearch} style={{ width: '100%' }}>
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
            onFocus={() => setShowDropdown(suggestions.length > 0)}
            style={{
              background: 'none', border: 'none', outline: 'none',
              fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em',
              color: 'var(--text-700)', width: '100%',
            }}
          />
        </div>
      </form>

      {showDropdown && suggestions.length > 0 && (
        <div className="glass" style={{
          position: 'absolute', top: '120%', left: 0, right: 0,
          zIndex: 1000, padding: '4px 0', borderRadius: 12,
          maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border)',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
          background: 'var(--bg-popover, rgba(2, 6, 23, 0.95))',
          backdropFilter: 'blur(10px)'
        }}>
          {suggestions.map(s => (
            <div 
              key={s} 
              onClick={() => handleSearch(undefined, s)}
              style={{
                padding: '10px 16px', cursor: 'pointer',
                fontSize: 11, fontWeight: 600, color: 'var(--text-700)',
                fontFamily: 'var(--font-mono)', borderBottom: '1px solid rgba(255,255,255,0.03)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0,255,157,0.05)'
                e.currentTarget.style.color = 'var(--cyan)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-700)'
              }}
            >
              {s.toUpperCase()}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', alignItems: 'center' }}>
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
    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-around', alignItems: 'center' }}>
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
    </div>
  )
}
