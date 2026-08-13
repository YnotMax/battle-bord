# 🛡️ Battle Board & Admin Hub — I M O R T A I S

![Albion Online](https://img.shields.io/badge/Albion%20Online-ZvZ%20Analytics-blue?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js%2016-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React%2019-blue?style=for-the-badge&logo=react)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=for-the-badge&logo=supabase)
![Python](https://img.shields.io/badge/Python-Crawlers-yellow?style=for-the-badge&logo=python)

O **Battle Board** é uma plataforma de elite para gestão tática, inteligência competitiva e análise de performance ZvZ (Zerg vs Zerg) no Albion Online. Desenvolvido exclusivamente para a guilda **I M O R T A I S**, o sistema automatiza a coleta de dados de batalhas, gera KPIs avançados de combate e oferece um sistema completo de AI Coaching individual e mentoria macro de guilda baseado em dados reais de combate.

---

## 🚀 Funcionalidades Principais

### 📊 Dashboard Estratégico (`/`)
Visualização em tempo real das operações e guerras da guilda.
* **KPIs Globais**: Total de batalhas mapeadas, Win Rate acumulado, Kill Fame total e média de abates/mortes.
* **Battle Log Interativo**: Histórico completo de confrontos com filtro temporal (`Start/End Date`), oponentes e links diretos para o AlbionBB.
* **Ranking de Operadores**: Leaderboards em tempo real dos maiores causadores de dano, maiores healers, frag leaders e operadores com maior taxa de sobrevivência.

### 👤 Hub do Operador & AI Coaching (`/player/[name]`)
O coração da evolução tática e mentoria individual da guilda.
* **Algoritmo de AI Coaching**: Inteligência que lê o histórico do operador e emite diagnósticos direcionados com 10 níveis de prioridade (ex: *Morte Precoce Crônica*, *Carrasco Pessoal*, *Talento Oculto*, *IP Subutilizado*, *Maestria T8*).
* **Polígono de Playstyle (Radar Chart)**: Gráfico de radar comparativo em 5 eixos (Agressividade, Dano, Cura, Sustento Defensivo e Frequência Vencedora) contra a média do mesmo Role na guilda.
* **6 Indicadores Rápidos (Badges)**:
  * 📈 **Tendência**: WinRate das últimas 5 batalhas vs histórico geral.
  * 🏃 **Assiduidade**: % de participação nas CTAs da guilda.
  * 🛡️ **Sobrevivência**: Média de mortes/luta comparada à média do papel.
  * ⚡ **KDA**: Razão direta de Kills/Mortes.
  * ⏱️ **Morte Cedo**: % de mortes sofridas nos primeiros 60 segundos de combate (quando ainda tinha 100% das defensivas).
  * 🗡️ **Arma Fatal**: A arma inimiga que mais causou o abate do jogador (com ícone renderizado oficial).
* **Rivalidades Pessoais**: Identificação de *Presa Fácil* (guilda que mais mata) e *Carrasco* (guilda contra a qual mais vence).
* **Feed de ZvZ (Op.gg Style)**: Histórico detalhado luta a luta com armadura, arma, IP médio e K/D/A.

### ⚔️ Mentoria Global & Fases de Combate (`/guild`)
Inteligência macro para Callers, Oficiais e Liderança.
* **Linha do Tempo Tática (Fases de Combate)**: Histograma comparativo de **Baixas da Guilda 🟥 vs Abates Feitos 🟩** dividido nas 4 fases reais de uma ZvZ:
  1. *Fase 1: 0s a 30s (1º Engage / Abertura)* — Avalia se a guilda sofre wipe com defensivas cheias.
  2. *Fase 2: 31s a 60s (Reset / Cooldown)* — Avalia se o time sabe recuar e resetar enquanto as poções/skills estão em recarga.
  3. *Fase 3: 61s a 120s (2º Engage / Batalha Sustentada)* — Avalia trocação e reposicionamento de Healers e Tanks.
  4. *Fase 4: 120s+ (Finalização & Clean-up)* — Desgaste e perseguição.
* **Detecção Inteligente de Bomb Squads vs Zerg Claps**: Classificação automática de wipes simultâneos por armas de flanco (*Rift Glaive, Bloodletter, Grovekeeper*) ou choque frontal (*Dual Scimitar Undead, Fire Staff, Galatines*).
* **Analytics de Armamento Macro**: Armas mais letais, maiores danos, melhores healers, armas mais seguras, off-metas secretas e pick rate.
* **Rivalidades de Guilda & Guerras Declaradas**: Mapeamento de confrontos contra cada guilda/aliança inimiga, WinRate e fama roubada.
* **Red Flags (Perigo de Composição)**: Identificação de armas DPS/Healer com WinRate cronicamente baixo na composição.

### 🛡️ Zerg HQ & Equilíbrio de Composição (`/zerg`)
* **Distribuição de Papéis**: Proporção da Zerg entre Tanks, Healers, Suportes, Melee DPS e Ranged DPS.
* **Diagnósticos Táticos de Composição**: Avisos automáticos sobre desequilíbrios (ex: falta de healers impactando o WinRate).
* **Top Armas da Composição**: As 5 armas mais utilizadas e sua representatividade percentual.

### ⏱️ Radar de Presença & Assiduidade (`/presence`)
* **Controle de Frequência**: Tabela completa com assiduidade percentual e total de batalhas de cada membro.
* **Sparklines de Participação**: Visualização visual rápida das últimas 10 batalhas (estilo contribuições do GitHub).

### 📈 Analytics & Filtros Avançados (`/stats`)
* **Tabela Completa de Dados**: Consulta customizável com filtros de data inicial/final, busca por nome e corte por mínimo de jogadores na ZvZ.

---

## 🛠️ Stack Tecnológica

### Frontend (Site)
* **Framework**: [Next.js 16](https://nextjs.org/) (App Router & React 19).
* **Estética**: Design Cyber-Tech com **Vanilla CSS**, **Glassmorphism**, paletas HSL tailoring e tipografia moderna (*Outfit* & *Space Mono*).
* **Visualização de Dados**: [Recharts](https://recharts.org/) (Radar Charts, Area Charts, Bar Charts comparativos).
* **Ícones**: Google Material Symbols e ícones renderizados oficiais da CDN do Albion Online.

### Backend & Dados
* **Banco de Dados**: [Supabase](https://supabase.com/) (PostgreSQL relacional com Row Level Security).
* **Crawlers de Ingestão**: Scripts em **Python** (`requests` com timeouts protegidos + `supabase-py`).
* **Integração Dupla de APIs**:
  1. *AlbionBB API* — Resumo consolidado de batalhas, dano, cura, IP e armas.
  2. *Albion Online Gameinfo API* — Eventos cronológicos de kill/morte com timestamps exatos.

---

## 🏗️ Estrutura do Repositório

```text
├── Atualizar_Dados_Manualmente.bat    # Script de uso diário (Passo 1: Batalhas + Passo 2: Kill Events)
├── Encher_Banco_Com_Historico.bat     # Script para importar semanas de histórico antigo
│
├── docs/                              # Central de Documentação Técnica
│   ├── 01_ARQUITETURA_E_DADOS.md      # Detalhes das APIs, DDL Supabase e Crawlers
│   ├── 02_SISTEMA_DE_MENTORIA_E_COACHING.md # Algoritmo de Coaching, Badges e Fases de Luta
│   ├── 03_ROADMAP_E_PROXIMAS_FEATURES.md    # Backlog de Regear, Bot Discord e Hero Cards
│   └── migration_v2_kill_events.sql   # Script SQL de migração das tabelas
│
├── scripts/                           # Automação e Crawlers em Python
│   ├── crawler.py                     # Sincroniza novas batalhas e participantes do AlbionBB
│   ├── crawler_kills.py               # Sincroniza kill events detalhados da API do Albion
│   ├── populate_history.py            # Importação em massa de páginas históricas
│   ├── schema.sql                     # Esquema base das tabelas
│   └── requirements.txt               # Dependências Python
│
└── site/                              # Aplicação Web Next.js
    ├── src/app/                       # Rotas (/, /player, /guild, /presence, /zerg, /stats)
    ├── src/components/                # Componentes UI (BattleTimeline, Navigation, WeaponIcon, etc)
    └── src/lib/                       # Configuração do Supabase e Tipagens TypeScript
```

---

## ⚙️ Configuração e Instalação

### 1. Pré-requisitos
* **Node.js** 18+ instalado
* **Python** 3.10+ instalado
* Projeto criado no [Supabase](https://supabase.com/)

### 2. Configuração do Banco de Dados (Supabase)
No **SQL Editor** do Supabase, execute os scripts de criação das tabelas e índices:
1. Execute o conteúdo de `scripts/schema.sql` (cria `battles` e `player_stats`).
2. Execute o conteúdo de `docs/migration_v2_kill_events.sql` (cria `kill_events` e adiciona `finished_at`).

### 3. Variáveis de Ambiente
Crie um arquivo `.env.local` dentro da pasta `site/` e um `.env` dentro da pasta `scripts/`:

**`site/.env.local`:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

**`scripts/.env`:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-secreta
```

### 4. Executando o Projeto Localmente

```bash
# 1. Instalar dependências e rodar o site
cd site
npm install
npm run dev

# 2. Instalar dependências dos scripts Python
cd ../scripts
pip install -r requirements.txt
```

O site estará acessível em: **`http://localhost:3000`**

### 5. Sincronização de Dados no Dia a Dia
* Para preencher o histórico pela primeira vez: dê 2 cliques em **`Encher_Banco_Com_Historico.bat`**.
* Após cada CTA/ZvZ: dê 2 cliques em **`Atualizar_Dados_Manualmente.bat`** (ele busca as batalhas e os kill events automaticamente).

---

## 📚 Manuais Técnicos Complementares

Para detalhes aprofundados sobre regras matemáticas, algoritmos e integrações:
* 📖 **[01 — Arquitetura de Dados e Integração de APIs](file:///d:/estudos/albion%20online/battle%20bord/docs/01_ARQUITETURA_E_DADOS.md)**
* 🧠 **[02 — Sistema de Mentoria Tática & AI Coaching](file:///d:/estudos/albion%20online/battle%20bord/docs/02_SISTEMA_DE_MENTORIA_E_COACHING.md)**
* 🗺️ **[03 — Roadmap de Expansões Futuras](file:///d:/estudos/albion%20online/battle%20bord/docs/03_ROADMAP_E_PROXIMAS_FEATURES.md)**

---

## 🛡️ Sobre a I M O R T A I S
A **I M O R T A I S** é uma guilda de elite focada em conteúdo de larga escala (ZvZ) no servidor Americas do Albion Online. Este projeto nasceu da necessidade de transformar dados brutos de batalha em inteligência tática, profissionalizando a tomada de decisão da liderança e acelerando a evolução individual de cada membro.

---

## 👨‍💻 Desenvolvedor
Este projeto foi idealizado, desenhado e desenvolvido por **Tony Max**.
* 💼 **LinkedIn**: [Tony Max da Silva Costa](https://www.linkedin.com/in/tony-max-da-silva-costa)
* 📸 **Instagram**: [@tony_max_silva](https://www.instagram.com/tony_max_silva/)

---
*Powered by Data, Strategy and Passion for Albion Online.*
