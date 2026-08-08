import { createClient } from '@supabase/supabase-js'
import { PlayerRadar } from '../../../components/PlayerRadar'
import { WeaponIcon } from '@/components/WeaponIcon'

export const revalidate = 0 

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Page data collection might fail during build if not provided in environment.');
}

const sb = createClient(supabaseUrl, supabaseAnonKey)

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
    opponents: string
  }
}

// FORMATADOR DE NOMES BRUTOS DA API
function formatWeaponName(rawName: string) {
  if (!rawName) return "Desconhecida"
  return rawName
    .replace(/^T\d_/, '')
    .replace(/^2H_/, '')
    .replace(/^MAIN_/, '')
    .replace(/@\d+$/, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}

async function getPlayerProfile(playerName: string) {
  // Busca Player
  const { data } = await sb
    .from('player_stats')
    .select(`
      battle_id, role, damage_done, healing_done, kills, deaths, weapon, average_ip,
      battles!inner( start_time, result, total_fame, opponents )
    `)
    .ilike('player_name', playerName)
    .order('battles(start_time)', { ascending: false })

  if (!data || data.length === 0) return null

  // Busca Guild global para Relativos e Média Real
  const { data: guildData } = await sb.from('player_stats').select('role, weapon, damage_done, healing_done, kills, deaths, battle_id')

  // Calcula médias globais da guilda
  let gKills = 0, gDeaths = 0, gBattles = 0
  let gRoleDmg = 0, gRoleHeal = 0, gRoleBattles = 0
  
  const uniqueBattles = new Set<string>()
  const roleTypeParam = data[0]?.role?.toLowerCase() || ''
  const roleGroup = roleTypeParam.includes('tank') || roleTypeParam.includes('support') ? 'tank' 
                  : roleTypeParam.includes('heal') ? 'healer' 
                  : 'dps'

  if (guildData) {
    guildData.forEach((g: any) => {
      uniqueBattles.add(g.battle_id)
      gKills += g.kills || 0
      gDeaths += g.deaths || 0
      
      const gRole = (g.role || '').toLowerCase()
      const gGrp = gRole.includes('tank') || gRole.includes('support') ? 'tank'
                 : gRole.includes('heal') ? 'healer' : 'dps'
                 
      if (gGrp === roleGroup) {
        gRoleDmg += g.damage_done || 0
        gRoleHeal += g.healing_done || 0
        gRoleBattles += 1
      }
    })
    gBattles = uniqueBattles.size || 1
  }
  // Médias
  const avgGuildKillsPerPlayer = (gKills / (guildData?.length || 1)) // média de kills por participação
  const avgGuildDeathsPerPlayer = (gDeaths / (guildData?.length || 1))
  const avgRoleDmg = (gRoleDmg / (gRoleBattles || 1))
  const avgRoleHeal = (gRoleHeal / (gRoleBattles || 1))

  const matches = data as unknown as PlayerMatch[]
  
  // Agrupamento por arma
  const weaponStats: Record<string, {
    weapon: string
    rawWeapon: string
    role: string
    uses: number
    wins: number
    kills: number
    deaths: number
    damage: number
    healing: number
  }> = {}

  let totalWins = 0
  let totalKills = 0
  let totalDeaths = 0
  let totalDamage = 0
  let totalHealing = 0

  // Nemesis Tracker (Guildas Inimigas)
  const enemyGuilds: Record<string, { encounters: number, deathsTo: number, winsAgs: number }> = {}

  matches.forEach(m => {
    const rawName = m.weapon || 'Desconhecida'
    const wName = formatWeaponName(rawName)
    
    if (!weaponStats[wName]) {
      weaponStats[wName] = { weapon: wName, rawWeapon: rawName, role: m.role, uses: 0, wins: 0, kills: 0, deaths: 0, damage: 0, healing: 0 }
    }
    
    weaponStats[wName].uses += 1
    weaponStats[wName].kills += m.kills
    weaponStats[wName].deaths += m.deaths
    weaponStats[wName].damage += m.damage_done
    weaponStats[wName].healing += m.healing_done
    
    totalKills += m.kills
    totalDeaths += m.deaths
    totalDamage += m.damage_done
    totalHealing += m.healing_done
    
    const isWin = m.battles?.result === 'WIN'
    if (isWin) {
      weaponStats[wName].wins += 1
      totalWins += 1
    }

    // Calcula Rivalidade / Nêmesis da pessoa
    if (m.battles?.opponents && m.battles.opponents !== 'Vários') {
      const opps = m.battles.opponents.split(',').map(o => o.trim())
      opps.forEach(opp => {
        if (!opp || opp.length < 2) return
        if (!enemyGuilds[opp]) enemyGuilds[opp] = { encounters: 0, deathsTo: 0, winsAgs: 0 }
        
        enemyGuilds[opp].encounters += 1
        enemyGuilds[opp].deathsTo += m.deaths
        if (isWin) enemyGuilds[opp].winsAgs += 1
      })
    }
  })

  const weaponsArray = Object.values(weaponStats).sort((a, b) => b.uses - a.uses) 

  // ============== RADAR TÁTICO ==================
  const roleType = weaponsArray[0]?.role?.toLowerCase() || ''
  const isHealer = roleType.includes('heal')
  const totalMatches = matches.length || 1

  // 1. Agressividade: Média da Guilda = 50. Dobro = 100
  const myKillsPerMatch = totalKills / totalMatches
  const scoreKills = avgGuildKillsPerPlayer > 0 ? (myKillsPerMatch / avgGuildKillsPerPlayer) * 50 : 50
  
  // 2. Sobrevivência: 0 mortes = 100%, 3+ mortes = 0%
  const myDeathsPerMatch = totalDeaths / totalMatches
  const scoreSurv = Math.max(0, 100 - (myDeathsPerMatch / 3) * 100)
  const gSurv = Math.max(0, 100 - (avgGuildDeathsPerPlayer / 3) * 100)

  // 3. Dano Zerg (DPS): Média do role = 50
  const myDmgPerMatch = totalDamage / totalMatches
  const scoreDmg = avgRoleDmg > 0 ? (myDmgPerMatch / avgRoleDmg) * 50 : (isHealer ? 0 : 50)
  
  // 4. Sustain (Heal): Média do role = 50
  const myHealPerMatch = totalHealing / totalMatches
  const scoreHeal = avgRoleHeal > 0 ? (myHealPerMatch / avgRoleHeal) * 50 : (isHealer ? 50 : 0)

  const myP_Win = Math.round((totalWins / totalMatches) * 100)

  const radarData = [
    { subject: 'Agressividade (Kills)', A: Math.min(100, Math.round(scoreKills)), B: 50 },
    { subject: 'Sustento Defensivo', A: Math.round(scoreSurv), B: Math.round(gSurv) },
    { subject: 'Dano Zerg (DPS)', A: Math.min(100, Math.round(scoreDmg)), B: isHealer ? 0 : 50 },
    { subject: 'Sustain Geral (Heal)', A: Math.min(100, Math.round(scoreHeal)), B: isHealer ? 50 : 0 },
    { subject: 'Frequência Vencedora', A: myP_Win, B: 50 }, // B = 50 pois a guilda ganha e perde, meta = 50%
  ]

  // ============== NEMESIS & FREGUES ==================
  let nemesis = null;
  let prey = null;
  
  if (Object.keys(enemyGuilds).length > 0) {
    nemesis = Object.entries(enemyGuilds)
      .filter(([_, v]) => v.encounters >= 3)
      .sort((a, b) => b[1].deathsTo - a[1].deathsTo)[0]
      
    prey = Object.entries(enemyGuilds)
      .filter(([_, v]) => v.encounters >= 2)
      .sort((a, b) => (b[1].winsAgs / b[1].encounters) - (a[1].winsAgs / a[1].encounters))[0]
  }

  // ============== RELATIVOS DA GUILDA ===============
  const guildStatsAvg: Record<string, { uses: number, dmg: number, heal: number }> = {}
  if (guildData) {
    guildData.forEach((g: any) => {
      const gW = formatWeaponName(g.weapon || 'Desconhecida')
      if (!guildStatsAvg[gW]) guildStatsAvg[gW] = { uses: 0, dmg: 0, heal: 0 }
      guildStatsAvg[gW].uses += 1
      guildStatsAvg[gW].dmg += g.damage_done || 0
      guildStatsAvg[gW].heal += g.healing_done || 0
    })
  }

  const enrichedWeapons = weaponsArray.map(w => {
    const isWHealer = w.role.toLowerCase().includes('heal')
    const gObj = guildStatsAvg[w.weapon]
    const gDmgAvg = gObj && gObj.uses > 0 ? (gObj.dmg / gObj.uses) : 0
    const gHealAvg = gObj && gObj.uses > 0 ? (gObj.heal / gObj.uses) : 0
    
    const myAvg = isWHealer ? (w.healing / w.uses) : (w.damage / w.uses)
    const baseAvg = isWHealer ? gHealAvg : gDmgAvg
    
    const relativePct = baseAvg > 0 ? Math.round(((myAvg - baseAvg) / baseAvg) * 100) : 0

    return {
      ...w,
      relativePct,
      compareLabel: isWHealer ? 'Cura' : 'Dano'
    }
  })

  // ============== RECORDS PESSOAIS ==================
  const recordDamage = matches.reduce((max, m) => m.damage_done > max.val ? { val: m.damage_done, battle: m.battle_id } : max, { val: 0, battle: '' })
  const recordKills = matches.reduce((max, m) => m.kills > max.val ? { val: m.kills, battle: m.battle_id } : max, { val: 0, battle: '' })
  const avgIP = matches.length > 0 ? Math.round(matches.reduce((s, m) => s + (m.average_ip || 0), 0) / matches.length) : 0
  const totalBattlesPlayed = matches.length

  return {
    rawMatches: matches,
    globalStats: {
      totalBattles: matches.length,
      winRate: myP_Win,
      weapons: enrichedWeapons
    },
    radarData,
    enemies: {
      nemesis: nemesis ? { guild: nemesis[0], deaths: nemesis[1].deathsTo } : null,
      prey: prey ? { guild: prey[0], winRate: Math.round((prey[1].winsAgs/prey[1].encounters)*100) } : null,
    },
    records: {
      damage: recordDamage,
      kills: recordKills,
      avgIP,
      totalWins,
      totalBattlesPlayed,
    }
  }
}

// ALGORITMO DE COACHING 
function generateCoachAdvice(weapons: any[], totalBattles: number) {
  if (weapons.length === 0) return null

  if (totalBattles < 3) {
    return {
      type: 'neutral',
      icon: 'hourglass_empty',
      color: 'var(--text-400)',
      title: 'Amostragem Insuficiente',
      text: `Poucos dados ainda (apenas ${totalBattles} CTAs). Participe de mais ZvZs com a guilda para um diagnóstico preciso do seu impacto no Meta.`,
      weaponRaw: null
    }
  }

  const pW = weapons[0] 
  const pWinRate = Math.round((pW.wins / pW.uses) * 100)
  
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
      text: `O banco notou algo: Mesmo que use [${pW.weapon}] prioritariamente (${pWinRate}% de WinRate), seu aproveitamento com [${hiddenGem.weapon}] atinge ${Math.round((hiddenGem.wins / hiddenGem.uses) * 100)}% de maestria em ${hiddenGem.uses} lutas.`,
      weaponRaw: hiddenGem.rawWeapon
    }
  }

  // Verifica Underperformance Relativo
  if (pW.relativePct && pW.relativePct <= -20 && pW.uses >= 5) {
    return {
      type: 'warning',
      icon: 'trending_down',
      color: '#ef4444',
      title: 'Baixo Desempenho Relativo',
      text: `Aviso Tático: Seu engajamento com [${pW.weapon}] está ${Math.abs(pW.relativePct)}% abaixo da Média da Guilda no quesito ${pW.compareLabel}. Se posicione melhor na Zerg para garantir o uso eficiente de suas habilidades.`,
      weaponRaw: pW.rawWeapon
    }
  }

  if (pWinRate >= 65 && pW.uses >= 5) {
    return {
      type: 'success',
      icon: 'verified',
      color: '#10b981',
      title: 'Maestria Certificada T8 (Supera Média)',
      text: `Absolutamente essencial. Você carrega a espinha dorsal nas vitórias usando [${pW.weapon}]! ${pW.relativePct > 0 ? `Seu ${pW.compareLabel} é ${pW.relativePct}% MAIOR que a média dos outros jogadores que tentam usar essa arma.` : ''}`,
      weaponRaw: pW.rawWeapon
    }
  }

  // Texto do padrão: contextualizado com dados reais
  const winLabel = pWinRate >= 55 ? 'acima da média' : pWinRate >= 45 ? 'dentro do esperado' : 'abaixo do ideal'
  const relativeComment = pW.relativePct > 0 
    ? ` Seu ${pW.compareLabel} está ${pW.relativePct}% acima da média dos que usam essa arma na guilda — um sinal positivo.`
    : pW.relativePct < -10 
    ? ` Atenção: seu ${pW.compareLabel} está ${Math.abs(pW.relativePct)}% abaixo da média do core — foque em melhorar o posicionamento.`
    : ''
  return {
    type: 'neutral',
    icon: 'monitoring',
    color: 'var(--text-400)',
    title: 'Monitoramento Padrão Ativo',
    text: `Análise baseada em ${totalBattles} CTAs registrados. Sua arma principal [${pW.weapon}] tem WinRate de ${pWinRate}% (${winLabel} para a guilda).${relativeComment} Continue participando para dados mais precisos.`,
    weaponRaw: pW.rawWeapon
  }
}


