'use client'

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { WeaponIcon } from './WeaponIcon'

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

type Props = {
  battleId: string
  startTime: string
  opponents: string
  result: string
  killEvents: KillEventItem[]
}

// Taxonomia para diagnóstico rápido no frontend
const BOMB_WEAPONS = [
  'RIFTGLAIVE', 'GLAIVE', 'HELLFIRE', 'BLOODLETTER',
  'WAILING_BOW', '2H_FIREBOMBSTAFF', 'MAIN_HALLOWFALL',
  'MAIN_GLACIALSTAFF', 'SOULSCYTHE', 'CAMLANN', 'GROVEKEEPER'
]

const ZERG_CLAP_WEAPONS = [
  '2H_DUALSCIMITAR', 'GALATINE', 'KINGMAKER',
  '2H_ARCANESTAFF', '2H_FIRESTAFF', '2H_HOLYSTAFF',
  '2H_CURSEDSTAFF', 'MAIN_SPEAR'
]

export function BattleTimeline({ battleId, startTime, opponents, result, killEvents }: Props) {
  if (!killEvents || killEvents.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-400)', fontStyle: 'italic' }}>
        Nenhum evento de morte detalhado gravado para esta batalha ainda. Execute o script <code>Buscar_Kill_Events.bat</code> para importar.
      </div>
    )
  }

  // Ordena por segundos
  const sortedEvents = [...killEvents].sort((a, b) => (a.seconds_into_battle ?? 0) - (b.seconds_into_battle ?? 0))
  const maxSeconds = Math.max(...sortedEvents.map(e => e.seconds_into_battle ?? 0), 60)

  // Agrupa mortes em buckets de 5 segundos e acumula
  const step = 5
  const chartData: { second: number; timeLabel: string; deaths: number; cumulative: number; burst: number }[] = []
  let cumulative = 0

  for (let s = 0; s <= maxSeconds + step; s += step) {
    const deathsInBucket = sortedEvents.filter(e => {
      const sec = e.seconds_into_battle ?? 0
      return sec >= s && sec < s + step
    }).length

    cumulative += deathsInBucket

    const mm = Math.floor(s / 60)
    const ss = String(s % 60).padStart(2, '0')

    chartData.push({
      second: s,
      timeLabel: `${mm}:${ss}`,
      deaths: deathsInBucket,
      cumulative,
      burst: deathsInBucket
    })
  }

  // Detecta o maior pico de mortes (Clap ou Bomb)
  let maxBurst = 0
  let burstSecond = 0
  chartData.forEach(d => {
    if (d.burst > maxBurst) {
      maxBurst = d.burst
      burstSecond = d.second
    }
  })

  // Analisa as armas do pico
  const peakEvents = sortedEvents.filter(e => {
    const sec = e.seconds_into_battle ?? 0
    return sec >= burstSecond - 5 && sec <= burstSecond + 10
  })
  const peakWeapons = peakEvents.map(e => (e.killer_weapon_norm || '').toUpperCase())
  const bombCount = peakWeapons.filter(w => BOMB_WEAPONS.some(b => w.includes(b))).length
  const clapCount = peakWeapons.filter(w => ZERG_CLAP_WEAPONS.some(z => w.includes(z))).length

  const isMajorClap = maxBurst >= 4
  const eventType = bombCount > clapCount ? 'BOMB SQUAD' : 'ZERG CLAP'
  const eventColor = bombCount > clapCount ? '#f97316' : '#ef4444'

  // Estatísticas gerais da luta
  const earlyDeaths = sortedEvents.filter(e => e.is_early_death).length
  const earlyPct = Math.round((earlyDeaths / sortedEvents.length) * 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Diagnóstico do Engaje */}
      {isMajorClap && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm)',
          background: `rgba(${bombCount > clapCount ? '249, 115, 22' : '239, 68, 68'}, 0.08)`,
          border: `1px solid ${eventColor}`,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 28, color: eventColor }}>
            {bombCount > clapCount ? 'explosion' : 'thunderstorm'}
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: eventColor, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Pico Crítico Detectado: {eventType} ({maxBurst} mortes em 5s aos {Math.floor(burstSecond/60)}:{String(burstSecond%60).padStart(2,'0')})
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-400)', marginTop: 2 }}>
              {bombCount > clapCount
                ? 'Armas de execução/bomb identificadas no choque. O time foi flanqueado por esquadrão rápido.'
                : 'Armas pesadas de choque frontal identificadas. A Zerg inimiga engajou em clump antes da nossa resposta.'}
            </div>
          </div>
        </div>
      )}

      {/* Mini KPIs de Tempo de Morte */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
        <div className="glass" style={{ padding: '10px 12px' }}>
          <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-400)', textTransform: 'uppercase' }}>Total de Baixas</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#ef4444' }}>{sortedEvents.length}</div>
        </div>
        <div className="glass" style={{ padding: '10px 12px' }}>
          <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-400)', textTransform: 'uppercase' }}>Mortes Precoces (&le;60s)</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: earlyPct >= 30 ? '#ef4444' : '#10b981' }}>
            {earlyDeaths} <span style={{ fontSize: 11, fontWeight: 600 }}>({earlyPct}%)</span>
          </div>
        </div>
        <div className="glass" style={{ padding: '10px 12px' }}>
          <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-400)', textTransform: 'uppercase' }}>Momento do Maior Wipe</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-900)' }}>
            {Math.floor(burstSecond/60)}:{String(burstSecond%60).padStart(2,'0')}
          </div>
        </div>
      </div>

      {/* Gráfico da Linha do Tempo */}
      <div style={{ height: 220, width: '100%', marginTop: 8 }}>
        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-400)', marginBottom: 6, textTransform: 'uppercase' }}>
          Curva Cumulativa de Baixas da Guilda (Tempo de Luta)
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="deathGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="timeLabel" stroke="var(--text-400)" fontSize={10} />
            <YAxis stroke="var(--text-400)" fontSize={10} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <div style={{ background: '#0f172a', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: 4, fontSize: 11 }}>
                      <div style={{ color: 'var(--text-400)' }}>Tempo: {data.timeLabel}</div>
                      <div style={{ color: '#ef4444', fontWeight: 700 }}>Total acumulado: {data.cumulative} mortes</div>
                      {data.burst > 0 && <div style={{ color: '#f97316' }}>Neste intervalo: +{data.burst}</div>}
                    </div>
                  )
                }
                return null
              }}
            />
            {isMajorClap && (
              <ReferenceLine x={`${Math.floor(burstSecond/60)}:${String(burstSecond%60).padStart(2,'0')}`} stroke={eventColor} strokeDasharray="3 3" />
            )}
            <Area type="monotone" dataKey="cumulative" stroke="#ef4444" strokeWidth={2} fill="url(#deathGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Log de Abates Recentes com Arma do Killer */}
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-400)', textTransform: 'uppercase', marginBottom: 6 }}>
          Registro Cronológico de Abates ({sortedEvents.length})
        </div>
        <div className="scroll" style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sortedEvents.map((e, idx) => {
            const sec = e.seconds_into_battle ?? 0
            const mm = Math.floor(sec / 60)
            const ss = String(sec % 60).padStart(2, '0')
            return (
              <div
                key={e.event_id || idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: e.is_early_death ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                  border: e.is_early_death ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border)',
                  fontSize: 11
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: e.is_early_death ? '#ef4444' : 'var(--text-400)', fontWeight: 700 }}>
                    {mm}:{ss}
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--text-900)' }}>{e.victim_name}</span>
                  {e.is_early_death && (
                    <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 2, background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontWeight: 700 }}>
                      PRECOCE
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--text-400)', fontSize: 10 }}>abatido por</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-700)' }}>{e.killer_name || 'Desconhecido'}</span>
                  {e.killer_weapon && <WeaponIcon weapon={e.killer_weapon} size={18} />}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
