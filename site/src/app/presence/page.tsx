import { createClient } from '@supabase/supabase-js'

export const revalidate = 0 // Disable cache for accurate realtime presence

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getAttendanceData() {
  // get recent battles for sparkline
  const { data: allBattles } = await sb.from('battles').select('id, start_time').order('start_time', { ascending: false })
  const totalBattles = allBattles?.length || 0
  const recentBattles = allBattles ? allBattles.slice(0, 10).reverse() : [] // Last 10 from oldest to newest

  // get player stats mapped
  const { data: stats } = await sb.from('player_stats').select('player_name, role, battle_id')
  
  if (!stats) return { totalBattles: 0, players: [] }

  const map: Record<string, { name: string, battles: number, roles: Record<string, number>, attendedIds: Set<string> }> = {}
  
  for (const s of stats) {
    if (!map[s.player_name]) {
      map[s.player_name] = { name: s.player_name, battles: 0, roles: {}, attendedIds: new Set() }
    }
    map[s.player_name].battles += 1
    map[s.player_name].attendedIds.add(String(s.battle_id))
    const r = (s.role || 'dps').toLowerCase()
    map[s.player_name].roles[r] = (map[s.player_name].roles[r] || 0) + 1
  }

  const players = Object.values(map).map(p => {
    // find top 2 main roles
    const rolesSorted = Object.entries(p.roles).sort((a, b) => b[1] - a[1])
    const mainRoles = rolesSorted.slice(0, 2).map(r => r[0])
    
    const attendancePercent = totalBattles > 0 ? Math.round((p.battles / totalBattles) * 100) : 0
    
    // Sparkline array for the last 10 battles
    const sparkline = recentBattles.map(b => p.attendedIds.has(String(b.id)))

    return {
      name: p.name,
      battles: p.battles,
      mainRoles,
      attendancePercent,
      sparkline
    }
  }).sort((a, b) => b.battles - a.battles)

  return { totalBattles, recentBattles, players }
}

const roleCss = (r: string) => {
  const m: Record<string,string> = { healer:'healer', tank:'tank', melee:'melee', ranged:'dps', support:'support' }
  return `badge badge-${m[r] ?? 'dps'}`
}

const roleLabel = (r: string) => {
  const map: Record<string,string> = { healer: 'HEALER', tank: 'TANK', melee: 'MELEE', ranged: 'RANGED', support: 'SUPPORT' }
  return map[r] ?? r.toUpperCase()
}

export default async function PresencePage() {
  const { totalBattles, recentBattles, players } = await getAttendanceData()

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }} className="anim-up">
        <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--cyan)' }}>shield</span>
        <div>
          <h1 className="section-hd" style={{ fontSize: 24 }}>Radar de Presença</h1>
          <div className="label">Acompanhe o engajamento e a assiduidade dos membros nas batalhas avaliadas.</div>
        </div>
      </div>

      <div className="glass panel anim-up" style={{ animationDelay: '60ms' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="dot dot-amber" />
              <span className="section-hd">Relatório de Assiduidade</span>
            </div>
            <div className="label" style={{ marginTop: 4 }}>
              Baseado nas ultimas {totalBattles} lutas catalogadas no banco de dados.
            </div>
          </div>
        </div>

        <div className="panel-body scroll">
          {players.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }} className="label">
              Sem dados de membros cadastrados ou batalhas sincronizadas.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Operador</th>
                  <th>Classes Frequentes</th>
                  <th style={{ textAlign: 'center' }}>Presenças</th>
                  <th style={{ textAlign: 'center', width: 140 }}>Atividade Recente</th>
                  <th style={{ width: 140 }}>Performance (Geral)</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => {
                  let barColor = 'var(--cyan)'
                  if (p.attendancePercent < 30) barColor = '#dc2626' // crimson
                  else if (p.attendancePercent < 70) barColor = '#f59e0b' // amber

                  return (
                    <tr key={p.name} style={{ animationDelay: `${(i % 10) * 20}ms` }}>
                      <td style={{ color: 'var(--text-500)', fontSize: 12 }}>{i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-900)' }}>{p.name}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {p.mainRoles.map((r, idx) => (
                            <span key={idx} className={roleCss(r)} style={{ fontSize: 9 }}>
                              {roleLabel(r)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 800 }}>
                          {p.battles} <span style={{ color: 'var(--text-500)', fontSize: 10 }}>/ {totalBattles}</span>
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          {p.sparkline.map((attended, sid) => (
                            <div 
                              key={sid} 
                              title={attended ? "Presente" : "Faltou"}
                              style={{
                                width: 8, height: 16, borderRadius: 2,
                                backgroundColor: attended ? 'var(--cyan)' : 'rgba(255,255,255,0.05)',
                                opacity: attended ? 1 : 0.6
                              }} 
                            />
                          ))}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ 
                             fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, 
                             color: barColor, width: 36, textAlign: 'right' 
                          }}>
                            {p.attendancePercent}%
                          </span>
                          <div className="bar-track" style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', borderRadius: 2 }}>
                            <div 
                              className="bar-fill" 
                              style={{ 
                                width: `${p.attendancePercent}%`, 
                                background: barColor,
                                height: 6,
                                borderRadius: 2
                              }} 
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
