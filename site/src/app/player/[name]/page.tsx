import { createClient } from '@supabase/supabase-js'
import { PlayerRadar } from '../../../components/PlayerRadar'
import { WeaponIcon } from '@/components/WeaponIcon'
import { HintIcon } from '@/components/HintIcon'
import { BattleTimeline, KillEventItem } from '@/components/BattleTimeline'
import { CoachCarousel, CoachInsight } from '@/components/CoachCarousel'
import { PlayerTabsView } from '@/components/PlayerTabsView'

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

  // V2: Busca kill events do jogador (tanto mortes quanto abates do jogador)
  const { data: killEvents } = await sb
    .from('kill_events')
    .select('event_id, timestamp, victim_name, victim_guild, killer_name, killer_guild, killer_weapon, killer_weapon_norm, seconds_into_battle, is_early_death, battle_id, total_participants')
    .or(`victim_name.ilike.${playerName},killer_name.ilike.${playerName}`)
    .order('timestamp', { ascending: false })

  // Busca Guild global para Relativos e Média Real (inclui average_ip para efficiency)
  const [{ data: guildData }, { count: totalGuildBattlesCount }] = await Promise.all([
    sb.from('player_stats').select('role, weapon, damage_done, healing_done, kills, deaths, battle_id, average_ip').limit(10000),
    sb.from('battles').select('id', { count: 'exact', head: true })
  ])

  // Calcula médias globais da guilda
  let gKills = 0, gDeaths = 0, gBattles = totalGuildBattlesCount || 0
  let gRoleDmg = 0, gRoleHeal = 0, gRoleBattles = 0
  let gRoleIP = 0, gRoleIPCount = 0
  
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
        if (g.average_ip > 0) { gRoleIP += g.average_ip; gRoleIPCount++ }
      }
    })
    gBattles = uniqueBattles.size || 1
  }
  // Médias
  const avgGuildKillsPerPlayer = (gKills / (guildData?.length || 1))
  const avgGuildDeathsPerPlayer = (gDeaths / (guildData?.length || 1))
  const avgRoleDmg = (gRoleDmg / (gRoleBattles || 1))
  const avgRoleHeal = (gRoleHeal / (gRoleBattles || 1))
  const avgRoleIP = gRoleIPCount > 0 ? Math.round(gRoleIP / gRoleIPCount) : 0

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

  // ============== NOVOS KPIs DE COACHING ==================
  // 1. Tendência: compara últimas 5 batalhas vs as anteriores
  const recentSlice = matches.slice(0, Math.min(5, matches.length))
  const olderSlice = matches.slice(5)
  const recentWR = recentSlice.length > 0 ? recentSlice.filter(m => m.battles?.result === 'WIN').length / recentSlice.length * 100 : myP_Win
  const olderWR = olderSlice.length >= 3 ? olderSlice.filter(m => m.battles?.result === 'WIN').length / olderSlice.length * 100 : myP_Win
  const trendDiff = olderSlice.length >= 3 ? recentWR - olderWR : 0
  const trendDir: 'up' | 'down' | 'stable' = trendDiff >= 15 ? 'up' : trendDiff <= -15 ? 'down' : 'stable'

  // 2. Assiduidade: % de batalhas da guilda que o jogador participou
  const attendanceRate = gBattles > 0 ? Math.min(100, Math.round((matches.length / gBattles) * 100)) : 0

  // 3. KDA geral
  const kda = totalDeaths > 0 ? parseFloat((totalKills / totalDeaths).toFixed(2)) : totalKills

  // 4. Sobrevivência relativa ao role
  const myDeathsPerBattle = totalDeaths / totalMatches
  const survivalRatio = avgGuildDeathsPerPlayer > 0 ? myDeathsPerBattle / avgGuildDeathsPerPlayer : 1
  const survivalStatus: 'critical' | 'good' | 'normal' = survivalRatio >= 2 ? 'critical' : survivalRatio <= 0.5 ? 'good' : 'normal'

  // 5. IP Efficiency: IP alto + performance baixa = subutilizado
  const ipEfficiency = avgRoleIP > 0 && avgIP > 0 ? Math.round((avgIP / avgRoleIP) * 100) : 100
  const mainWeaponRelPct = enrichedWeapons[0]?.relativePct ?? 0
  const isIPWasted = ipEfficiency >= 105 && mainWeaponRelPct <= -20

  // ============== V2: KILL EVENTS (Morte Precoce + Carrasco) ==================
  const killEventsArr = (killEvents || []) as any[]
  const victimEvents = killEventsArr.filter(e => (e.victim_name || '').toLowerCase() === playerName.toLowerCase())

  // 6. Taxa de Morte Precoce (morreu nos primeiros 60s da luta)
  const earlyDeaths = victimEvents.filter(e => e.is_early_death)
  const taxaMortePrecoce = victimEvents.length > 0
    ? Math.round((earlyDeaths.length / victimEvents.length) * 100)
    : 0

  // 7. Carrasco Pessoal — arma que mais o mata (normalizada)
  const carrascoMap: Record<string, { count: number, weapon: string, weaponNorm: string }> = {}
  victimEvents.forEach(e => {
    const norm = e.killer_weapon_norm || 'Desconhecida'
    if (!carrascoMap[norm]) carrascoMap[norm] = { count: 0, weapon: e.killer_weapon || '', weaponNorm: norm }
    carrascoMap[norm].count++
  })
  const carrascoEntries = Object.values(carrascoMap).sort((a, b) => b.count - a.count)
  const topCarrasco = carrascoEntries[0] || null
  const topCarrascoPct = topCarrasco && victimEvents.length > 0
    ? Math.round((topCarrasco.count / victimEvents.length) * 100)
    : 0

  // Carrasco das últimas 5 CTAs
  const recentKillEvents = victimEvents.slice(0, 5)
  const recentCarrascoMap: Record<string, number> = {}
  recentKillEvents.forEach(e => {
    const norm = e.killer_weapon_norm || 'Desconhecida'
    recentCarrascoMap[norm] = (recentCarrascoMap[norm] || 0) + 1
  })
  const recentCarrascoEntries = Object.entries(recentCarrascoMap).sort((a, b) => b[1] - a[1])
  const topRecentCarrasco = recentCarrascoEntries[0]?.[0] || null

  const playerBattles = matches.map(m => ({
    id: String(m.battle_id),
    startTime: m.battles?.start_time || '',
    opponents: m.battles?.opponents || 'Desconhecido',
    result: m.battles?.result || 'UNKNOWN'
  }))

  return {
    rawMatches: matches,
    playerBattles,
    playerKillEvents: killEventsArr as KillEventItem[],
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
    },
    // Indicadores de coaching (V1 + V2)
    coaching: {
      trendDir,
      trendDiff: Math.round(trendDiff),
      recentWR: Math.round(recentWR),
      attendanceRate,
      kda,
      survivalStatus,
      survivalRatio: parseFloat(survivalRatio.toFixed(1)),
      ipEfficiency,
      isIPWasted,
      avgIP,
      avgRoleIP,
      myDeathsPerBattle: parseFloat(myDeathsPerBattle.toFixed(2)),
      // V2: Kill Events
      taxaMortePrecoce,
      earlyDeathCount: earlyDeaths.length,
      totalKillEvents: victimEvents.length,
      topCarrasco: topCarrasco ? topCarrasco.weaponNorm : null,
      topCarrascoWeapon: topCarrasco ? topCarrasco.weapon : null,
      topCarrascoPct,
      topCarrascoCount: topCarrasco?.count || 0,
      topRecentCarrasco,
    }
  }
}

