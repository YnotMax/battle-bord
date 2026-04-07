import { createClient } from '@supabase/supabase-js'

export const revalidate = 0 // Atualiza a página em tempo real e não faz cache estático agressivo

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type PlayerMatch = {
  battle_id: string
  role: string
  damage_done: number
  healing_done: number
  kills: number
  deaths: number
  weapon: string
  average_ip: number
  battles: {
    start_time: string
    result: string
    total_fame: number
  }
}

async function getPlayerProfile(playerName: string) {
  const { data } = await sb
    .from('player_stats')
    .select(`
      battle_id, role, damage_done, healing_done, kills, deaths, weapon, average_ip,
      battles ( start_time, result, total_fame )
    `)
    .ilike('player_name', playerName)
    .order('battles(start_time)', { ascending: false })

  if (!data || data.length === 0) return null

  const matches = data as unknown as PlayerMatch[]
  
  // Agrupamento por arma
  const weaponStats: Record<string, {
    weapon: string
    role: string
    uses: number
    wins: number
    kills: number
    deaths: number
    damage: number
    healing: number
  }> = {}

  let totalWins = 0

  matches.forEach(m => {
    const wName = m.weapon || 'Desconhecida'
    if (!weaponStats[wName]) {
      weaponStats[wName] = { weapon: wName, role: m.role, uses: 0, wins: 0, kills: 0, deaths: 0, damage: 0, healing: 0 }
    }
    weaponStats[wName].uses += 1
    weaponStats[wName].kills += m.kills
    weaponStats[wName].deaths += m.deaths
    weaponStats[wName].damage += m.damage_done
    weaponStats[wName].healing += m.healing_done
    
    if (m.battles?.result === 'WIN') {
      weaponStats[wName].wins += 1
      totalWins += 1
    }
  })

  // Calcula Mentor: (Melhor arma vs Pior Arma)
  const weaponsArray = Object.values(weaponStats).sort((a, b) => b.uses - a.uses) // Sort primarily by uses to get Main

  return {
    rawMatches: matches,
    globalStats: {
      totalBattles: matches.length,
      winRate: Math.round((totalWins / matches.length) * 100),
      weapons: weaponsArray
    }
  }
}

// ALGORITMO DE COACHING 
function generateCoachAdvice(weapons: any[]) {
  if (weapons.length === 0) return null

  const pW = weapons[0] // Primary Weapon (most used)
  const pWinRate = Math.round((pW.wins / pW.uses) * 100)
  
  // Tenta encontrar uma arma secundária que ele seja muito melhor que a principal (min 3 usos)
  let hiddenGem = null
  for (let i = 1; i < weapons.length; i++) {
    const sec = weapons[i]
    if (sec.uses >= 3) {
      const secWinRate = Math.round((sec.wins / sec.uses) * 100)
      if (secWinRate > pWinRate + 15) {
        hiddenGem = sec
      }
    }
  }

  if (hiddenGem) {
    return {
      type: 'discovery',
      icon: 'psychology',
      color: 'var(--cyan)',
      title: 'Talento Oculto Detectado!',
      text: `O banco de dados notou algo incrível: Mesmo que você use prioritariamente [${pW.weapon}] (com incertos ${pWinRate}% de WinRate), seu aproveitamento com [${hiddenGem.weapon}] atinge incríveis ${Math.round((hiddenGem.wins / hiddenGem.uses) * 100)}% de maestria de ZvZ em ${hiddenGem.uses} lutas. Converse com seu Caller para te fixar nessa classe!`
    }
  }

  if (pWinRate < 40 && pW.uses >= 5) {
    return {
      type: 'warning',
      icon: 'trending_down',
      color: '#ef4444',
      title: 'Baixa Eficiência na Main Build',
      text: `Aviso Tático: Seu engajamento com [${pW.weapon}] está custando vitórias. Com ${pW.uses} participações, a guilda obteve apenas ${pWinRate}% de WinRate através de você. Se seu KDA ou Healing estiver insatisfatório, peça Vod Review para o Líder imediatamente.`
    }
  }

  if (pWinRate >= 65 && pW.uses >= 5) {
    return {
      type: 'success',
      icon: 'verified',
      color: '#10b981',
      title: 'Maestria Certificada T8',
      text: `Absolutamente essencial. Você carrega uma espinha dorsal nas vitórias usando [${pW.weapon}]. Com ${pWinRate}% de WR isolado nessa composição, o seu posicionamento eleva absurdamente o desempenho global da zerg.`
    }
  }

  return {
    type: 'neutral',
    icon: 'monitoring',
    color: 'var(--text-400)',
    title: 'Monitoramento Padrão Ativo',
    text: `Você tem flutuado no meta de ZvZ confortavelmente usando [${pW.weapon}]. Seu impacto é consistente e acompanha a resiliência geral da guilda (${pWinRate}% WR). Continue o ótimo trabalho mantendo a presença.`
  }
}


