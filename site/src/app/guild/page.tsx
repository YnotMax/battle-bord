import { createClient } from '@supabase/supabase-js'
import { DateFilter } from '../../components/DateFilter'

export const revalidate = 0

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Page data collection might fail during build if not provided in environment.');
}

const sb = createClient(supabaseUrl, supabaseAnonKey)

type BattleRecord = {
  id: string
  opponents: string
  result: string
  start_time: string
}

type PlayerStat = {
  battle_id: string
  player_name: string
  weapon: string
  role: string
  kills: number
  deaths: number
  healing_done: number
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

async function getMentorshipData(days: number) {
  let qBattles = sb.from('battles').select('id, opponents, result, start_time').order('start_time', { ascending: false })
  
  if (days > 0) {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - days)
    qBattles = qBattles.gte('start_time', pastDate.toISOString())
  }

  const [bRes, pRes] = await Promise.all([
    qBattles,
    sb.from('player_stats').select('battle_id, player_name, weapon, role, kills, deaths, healing_done, damage_done')
  ])

  if (!bRes.data || !pRes.data) return null;
  const battles = bRes.data as BattleRecord[]
  const pStats = pRes.data as (PlayerStat & { damage_done: number })[]

  // ============================================
  // 1. RIVALIDADES E MATCHUPS (GUILDAS OPOSTAS)
  // ============================================
  const matchups: Record<string, { guild: string, fights: number, wins: number, losses: number }> = {}

  const validBattleIds = new Set(battles.map(b => b.id))

  battles.forEach(b => {
    if (!b.opponents || b.opponents === 'Vários') return;
    
    const oppList = b.opponents.split(',').map(name => name.trim())
    oppList.forEach(opp => {
      if (!opp || opp.length < 2) return;
      if (!matchups[opp]) matchups[opp] = { guild: opp, fights: 0, wins: 0, losses: 0 }
      
      matchups[opp].fights += 1
      if (b.result === 'WIN') matchups[opp].wins += 1
      else matchups[opp].losses += 1
    })
  })

  let rivalryArray = Object.values(matchups)
                             .sort((a, b) => b.fights - a.fights)
                             .slice(0, 10)

  // ============================================
  // 2. ANALYTICS DE ARMAMENTO (MACRO GUILDA)
  // ============================================
  const wStats: Record<string, { 
    weapon: string, rawWeapon: string, role: string, 
    uses: number, wins: number,
    kills: number, deaths: number, healing: number, damage: number 
  }> = {}

  // ============================================
  // 3. RANKING DE OFICIAIS (PLAYERS)
  // ============================================
  const pLeaderboard: Record<string, {
    name: string, fights: number, kills: number, deaths: number, healing: number, assist: number, damage: number
  }> = {}

  pStats.forEach(p => {
    // Only process stats for the battles within the date range!
    if (!validBattleIds.has(p.battle_id)) return;

    // Processa Armas
    const wRaw = p.weapon || "Desconhecida"
    const w = formatWeaponName(wRaw) 

    if (!wStats[w]) wStats[w] = { weapon: w, rawWeapon: wRaw, role: p.role, uses: 0, wins: 0, kills: 0, deaths: 0, healing: 0, damage: 0 }
    
    wStats[w].uses += 1
    wStats[w].kills += p.kills
    wStats[w].deaths += p.deaths
    wStats[w].healing += p.healing_done
    wStats[w].damage += p.damage_done || 0
    
    const parentBattle = battles.find(btl => btl.id === p.battle_id)
    if (parentBattle?.result === 'WIN') wStats[w].wins += 1

    // Processa Players
    const plName = p.player_name || "Membro Oculto"
    if (!pLeaderboard[plName]) pLeaderboard[plName] = { name: plName, fights: 0, kills: 0, deaths: 0, healing: 0, assist: 0, damage: 0 }
    
    pLeaderboard[plName].fights += 1
    pLeaderboard[plName].kills += p.kills
    pLeaderboard[plName].deaths += p.deaths
    pLeaderboard[plName].healing += p.healing_done
    pLeaderboard[plName].damage += p.damage_done || 0
  })

  const wArray = Object.values(wStats)
  const plArray = Object.values(pLeaderboard)

  // Rank Armas
  const topKillers = [...wArray].sort((a, b) => b.kills - a.kills).slice(0, 8)
  const topDamage = [...wArray].filter(x => x.uses >= 3).sort((a, b) => (b.damage / b.uses) - (a.damage / a.uses)).slice(0, 5)
  const topHealers = [...wArray].filter(x => x.healing > 0).sort((a, b) => (b.healing / b.uses) - (a.healing / a.uses)).slice(0, 5)
  const safestWeapons = [...wArray].filter(x => x.uses >= 5).sort((a, b) => (a.deaths / a.uses) - (b.deaths / b.uses)).slice(0, 8)
  
  // Pick Rate Armas
  const topPicked = [...wArray].sort((a, b) => b.uses - a.uses).slice(0, 5)
  const bottomPicked = [...wArray].filter(w => w.uses > 0).sort((a, b) => a.uses - b.uses).slice(0, 5)

  // Métrica de armas: As Off-Metas (Menos usadas mas que geraram vitórias)
  const offMetaSecretas = [...wArray].filter(x => x.uses >= 2 && x.uses <= Math.max(5, battles.length*0.2) && (x.wins / x.uses) >= 0.50).sort((a,b) => (b.wins/b.uses) - (a.wins/a.uses)).slice(0, 5)

  // Rank Players
  const topPlayerKillers = [...plArray].filter(p => p.fights >= 3).sort((a, b) => b.kills - a.kills).slice(0, 8)
  const topPlayerDamage = [...plArray].filter(p => p.fights >= 3).sort((a, b) => (b.damage / b.fights) - (a.damage / a.fights)).slice(0, 8)
  const topPlayerHealers = [...plArray].filter(p => p.fights >= 3 && p.healing > 1000).sort((a, b) => (b.healing / b.fights) - (a.healing / a.fights)).slice(0, 8)
  const safestPlayers = [...plArray].filter(p => p.fights >= 5).sort((a, b) => (a.deaths / a.fights) - (b.deaths / b.fights)).slice(0, 8)

  const warningWeapons = wArray.filter(w => w.uses >= Math.max(5, battles.length*0.3) && (w.wins / w.uses) < 0.40)

  return {
    battlesAnalyzed: battles.length,
    rivalry: rivalryArray,
    weapons: { killers: topKillers, damage: topDamage, healers: topHealers, safest: safestWeapons, offmeta: offMetaSecretas, topPicked, bottomPicked, warnings: warningWeapons.sort((a,b) => (a.wins/a.uses) - (b.wins/b.uses)) },
    players: { killers: topPlayerKillers, damage: topPlayerDamage, healers: topPlayerHealers, safest: safestPlayers }
  }
}

