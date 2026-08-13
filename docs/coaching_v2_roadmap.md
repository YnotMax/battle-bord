# Mentoria ZvZ V2 — Documentação Completa de Implementação

> **Objetivo:** Este documento é o guia técnico e de negócio completo para a segunda versão do sistema de coaching. Ele foi gerado a partir da análise real da batalha `1430387617` (08/08/2026 — IMORTAIS vs NWA) e da estrutura confirmada das APIs do AlbionBB e do Albion Online Gameinfo. Uma IA pode usar este documento diretamente para codificar toda a implementação.

---

## 0. Contexto: A Batalha que Motivou Esta Feature

**Batalha:** `1430387617` — `https://albionbb.com/battles/1430387617`

**Dados confirmados da batalha:**
- **Início:** `2026-08-08T20:21:02.868Z`
- **Fim:** `2026-08-08T20:24:08.428Z`
- **Duração total:** ~186 segundos (3 min 6 segundos)
- **Resultado:** DERROTA (IMORTAIS: 2 kills / 31 mortes)
- **Inimigo principal:** Aliança NWA (Take Care + Keybump) — 31 kills / 0 mortes

**Diagnóstico visual dos prints fornecidos:**
- **Print 1 (Kill log):** Primeiras 7 mortes ocorreram entre 20:22:53 e 20:23:07 — ou seja, nos **primeiros 65-75 segundos** da luta. Os killers usavam armas como `Dual Scimitar Undead` (frontal), `Fire Staff Hell`. Isso é um **Zerg Clap** (choque frontal), não um Bomb Squad.
- **Print 2 (Battle Timeline):** O gráfico mostra um pico íngreme logo no início — 7 mortes quase simultâneas em ~10 segundos. Um clap bem executado: a aliança engajou primeiro e rapidamente.

---

## 1. Fonte de Dados

### 1.1. API já utilizada: AlbionBB

**Endpoint:** `https://api.albionbb.com/us/battles/{battle_id}`

**Campos já coletados** pelo nosso `crawler.py`:

| Campo | Descrição | Já salvo no banco? |
|---|---|---|
| `startedAt` | Início da batalha (UTC ISO8601) | ✅ Sim (`battles.start_time`) |
| `finishedAt` | Fim da batalha (UTC ISO8601) | ❌ Não — deve ser adicionado |
| `players[].name` | Nome do jogador | ✅ Sim |
| `players[].kills` | Kills totais | ✅ Sim |
| `players[].deaths` | Mortes totais | ✅ Sim |
| `players[].ip` | IP Médio | ✅ Sim (`average_ip`) |
| `players[].damage` | Dano total | ✅ Sim |
| `players[].heal` | Cura total | ✅ Sim |
| `players[].role` | Papel (dps/healer/tank/range) | ✅ Sim |
| `players[].weapon.type` | ID completo da arma (ex: `T6_2H_DUALSCIMITAR_UNDEAD@3`) | ✅ Sim |
| `players[].deathFame` | Fama de morte do jogador | ❌ Não salvo |
| `players[].killFame` | Fama de kill do jogador | ❌ Não salvo |
| `guilds[].ip` | IP médio da guilda/aliança inimiga | ❌ Não salvo |

**Limitação CRÍTICA do AlbionBB:** A API **não fornece timestamp individual de cada morte**. Só fornece o total por jogador. O endpoint `/kills` retorna 404.

### 1.2. Nova Fonte de Dados: Albion Online Gameinfo API (Kill Events)

**Confirmado funcionando via testes locais.**

**Endpoint:** `https://gameinfo.albiononline.com/api/gameinfo/events?limit=51&offset=0`

Este endpoint retorna os ~1000 eventos de kill mais recentes do servidor. Para puxar os kills de uma batalha específica, usamos o campo `BattleId` retornado em cada evento.

**Estrutura completa confirmada de um Kill Event:**

