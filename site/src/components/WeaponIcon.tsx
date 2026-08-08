'use client'

import React from 'react'

export function WeaponIcon({ rawWeapon, size = 24 }: { rawWeapon: string, size?: number }) {
  if (!rawWeapon || rawWeapon === 'Desconhecida') {
    return (
      <div style={{ width: size, height: size, background: 'var(--border-lo)', borderRadius: 4 }} />
    )
  }

  // A API do Albion usa o rawWeapon exato, apenas tirando o sufixo de enchant (@1, @2, @3)
  // e.g. T4_MAIN_ARCANESTAFF@3 → T4_MAIN_ARCANESTAFF
  let baseWeapon = rawWeapon.split('@')[0]
  
  // A API oficial exige o Tier no começo do ID (ex: T4_, T5_, T8_).
  // Se o AlbionBB API mandou a arma sem tier (ex: "MAIN_MACE_CRYSTAL"), 
  // nós colocamos "T8_" como padrão para a imagem carregar corretamente
  // e exibir a versão visual T8 do item.
  if (!/^T\d_/.test(baseWeapon)) {
    baseWeapon = `T8_${baseWeapon}`
  }
  const imgUrl = `https://render.albiononline.com/v1/item/${baseWeapon}.png?size=48`

  return (
    <img 
      src={imgUrl} 
      alt={rawWeapon}
      width={size}
      height={size}
      style={{
        borderRadius: 4,
        background: 'rgba(0,0,0,0.2)',
        border: '1px solid var(--border-lo)',
        objectFit: 'contain'
      }}
      onError={(e) => {
        // Fallback em caso de erro no render
        (e.target as HTMLImageElement).style.display = 'none'
      }}
    />
  )
}
