'use client'

import { useState } from 'react'
import { CoachCarousel, CoachInsight } from './CoachCarousel'
import { BattleTimeline, KillEventItem } from './BattleTimeline'
import { WeaponIcon } from './WeaponIcon'
import { HintIcon } from './HintIcon'

type BattleSummary = {
  id: string
  startTime: string
  opponents: string
  result: string
}

type EnrichedWeapon = {
  weapon: string
  rawWeapon: string
  role: string
  uses: number
  wins: number
  kills: number
  deaths: number
  damage: number
  healing: number
  relativePct: number
  compareLabel: string
}

type Props = {
  playerName: string
  insights: CoachInsight[]
  playerBattles: BattleSummary[]
  playerKillEvents: KillEventItem[]
  weapons: EnrichedWeapon[]
}

export function PlayerTabsView({
  playerName,
  insights,
  playerBattles,
  playerKillEvents,
  weapons,
}: Props) {
  const [activeTab, setActiveTab] = useState<'coaching' | 'weapons' | 'history'>('coaching')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Barra de Sub-abas de Navegação */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--surface-hi)',
          padding: '6px 8px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-lo)',
          boxShadow: 'var(--shadow-sm)',
          width: 'fit-content'
        }}
      >
        <button
          onClick={() => setActiveTab('coaching')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 4,
            border: 'none',
            background: activeTab === 'coaching' ? 'var(--cyan-10)' : 'transparent',
            color: activeTab === 'coaching' ? 'var(--text-900)' : 'var(--text-400)',
            fontWeight: activeTab === 'coaching' ? 800 : 600,
            fontSize: 12,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            fontFamily: 'var(--font-display)'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: activeTab === 'coaching' ? 'var(--cyan)' : 'inherit' }}>
            psychology
          </span>
          Mentoria & Fases de Combate
          <span
            className="badge"
            style={{
              fontSize: 9,
              padding: '1px 5px',
              background: activeTab === 'coaching' ? 'var(--cyan)' : 'var(--border-lo)',
              color: activeTab === 'coaching' ? '#0f172a' : 'var(--text-500)'
            }}
          >
            {insights.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('weapons')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 4,
            border: 'none',
            background: activeTab === 'weapons' ? 'var(--cyan-10)' : 'transparent',
            color: activeTab === 'weapons' ? 'var(--text-900)' : 'var(--text-400)',
            fontWeight: activeTab === 'weapons' ? 800 : 600,
            fontSize: 12,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            fontFamily: 'var(--font-display)'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: activeTab === 'weapons' ? 'var(--cyan)' : 'inherit' }}>
            swords
          </span>
          Eficiência de Armas (Meta vs Core)
          <span
            className="badge"
            style={{
              fontSize: 9,
              padding: '1px 5px',
              background: activeTab === 'weapons' ? 'var(--cyan)' : 'var(--border-lo)',
              color: activeTab === 'weapons' ? '#0f172a' : 'var(--text-500)'
            }}
          >
            {weapons.length}
          </span>
        </button>
      </div>

      {/* Conteúdo da Aba 1: Mentoria & Fases de Combate */}
      {activeTab === 'coaching' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="anim-up">
          {/* Carrossel de Diagnósticos com Setas < > */}
          <CoachCarousel insights={insights} />

          {/* Fases de Combate 0-30s, 31-60s, etc. */}
          <BattleTimeline
            allBattles={playerBattles}
            killEvents={playerKillEvents}
            playerName={playerName}
          />
        </div>
      )}

      {/* Conteúdo da Aba 2: Eficiência de Armas (Meta vs Core) */}
      {activeTab === 'weapons' && (
        <div className="glass panel anim-up">
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="section-hd">Eficiência de Armamento (Meta Specs vs Core da Guilda)</span>
              <HintIcon text="Estatísticas por arma. Relativo Core = seu dano/cura comparado à média de quem usa a mesma arma na guilda" />
            </div>
          </div>
          <div className="panel-body scroll" style={{ maxHeight: 520 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Classe & Arma</th>
                  <th style={{ textAlign: 'center' }}>ZvZs</th>
                  <th style={{ textAlign: 'center' }}>KDA</th>
                  <th style={{ textAlign: 'right' }}>DPS/Luta</th>
                  <th style={{ textAlign: 'right' }}>Heal/Luta</th>
                  <th style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                      Relativo Core
                      <HintIcon text="Seu Dano/Cura médio vs média dos que usam essa mesma arma na guilda" />
                    </div>
                  </th>
                  <th style={{ textAlign: 'right' }}>WinRate</th>
                </tr>
              </thead>
              <tbody>
                {weapons.map(w => {
                  const wr = Math.round((w.wins / w.uses) * 100)
                  const kda = w.deaths === 0 ? w.kills : (w.kills / w.deaths).toFixed(2)
                  const avgDamage = Math.round(w.damage / w.uses).toLocaleString()
                  const avgHeal = Math.round(w.healing / w.uses).toLocaleString()
                  const albion2d_link = `https://albiononline2d.com/pt/item/id/T8_${w.rawWeapon.replace(/^T\d_/, '').split('@')[0]}`
                  const isPositive = w.relativePct > 0

                  return (
                    <tr key={w.weapon}>
                      <td>
                        <span style={{ opacity: 0.6, fontSize: 9, display: 'block', marginBottom: 2, color: 'var(--text-400)', textTransform: 'uppercase' }}>
                          {w.role}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <WeaponIcon rawWeapon={w.rawWeapon} size={32} />
                          <a
                            href={albion2d_link}
                            data-tooltip="Ver item no Albion2D"
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontWeight: 700, color: 'var(--text-900)', textDecoration: 'none' }}
                            className="hover:text-cyan"
                          >
                            {w.weapon}
                          </a>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{w.uses}x</td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{kda}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: w.damage > 0 ? '#f97316' : 'var(--text-400)' }}>
                        {w.damage > 0 ? avgDamage : '-'}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: w.healing > 0 ? '#10b981' : 'var(--text-400)' }}>
                        {w.healing > 0 ? avgHeal : '-'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={`badge badge-${isPositive ? 'healer' : 'tank'}`} style={{ display: 'inline-flex', padding: '4px 6px' }}>
                          {isPositive ? '+' : ''}{w.relativePct}% {w.compareLabel}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 800,
                            color: wr >= 60 ? '#10b981' : wr < 40 ? '#ef4444' : 'var(--cyan)'
                          }}
                        >
                          {wr}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