```json
{
  "EventId": 1430469939,
  "BattleId": 1430469915,
  "TimeStamp": "2026-08-08T23:23:51.126750900Z",
  "numberOfParticipants": 15,
  "groupMemberCount": 5,
  "TotalVictimKillFame": 427112,
  "KillArea": "PLAYERCITY_PORTAL",
  "Category": null,
  "Type": "KILL",
  "GvGMatch": false,
  "Location": null,
  
  "Killer": {
    "Id": "abc-def",
    "Name": "NomeDoKiller",
    "GuildId": "xxx",
    "GuildName": "Take Care",
    "AllianceId": "yyy",
    "AllianceName": "NWA",
    "AllianceTag": "NWA",
    "Avatar": "...",
    "AverageItemPower": 1574,
    "KillFame": 9173644,
    "DeathFame": 0,
    "Equipment": {
      "MainHand": { "Type": "T6_2H_DUALSCIMITAR_UNDEAD@3", "Count": 1, "Quality": 4, "ActiveSpells": [], "PassiveSpells": [] },
      "OffHand":  null,
      "Head":     { "Type": "T6_HEAD_CLOTH_SET3@2", "Count": 1, "Quality": 3, "ActiveSpells": [], "PassiveSpells": [] },
      "Armor":    { "Type": "T6_ARMOR_LEATHER_SET3@2", "Count": 1, "Quality": 3, "ActiveSpells": [], "PassiveSpells": [] },
      "Shoes":    { "Type": "T6_SHOES_CLOTH_SET3@2", "Count": 1, "Quality": 3, "ActiveSpells": [], "PassiveSpells": [] },
      "Cape":     { "Type": "T5_CAPEITEM_FW_BRIDGEWATCH@1", "Count": 1, "Quality": 1, "ActiveSpells": [], "PassiveSpells": [] },
      "Bag":      { "Type": "T5_BAG", "Count": 1, "Quality": 1, "ActiveSpells": [], "PassiveSpells": [] },
      "Food":     { "Type": "FOOD_PORK_OMELETTE", "Count": 1, "Quality": 1, "ActiveSpells": [], "PassiveSpells": [] },
      "Potion":   { "Type": "POTION_HEALING_MAJOR", "Count": 1, "Quality": 1, "ActiveSpells": [], "PassiveSpells": [] },
      "Mount":    { "Type": "T5_MOUNT_HORSE", "Count": 1, "Quality": 0, "ActiveSpells": [], "PassiveSpells": [] }
    }
  },
  
  "Victim": {
    "Name": "JuniorMileski",
    "GuildName": "I M O R T A I S",
    "AllianceName": "ROTA",
    "AverageItemPower": 1401,
    "DeathFame": 954600,
    "Equipment": { /* mesma estrutura acima — armadura do morto */ }
  },
  
  "Participants": [
    {
      "Name": "NomeQueAssistiu",
      "GuildName": "Take Care",
      "AverageItemPower": 1550,
      "DamageDone": 45000,
      "SupportHealingDone": 0,
      "Equipment": { "MainHand": { "Type": "T6_MAIN_SPEAR@2" }, ... }
    }
  ],
  
  "GroupMembers": [
    { "Name": "MembroDoGrupoDoKiller", "GuildName": "Take Care" }
  ]
}
```

**Campos mais relevantes para a Mentoria V2:**
- `TimeStamp` — Quando exatamente a pessoa morreu
- `BattleId` — Para filtrar os kills de uma batalha específica
- `Killer.Equipment.MainHand.Type` — A arma que deu o last hit
- `Participants[].Equipment.MainHand.Type` — Todas as armas que participaram da kill
- `Victim.Name` — Para cruzar com nossos jogadores
- `numberOfParticipants` — Se 10+ participaram de uma única kill, provavelmente foi um Bomb

---

## 2. Novas Features — Especificação Completa

### Feature 2.1 — Momento da Morte (Early Death KPI)

**Lógica:**
1. Para cada morte de um jogador da IMORTAIS, calcular:
   `segundos_ate_morte = (kill_event.TimeStamp - battle.startedAt) em segundos`
2. Classificar:
   - **Morte Precoce:** `segundos_ate_morte <= 60` (1 minuto)
   - **Morte no Meio:** `61 a 180 segundos`
   - **Morte Tardia:** `> 180 segundos`
