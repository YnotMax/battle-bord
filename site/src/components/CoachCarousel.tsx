'use client'

import { useState } from 'react'
import { WeaponIcon } from './WeaponIcon'

export type CoachInsight = {
  id: string
  type: 'danger' | 'warning' | 'discovery' | 'success' | 'neutral'
  icon: string
  color: string
  category: string
  title: string
  text: string
  weaponRaw?: string | null
}

export function CoachCarousel({ insights }: { insights: CoachInsight[] }) {
  const [index, setIndex] = useState(0)

  if (!insights || insights.length === 0) return null

  const current = insights[index]
  const total = insights.length

  const prev = () => setIndex(i => (i === 0 ? total - 1 : i - 1))
  const next = () => setIndex(i => (i === total - 1 ? 0 : i + 1))

  return (
    <div
      className="glass panel anim-up"
      style={{
        borderLeft: `4px solid ${current.color}`,
        background: 'var(--surface-hi)',
        boxShadow: 'var(--shadow-glass)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.3s ease'
      }}
    >
      <div className="panel-body" style={{ padding: '20px 24px' }}>
        {/* Header com categoria, contador e setas de navegação */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 'var(--radius-sm)',
                background: `rgba(${
                  current.color === '#ef4444' ? '239,68,68' :
                  current.color === '#10b981' ? '16,185,129' :
                  current.color === '#f97316' ? '249,115,22' : '0,242,255'
                }, 0.14)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <span className="material-symbols-outlined" style={{ color: current.color, fontSize: 20 }}>
                {current.icon}
              </span>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  className="badge"
                  style={{
                    background: `rgba(${
                      current.color === '#ef4444' ? '239,68,68' :
                      current.color === '#10b981' ? '16,185,129' :
                      current.color === '#f97316' ? '249,115,22' : '0,242,255'
                    }, 0.12)`,
                    color: current.color,
                    fontSize: 8,
                    padding: '2px 6px',
                    borderRadius: 3
                  }}
                >
                  {current.category}
                </span>
                <span className="label-sm" style={{ color: 'var(--text-400)' }}>
                  Diagnóstico IA {index + 1} de {total}
                </span>
              </div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-900)', marginTop: 2 }}>
                {current.title}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
            {current.weaponRaw && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 8px',
                  background: 'rgba(0,0,0,0.03)',
                  borderRadius: 6,
                  border: '1px solid var(--border-lo)'
                }}
              >
                <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-400)', textTransform: 'uppercase' }}>
                  Item em Foco
                </span>
                <WeaponIcon rawWeapon={current.weaponRaw} size={32} />
              </div>
            )}

            {/* Controles do Carrossel (< >) */}
            {total > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', padding: '3px 6px', borderRadius: 8, border: '1px solid var(--border-lo)' }}>
                <button
                  onClick={prev}
                  data-tooltip="Diagnóstico Anterior (←)"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: 4,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-700)', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--cyan)'; e.currentTarget.style.background = 'var(--cyan-10)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-700)'; e.currentTarget.style.background = 'none' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
                </button>

                <div style={{ display: 'flex', gap: 4, padding: '0 4px' }}>
                  {insights.map((_, i) => (
                    <div
                      key={i}
                      onClick={() => setIndex(i)}
                      style={{
                        width: i === index ? 14 : 6,
                        height: 6,
                        borderRadius: 3,
                        background: i === index ? current.color : 'var(--text-300)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    />
                  ))}
                </div>

                <button
                  onClick={next}
                  data-tooltip="Próximo Diagnóstico (→)"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: 4,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-700)', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--cyan)'; e.currentTarget.style.background = 'var(--cyan-10)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-700)'; e.currentTarget.style.background = 'none' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Texto do Diagnóstico */}
        <p style={{ color: 'var(--text-700)', fontSize: 13, lineHeight: 1.6, fontWeight: 500, margin: 0 }}>
          {current.text}
        </p>
      </div>
    </div>
  )
}
