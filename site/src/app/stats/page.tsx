'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const fmtNum = (n: number) => {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'b'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'm'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k'
  return Math.round(n).toLocaleString('pt-BR')
}

export default function StatsPage() {
  const [startDte, setStartDte] = useState('')
  const [endDte, setEndDte] = useState('')
  const [minPlayers, setMinPlayers] = useState('10')
  const [search, setSearch] = useState('')

  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState<any>({})
  const [players, setPlayers] = useState<any[]>([])

  const fetchStats = async () => {
    setLoading(true)

    // Using Supabase foreign table inner join to naturally filter
    let query = sb.from('player_stats').select(`
      player_name, role, damage_done, healing_done, average_ip, kills, deaths,
      battles!inner(id, start_time, guild_players, total_fame)
    `)

    if (minPlayers) query = query.gte('battles.guild_players', parseInt(minPlayers))
    if (startDte) query = query.gte('battles.start_time', new Date(startDte).toISOString())
    if (endDte) {
      const ed = new Date(endDte)
      ed.setHours(23, 59, 59, 999)
      query = query.lte('battles.start_time', ed.toISOString())
    }

    // We allow max 5000 rows limit to ensure we get large datasets (default is 1000)
    query = query.limit(10000)

    const { data: pData, error } = await query

    if (error || !pData) {
      console.error(error)
      setKpis({})
      setPlayers([])
      setLoading(false)
      return
    }

    const battlesMap = new Map()
    const pMap = new Map()
    let totKills = 0, totDeaths = 0, totDmg = 0, totHeal = 0
    let ipSum = 0, ipCount = 0

    pData.forEach((row: any) => {
      const b = row.battles
      if (!battlesMap.has(b.id)) {
        battlesMap.set(b.id, b)
      }

      totKills += row.kills
      totDeaths += row.deaths
      totDmg += row.damage_done
      totHeal += row.healing_done
      if (row.average_ip > 0) {
        ipSum += row.average_ip
        ipCount++
      }

      const pName = row.player_name
      if (!pMap.has(pName)) {
        pMap.set(pName, {
          name: pName,
          attend: 0, kills: 0, deaths: 0,
          ipSumP: 0, ipCountP: 0,
          dmg: 0, heal: 0,
          roles: { tank: 0, support: 0, healer: 0, melee: 0, range: 0 }
        })
      }

      const p = pMap.get(pName)
      p.attend++
      p.kills += row.kills
      p.deaths += row.deaths
      p.dmg += row.damage_done
      p.heal += row.healing_done
      if (row.average_ip > 0) {
        p.ipSumP += row.average_ip
        p.ipCountP++
      }

      const r = (row.role || 'dps').toLowerCase()
      if (r === 'tank') p.roles.tank++
      else if (r === 'support') p.roles.support++
      else if (r === 'healer') p.roles.healer++
      else if (r === 'melee') p.roles.melee++
      else p.roles.range++ // fallback to range/dps
    })

    let totGuildPlayers = 0
    let totKFame = 0
    battlesMap.forEach(b => {
      totGuildPlayers += (b.guild_players || 0)
      totKFame += (b.total_fame || 0)
    })
    const bCount = battlesMap.size
    const avgAttend = bCount > 0 ? Math.round(totGuildPlayers / bCount) : 0
    const overallAvgIp = ipCount > 0 ? Math.round(ipSum / ipCount) : 0

    setKpis({
      kills: totKills,
      deaths: totDeaths,
      damage: totDmg,
      heal: totHeal,
      avgAttend,
      avgIp: overallAvgIp,
      kFame: totKFame,
    })

    const playersArray = Array.from(pMap.values()).map(p => ({
      ...p,
      avgIp: p.ipCountP > 0 ? Math.round(p.ipSumP / p.ipCountP) : 0
    })).sort((a, b) => b.attend - a.attend)

    setPlayers(playersArray)
    setLoading(false)
  }

  // Load once
  useEffect(() => {
    fetchStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Derived filtered players based on search string
  const filteredPlayers = players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 className="section-hd" style={{ fontSize: 24, color: 'var(--text-900)' }}>STATS</h1>
        </div>

        {/* Filters Top Bar */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div className="glass" style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="label" style={{ fontSize: 10 }}>Start</span>
            <input type="date" value={startDte} onChange={e => setStartDte(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-900)', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: 12 }} />
          </div>
          <div className="glass" style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="label" style={{ fontSize: 10 }}>End</span>
            <input type="date" value={endDte} onChange={e => setEndDte(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-900)', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: 12 }} />
          </div>
          <div className="glass" style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="label" style={{ fontSize: 10 }}>Min. players</span>
            <input type="number" value={minPlayers} onChange={e => setMinPlayers(e.target.value)} min={1}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-900)', width: 40, outline: 'none', fontFamily: 'var(--font-mono)', fontSize: 12, textAlign: 'center' }} />
          </div>
          <button onClick={fetchStats} className="glass" style={{
            padding: '6px 16px', cursor: 'pointer', background: 'rgba(0,255,157,0.1)', border: '1px solid var(--cyan-20)',
            color: 'var(--cyan)', fontWeight: 600, fontSize: 12, borderRadius: 6
          }}>
            Filter
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-500)', fontFamily: 'var(--font-mono)' }}>Processando e filtrando dados...</div>
      ) : (
        <>
          {/* ── KPI CARDS ──────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
            <KPICard title="TOTAL KILLS" value={fmtNum(kpis.kills)} color="#ff4d4d" />
            <KPICard title="TOTAL DEATHS" value={fmtNum(kpis.deaths)} color="#ff4d88" />
            <KPICard title="TOTAL DAMAGE" value={fmtNum(kpis.damage)} color="#c084fc" />
            <KPICard title="TOTAL HEAL" value={fmtNum(kpis.heal)} color="#00ff9d" />
            <KPICard title="AVERAGE ATTENDANCE" value={kpis.avgAttend.toString()} color="#3b82f6" />
            <KPICard title="AVERAGE IP" value={kpis.avgIp.toString()} color="var(--text-400)" />
            <KPICard title="TOTAL KILL FAME" value={fmtNum(kpis.kFame)} color="#f59e0b" />
          </div>

          {/* ── PLAYERS TABLE ──────────────────────────────── */}
          <div className="glass panel anim-up">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div className="section-hd">PLAYERS ({filteredPlayers.length})</div>
              
              <div style={{ display: 'flex', gap: 10 }}>
                <div className="glass" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 100 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--text-500)' }}>search</span>
                  <input type="text" placeholder="Search player..." value={search} onChange={e => setSearch(e.target.value)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-900)', outline: 'none', fontSize: 12 }} />
                </div>
              </div>
            </div>

            <div className="panel-body scroll" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <table className="data-table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ width: 30 }}>N.</th>
                    <th>NAME</th>
                    <th style={{ textAlign: 'right' }}>ATTEND.</th>
                    <th style={{ textAlign: 'right' }}>KILLS</th>
                    <th style={{ textAlign: 'right' }}>DEATHS</th>
                    <th style={{ textAlign: 'right' }}>AVG IP</th>
                    <th style={{ textAlign: 'right' }}>DMG</th>
                    <th style={{ textAlign: 'right' }}>HEAL</th>
                    {/* Roles Columns */}
                    <th style={{ textAlign: 'center', width: 28, color: '#3b82f6' }} title="Tank">🛡️</th>
                    <th style={{ textAlign: 'center', width: 28, color: '#f59e0b' }} title="Support">🚩</th>
                    <th style={{ textAlign: 'center', width: 28, color: '#10b981' }} title="Healer">➕</th>
                    <th style={{ textAlign: 'center', width: 28, color: '#ef4444' }} title="Melee">⚔️</th>
                    <th style={{ textAlign: 'center', width: 28, color: '#f97316' }} title="Range">🏹</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.map((p, i) => (
                    <tr key={p.name}>
                      <td style={{ color: 'var(--text-500)' }}>{i + 1}.</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-900)' }}>{p.name}</td>
                      <td style={{ textAlign: 'right', color: '#3b82f6', fontWeight: 700 }}>{p.attend}</td>
                      <td style={{ textAlign: 'right', color: '#ef4444' }}>{p.kills}</td>
                      <td style={{ textAlign: 'right', color: '#ff4d88' }}>{p.deaths}</td>
                      <td style={{ textAlign: 'right', color: 'var(--text-500)' }}>{p.avgIp}</td>
                      <td style={{ textAlign: 'right', color: '#c084fc' }}>{fmtNum(p.dmg)}</td>
                      <td style={{ textAlign: 'right', color: '#10b981' }}>
                        {p.heal > 0 ? fmtNum(p.heal) : <span style={{ opacity: 0.3 }}>0</span>}
                      </td>
                      {/* Roles */}
                      <td style={{ textAlign: 'center' }}>{p.roles.tank > 0 ? p.roles.tank : ''}</td>
                      <td style={{ textAlign: 'center' }}>{p.roles.support > 0 ? p.roles.support : ''}</td>
                      <td style={{ textAlign: 'center' }}>{p.roles.healer > 0 ? p.roles.healer : ''}</td>
                      <td style={{ textAlign: 'center' }}>{p.roles.melee > 0 ? p.roles.melee : ''}</td>
                      <td style={{ textAlign: 'center' }}>{p.roles.range > 0 ? p.roles.range : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function KPICard({ title, value, color }: { title: string, value: string, color: string }) {
  return (
    <div className="glass anim-up" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6, borderTop: `2px solid ${color}40` }}>
      <div className="label" style={{ fontSize: 9 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 500, color: color, letterSpacing: '-0.02em' }}>
        {value}
      </div>
    </div>
  )
}