export default async function MentorshipGlobalPage(props: { searchParams: Promise<{ days?: string }> }) {
  const searchParams = props.searchParams ? await props.searchParams : {}
  const days = parseInt(searchParams.days || '0')
  const data = await getMentorshipData(days)

  if (!data) return <div style={{ padding: 40, textAlign: 'center' }}>Coletando dados da balança cósmica...</div>

  const { rivalry, weapons, players, battlesAnalyzed } = data

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' }} className="anim-up">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ 
            width: 56, height: 56, borderRadius: 12, background: 'var(--amber-20)', border: '2px solid var(--amber)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--amber)' }}>military_tech</span>
          </div>
          <div>
            <h1 className="section-hd" style={{ fontSize: 28, color: 'var(--amber)' }}>
              Inteligência de Guilda Global
            </h1>
            <div className="label">
              Análise Avançada de Meta Armamento e Performance (Avaliadas: {battlesAnalyzed} lutas)
            </div>
          </div>
        </div>

        {/* CONTROLE DE FILTRO */}
        <div>
          <DateFilter />
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) 400px',
        gap: 20,
      }}>

        {/* COLUNA ESQUERDA: ARMAMENTO E PLAYERS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* ==============================================
              SESSÃO DE JOGADORES (AS LENDAS)
             ============================================== */}
          <div className="anim-up" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 className="section-hd" style={{ fontSize: 18, color: 'var(--text-600)' }}>🏆 Ranking de Jogadores (Oficiais da Zerg)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: 16 }}>
              
              {/* PLAYERS - TOP FRAGGERS */}
              <div className="glass panel" style={{ borderTop: '3px solid #ef4444', height: 320, display: 'flex', flexDirection: 'column' }}>
                <div className="panel-header" style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.05)' }}>
                  <span className="section-hd" style={{ fontSize: 13, color: '#ef4444' }}>Top Kills (Abates)</span>
                </div>
                <div className="panel-body scroll" style={{ padding: 0 }}>
                  {players.killers.map((p, i) => (
                    <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-400)', width: 14 }}>{i+1}.</span>
                        <a href={`/player/${p.name}`} style={{ fontWeight: 800, fontSize: 12, color: 'var(--text-900)', textDecoration: 'none' }} className="hover:text-cyan">{p.name}</a>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#ef4444' }}>{p.kills} K</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* PLAYERS - TOP DAMAGE */}
              <div className="glass panel" style={{ borderTop: '3px solid #f97316', height: 320, display: 'flex', flexDirection: 'column' }}>
                <div className="panel-header" style={{ padding: '12px 16px', background: 'rgba(249, 115, 22, 0.05)' }}>
                  <span className="section-hd" style={{ fontSize: 13, color: '#f97316' }}>Top Dano Bruto (DPS Médio)</span>
                </div>
                <div className="panel-body scroll" style={{ padding: 0 }}>
                  {players.damage.map((p, i) => (
                    <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-400)', width: 14 }}>{i+1}.</span>
                        <a href={`/player/${p.name}`} style={{ fontWeight: 800, fontSize: 12, color: 'var(--text-900)', textDecoration: 'none' }} className="hover:text-cyan">{p.name}</a>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#f97316' }}>{Math.round(p.damage / p.fights).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* PLAYERS - TOP HEALERS */}
              <div className="glass panel" style={{ borderTop: '3px solid #10b981', height: 320, display: 'flex', flexDirection: 'column' }}>
                <div className="panel-header" style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.05)' }}>
                  <span className="section-hd" style={{ fontSize: 13, color: '#10b981' }}>Top Curadores (Heal Vivo)</span>
                </div>
                <div className="panel-body scroll" style={{ padding: 0 }}>
                  {players.healers.map((p, i) => (
                    <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-400)', width: 14 }}>{i+1}.</span>
                        <a href={`/player/${p.name}`} style={{ fontWeight: 800, fontSize: 12, color: 'var(--text-900)', textDecoration: 'none' }} className="hover:text-cyan">{p.name}</a>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#10b981' }}>{Math.round(p.healing / p.fights).toLocaleString()} hp</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* PLAYERS - MURALHA */}
              <div className="glass panel" style={{ borderTop: '3px solid var(--cyan)', height: 320, display: 'flex', flexDirection: 'column' }}>
                <div className="panel-header" style={{ padding: '12px 16px', background: 'rgba(6, 182, 212, 0.05)' }}>
                  <span className="section-hd" style={{ fontSize: 13, color: 'var(--cyan)' }}>Maior Sobrevivência (Tanks)</span>
                </div>
                <div className="panel-body scroll" style={{ padding: 0 }}>
                  {players.safest.map((p, i) => {
                    const mortalidade = (p.deaths / p.fights) * 100
                    return (
                      <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-400)', width: 14 }}>{i+1}.</span>
                          <a href={`/player/${p.name}`} style={{ fontWeight: 800, fontSize: 12, color: 'var(--text-900)', textDecoration: 'none' }} className="hover:text-cyan">{p.name}</a>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--cyan)' }}>{Math.round(100 - mortalidade)}% Viva</div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          </div>


          {/* ==============================================
              SESSÃO DE ARMAMENTO
             ============================================== */}
          <div className="anim-up" style={{ display: 'flex', flexDirection: 'column', gap: 12, animationDelay: '40ms' }}>
            <h2 className="section-hd" style={{ fontSize: 18, color: 'var(--text-600)' }}>⚔️ Ranking Global de Arquétipos (Armas)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>
              {/* KILLERS WEAPONS */}
              <div className="glass panel" style={{ borderLeft: '4px solid #ef4444', height: 400, display: 'flex', flexDirection: 'column' }}>
                <div className="panel-header" style={{ padding: '12px 16px' }}>
                  <span className="section-hd" style={{ fontSize: 13 }}>Mais Abates Coletivos</span>
                </div>
                <div className="panel-body scroll" style={{ padding: 0 }}>
                  {weapons.killers.map((w, i) => {
                    const albion2d_link = `https://albiononline2d.com/pt/item/id/T8_${w.rawWeapon.replace(/^T\d_/, '').split('@')[0]}`;
                    return (
                      <div key={w.weapon} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-400)', width: 14 }}>{i+1}.</span>
                          <a href={albion2d_link} target="_blank" rel="noreferrer" style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-900)', textDecoration: 'none' }} className="hover:text-cyan">
                            {w.weapon}
                          </a>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#ef4444' }}>{w.kills} Kills</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* DAMAGE WEAPONS */}
              <div className="glass panel" style={{ borderLeft: '4px solid #f97316', height: 400, display: 'flex', flexDirection: 'column' }}>
                <div className="panel-header" style={{ padding: '12px 16px' }}>
                  <span className="section-hd" style={{ fontSize: 13 }}>Maior Dano Médio (DPS)</span>
                </div>
                <div className="panel-body scroll" style={{ padding: 0 }}>
                  {weapons.damage.map((w, i) => {
                    const albion2d_link = `https://albiononline2d.com/pt/item/id/T8_${w.rawWeapon.replace(/^T\d_/, '').split('@')[0]}`;
                    return (
                      <div key={w.weapon} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-400)', width: 14 }}>{i+1}.</span>
                          <a href={albion2d_link} target="_blank" rel="noreferrer" style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-900)', textDecoration: 'none' }} className="hover:text-cyan">
                            {w.weapon}
                          </a>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#f97316' }}>{Math.round(w.damage/w.uses).toLocaleString()} avg</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* HEALERS E OFF-META */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                 <div className="glass panel" style={{ borderLeft: '4px solid #10b981', display: 'flex', flexDirection: 'column' }}>
                    <div className="panel-header" style={{ padding: '12px 16px' }}><span className="section-hd" style={{ fontSize: 11 }}>Armas com Mais Cura Média</span></div>
                    <div className="panel-body scroll" style={{ padding: 0 }}>
                      {weapons.healers.map((w, i) => {
                        const albion2d_link = `https://albiononline2d.com/pt/item/id/T8_${w.rawWeapon.replace(/^T\d_/, '').split('@')[0]}`;
                        return (
                        <div key={w.weapon} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <a href={albion2d_link} target="_blank" rel="noreferrer" style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-900)', textDecoration: 'none'}} className="hover:text-cyan">{w.weapon}</a>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#10b981' }}>{Math.round(w.healing / w.uses).toLocaleString()} hp/luta</span>
                        </div>
                      )})}
                    </div>
                 </div>

                 <div className="glass panel" style={{ borderLeft: '4px solid var(--amber)', display: 'flex', flexDirection: 'column' }}>
                    <div className="panel-header" style={{ padding: '12px 16px' }}><span className="section-hd" style={{ fontSize: 11 }}>Armas Fora do Meta (Mais Vitórias Mistas)</span></div>
                    <div className="panel-body scroll" style={{ padding: 0 }}>
                      {weapons.offmeta.length > 0 ? weapons.offmeta.map((w) => {
                        const albion2d_link = `https://albiononline2d.com/pt/item/id/T8_${w.rawWeapon.replace(/^T\d_/, '').split('@')[0]}`;
                        return (
                        <div key={w.weapon} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <a href={albion2d_link} target="_blank" rel="noreferrer" style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-900)', textDecoration: 'none'}} className="hover:text-cyan">{w.weapon}</a>
                            <span style={{ fontSize: 10, color: 'var(--text-400)'}}>({w.uses} Picks)</span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--amber)' }}>{Math.round((w.wins / w.uses)*100)}% Vitória</span>
                        </div>
                      )}) : <div style={{ padding: 16, fontSize: 11, color: 'var(--text-500)', fontStyle: 'italic' }}>Nada fora do comum está se pagando.</div>}
                    </div>
                 </div>
              </div>
            </div>
          </div>
          
          {/* ==============================================
              USO GERAL DA GUILDA 
             ============================================== */}
          <div className="anim-up" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16, animationDelay: '60ms' }}>
             {/* Mais Usadas */}
             <div className="glass panel">
               <div className="panel-header" style={{ padding: '12px 16px' }}>
                  <span className="section-hd" style={{ fontSize: 13, color: 'var(--cyan)' }}>O Meta Absoluto (Mais Usados da Zerg)</span>
               </div>
               <div className="panel-body" style={{ padding: 0 }}>
                 {weapons.topPicked.map((w, i) => {
                    const absLink = `https://albiononline2d.com/pt/item/id/T8_${w.rawWeapon.replace(/^T\d_/, '').split('@')[0]}`;
                    return(
                      <div key={w.weapon} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                         <a href={absLink} target="_blank" rel="noreferrer" style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-900)', textDecoration: 'none'}} className="hover:text-cyan">{w.weapon}</a>
                         <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--cyan)' }}>{w.uses} Escolhas</span>
                      </div>
                 )})}
               </div>
             </div>

             {/* Menos Usadas */}
             <div className="glass panel">
               <div className="panel-header" style={{ padding: '12px 16px' }}>
                  <span className="section-hd" style={{ fontSize: 13, color: 'var(--text-500)' }}>As Esquecidas (Menos Usados da Zerg)</span>
               </div>
               <div className="panel-body" style={{ padding: 0 }}>
                 {weapons.bottomPicked.map((w, i) => {
                    const absLink = `https://albiononline2d.com/pt/item/id/T8_${w.rawWeapon.replace(/^T\d_/, '').split('@')[0]}`;
                    return(
                      <div key={w.weapon} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                         <a href={absLink} target="_blank" rel="noreferrer" style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-500)', textDecoration: 'none'}} className="hover:text-cyan">{w.weapon}</a>
                         <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-300)' }}>Somente {w.uses}x</span>
                      </div>
                 )})}
               </div>
             </div>
          </div>
        </div>

        {/* COLUNA DIREITA: RIVALIDADES E RED FLAGS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          <div className="glass panel anim-up">
            <div className="panel-header">
              <span className="section-hd">Tribunal de Rivalidades (Guildas Opostas)</span>
            </div>
            <div className="panel-body scroll" style={{ padding: 0 }}>
              {rivalry.map((r, i) => {
                const wr = Math.round((r.wins / r.fights) * 100)
                const isNemesis = wr < 45
                const isPrey = wr >= 60

                return (
                  <div key={r.guild} style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border)',
                    background: i % 2 === 0 ? 'var(--bg-card)' : 'transparent',
                    display: 'flex', flexDirection: 'column', gap: 8
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-900)' }}>{r.guild}</div>
                      <div style={{ 
                        fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 4,
                        background: isNemesis ? '#ef444420' : isPrey ? '#10b98120' : 'var(--cyan-20)',
                        color: isNemesis ? '#ef4444' : isPrey ? '#10b981' : 'var(--cyan)'
                      }}>
                        {r.fights} CONFRONTOS
                      </div>
                    </div>
                    
                    {/* Barra de Progresso Customizada do WinRate */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4, fontWeight: 700 }}>
                        <span style={{ color: 'var(--text-500)' }}>Nosso WinRate:</span>
                        <span style={{ color: isNemesis ? '#ef4444' : 'var(--text-900)' }}>{wr}%</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                        <div style={{ width: `${wr}%`, background: isNemesis ? '#ef4444' : isPrey ? '#10b981' : 'var(--cyan)' }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* LISTA NEGRA DAS ARMAS (TREND ANALYSIS) */}
          <div className="glass panel anim-up">
            <div className="panel-header" style={{ borderBottomColor: 'rgba(239, 68, 68, 0.2)'}}>
              <span className="section-hd" style={{ color: '#ef4444' }}>⚠️ Red Flags (Perigo de Composição)</span>
            </div>
            <div className="panel-body scroll">
              {weapons.warnings.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Arma Limitante</th>
                      <th style={{ textAlign: 'center' }}>Vezes Escolhida</th>
                      <th style={{ textAlign: 'right' }}>WinRate com Ela</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weapons.warnings.map(w => {
                       const albion2d_link = `https://albiononline2d.com/pt/item/id/T8_${w.rawWeapon.replace(/^T\d_/, '').split('@')[0]}`;
                       return (
                      <tr key={w.weapon}>
                        <td style={{ fontWeight: 700 }}>
                          <a href={albion2d_link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'var(--text-900)' }} className="hover:text-cyan">
                            {w.weapon}
                          </a>
                        </td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{w.uses}x</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#ef4444' }}>
                          {Math.round((w.wins / w.uses) * 100)}%
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: 20, color: 'var(--text-400)', textAlign: 'center', fontSize: 13 }}>
                  Zerg disciplinada. Nenhuma arma que usamos está com desempenho negativo crônico.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </>
  )
}