3. Calcular `taxa_morte_precoce` = % de batalhas onde o jogador teve morte precoce

**Diagnóstico do Coach (Página do Jogador):**
```
Se taxa_morte_precoce >= 50%:
  ⚠️ "Você morreu nos primeiros 60 segundos em X% das suas batalhas recentes. 
  Neste intervalo você ainda tem TODAS as suas defensivas. 
  Reveja seu posicionamento: entre mais atrás no engaje inicial."
```

**KPI de Guilda (Página da Guilda/Mentoria):**
> Mostrar um card com "% da Guilda com Mortes Precoces na última luta"
> Ex: "7 de 34 jogadores (20%) morreram nos primeiros 60s. Possível falha de posicionamento no primeiro engaje."

---

### Feature 2.2 — Carrasco Pessoal (Arma que Mais o Mata)

**Lógica:**
1. Para cada morte de um jogador, salvar `killer_weapon_mainhand`
2. Agrupar por tipo de arma (normalizar removendo Tier e Enchant, ex: `T6_2H_DUALSCIMITAR_UNDEAD@3` → `2H_DUALSCIMITAR_UNDEAD`)
3. Rankear por frequência de kills

**Diagnóstico do Coach (Página do Jogador):**
```
Se uma arma matou >= 30% das vezes:
  🗡️ "Seu Carrasco Pessoal: [nome da arma] (ícone) te eliminou em X de Y batalhas.
  Isso indica que você está sendo finalizado por [tipo de build]. 
  Evite expor HP baixo próximo a jogadores com essa arma."
```

**Variante útil:** Mostrar separado entre "histórico geral" e "últimas 5 CTAs" — mudanças recentes indicam mudança no meta inimigo.

---

### Feature 2.3 — Battle Timeline (Gráfico de Mortes por Tempo)

**Objetivo:** Visualização na Página da Guilda e na análise de batalha, mostrando quantas mortes ocorreram por intervalo de tempo.

**Lógica de construção do gráfico:**
1. Para cada kill event da batalha, calcular `t = segundos_desde_inicio`
2. Agrupar em buckets de 5 segundos
3. Renderizar como gráfico de linha/área (igual ao do albionbb.com)

**Eixo X:** Tempo (em `MM:SS` a partir do início da luta)
**Eixo Y:** Kills acumuladas (curva sempre crescente) OU Kills por intervalo (histograma)

**Detecção de Pico:**
- Se `kills_em_janela_de_5s >= 4`, marcar aquele ponto com um alerta visual 🔴

---

### Feature 2.4 — Detector de Bomb Squad vs Zerg Clap

**Contexto:** Quando a guilda sofre um pico de mortes simultâneas, o sistema deve automaticamente diagnosticar o que aconteceu.

#### Taxonomia de Armas (para o Detector)

**Armas de BOMB SQUAD** (grupo pequeno, alta mobilidade, burst):
```python
BOMB_WEAPONS = [
    "RIFTGLAIVE",        # Rift Glaive — AoE burst principal do bomb
    "GLAIVE",            # Glaive — variação
    "HELLFIRE",          # Hellfire Hands — área
    "BLOODLETTER",       # Bloodletter — executa alvos com HP baixo
    "WAILING_BOW",       # Wailing Bow — segue bomb
    "2H_FIREBOMBSTAFF",  # Fire Bomb Staff
    "MAIN_HALLOWFALL",   # Hallowfall
    "MAIN_GLACIALSTAFF", # Area de gelo
    "SOULSCYTHE",        # Soulscythe (engage do bomb)
    "CAMLANN",           # Camlann Mace (clump para bomb)
    "GROVEKEEPER",       # Grovekeeper (knock-up clump)
]
```

**Armas de ZERG CLAP** (engaje frontal massivo da main zerg):
```python
ZERG_CLAP_WEAPONS = [
    "2H_DUALSCIMITAR",     # Dual Scimitar Undead — clap frontal (arma do print!)
    "GALATINE",            # Galatine Pair — clap
    "KINGMAKER",           # Kingmaker (espada regia)
    "2H_ARCANESTAFF",      # Arcane Staff (range do zerg)
    "2H_FIRESTAFF",        # Fire Staff (arma do print!)
    "2H_HOLYSTAFF",        # Holy Staff (heal do zerg)
    "2H_CURSEDSTAFF",      # Cursed Staff (zerg DPS)
    "MAIN_SPEAR",          # Spear (melee do zerg)
]
```

