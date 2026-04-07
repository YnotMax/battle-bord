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
      setSuggestions([])
      setShowDropdown(false)
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', ...style }} ref={dropdownRef}>
      <form onSubmit={handleSearch} style={{ width: '100%' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 16px',
          background: 'rgba(255,255,255,0.7)', border: '1px solid var(--border-lo)',
          borderRadius: 12, width: '100%',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--cyan-30)'}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-lo)'}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--cyan)' }}>search</span>
          <input
            placeholder="BUSCAR OPERADOR..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowDropdown(suggestions.length > 0)}
            style={{
              background: 'none', border: 'none', outline: 'none',
              fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600,
              letterSpacing: '0.05em', color: 'var(--text-900)', width: '100%',
            }}
          />
        </div>
      </form>

      {showDropdown && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
          zIndex: 1000, padding: '6px', borderRadius: 14,
          maxHeight: 280, overflowY: 'auto', border: '1px solid var(--border)',
          boxShadow: '0 12px 30px -5px rgba(0,0,0,0.15)',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          animation: 'fadeUp 0.2s ease-out'
        }} className="scroll">
          {suggestions.map((s, idx) => (
            <div 
              key={s} 
              onClick={() => handleSearch(undefined, s)}
              style={{
                padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10,
                fontSize: '12px', fontWeight: 700, color: 'var(--text-700)',
                fontFamily: 'var(--font-mono)', transition: 'all 0.15s',
                marginBottom: idx === suggestions.length - 1 ? 0 : 2
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--cyan-10)'
                e.currentTarget.style.color = 'var(--cyan)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-700)'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14, opacity: 0.5 }}>person</span>
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
