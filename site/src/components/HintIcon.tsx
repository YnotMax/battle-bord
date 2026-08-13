/**
 * HintIcon — Ícone "?" que exibe um tooltip ao passar o mouse.
 * Usar assim: <HintIcon text="Explicação aqui" />
 * Opcional: pos="left" para alinhar o tooltip pela direita (perto da borda da tela).
 */
export function HintIcon({
  text,
  pos,
}: {
  text: string
  pos?: 'left' | 'right'
}) {
  return (
    <span
      data-tooltip={text}
      data-tooltip-pos={pos}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 15,
        height: 15,
        borderRadius: '50%',
        background: 'rgba(100,116,139,0.18)',
        border: '1px solid rgba(100,116,139,0.35)',
        color: '#94a3b8',
        fontSize: 9,
        fontWeight: 700,
        cursor: 'help',
        flexShrink: 0,
        lineHeight: 1,
        /* Reset explícito para não herdar nada do pai */
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: 0,
        textTransform: 'none',
        userSelect: 'none',
        transition: 'background 0.15s, color 0.15s',
        verticalAlign: 'middle',
        marginLeft: 4,
      }}
    >
      ?
    </span>
  )
}