**Algoritmo de Detecção:**
```python
def detectar_tipo_morte_massiva(kill_events, janela_segundos=5):
    """
    Analisa kills simultâneas e classifica como Bomb ou Zerg Clap.
    Retorna: { tipo: 'bomb' | 'clap' | 'normal', kills: [...], armas: [...] }
    """
    # 1. Agrupar kills em janelas de 5s
    for janela in agrupar_por_tempo(kill_events, janela_segundos):
        if len(janela.kills) < 4:
            continue  # Não foi algo massivo
        
        # 2. Coletar armas dos killers (mainhand + participants)
        armas_usadas = [k.killer_weapon for k in janela.kills]
        armas_usadas += [p.weapon for k in janela.kills for p in k.participants]
        
        # 3. Classificar
        bomb_score = sum(1 for a in armas_usadas if any(b in a for b in BOMB_WEAPONS))
        clap_score = sum(1 for a in armas_usadas if any(z in a for z in ZERG_CLAP_WEAPONS))
        
        if bomb_score > clap_score and len(set(k.killer_guild for k in janela.kills)) <= 2:
            return { 'tipo': 'bomb', 'descricao': 'Bomb Squad inimigo detectado' }
        else:
            return { 'tipo': 'clap', 'descricao': 'Clap frontal da Zerg inimiga' }
```

**Diagnóstico para o Caller (Página da Guilda):**
```
🔴 CLAP DETECTADO [20:22:53 — 7 mortes em 14 segundos]
  Tipo: Zerg Clap (Frontal)
  Armas predominantes: Dual Scimitar Undead, Fire Staff
  Diagnóstico: A guilda foi pega na frente na abertura. 
  A formação inimiga engajou primeiro. Revisar timing de entrada.
```

---

## 3. Mudanças Necessárias no Banco de Dados (Supabase)

### 3.1 — Modificar tabela `battles` (adicionar `finished_at`)

```sql
ALTER TABLE battles ADD COLUMN finished_at TIMESTAMPTZ;
```

Isso nos dá a duração da batalha, útil para calcular tempo de morte.

### 3.2 — Nova tabela `kill_events`

```sql
CREATE TABLE kill_events (
  event_id       BIGINT PRIMARY KEY,
  battle_id      BIGINT NOT NULL REFERENCES battles(id),
  timestamp      TIMESTAMPTZ NOT NULL,
  
  -- Quem morreu
  victim_name    TEXT NOT NULL,
  victim_guild   TEXT,
  
  -- Quem matou (last hit)
  killer_name    TEXT,
  killer_guild   TEXT,
  killer_weapon  TEXT,    -- Ex: "T6_2H_DUALSCIMITAR_UNDEAD@3"
  
  -- Contexto da kill
  total_participants  INT DEFAULT 0,   -- numberOfParticipants
  seconds_into_battle INT,             -- segundos desde o início da batalha
  is_early_death      BOOLEAN,         -- TRUE se < 60 segundos
  
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para queries rápidas
CREATE INDEX idx_kill_events_battle  ON kill_events(battle_id);
CREATE INDEX idx_kill_events_victim  ON kill_events(victim_name);
CREATE INDEX idx_kill_events_time    ON kill_events(seconds_into_battle);
```

---

## 4. Mudanças Necessárias no Crawler Python

### 4.1 — `crawler.py` — Adicionar `finished_at`

```python
# Ao salvar na tabela battles, adicionar finishedAt:
supabase.table("battles").insert({
    "id": battle_id,
    "start_time": data.get("startedAt"),
    "finished_at": data.get("finishedAt"),  # NOVO
    # ... resto dos campos
}).execute()
```

### 4.2 — Novo script: `crawler_kills.py`

