# Lista de Tarefas: Battle Board IMORTAIS

Acompanhe por aqui nosso progresso técnico na construção de cada fase.

- `[x]` **Fase 1: A Fundação de Aço**
  - `[x]` Setup do Projeto Frontend (Next.js + TailwindCSS).
  - `[x]` Setup do Banco de Dados (Supabase).
  - `[x]` Desenvolvimento do Extrator de Dados (Script para `api.albionbb.com`).
  - `[x]` UI Base e Tabelas Globais (Últimas batalhas, Leaderboard de Dano/Cura).

- `[x]` **Fase 2: Radar de Presença e Stats Menores**
  - `[x]` Criar a Página `/presence` (Painel de Atividade / Attendance Diário e Semanal).
  - `[x]` Criar a Página `/stats` (Tabelas e Rankings Filtrados).

- `[x]` **Fase 3: O Zerg Police & Obras de Arte Virtuais**
## Fase 2 — Automação e Dados Corretos
- `[x]` Script Python `crawler.py`: Filtrar guildas aliadas dinamicamente (ALLIED_GUILDS fallback incluído).
- `[x]` Bat `Encher_Banco_Com_Historico.bat`: Transformado em menu interativo perguntando a quantidade de páginas (ex: 5, 10, 20).

## Fase 3 — Melhorias de UX e Contexto
- `[x]` `globals.css`: Criado sistema de tooltip global em CSS puro (`top: 100%` para evitar cortes).
- `[x]` Componente `WeaponIcon`: Criado componente para renderizar ícones da API oficial (`weapon.type` corrigido).
- `[x]` Dashboard (`/`): Adicionadas legendas e tooltips explicativos nos KPIs (Top DPS/Heals/Kills).
- `[x]` Dashboard (`/`): Gráfico de Win Rate melhorado (eixo Y e eixo X com datas reais + tooltips nativos em SVG).
- `[x]` Busca (`/player`): Mostrando listagem inicial dos 20 operadores mais ativos.
- `[x]` Perfil (`/player/[name]`): Eixos do Radar usando dados reais da guilda calculados direto do banco.
- `[x]` Perfil (`/player/[name]`): Melhorados textos do Coaching (amostragem insuficiente) e adicionado WeaponIcon.
- `[x]` Perfil (`/player/[name]`): Tooltips adicionados nos links (AlbionBB, Albion2D).
- `[x]` Presença (`/presence`): Tooltip adicionado nas linhas apontando para o perfil do jogador.
- `[x]` Zerg HQ (`/zerg`): Banner explicativo sobre a página e tooltips no gráfico de pizza inseridos.
- `[x]` Mentoria (`/guild`): Removido label ambíguo "K" de kills.
- `[x]` Mentoria (`/guild`): Adicionadas explicações contextuais nas seções (badges).
- `[x]` Mentoria (`/guild`): Adicionada label explicando Armas Off-Meta Secretas.
- `[x]` Mentoria (`/guild`): Ajustada regra de Red Flags (exclui tanks/supports da culpa) e adicionado WeaponIcon.
