'use client'

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from 'recharts'
import { WeaponIcon } from './WeaponIcon'
import { HintIcon } from './HintIcon'

export type KillEventItem = {
  event_id: number
  battle_id: number
  timestamp: string
  victim_name: string
  victim_guild: string
  killer_name: string
  killer_guild: string
  killer_weapon: string
  killer_weapon_norm: string
  total_participants: number
  seconds_into_battle: number | null
  is_early_death: boolean
}

type BattleSummary = {
  id: string
  startTime: string
  opponents: string
  result: string
}

type Props = {
  allBattles: BattleSummary[]
  killEvents: KillEventItem[]
  playerName?: string
}

const GUILD_NAME = 'I M O R T A I S'

export function BattleTimeline({ allBattles, killEvents, playerName }: Props) {
  const [selectedBattleId, setSelectedBattleId] = useState<string>('all')
  const isPlayerMode = !!playerName

  // Filtra eventos pelo escopo selecionado (todas as lutas ou batalha específica)
  const filteredEvents = selectedBattleId === 'all'
    ? killEvents
    : killEvents.filter(e => String(e.battle_id) === selectedBattleId)

  // Separa baixas e abates dependendo do modo (Individual vs Guilda)
  const effectiveDeaths = isPlayerMode
    ? filteredEvents.filter(e => (e.victim_name || '').trim().toLowerCase() === playerName.toLowerCase())
    : filteredEvents.filter(e => (e.victim_guild || '').trim().toLowerCase() === GUILD_NAME.toLowerCase() || (!e.victim_guild && !e.killer_guild))
  
  const effectiveKills = isPlayerMode
    ? filteredEvents.filter(e => (e.killer_name || '').trim().toLowerCase() === playerName.toLowerCase())
    : filteredEvents.filter(e => (e.killer_guild || '').trim().toLowerCase() === GUILD_NAME.toLowerCase())

  // ─── Agrupamento por 4 Fases Táticas do Albion ZvZ ───────────────────────────
  // Fase 1: 0s - 30s   (1º Engage / Abertura — Todos com defensivas & poções)
  // ─── 5 FASES TÁTICAS DE UMA ZVZ REAL (0 a 30+ minutos) ───────────────────
  // Fase 1: 0 - 2 min   (0s - 120s)   → 1º Choque / Abertura (Poções e defensivas cheias)
  // Fase 2: 2 - 5 min   (121s - 300s) → Primeiros Resets & Trocação inicial de Cooldowns
  // Fase 3: 5 - 12 min  (301s - 720s) → Batalha Sustentada (Meio de Jogo, Chokepoints e Peel)
  // Fase 4: 12 - 20 min (721s - 1200s)→ Guerra de Desgaste (Exaustão de consumíveis e Re-engages)
  // Fase 5: 20 - 30m+   (1201s+)      → Fase Tardia & Clean-up Final (Wipe da zerg adversária)

  const phases = [
    {
      id: 'p1',
      name: '0-2 min (1º Choque)',
      short: '0-2m',
      desc: isPlayerMode ? 'Abertura: 1º engage, defensivas e poções 100% disponíveis' : 'Abertura da luta: primeiro choque de zergs com defensivas 100% cheias',
      deaths: effectiveDeaths.filter(e => (e.seconds_into_battle ?? 0) <= 120).length,
      kills: effectiveKills.filter(e => (e.seconds_into_battle ?? 0) <= 120).length,
    },
    {
      id: 'p2',
      name: '2-5 min (Primeiros Resets)',
      short: '2-5m',
      desc: isPlayerMode ? 'Primeiros resets: habilidades principais em recarga, reposicione-se' : 'Trocação inicial: cooldowns principais em recarga e primeiros chamados de reset',
      deaths: effectiveDeaths.filter(e => {
        const s = e.seconds_into_battle ?? 0
        return s > 120 && s <= 300
      }).length,
      kills: effectiveKills.filter(e => {
        const s = e.seconds_into_battle ?? 0
        return s > 120 && s <= 300
      }).length,
    },
    {
      id: 'p3',
      name: '5-12 min (Batalha Sustentada)',
      short: '5-12m',
      desc: isPlayerMode ? 'Meio de jogo: disputa de chokes/terris, sustentação de Healers e peel de Tanks' : 'Meio de luta: guerra posicional contínua, disputas de chokepoint e sustentação',
      deaths: effectiveDeaths.filter(e => {
        const s = e.seconds_into_battle ?? 0
        return s > 300 && s <= 720
      }).length,
      kills: effectiveKills.filter(e => {
        const s = e.seconds_into_battle ?? 0
        return s > 300 && s <= 720
      }).length,
    },
    {
      id: 'p4',
      name: '12-20 min (Guerra de Desgaste)',
      short: '12-20m',
      desc: isPlayerMode ? 'Desgaste prolongado: exaustão de consumíveis e chegada de reforços' : 'Guerra prolongada: exaustão de poções/comidas, regears e re-engages profundos',
      deaths: effectiveDeaths.filter(e => {
        const s = e.seconds_into_battle ?? 0
        return s > 720 && s <= 1200
      }).length,
      kills: effectiveKills.filter(e => {
        const s = e.seconds_into_battle ?? 0
        return s > 720 && s <= 1200
      }).length,
    },
    {
      id: 'p5',
      name: '20-30 min+ (Finalização / Wipe)',
      short: '20m+',
      desc: isPlayerMode ? 'Fase tardia (30m+): colapso da zerg inimiga, perseguição e clean-up final' : 'Fase tardia (30m+): exaustão extrema da zerg adversária, perseguição e wipe conclusivo',
      deaths: effectiveDeaths.filter(e => (e.seconds_into_battle ?? 0) > 1200).length,
      kills: effectiveKills.filter(e => (e.seconds_into_battle ?? 0) > 1200).length,
    }
  ]

  const totalDeathsCount = effectiveDeaths.length
  const totalKillsCount = effectiveKills.length
  const earlyDeathsCount = phases[0].deaths
  const earlyDeathsPct = totalDeathsCount > 0 ? Math.round((earlyDeathsCount / totalDeathsCount) * 100) : 0
  const resetDeathsCount = phases[1].deaths
  const resetDeathsPct = totalDeathsCount > 0 ? Math.round((resetDeathsCount / totalDeathsCount) * 100) : 0
  const lateKillsCount = phases[3].kills + phases[4].kills

  // ─── Diagnóstico Tático Inteligente ─────────────────────────────────────────
  let tacticalAdvice = isPlayerMode ? {
    title: 'Engajamento Pessoal Equilibrado',
    text: 'Seus momentos de abate e sobrevivência estão distribuídos de forma consistente ao longo das fases da ZvZ.',
    type: 'normal',
    icon: 'analytics',
    color: 'var(--cyan)'
  } : {
    title: 'Monitoramento de Engajamento Equilibrado',
    text: 'A distribuição de baixas e abates está dentro dos padrões esperados de ZvZ sustentada.',
    type: 'normal',
    icon: 'analytics',
    color: 'var(--cyan)'
  }

  if (isPlayerMode) {
    if (totalDeathsCount >= 2 && earlyDeathsPct >= 40) {
      tacticalAdvice = {
        title: '⚠️ Morte Precoce: Cuidado no 1º Choque (0-2 min)',
        text: `${earlyDeathsPct}% das suas mortes acontecem logo na abertura do combate (0-2 min). Nesse momento você ainda tem poções e defensivas cheias — use poção de resistência antes do choque e mantenha-se alinhado à main zerg.`,
        type: 'danger',
        icon: 'warning',
        color: '#ef4444'
      }
    } else if (totalDeathsCount >= 2 && resetDeathsPct >= 35) {
      tacticalAdvice = {
        title: '⚠️ Vulnerabilidade no Reset (2-5 min)',
        text: `${resetDeathsPct}% das suas mortes ocorrem durante os primeiros resets (2-5 min). Após a primeira rotação de skills, recue imediatamente e aguarde o chamado do caller.`,
        type: 'warning',
        icon: 'hourglass_empty',
        color: '#f97316'
      }
    } else if (phases[0].kills > 0 && phases[0].kills >= (phases[3].kills + phases[4].kills)) {
      tacticalAdvice = {
        title: '⚡ Abertura Letal: Impacto no 1º Choque (0-2 min)',
        text: `Você é especialmente letal nos primeiros minutos de combate, aproveitando o choque inicial para garantir abates rápidos na entrada.`,
        type: 'success',
        icon: 'bolt',
        color: '#10b981'
      }
    } else if (lateKillsCount > 0 && lateKillsCount >= phases[0].kills) {
      tacticalAdvice = {
        title: '🏹 Especialista em Lutas Longas & Clean-up (12-30m+)',
        text: `Você tem excelente sobrevivência em lutas prolongadas de meia hora e garante grande parte dos seus abates na perseguição final e desgaste tardio.`,
        type: 'success',
        icon: 'military_tech',
        color: '#10b981'
      }
    }
  } else {
    if (totalDeathsCount >= 3) {
      if (earlyDeathsPct >= 40) {
        tacticalAdvice = {
          title: '⚠️ Alerta de Abertura: Baixas no 1º Choque (0-2 min)',
          text: `${earlyDeathsPct}% de todas as baixas da guilda ocorrem nos primeiros 2 minutos de luta. Nesse momento, todos os operadores têm 100% das poções, defensivas e botas. Isso indica economia de defensivas ou entrada descoordenada no primeiro clap.`,
          type: 'danger',
          icon: 'warning',
          color: '#ef4444'
        }
      } else if (resetDeathsPct >= 35) {
        tacticalAdvice = {
          title: '⚠️ Alerta de Reset: Baixas nos Primeiros Cooldowns (2-5 min)',
          text: `${resetDeathsPct}% das baixas ocorrem entre 2 e 5 minutos. A guilda sobrevive ao primeiro clap, mas não recua de forma coordenada durante o cooldown das poções/habilidades. Treine a chamada de "RESET e ESPALHAR" após o primeiro choque.`,
          type: 'warning',
          icon: 'hourglass_empty',
          color: '#f97316'
        }
      } else if (phases[0].kills > phases[0].deaths && phases[0].kills >= 3) {
        tacticalAdvice = {
          title: '⚡ Abertura Letal: Vantagem no 1º Engage (0-2 min)',
          text: `A guilda tem forte impacto na entrada, conseguindo abater mais alvos na abertura do que sofrer baixas. O ponto de atenção é manter essa vantagem sem se overextender nas fases seguintes.`,
          type: 'success',
          icon: 'military_tech',
          color: '#10b981'
        }
      }
    }
  }

  // ─── Armas mais fatais no período ───────────────────────────────────────────
  const weaponFatalMap: Record<string, { count: number; raw: string }> = {}
  effectiveDeaths.forEach(d => {
    const norm = d.killer_weapon_norm || 'Desconhecida'
    if (!weaponFatalMap[norm]) weaponFatalMap[norm] = { count: 0, raw: d.killer_weapon || '' }
    weaponFatalMap[norm].count++
  })
  const topFatalWeapons = Object.entries(weaponFatalMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 4)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Barra de Controle de Escopo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-500)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Escopo da Análise:
          </span>
          <select
            value={selectedBattleId}
            onChange={e => setSelectedBattleId(e.target.value)}
            style={{
              padding: '7px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-hi)',
              border: '1px solid var(--border-lo)',
              color: 'var(--text-900)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
              fontFamily: 'var(--font-display)',
              boxShadow: 'var(--shadow-sm)',
              maxWidth: '100%',
              textOverflow: 'ellipsis'
            }}
          >
            <option value="all">Todas as Batalhas do Período ({killEvents.length} eventos registrados)</option>
            {allBattles.map(b => (
              <option key={b.id} value={b.id}>
                Batalha #{b.id} vs {b.opponents} ({b.result}) — {b.startTime.slice(0, 10)}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="badge badge-loss" style={{ fontSize: 10, padding: '3px 8px' }}>
            Baixas Analisadas: {totalDeathsCount}
          </div>
          {totalKillsCount > 0 && (
            <div className="badge badge-win" style={{ fontSize: 10, padding: '3px 8px' }}>
              Abates Feitos: {totalKillsCount}
            </div>
          )}
        </div>
      </div>

      {/* Card de Diagnóstico do Coach de Guilda */}
      <div style={{
        padding: '16px 20px',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--surface-hi)',
        border: '1px solid var(--border-lo)',
        borderLeft: `4px solid ${tacticalAdvice.color}`,
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 28, color: tacticalAdvice.color, marginTop: 2 }}>
          {tacticalAdvice.icon}
        </span>
        <div style={{ flexGrow: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: tacticalAdvice.color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {tacticalAdvice.title}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-700)', marginTop: 4, lineHeight: 1.5, fontWeight: 500 }}>
            {tacticalAdvice.text}
          </div>
        </div>
      </div>

      {/* Grid Principal: Gráfico de Fases de Combate + KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 16 }}>
        {/* Gráfico de Barras Comparativo */}
        <div className="glass" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="section-hd" style={{ fontSize: 12, color: 'var(--text-900)' }}>
                {isPlayerMode ? 'Fases de Combate: Em que momento você morre vs mata?' : 'Fases de Combate: Em que momento a guilda morre vs mata?'}
              </span>
              <HintIcon text={isPlayerMode ? "Compara suas mortes sofridas (vermelho) contra abates realizados por você (verde) em cada fase do combate ZvZ." : "Compara o volume de mortes sofridas (vermelho) contra abates realizados (verde) em cada fase do combate ZvZ."} />
            </div>
          </div>

          <div style={{ height: 220, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={phases} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(203,213,225,0.2)" />
                <XAxis dataKey="short" stroke="var(--text-400)" fontSize={11} fontWeight={700} />
                <YAxis stroke="var(--text-400)" fontSize={10} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', padding: '10px 14px', borderRadius: 6, fontSize: 11, boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
                          <div style={{ fontWeight: 800, color: '#f8fafc', marginBottom: 4, fontSize: 12 }}>{data.name}</div>
                          <div style={{ color: '#94a3b8', fontSize: 10, marginBottom: 8 }}>{data.desc}</div>
                          <div style={{ color: '#ff4d4d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>💀 {isPlayerMode ? 'Suas Mortes' : 'Baixas da Guilda'}:</span> <strong>{data.deaths}</strong>
                          </div>
                          <div style={{ color: '#00ff9d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                            <span>⚔️ {isPlayerMode ? 'Seus Abates' : 'Abates Realizados'}:</span> <strong>{data.kills}</strong>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 6 }}
                  formatter={value => (value === 'deaths' ? (isPlayerMode ? 'Suas Mortes' : 'Baixas da Guilda (Mortes)') : (isPlayerMode ? 'Seus Abates' : 'Abates Feitos (Kills)'))}
                />
                <Bar dataKey="deaths" fill="#ff4d4d" radius={[4, 4, 0, 0]} name="deaths" />
                <Bar dataKey="kills" fill="#00ff9d" radius={[4, 4, 0, 0]} name="kills" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Painel Tático das 4 Fases com Indicadores de Eficiência */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {phases.map((p) => {
            const pct = totalDeathsCount > 0 ? Math.round((p.deaths / totalDeathsCount) * 100) : 0
            const isDanger = pct >= 40 && totalDeathsCount >= 2
            return (
              <div
                key={p.id}
                className="glass"
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderLeft: isDanger ? '3px solid #ff4d4d' : '3px solid var(--border-lo)',
                  background: isDanger ? 'rgba(255, 77, 77, 0.04)' : 'var(--surface)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-900)' }}>{p.name}</span>
                    {isDanger && (
                      <span className="badge badge-loss" style={{ fontSize: 8, padding: '1px 5px' }}>
                        PICO DE BAIXAS
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-400)', marginTop: 2 }}>{p.desc}</div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: isDanger ? '#dc2626' : 'var(--text-900)' }}>
                    {p.deaths} mortes <span style={{ fontSize: 11, color: 'var(--text-400)' }}>({pct}%)</span>
                  </div>
                  {p.kills > 0 && (
                    <div style={{ fontSize: 10, color: '#059669', fontWeight: 700 }}>
                      +{p.kills} abates
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Armas Inimigas Mais Fatais no Período */}
      {topFatalWeapons.length > 0 && (
        <div className="glass" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#ff4d4d' }}>gavel</span>
            <span className="section-hd" style={{ fontSize: 11, color: 'var(--text-700)' }}>
              {isPlayerMode ? 'Top Armas Inimigas que Mais Te Abateram' : 'Top Armas Inimigas que Mais Abateram Nossos Jogadores no Período'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {topFatalWeapons.map(([norm, data]) => {
              const weaponFormatted = norm.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
              const pct = totalDeathsCount > 0 ? Math.round((data.count / totalDeathsCount) * 100) : 0
              return (
                <div
                  key={norm}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    background: 'var(--surface-hi)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-lo)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <WeaponIcon rawWeapon={data.raw} size={36} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-900)' }}>{weaponFormatted}</div>
                    <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 700, marginTop: 2 }}>
                      {data.count} baixas ({pct}%)
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
