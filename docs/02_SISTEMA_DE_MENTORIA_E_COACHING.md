# 02 — Sistema de Mentoria Tática & AI Coaching

> **Battle Board I M O R T A I S** — Especificação Técnica Completa de Mentoria, Diagnósticos de IA, Fases de Combate e Origem dos Dados.

---

## 1. Origem dos Dados & Fluxo de Coleta

Os dados que alimentam toda a inteligência da Mentoria Tática vêm da combinação de duas APIs externas sincronizadas no Supabase:

```
┌───────────────────────────┐      ┌───────────────────────────┐
│       AlbionBB API        │      │    Albion Online API      │
│   (api.albionbb.com)      │      │ (gameinfo.albiononline)   │
└─────────────┬─────────────┘      └─────────────┬─────────────┘
              │                                  │
    [crawler.py (Passo 1)]             [crawler_kills.py (Passo 2)]
              │                                  │
              ▼                                  ▼
      Tabelas Supabase:                  Tabela Supabase:
   • `battles` (Resultado, Horário)       • `kill_events` (Timestamp,
   • `player_stats` (Dano, Cura, IP,        Vítima, Assassino, Arma,
      Armas, Kills, Mortes)                 Segundos de luta, EarlyDeath)
```

---

## 2. O Carrossel de AI Coaching (`/player/[name]`)

