# 01 — Arquitetura de Dados e Integração de APIs

> **Battle Board I M O R T A I S** — Sistema de Inteligência e Gestão Estratégica de ZvZ

---

## 1. Visão Geral da Arquitetura

O Battle Board opera em uma arquitetura híbrida projetada para máxima velocidade e baixo custo computacional:

```
┌────────────────────────────────────────────────────────┐
│                   APIs Externas                        │
│                                                        │
│  [AlbionBB API]                  [Albion Online API]   │
│  (Resumo das Lutas & Players)    (Kill Events Detalhados)│
└───────────────┬────────────────────────┬───────────────┘
                │                        │
                ▼                        ▼
┌────────────────────────────────────────────────────────┐
│                   Scripts Python (Crawlers)            │
│                                                        │
│  crawler.py                      crawler_kills.py      │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
                ▼                        ▼
┌────────────────────────────────────────────────────────┐
│             Banco de Dados Relacional (Supabase)       │
│                                                        │
│  • battles (ID, Data, Oponentes, Resultado, Duração)   │
│  • player_stats (Dano, Cura, IP, Kills, Mortes, Arma)  │
│  • kill_events (Timestamp, Assassino, Arma, Vítima)    │
└───────────────────────────────┬────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────┐
│             Frontend Next.js 16 + React 19             │
│                                                        │
│  • Dashboard Global (/)          • Radar de Presença   │
│  • Perfil & AI Coach (/player)   • Mentoria (/guild)   │
│  • ZvZ HD & Comp (/zerg)         • Estatísticas (/stats)│
└────────────────────────────────────────────────────────┘
```

---

## 2. As Duas Fontes de Dados (APIs)

### A) AlbionBB API (`api.albionbb.com`)
- **Finalidade:** Resumo consolidado de cada batalha da guilda.
- **Endpoints Utilizados:**
  - `GET /us/battles?guildId={ID}&minPlayers=21&page={N}` — Lista de batalhas recentes da guilda.
  - `GET /us/battles/{battle_id}` — Detalhes completos da batalha (jogadores, dano, cura, IP médio, arma, resultado).
- **Vantagem:** Realiza o agrupamento pesado de dano/cura/IP sem sobrecarregar nosso servidor.

### B) Albion Online Gameinfo API (`gameinfo.albiononline.com`)
- **Finalidade:** Eventos cronológicos de abate (*Kill Events*).
- **Endpoint Utilizado:**
  - `GET /api/gameinfo/events?limit=51&offset={N}`
- **Campos Extraídos:**
  - `TimeStamp`: Momento exato da morte.
  - `Killer.Equipment.MainHand.Type`: ID completo da arma do assassino (ex: `T6_2H_DUALSCIMITAR_UNDEAD@3`).
  - `Victim.Name` & `Victim.GuildName`: Quem morreu.
  - `numberOfParticipants`: Quantidade de pessoas que assistiram no abate (detecta clumps/bombs).

---

## 3. Esquema do Banco de Dados (Supabase / PostgreSQL)

### Tabela 1: `battles`
Armazena o registro macro de cada ZvZ da guilda.
```sql
CREATE TABLE public.battles (
    id bigint PRIMARY KEY,
    start_time timestamp with time zone NOT NULL,
    finished_at timestamp with time zone,
    opponents text NOT NULL,
    result text NOT NULL, -- 'WIN' ou 'LOSS'
    guild_players integer NOT NULL,
    total_kills integer,
    total_fame bigint
);
```

### Tabela 2: `player_stats`
Armazena a performance individual de cada membro por batalha.
```sql
CREATE TABLE public.player_stats (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    battle_id bigint REFERENCES public.battles(id) ON DELETE CASCADE,
    player_name text NOT NULL,
    role text NOT NULL, -- 'tank', 'healer', 'support', 'melee', 'range'
    damage_done bigint DEFAULT 0,
    healing_done bigint DEFAULT 0,
    average_ip integer DEFAULT 0,
    kills integer DEFAULT 0,
    deaths integer DEFAULT 0,
    weapon text NOT NULL
);

CREATE INDEX idx_player_stats_name ON public.player_stats(player_name);
CREATE INDEX idx_player_stats_battle ON public.player_stats(battle_id);
```

### Tabela 3: `kill_events`
Armazena o log segundo a segundo de cada abate/baixa para a mentoria tática.
```sql
CREATE TABLE public.kill_events (
    event_id bigint PRIMARY KEY,
    battle_id bigint NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
    timestamp timestamp with time zone NOT NULL,
    victim_name text NOT NULL,
    victim_guild text,
    killer_name text,
    killer_guild text,
    killer_weapon text,
    killer_weapon_norm text,
    total_participants integer DEFAULT 0,
    seconds_into_battle integer,
    is_early_death boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_kill_events_battle ON public.kill_events(battle_id);
CREATE INDEX idx_kill_events_victim ON public.kill_events(victim_name);
CREATE INDEX idx_kill_events_time ON public.kill_events(seconds_into_battle);
```

---

## 4. Normalização de Armas
Os IDs brutos da API (ex: `T6_2H_DUALSCIMITAR_UNDEAD@3`) são tratados no frontend e nos scripts para:
1. **Nome Amigável:** `formatWeaponName()` remove o Tier (`T6_`), Mão (`2H_`, `MAIN_`), Enchants (`@3`) e substitui `_` por espaços (`Dualscimitar Undead`).
2. **Ícone Renderizado:** `WeaponIcon.tsx` renderiza a imagem oficial direto da CDN do Albion (`render.albiononline.com/v1/item/{BASE_WEAPON}.png`).

---

## 5. Regras Críticas de Conexão, Rate Limits e Timeouts

### A) Sensibilidade da API do AlbionBB (`api.albionbb.com`)
* **Pausa Obrigatória (`time.sleep(1.5)` a `2.0s`):** O servidor do AlbionBB derruba o pool de conexões se receber chamadas consecutivas rápidas. **Nunca remova a pausa** entre requisições de detalhes de batalha.
* **Timeout Obrigatório (`timeout=12`):** Sempre use `timeout=12` com bloco `try...except` para capturar falhas de rede sem congelar o terminal do usuário.
* **Filtro Estrito de ZvZ:** O corte mínimo de jogadores da guilda **DEVE SER SEMPRE 21** (`minPlayers=21` e `len(players) >= 21`). Nunca reduza para pegar ganks ou conteúdos de pequena escala.

### B) Buffer Volátil da API Oficial do Albion (`gameinfo.albiononline.com`)
* **Retenção de ~60 minutos:** A API oficial só armazena os últimos ~1.000 eventos de kill de todo o jogo.
* **Limite de Paginação:** O crawler de kills (`crawler_kills.py`) deve varrer no máximo 4 páginas e encerrar imediatamente se a batalha já expirou do buffer.
* **Timeout Rápido (`timeout=8`):** Timeout de 8 segundos com continuidade graciosa caso a API do Albion demore para responder.