**Estratégia:** Após salvar uma batalha, buscar os kill events correspondentes na API oficial do Albion e salvar na tabela `kill_events`.

```python
"""
SCRIPT: crawler_kills.py
OBJETIVO: Para cada batalha recém-salva, buscar os Kill Events detalhados
          na API oficial do Albion Online (gameinfo) e salvar na kill_events.
"""

import os, requests
from datetime import datetime, timezone
from supabase import create_client

GUILD_NAME = "I M O R T A I S"
ALBION_EVENTS_URL = "https://gameinfo.albiononline.com/api/gameinfo/events"

def fetch_kill_events_for_battle(battle_id: int, battle_start: str):
    """
    Busca todos os kill events de uma batalha específica.
    A API não filtra por battleId diretamente — é preciso paginar e filtrar.
    """
    events = []
    offset = 0
    start_dt = datetime.fromisoformat(battle_start.replace('Z', '+00:00'))
    
    while True:
        url = f"{ALBION_EVENTS_URL}?limit=51&offset={offset}"
        r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=30)
        if r.status_code != 200:
            break
        
        batch = r.json()
        if not batch:
            break
        
        # Filtrar apenas os kills desta batalha
        battle_events = [e for e in batch if e.get('BattleId') == battle_id]
        events.extend(battle_events)
        
        # Se chegamos a eventos muito antigos (antes do início da batalha), parar
        last_ts = batch[-1].get('TimeStamp', '')
        if last_ts:
            last_dt = datetime.fromisoformat(last_ts.replace('Z', '+00:00'))
            if last_dt < start_dt:
                break
        
        # Se nenhum evento desta batalha foi encontrado nesta página, parar
        if not battle_events and len(batch) < 51:
            break
            
        offset += 51
    
    return events

def save_kill_events(supabase, battle_id: int, battle_start: str, events: list):
    """Processa e salva os kill events no banco."""
    start_dt = datetime.fromisoformat(battle_start.replace('Z', '+00:00'))
    rows = []
    
    for e in events:
        victim = e.get('Victim', {})
        killer = e.get('Killer', {})
        
        # Só nos interessa quando um jogador da IMORTAIS morreu
        if victim.get('GuildName', '').strip() != GUILD_NAME:
            continue
        
        ts_str = e.get('TimeStamp', '')
        ts_dt = datetime.fromisoformat(ts_str.replace('Z', '+00:00')) if ts_str else None
        seconds_into = int((ts_dt - start_dt).total_seconds()) if ts_dt else None
        
        killer_equip = killer.get('Equipment', {})
        killer_mainhand = killer_equip.get('MainHand', {})
        killer_weapon = killer_mainhand.get('Type', '') if killer_mainhand else ''
        
        rows.append({
            "event_id": e.get('EventId'),
            "battle_id": battle_id,
            "timestamp": ts_str,
            "victim_name": victim.get('Name', ''),
            "victim_guild": victim.get('GuildName', ''),
            "killer_name": killer.get('Name', ''),
            "killer_guild": killer.get('GuildName', ''),
            "killer_weapon": killer_weapon,
            "total_participants": e.get('numberOfParticipants', 0),
            "seconds_into_battle": seconds_into,
            "is_early_death": seconds_into is not None and seconds_into <= 60
        })
    
    if rows:
        supabase.table("kill_events").insert(rows).execute()
        print(f"  Salvos {len(rows)} kill events da batalha {battle_id}.")
```

---

## 5. Mudanças Necessárias no Site (Next.js)

### 5.1 — Página do Jogador (`/player/[name]`)

**Novas queries Supabase:**
```typescript
// Buscar kill events do jogador (mortes e quem o matou)
const { data: killEvents } = await sb
  .from('kill_events')
  .select('timestamp, killer_name, killer_weapon, seconds_into_battle, is_early_death, battle_id')
  .eq('victim_name', playerName)
  .order('timestamp', { ascending: false })

// Calcular Carrasco Pessoal
const carrascoMap: Record<string, number> = {}
killEvents.forEach(e => {
  const weapon = normalizarArma(e.killer_weapon)
  carrascoMap[weapon] = (carrascoMap[weapon] || 0) + 1
})
const topCarrasco = Object.entries(carrascoMap).sort((a,b) => b[1]-a[1])[0]

// Calcular taxa de morte precoce
const taxaMortePrecoce = killEvents.length > 0 
  ? Math.round(killEvents.filter(e => e.is_early_death).length / killEvents.length * 100)
  : 0
```

