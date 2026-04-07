'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ZergHQPage() {
  const [loading, setLoading] = useState(true)
  const [roles, setRoles] = useState({ tank: 0, support: 0, healer: 0, melee: 0, range: 0 })
  const [total, setTotal] = useState(0)
  const [localWinRate, setLocalWinRate] = useState(0)

  useEffect(() => {
    async function loadComp() {
      // Puxa as ultimas 5 batalhas
      const { data: bData } = await sb.from('battles').select('id, result').order('start_time', { ascending: false }).limit(5)
      if (!bData || bData.length === 0) {
        setLoading(false)
        return
      }

      const wins = bData.filter(b => b.result === 'WIN').length
      setLocalWinRate(Math.round((wins / bData.length) * 100))

      const battleIds = bData.map(b => b.id)
      const { data: pData } = await sb.from('player_stats').select('role').in('battle_id', battleIds)

      if (pData) {
        const counts = { tank: 0, support: 0, healer: 0, melee: 0, range: 0 }
        pData.forEach(p => {
          const r = (p.role || '').toLowerCase()
          if (r.includes('tank')) counts.tank++
          else if (r.includes('support')) counts.support++
          else if (r.includes('heal')) counts.healer++
          else if (r.includes('melee')) counts.melee++
          else counts.range++
        })
        setRoles(counts)
        setTotal(pData.length)
      }
      setLoading(false)
    }
    loadComp()
  }, [])

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--cyan)' }}>Analisando arquétipos da Zerg...</div>
  }

  const pTank = total > 0 ? (roles.tank / total) * 100 : 0
  const pSupport = total > 0 ? (roles.support / total) * 100 : 0
  const pHealer = total > 0 ? (roles.healer / total) * 100 : 0
  const pMelee = total > 0 ? (roles.melee / total) * 100 : 0
  const pRange = total > 0 ? (roles.range / total) * 100 : 0

  // Conic gradient preparation
  let currentStart = 0
  const slices = [
    { color: '#3b82f6', percent: pTank, label: 'Tank' },
    { color: '#f59e0b', percent: pSupport, label: 'Support' },
    { color: '#10b981', percent: pHealer, label: 'Healer' },
    { color: '#ef4444', percent: pMelee, label: 'Melee' },
    { color: '#f97316', percent: pRange, label: 'Range' },
  ].map(s => {
    const start = currentStart
    const end = currentStart + s.percent
    currentStart = end
    return { ...s, start, end }
  })

  const conicString = slices.map(s => `${s.color} ${s.start}% ${s.end}%`).join(', ')

  // Tactical AI Logic
  let advice = null;
  if (total > 0) {
    if (pHealer < 12) {
      advice = { 
        c: '#ef4444', 
        i: 'warning', 
        t: `ALERTA CRÍTICO: Detectamos colapso provável na Backlane. Com apenas ${pHealer.toFixed(1)}% de Curandeiros, sua taxa de vitória desabou/ficou em ${localWinRate}%. O algoritmo exige recrutamento de Healers até bater 15%+ para estancar a sangria de Mortes.` 
      }
    } else if (pTank < 15 && localWinRate < 50) {
      advice = { 
        c: '#f59e0b', 
        i: 'front_hand', 
        t: `ATENÇÃO ESTRATÉGICA: Linha de frente escassa (${pTank.toFixed(1)}% Tanks) impactando absorção de Dano. Isso justifica o Win Rate negativo de ${localWinRate}%. Considere forçar a rotação de DPS Melees para armas de Engage ou Heavy Maces.` 
      }
    } else if (localWinRate >= 60) {
      advice = { 
        c: '#10b981', 
        i: 'verified_user', 
        t: `ZERG SAUDÁVEL: Arquitetura tática de Classe A validada. A proporção atual de Engage vs Peel entregou um Win Rate excelente de ${localWinRate}%. O fluxo de dano e sustentação está otimizado. Mantenha The Meta!` 
      }
    } else {
      advice = { 
        c: 'var(--cyan)', 
        i: 'analytics', 
        t: `ANÁLISE ESTÁVEL: A composição revela uma mescla padrão, registrando Win Rate mediano de ${localWinRate}%. A balança Padrão indica que as vitórias (ou derrotas) baseiam-se mais em Item Power e Posicionamento do Caller do que deficiência grave de alguma classe.` 
      }
    }
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }} className="anim-up">
        <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--cyan)' }}>biotech</span>
        <div>
          <h1 className="section-hd" style={{ fontSize: 24 }}>Zerg HQ (Composição)</h1>
          <div className="label">Laboratório de Análise Tática e Policiamento de Gear.</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        
        {/* PIE CHART COMPOSITION */}
        <div className="glass panel anim-up">
          <div className="panel-header">
            <span className="section-hd">Composição Média da Zerg</span>
            <div className="label">Baseado nas últimas 5 batalhas catalogadas.</div>
          </div>
          <div className="panel-body" style={{ display: 'flex', alignItems: 'center', gap: 32, padding: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
            
            {/* O Gráfico */}
            <div style={{
              width: 180, height: 180, borderRadius: '50%',
              background: `conic-gradient(${conicString || '#1e293b 0% 100%'})`,
              boxShadow: '0 0 40px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.5)',
              border: '4px solid #0f172a',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <div style={{ 
                width: 110, height: 110, borderRadius: '50%', background: '#0f172a',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column'
              }}>
                <span style={{ color: 'var(--cyan)', fontWeight: 800, fontSize: 24 }}>{total}</span>
                <span className="label-sm">Jogadores</span>
              </div>
            </div>

            {/* Legenda */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {slices.map((s, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: s.color }} />
                  <span style={{ width: 60, fontWeight: 700, color: 'var(--text-900)' }}>{s.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-400)', width: 40, textAlign: 'right' }}>
                    {s.percent.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>

          </div>

          {/* AI ADVICE PANEL */}
          {advice && (
            <div style={{
              margin: '0 24px 24px 24px', padding: 20,
              background: `var(--bg-card, rgba(255, 255, 255, 0.7))`,
              borderLeft: `5px solid ${advice.c}`,
              borderRight: `1px solid rgba(203,213,225,0.2)`,
              borderTop: `1px solid rgba(203,213,225,0.2)`,
              borderBottom: `1px solid rgba(203,213,225,0.2)`,
              borderRadius: 6,
              boxShadow: 'inset 0 2px 4px 0 rgba(255, 255, 255, 0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span className="material-symbols-outlined" style={{ color: advice.c, fontSize: 20 }}>{advice.i}</span>
                <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: '0.05em', color: advice.c, textTransform: 'uppercase' }}>
                  Inteligência Tática de Banco de Dados
                </span>
              </div>
              <div style={{ color: 'var(--text-900)', fontSize: 13, lineHeight: 1.6, fontWeight: 500 }}>
                {advice.t}
              </div>
            </div>
          )}
        </div>

        {/* GEAR CHECKER (INSPECTOR) */}
        <div className="glass panel anim-up" style={{ animationDelay: '60ms' }}>
          <div className="panel-header" style={{ borderBottomColor: '#f59e0b40' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ color: '#f59e0b', fontSize: 20 }}>policy</span>
              <span className="section-hd" style={{ color: '#f59e0b' }}>Zerg Police (Inspetor de Arsenal)</span>
            </div>
            <div className="label">Armas identificadas nas últimas lutas (Necessita da coluna 'weapon' no DB)</div>
          </div>
          <div className="panel-body scroll" style={{ maxHeight: 300, padding: 0 }}>
            {/* Tabela do Policiamento */}
            <SupabaseWeaponTable />
          </div>
        </div>

      </div>
    </>
  )
}

function SupabaseWeaponTable() {
  const [weapons, setWeapons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function loadWeapons() {
      // Puxa lutas mais recentes com a coluna 'weapon'
      const { data, error } = await sb.from('player_stats')
        .select(`player_name, role, weapon, battles!inner(start_time)`)
        .order('battles(start_time)', { ascending: false })
        .limit(30)
      
      if (error) {
        setError(true)
      } else if (data) {
        setWeapons(data)
      }
      setLoading(false)
    }
    loadWeapons()
  }, [])

  if (loading) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-500)' }}>Pescando armamentos...</div>
  if (error) return (
    <div style={{ padding: 24, color: '#ef4444', fontSize: 12 }}>
      A coluna <strong>weapon</strong> ainda não foi criada na tabela <em>player_stats</em> do Supabase. <br/><br/>
      Por favor, vá no painel do seu Supabase, adicione a coluna 'weapon' do tipo texto (text), e rode o script novamente.
    </div>
  )

  return (
    <table className="data-table" style={{ fontSize: 12 }}>
      <thead>
        <tr>
          <th>OPERADOR</th>
          <th>FUNÇÃO</th>
          <th>ARMA EQUIPADA (MAIN)</th>
        </tr>
      </thead>
      <tbody>
        {weapons.map((w, idx) => (
          <tr key={idx}>
            <td style={{ fontWeight: 600, color: 'var(--text-900)' }}>{w.player_name}</td>
            <td>
              <span className={`badge badge-${(w.role || 'dps').toLowerCase().includes('tank') ? 'tank' : (w.role || 'dps').toLowerCase().includes('heal') ? 'healer' : (w.role || 'dps').toLowerCase().includes('support') ? 'support' : 'dps'}`} style={{ fontSize: 9 }}>
                {w.role}
              </span>
            </td>
            <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontWeight: 600 }}>
              {w.weapon || 'NÃO ENCONTRADA'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