export default async function PlayerProfilePage({ params }: { params: { name: string } }) {
  const decodedName = decodeURIComponent(params.name)
  const profile = await getPlayerProfile(decodedName)

  if (!profile) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-400)' }}>
        <h1 className="section-hd" style={{ fontSize: 24, marginBottom: 8 }}>{decodedName}</h1>
        <div>Operador Fantasma: Nenhum log de batalha de Zerg encontrado para este nome no Banco de Dados.</div>
      </div>
    )
  }

  const { totalBattles, winRate, weapons } = profile.globalStats
  const aiCoach = generateCoachAdvice(weapons)
  const mainWeapon = weapons[0]

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }} className="anim-up">
        <div style={{ 
          width: 56, height: 56, borderRadius: 12, background: 'var(--cyan-20)', border: '2px solid var(--cyan)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center' 
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--cyan)' }}>person</span>
        </div>
        <div>
          <h1 className="section-hd" style={{ fontSize: 28, textTransform: 'uppercase' }}>
            {decodedName}
          </h1>
          <div className="label">
            Painel Oficial de Mentoria Tática (Player Coaching Hub)
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) 300px',
        gap: 16,
      }}>

        {/* ── LEFT: Stats & Lutas ──────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* AI COACH BOX */}
          {aiCoach && (
            <div className="glass panel anim-up" style={{ 
              borderLeft: `4px solid ${aiCoach.color}`,
              background: 'var(--bg-card)',
              animationDelay: '40ms'
            }}>
              <div className="panel-body" style={{ padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span className="material-symbols-outlined" style={{ color: aiCoach.color }}>{aiCoach.icon}</span>
                  <span style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: aiCoach.color }}>
                    {aiCoach.title}
                  </span>
                </div>
                <p style={{ color: 'var(--text-900)', fontSize: 13, lineHeight: 1.6, fontWeight: 500 }}>
                  {aiCoach.text}
                </p>
              </div>
            </div>
          )}

          {/* HISTÓRICO DE ARMAS */}
          <div className="glass panel anim-up" style={{ animationDelay: '80ms' }}>
            <div className="panel-header">
              <span className="section-hd">Eficiência de Armamento (Main Specs)</span>
            </div>
            <div className="panel-body scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Classe & Arma</th>
                    <th style={{ textAlign: 'center' }}>ZvZs</th>
                    <th style={{ textAlign: 'center' }}>KDA</th>
                    <th style={{ textAlign: 'right' }}>Win Rate Pessoal</th>
                  </tr>
                </thead>
                <tbody>
                  {weapons.map(w => {
                    const wr = Math.round((w.wins / w.uses) * 100)
                    const kda = w.deaths === 0 ? w.kills : (w.kills / w.deaths).toFixed(2)
                    return (
                      <tr key={w.weapon}>
                        <td style={{ fontWeight: 700, color: 'var(--amber)' }}>
                          <span style={{ opacity: 0.6, fontSize: 9, display: 'block', marginBottom: 2, color: 'var(--text-400)', textTransform: 'uppercase' }}>
                            {w.role}
                          </span>
                          {w.weapon}
                        </td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{w.uses}x</td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{kda}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ 
                            fontFamily: 'var(--font-mono)', fontWeight: 800, 
                            color: wr >= 60 ? '#10b981' : wr < 40 ? '#ef4444' : 'var(--cyan)'
                          }}>
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
        </div>

        {/* ── RIGHT: Snapshot KPI ───────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          <div className="glass anim-up" style={{ padding: '24px 20px', textAlign: 'center' }}>
            <div className="label" style={{ marginBottom: 4 }}>Presença Fichada</div>
            <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--cyan)', lineHeight: 1 }}>{totalBattles}</div>
            <div className="label-sm" style={{ marginTop: 2 }}>Zerg Call To Arms</div>
          </div>

          <div className="glass anim-up" style={{ padding: '24px 20px', textAlign: 'center', borderTop: '2px solid var(--amber-40)' }}>
            <div className="label" style={{ marginBottom: 4 }}>Função Principal</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-900)' }}>{mainWeapon.role.toUpperCase()}</div>
          </div>

          <div className="glass anim-up" style={{ padding: '24px 20px', textAlign: 'center' }}>
            <div className="label" style={{ marginBottom: 4 }}>Taxa de Vitória Acumulada</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: winRate >= 50 ? '#10b981' : '#ef4444' }}>
              {winRate}%
            </div>
          </div>
          
        </div>
      </div>
    </>
  )
}