**Novos diagnósticos no Coach:**
```typescript
// PRIORIDADE 2.5: Morte precoce recorrente
if (taxaMortePrecoce >= 50 && killEvents.length >= 3) {
  return {
    type: 'warning', icon: 'timer_off', color: '#ef4444',
    title: '⏱️ Morre Cedo Demais',
    text: `Em ${taxaMortePrecoce}% das suas CTAs você morreu nos primeiros 60 segundos — 
           quando ainda tinha TODAS as defensivas disponíveis. 
           Posicione-se mais atrás na abertura do engaje.`
  }
}

// PRIORIDADE 2.6: Carrasco Pessoal
if (topCarrasco && topCarrasco[1] >= 3) {
  const pct = Math.round(topCarrasco[1] / killEvents.length * 100)
  return {
    type: 'warning', icon: 'gavel', color: '#f97316',
    title: `🗡️ Carrasco Pessoal: ${topCarrasco[0]}`,
    text: `${pct}% das suas mortes foram para [${topCarrasco[0]}]. 
           Você está sendo finalizado repetidamente pela mesma arma. 
           Evite expor HP baixo próximo a este arquétipo.`
  }
}
```

### 5.2 — Página da Guilda (`/guild`)

**Nova Seção: "Análise de Batalha"**
- Dropdown para selecionar uma batalha recente
- Gráfico de Timeline (eixo X: tempo, eixo Y: mortes acumuladas)
- Cards de detecção: "Clap detectado em X:XX", "Bomb detectado em X:XX"
- Tabela de "Mortes Precoces": quem morreu no primeiro minuto

**Componente sugerido:** `BattleTimeline.tsx`
```tsx
// Usa Recharts (já temos no projeto) para renderizar o gráfico
<LineChart data={timelineData}>
  <XAxis dataKey="seconds" tickFormatter={s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`} />
  <YAxis />
  <Line type="monotone" dataKey="kills" stroke="#ef4444" strokeWidth={2} />
  {/* Marcadores de Bomb/Clap */}
  {peakEvents.map(p => (
    <ReferenceLine x={p.second} stroke="#f97316" label={{ value: p.tipo, fill: '#f97316' }} />
  ))}
</LineChart>
```

---

## 6. Prioridade de Implementação (Sugerida)

| Fase | Feature | Esforço | Impacto |
|------|---------|---------|---------|
| 1 | Adicionar `finished_at` na tabela `battles` e no crawler | Baixo | Médio |
| 2 | Criar tabela `kill_events` no Supabase | Baixo | Alto |
| 3 | Criar `crawler_kills.py` para buscar kill events | Médio | Alto |
| 4 | Rodar retroativamente para batalhas antigas | Baixo | Alto |
| 5 | Carrasco Pessoal na página do Jogador | Médio | Alto |
| 6 | Morte Precoce no Coach do Jogador | Médio | Alto |
| 7 | Battle Timeline na página da Guilda | Alto | Alto |
| 8 | Detector de Bomb vs Clap | Alto | Médio |

---

## 7. Limitações e Riscos

| Limitação | Impacto | Mitigação |
|---|---|---|
| A API `gameinfo.albiononline.com` é não-oficial | Pode sair do ar sem aviso | Implementar retry com backoff. Dados históricos já estarão no banco. |
| A API só expõe ~1000 eventos recentes | Batalhas antigas (>2h) podem não ter kills disponíveis | Rodar o crawler logo após cada CTA |
| Rate limiting na API oficial | Bloqueio temporário | Respeitar 1 request/2s, usar delays entre chamadas |
| A API filtra por `/events?battleId=xxx`? | Precisamos testar | Usar paginação + filtrar por `BattleId` no JSON retornado |
