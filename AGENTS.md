# 🤖 AGENTS.md — Regras Mandatórias de Engenharia para IAs e Desenvolvedores

> **Battle Board I M O R T A I S**  
> Este documento define regras absolutas de desenvolvimento, arquitetura, consumo de APIs e limites de rede para **qualquer inteligência artificial ou desenvolvedor** que for manter ou expandir esta base de código.

---

## 🛑 1. REGRAS CRÍTICAS DE REDE & APIs (AlbionBB & Albion Gameinfo)

### A) AlbionBB API (`api.albionbb.com`) — Sensibilidade Extrema & Rate Limits
* **NÃO FAÇA REQUISIÇÕES EM MASSA/CONCORRENTES:** O servidor do AlbionBB é mantido pela comunidade e derruba conexões rapidamente se for bombardeado.
* **PAUSA OBRIGATÓRIA (`time.sleep(1.5)` a `2.0s`):** Em qualquer loop que consulte batalhas ou detalhes (`/us/battles/{id}`), **SEMPRE** insira uma pausa mínima de 1.5s entre cada requisição.
* **TIMEOUT OBRIGATÓRIO (12s):** Toda chamada `requests.get()` DEVE possuir `timeout=12` e tratamento com `try...except` para evitar que scripts `.bat` fiquem travados indefinidamente no terminal do usuário.
* **USER-AGENT REAL:** Sempre envie `headers={'User-Agent': 'Mozilla/5.0'}` em todas as chamadas HTTP.
* **PAGINAÇÃO CONTROLADA:** Nunca pagine mais do que 4 páginas no crawler diário normal.

### B) Albion Online Gameinfo API (`gameinfo.albiononline.com`) — Buffer de Tempo Real
* **BUFFER VOLÁTIL (~60 min):** A API oficial do jogo só guarda os últimos ~1.000 eventos de abate de todo o servidor. Eventos de batalhas que ocorreram há mais de 2 horas **não existem mais** nessa API.
* **NÃO PAGINE INFINITAMENTE:** O script de kill events (`crawler_kills.py`) deve parar imediatamente após 4 páginas ou quando os eventos da batalha não forem mais encontrados.
* **TIMEOUT RÁPIDO (8s):** Chamadas à API oficial devem ter timeout de 8 segundos.

---

## ⚔️ 2. FILTROS E INTEGRIDADE DE DADOS DE ZVZ

* **APENAS ZVZ DE LARGA ESCALA (21+ JOGADORES):**
  * O Battle Board é exclusivamente focado em **ZvZ de Larga Escala**.
  * **NUNCA reduza o filtro para menos de 21 jogadores da guilda** (`minPlayers=21` e `len(imortais_players) >= 21`).
  * Lutas com menos de 21 membros são ganks, roamings ou pequena escala e **NÃO DEVEM** poluir o banco de dados.

* **SUPABASE POSTGREST — LIMITE DE 1.000 LINHAS:**
  * O Supabase trunca silenciosamente consultas `.select()` em 1.000 linhas se não for especificado um limite maior.
  * Sempre use `.limit(10000)` para consultas de agregação global ou use `{ count: 'exact', head: true }` para contar totais.

* **CÁLCULO DE ASSIDUIDADE (0% a 100%):**
  * A assiduidade do jogador nunca pode ultrapassar 100%. Use sempre `Math.min(100, Math.round((matches / totalGuildBattles) * 100))`.

---

## 🎨 3. DESIGN SYSTEM & UI/UX

* **TEMA:** Cyber-Tech Glassmorphism com paleta clara moderna (`#f4f7f9`, bordas translúcidas `rgba(203,213,225,0.4)` e acentos em Cyan `#00f2ff`, Emerald `#00ff9d`, Crimson `#ff4d4d` e Amber `#ffcc00`).
* **CONTRASTE:** Sempre verifique que textos em fundos claros usem `var(--text-900)` ou `var(--text-700)`, e textos em tooltips/cards escuros usem `#f8fafc`.
* **TOOLTIPS (`HintIcon`):** Toda métrica complexa ou cálculo avançado deve possuir um ícone `HintIcon` com explicação em linguagem clara e acessível.
* **TESTES VISUAIS:** O usuário determinou: **NÃO faça testes visuais automatizados abrindo o navegador** (consome tokens desnecessários). Faça testes via código/TypeScript e oriente o usuário a conferir visualmente.

---

## 🚀 4. ESTRUTURA DOS SCRIPTS & `.BAT`

* **`Atualizar_Dados_Manualmente.bat`:** O único script que o usuário deve rodar no dia a dia. Executa `crawler.py` (batalhas) seguido de `crawler_kills.py` (kill events).
* **ENCODING WINDOWS (CP1252):** Os scripts Python executados via `.bat` no Windows powershell/cmd **NÃO devem imprimir emojis em unicode direto** nos prints principais (use `[OK]`, `[ERRO]`, `>` em vez de caracteres não-ASCII para evitar `UnicodeEncodeError`).
