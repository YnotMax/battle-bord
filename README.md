# 🛡️ I M O R T A I S — Battle Board & Admin Hub

![Albion Online](https://img.shields.io/badge/Albion%20Online-ZvZ%20Analytics-blue?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js%2015-black?style=for-the-badge&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=for-the-badge&logo=supabase)
![Python](https://img.shields.io/badge/Python-Crawler-yellow?style=for-the-badge&logo=python)

O **I M O R T A I S Battle Board** é uma plataforma de elite para gestão tática e análise de performance ZvZ (Zerg vs Zerg) no Albion Online. Desenvolvido para a guilda **I M O R T A I S**, o sistema automatiza a coleta de dados de batalhas, gera KPIs de performance e oferece um sistema de mentoria individual baseado em dados reais de combate.

---

## 🚀 Funcionalidades Principais

### 📊 Dashboard Estratégico
Visualização em tempo real das últimas operações da guilda.
- **KPIs Globais**: Win Rate, Kill Fame total, média de abates e mortes.
- **Battle Log**: Histórico detalhado de confrontos com links diretos para o AlbionBB.
- **Ranking de Operadores**: Top DPS e Top Healers baseados em performance real.

### 👤 Mentoria Individual (Operador)
O coração da evolução tática da guilda.
- **Radar Tático**: Gráfico comparativo de Dano, Cura, IP e Sobrevivência.
- **Análise de Nêmesis**: Identificação de quem mais abate o jogador e quem ele mais abate.
- **Histórico Individual**: Performance detalhada luta a luta (Op.gg style).

### 🛡️ Zerg HQ & Composição
Análise da estrutura da guilda para Callers e Oficiais.
- **Pie Chart de Composição**: Distribuição de Tanks, Healers, Suportes e DPS.
- **Zerg Police**: Monitoramento de armas e builds utilizadas nas últimas lutas.
- **Inteligência Tática**: Avisos automáticos sobre deficiências na composição (ex: falta de healers).

### ⏱️ Presença e Assiduidade
- **Radar de Participação**: Controle de quem está comparecendo aos CTAs.
- **Filtros Temporais**: Analise a evolução da guilda nos últimos 7, 30 ou 90 dias.

---

## 🛠️ Stack Tecnológica

### Frontend (Site)
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router & Turbopack).
- **Estética**: Design Cyber-Tech com **Vanilla CSS** e **Glassmorphism**.
- **Visualização de Dados**: Recharts e Lucide Icons.
- **Infraestrutura**: Deploy automatizado no **Vercel**.

### Backend & Dados
- **Banco de Dados**: [Supabase](https://supabase.com/) (PostgreSQL).
- **Crawler**: Scripts em **Python** (Requests + BeautifulSoup) para extração de dados da API do AlbionBB.
- **Automação**: Sistema de scripts `.bat` para sincronização manual ou via Cron Jobs.

---

## 🏗️ Estrutura do Repositório

```text
├── scripts/                # Automação e Crawler
│   ├── crawler.py          # Busca batalhas recentes e processa KDs
│   ├── populate_history.py # Importação massiva de dados históricos
│   └── schema.sql          # Estrutura do banco de dados PostgreSQL
├── site/                   # Aplicação Web Next.js
│   ├── src/app/            # Rotas (Dashboard, Player, Zerg, etc)
│   ├── src/components/     # UI Components (Navigation, Radars)
│   └── src/lib/            # Conexão Supabase e Tipagens
└── docs/                   # Documentação tática e de arquitetura
```

---

## ⚙️ Configuração e Instalação

### 1. Requisitos
- Node.js 18+
- Python 3.10+
- Conta no Supabase

### 2. Configuração do Banco (Supabase)
Execute o conteúdo de `scripts/schema.sql` no SQL Editor do seu projeto Supabase para criar as tabelas `battles` e `player_stats`.

### 3. Variáveis de Ambiente
Crie um arquivo `.env.local` na pasta `site/` e um `.env` na pasta `scripts/`:
```env
NEXT_PUBLIC_SUPABASE_URL=seu_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon
SUPABASE_SERVICE_ROLE_KEY=sua_chave_secreta (apenas para scripts)
```

### 4. Rodando o Projeto
```bash
# Para o site
cd site
npm install
npm run dev

# Para o crawler
cd scripts
pip install -r requirements.txt
python crawler.py
```

---

## 🛡️ Sobre a I M O R T A I S
A **I M O R T A I S** é uma organização focada em conteúdo de larga escala (ZvZ) no servidor Americas do Albion Online. Este projeto nasceu da necessidade de profissionalizar a análise de dados para manter a guilda no topo do ranking competitivo.

---
*Desenvolvido com ⚡ por Antigravity para a comunidade Albion.*
