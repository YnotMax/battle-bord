import { Suspense } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Battle, PlayerStat } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { HintIcon } from '@/components/HintIcon'

// ── Supabase (server) ─────────────────────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Page data collection might fail during build if not provided in environment.');
}

const sb = createClient(supabaseUrl, supabaseAnonKey)

// ── Data ──────────────────────────────────────────────────────────────────────
// Battle log (para exibição): limita a 50 mais recentes
async function getBattles(start?: string, end?: string): Promise<Battle[]> {
  let q = sb.from('battles').select('*').order('start_time', { ascending: false }).limit(50)
  
  if (start) q = q.gte('start_time', start)
  if (end) {
    const ed = new Date(end)
    ed.setHours(23, 59, 59, 999)
    q = q.lte('start_time', ed.toISOString())
  }
  
  const { data } = await q
  return data ?? []
}

// KPIs globais (sem limite para Win Rate e leaderboards serem precisos)
async function getAllBattles(start?: string, end?: string): Promise<Battle[]> {
  let q = sb.from('battles').select('*').order('start_time', { ascending: false })
  
  if (start) q = q.gte('start_time', start)
  if (end) {
    const ed = new Date(end)
    ed.setHours(23, 59, 59, 999)
    q = q.lte('start_time', ed.toISOString())
  }
  
  const { data } = await q
  return data ?? []
}

type AggPlayer = {
  name: string; roles: string[]
  damage: number; healing: number
  kills: number; deaths: number; battles: number
}

async function getPlayerAgg(start?: string, end?: string): Promise<AggPlayer[]> {
  let q = sb.from('player_stats')
    .select('player_name, role, damage_done, healing_done, kills, deaths, battles!inner(start_time)')
    
  if (start) q = q.gte('battles.start_time', start)
  if (end) {
    const ed = new Date(end)
    ed.setHours(23, 59, 59, 999)
    q = q.lte('battles.start_time', ed.toISOString())
  }

  const { data } = await q
  if (!data) return []
  
  const map: Record<string, {
    name: string; roleCounts: Record<string, number>;
    damage: number; healing: number; kills: number; deaths: number; battles: number
  }> = {}
  
  for (const r of data) {
    if (!map[r.player_name]) map[r.player_name] = { name: r.player_name, roleCounts: {}, damage: 0, healing: 0, kills: 0, deaths: 0, battles: 0 }
    map[r.player_name].damage   += r.damage_done
    map[r.player_name].healing  += r.healing_done
    map[r.player_name].kills    += r.kills
    map[r.player_name].deaths   += r.deaths
    map[r.player_name].battles  += 1
    
    // Contabiliza a classe jogada
    const roleKey = (r.role || 'dps').toLowerCase()
    map[r.player_name].roleCounts[roleKey] = (map[r.player_name].roleCounts[roleKey] || 0) + 1
  }
  
  return Object.values(map).map(p => {
    // Organiza as classes da que mais jogou para a que menos jogou
    const sortedRoles = Object.keys(p.roleCounts).sort((a, b) => p.roleCounts[b] - p.roleCounts[a])
    return {
      ...p,
      roles: sortedRoles.slice(0, 2) // Pega as 2 maiores
    }
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000    ? `${(n / 1_000).toFixed(0)}K`
  : String(n)

const ago = (iso: string) => {
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR }) }
  catch { return '–' }
}

const roleLabel = (r: string) => {
  const map: Record<string,string> = { healer: 'HEALER', tank: 'TANK', melee: 'MELEE', ranged: 'RANGED', support: 'SUPPORT' }
  return map[r?.toLowerCase()] ?? r?.toUpperCase() ?? '–'
}

const roleCss = (r: string) => {
  const m: Record<string,string> = { healer:'healer', tank:'tank', melee:'melee', ranged:'dps', support:'support' }
  return `badge badge-${m[r?.toLowerCase()] ?? 'dps'}`
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default async function DashboardPage(props: { searchParams?: Promise<{ start?: string, end?: string }> }) {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: 'var(--cyan)' }}>Iniciando Protocolos do Dashboard...</div>}>
      <DashboardContent {...props} />
    </Suspense>
  )
}

