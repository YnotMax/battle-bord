import { Suspense } from 'react'
import { SearchInput } from '@/components/Navigation'

export default function PlayerSearchPage() {
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

      <div className="anim-up" style={{ marginTop: 40, animationDelay: '200ms' }}>
        <div className="label" style={{ fontSize: 10, letterSpacing: '0.2em' }}>SISTEMA DE MENTORIA INDIVIDUAL</div>
      </div>
    </div>
  )
}