No perfil do operador, a IA executa o algoritmo `generateCoachAdviceList()` que avalia **todas** as regras e compila uma lista de diagnósticos exibidos em um **Carrossel Interativo com setas `<` e `>`** ([CoachCarousel.tsx](file:///d:/estudos/albion%20online/battle%20bord/site/src/components/CoachCarousel.tsx)).

### Tabela Completa de Regras & Diagnósticos de IA:

| # | Categoria & Ícone | Diagnóstico / Título | Gatilho Matemático (Condição) | Fonte dos Dados | Objetivo Pedagógico & Feedback |
|---|---|---|---|---|---|
| 1 | ⚠️ **Erro Crítico** (`timer_off`) | **Morte Precoce na Abertura** | `taxaMortePrecoce >= 35%` e `totalKillEvents >= 2` | `kill_events.is_early_death` | Alerta que o jogador morre nos primeiros 60s com poções e defensivas cheias. Cobra uso de Poção de Resistência no 1º choque. |
| 2 | 📉 **Rendimento Insuficiente** (`trending_down`) | **Rendimento Abaixo do Core** | `relativePct <= -15%` e `uses >= 3` | `player_stats.damage_done` / `healing_done` vs média da Guilda | Alerta que o dano/cura está 15% a 30% abaixo dos outros membros que usam a mesma arma. |
| 3 | ❌ **Armamento Ineficiente** (`cancel`) | **Arma Principal Ineficiente** | `pWinRate <= 40%` e `uses >= 4` | `player_stats` agrupado por arma | Cobra a troca de arma ou ajuste de build quando a spec mais jogada não gera vitórias para a Zerg. |
| 4 | 💀 **Sobrevivência Crítica** (`skull`) | **Alta Taxa de Mortes (Feed)** | `survivalStatus === 'critical'` (`mortes/luta >= 2x` média do role) | `player_stats.deaths` vs média do papel | Alerta que o jogador morre o dobro da média da classe, alimentando a fama inimiga e desfalcando a party. |
| 5 | 💸 **Desperdício de Gear** (`diamond`) | **IP Alto com Impacto Baixo** | `isIPWasted` (`avgIP >= avgRoleIP + 5%` e `relativePct <= -20%`) | `player_stats.average_ip` vs `damage/healing` | Cobra o jogador que entra com set caro (T8.3/T8.4) mas não converte em impacto na luta. |
| 6 | ⚔️ **Ponto Fraco Tático** (`gavel`) | **Vulnerabilidade a Carrasco** | `topCarrascoCount >= 2` | `kill_events.killer_weapon_norm` | Identifica a arma inimiga que mais o abate e instrui a respeitar o range desse arquétipo. |
| 7 | 📉 **Momento em Queda** (`trending_down`) | **Fase Negativa Recente** | `trendDir === 'down'` e `recentWR < 35%` | `battles.result` (últimas 5 lutas vs histórico) | Identifica queda abrupta de rendimento recente e recomenda alinhar postura com o shotcaller. |
| 8 | 📅 **Frequência em CTAs** (`event_busy`) | **Presença Baixa / Irregular** | `attendanceRate < 40%` e `totalBattles >= 3` | `player_stats.battle_id` count vs total de batalhas da guilda | Alerta que a falta de presença quebra o entrosamento com os suportes e a party. |
| 9 | 💡 **Oportunidade Tática** (`psychology`) | **Talento Oculto Detectado!** | `secWinRate > pWinRate + 12%` e `secUses >= 3` | `player_stats` comparando armas secundárias | Descobre armas secundárias onde o jogador atinge WinRate muito superior ao da arma principal. |
| 10 | 📈 **Evolução Tática** (`trending_up`) | **Momento de Ascensão** | `trendDir === 'up'` e `trendDiff >= 15%` | `battles.result` (últimas 5 lutas) | Reconhece evolução positiva e consistência nas últimas CTAs. |
| 11 | 🛡️ **Sobrevivência Exemplar** (`verified_user`) | **Sobrevivência de Elite** | `survivalStatus === 'good'` e `totalBattles >= 4` | `player_stats.deaths` vs média do papel | Parabeniza a preservação de regear e sustentação em lutas longas. |
| 12 | ⚡ **Rendimento de Destaque** (`bolt`) | **Dano/Cura Superior ao Core** | `relativePct >= 20%` e `uses >= 4` | `player_stats` vs média do core | Destaca jogadores cujo dano ou cura supera em 20%+ os outros usuários da mesma spec. |
| 13 | 🏅 **Maestria em Campo** (`military_tech`) | **Maestria Validada T8** | `pWinRate >= 60%` e `uses >= 4` | `player_stats` com arma principal | Certifica a arma de assinatura do operador como pilar de vitória da guilda. |
| 14 | 📊 **Visão Geral** (`analytics`) | **Monitoramento Padrão Ativo** | *Sempre incluído como baseline* | Agregação consolidada geral | Resumo executivo de amostragem, spec primária e taxa de vitórias acumulada. |

---

## 3. As 5 Fases de Combate ZvZ Realistas (0 a 30+ minutos) (`BattleTimeline.tsx`)

Como confrontos de ZvZ de larga escala no Albion Online podem durar de 15 a mais de 30 minutos (disputas de castelo, vortexes, regears e chokepoints), a linha do tempo divide a batalha em **5 fases táticas reais**:

$$\text{seconds\_into\_battle} = \text{timestamp}(\text{kill\_event}) - \text{start\_time}(\text{battle})$$

```
┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│  0 a 2 min   │  2 a 5 min   │  5 a 12 min  │ 12 a 20 min  │ 20 a 30m+    │
│  1º Choque   │  1ºs Resets  │  Batalha     │  Guerra de   │  Finalização │
│  (Abertura)  │  (Cooldowns) │  Sustentada  │  Desgaste    │  & Clean-up  │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

1. **0 a 2 min (1º Choque / Abertura):** Choque inicial de zergs onde todos têm 100% de poções e defensivas cheias.
2. **2 a 5 min (Primeiros Resets):** Habilidades principais em recarga, reposicionamento e recuos táticos.
3. **5 a 12 min (Batalha Sustentada):** Meio de jogo, guerra posicional em chokepoints e sustentação contínua de Healers/Tanks.
4. **12 a 20 min (Guerra de Desgaste):** Desgaste de consumíveis, chegada de reforços, regears e re-engages profundos.
5. **20 a 30 min+ (Finalização / Wipe):** Fase tardia de exaustão extrema da zerg adversária, perseguição e clean-up final.

### Como o Painel se adapta no Perfil Individual vs Visão de Guilda:
* **Visão de Guilda (`/guild`):** Compara o total de **Baixas da Guilda 🟥** vs **Abates Realizados 🟩** em cada fase. Detecta se a guilda sofre wipes na entrada (0-2m) ou nos primeiros resets (2-5m).
* **Perfil do Jogador (`/player/[name]`):** Compara as **Mortes Pessoais 🟥** vs **Abates Pessoais 🟩** daquele jogador específico. Emite diagnósticos individuais (ex: *"Morte Precoce: 60% das suas mortes acontecem no 1º choque (0-2 min)"* ou *"Especialista em Lutas Longas (12-30m+)"*).

---

## 4. As 6 Badges do Operador

Localizadas logo abaixo do Polígono de Playstyle (Radar) no perfil do jogador:

| Badge | Métrica & Cálculo | Critérios Visuais |
|---|---|---|
| **📈 Tendência** | $\Delta WR = WR_{\text{últimas 5}} - WR_{\text{geral}}$ | 🟩 $\ge +15\%$ (Em Alta) \| 🟥 $\le -15\%$ (Em Queda) \| ⬜ Estável |
| **🏃 Assiduidade** | $\min\left(100, \text{round}\left(\frac{\text{CTAs jogadas}}{\text{Total CTAs guilda}} \times 100\right)\right)$ | 🟩 $\ge 70\%$ (Exemplar) \| 🟥 $< 35\%$ (Irregular) \| 🟦 Regular |
| **🛡️ Sobrevivência** | $\text{Ratio} = \frac{\text{Mortes/luta do player}}{\text{Média mortes do role}}$ | 🟩 $\le 0.6$ (Alta) \| 🟥 $\ge 1.8$ (Crítica) \| 🟦 Normal |
| **⚡ KDA** | $\frac{\text{Kills Totais}}{\max(1, \text{Mortes Totais})}$ | 🟩 $\ge 3.0$ (Elite) \| 🟥 $< 1.0$ (Baixo) \| 🟦 Normal |
| **⏱️ Morte Cedo** | $\frac{\text{Mortes em } \le 60\text{s}}{\text{Total mortes com log}} \times 100$ | 🟥 $\ge 40\%$ (⚠️ Precoce) \| 🟩 $0\%$ (🛡️ Seguro) \| ⬜ Sem dados |
| **🗡️ Arma Fatal** | Arma inimiga que mais causou abates contra o jogador | 🟧 $\ge 2$ mortes (Ícone oficial + nome formatado) \| ⬜ Diversas |

---

## 5. Navegação Ergonômica por Sub-Abas (`PlayerTabsView.tsx`)

Para garantir excelente usabilidade sem exigir que o usuário role a tela verticalmente por quilômetros, a área analítica do jogador é dividida em duas sub-abas:

1. **Aba 🧠 Mentoria & Fases de Combate:**
   * Carrossel de Diagnósticos de IA (`CoachCarousel.tsx`) com setas de navegação `< >`.
   * Gráfico de barras das 4 Fases de Combate (`BattleTimeline.tsx`) e Top Armas Inimigas Fatais.
2. **Aba ⚔️ Eficiência de Armas (Meta vs Core):**
   * Tabela comparativa completa de armas, DPS/luta, Heal/luta, KDA, WinRate e percentual Relativo Core vs guilda.
