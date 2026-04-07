'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export function DateFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const days = searchParams.get('days') || '0'

  return (
    <select 
      value={days}
      onChange={(e) => {
        router.push(`?days=${e.target.value}`)
      }}
      style={{
        background: 'var(--bg-card)',
        color: 'var(--text-900)',
        border: '1px solid var(--border)',
        padding: '6px 12px',
        borderRadius: 6,
        fontSize: 12,
        outline: 'none',
        cursor: 'pointer'
      }}
    >
      <option value="0">Toda a História</option>
      <option value="7">Últimos 7 dias</option>
      <option value="15">Últimos 15 dias</option>
      <option value="30">Últimos 30 dias</option>
    </select>
  )
}