export default async function PlayerProfilePage(props: { params: Promise<{ name: string }> }) {
  const params = await props.params;
  const playerName = decodeURIComponent(params.name)
  
  const profile = await getPlayerProfile(playerName)

  if (!profile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
        <h1 style={{ color: 'var(--text-900)', letterSpacing: 2 }}>{playerName.toUpperCase()}</h1>
        <p style={{ color: 'var(--text-500)' }}>Operador Fantasma: Nenhum log de batalha de Zerg encontrado para este nome no Banco de Dados.</p>
      </div>
    )
  }

  const { totalBattles, winRate, weapons } = profile.globalStats
  const aiCoach = generateCoachAdvice(weapons, totalBattles)
  const mainWeapon = weapons[0]
  
  // Render match history
  const historyFeed = profile.rawMatches.slice(0, 10)

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
          <h1 className="section-hd" style={{ fontSize: 32, letterSpacing: 1, margin: 0, color: 'var(--text-900)' }}>
            {playerName.toUpperCase()}
          </h1>
          <div className="label">
            Painel Oficial de Mentoria Tática (Player Coaching Hub)
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) 340px',
        gap: 20,
      }}>

        {/* ── LEFT: Stats & Lutas ──────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16 }}>
            {/* RADAR CHART PANEL */}
            <div className="glass panel anim-up">
              <div className="panel-header">
                <span className="section-hd">Polígono de Playstyle (Radar)</span>
              </div>
              <div className="panel-body" style={{ padding: 0 }}>
                <PlayerRadar data={profile.radarData} />
              </div>
            </div>

            {/* RIVALIDADES / INIMIGOS PESSOAIS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
               <div className="glass panel anim-up" style={{ flexGrow: 1 }}>
                 <div className="panel-header" style={{ borderBottomColor: 'rgba(239, 68, 68, 0.2)' }}>
                   <span className="section-hd" style={{ color: '#ef4444' }}>🔪 Presa Fácil (Maior Mortalidade)</span>
                 </div>
                 <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-500)' }}>Guilda Oposta Causa-Morte:</div>
                    {profile.enemies.nemesis ? (
                      <div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-900)' }}>{profile.enemies.nemesis.guild}</div>
                        <div style={{ color: '#ef4444', fontWeight: 600, fontSize: 14 }}>{profile.enemies.nemesis.deaths} Mortes Diretas</div>
                      </div>
                    ) : <div style={{ fontStyle: 'italic', color: 'var(--text-400)' }}>Poucas mortes para uma guilda única.</div>}
                 </div>
               </div>

               <div className="glass panel anim-up" style={{ flexGrow: 1 }}>
                 <div className="panel-header" style={{ borderBottomColor: 'rgba(16, 185, 129, 0.2)' }}>
                   <span className="section-hd" style={{ color: '#10b981' }}>🏹 Carrasco (Maior Supremacia)</span>
                 </div>
                 <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-500)' }}>Ganha a maioria contra:</div>
                    {profile.enemies.prey ? (
                      <div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-900)' }}>{profile.enemies.prey.guild}</div>
                        <div style={{ color: '#10b981', fontWeight: 600, fontSize: 14 }}>{profile.enemies.prey.winRate}% das vezes!</div>
                      </div>
                    ) : <div style={{ fontStyle: 'italic', color: 'var(--text-400)' }}>Nenhuma guilda sofre suficientemente para você ser o carrasco.</div>}
                 </div>
               </div>
            </div>
          </div>

          {/* AI COACH BOX */}
          {aiCoach && (
            <div className="glass panel anim-up" style={{ 
              borderLeft: `4px solid \${aiCoach.color}`,
              background: 'var(--bg-card)',
              animationDelay: '40ms'
            }}>
              <div className="panel-body" style={{ padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span className="material-symbols-outlined" style={{ color: aiCoach.color }}>{aiCoach.icon}</span>
                  <span style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: aiCoach.color }}>
                    {aiCoach.title}
                  </span>
                  {aiCoach.weaponRaw && (
                    <div style={{ marginLeft: 'auto' }}>
                      <WeaponIcon rawWeapon={aiCoach.weaponRaw} size={48} />
                    </div>
                  )}
                </div>
                <p style={{ color: 'var(--text-900)', fontSize: 13, lineHeight: 1.6, fontWeight: 500 }}>
                  {aiCoach.text}
                </p>
              </div>
            </div>
          )}

          {/* HISTÓRICO DE ARMAS + RELATIVO DA GUILDA */}
          <div className="glass panel anim-up" style={{ animationDelay: '80ms' }}>
            <div className="panel-header">
              <span className="section-hd">Eficiência de Armamento Otimizada (Meta Specs vs Média do Core)</span>
            </div>
            <div className="panel-body scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Classe & Arma</th>
                    <th style={{ textAlign: 'center' }}>ZvZs</th>
                    <th style={{ textAlign: 'center' }}>KDA</th>
                    <th style={{ textAlign: 'right' }}>DPS/Luta</th>
                    <th style={{ textAlign: 'right' }}>Heal/Luta</th>
                    <th style={{ textAlign: 'right' }}>Relativo Core</th>
                    <th style={{ textAlign: 'right' }}>WinRate</th>
                  </tr>
                </thead>
                <tbody>
                  {weapons.map(w => {
                    const wr = Math.round((w.wins / w.uses) * 100)
                    const kda = w.deaths === 0 ? w.kills : (w.kills / w.deaths).toFixed(2)
                    const avgDamage = Math.round(w.damage / w.uses).toLocaleString()
                    const avgHeal = Math.round(w.healing / w.uses).toLocaleString()

                    const albion2d_link = `https://albiononline2d.com/pt/item/id/T8_${w.rawWeapon.replace(/^T\d_/, '').split('@')[0]}`;
                    
                    const isPositive = w.relativePct > 0;
                    
                    return (
                      <tr key={w.weapon}>
                        <td>
                          <span style={{ opacity: 0.6, fontSize: 9, display: 'block', marginBottom: 2, color: 'var(--text-400)', textTransform: 'uppercase' }}>
                            {w.role}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <WeaponIcon rawWeapon={w.rawWeapon} size={32} />
                            <a href={albion2d_link} data-tooltip="Ver item no Albion2D" target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: 'var(--amber)', textDecoration: 'none' }} className="hover:text-cyan">
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

        {/* ── RIGHT: Snapshot KPI & Match History ────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* RECORDS PESSOAIS */}
          <div className="glass anim-up" style={{ padding: '16px 20px', borderTop: '2px solid var(--amber)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--amber)' }}>emoji_events</span>
              <span className="section-hd" style={{ fontSize: 12 }}>Records Pessoais</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ padding: '10px 12px', background: 'rgba(249,115,22,0.08)', borderRadius: 8, border: '1px solid rgba(249,115,22,0.2)' }}>
                <div className="label" style={{ fontSize: 9, marginBottom: 4 }}>MAX DANO (1 BATALHA)</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 14, color: '#f97316' }}>
                  {profile.records.damage.val > 0 ? (profile.records.damage.val >= 1_000_000 ? `${(profile.records.damage.val/1_000_000).toFixed(1)}M` : `${Math.round(profile.records.damage.val/1000)}K`) : '-'}
                </div>
              </div>
              <div style={{ padding: '10px 12px', background: 'rgba(220,38,38,0.08)', borderRadius: 8, border: '1px solid rgba(220,38,38,0.2)' }}>
                <div className="label" style={{ fontSize: 9, marginBottom: 4 }}>MAX KILLS (1 BATALHA)</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 14, color: '#dc2626' }}>
                  {profile.records.kills.val > 0 ? profile.records.kills.val : '-'}
                </div>
              </div>
              <div style={{ padding: '10px 12px', background: 'rgba(0,255,157,0.08)', borderRadius: 8, border: '1px solid var(--cyan-20)' }}>
                <div className="label" style={{ fontSize: 9, marginBottom: 4 }}>IP MÉDIO</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 14, color: 'var(--cyan)' }}>
                  {profile.records.avgIP > 0 ? profile.records.avgIP : '-'}
                </div>
              </div>
              <div style={{ padding: '10px 12px', background: 'rgba(5,150,105,0.08)', borderRadius: 8, border: '1px solid rgba(5,150,105,0.2)' }}>
                <div className="label" style={{ fontSize: 9, marginBottom: 4 }}>VITÓRIAS TOTAIS</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 14, color: '#059669' }}>
                  {profile.records.totalWins}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 14 }}>
            <div className="glass anim-up" style={{ padding: '16px 16px', textAlign: 'center' }}>
              <div className="label" style={{ marginBottom: 4 }}>Presença</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--cyan)', lineHeight: 1 }}>{totalBattles} <span style={{ fontSize: 13, color: 'var(--text-400)'}}>CTAs</span></div>
            </div>

            <div className="glass anim-up" style={{ padding: '16px 16px', textAlign: 'center', borderTop: '2px solid var(--amber-40)' }}>
               <div className="label" style={{ marginBottom: 4 }}>Main Spec</div>
               <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-900)' }}>{mainWeapon.role.toUpperCase()}</div>
            </div>
          </div>

          <div className="glass anim-up" style={{ padding: '24px 20px', textAlign: 'center' }}>
            <div className="label" style={{ marginBottom: 4 }}>Taxa de Vitória Acumulada</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: winRate >= 50 ? '#10b981' : '#ef4444' }}>
              {winRate}%
            </div>
          </div>

          {/* OP.GG STYLE MATCH HISTORY */}
          <div className="glass panel anim-up">
            <div className="panel-header">
              <span className="section-hd" style={{ fontSize: 13 }}>Feed de ZVZ (Op.gg)</span>
            </div>
            <div className="panel-body scroll" style={{ padding: 0, maxHeight: 500 }}>
               {historyFeed.map(match => {
                 const isWin = match.battles?.result === 'WIN'
                 const mKda = match.deaths === 0 ? match.kills : (match.kills / match.deaths).toFixed(1)
                 
                 return (
                   <div key={match.battle_id} style={{ 
                     display: 'flex', padding: 12, borderBottom: '1px solid var(--border)',
                     borderLeft: `4px solid ${isWin ? '#10b981' : '#ef4444'}`,
                     background: isWin ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                     gap: 12, alignItems: 'center'
                   }}>
                     <div style={{ 
                        width: 38, height: 38, borderRadius: 6, background: '#020617', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center', color: isWin ? '#10b981' : '#ef4444', fontWeight: 800, fontSize: 12
                     }}>
                       {isWin ? 'V' : 'D'}
                     </div>

                     <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: 4 }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <a href={`https://albionbb.com/battle/${match.battle_id}`} data-tooltip="Ver detalhes no AlbionBB" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }} className="hover:text-cyan">
                            <WeaponIcon rawWeapon={match.weapon} size={28} />
                            <span style={{ fontWeight: 800, color: 'var(--text-900)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                              {formatWeaponName(match.weapon)}
                            </span>
                          </a>
                          <span style={{ fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{match.kills} / {match.deaths} / -</span>
                       </div>

                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-400)' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>Vs: {match.battles?.opponents || 'Desconhecido'}</span>
                          <span style={{ color: 'var(--amber)', fontWeight: 600 }}>IP: {match.average_ip}</span>
                       </div>
                     </div>
                   </div>
                 )
               })}
            </div>
            <div className="panel-footer" style={{ textAlign: 'center' }}>
               <span className="label" style={{ fontSize: 10 }}>Mostrando as {historyFeed.length} ZvZs mais recentes</span>
            </div>
          </div>
          
        </div>
      </div>
    </>
  )
}