// ALGORITMO DE COACHING EXPANDIDO — GERA LISTA COMPLETA DE DIAGNÓSTICOS (CARROSSEL)
type CoachStats = {
  weapons: any[]
  totalBattles: number
  trendDir: 'up' | 'down' | 'stable'
  trendDiff: number
  recentWR: number
  attendanceRate: number
  kda: number
  survivalStatus: 'critical' | 'good' | 'normal'
  survivalRatio: number
  isIPWasted: boolean
  ipEfficiency: number
  avgRoleIP: number
  avgIP: number
  myDeathsPerBattle: number
  // V2
  taxaMortePrecoce: number
  earlyDeathCount: number
  totalKillEvents: number
  topCarrasco: string | null
  topCarrascoWeapon: string | null
  topCarrascoPct: number
  topCarrascoCount: number
  topRecentCarrasco: string | null
}

function generateCoachAdviceList(stats: CoachStats): CoachInsight[] {
  const {
    weapons, totalBattles, trendDir, trendDiff, recentWR, attendanceRate, kda, survivalStatus, survivalRatio,
    isIPWasted, ipEfficiency, avgRoleIP, avgIP, myDeathsPerBattle,
    taxaMortePrecoce, earlyDeathCount, totalKillEvents, topCarrasco, topCarrascoWeapon, topCarrascoPct, topCarrascoCount
  } = stats
  
  if (weapons.length === 0) return []

  const list: CoachInsight[] = []
  const pW = weapons[0]
  const pWinRate = Math.round((pW.wins / pW.uses) * 100)

  // 1. [CRÍTICO] MORTE PRECOCE (Morre em <= 60s com defensivas cheias)
  if (taxaMortePrecoce >= 35 && totalKillEvents >= 2) {
    list.push({
      id: 'early-death',
      type: 'danger',
      icon: 'timer_off',
      color: '#ef4444',
      category: '⚠️ Erro Crítico: Defensivas',
      title: `Morte Precoce na Abertura (${taxaMortePrecoce}% das vezes)`,
      text: `Você caiu nos primeiros 60 segundos em ${taxaMortePrecoce}% das suas baixas (${earlyDeathCount} de ${totalKillEvents} mortes). Morrer de cooldown cheio e poção na bolsa é a pior falha de ZvZ. Use poção de resistência antes do choque e mantenha-se alinhado à main zerg.`,
      weaponRaw: pW.rawWeapon
    })
  }

  // 2. [CRÍTICO] RENDIMENTO ABAIXO DO CORE DA GUILDA
  if (pW.relativePct && pW.relativePct <= -15 && pW.uses >= 3) {
    list.push({
      id: 'rel-low',
      type: 'danger',
      icon: 'trending_down',
      color: '#ef4444',
      category: '📉 Rendimento Insuficiente',
      title: `Rendimento com [${pW.weapon}] ${Math.abs(pW.relativePct)}% Abaixo da Média`,
      text: `Seu ${pW.compareLabel} médio está ${Math.abs(pW.relativePct)}% abaixo da média dos outros jogadores que usam essa mesma arma na guilda. Você não está extraindo o potencial do arquétipo — revise rotações de skills e posicionamento no engage.`,
      weaponRaw: pW.rawWeapon
    })
  }

  // 3. [CRÍTICO] BAIXA TAXA DE VITÓRIA COM A ARMA PRINCIPAL
  if (pWinRate <= 40 && pW.uses >= 4) {
    list.push({
      id: 'low-wr-main',
      type: 'danger',
      icon: 'cancel',
      color: '#ef4444',
      category: '❌ Escolha de Armamento',
      title: `Arma Principal Ineficiente (${pWinRate}% WR)`,
      text: `Sua taxa de vitória com [${pW.weapon}] é de apenas ${pWinRate}% em ${pW.uses} lutas. Essa arma não está gerando impacto positivo para a guilda. Recomenda-se testar outra spec ou conversar com a liderança para ajustar a build.`,
      weaponRaw: pW.rawWeapon
    })
  }

  // 4. [CRÍTICO] SOBREVIVÊNCIA CRÍTICA (Feed de Fama)
  if (survivalStatus === 'critical') {
    list.push({
      id: 'survival-crit',
      type: 'danger',
      icon: 'skull',
      color: '#ef4444',
      category: '💀 Sobrevivência Crítica',
      title: `Alta Taxa de Mortes (${myDeathsPerBattle.toFixed(1)}x por Luta)`,
      text: `Você morre ${myDeathsPerBattle.toFixed(1)} vezes por batalha — ${Math.round((survivalRatio - 1) * 100)}% acima da média do seu papel. Cada morte prematura alimenta a fama do inimigo e deixa a Zerg em desvantagem numérica. Priorize sair das poças de dano.`,
      weaponRaw: pW.rawWeapon
    })
  }

  // 5. [CRÍTICO] IP DESPERDIÇADO (Set Caro, Baixo Retorno)
  if (isIPWasted) {
    list.push({
      id: 'ip-wasted',
      type: 'warning',
      icon: 'diamond',
      color: '#f97316',
      category: '💸 Desperdício de Equipamento',
      title: 'IP Alto com Impacto Baixo',
      text: `Seu IP médio é ${avgIP} (vs média ${avgRoleIP} do papel) — você entra com set caro, mas seu dano/cura está -${Math.abs(pW.relativePct)}% abaixo da guilda. O problema não é o tier do seu set, mas a sua tomada de decisão em luta.`,
      weaponRaw: pW.rawWeapon
    })
  }

  // 6. [CRÍTICO] VULNERABILIDADE A CARRASCO INIMIGO
  if (topCarrasco && topCarrascoCount >= 2) {
    const carrascoNome = topCarrasco.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
    list.push({
      id: 'carrasco',
      type: 'warning',
      icon: 'gavel',
      color: '#f97316',
      category: '⚔️ Ponto Fraco Tático',
      title: `Vulnerabilidade Contra: ${carrascoNome}`,
      text: `${topCarrascoPct}% das suas mortes foram causadas por [${carrascoNome}] (${topCarrascoCount} vezes). Você está sendo caçado ou exposto repetidamente ao range dessa arma. Mantenha distância desse arquétipo.`,
      weaponRaw: topCarrascoWeapon
    })
  }

  // 7. [CRÍTICO] MOMENTO DE QUEDA RECENTE
  if (trendDir === 'down' && recentWR < 35) {
    list.push({
      id: 'trend-down',
      type: 'warning',
      icon: 'trending_down',
      color: '#ef4444',
      category: '📉 Momento em Queda',
      title: 'Fase Negativa Recente (WR < 35%)',
      text: `Nas últimas 5 batalhas você venceu apenas ${recentWR}% — uma queda de ${Math.abs(trendDiff)}% em relação ao seu histórico. Algo mudou na sua postura ou na dinâmica da party. Reveja a comunicação no Discord.`,
      weaponRaw: pW.rawWeapon
    })
  }

  // 8. [CRÍTICO] PRESENÇA IRREGULAR
  if (attendanceRate < 40 && totalBattles >= 3) {
    list.push({
      id: 'low-attendance',
      type: 'warning',
      icon: 'event_busy',
      color: '#f97316',
      category: '📅 Frequência em CTAs',
      title: `Presença Baixa (${attendanceRate}% das CTAs)`,
      text: `Você participou de apenas ${attendanceRate}% das batalhas da guilda. Jogar com pouca frequência quebra o ritmo tático e a sintonia com os suportes da sua party.`,
      weaponRaw: null
    })
  }

  // 9. [POSITIVO] TALENTO OCULTO
  for (let i = 1; i < weapons.length; i++) {
    const sec = weapons[i]
    if (sec.uses >= 3) {
      const secWinRate = Math.round((sec.wins / sec.uses) * 100)
      if (secWinRate > pWinRate + 12) {
        list.push({
          id: 'hidden-gem',
          type: 'discovery',
          icon: 'psychology',
          color: 'var(--cyan)',
          category: '💡 Oportunidade Tática',
          title: 'Talento Oculto Detectado!',
          text: `O banco notou algo positivo: com [${sec.weapon}] você atinge ${secWinRate}% de WinRate em ${sec.uses} lutas — vs ${pWinRate}% com sua arma principal [${pW.weapon}]. Considere migrar para essa spec nos treinos.`,
          weaponRaw: sec.rawWeapon
        })
        break
      }
    }
  }

  // 10. [POSITIVO] EVOLUÇÃO / MOMENTO POSITIVO
  if (trendDir === 'up' && trendDiff >= 15) {
    list.push({
      id: 'trend-up',
      type: 'success',
      icon: 'trending_up',
      color: '#10b981',
      category: '📈 Evolução Tática',
      title: 'Momento de Ascensão Recente',
      text: `Excelente momento! Nas últimas 5 batalhas você atingiu ${recentWR}% de WinRate (+${trendDiff}% acima da média geral). Mantenha o foco e a comunicação ativa.`,
      weaponRaw: pW.rawWeapon
    })
  }

  // 11. [POSITIVO] SOBREVIVÊNCIA EXEMPLAR
  if (survivalStatus === 'good' && totalBattles >= 4) {
    list.push({
      id: 'survival-good',
      type: 'success',
      icon: 'verified_user',
      color: '#10b981',
      category: '🛡️ Sobrevivência Exemplar',
      title: 'Sobrevivência de Elite',
      text: `Excelente índice de sobrevivência! Com apenas ${myDeathsPerBattle.toFixed(1)} mortes/luta, você preserva regear e mantém a pressão da Zerg em lutas prolongadas.`,
      weaponRaw: pW.rawWeapon
    })
  }

  // 12. [POSITIVO] RENDIMENTO SUPERIOR AO CORE
  if (pW.relativePct && pW.relativePct >= 20 && pW.uses >= 4) {
    list.push({
      id: 'rel-high',
      type: 'success',
      icon: 'bolt',
      color: '#10b981',
      category: '⚡ Rendimento de Destaque',
      title: `Destaque: ${pW.compareLabel} Superior ao Core`,
      text: `Performance exemplar: seu ${pW.compareLabel} com [${pW.weapon}] é ${pW.relativePct}% SUPERIOR à média dos demais membros da mesma classe.`,
      weaponRaw: pW.rawWeapon
    })
  }

  // 13. [POSITIVO] MAESTRIA T8
  if (pWinRate >= 60 && pW.uses >= 4) {
    list.push({
      id: 'mastery',
      type: 'success',
      icon: 'military_tech',
      color: '#10b981',
      category: '🏅 Maestria em Campo',
      title: `Maestria Validada em [${pW.weapon}] (${pWinRate}% WR)`,
      text: `Arma de assinatura confirmada. Você acumula ${pWinRate}% de vitórias em ${pW.uses} batalhas oficiais utilizando esse equipamento.`,
      weaponRaw: pW.rawWeapon
    })
  }

  // 14. [BASELINE] MONITORAMENTO GERAL
  const winLabel = pWinRate >= 55 ? 'acima da média' : pWinRate >= 45 ? 'dentro do esperado' : 'abaixo do ideal'
  list.push({
    id: 'baseline',
    type: 'neutral',
    icon: 'analytics',
    color: 'var(--cyan)',
    category: '📊 Visão Geral',
    title: 'Monitoramento Padrão Ativo',
    text: `Análise consolidada em ${totalBattles} CTAs oficiais. Arma primária [${pW.weapon}] com ${pWinRate}% de aproveitamento (${winLabel}).`,
    weaponRaw: pW.rawWeapon
  })

  return list
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
  const { coaching } = profile
  const aiInsights = generateCoachAdviceList({
    weapons,
    totalBattles,
    ...coaching
  })
  const mainWeapon = weapons[0]
  
  // Render match history
  const historyFeed = profile.rawMatches.slice(0, 10)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── HEADER: Operador + Resumo Rápido ───────────── */}
      <div className="glass panel anim-up" style={{ padding: '24px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 'var(--radius-sm)',
              background: 'var(--cyan-10)', border: '1px solid var(--cyan-20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--cyan)', flexShrink: 0
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32 }}>person</span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: '0.04em', color: 'var(--text-900)' }}>
                  {playerName.toUpperCase()}
                </h1>
              </div>
              <p className="label-sm" style={{ marginTop: 4, color: 'var(--text-500)' }}>
                Painel Oficial de Mentoria Tática (Player Coaching Hub)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right' }}>
              <div className="label-sm" style={{ color: 'var(--text-400)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                Battle Stats
                <HintIcon text="Média de Kills e Mortes por batalha de Zerg" />
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 800, color: 'var(--text-900)', marginTop: 2 }}>
                {profile.records.kills.val > 0 ? `${profile.coaching.kda} K/D` : '-'} <span style={{ fontSize: 12, color: 'var(--text-500)', fontWeight: 500 }}>AVG</span>
              </div>
            </div>

            <div style={{ width: 1, height: 32, background: 'var(--border-lo)' }} />

            <div style={{ textAlign: 'right' }}>
              <div className="label-sm" style={{ color: 'var(--text-400)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                Win Rate
                <HintIcon text="Percentual de vitórias nas batalhas em que este jogador esteve presente" />
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 900, color: winRate >= 50 ? 'var(--cyan)' : '#ef4444', marginTop: 2 }}>
                {winRate}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── GRID PRINCIPAL: 2 Colunas ─────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
        
        {/* ── LEFT: Radar + Badges + Sub-abas Dinâmicas ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* RADAR + RIVALIDADES */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
            {/* Radar Polygon */}
            <div className="glass panel anim-up" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span className="section-hd">Polígono de Playstyle (Radar)</span>
                <HintIcon text="Mapeamento de 5 eixos do jogador comparado à média do servidor" />
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220 }}>
                <PlayerRadar data={profile.radarData} />
              </div>
            </div>

            {/* Inimigos / Rivais */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Presa Fácil */}
              <div className="glass panel anim-up" style={{ padding: '14px 18px', flex: 1, borderLeft: '3px solid #10b981' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#10b981' }}>call_made</span>
                  <span className="label-sm" style={{ color: 'var(--text-500)' }}>Presa Fácil</span>
                  <div style={{ marginLeft: 'auto' }}>
                    <HintIcon text="Guilda inimiga contra a qual este jogador tem a maior taxa de vitórias" />
                  </div>
                </div>
                {profile.enemies.prey ? (
                  <>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-900)', letterSpacing: '0.02em' }}>
                      {profile.enemies.prey.guild}
                    </div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#10b981', marginTop: 3 }}>
                      Ganha {profile.enemies.prey.winRate}% das vezes
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-400)', fontStyle: 'italic', marginTop: 4 }}>Sem dados suficientes</div>
                )}
              </div>

              {/* Carrasco */}
              <div className="glass panel anim-up" style={{ padding: '14px 18px', flex: 1, borderLeft: '3px solid #ef4444' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#ef4444' }}>skull</span>
                  <span className="label-sm" style={{ color: 'var(--text-500)' }}>Maior Ameaça (Nemesis)</span>
                  <div style={{ marginLeft: 'auto' }}>
                    <HintIcon text="Guilda inimiga que mais causou mortes a este jogador" />
                  </div>
                </div>
                {profile.enemies.nemesis ? (
                  <>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-900)', letterSpacing: '0.02em' }}>
                      {profile.enemies.nemesis.guild}
                    </div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#ef4444', marginTop: 3 }}>
                      {profile.enemies.nemesis.deaths} mortes diretas
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-400)', fontStyle: 'italic', marginTop: 4 }}>Sem rival expressivo</div>
                )}
              </div>
            </div>
          </div>

          {/* 6 BADGES RÁPIDOS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            {/* Badge 1: Tendência */}
            {(() => {
              const { trendDir, trendDiff, recentWR } = coaching
              const isUp = trendDir === 'up'
              const isDown = trendDir === 'down'
              const color = isUp ? '#10b981' : isDown ? '#ef4444' : 'var(--text-500)'
              const bg = isUp ? 'rgba(16,185,129,0.08)' : isDown ? 'rgba(239,68,68,0.08)' : 'rgba(100,116,139,0.06)'
              const border = isUp ? 'rgba(16,185,129,0.25)' : isDown ? 'rgba(239,68,68,0.25)' : 'rgba(100,116,139,0.15)'
              const icon = isUp ? 'trending_up' : isDown ? 'trending_down' : 'trending_flat'
              const label = isUp ? 'Em Alta' : isDown ? 'Em Queda' : 'Estável'
              return (
                <div className="glass" style={{ padding: '12px 14px', background: bg, borderColor: border }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color }}>{icon}</span>
                    <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color }}>Tendência</span>
                    <div style={{ marginLeft: 'auto' }}>
                      <HintIcon text={`Variação de WinRate das últimas 5 lutas vs histórico geral. Positivo = melhorando, Negativo = em queda.`} />
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color, lineHeight: 1 }}>{label}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-400)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                    {recentWR}% ult. 5 lutas
                  </div>
                </div>
              )
            })()}

            {/* Badge 2: Assiduidade */}
            {(() => {
              const { attendanceRate } = coaching
              const isHigh = attendanceRate >= 70
              const isLow = attendanceRate < 35
              const color = isHigh ? '#10b981' : isLow ? '#ef4444' : 'var(--cyan)'
              const bg = isHigh ? 'rgba(16,185,129,0.08)' : isLow ? 'rgba(239,68,68,0.08)' : 'rgba(0,242,255,0.06)'
              const border = isHigh ? 'rgba(16,185,129,0.25)' : isLow ? 'rgba(239,68,68,0.25)' : 'rgba(0,242,255,0.15)'
              const label = isHigh ? 'Exemplar' : isLow ? 'Irregular' : 'Regular'
              return (
                <div className="glass" style={{ padding: '12px 14px', background: bg, borderColor: border }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color }}>event_available</span>
                    <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color }}>Assiduidade</span>
                    <div style={{ marginLeft: 'auto' }}>
                      <HintIcon text={`Participação nas ZvZs da guilda. Acima de 70% = presença assídua no core.`} />
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color, lineHeight: 1 }}>{label}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-400)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                    {attendanceRate}% das CTAs
                  </div>
                </div>
              )
            })()}

            {/* Badge 3: Sobrevivência */}
            {(() => {
              const { survivalStatus, myDeathsPerBattle } = coaching
              const isGood = survivalStatus === 'good'
              const isCrit = survivalStatus === 'critical'
              const color = isGood ? '#10b981' : isCrit ? '#ef4444' : 'var(--cyan)'
              const bg = isGood ? 'rgba(16,185,129,0.08)' : isCrit ? 'rgba(239,68,68,0.08)' : 'rgba(0,242,255,0.06)'
              const border = isGood ? 'rgba(16,185,129,0.25)' : isCrit ? 'rgba(239,68,68,0.25)' : 'rgba(0,242,255,0.15)'
              const label = isGood ? 'Alta' : isCrit ? 'Crítica' : 'Normal'
              return (
                <div className="glass" style={{ padding: '12px 14px', background: bg, borderColor: border }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color }}>favorite</span>
                    <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color }}>Sobrevivência</span>
                    <div style={{ marginLeft: 'auto' }}>
                      <HintIcon text={`Média de mortes por batalha comparada aos jogadores do mesmo papel (Tank/Healer/DPS).`} />
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color, lineHeight: 1 }}>{label}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-400)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                    {myDeathsPerBattle} mortes/luta
                  </div>
                </div>
              )
            })()}

            {/* Badge 4: KDA */}
            {(() => {
              const { kda } = coaching
              const isElite = kda >= 3.0
              const isLow = kda < 1.0
              const color = isElite ? '#10b981' : isLow ? '#ef4444' : 'var(--cyan)'
              const bg = isElite ? 'rgba(16,185,129,0.08)' : isLow ? 'rgba(239,68,68,0.08)' : 'rgba(0,242,255,0.06)'
              const border = isElite ? 'rgba(16,185,129,0.25)' : isLow ? 'rgba(239,68,68,0.25)' : 'rgba(0,242,255,0.15)'
              const label = isElite ? 'Elite' : isLow ? 'Baixo' : 'Normal'
              return (
                <div className="glass" style={{ padding: '12px 14px', background: bg, borderColor: border }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color }}>swords</span>
                    <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color }}>KDA</span>
                    <div style={{ marginLeft: 'auto' }}>
                      <HintIcon text={`Razão de Kills por Morte. Healers e Suportes naturalmente possuem KDA menor.`} />
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color, lineHeight: 1 }}>{label}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-400)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                    {kda} ratio
                  </div>
                </div>
              )
            })()}

            {/* Badge 5: Morte Precoce */}
            {(() => {
              const { taxaMortePrecoce, earlyDeathCount, totalKillEvents } = coaching
              const isAlert = taxaMortePrecoce >= 40 && totalKillEvents >= 2
              const isGood = taxaMortePrecoce === 0 && totalKillEvents >= 2
              const color = isAlert ? '#ef4444' : isGood ? '#10b981' : 'var(--text-500)'
              return (
                <div className="glass" style={{ padding: '12px 14px', background: isAlert ? 'rgba(239,68,68,0.08)' : 'rgba(100,116,139,0.06)', borderColor: isAlert ? 'rgba(239,68,68,0.25)' : 'rgba(100,116,139,0.15)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color }}>timer_off</span>
                    <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color }}>Morte Cedo</span>
                    <div style={{ marginLeft: 'auto' }}>
                      <HintIcon text={`% de mortes nos primeiros 60s da luta (quando ainda tinha todas as defensivas). Acima de 40% = alerta de posicionamento na abertura.`} />
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color, lineHeight: 1 }}>{isAlert ? '⚠️ Precoce' : isGood ? '🛡️ Seguro' : totalKillEvents === 0 ? 'Sem dados' : 'Normal'}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-400)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                    {totalKillEvents > 0 ? `${taxaMortePrecoce}% (${earlyDeathCount}/${totalKillEvents})` : 'Aguardando logs'}
                  </div>
                </div>
              )
            })()}

            {/* Badge 6: Arma Carrasco */}
            {(() => {
              const { topCarrasco, topCarrascoWeapon, topCarrascoPct, topCarrascoCount } = coaching
              const hasCarrasco = !!topCarrasco && topCarrascoCount >= 2
              const color = hasCarrasco ? '#f97316' : 'var(--text-500)'
              const carrascoNome = topCarrasco ? topCarrasco.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : 'Nenhuma'
              return (
                <div className="glass" style={{ padding: '12px 14px', background: hasCarrasco ? 'rgba(249,115,22,0.08)' : 'rgba(100,116,139,0.06)', borderColor: hasCarrasco ? 'rgba(249,115,22,0.25)' : 'rgba(100,116,139,0.15)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color }}>gavel</span>
                    <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color }}>Arma Fatal</span>
                    <div style={{ marginLeft: 'auto' }}>
                      <HintIcon text={`Arma inimiga que mais causou seu abate nas últimas batalhas registradas.`} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {topCarrascoWeapon && <WeaponIcon weapon={topCarrascoWeapon} size={20} />}
                    <div style={{ fontSize: 12, fontWeight: 800, color, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {hasCarrasco ? carrascoNome : 'Diversas'}
                    </div>
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-400)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                    {hasCarrasco ? `${topCarrascoPct}% das mortes (${topCarrascoCount}x)` : 'Sem carrasco fixo'}
                  </div>
                </div>
              )
            })()}
          </div>

          {/* PAINEL DINÂMICO DE ABAS (MENTORIA & FASES vs EFICIÊNCIA DE ARMAS) */}
          <PlayerTabsView
            playerName={playerName}
            insights={aiInsights}
            playerBattles={profile.playerBattles}
            playerKillEvents={profile.playerKillEvents}
            weapons={weapons}
          />
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
    </div>
  )
}
