import { Suspense } from 'react'
import { SearchInput } from '@/components/Navigation'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const sb = createClient(supabaseUrl, supabaseAnonKey)

async function getTopPlayers() {
  // Pega uma boa amostra dos dados (ex: últimas 2000 ocorrências, que cobre muita coisa)
  const res = await sb.from('player_stats').select('player_name').limit(2000).order('battle_id', { ascending: false })
  if (!res.data) return []

  const counts: Record<string, number> = {}
  res.data.forEach(p => {
    if (!p.player_name) return
    counts[p.player_name] = (counts[p.player_name] || 0) + 1
  })

  // Ordena por presença e pega os 20 primeiros
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(entry => ({ name: entry[0], count: entry[1] }))
}

export default async function PlayerSearchPage() {
  const topPlayers = await getTopPlayers()

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '60vh',
      gap: 24,
      padding: 20,
      textAlign: 'center'
    }}>
      <div className="anim-up">
        <div style={{ 
          width: 80, height: 80, borderRadius: 20, 
          background: 'var(--cyan-20)', border: '2px solid var(--cyan)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px auto'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--cyan)' }}>person_search</span>
        </div>
        <h1 className="section-hd" style={{ fontSize: 32, marginBottom: 8 }}>BUSCAR OPERADOR</h1>
        <p style={{ color: 'var(--text-500)', maxWidth: 400, margin: '0 auto 32px auto', fontSize: 14 }}>
          Digite o nome do jogador para acessar o Painel de Mentoria Tática Individual e analisar a performance em ZvZs.
        </p>
      </div>

      <div className="anim-up" style={{ width: '100%', maxWidth: 400, animationDelay: '100ms' }}>
        <div className="glass" style={{ padding: 24, borderRadius: 16 }}>
          <SearchInput style={{ width: '100%' }} />
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: 12, textAlign: 'left' }}>
              <div style={{ fontSize: 10, color: 'var(--text-400)', textTransform: 'uppercase', marginBottom: 4 }}>Dica</div>
              <div style={{ fontSize: 12, color: 'var(--text-700)' }}>Use nomes exatos do jogo (Case Sensitive)</div>
            </div>
            <div style={{ padding: 12, textAlign: 'left' }}>
              <div style={{ fontSize: 10, color: 'var(--text-400)', textTransform: 'uppercase', marginBottom: 4 }}>Dados</div>
              <div style={{ fontSize: 12, color: 'var(--text-700)' }}>Logs baseados em CTAs da guilda</div>
            </div>
          </div>
        </div>
      </div>

      {topPlayers.length > 0 && (
        <div className="anim-up glass panel" style={{ width: '100%', maxWidth: 800, marginTop: 16, animationDelay: '150ms' }}>
          <div className="panel-header" style={{ justifyContent: 'center' }}>
            <span className="section-hd" style={{ fontSize: 14 }}>Operadores Mais Ativos</span>
          </div>
          <div className="panel-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', padding: '20px' }}>
            {topPlayers.map(p => (
              <a 
                key={p.name} 
                href={`/player/${p.name}`}
                className="hover:text-cyan"
                style={{ 
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'var(--bg)', padding: '6px 12px', borderRadius: 20,
                  fontSize: 13, fontWeight: 600, color: 'var(--text-700)', textDecoration: 'none',
                  border: '1px solid var(--border-lo)'
                }}
              >
                {p.name}
                <span style={{ fontSize: 10, color: 'var(--cyan)', background: 'var(--cyan-10)', padding: '2px 6px', borderRadius: 10 }}>{p.count}x</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="anim-up" style={{ marginTop: 40, animationDelay: '200ms' }}>
        <div className="label" style={{ fontSize: 10, letterSpacing: '0.2em' }}>SISTEMA DE MENTORIA INDIVIDUAL</div>
      </div>
    </div>
  )
}