async function DashboardContent(props: { searchParams?: Promise<{ start?: string, end?: string }> }) {
  // Safe resolution for Next 14/15 
  const searchParams = props.searchParams ? await props.searchParams : {}
  const start = searchParams.start || ''
  const end = searchParams.end || ''

  // battles = log de exibição (50 últimas), allBattles = base completa para KPIs
  const [battles, allBattles, players] = await Promise.all([getBattles(start, end), getAllBattles(start, end), getPlayerAgg(start, end)])

  // Usa allBattles para KPIs precisos (não limitado a 50)
  const wins      = allBattles.filter(b => b.result === 'WIN').length
  const winRate   = allBattles.length ? Math.round((wins / allBattles.length) * 100) : 0
  const totalFame = allBattles.reduce((s, b) => s + (b.total_fame ?? 0), 0)
  const topDPS     = [...players].sort((a, b) => b.damage   - a.damage).slice(0, 25)
  const topHeal    = [...players].sort((a, b) => b.healing  - a.healing).slice(0, 25)
  const topKills   = [...players].sort((a, b) => b.kills    - a.kills).slice(0, 25)

  const winRateStroke = winRate >= 60 ? '#00ff9d' : winRate >= 40 ? '#ffcc00' : '#ff4d4d'
  const R = 38, CIRC = 2 * Math.PI * R
  const dash = CIRC * (winRate / 100)

  const medals = ['🥇', '🥈', '🥉', '4', '5']

  return (
    <>
      {/* ── TOP KPI BAR & FILTERS ────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 }}>
        <h1 className="section-hd" style={{ fontSize: 24, color: 'var(--text-900)' }}>DASHBOARD</h1>
        
        <form method="GET" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="glass" style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="label" style={{ fontSize: 10 }}>Start</span>
            <input name="start" type="date" defaultValue={start} style={{ background: 'transparent', border: 'none', color: 'var(--text-900)', outline: 'none', fontSize: 12, fontFamily: 'var(--font-mono)' }} />
          </div>
          <div className="glass" style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="label" style={{ fontSize: 10 }}>End</span>
            <input name="end" type="date" defaultValue={end} style={{ background: 'transparent', border: 'none', color: 'var(--text-900)', outline: 'none', fontSize: 12, fontFamily: 'var(--font-mono)' }} />
          </div>
          <button type="submit" className="glass" style={{
            padding: '6px 16px', background: 'rgba(0,255,157,0.1)', border: '1px solid var(--cyan-20)',
            color: 'var(--cyan)', fontWeight: 600, fontSize: 12, borderRadius: 6, cursor: 'pointer'
          }}>
            Filtrar Global
          </button>
          {(start || end) && (
            <a href="/" className="label" style={{ marginLeft: 6, fontSize: 11, textDecoration: 'none' }}>Limpar</a>
          )}
        </form>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: 10, marginBottom: 16,
      }}>
        {[
          { val: allBattles.length, lbl: 'Batalhas',    color: 'var(--cyan)'    },
          { val: `${winRate}%`,      lbl: 'Win Rate',    color: winRateStroke    },
          { val: fmt(totalFame),     lbl: 'Kill Fame',   color: 'var(--text-900)'},
          { val: wins,               lbl: 'Vitórias',    color: '#059669'        },
          { val: allBattles.length - wins, lbl: 'Derrotas', color: '#dc2626'   },
          { val: players.length,     lbl: 'Operadores',  color: 'var(--text-900)'},
        ].map((k, i) => (
          <div key={i} className="glass anim-up" style={{ padding: '12px 16px', animationDelay: `${i * 40}ms` }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, lineHeight: 1 }}>
              {k.val}
            </div>
            <div className="label" style={{ marginTop: 4 }}>{k.lbl}</div>
          </div>
        ))}
      </div>

      {/* ── MAIN GRID ─────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) 280px',
        gap: 16,
      }}>

        {/* ────── LEFT: Battle Log ──────────────────────── */}
        <div className="glass panel anim-up" style={{ animationDelay: '60ms' }}>
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--cyan)' }}>
                military_tech
              </span>
              <span className="section-hd">Operational Battle Log</span>
            </div>
            <div className="label">{battles.length > 0 ? `Última: ${ago(battles[0].start_time)}` : 'Sem dados'}</div>
          </div>

          <div className="panel-body scroll">
            {battles.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-400)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 36, display: 'block', marginBottom: 8 }}>
                  inventory_2
                </span>
                <div className="label">Nenhuma batalha registrada</div>
                <div style={{ fontSize: 12, color: 'var(--text-400)', marginTop: 6 }}>
                  Execute o crawler para importar dados
                </div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Resultado</th>
                    <th>Oponentes</th>
                    <th style={{ textAlign: 'right' }}>Kills</th>
                    <th style={{ textAlign: 'right' }}>Fame</th>
                    <th style={{ textAlign: 'right' }}>Ops</th>
                    <th>Tempo</th>
                  </tr>
                </thead>
                <tbody>
                  {battles.map((b, i) => (
                    <tr 
                      key={b.id} 
                      style={{ animationDelay: `${i * 20}ms` }}
                    >
                      <td>
                        <span className={`badge badge-${b.result === 'WIN' ? 'win' : 'loss'}`}>
                          {b.result}
                        </span>
                      </td>
                      <td style={{ maxWidth: 220 }}>
                        <a 
                          href={`https://albionbb.com/battles/${b.id}`} 
                          target="_blank" 
                          rel="noreferrer"
                          style={{
                            fontSize: 12, fontWeight: 600, color: 'var(--text-900)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6
                          }}
                        >
                          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            vs {b.opponents}
                          </span>
                          <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'var(--cyan)' }}>
                            open_in_new
                          </span>
                        </a>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: '#dc2626' }}>
                          {b.total_kills}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--text-700)' }}>
                          {fmt(b.total_fame)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-500)' }}>
                          {b.guild_players}
                        </span>
                      </td>
                      <td>
                        <span className="label-sm">{ago(b.start_time)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ────── RIGHT: Sidebar panels ─────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Win Rate Ring */}
          <div className="glass anim-up" style={{ padding: 20, animationDelay: '80ms' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--cyan)' }}>stars</span>
              <span className="section-hd">Performance Ratio</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              {/* Ring */}
              <div className="ring-root" style={{ flexShrink: 0 }}>
                <svg className="ring-svg" width="88" height="88" viewBox="0 0 88 88">
                  <circle cx="44" cy="44" r={R} fill="none" stroke="rgba(203,213,225,0.3)" strokeWidth="8"/>
                  <circle
                    cx="44" cy="44" r={R} fill="none"
                    stroke={winRateStroke} strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${CIRC - dash}`}
                    style={{ transition: 'stroke-dasharray 1s ease' }}
                  />
                </svg>
                <div className="ring-label">
                  <span style={{ fontSize: 18, fontWeight: 900, color: winRateStroke }}>{winRate}%</span>
                  <span className="label-sm" style={{ marginTop: 1 }}>win rate</span>
                </div>
              </div>
              {/* Breakdown */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="label">Vitórias</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#059669' }}>
                      {wins}
                    </span>
                  </div>
                  <div className="bar-track"><div className="bar-fill emerald" style={{ width: `${winRate}%` }}/></div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="label">Derrotas</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#dc2626' }}>
                      {battles.length - wins}
                    </span>
                  </div>
                  <div className="bar-track"><div className="bar-fill crimson" style={{ width: `${100 - winRate}%` }}/></div>
                </div>
                <div className="glow-divider" />
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--cyan)', letterSpacing: '0.12em' }}>
                  {battles.length} LUTAS REGISTRADAS
                </div>
              </div>
            </div>
          </div>

          {/* Top DPS */}
          <div className="glass anim-up" style={{ animationDelay: '100ms' }}>
            <div className="panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="dot dot-crimson" />
                <span className="section-hd">Top DPS</span>
                <HintIcon text="Soma do dano bruto em todas as lutas do período" pos="left" />
              </div>
              <span className="label">Dano Total</span>
            </div>
            <div className="scroll" style={{ maxHeight: 220, overflowY: 'auto' }}>
              {topDPS.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center' }}>
                  <span className="label">Sem dados — desative o RLS no Supabase</span>
                </div>
              ) : topDPS.map((p, i) => (
                <div key={p.name} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px',
                  borderBottom: i < topDPS.length - 1 ? '1px solid rgba(203,213,225,0.12)' : 'none',
                }}>
                  <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 }}>{medals[i] || `${i + 1}º`}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 700, color: 'var(--text-900)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {p.name}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4, alignItems: 'center' }}>
                      {p.roles.map(r => (
                        <span key={r} className={roleCss(r)} style={{ fontSize: 8 }}>{roleLabel(r)}</span>
                      ))}
                      <span className="label-sm">{p.battles}x</span>
                    </div>
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 800,
                    color: '#dc2626', flexShrink: 0,
                  }}>
                    {fmt(p.damage)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Healers */}
          <div className="glass anim-up" style={{ animationDelay: '120ms' }}>
            <div className="panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="dot dot-emerald" />
                <span className="section-hd">Top Healers</span>
                <HintIcon text="Soma da cura em todas as lutas do período" pos="left" />
              </div>
              <span className="label">Cura Total</span>
            </div>
            <div className="scroll" style={{ maxHeight: 220, overflowY: 'auto' }}>
              {topHeal.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center' }}>
                  <span className="label">Sem dados</span>
                </div>
              ) : topHeal.map((p, i) => (
                <div key={p.name} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px',
                  borderBottom: i < topHeal.length - 1 ? '1px solid rgba(203,213,225,0.12)' : 'none',
                }}>
                  <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 }}>{medals[i] || `${i + 1}º`}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 700, color: 'var(--text-900)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {p.name}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4, alignItems: 'center' }}>
                      {p.roles.map(r => (
                        <span key={r} className={roleCss(r)} style={{ fontSize: 8 }}>{roleLabel(r)}</span>
                      ))}
                      <span className="label-sm">{p.battles}x</span>
                    </div>
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 800,
                    color: '#059669', flexShrink: 0,
                  }}>
                    {fmt(p.healing)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Kills */}
          <div className="glass anim-up" style={{ animationDelay: '140ms' }}>
            <div className="panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="dot dot-amber" />
                <span className="section-hd">Top Kills</span>
                <HintIcon text="Soma de abates participados em todas as lutas do período" pos="left" />
              </div>
              <span className="label">Kills Totais</span>
            </div>
            <div className="scroll" style={{ maxHeight: 220, overflowY: 'auto' }}>
              {topKills.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center' }}>
                  <span className="label">Sem dados</span>
                </div>
              ) : topKills.map((p, i) => (
                <div key={p.name} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px',
                  borderBottom: i < topKills.length - 1 ? '1px solid rgba(203,213,225,0.12)' : 'none',
                }}>
                  <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 }}>{medals[i] || `${i + 1}º`}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 700, color: 'var(--text-900)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {p.name}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4, alignItems: 'center' }}>
                      {p.roles.map(r => (
                        <span key={r} className={roleCss(r)} style={{ fontSize: 8 }}>{roleLabel(r)}</span>
                      ))}
                      <span className="label-sm" data-tooltip="Participações em batalhas">{p.battles}x</span>
                      <span className="label-sm" style={{ paddingLeft: 4 }}>· {p.kills} kills / {p.deaths} deaths</span>
                    </div>
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 800,
                    color: 'var(--amber)', flexShrink: 0,
                  }}>
                    {p.kills}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── WIN RATE AO LONGO DO TEMPO ─────────────────── */}
      {allBattles.length >= 3 && (() => {
        // Agrupa batalhas em grupos de 5 e calcula WR de cada grupo
        const chunks: { label: string; wr: number; n: number }[] = []
        const chunkSize = Math.max(1, Math.floor(allBattles.length / 8))
        // allBattles está ordenado do mais recente → mais antigo, invertemos para o gráfico
        const ordered = [...allBattles].reverse()
        for (let i = 0; i < ordered.length; i += chunkSize) {
          const slice = ordered.slice(i, i + chunkSize)
          const w = slice.filter(b => b.result === 'WIN').length
          const firstDate = slice[0]?.start_time ? new Date(slice[0].start_time).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }) : ''
          const lastDate = slice[slice.length - 1]?.start_time ? new Date(slice[slice.length - 1].start_time).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }) : ''
          const dateLabel = firstDate === lastDate ? firstDate : `${firstDate} a ${lastDate}`
          chunks.push({
            label: dateLabel,
            wr: Math.round((w / slice.length) * 100),
            n: slice.length
          })
        }
        const maxWR = 100
        const W = 100, H = 50
        const pts = chunks.map((c, i) => {
          const x = chunks.length === 1 ? W / 2 : (i / (chunks.length - 1)) * W
          const y = H - (c.wr / maxWR) * H
          return { x, y, ...c }
        })
        const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
        const fillD = `M ${pts[0].x} ${H} ${pts.map(p => `L ${p.x} ${p.y}`).join(' ')} L ${pts[pts.length - 1].x} ${H} Z`
        return (
          <div className="glass anim-up" style={{ padding: 20, marginTop: 16, animationDelay: '160ms' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--cyan)' }}>trending_up</span>
                <span className="section-hd">Evolução do Win Rate</span>
                <HintIcon text="Da luta mais antiga (esq.) para a mais recente (dir.). Cada ponto agrupa um bloco de batalhas consecutivas." />
              </div>
              <span className="label" style={{ fontSize: 10 }} data-tooltip={`Média a cada ${chunkSize} lutas consecutivas`}>
                Blocos de {chunkSize}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, height: 90 }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-500)', fontFamily: 'var(--font-mono)', paddingBottom: 15, paddingTop: 4 }}>
                <span>100%</span>
                <span>50%</span>
                <span>0%</span>
              </div>
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                {/* Linhas de grid */}
                {[25, 50, 75].map(v => (
                  <line key={v} x1="0" y1={H - (v / 100) * H} x2={W} y2={H - (v / 100) * H}
                    stroke="rgba(203,213,225,0.1)" strokeWidth="0.5" strokeDasharray="2,2" />
                ))}
                {/* Linha de 50% */}
                <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="rgba(203,213,225,0.2)" strokeWidth="0.8" />
                {/* Área preenchida */}
                <path d={fillD} fill="rgba(0,255,157,0.08)" />
                {/* Linha */}
                <path d={pathD} fill="none" stroke="var(--cyan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                {/* Pontos */}
                {pts.map((p, i) => (
                  <g key={i} style={{ cursor: 'pointer' }}>
                    <title>{`${p.label} : ${p.wr}% (de ${p.n} lutas)`}</title>
                    {/* Hitbox maior invisível */}
                    <circle cx={p.x} cy={p.y} r="6" fill="transparent" />
                    {/* Ponto visível */}
                    <circle cx={p.x} cy={p.y} r="2.5" fill={p.wr >= 50 ? '#00ff9d' : '#ef4444'} stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" />
                    <text x={p.x} y={p.y - 5} textAnchor="middle" fontSize="4.5"
                      fill={p.wr >= 50 ? '#00ff9d' : '#ef4444'} fontWeight="700" fontFamily="monospace"
                      style={{ pointerEvents: 'none' }}>
                      {p.wr}%
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        )
      })()}

      {/* ── RESPONSIVE GRID OVERRIDE FOR MOBILE ──────────── */}
      <style>{`
        @media (max-width: 900px) {
          .pg-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
