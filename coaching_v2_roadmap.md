# Roadmap: Mentoria ZvZ V2 (Análise Avançada de Mortes)

Este documento centraliza todas as regras de negócio, dados da API e lógicas matemáticas necessárias para implementar a segunda versão do sistema de Coaching/Mentoria do AlbionBB. O foco desta versão é a **Análise de Mortes e Comportamento Defensivo**.

## 1. Novos KPIs de Mentoria (Visão do Jogador)

### 1.1. Momento da Morte (Early Death vs Late Death)
Muitos jogadores morrem nos primeiros segundos do "engaje" inimigo, muitas vezes sem usar suas poções ou defensivas. 
* **Lógica:** A API do Albion fornece um `TimeStamp` exato para cada morte. Comparando este TimeStamp com o `start_time` da batalha, saberemos em qual segundo da luta o jogador morreu.
* **Diagnóstico de Coach:** Se o jogador morre consistentemente nos primeiros 30 segundos da luta, o Coach avisará: *"Você está morrendo muito cedo nas lutas. Guarde suas defensivas para o primeiro engage inimigo e posicione-se mais atrás."*

### 1.2. Carrasco Pessoal (Arma que mais o mata)
Saber para qual arma o jogador mais morre ajuda a corrigir posicionamento.
* **Lógica:** Agrupar as mortes do jogador cruzando com o `Killer.Equipment.MainHand.Type`.
* **Diagnóstico de Coach:** O jogador verá uma lista de quem é o seu "Carrasco": *"Atenção: 40% das suas mortes nas últimas CTAs foram para [Bloodletter]. Você está ficando com vida baixa na front-line e sendo finalizado."*

## 2. Novos KPIs de Guilda (Visão do Caller/Macro)

### 2.1. Gráfico de Mortes por Tempo (Battle Timeline)
Um gráfico (linha/curva) mostrando a quantidade de mortes da guilda por minuto/segundo da luta.
* **Alvo:** Identificar picos agudos de mortes. Exemplo: 7 mortes nos primeiros 10 segundos indicam que a guilda tomou um "clap" ou "bomb" sem reagir.

### 2.2. Detecção de Bomb Squads vs Zerg Claps
O sistema deve ler os picos no gráfico acima e diagnosticar *como* os jogadores morreram.
* **Mecânica:** Se 5+ jogadores morrem na mesma janela de 3-5 segundos, o algoritmo verifica as armas dos assassinos:
  * **Armas de Bomb Squad:** `Rift Glaive`, `Hellfire Hands`, `Bloodletter`, `Wailing Bow`, `Grovekeeper`, `Camlann Mace`. Se a maioria do dano veio de um grupo pequeno usando isso, foi um **Bomb inimigo**.
  * **Armas de Zerg Clap (Frontline):** `Dual Scimitar (Undead)`, `Galatine Pair`, `Kingmaker`. Se a morte massiva veio dessas armas, foi um engaje bruto da front-line inimiga.

## 3. Dados Necessários da API (Albion Online Events)

Atualmente consumimos a API resumida de `battles`. Para essa V2, o Crawler (Python) precisará bater no endpoint de **Eventos (Kills)** para puxar a "killboard" detalhada.

**Endpoint:** `https://gameinfo.albiononline.com/api/gameinfo/events?limit=51&offset=0` (ou filtrando por guild).

### Estrutura de Referência (JSON do Kill Event)
```json
{
  "EventId": 1725012,
  "BattleId": 1724959,
  "TimeStamp": "2017-07-26T06:07:02.817742700Z", // <-- Crucial para a linha do tempo!
  "Killer": {
    "Name": "NomeDoInimigo",
    "GuildName": "Guild Inimiga",
    "Equipment": {
      "MainHand": {
        "Type": "T6_MAIN_SWORD", // <-- Define a arma que deu o Last Hit
      }
    }
  },
  "Victim": {
    "Name": "NomeDoNossoJogador",
    "GuildName": "I M O R T A I S"
  },
  "Participants": [ ... ] // Lista dos que deram assistência
}
```

## 4. Alterações Necessárias no Banco de Dados (Supabase)

Para suportar essas métricas sem derreter o banco relacional, sugerimos criar uma nova tabela chamada `kill_events` (filha de `battles`):

**Tabela `kill_events`:**
- `event_id` (PK, string)
- `battle_id` (FK para battles)
- `timestamp` (datetime)
- `killer_name` (string)
- `killer_weapon` (string)
- `victim_name` (string)
- `victim_guild` (string)

*(Não é necessário salvar todos os itens de equipamento para economizar espaço, apenas o `MainHand` do Killer e a Timestamp já desbloqueiam 100% da Mentoria V2).*
