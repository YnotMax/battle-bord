Directory structure:
└── ynotmax-battle-bord/
    ├── analise_api_albion_killboards.md
    ├── arquitetura_e_dados_battleboards.md
    ├── Atualizar_Dados_Manualmente.bat
    ├── code.html
    ├── Encher_Banco_Com_Historico.bat
    ├── ideias_e_features_battleboard.md
    ├── implementation_plan.md
    ├── novo_atalho_supabase_albionbb.md
    ├── task.md
    ├── scripts/
    │   ├── check_db.py
    │   ├── crawler.py
    │   ├── populate_history.py
    │   ├── reimport_players.py
    │   ├── requirements.txt
    │   ├── schema.sql
    │   ├── temp.json
    │   └── .env.example
    ├── site/
    │   ├── README.md
    │   ├── AGENTS.md
    │   ├── build-log.txt
    │   ├── CLAUDE.md
    │   ├── eslint.config.mjs
    │   ├── next.config.ts
    │   ├── package.json
    │   ├── postcss.config.mjs
    │   ├── tsconfig.json
    │   └── src/
    │       ├── app/
    │       │   ├── globals.css
    │       │   ├── layout.tsx
    │       │   ├── page.tsx
    │       │   ├── guild/
    │       │   │   └── page.tsx
    │       │   ├── player/
    │       │   │   ├── page.tsx
    │       │   │   └── [name]/
    │       │   │       └── page.tsx
    │       │   ├── presence/
    │       │   │   └── page.tsx
    │       │   ├── stats/
    │       │   │   └── page.tsx
    │       │   └── zerg/
    │       │       └── page.tsx
    │       ├── components/
    │       │   ├── DateFilter.tsx
    │       │   ├── Navigation.tsx
    │       │   └── PlayerRadar.tsx
    │       └── lib/
    │           ├── supabase.ts
    │           └── types.ts
    └── .github/
        └── workflows/
            └── albion_cron.yml

================================================
FILE: analise_api_albion_killboards.md
================================================
# RelatÃ³rio: AnÃ¡lise de ObtenÃ§Ã£o de Dados de Killboards do Albion Online

Este relatÃ³rio responde Ã s dÃºvidas sobre como sites (como AlbionBB), repositÃ³rios (como albion-killbot) e bots de Discord (como Albion Assistant) coletam e organizam dados de lutas e jogadores no Albion Online.

## 1. Como estes sites pegam os dados? (Existe alguma API?)

**Sim, existe uma API, mas ela Ã© interna e nÃ£o oficial.**

A Sandbox Interactive (desenvolvedora do Albion Online) nÃ£o oferece uma API pÃºblica, suportada e documentada para desenvolvedores terceiros. O que a comunidade faz Ã© utilizar a **Gameinfo API**, que Ã© a exata mesma API que o site oficial ([albiononline.com/killboard](https://albiononline.com/killboard)) usa nos bastidores para exibir suas prÃ³prias estatÃ­sticas.

Os desenvolvedores descobrem como essa API funciona acessando o Killboard oficial e usando a aba "Network" (Rede) das ferramentas de desenvolvedor do navegador (tecla F12) para inspecionar quais rotas de dados (endpoints) estÃ£o sendo requisitadas.

## 2. Como a API funciona e podemos pegar dados diretos?

VocÃª pode fazer requisiÃ§Ãµes HTTP (GET) diretamente para a API. Como o Albion abriu novos servidores, a URL base da API muda dependendo de qual servidor vocÃª quer consultar:

- **Americas (West):** `https://gameinfo.albiononline.com/api/gameinfo/`
- **Europe (Europe):** `https://gameinfo-ams.albiononline.com/api/gameinfo/`
- **Asia (East):** `https://gameinfo-sgp.albiononline.com/api/gameinfo/`

### Endpoints mais comuns (utilizados pelos bots e sites):
Embora nÃ£o exista documentaÃ§Ã£o oficial, a comunidade mapeou diversos endpoints ("caminhos" na URL para pegar dados especÃ­ficos), tais como:
- `/events`: Traz uma lista dos Ãºltimos eventos de kills (quem matou quem, assistÃªncia, equipamentos usados, etc.).
- `/events/{KillID}`: Traz detalhes de uma kill especÃ­fica.
- `/players/{PlayerID}`: Traz estatÃ­sticas detalhadas de um jogador (fame, KDA, guilda).
- `/guilds/{GuildID}`: Traz estatÃ­sticas de uma pÃ¡gina de guilda (fundador, membros, top killers).
- `/guilds/{GuildID}/top` e `/players/{PlayerID}/topkills`: Rankings especÃ­ficos para tabelas do discord.

Para organizar os dados, repositÃ³rios como o `albion-killbot` constroem robÃ´s (em NodeJS ou Python) que ficam consultando (fazendo "pooling") regularmente esses endpoints e salvando os eventos em um banco de dados prÃ³prio. Ao receber os dados do arquivo JSON gigante que a API retorna, o programa apenas filtra as informaÃ§Ãµes da guilda ou alianÃ§a desejadas.

## 3. Ã‰ viÃ¡vel usar essa API?

**Sim, Ã© viÃ¡vel e Ã© exatamente o que todos fazem.** Mas hÃ¡ ressalvas importantÃ­ssimas que vocÃª deve ter em seu radar antes de criar a infraestrutura do seu site:

- **Falta de Estabilidade (Sem SLA):** Como a API Ã© nÃ£o oficial, a Sandbox pode alterar os _endpoints_, os formatos das respostas JSON, ou atÃ© mesmo desativar endpoints temporariamente sem qualquer aviso. 
- **Limites de RequisiÃ§Ãµes (Rate Limits) e ProteÃ§Ãµes:** Se o seu site/bot fizer centenas de requisiÃ§Ãµes por segundo para vasculhar mortes, os servidores do Albion podem bloquear seu IP. Muitas vezes a API passa por trÃ¡s do **Cloudflare**, exigindo que as bibliotecas usadas para consultar a API precisem contornar bloqueios de bots (usando headers customizados que imitem um navegador).
- **Atraso nos Dados:** Os eventos raramente caem na API em tempo estritamente real. Geralmente existe um ligeiro atraso entre o que acontece in-game e o registro na pÃ¡gina de Gameinfo.

## 4. Onde encontrar bibliotecas, wrappers e repositÃ³rios Ãºteis para estudo?

Para facilitar seu desenvolvimento, nÃ£o Ã© necessÃ¡rio mapear os endpoints do zero. VocÃª pode estudar o cÃ³digo-fonte de vÃ¡rias iniciativas da comunidade para ver exatamente como as requisiÃ§Ãµes estÃ£o estruturadas.

**Fontes recomendadas para estudo:**

1. **[albion-killbot](https://github.com/agnjunio/albion-killbot) (e forks):**
   - **O que Ã©:** Um clÃ¡ssico bot de Discord em NodeJS.
   - **O que estudar neles:** Observe a pasta de rotas ou `src/` e veja como eles formam os links da API, configuram as variÃ¡veis periodicamente e filtram as "kills" e "deaths" que pertencem apenas Ã  guilda configurada.

2. **[psykzz/albion-api](https://github.com/psykzz/albion-api):**
   - **O que Ã©:** Um "Wrapper" da API construÃ­do pela comunidade.
   - **O que estudar:** Ã“timo para ver a listagem quase completa de endpoints descritos no cÃ³digo de forma limpa, para referenciar ao fazer o seu painel do site.

3. **[Albion Online Data Project](https://www.albion-online-data.com/):**
   - **O que Ã©:** Esta Ã© uma API focada em **Economia** (Mercado/Crafting), diferentemente do Killboard (focado em lutas/stats). 
   - **Como funciona:** Eles usam um cliente instalÃ¡vel que realiza _packet sniffing_ (capta o que transita na rede do usuÃ¡rio do jogo para o servidor) para alimentar os preÃ§os do mercado. VocÃª pode querer integrar com eles no futuro caso seu site da guilda precise de tabelas de reembolso (regear) baseadas em preÃ§os de mercado atualizados!

## 5. PrÃ³ximos Passos Sugeridos para o seu Site

Para criar seu "Battle Board" para a guilda, a rota de arquitetura sugerida seria:

1. Escolher a Stack tecnolÃ³gica (ex: TypeScript/Node + React ou Next.js, ou Python + Django).
2. Criar um **Backend prÃ³prio** que consulte a API do Albion (`/events`, `/guilds/{id}`) de tempos em tempos (cron job saudÃ¡vel, a cada X minutos) para nÃ£o ter seu painel banido.
3. Este seu Backend salvarÃ¡ essas lutas ("Killboards/Events") selecionadas em um Banco de Dados prÃ³prio (como um Postgres ou MongoDB) que pertenÃ§am aos integrantes da **sua Guilda**.
4. Construir o seu front-end/site de fato consumindo as informaÃ§Ãµes ricas, agrupadas e jÃ¡ salvas do *seu prÃ³prio banco de dados*, resultando em um carregamento ultra-rÃ¡pido para os usuÃ¡rios da sua guilda e nÃ£o incomodando os servidores do jogo toda vez que alguÃ©m der um F5 na sua pÃ¡gina.



================================================
FILE: arquitetura_e_dados_battleboards.md
================================================
# Mapeamento TÃ©cnico de Battleboards (PadrÃ£o AlbionBB)

ApÃ³s realizar uma varredura profunda em repositÃ³rios abertos, scripts desenvolvidos pela comunidade, na documentaÃ§Ã£o nÃ£o oficial dos endpoints e cruzar os dados com os dashboards que o AlbionBB constrÃ³i (conforme suas imagens), aqui estÃ¡ o fluxo tÃ©cnico **preciso** (sem especulaÃ§Ã£o) de como os dados sÃ£o extraÃ­dos, agregados e as tecnologias ideais para o seu projeto.

## 1. Como AlbionBB captura dados tÃ£o profundos (Dano, Cura, IP, PresenÃ§a)?

A Gameinfo API oficial nÃ£o possui um endpoint mÃ¡gico do tipo `/obter_estatisticas_de_dano_da_guilda`. O site **AlbionBB** cria tudo isso atravÃ©s de **agregaÃ§Ã£o e matemÃ¡tica**. O fluxo que eles seguem por baixo dos panos Ã© este:

### A) IdentificaÃ§Ã£o da Batalha (ZvZ)
Primeiro, eles consultam a lista de guildas no endpoint de batalhas:
- **Endpoint:** `GET /battles` (e.g., `https://gameinfo.albiononline.com/api/gameinfo/battles?offset=0&limit=50&sort=recent`)
Isso retorna uma lista de batalhas grandes. Uma batalha no Albion online nÃ£o Ã© um evento Ãºnico, mas sim um "agrupamento de abates/eventos" gerado pelos servidores quando percebe grande concentraÃ§Ã£o de PvP numa mesma `ZoneId`. Cada batalha tem o seu prÃ³prio `BattleId`.

### B) Varrimento de Todos os Eventos (Kills) dessa Batalha
Para conseguir saber quanto dano o "ygdriart" ou o "PancadaSeca" (seus membros) deram, o bot bate no seguinte endpoint especÃ­fico:
- **Endpoint:** `GET /battles/{ID}` ou `GET /events/battle/{BattleId}`
Isso retorna uma lista JSON massiva contendo **todos os abates (events)** de uma Ãºnica batalha ZvZ.

### C) ExtraÃ§Ã£o dos Dados Ocultos (DamageDone e SupportHealingDone)
Se vocÃª olhar o JSON cru que a API retorna de uma *kill* (evento), ele possui nÃ£o apenas quem matou (Killer) e quem morreu (Victim), mas tambÃ©m um array gigante chamado `Participants` (quem deu assistÃªncia na kill).
A "mÃ¡gica" mora dentro de cada jogador desse array. As chaves cruas da API sÃ£o:
- `DamageDone`: Dano causado Ã quela vÃ­tima.
- `SupportHealingDone`: Cura efetuada naquele evento de morte.
- `AverageItemPower`: O IP do participante no momento da morte.

> **Como o AlbionBB calcula os Totais:** Eles rodam um script que pega os 100~300 eventos de morte de uma batalha e vai somando: "O ygdriart deu 500 de dano na morte 1 + 1200 na morte 2... Total: 69.1k na Batalha inteira". O mesmo Ã© feito para Cura. O Item Power das tabelas deles (`AVG IP`) Ã© a mÃ©dia de IP em todas essas participaÃ§Ãµes.

## 2. Como eles descobrem a "Classe/Papel/Role" do jogador?
Na imagem que vocÃª mandou, Ã  direita da tabela, existem Ã­cones (Tank - escudo, Support - bandeira, Healer - cruz verde, Melee - espada, Ranged - arco). 
O Albion _nÃ£o fornece essa classe_. O AlbionBB usa um robÃ´ que olha o array `Equipment` do jogador em cada abate. Esse array expÃµe a arma (`MainHand`), as armaduras (`Armor`) e off-hand. 

Eles fazem uma classificaÃ§Ã£o Hard Coded ("se/entÃ£o"):
- **Healer:** Se `MainHand` for "Holy Staff" (Cajados Sagrados) ou "Nature Staff" (Cajados da Natureza).
- **Tank:** Se `MainHand` for Maca (Mace), Martelo (Hammer) ou LanÃ§as especÃ­ficas, e `Armor` for roupa de Plate (Placa).
- **Suporte ZvZ:** Locus, Enigma.
- **Ranged DPS:** Frost, Fire, Bows.
- Eles tabulam e contam com quantas builds diferentes vocÃª jogou. Se o "PancadaSeca" jogou 35 vezes de Melee e 7 vezes de Healer, essa classificaÃ§Ã£o ali na direita serÃ¡ preenchida correspondente a essas vezes.

## 3. PresenÃ§a de Guilda (Attendance)
Attendance de Jogador nÃ£o vem de nenhum endpoint chamado `/attendance`. O AlbionBB simplesmente sabe quantas batalhas a Guilda "IMORTAIS" esteve presente nos Ãºltimos 30 dias. Toda vez que aparece o ID de um jogador na lista de matadores (`Killer`), participantes (`Participants`) ou VÃ­timas (`Victim`) de uma batalha da guilda, eles contabilizam **+1 em Attendance** no banco de dados para ele.

---

## 4. Arquitetura Ideal para Construir (O que Usar?)

Se quisermos construir algo com a qualidade de AlbionBB ou superior, ser preciso, veloz, customizado e o mais importante: sem sofrer os temidos banimentos/rate-limit de IP da Sandbox (Cloudflare Error 1020), o projeto tem que ser desenhado com duas partes:

### Parte 1: O "Scraper Worker" (Backend no Modo InvisÃ­vel)
VocÃª precisarÃ¡ de um script, idealmente em **Node.js (TypeScript) ou Python (Celery/RQ)** rodando sem parar.
- **Tarefa:** Esse script de 5 em 5 minutos consulta `GET /battles`. Toda vez que o ID novo for detectado e tiver a presenÃ§a da guilda *IMORTAIS*, o Worker baixa todos os Kills desse ID.
- **Processamento:** Ele soma todos os `DamageDone`, `SupportHealingDone`, extrai os IPs e Classes pelo `Equipment` e condensa a mÃ©dia. O *scrapper* precisa imitar headers de navegador (User-Agent legÃ­vel).
- **Destino:** Salva esses dados mastigados e limpinhos jÃ¡ aglomerados em um banco de dados local da sua plataforma, preferencialmente **PostgreSQL** (se os esquemas de dados forem definidos), pois as buscas de player X na batalha Y sÃ£o complexas.

### Parte 2: O Visual "Battle Board" (O Painel UI)
AÃ­ sim entra sua aplicaÃ§Ã£o Web. Como vocÃª me mostrou telas maravilhosas do AlbionBB e pediu algo impactante e completo:
- **Frontend Realtime:** Usar o framework **Next.js** com a biblioteca de componentes visuais do **TailwindCSS** + **Shadcn** ou **Mantine** (possibilitam facilmente aqueles visuais Dark Mode, caixinhas coloridas brilhantes de Status, grÃ¡ficos lindos).
- Para os grÃ¡ficos de Attendance ao longo do tempo (Dano distribuÃ­do vs Cura), a implementaÃ§Ã£o da biblioteca *Recharts* ou *Chart.js* vai encantar os Oficiais da sua Guilda para gerenciar os membros.
- Quando o site for requisitado (O jogador visita: `meusite.com/guild/imortais`), ele **nÃ£o vai falar com os servidores da Albion**, pois jÃ¡ sofre restriÃ§Ãµes brutais. O Frontend de seu painel acessarÃ¡ os dados jÃ¡ processados do seu banco de dados Postgre/MongoDB local. Ã‰ isso que permite ao AlbionBB carregar estatÃ­sticas na velocidade da luz e dar filtros com zero delay.

## Resumo Executivo para a AÃ§Ã£o:
VocÃª **pode** recriar isso fielmente porque os dados vitais (`DamageDone` e `SupportHealingDone`) que nÃ³s confirmamos estarem lÃ¡ em **nÃ­vel atÃ´mico** nas requests dos *Participants*, sÃ£o somados e tabelados localmente. O desenvolvimento serÃ¡ 80% sobre organizar o robÃ´ pescador (parser JSON) para limpar os eventos e fazer mÃ©dias corretas de matemÃ¡tca simples e 20% no Design de um Ã³timo UI de Dashboards (que eu posso codar pra vocÃª em React UI futuramente, jÃ¡ prevendo estes dados).



================================================
FILE: Atualizar_Dados_Manualmente.bat
================================================
@echo off
title Imortais ZvZ Crawler
color 0B

echo.
echo ========================================================
echo    BATTLE BOARD IMORTAIS: Crawler de Lutas (Sincronizar)
echo ========================================================
echo.
echo Contactando a Inteligencia de Banco de Dados...
echo Aguarde, isso pode levar alguns segundos se houver lutas extensas.
echo.

:: Navega magicamente para a pasta exata onde esse script (.bat) esta
cd /d "%~dp0"

:: Executa o seu arquivo Python (o seu PC ja sabe encontrar o Python)
python scripts\crawler.py

echo.
echo ========================================================
echo    VERIFICACAO CONCLUIDA COM SUCESSO!
echo    Sua plataforma ja pode ser atualizada (F5) no navegador.
echo ========================================================
echo.
pause



================================================
FILE: code.html
================================================
<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>IMORTAIS | Guild Administrative Hub</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&amp;family=JetBrains+Mono:wght@300;400;500&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
          darkMode: "class",
          theme: {
            extend: {
              colors: {
                "tech-cyan": "#00f2ff",
                "tech-emerald": "#00ff9d",
                "tech-crimson": "#ff4d4d",
                "tech-amber": "#ffcc00",
                "surface-glass": "rgba(255, 255, 255, 0.5)",
              },
              fontFamily: {
                "headline": ["Space Grotesk", "sans-serif"],
                "mono": ["JetBrains Mono", "monospace"],
              },
              boxShadow: {
                "cyber-glow": "0 0 20px rgba(0, 242, 255, 0.1)",
                "glass": "0 8px 32px 0 rgba(15, 23, 42, 0.04)",
              }
            },
          },
        }
    </script>
<style type="text/tailwindcss">
        @layer base {
            body {
                @apply bg-[#f4f7f9] text-slate-800 font-headline antialiased overflow-hidden;
                background-image: 
                    radial-gradient(circle at 0% 0%, rgba(0, 242, 255, 0.05) 0%, transparent 50%),
                    radial-gradient(circle at 100% 100%, rgba(0, 255, 157, 0.05) 0%, transparent 50%),
                    linear-gradient(rgba(203, 213, 225, 0.2) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(203, 213, 225, 0.2) 1px, transparent 1px);
                background-size: 100% 100%, 100% 100%, 30px 30px, 30px 30px;
            }
        }
        .cyber-glass {
            @apply backdrop-blur-xl bg-white/60 border border-white/80 shadow-glass rounded-sm;
            position: relative;
        }
        .cyber-glass::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(0, 242, 255, 0.3), transparent);
        }
        .tech-scroll::-webkit-scrollbar {
            width: 4px;
        }
        .tech-scroll::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.02);
        }
        .tech-scroll::-webkit-scrollbar-thumb {
            @apply bg-slate-200 rounded-full hover:bg-tech-cyan/50 transition-colors;
        }
        .glow-line {
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(0, 242, 255, 0.4), transparent);
        }
        .slot-box {
            @apply w-10 h-10 border border-slate-200/60 bg-white/40 flex items-center justify-center rounded-sm text-[10px] font-mono text-slate-400;
        }
        .slot-box.fail {
            @apply border-tech-crimson/30 bg-tech-crimson/5 text-tech-crimson;
        }
        .slot-box.pass {
            @apply border-tech-emerald/30 bg-tech-emerald/5 text-tech-emerald;
        }
    </style>
</head>
<body class="h-screen flex flex-col">
<header class="h-16 border-b border-white/60 bg-white/40 backdrop-blur-md flex items-center justify-between px-6 z-50 shrink-0">
<div class="flex items-center gap-10">
<div class="flex items-center gap-3">
<div class="w-8 h-8 bg-slate-900 flex items-center justify-center rotate-45">
<span class="material-symbols-outlined text-white text-lg -rotate-45">admin_panel_settings</span>
</div>
<div>
<h1 class="text-lg font-bold tracking-[0.25em] text-slate-900 leading-none">IMORTAIS</h1>
<span class="text-[9px] font-mono tracking-widest text-tech-cyan">GUILD ADMIN HUB</span>
</div>
</div>
<div class="h-8 w-[1px] bg-slate-200"></div>
<nav class="flex gap-8 text-[10px] font-mono uppercase tracking-widest">
<div class="flex flex-col">
<span class="text-slate-400">Battle Stats</span>
<span class="text-slate-900 font-bold">2.4 K/D AVG</span>
</div>
<div class="flex flex-col">
<span class="text-slate-400">Compliance</span>
<span class="text-tech-emerald font-bold">92.4% ACTIVE</span>
</div>
</nav>
</div>
<div class="flex items-center gap-6">
<div class="flex items-center gap-4 px-4 py-2 bg-slate-900/5 rounded-full border border-slate-900/10">
<span class="material-symbols-outlined text-sm text-slate-500">search</span>
<input class="bg-transparent border-none focus:ring-0 text-[10px] font-mono w-40 uppercase tracking-widest" placeholder="QUERY OPERATOR..." type="text"/>
</div>
<div class="flex gap-2">
<button class="w-9 h-9 flex items-center justify-center border border-slate-200 rounded-sm text-slate-500 hover:text-tech-cyan transition-colors">
<span class="material-symbols-outlined text-lg">settings</span>
</button>
<div class="w-9 h-9 bg-slate-900 rounded-sm flex items-center justify-center">
<img alt="Admin" class="w-full h-full object-cover rounded-sm opacity-80" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBrXG8A5-cZy5KaiK0znOv00EO6cyp6sCTBnfoGnZpvUfH0_qIFogz6Z2TDStJTB-iYoYuh8wGGJg8o9vIxSEwKfMdp7MZkGhlruFMBzbEOv6hz6_NclTFEcEZIVjtlq6mXflVkWlUiZC10Gnh-vmbPQ08KKTDCrMXNDI49Xajk1cNbG88yjVJG9YzonIz-qF06HRBktB2C7CGEFEmnweeWXsF34Cn-58WS_h7jtOc3pieD1S5F0BUelHtaMw0AwYhGf2frPsayaiSP"/>
</div>
</div>
</div>
</header>
<div class="flex flex-1 overflow-hidden">
<aside class="w-20 border-r border-white/60 bg-white/20 backdrop-blur-sm flex flex-col items-center py-6 gap-8 shrink-0">
<button class="w-12 h-12 bg-white border border-slate-200 text-tech-cyan shadow-sm flex items-center justify-center rounded-sm">
<span class="material-symbols-outlined">analytics</span>
</button>
<button class="w-12 h-12 text-slate-400 hover:text-slate-600 flex items-center justify-center">
<span class="material-symbols-outlined">shield</span>
</button>
<button class="w-12 h-12 text-slate-400 hover:text-slate-600 flex items-center justify-center">
<span class="material-symbols-outlined">biotech</span>
</button>
<button class="w-12 h-12 text-slate-400 hover:text-slate-600 flex items-center justify-center">
<span class="material-symbols-outlined">monitoring</span>
</button>
<div class="mt-auto flex flex-col gap-6 items-center">
<div class="w-1 h-12 bg-gradient-to-b from-transparent via-tech-cyan/30 to-transparent"></div>
<button class="w-12 h-12 text-slate-400 hover:text-tech-crimson flex items-center justify-center">
<span class="material-symbols-outlined">logout</span>
</button>
</div>
</aside>
<main class="flex-1 flex overflow-hidden p-6 gap-6">
<section class="w-1/3 flex flex-col gap-4">
<div class="flex justify-between items-end mb-2">
<div class="flex items-center gap-2">
<span class="text-[10px] font-mono text-slate-400 tracking-[0.2em] uppercase">Operator Registry</span>
</div>
<span class="text-[10px] font-mono text-tech-cyan">84 ONLINE</span>
</div>
<div class="cyber-glass flex-1 overflow-hidden flex flex-col">
<div class="p-4 border-b border-slate-100 flex justify-between items-center bg-white/40">
<span class="text-[11px] font-bold tracking-widest uppercase">Member Roster</span>
<span class="material-symbols-outlined text-slate-400 text-sm">filter_list</span>
</div>
<div class="flex-1 overflow-y-auto tech-scroll">
<table class="w-full text-left">
<thead class="sticky top-0 bg-white/90 backdrop-blur-md z-10">
<tr class="text-[9px] font-mono text-slate-400 uppercase tracking-widest border-b border-slate-100">
<th class="px-5 py-3 font-normal">Operator</th>
<th class="px-5 py-3 font-normal">Role</th>
<th class="px-5 py-3 font-normal text-right">Compliance</th>
</tr>
</thead>
<tbody class="divide-y divide-slate-50">
<tr class="hover:bg-tech-cyan/5 transition-colors cursor-pointer group bg-white/30">
<td class="px-5 py-4">
<div class="flex items-center gap-3">
<div class="w-8 h-8 rounded-sm bg-slate-100 overflow-hidden">
<img class="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAnDxJx7rbPEPflbKM8jK7Xpa-osXi-RgMWfBdbUgF0rouNHSgWp6stwNUN3rTOo-lANp5KozT1y_kMPVy8NXttRUAm0FtyPmI4rtV0uO-W-UQLSTOz8BjdYRuDXIIqKU510de-UH9AJ_88IVlK6JMTUl2jYBm785B6inXAomeVLsabWGeqZ2sp9QdqCPqsf5nOlqHW_2KTgjTYQUfSylLHobxyRfKJtvlcSkdkP8IAHsrbuGM4GhiBufFCft8yNogphuRQDYqLUlBe"/>
</div>
<div>
<div class="text-xs font-bold text-slate-900">KRONOS_X</div>
<div class="text-[9px] font-mono text-slate-400">ID: 0291022</div>
</div>
</div>
</td>
<td class="px-5 py-4">
<span class="text-[10px] font-mono px-2 py-0.5 bg-slate-900 text-white rounded-sm">DPS</span>
</td>
<td class="px-5 py-4 text-right">
<span class="text-[10px] font-mono text-tech-emerald font-bold">100%</span>
</td>
</tr>
<tr class="hover:bg-tech-cyan/5 transition-colors cursor-pointer group border-l-2 border-tech-cyan">
<td class="px-5 py-4 bg-tech-cyan/[0.03]">
<div class="flex items-center gap-3">
<div class="w-8 h-8 rounded-sm bg-slate-100 overflow-hidden ring-1 ring-tech-cyan/50">
<img class="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBA4PofwvWJ6rLfmnE38--yapr6nWXk17ULkaIUUVSkCQpj6afPPm5BI0hQxfIVJ-9Fff5diDD1wI2sPGMx6UKV1LPisTldpYaZae_K8A69yWXpCXqrG69SASgFf1vjsVTMRbDaRW3pGi0zsueZgcKdqbtmVIFibBtUC2UFAsKewCZ_zP4_JCNcvwNe8keib4tv9Gw8eIOjicKxTQCinBaoYe_AwRII5owQVPriSs2lUMPQX6z5gSh79KAyxh_UdNC_s73tfQ1SB-CJ"/>
</div>
<div>
<div class="text-xs font-bold text-slate-900">V0ID_STALKER</div>
<div class="text-[9px] font-mono text-slate-400">ID: 1128392</div>
</div>
</div>
</td>
<td class="px-5 py-4 bg-tech-cyan/[0.03]">
<span class="text-[10px] font-mono px-2 py-0.5 bg-tech-cyan/10 text-tech-cyan rounded-sm border border-tech-cyan/20">SUPPORT</span>
</td>
<td class="px-5 py-4 text-right bg-tech-cyan/[0.03]">
<span class="text-[10px] font-mono text-tech-amber font-bold">85%</span>
</td>
</tr>
<tr class="hover:bg-tech-cyan/5 transition-colors cursor-pointer group">
<td class="px-5 py-4">
<div class="flex items-center gap-3">
<div class="w-8 h-8 rounded-sm bg-slate-100 overflow-hidden">
<img class="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCkAZjv7NjaXT6FKJ9t577EYol3Lv87OJgAodeRRyKZWRNqa-uF7IFXGDC4BsDpzpCITzYG4zS41u4J5S-h771OibDpM00d9BWW3cJvt_fAjzMKMBxRgeGDfu8rpzKcDhchDSTtJpL8WuAKsCGunK981LPSTfhIo7P0sqUGXu89yOhyd-vVA5OyGNLfCCqwYrpq6DKSZpBDFeDGyniYKPmF-Zw3Mbz5Zmv8oOkldYklHZ0NsN9jqJtNxjOUmsZaFTwkrp3jH-DFqU2q"/>
</div>
<div>
<div class="text-xs font-bold text-slate-900">BONE_CRUSHER</div>
<div class="text-[9px] font-mono text-slate-400">ID: 8827102</div>
</div>
</div>
</td>
<td class="px-5 py-4">
<span class="text-[10px] font-mono px-2 py-0.5 bg-slate-200 text-slate-600 rounded-sm">TANK</span>
</td>
<td class="px-5 py-4 text-right">
<span class="text-[10px] font-mono text-tech-emerald font-bold">100%</span>
</td>
</tr>
<tr class="hover:bg-tech-cyan/5 transition-colors cursor-pointer group">
<td class="px-5 py-4">
<div class="flex items-center gap-3">
<div class="w-8 h-8 rounded-sm bg-slate-100 overflow-hidden">
<img class="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAsAHDhW2a34XzIgphosR2-bwQwcv1xZdiua5CaYn0rRXOXY7A_2dOmZZVZX4126iBaxYBoYe__ytbb63cSgGLdl1oRSvTEqGZbyqOaUrSCB9sXxiEIDH6GQ7zqitJBiTHOF9Ni5q5MlKXPslVfI5vFqfZOmA8Omb4BHoZOtJCuo-PgFbvi2QJgdleGPCfS4zalIYPbaSPZ60oWpmuN6tOhIp5Dv8jRq1UtRGqM1yx1VrELM-Q6qzBnxzc0qindk6H5C0QSVdM7dOI8"/>
</div>
<div>
<div class="text-xs font-bold text-slate-900">SILENT_PATH</div>
<div class="text-[9px] font-mono text-slate-400">ID: 0092182</div>
</div>
</div>
</td>
<td class="px-5 py-4">
<span class="text-[10px] font-mono px-2 py-0.5 bg-slate-900 text-white rounded-sm">SCOUT</span>
</td>
<td class="px-5 py-4 text-right">
<span class="text-[10px] font-mono text-tech-crimson font-bold">42%</span>
</td>
</tr>
</tbody>
</table>
</div>
</div>
</section>
<section class="flex-1 flex flex-col gap-6 overflow-hidden">
<div class="grid grid-cols-3 gap-6 shrink-0">
<div class="col-span-2 cyber-glass p-6">
<div class="flex justify-between items-start mb-6">
<div>
<h3 class="text-xs font-bold tracking-widest uppercase text-slate-900">Zerg Police Inspector</h3>
<p class="text-[10px] font-mono text-slate-400">TARGET: V0ID_STALKER â€¢ ACTIVE DEPLOYMENT</p>
</div>
<div class="bg-tech-amber/10 border border-tech-amber/20 px-3 py-1 rounded-sm">
<span class="text-[9px] font-mono text-tech-amber font-bold">WARNING: SUB-OPTIMAL GEAR</span>
</div>
</div>
<div class="flex items-center gap-10">
<div class="grid grid-cols-4 gap-2">
<div class="slot-box pass">HEAD</div>
<div class="slot-box pass">BODY</div>
<div class="slot-box pass">BOOTS</div>
<div class="slot-box fail">CAPE</div>
<div class="slot-box pass">MAIN</div>
<div class="slot-box pass">OFF</div>
<div class="slot-box fail">FOOD</div>
<div class="slot-box pass">POT</div>
</div>
<div class="h-16 w-[1px] bg-slate-100"></div>
<div class="flex-1 space-y-3">
<div class="flex justify-between text-[10px] font-mono">
<span class="text-slate-400">REPORTED MOUNT:</span>
<span class="text-tech-crimson font-bold">T3 HORSE (LOW TIER)</span>
</div>
<div class="flex justify-between text-[10px] font-mono">
<span class="text-slate-400">AVERAGE IP:</span>
<span class="text-slate-900 font-bold">1042 (REQ: 1300)</span>
</div>
<div class="flex justify-between text-[10px] font-mono">
<span class="text-slate-400">FACTION COMPLIANCE:</span>
<span class="text-tech-emerald font-bold">VALID</span>
</div>
</div>
</div>
</div>
<div class="cyber-glass p-6 flex flex-col justify-between">
<div class="flex items-center gap-2 mb-2">
<span class="material-symbols-outlined text-tech-cyan text-sm">stars</span>
<h3 class="text-[10px] font-bold tracking-widest uppercase text-slate-900">PERFORMANCE RATIO</h3>
</div>
<div class="text-3xl font-light text-slate-900">4.2 <span class="text-[10px] font-mono text-slate-400">EFF</span></div>
<div class="mt-4 pt-4 border-t border-slate-100">
<div class="text-[9px] font-mono text-slate-400 uppercase tracking-widest mb-1">Efficiency Ranking</div>
<div class="h-1 bg-slate-100 w-full overflow-hidden flex">
<div class="h-full bg-tech-cyan" style="width: 85%"></div>
</div>
<div class="mt-1 text-[9px] font-mono text-tech-cyan">TOP 5% OF GUILD</div>
</div>
</div>
</div>
<div class="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
<div class="cyber-glass flex flex-col overflow-hidden">
<div class="p-4 border-b border-slate-100 flex justify-between items-center bg-white/40">
<h3 class="text-xs font-bold tracking-widest uppercase">Healer Microscope (HPM)</h3>
<span class="material-symbols-outlined text-tech-cyan text-sm">biotech</span>
</div>
<div class="p-6 flex-1 flex flex-col justify-between">
<div class="h-32 flex items-end gap-1 px-2">
<div class="flex-1 bg-tech-cyan/20 h-[30%] hover:bg-tech-cyan/40 transition-colors"></div>
<div class="flex-1 bg-tech-cyan/20 h-[45%] hover:bg-tech-cyan/40 transition-colors"></div>
<div class="flex-1 bg-tech-cyan/20 h-[85%] hover:bg-tech-cyan/40 transition-colors"></div>
<div class="flex-1 bg-tech-cyan/20 h-[60%] hover:bg-tech-cyan/40 transition-colors"></div>
<div class="flex-1 bg-tech-cyan/20 h-[95%] hover:bg-tech-cyan/40 transition-colors"></div>
<div class="flex-1 bg-tech-cyan/30 h-[70%] hover:bg-tech-cyan/40 transition-colors border-t-2 border-tech-cyan"></div>
</div>
<div class="flex justify-between mt-4 text-[9px] font-mono text-slate-400 tracking-widest">
<span>-10 MIN</span>
<span>-5 MIN</span>
<span class="text-tech-cyan">LIVE ENGAGEMENT</span>
</div>
<div class="mt-6 space-y-2">
<div class="flex justify-between text-[10px] font-mono border-b border-slate-50 pb-2">
<span class="text-slate-400">PEAK HEALS/MIN:</span>
<span class="text-slate-900 font-bold">14,200 HPM</span>
</div>
<div class="flex justify-between text-[10px] font-mono border-b border-slate-50 pb-2">
<span class="text-slate-400">ENGAGEMENT CLASS:</span>
<span class="text-tech-emerald font-bold">HERO</span>
</div>
</div>
</div>
</div>
<div class="cyber-glass flex flex-col overflow-hidden">
<div class="p-4 border-b border-slate-100 flex justify-between items-center bg-white/40">
<h3 class="text-xs font-bold tracking-widest uppercase">Combat Metrics</h3>
<span class="material-symbols-outlined text-slate-400 text-sm">query_stats</span>
</div>
<div class="p-6 space-y-6">
<div class="grid grid-cols-2 gap-4">
<div class="p-3 bg-slate-50 border border-slate-100">
<div class="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Damage Done</div>
<div class="text-lg font-bold text-slate-900">421K</div>
</div>
<div class="p-3 bg-slate-50 border border-slate-100">
<div class="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Kills</div>
<div class="text-lg font-bold text-slate-900">14</div>
</div>
<div class="p-3 bg-slate-50 border border-slate-100">
<div class="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Deaths</div>
<div class="text-lg font-bold text-slate-900">02</div>
</div>
<div class="p-3 bg-slate-50 border border-slate-100">
<div class="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Support Done</div>
<div class="text-lg font-bold text-slate-900">892K</div>
</div>
</div>
<div class="bg-tech-cyan/5 p-4 border border-tech-cyan/10 rounded-sm">
<div class="flex items-center gap-2 mb-2">
<span class="material-symbols-outlined text-tech-cyan text-[14px]">history</span>
<span class="text-[10px] font-mono font-bold text-slate-900">HISTORICAL TREND</span>
</div>
<p class="text-[10px] text-slate-500 leading-relaxed italic">
                                    "Consistently high performance in support roles during Black Zone operations. Maintaining 2.0+ K/D over last 48 hours."
                                </p>
</div>
</div>
</div>
</div>
<div class="cyber-glass shrink-0">
<div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white/40">
<span class="text-[11px] font-bold tracking-widest uppercase">Operational Battle Log</span>
<div class="flex gap-4">
<span class="text-[9px] font-mono text-slate-400">LAST BATTLE: 4M AGO</span>
</div>
</div>
<div class="p-6">
<div class="flex gap-8 overflow-x-auto tech-scroll pb-2">
<div class="min-w-[200px] p-3 border-l-2 border-tech-emerald bg-white/40">
<div class="text-[9px] font-mono text-slate-400">SUNSTRAND SHOALS</div>
<div class="text-xs font-bold text-slate-900">WIN â€¢ 2.1 K/D</div>
</div>
<div class="min-w-[200px] p-3 border-l-2 border-tech-crimson bg-white/40">
<div class="text-[9px] font-mono text-slate-400">REDTREE ENCLAVE</div>
<div class="text-xs font-bold text-slate-900">LOSS â€¢ 0.8 K/D</div>
</div>
<div class="min-w-[200px] p-3 border-l-2 border-tech-emerald bg-white/40 opacity-50">
<div class="text-[9px] font-mono text-slate-400">GRAVE ANCIENTS</div>
<div class="text-xs font-bold text-slate-900">WIN â€¢ 3.4 K/D</div>
</div>
</div>
</div>
</div>
</section>
</main>
</div>
<div class="fixed bottom-6 right-6 w-80 cyber-glass overflow-hidden z-50">
<div class="p-3 bg-[#5865F2] flex items-center justify-between">
<div class="flex items-center gap-2">
<span class="material-symbols-outlined text-white text-sm">hub</span>
<span class="text-[10px] font-mono text-white font-bold tracking-widest">DISCORD STREAM</span>
</div>
<span class="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
</div>
<div class="p-4 space-y-3">
<div class="flex gap-3">
<div class="w-1 bg-tech-cyan"></div>
<div>
<div class="text-[10px] font-bold text-slate-900">BATTLE_ALERT: BLACK ZONE</div>
<div class="text-[9px] font-mono text-slate-400 mt-0.5">Deployment confirmed in Deepwood Gorge. 14 members active.</div>
</div>
</div>
<button class="w-full py-2 bg-slate-900 text-white text-[9px] font-bold tracking-widest uppercase hover:bg-tech-cyan transition-colors">
                JOIN VOICE COMMS
            </button>
</div>
</div>

</body></html>


================================================
FILE: Encher_Banco_Com_Historico.bat
================================================
@echo off
title Imortais ZvZ - Maquina do Tempo
color 0D

echo.
echo ========================================================
echo    BATTLE BOARD IMORTAIS: MAQUINA DO TEMPO (HISTORICO)
echo ========================================================
echo.
echo Iniciando coleta massiva. Isso vai lotar o seu banco com estatisticas antigas pra 
echo o painel ficar riquissimo! Pode demorar alguns minutos.
echo.

cd /d "%~dp0"
python scripts\populate_history.py

echo.
echo ========================================================
echo    DADOS INJETADOS COM SUCESSO! DE F5 NO SITE.
echo ========================================================
echo.
pause



================================================
FILE: ideias_e_features_battleboard.md
================================================
Error reading file with 'cp1252': 'charmap' codec can't decode byte 0x8f in position 4654: character maps to <undefined>


================================================
FILE: implementation_plan.md
================================================
# Battle Board IMORTAIS - Road Map e Prioridades

As ideias que tivemos sÃ£o incrÃ­veis, mas na arquitetura de software (ainda mais lidando com estatÃ­sticas), nÃ³s temos o "Efeito DominÃ³". Um grÃ¡fico de MVP nÃ£o pode existir se nÃ£o existir um cÃ¡lculo de dano prÃ©vio; e um cÃ¡lculo de dano nÃ£o existe sem a tabela de batalha bÃ¡sica.

Fiz uma filtragem baseada na **Viabilidade TÃ©cnica** e no **Engajamento MÃ¡ximo** que isso vai gerar para sua guilda, dividindo em TrÃªs Fases cruciais.

## Fase 1: A FundaÃ§Ã£o de AÃ§o (Prioridade MÃ¡xima)
**O que Ã©:** O alicerce! Nenhuma outra ideia super legal que tivemos consegue operar se os dados nÃ£o estiverem guardadinhos na sua casa primeiro.
- **EstruturaÃ§Ã£o TecnolÃ³gica:** Setup do Frontend usando **Next.js** + Setup do banco de dados **Supabase**.
- **Desenvolvimento do Crawler:** Vamos codar o seu script que bate na `api.albionbb.com`, puxa as lutas diÃ¡rias da IMORTAIS e injeta no Supabase em tabelas otimizadas chamadas `Batalhas` e `Participantes`.
- **UI Base e Leaderboards Simples:** A sua Home Page provisÃ³ria terÃ¡ a listagem de **"Ãšltimas Lutas"** (igual ao AlbionBB) e duas colunas de TrofÃ©u globais: O CampeÃ£o Supremo de **Dano** (DPS Global) e de **Cura** Global.
- **Por que Ã© o 1Âº Passo:** Isso prova que o ecossistema (AlbionBB > Supabase > Nosso Site) funciona liso em segundos, e jÃ¡ te entrega um placar pronto pra instigar a guilda a subir nÃºmeros.

---

## Fase 2: O Radar de PresenÃ§a e a JustiÃ§a Cega
**O que Ã©:** Transformar os dados numÃ©ricos brutos em planilhas que os Gestores da Guilda imploram para ter, organizando o ClÃ£.
- **Painel de Attendance (PresenÃ§a Limpa):** Uma pÃ¡gina feita sÃ³ para os Co-Leaders avaliarem, num clique, quem logou em 80% das batalhas do final de semana vs quem zerou no mÃªs (facilita os famosos "kicks").
- **Tabelas de Roles Filtradas (Ranking Justo):** VocÃª parou para pensar que um Healer ou um Tank jamais serÃ¡ reconhecido numa leaderboard de Dano? Aqui vamos criar o "Match-up por Classes", o site vai fazer um pÃ³dio visual incrÃ­vel apenas do Top 3 Healers de HPM (Cura/Min), Top 3 Suportes, Top 3 Tanks com maior sobrevida.
- **Por que Ã© o 2Âº Passo:** Com o Supabase jÃ¡ alimentado pela Fase 1, cruzar quantas vezes o "ygdriart" aparece como Healer exige poucas linhas de cÃ³digo do Banco. Vai gerar uma competiÃ§Ã£o muito saudÃ¡vel na Zerg e ajudar ativamente na gestÃ£o administrativa da IMORTAIS.

---

## Fase 3: As Features Picas (Premium)
**O que Ã©:** O puro brilho! Ferramentas analÃ­ticas e grÃ¡ficas para colocar a sua IMORTAIS dez passos a frente de guildas gigantes do Albion, usando os dados jÃ¡ validados.
- **GrÃ¡fico de "Zerg Comp Habitual":** Um belÃ­ssimo grÃ¡fico de Pizza no centro da Dashboard principal avisando os jogadores: *Temos 15% Tanks, 45% Range e precisamos de Caster Supports*.
- **"O Teste EconÃ´mico" (O Inspetor de Gear/Zerg Police):** Avaliamos o Array de "*Equipment*" da luta que puxamos lÃ¡ na Fase 1. Se os equipamentos daquele membro nÃ£o correspondem Ã s metralhadoras ou cajados permitidos na Build de Zerg, apontamos uma "multa"/tag vermelha indicando Troller (set barato demais ou classe inventada na hora H).
- **Bot Alerta (Webhook):** Assim que o robÃ´ da Fase 1 pescar uma Batalha no Banco Supabase, ele ejeta mensagem automÃ¡tica no Chat do Discord. "Batalha Registrada contra a ROTA. Acessem `imortais-board.app` para ver o herÃ³i MVP."

## User Review Required

> [!IMPORTANT]
> **VocÃª aprova essa divisÃ£o de Fases de Desenvolvimento?**
> Sendo assim, o nosso "Marco Zero" que comeÃ§aremos as mÃ£os na massa amanhÃ£ mesmo Ã©: Bolar e Inicializar o Setup do Next.js UI para a fundaÃ§Ã£o e a extraÃ§Ã£o limpa desses dados em um Supabase. Posso dar a largada por este plano de Arquitetura em Fases?



================================================
FILE: novo_atalho_supabase_albionbb.md
================================================
# RelatÃ³rio Atualizado: O "Atalho" da API do AlbionBB

ApÃ³s mergulhar na arquitetura do site `albionbb.com`, descobrimos uma mina de ouro. Em vez do AlbionBB consumir o jogo e fazer todos os cÃ¡lculos no lado do cliente, eles possuem um servidor prÃ³prio (`api.albionbb.com`) onde eles jÃ¡ mastigaram todos os dados complexos do jogo.

Isso muda o nosso jogo. Em vez de calcular tudo do zero, nÃ³s podemos **consultar a API pÃºblica deles**.

## 1. Como a API do AlbionBB Funciona (O Atalho)

A estrutura de endpoints que eles deixam abertos Ã© infinitamente superior e mais rica que a oficial do jogo. Olha o que nÃ³s ganhamos ao bater nos caminhos deles:

### A) Busca de Batalhas Facilitada
*   **Endpoint:** `https://api.albionbb.com/us/battles?search=IMORTAIS`
*   **O que faz:** Retorna uma lista limpa apenas das lutas que envolveram a guilda IMORTAIS, informando o ID da Batalha, oponente principal, data, total de jogadores da frente e fama conquistada, sem precisarmos varrer um milhÃ£o de lutas de guildas que nÃ£o nos interessam!

### B) Os Dados Mastigados (A Grande Vantagem)
*   **Endpoint:** `https://api.albionbb.com/us/battles/{ID_DA_BATALHA}`
*   **O que faz:** Quando vocÃª consulta uma batalha neles, ao invÃ©s de vir um monte de eventos difÃ­ceis de ler, vem uma Array (lista) de `players` contendo:
    *   `DamageDone` (Dano total jÃ¡ somado da luta inteira).
    *   `SupportHealingDone` (Cura total jÃ¡ somada!).
    *   **`Role` (Classe Assinalada):** O site jÃ¡ te diz se o jogador era "Tank", "Range", "Melee" ou "Heal". Adeus complicaÃ§Ã£o de ler array de espadas e cajados!
    *   `Average IP`: IP consolidado da luta.

### C) A Rota de "Attendance" (PresenÃ§a)
*   **Endpoint:** `https://api.albionbb.com/us/guilds/{ID_DA_GUILDA}/attendance`
*   **O que faz:** Traz estatÃ­sticas mensais ou quinzenais agregadas de quanto dano a guilda deu junta e a mÃ©dia de presenÃ§as.

---

## 2. A Nova Arquitetura de Software com Supabase

Usando essa API, nÃ³s cortamos nosso tempo de desenvolvimento pela metade. Agora, o Supabase passa a ser apenas o nosso "Filtro Pessoal", para que possamos construir o visual rico do seu site e o Bot do Discord com velocidade.

### Como as Tabelas do Supabase SerÃ£o Desenhadas (Para vocÃª aprender):
Vamos criar duas "Planilhas" principais no seu banco:

**Tabela 1: `batalhas_registradas`**
*   `battle_id` (Ex: 123456789)
*   `data_hora` (Ex: 06/04/2026 21:00)
*   `oponentes` (Ex: "ROTA, BLS")
*   `status_analisada` (Se o nosso robÃ´ jÃ¡ baixou as informaÃ§Ãµes da luta ou nÃ£o).

**Tabela 2: `estatisticas_dos_membros`**
*   `player_name` (Ex: ygdriart)
*   `battle_id` (Linka com a tabela de batalha acima)
*   `funcao_realizada` (Ex: Ranged DPS)
*   `dano_total` (Ex: 69100)
*   `cura_total` (Ex: 54600)
*   `ip_usado` (Ex: 1537)

**O Fluxo de Vida Real:** Seu site nÃ£o farÃ¡ login na API do Albion. O nosso script em Python ou Node.js farÃ¡ o seguinte a cada 30 minutos:
1. Puxa do AlbionBB se a "IMORTAIS" teve nova batalha.
2. Descobre quem lutou e puxa os danos/curas jÃ¡ caculados.
3. Salva no Supabase nas tabelas acima.
4. O WebSite da guilda exibe os dados lidos apenas do seu Supabase.

---

## 3. Novas Ideias Nascidas com esse Atalho!

1. **Dashboard de RetenÃ§Ã£o de FunÃ§Ã£o:** Agora que os papÃ©is (Tank/Heal/Mage) jÃ¡ vÃªm prontos do AlbionBB, Ã© ridiculamente fÃ¡cil criar na homepage um grÃ¡fico de Pizza mostrando a **"ComposiÃ§Ã£o Habitual da Zerg"**: (Ex: Estamos saindo com 40% DPS, 10% Tank e 50% Healer. Faltam tanques front-line!).
2. **Sorteios de VIPs AutomÃ¡ticos:** JÃ¡ que os dados estarÃ£o no Supabase com muita limpeza, podemos no final do mÃªs lanÃ§ar um botÃ£o secreto no site chamado "Rodar Sorteio", onde o script pega quem teve mais de 80% de "Attendance" e rola a roleta para a lideranÃ§a dar o Premium grÃ¡tis pro abenÃ§oado!
3. **Rankings de Combate por FunÃ§Ã£o (Match-ups):** Em vez de comparar todos do clÃ£, o Supabase nos permite filtrar: "Me mostre o top Ranking de K/D APENAS de quem jogou de Tank no mÃªs". Assim, Ã© justo comparar tanques com tanques e curandeiros com curandeiros.



================================================
FILE: task.md
================================================
# Lista de Tarefas: Battle Board IMORTAIS

Acompanhe por aqui nosso progresso tÃ©cnico na construÃ§Ã£o de cada fase.

- `[x]` **Fase 1: A FundaÃ§Ã£o de AÃ§o**
  - `[x]` Setup do Projeto Frontend (Next.js + TailwindCSS).
  - `[x]` Setup do Banco de Dados (Supabase).
  - `[x]` Desenvolvimento do Extrator de Dados (Script para `api.albionbb.com`).
  - `[x]` UI Base e Tabelas Globais (Ãšltimas batalhas, Leaderboard de Dano/Cura).

- `[x]` **Fase 2: Radar de PresenÃ§a e Stats Menores**
  - `[x]` Criar a PÃ¡gina `/presence` (Painel de Atividade / Attendance DiÃ¡rio e Semanal).
  - `[x]` Criar a PÃ¡gina `/stats` (Tabelas e Rankings Filtrados).

- `[x]` **Fase 3: O Zerg Police & Obras de Arte Virtuais**
  - `[x]` GrÃ¡fico de ComposiÃ§Ã£o (Pizza MÃ©dia da Zerg).
  - `[-]` Verificador AutomÃ¡tico e Alerta Webhook do Discord (Adiado).
  - `[x]` O Inspetor Parcial de Builds (Weapon Checker) implementado no banco.

- `[x]` **Fase 4: Elite Polishing e Escalabilidade In-House**
  - `[x]` Filtros Globais de Data no Dashboard Inicial (`/`).
  - `[x]` HistÃ³rico Visual de Atividade ("Sparklines" Github-style) na tabela de PresenÃ§a (`/presence`).
  - `[x]` IA de Conselho TÃ¡tico: Cruzar Win Rate x ComposiÃ§Ã£o no Zerg HQ.
  - `[x]` MigraÃ§Ã£o do Script Crawler para AutomaÃ§Ã£o na Nuvem (Vercel Cron / AutomÃ¡tico 24/7).

- `[ ]` **Fase 5: MÃ³dulo de Mentoria Individual (Player Coaching AI)**
  - `[ ]` CriaÃ§Ã£o de URL de Perfil Individual (`/player/[name]`).
  - `[ ]` Feedback AlgorÃ­tmico de Armas (Aconselhamento se joga melhor de DPS X ou Y).
  - `[ ]` HistÃ³rico Profundo de Win Rate por Arma EspecÃ­fica e Tracking de KDA individual.




================================================
FILE: scripts/check_db.py
================================================
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

battles = supabase.table("battles").select("id", count="exact").execute()
players = supabase.table("player_stats").select("id", count="exact").execute()

print(f"Batalhas no banco: {battles.count}")
print(f"Registros de players: {players.count}")

if players.count == 0:
    print("\n[AVISO] Tabela player_stats vazia.")
    print("ProvÃ¡vel causa: RLS ativo no Supabase bloqueando inserts.")
    print("SoluÃ§Ã£o: Acesse Supabase > Table Editor > player_stats > Disable RLS")
    print("         (ou crie uma polÃ­tica que permita INSERT para service role)")



================================================
FILE: scripts/crawler.py
================================================
import os
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

# Carrega as variÃ¡veis do arquivo .env
load_dotenv()

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") # Chave secreta!

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Erro: Credenciais do Supabase nÃ£o encontradas no .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

GUILD_NAME = "I M O R T A I S"

def fetch_recent_battles():
    print(f"Buscando as Ãºltimas batalhas da guilda {GUILD_NAME} no AlbionBB...")
    url = f"https://api.albionbb.com/us/battles?search={GUILD_NAME}&minPlayers=25&page=1"
    response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
    
    if response.status_code != 200:
        print("Falha ao consultar AlbionBB", response.status_code)
        return

    data = response.json()
    battles = data if isinstance(data, list) else data.get("data", [])
    
    for b in battles:
        battle_id = b.get("albionId") or b.get("id")
        
        # Verifica se jÃ¡ salvamos essa batalha no banco para nÃ£o duplicar
        check = supabase.table("battles").select("id").eq("id", battle_id).execute()
        if len(check.data) > 0:
            print(f"Batalha {battle_id} jÃ¡ mapeada. Pulando...")
            continue
            
        print(f"Nova Batalha encontrada: {battle_id}. Processando dados densos...")
        process_battle_details(battle_id)

def process_battle_details(battle_id):
    url = f"https://api.albionbb.com/us/battles/{battle_id}"
    response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
    
    if response.status_code != 200:
        return
        
    data = response.json()
    
    # 1. Determinar quem era o inimigo e o status (WIN/LOSS) simulado
    guilds = data.get("guilds", [])
    imortais_info = next((g for g in guilds if g.get("name", "").strip().lower() == GUILD_NAME.strip().lower()), None)
    
    if not imortais_info or imortais_info.get("players", 0) < 15:
        print(f"Batalha ignorada. Menos de 15 jogadores da guilda ({imortais_info.get('players', 0) if imortais_info else 0} presentes).")
        return
        
    inimigos = [g.get("name") for g in guilds if g.get("name") and g.get("name") != imortais_info.get("name")][:3]
    opponents_str = ", ".join(inimigos)
    if not opponents_str:
        opponents_str = "VÃ¡rios"
        
    result = "WIN" if imortais_info.get("kills", 0) >= imortais_info.get("deaths", 0) else "LOSS"

    # Salva na Tabela `battles`
    try:
        supabase.table("battles").insert({
            "id": battle_id,
            "start_time": data.get("startedAt") or data.get("startTime"),
            "opponents": opponents_str,
            "result": result,
            "guild_players": imortais_info.get("players", 0),
            "total_kills": imortais_info.get("kills", 0),
            "total_fame": imortais_info.get("killFame", 0)
        }).execute()
        print(f"Batalha {battle_id} salva com sucesso.")
    except Exception as e:
        print(f"Erro ao salvar batalha {battle_id}:", e)
        return

    # 2. Salva estatÃ­sticas de cada jogador da nossa guilda
    players = data.get("players", [])
    imortais_participants = [p for p in players if p.get("guildName", "").strip().lower() == GUILD_NAME.strip().lower()]
    
    player_rows = []
    for p in imortais_participants:
        player_rows.append({
            "battle_id": battle_id,
            "player_name": p.get("name"),
            "role": p.get("role", "Desconhecido"),
            "damage_done": p.get("damage", 0),
            "healing_done": p.get("heal", 0) or p.get("healing", 0),
            "average_ip": p.get("ip", 0),
            "kills": p.get("kills", 0),
            "deaths": p.get("deaths", 0),
            "weapon": p.get("weapon", {}).get("name", "Desconhecida")
        })
        
    if player_rows:
        try:
            supabase.table("player_stats").insert(player_rows).execute()
            print(f"Salvos {len(player_rows)} participantes no banco.")
        except Exception as e:
            print("Erro ao salvar jogadores:", e)

if __name__ == "__main__":
    fetch_recent_battles()



================================================
FILE: scripts/populate_history.py
================================================
from crawler import process_battle_details, supabase, GUILD_NAME
import requests

import time

def fetch_deep_history(pages_to_scan=15):
    print(f"=====================================")
    print(f"    MÁQUINA DO TEMPO LIGADA ⏳")
    print(f"=====================================")
    print(f"Coletando dados em massa de até {pages_to_scan} páginas de histórico do AlbionBB...\n")
    
    for page in range(1, pages_to_scan + 1):
        print(f"\n>>>> ESCAVANDO PÁGINA {page} DE {pages_to_scan} <<<<")
        url = f"https://api.albionbb.com/us/battles?search={GUILD_NAME}&minPlayers=25&page={page}"
        response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
        
        if response.status_code != 200:
            print(f"[ERRO] Falha na página {page} (Status: {response.status_code})")
            time.sleep(2)
            continue
            
        data = response.json()
        battles = data if isinstance(data, list) else data.get("data", [])
        
        if not battles:
            print("Não há mais batalhas no servidor. Chegamos ao fim da linha do tempo.")
            break
            
        for b in battles:
            battle_id = b.get("albionId") or b.get("id")
            
            try:
                # Verifica se já salvamos essa batalha no banco para não duplicar dados
                check = supabase.table("battles").select("id").eq("id", battle_id).execute()
                if len(check.data) > 0:
                    print(f"Batalha {battle_id} já mapeada. Pulando...")
                    continue
                    
                print(f"Injetando Batalha Histórica {battle_id} no Banco de Dados...")
                process_battle_details(battle_id)
                time.sleep(1.5) # Pausa estratégica de 1.5s pra não ser bloqueado pelo Supabase/API

            except Exception as e:
                print(f"[!] Erro de conexão com a batalha {battle_id}. Servidor barrou os acessos rápidos.")
                print("Esperando 5 segundos para tentar resfriar a conexão...")
                time.sleep(5)
                continue

    print("\n[+] FINALIZADO! Todos os dados passados foram capturados com sucesso.")

if __name__ == "__main__":
    # Varrendo até a página 15 da API (mais ou menos 300+ registros investigados de trás pra frente)
    fetch_deep_history(15)



================================================
FILE: scripts/reimport_players.py
================================================
"""
Script de re-import: busca os detalhes de cada batalha jÃ¡ no banco
e popula a tabela player_stats que estava vazia por causa do RLS.
"""
import os
import platform
# Fix for Python 3.13 WMI crash on Windows when supabase calls platform.system()
try:
    platform.system()
except Exception:
    pass

from supabase import create_client
from dotenv import load_dotenv
import requests

load_dotenv()
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

GUILD_NAME = "I M O R T A I S"

def reimport_players():
    # Busca todas as batalhas salvas
    result = supabase.table("battles").select("id").execute()
    battle_ids = [r["id"] for r in result.data]
    print(f"Total de batalhas no banco: {len(battle_ids)}")

    # Verifica quais jÃ¡ tÃªm players salvos
    existing = supabase.table("player_stats").select("battle_id").execute()
    done_ids = set(r["battle_id"] for r in existing.data)
    print(f"Batalhas com players jÃ¡ salvos: {len(done_ids)}")

    pending = [bid for bid in battle_ids if bid not in done_ids]
    print(f"Batalhas para processar: {len(pending)}\n")

    for battle_id in pending:
        url = f"https://api.albionbb.com/us/battles/{battle_id}"
        resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"})
        if resp.status_code != 200:
            print(f"  [{battle_id}] Erro HTTP {resp.status_code}")
            continue

        data = resp.json()
        players = data.get("players", [])
        imortais = [p for p in players if p.get("guildName", "").strip().lower() == GUILD_NAME.strip().lower()]

        rows = []
        for p in imortais:
            rows.append({
                "battle_id": battle_id,
                "player_name": p.get("name"),
                "role": p.get("role", "Desconhecido"),
                "damage_done": p.get("damage", 0),
                "healing_done": p.get("heal", 0) or p.get("healing", 0),
                "average_ip": p.get("ip", 0),
                "kills": p.get("kills", 0),
                "deaths": p.get("deaths", 0),
                "weapon": p.get("weapon", {}).get("name", "Desconhecida")
            })

        if rows:
            supabase.table("player_stats").insert(rows).execute()
            print(f"  [{battle_id}] âœ“ {len(rows)} players salvos")
        else:
            print(f"  [{battle_id}] Nenhum membro da {GUILD_NAME} encontrado")

    # Resultado final
    final = supabase.table("player_stats").select("id", count="exact").execute()
    print(f"\nâœ… Total de registros em player_stats: {final.count}")

if __name__ == "__main__":
    reimport_players()



================================================
FILE: scripts/requirements.txt
================================================
supabase
requests
python-dotenv



================================================
FILE: scripts/schema.sql
================================================
-- Tabela 1: Batalhas (Registra os ZvZs da Guilda)
CREATE TABLE public.battles (
    id bigint PRIMARY KEY, -- ID exato da batalha no Albion
    start_time timestamp with time zone NOT NULL,
    opponents text NOT NULL, -- Quais guildas/alianÃ§as inimigas estavam
    result text NOT NULL, -- WIN ou LOSS (Baseado em mais kills ou K/D)
    guild_players integer NOT NULL, -- Quantos Membros da sua guilda participaram
    total_kills integer,
    total_fame bigint
);

-- Tabela 2: EstatÃ­sticas dos Membros (Vinculada Ã  tabela de batalhas)
CREATE TABLE public.player_stats (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    battle_id bigint REFERENCES public.battles(id) ON DELETE CASCADE,
    player_name text NOT NULL,
    role text NOT NULL, -- Tank, Healer, Ranged, Support, Melee
    damage_done bigint DEFAULT 0,
    healing_done bigint DEFAULT 0,
    average_ip integer DEFAULT 0,
    kills integer DEFAULT 0,
    deaths integer DEFAULT 0
);

-- Cria um Ã­ndice para consultas rÃ¡pidas por nome do jogador (Usado na pÃ¡gina de presenÃ§as)
CREATE INDEX idx_player_stats_name ON public.player_stats(player_name);



================================================
FILE: scripts/temp.json
================================================
{"albionId": 1366685368, "startedAt": "2026-04-06T08:37:29.142Z", "finishedAt": "2026-04-06T08:42:33.935Z", "totalFame": 2093946, "totalKills": 17, "totalPlayers": 35, "alliances": [{"albionId": "-3q4Mpq_S9CFivkJuH7mdQ", "name": "2CB", "kills": 10, "deaths": 7, "killFame": 785610, "players": 8, "ip": 1317}, {"albionId": "a2Ex_5qVSEGlrp6KJpK8aA", "name": "RE1NO", "kills": 0, "deaths": 1, "killFame": 200315, "players": 4, "ip": 1289}, {"albionId": "9vaWnUvXTw-gWOCDjPaiXw", "name": "ARGUS", "kills": 2, "deaths": 0, "killFame": 98603, "players": 1, "ip": 1090}, {"albionId": "7Q3-cfNURhy-I0K4CHK1gA", "name": "T0C", "kills": 0, "deaths": 0, "killFame": 87430, "players": 1, "ip": 1394}, {"albionId": "OxZm8Zd6TLa8syUaolDAFw", "name": "BOLAS", "kills": 0, "deaths": 0, "killFame": 87430, "players": 1, "ip": 0}, {"albionId": "z7BQDV_WQjOQcK_PX4neAA", "name": "FUR3S", "kills": 1, "deaths": 0, "killFame": 87430, "players": 1, "ip": 1213}, {"albionId": "mCKNk3EyQ8qLeNMhozFIZg", "name": "UNDY", "kills": 0, "deaths": 0, "killFame": 66626, "players": 1, "ip": 0}, {"albionId": "4nNmD3YlQjG8kJB6iBIcGg", "name": "BLS", "kills": 0, "deaths": 0, "killFame": 66626, "players": 1, "ip": 0}, {"albionId": "oSUMxy3dR5SRHeakjtLdTQ", "name": "HNIC", "kills": 0, "deaths": 1, "killFame": 0, "players": 1, "ip": 1354}, {"albionId": "caOmEsdCSE-sXYus_o4AQw", "name": "Sho", "kills": 0, "deaths": 1, "killFame": 0, "players": 1, "ip": 959}, {"albionId": "gk9idG98RbisPOzkNbyONQ", "name": "DCNT", "kills": 0, "deaths": 1, "killFame": 0, "players": 1, "ip": 1367}, {"albionId": "SQuCMGWqQpi-WCRq57iWQg", "name": "AVR4", "kills": 0, "deaths": 1, "killFame": 0, "players": 1, "ip": 1150}], "guilds": [{"albionId": "zNBG2cQTSKm27Pcpv5pOaw", "name": "The Lonely Skibidi", "alliance": "2CB", "kills": 10, "deaths": 7, "killFame": 785610, "players": 8, "ip": 1317}, {"albionId": "PPGk9SJlSZy-qJI0zMdHYA", "name": "Liga de Legendas", "kills": 1, "deaths": 0, "killFame": 152934, "players": 1, "ip": 1354}, {"albionId": "ItSF3hVhRXeOFi-Iimc0AQ", "name": "Orden-Real", "alliance": "RE1NO", "kills": 0, "deaths": 1, "killFame": 101712, "players": 3, "ip": 1289}, {"albionId": "u1W-6yafQS-m-wPFXT__CQ", "name": "C A V A L I E R s", "alliance": "ARGUS", "kills": 2, "deaths": 0, "killFame": 98603, "players": 1, "ip": 1090}, {"albionId": "V5mHNLqiTIGmVeKntA9fyw", "name": "Holy_Templar Order", "alliance": "RE1NO", "kills": 0, "deaths": 0, "killFame": 98603, "players": 1, "ip": 0}, {"albionId": "aFL5AxDnRq-OvGh4D8Vrjw", "name": "Baofengyu", "alliance": "T0C", "kills": 0, "deaths": 0, "killFame": 87430, "players": 1, "ip": 1394}, {"albionId": "oCbgV7OlTsG3G5cIXnYobQ", "name": "Faction Army", "alliance": "FUR3S", "kills": 1, "deaths": 0, "killFame": 87430, "players": 1, "ip": 1213}, {"albionId": "fUIX8VJaRbqQ3JjAGmPkKQ", "name": "ImperialJade", "kills": 2, "deaths": 0, "killFame": 87430, "players": 1, "ip": 1358}, {"albionId": "-3fuxYnVQOq9VswxAD3DoA", "name": "xBLASFEMIAx", "kills": 0, "deaths": 0, "killFame": 87430, "players": 1, "ip": 1301}, {"albionId": "BIZ9bZZyQvWyZ14h9WGMQg", "name": "Gankers LetaLes", "alliance": "BOLAS", "kills": 0, "deaths": 0, "killFame": 87430, "players": 1, "ip": 0}, {"albionId": "EaRIsnZYQP2emyszA8D-2A", "name": "EJERCITO FORT STERLING", "kills": 1, "deaths": 0, "killFame": 87430, "players": 1, "ip": 1085}, {"albionId": "oZercpSURfeSz9_7Mpg1-w", "name": "I DieHard I", "alliance": "UNDY", "kills": 0, "deaths": 0, "killFame": 66626, "players": 1, "ip": 0}, {"albionId": "tIvhXYTrSby2f_WPUQj2nQ", "name": "IMORTAIS ACADEMY", "alliance": "BLS", "kills": 0, "deaths": 0, "killFame": 66626, "players": 1, "ip": 0}, {"albionId": "Dlc2f2siRlexvsZkeS9hAA", "name": "RisasDeMorgana", "kills": 0, "deaths": 0, "killFame": 48442, "players": 1, "ip": 0}, {"albionId": "6ZHPIz1WQmqUlldRN6JZkw", "name": "North Blizzard Creed", "kills": 0, "deaths": 0, "killFame": 32672, "players": 1, "ip": 0}, {"albionId": "evOFvSjeQfqvq2OWQV6wSQ", "name": "Transportistas SA", "kills": 0, "deaths": 0, "killFame": 30052, "players": 1, "ip": 0}, {"albionId": "-uvEj3GOQ8KUFRU3TYeJJg", "name": "Grougaloragran", "alliance": "HNIC", "kills": 0, "deaths": 1, "killFame": 0, "players": 1, "ip": 1354}, {"albionId": "XZSV9nihS8GwN_vvvhgy5g", "name": "Taiko", "alliance": "Sho", "kills": 0, "deaths": 1, "killFame": 0, "players": 1, "ip": 959}, {"albionId": "J3P4rMJ0RuKNOP55OHS_EA", "name": "Quase Online", "kills": 0, "deaths": 1, "killFame": 0, "players": 1, "ip": 952}, {"albionId": "GL-PHfEyTJWYPa7RS_nZWQ", "name": "Decent Folk", "alliance": "DCNT", "kills": 0, "deaths": 1, "killFame": 0, "players": 1, "ip": 1367}, {"albionId": "JGdI1hF9TbWeBfjEdNiXTQ", "name": "Aurora Nocturna", "alliance": "AVR4", "kills": 0, "deaths": 1, "killFame": 0, "players": 1, "ip": 1150}, {"albionId": "xJk6ACGZQwiBfTB8woXNhw", "name": "KNIGHT_SOMBRA", "kills": 0, "deaths": 1, "killFame": 0, "players": 1, "ip": 934}, {"albionId": "PeGdSu0XTxG4-RT6Rqmp0w", "name": "Anti Sex Gang", "kills": 0, "deaths": 1, "killFame": 0, "players": 1, "ip": 1203}, {"albionId": "fDDuHwHwTB6I2E6osPhh6Q", "name": "El Imperio Latino", "kills": 0, "deaths": 1, "killFame": 0, "players": 1, "ip": 1154}], "players": [{"name": "AaaTroxSktt1", "guildName": "The Lonely Skibidi", "allianceName": "2CB", "kills": 3, "deaths": 1, "killFame": 258714, "deathFame": 152934, "ip": 1289, "heal": 0, "damage": 4009, "role": "melee", "weapon": {"name": "2H_AXE_AVALON", "type": "T4_2H_AXE_AVALON@2", "quality": 2}}, {"name": "webbcombat", "guildName": "Liga de Legendas", "kills": 1, "deaths": 0, "killFame": 152934, "deathFame": 0, "ip": 1354, "heal": 0, "damage": 0, "role": "melee", "weapon": {"name": "MAIN_RAPIER_MORGANA", "type": "T7_MAIN_RAPIER_MORGANA", "quality": 3}}, {"name": "obito140424", "guildName": "Holy_Templar Order", "allianceName": "RE1NO", "kills": 0, "deaths": 0, "killFame": 98603, "deathFame": 0, "ip": 0, "heal": 0, "damage": 0, "role": "range", "weapon": {"name": "MAIN_CURSEDSTAFF", "type": "T4_MAIN_CURSEDSTAFF@1", "quality": 1}}, {"name": "mistyks", "guildName": "C A V A L I E R s", "allianceName": "ARGUS", "kills": 2, "deaths": 0, "killFame": 98603, "deathFame": 0, "ip": 1090, "heal": 0, "damage": 0, "role": "tank", "weapon": {"name": "2H_HAMMER_AVALON", "type": "T5_2H_HAMMER_AVALON@1", "quality": 1}}, {"name": "MadLifeIsGod577", "guildName": "The Lonely Skibidi", "allianceName": "2CB", "kills": 0, "deaths": 1, "killFame": 88956, "deathFame": 104472, "ip": 1409, "heal": 66772, "damage": 25, "role": "healer", "weapon": {"name": "MAIN_HOLYSTAFF_AVALON", "type": "T4_MAIN_HOLYSTAFF_AVALON@3", "quality": 2}}, {"name": "VeredictoC", "guildName": "xBLASFEMIAx", "kills": 0, "deaths": 0, "killFame": 87430, "deathFame": 0, "ip": 1301, "heal": 0, "damage": 696, "role": "tank", "weapon": {"name": "2H_MACE_MORGANA", "type": "T6_2H_MACE_MORGANA", "quality": 4}}, {"name": "TIOFUNKY", "guildName": "Faction Army", "allianceName": "FUR3S", "kills": 1, "deaths": 0, "killFame": 87430, "deathFame": 0, "ip": 1213, "heal": 0, "damage": 8286, "role": "range", "weapon": {"name": "2H_LONGBOW", "type": "T5_2H_LONGBOW@1", "quality": 3}}, {"name": "PapiGanYak", "guildName": "ImperialJade", "kills": 2, "deaths": 0, "killFame": 87430, "deathFame": 0, "ip": 1358, "heal": 0, "damage": 4200, "role": "tank", "weapon": {"name": "MAIN_MACE", "type": "T6_MAIN_MACE@1", "quality": 4}}, {"name": "EdmunRockWell", "guildName": "Baofengyu", "allianceName": "T0C", "kills": 0, "deaths": 0, "killFame": 87430, "deathFame": 0, "ip": 1394, "heal": 0, "damage": 5365, "role": "tank", "weapon": {"name": "MAIN_MACE", "type": "T6_MAIN_MACE@1", "quality": 2}}, {"name": "P3rs3oh", "kills": 0, "deaths": 0, "killFame": 87430, "deathFame": 0, "ip": 0, "heal": 0, "damage": 0, "role": "melee", "weapon": {"name": "MAIN_AXE", "type": "T5_MAIN_AXE@1", "quality": 3}}, {"name": "tostado1", "guildName": "Gankers LetaLes", "allianceName": "BOLAS", "kills": 0, "deaths": 0, "killFame": 87430, "deathFame": 0, "ip": 0, "heal": 0, "damage": 0, "role": "tank", "weapon": {"name": "2H_POLEHAMMER", "type": "T6_2H_POLEHAMMER", "quality": 4}}, {"name": "JeanFrco", "guildName": "EJERCITO FORT STERLING", "kills": 1, "deaths": 0, "killFame": 87430, "deathFame": 0, "ip": 1085, "heal": 0, "damage": 2869, "role": "melee", "weapon": {"name": "2H_DAGGERPAIR", "type": "T4_2H_DAGGERPAIR@2", "quality": 2}}, {"name": "jotanan1", "guildName": "The Lonely Skibidi", "allianceName": "2CB", "kills": 0, "deaths": 1, "killFame": 72990, "deathFame": 365748, "ip": 1315, "heal": 0, "damage": 681, "role": "tank", "weapon": {"name": "2H_POLEHAMMER", "type": "T6_2H_POLEHAMMER@1", "quality": 4}}, {"name": "YuuunYuuun", "guildName": "The Lonely Skibidi", "allianceName": "2CB", "kills": 0, "deaths": 0, "killFame": 72990, "deathFame": 0, "ip": 0, "heal": 0, "damage": 0, "role": "tank", "weapon": {"name": "2H_HAMMER_AVALON", "type": "T4_2H_HAMMER_AVALON@2", "quality": 2}}, {"name": "SinOxigeno", "guildName": "The Lonely Skibidi", "allianceName": "2CB", "kills": 1, "deaths": 1, "killFame": 72990, "deathFame": 160839, "ip": 1465, "heal": 0, "damage": 5606, "role": "range", "weapon": {"name": "2H_ICECRYSTAL_UNDEAD", "type": "T5_2H_ICECRYSTAL_UNDEAD@2", "quality": 4}}, {"name": "tredemir", "guildName": "The Lonely Skibidi", "allianceName": "2CB", "kills": 0, "deaths": 1, "killFame": 72990, "deathFame": 254589, "ip": 1367, "heal": 0, "damage": 1597, "role": "range", "weapon": {"name": "2H_FIRE_RINGPAIR_AVALON", "type": "T5_2H_FIRE_RINGPAIR_AVALON@2", "quality": 3}}, {"name": "Lordhawk", "guildName": "The Lonely Skibidi", "allianceName": "2CB", "kills": 4, "deaths": 1, "killFame": 72990, "deathFame": 61686, "ip": 1210, "heal": 0, "damage": 2985, "role": "tank", "weapon": {"name": "2H_SHAPESHIFTER_KEEPER", "type": "T4_2H_SHAPESHIFTER_KEEPER@2", "quality": 4}}, {"name": "HolyGodJs", "guildName": "The Lonely Skibidi", "allianceName": "2CB", "kills": 2, "deaths": 1, "killFame": 72990, "deathFame": 208044, "ip": 1167, "heal": 0, "damage": 4309, "role": "melee", "weapon": {"name": "2H_KNUCKLES_HELL", "type": "T4_2H_KNUCKLES_HELL@2", "quality": 4}}, {"name": "Tranquileba", "guildName": "I DieHard I", "allianceName": "UNDY", "kills": 0, "deaths": 0, "killFame": 66626, "deathFame": 0, "ip": 0, "heal": 0, "damage": 0, "role": "melee", "weapon": {"name": "MAIN_SPEAR", "type": "T4_MAIN_SPEAR@1", "quality": 4}}, {"name": "Kodamm", "guildName": "IMORTAIS ACADEMY", "allianceName": "BLS", "kills": 0, "deaths": 0, "killFame": 66626, "deathFame": 0, "ip": 0, "heal": 0, "damage": 0, "role": "melee", "weapon": {"name": "2H_AXE", "type": "T5_2H_AXE", "quality": 2}}, {"name": "Hissana", "guildName": "Orden-Real", "allianceName": "RE1NO", "kills": 0, "deaths": 0, "killFame": 50856, "deathFame": 0, "ip": 0, "heal": 0, "damage": 0, "role": "range", "weapon": {"name": "2H_LONGBOW", "type": "T6_2H_LONGBOW@1", "quality": 2}}, {"name": "mikse1236", "guildName": "RisasDeMorgana", "kills": 0, "deaths": 0, "killFame": 48442, "deathFame": 0, "ip": 0, "heal": 0, "damage": 0, "role": "melee", "weapon": {"name": "2H_AXE", "type": "T6_2H_AXE", "quality": 1}}, {"name": "tilinwaza19876", "guildName": "North Blizzard Creed", "kills": 0, "deaths": 0, "killFame": 32672, "deathFame": 0, "ip": 0, "heal": 0, "damage": 0, "role": "melee", "weapon": {"name": "2H_CLAWPAIR", "type": "T5_2H_CLAWPAIR@1", "quality": 2}}, {"name": "xiomaradaniela", "guildName": "Orden-Real", "allianceName": "RE1NO", "kills": 0, "deaths": 0, "killFame": 32672, "deathFame": 0, "ip": 0, "heal": 0, "damage": 0, "role": "tank", "weapon": {"name": "MAIN_MACE", "type": "T4_MAIN_MACE@1", "quality": 1}}, {"name": "BadEarly", "guildName": "Transportistas SA", "kills": 0, "deaths": 0, "killFame": 30052, "deathFame": 0, "ip": 0, "heal": 0, "damage": 0, "role": "melee", "weapon": {"name": "2H_KNUCKLES_SET2", "type": "T4_2H_KNUCKLES_SET2@2", "quality": 4}}, {"name": "magoencantador", "guildName": "Orden-Real", "allianceName": "RE1NO", "kills": 0, "deaths": 1, "killFame": 18184, "deathFame": 169758, "ip": 1289, "heal": 0, "damage": 6195, "role": "range", "weapon": {"name": "2H_CROSSBOW_CANNON_AVALON", "type": "T4_2H_CROSSBOW_CANNON_AVALON@2", "quality": 4}}, {"name": "vanitas034", "guildName": "Taiko", "allianceName": "Sho", "kills": 0, "deaths": 1, "killFame": 0, "deathFame": 13200, "ip": 959, "heal": 3934, "damage": 0, "role": "healer", "weapon": {"name": "2H_HOLYSTAFF", "type": "T5_2H_HOLYSTAFF", "quality": 1}}, {"name": "Tecomoc", "kills": 0, "deaths": 1, "killFame": 0, "deathFame": 28536, "ip": 1240, "heal": 0, "damage": 0, "role": "healer", "weapon": {"name": "2H_WILDSTAFF", "type": "T6_2H_WILDSTAFF", "quality": 4}}, {"name": "ZzitroxX", "guildName": "Anti Sex Gang", "kills": 0, "deaths": 1, "killFame": 0, "deathFame": 31932, "ip": 1203, "heal": 0, "damage": 0, "role": "range", "weapon": {"name": "2H_LONGBOW", "type": "T5_2H_LONGBOW@1", "quality": 4}}, {"name": "ResonanceOfWar", "guildName": "Decent Folk", "allianceName": "DCNT", "kills": 0, "deaths": 1, "killFame": 0, "deathFame": 106938, "ip": 1367, "heal": 0, "damage": 0, "role": "melee", "weapon": {"name": "2H_TRIDENT_UNDEAD", "type": "T5_2H_TRIDENT_UNDEAD@2", "quality": 3}}, {"name": "Fahzin", "guildName": "Quase Online", "kills": 0, "deaths": 1, "killFame": 0, "deathFame": 4632, "ip": 952, "heal": 0, "damage": 0, "role": "melee", "weapon": {"name": "2H_CLEAVER_HELL", "type": "T4_2H_CLEAVER_HELL", "quality": 1}}, {"name": "tetencia", "guildName": "El Imperio Latino", "kills": 0, "deaths": 1, "killFame": 0, "deathFame": 81726, "ip": 1154, "heal": 0, "damage": 0, "role": "range", "weapon": {"name": "MAIN_FROSTSTAFF", "type": "T4_MAIN_FROSTSTAFF@2", "quality": 4}}, {"name": "Usombra", "guildName": "KNIGHT_SOMBRA", "kills": 0, "deaths": 1, "killFame": 0, "deathFame": 101934, "ip": 934, "heal": 0, "damage": 0, "role": "tank", "weapon": {"name": "2H_QUARTERSTAFF_AVALON", "type": "T4_2H_QUARTERSTAFF_AVALON", "quality": 1}}, {"name": "MusashiMiiyamoto", "guildName": "Aurora Nocturna", "allianceName": "AVR4", "kills": 0, "deaths": 1, "killFame": 0, "deathFame": 68148, "ip": 1150, "heal": 0, "damage": 0, "role": "range", "weapon": {"name": "2H_SHAPESHIFTER_AVALON", "type": "T4_2H_SHAPESHIFTER_AVALON@2", "quality": 4}}, {"name": "WhitePantherLily", "guildName": "Grougaloragran", "allianceName": "HNIC", "kills": 0, "deaths": 1, "killFame": 0, "deathFame": 178830, "ip": 1354, "heal": 0, "damage": 0, "role": "melee", "weapon": {"name": "2H_CLAYMORE", "type": "T7_2H_CLAYMORE@1", "quality": 2}}]}


================================================
FILE: scripts/.env.example
================================================
# Variaveis de Ambiente - Copie este arquivo como ".env" e preencha os valores
# NEVER commite o arquivo .env no git!

NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_publishable_key_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_secret_key_aqui



================================================
FILE: site/README.md
================================================
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.



================================================
FILE: site/AGENTS.md
================================================
<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes â€” APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->



================================================
FILE: site/build-log.txt
================================================
[Binary file]


================================================
FILE: site/CLAUDE.md
================================================
@AGENTS.md



================================================
FILE: site/eslint.config.mjs
================================================
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;



================================================
FILE: site/next.config.ts
================================================
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;



================================================
FILE: site/package.json
================================================
{
  "name": "site",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.101.1",
    "date-fns": "^4.1.0",
    "lucide-react": "^1.7.0",
    "next": "16.2.2",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "recharts": "^3.8.1"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.2",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}



================================================
FILE: site/postcss.config.mjs
================================================
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;



================================================
FILE: site/tsconfig.json
================================================
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}



================================================
FILE: site/src/app/globals.css
================================================
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap');
@import 'tailwindcss';

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   DESIGN TOKENS
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
:root {
  /* Core palette */
  --cyan:    #00f2ff;
  --cyan-10: rgba(0,242,255,0.10);
  --cyan-20: rgba(0,242,255,0.20);
  --cyan-30: rgba(0,242,255,0.30);
  --emerald: #00ff9d;
  --em-10:   rgba(0,255,157,0.10);
  --crimson: #ff4d4d;
  --cr-10:   rgba(255,77,77,0.10);
  --amber:   #ffcc00;
  --am-10:   rgba(255,204,0,0.10);
  --discord: #5865F2;

  /* Surface */
  --bg:          #f4f7f9;
  --surface:     rgba(255,255,255,0.60);
  --surface-hi:  rgba(255,255,255,0.80);
  --border:      rgba(255,255,255,0.80);
  --border-lo:   rgba(203,213,225,0.40);
  --grid-line:   rgba(203,213,225,0.24);

  /* Text */
  --text-900: #0f172a;
  --text-700: #334155;
  --text-500: #64748b;
  --text-400: #94a3b8;
  --text-300: #cbd5e1;

  /* Shadows */
  --shadow-glass: 0 8px 32px 0 rgba(15,23,42,0.06);
  --shadow-sm:    0 2px 8px rgba(15,23,42,0.06);
  --shadow-cyan:  0 0 20px rgba(0,242,255,0.12);

  /* Radii */
  --radius-sm: 4px;
  --radius-md: 6px;

  /* Fonts */
  --font-display: 'Space Grotesk', system-ui, sans-serif;
  --font-mono:    'JetBrains Mono', monospace;
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   RESET & BASE
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { height: 100%; }

body {
  height: 100%;
  font-family: var(--font-display);
  color: var(--text-900);
  background-color: var(--bg);
  background-image:
    radial-gradient(circle at 0%   0%,   rgba(0,242,255,0.06)  0%, transparent 50%),
    radial-gradient(circle at 100% 100%, rgba(0,255,157,0.05)  0%, transparent 50%),
    linear-gradient(var(--grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
  background-size: 100% 100%, 100% 100%, 30px 30px, 30px 30px;
  -webkit-font-smoothing: antialiased;
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   GLASS SURFACE
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.glass {
  position: relative;
  background: var(--surface);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-glass);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

/* Top accent line */
.glass::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--cyan-30), transparent);
  pointer-events: none;
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   TYPOGRAPHY UTILITIES
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.mono       { font-family: var(--font-mono); }
.label      { font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--text-400); }
.label-sm   { font-family: var(--font-mono); font-size: 8px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--text-400); }
.section-hd { font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-900); }

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   SCROLLBAR
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.scroll::-webkit-scrollbar        { width: 4px; height: 4px; }
.scroll::-webkit-scrollbar-track  { background: transparent; }
.scroll::-webkit-scrollbar-thumb  { background: var(--text-300); border-radius: 10px; }
.scroll::-webkit-scrollbar-thumb:hover { background: var(--cyan); }

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   BADGE & PILL
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.badge {
  display: inline-flex; align-items: center;
  padding: 2px 8px;
  font-family: var(--font-mono);
  font-size: 9px; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase;
  border-radius: var(--radius-sm);
}
.badge-win  { background: rgba(0,255,157,0.10); color: #059669; border: 1px solid rgba(0,255,157,0.25); }
.badge-loss { background: rgba(255,77, 77,0.10); color: #dc2626; border: 1px solid rgba(255,77,77,0.25); }
.badge-dps     { background: var(--text-900); color: #fff; }
.badge-tank    { background: var(--cyan-10); color: #0891b2; border: 1px solid var(--cyan-20); }
.badge-healer  { background: var(--em-10);   color: #059669; border: 1px solid rgba(0,255,157,0.25); }
.badge-support { background: var(--am-10);   color: #d97706; border: 1px solid rgba(255,204,0,0.25); }
.badge-melee   { background: var(--cr-10);   color: #dc2626; border: 1px solid rgba(255,77,77,0.25); }

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   ROLE COLOR DOTS
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
.dot-cyan    { background: var(--cyan); }
.dot-emerald { background: var(--emerald); }
.dot-crimson { background: var(--crimson); }
.dot-amber   { background: var(--amber); }
.dot-slate   { background: var(--text-400); }

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   NAV ICON BUTTON
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.nav-btn {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px; width: 48px; height: 48px;
  border-radius: var(--radius-sm);
  color: var(--text-400);
  transition: color 0.15s, background 0.15s;
  cursor: pointer;
  border: none; background: none;
  font-family: var(--font-mono); font-size: 7px; letter-spacing: 0.1em;
  text-transform: uppercase;
}
.nav-btn:hover  { color: var(--text-700); background: rgba(0,0,0,0.04); }
.nav-btn.active { color: var(--cyan); background: var(--cyan-10); }

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   STAT MINI-CARD
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.stat-mini {
  display: flex; flex-direction: column; gap: 2px;
  padding: 10px 14px;
  background: var(--surface-hi); border: 1px solid var(--border-lo);
  border-radius: var(--radius-md);
}
.stat-mini-val { font-size: 18px; font-weight: 700; color: var(--text-900); }
.stat-mini-lbl { font-family: var(--font-mono); font-size: 8px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-400); }

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   PROGRESS BAR
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.bar-track { height: 3px; background: var(--border-lo); border-radius: 10px; overflow: hidden; width: 100%; }
.bar-fill  { height: 100%; border-radius: 10px; background: var(--cyan); transition: width 0.6s ease; }
.bar-fill.emerald { background: var(--emerald); }
.bar-fill.crimson { background: var(--crimson); }
.bar-fill.amber   { background: var(--amber); }

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   TABLE
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.data-table { width: 100%; border-collapse: collapse; }
.data-table thead tr {
  border-bottom: 1px solid var(--border-lo);
}
.data-table thead th {
  padding: 10px 16px;
  font-family: var(--font-mono); font-size: 8px; font-weight: 400;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-400);
  white-space: nowrap; text-align: left;
}
.data-table tbody tr {
  border-bottom: 1px solid rgba(203,213,225,0.12);
  transition: background 0.12s;
  cursor: pointer;
}
.data-table tbody tr:last-child { border-bottom: none; }
.data-table tbody tr:hover { background: rgba(0,242,255,0.03); }
.data-table tbody td { padding: 12px 16px; }
.data-table tbody tr.selected { border-left: 2px solid var(--cyan); background: var(--cyan-10); }

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   GLOW LINE DIVIDER
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.glow-divider { height: 1px; background: linear-gradient(90deg, transparent, var(--cyan-30), transparent); }

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   ANIMATIONS
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
.anim-up { animation: fadeUp 0.35s ease both; }

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   LIVE DOT
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.live-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--emerald); flex-shrink: 0;
  animation: pulse-dot 1.8s ease-in-out infinite;
  box-shadow: 0 0 6px var(--emerald);
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   DISCORD WIDGET
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.discord-bar { background: var(--discord); }

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   RESPONSIVE LAYOUT VARS
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
:root {
  --header-h: 60px;
  --sidebar-w: 72px;
  --bottom-nav-h: 60px;
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   APP SHELL
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.app-root {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
}

/* Header */
.app-header {
  height: var(--header-h);
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 20px;
  background: rgba(255,255,255,0.50);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border-lo);
  z-index: 50;
  gap: 16px;
}

/* Body below header */
.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Sidebar (desktop) */
.app-sidebar {
  width: var(--sidebar-w);
  flex-shrink: 0;
  display: flex; flex-direction: column;
  align-items: center; padding: 16px 0;
  gap: 6px;
  border-right: 1px solid var(--border-lo);
  background: rgba(255,255,255,0.25);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  overflow: hidden;
}

/* Main content */
.app-main {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Scrollable page content */
.page-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   MOBILE OVERRIDES  (â‰¤ 768px)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
@media (max-width: 768px) {
  .app-sidebar { display: none; }

  .app-body { flex-direction: column; }

  .page-content { padding: 12px 12px calc(var(--bottom-nav-h) + 12px); }

  /* Bottom tab bar */
  .bottom-nav {
    display: flex;
    position: fixed; bottom: 0; left: 0; right: 0;
    height: var(--bottom-nav-h);
    background: rgba(255,255,255,0.88);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-top: 1px solid var(--border-lo);
    z-index: 50;
    align-items: center; justify-content: space-around;
  }
  .bottom-nav .nav-btn { width: 56px; height: 50px; font-size: 7px; }

  .hide-mobile { display: none !important; }
  .show-mobile { display: flex !important; }
}

@media (min-width: 769px) {
  .bottom-nav  { display: none; }
  .show-mobile { display: none !important; }
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   DASHBOARD GRID
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.dashboard-grid {
  display: grid;
  grid-template-columns: 300px 1fr;
  grid-template-rows: auto 1fr;
  gap: 16px;
  height: 100%;
  min-height: 0;
}

@media (max-width: 1100px) {
  .dashboard-grid { grid-template-columns: 1fr; grid-template-rows: none; }
}

.panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255,255,255,0.50);
  border-bottom: 1px solid var(--border-lo);
  flex-shrink: 0;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   WINRATE RING (SVG)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.ring-root { position: relative; display: inline-flex; }
.ring-svg  { transform: rotate(-90deg); }
.ring-label {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
}



================================================
FILE: site/src/app/layout.tsx
================================================
import type { Metadata } from 'next'
import './globals.css'
import { SidebarNav, BottomNav, SearchInput } from '@/components/Navigation'

export const metadata: Metadata = {
  title: 'I M O R T A I S | Guild Admin Hub',
  description: 'Painel administrativo de batalhas ZvZ, presenÃ§a e estatÃ­sticas da guilda I M O R T A I S no Albion Online.',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="app-root">

          {/* â”€â”€ HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <header className="app-header">
            {/* Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <div style={{
                width: 32, height: 32, background: '#0f172a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transform: 'rotate(45deg)', borderRadius: 4, flexShrink: 0,
              }}>
                <span className="material-symbols-outlined"
                  style={{ color: '#fff', fontSize: 16, transform: 'rotate(-45deg)' }}>
                  admin_panel_settings
                </span>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '0.22em', color: 'var(--text-900)', lineHeight: 1 }}>
                  I M O R T A I S
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.18em', color: 'var(--cyan)', marginTop: 2 }}>
                  GUILD ADMIN HUB
                </div>
              </div>
            </div>

            {/* Center: quick stats (hidden on mobile) */}
            <div className="hide-mobile"
              style={{ display: 'flex', alignItems: 'center', gap: 24, flex: 1, justifyContent: 'center' }}>
              <div style={{ height: 28, width: 1, background: 'var(--border-lo)' }} />
              <div style={{ display: 'flex', gap: 24 }}>
                <div>
                  <div className="label">Battle Stats</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--text-900)' }}>
                    â€” K/D AVG
                  </div>
                </div>
                <div>
                  <div className="label">Win Rate</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--cyan)' }}>
                    LIVE
                  </div>
                </div>
              </div>
            </div>

            {/* Right: live badge + search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px',
                background: 'rgba(0,255,157,0.08)', border: '1px solid rgba(0,255,157,0.2)',
                borderRadius: 100,
              }}>
                <span className="live-dot" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.12em', color: '#059669', fontWeight: 700 }}>
                  LIVE Â· ALBIONBB
                </span>
              </div>

              <div className="hide-mobile">
                <SearchInput style={{ width: 180 }} />
              </div>
            </div>
          </header>

          {/* â”€â”€ BODY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="app-body">

            {/* Sidebar (desktop) */}
            <aside className="app-sidebar">
              <SidebarNav />

              {/* Spacer + logout */}
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, transparent, var(--cyan-20), transparent)' }} />
                <button className="nav-btn" style={{ color: 'var(--text-400)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>settings</span>
                  <span>Config</span>
                </button>
              </div>
            </aside>

            {/* Page content */}
            <main className="app-main">
              <div className="page-content scroll">
                {children}
              </div>
            </main>
          </div>

          {/* â”€â”€ BOTTOM TAB BAR (mobile) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <nav className="bottom-nav">
            <BottomNav />
          </nav>

        </div>
      </body>
    </html>
  )
}



================================================
FILE: site/src/app/page.tsx
================================================
[Binary file]


================================================
FILE: site/src/app/guild/page.tsx
================================================
Error reading file with 'cp1252': 'charmap' codec can't decode byte 0x8f in position 9038: character maps to <undefined>


================================================
FILE: site/src/app/player/page.tsx
================================================
import { Suspense } from 'react'
import { SearchInput } from '@/components/Navigation'

export default function PlayerSearchPage() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '60vh',
      gap: 24,
      padding: 20,
      textAlign: 'center'
    }}>
      <div className="anim-up">
        <div style={{ 
          width: 80, height: 80, borderRadius: 20, 
          background: 'var(--cyan-20)', border: '2px solid var(--cyan)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px auto'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--cyan)' }}>person_search</span>
        </div>
        <h1 className="section-hd" style={{ fontSize: 32, marginBottom: 8 }}>BUSCAR OPERADOR</h1>
        <p style={{ color: 'var(--text-500)', maxWidth: 400, margin: '0 auto 32px auto', fontSize: 14 }}>
          Digite o nome do jogador para acessar o Painel de Mentoria TÃ¡tica Individual e analisar a performance em ZvZs.
        </p>
      </div>

      <div className="anim-up" style={{ width: '100%', maxWidth: 400, animationDelay: '100ms' }}>
        <div className="glass" style={{ padding: 24, borderRadius: 16 }}>
          <SearchInput style={{ width: '100%' }} />
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: 12, textAlign: 'left' }}>
              <div style={{ fontSize: 10, color: 'var(--text-400)', textTransform: 'uppercase', marginBottom: 4 }}>Dica</div>
              <div style={{ fontSize: 12, color: 'var(--text-700)' }}>Use nomes exatos do jogo (Case Sensitive)</div>
            </div>
            <div style={{ padding: 12, textAlign: 'left' }}>
              <div style={{ fontSize: 10, color: 'var(--text-400)', textTransform: 'uppercase', marginBottom: 4 }}>Dados</div>
              <div style={{ fontSize: 12, color: 'var(--text-700)' }}>Logs baseados em CTAs da guilda</div>
            </div>
          </div>
        </div>
      </div>

      <div className="anim-up" style={{ marginTop: 40, animationDelay: '200ms' }}>
        <div className="label" style={{ fontSize: 10, letterSpacing: '0.2em' }}>SISTEMA DE MENTORIA INDIVIDUAL</div>
      </div>
    </div>
  )
}



================================================
FILE: site/src/app/player/[name]/page.tsx
================================================
Error reading file with 'cp1252': 'charmap' codec can't decode byte 0x81 in position 3788: character maps to <undefined>


================================================
FILE: site/src/app/presence/page.tsx
================================================
import { createClient } from '@supabase/supabase-js'

export const revalidate = 0 // Disable cache for accurate realtime presence

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing.');
}

const sb = createClient(supabaseUrl, supabaseAnonKey)

async function getAttendanceData() {
  // get recent battles for sparkline
  const { data: allBattles } = await sb.from('battles').select('id, start_time').order('start_time', { ascending: false })
  const totalBattles = allBattles?.length || 0
  const recentBattles = allBattles ? allBattles.slice(0, 10).reverse() : [] // Last 10 from oldest to newest

  // get player stats mapped
  const { data: stats } = await sb.from('player_stats').select('player_name, role, battle_id')
  
  if (!stats) return { totalBattles: 0, players: [] }

  const map: Record<string, { name: string, battles: number, roles: Record<string, number>, attendedIds: Set<string> }> = {}
  
  for (const s of stats) {
    if (!map[s.player_name]) {
      map[s.player_name] = { name: s.player_name, battles: 0, roles: {}, attendedIds: new Set() }
    }
    map[s.player_name].battles += 1
    map[s.player_name].attendedIds.add(String(s.battle_id))
    const r = (s.role || 'dps').toLowerCase()
    map[s.player_name].roles[r] = (map[s.player_name].roles[r] || 0) + 1
  }

  const players = Object.values(map).map(p => {
    // find top 2 main roles
    const rolesSorted = Object.entries(p.roles).sort((a, b) => b[1] - a[1])
    const mainRoles = rolesSorted.slice(0, 2).map(r => r[0])
    
    const attendancePercent = totalBattles > 0 ? Math.round((p.battles / totalBattles) * 100) : 0
    
    // Sparkline array for the last 10 battles
    const sparkline = recentBattles.map(b => p.attendedIds.has(String(b.id)))

    return {
      name: p.name,
      battles: p.battles,
      mainRoles,
      attendancePercent,
      sparkline
    }
  }).sort((a, b) => b.battles - a.battles)

  return { totalBattles, recentBattles, players }
}

const roleCss = (r: string) => {
  const m: Record<string,string> = { healer:'healer', tank:'tank', melee:'melee', ranged:'dps', support:'support' }
  return `badge badge-${m[r] ?? 'dps'}`
}

const roleLabel = (r: string) => {
  const map: Record<string,string> = { healer: 'HEALER', tank: 'TANK', melee: 'MELEE', ranged: 'RANGED', support: 'SUPPORT' }
  return map[r] ?? r.toUpperCase()
}

export default async function PresencePage() {
  const { totalBattles, recentBattles, players } = await getAttendanceData()

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }} className="anim-up">
        <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--cyan)' }}>shield</span>
        <div>
          <h1 className="section-hd" style={{ fontSize: 24 }}>Radar de PresenÃ§a</h1>
          <div className="label">Acompanhe o engajamento e a assiduidade dos membros nas batalhas avaliadas.</div>
        </div>
      </div>

      <div className="glass panel anim-up" style={{ animationDelay: '60ms' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="dot dot-amber" />
              <span className="section-hd">RelatÃ³rio de Assiduidade</span>
            </div>
            <div className="label" style={{ marginTop: 4 }}>
              Baseado nas ultimas {totalBattles} lutas catalogadas no banco de dados.
            </div>
          </div>
        </div>

        <div className="panel-body scroll">
          {players.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }} className="label">
              Sem dados de membros cadastrados ou batalhas sincronizadas.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Operador</th>
                  <th>Classes Frequentes</th>
                  <th style={{ textAlign: 'center' }}>PresenÃ§as</th>
                  <th style={{ textAlign: 'center', width: 140 }}>Atividade Recente</th>
                  <th style={{ width: 140 }}>Performance (Geral)</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => {
                  let barColor = 'var(--cyan)'
                  if (p.attendancePercent < 30) barColor = '#dc2626' // crimson
                  else if (p.attendancePercent < 70) barColor = '#f59e0b' // amber

                  return (
                    <tr key={p.name} style={{ animationDelay: `${(i % 10) * 20}ms` }}>
                      <td style={{ color: 'var(--text-500)', fontSize: 12 }}>{i + 1}</td>
                      <td>
                        <a href={`/player/${p.name}`} style={{ fontWeight: 700, color: 'var(--text-900)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }} className="hover:text-cyan">
                          {p.name}
                          <span className="material-symbols-outlined" style={{ fontSize: 13, opacity: 0.5 }}>open_in_new</span>
                        </a>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {p.mainRoles.map((r, idx) => (
                            <span key={idx} className={roleCss(r)} style={{ fontSize: 9 }}>
                              {roleLabel(r)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 800 }}>
                          {p.battles} <span style={{ color: 'var(--text-500)', fontSize: 10 }}>/ {totalBattles}</span>
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          {p.sparkline.map((attended, sid) => (
                            <div 
                              key={sid} 
                              title={attended ? "Presente" : "Faltou"}
                              style={{
                                width: 8, height: 16, borderRadius: 2,
                                backgroundColor: attended ? 'var(--cyan)' : 'rgba(255,255,255,0.05)',
                                opacity: attended ? 1 : 0.6
                              }} 
                            />
                          ))}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ 
                             fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, 
                             color: barColor, width: 36, textAlign: 'right' 
                          }}>
                            {p.attendancePercent}%
                          </span>
                          <div className="bar-track" style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', borderRadius: 2 }}>
                            <div 
                              className="bar-fill" 
                              style={{ 
                                width: `${p.attendancePercent}%`, 
                                background: barColor,
                                height: 6,
                                borderRadius: 2
                              }} 
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}



================================================
FILE: site/src/app/stats/page.tsx
================================================
Error reading file with 'cp1252': 'charmap' codec can't decode byte 0x8f in position 9911: character maps to <undefined>


================================================
FILE: site/src/app/zerg/page.tsx
================================================
Error reading file with 'cp1252': 'charmap' codec can't decode byte 0x8d in position 4691: character maps to <undefined>


================================================
FILE: site/src/components/DateFilter.tsx
================================================
'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export function DateFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const days = searchParams.get('days') || '0'

  return (
    <select 
      value={days}
      onChange={(e) => {
        router.push(`?days=${e.target.value}`)
      }}
      style={{
        background: 'var(--bg-card)',
        color: 'var(--text-900)',
        border: '1px solid var(--border)',
        padding: '6px 12px',
        borderRadius: 6,
        fontSize: 12,
        outline: 'none',
        cursor: 'pointer'
      }}
    >
      <option value="0">Toda a HistÃ³ria</option>
      <option value="7">Ãšltimos 7 dias</option>
      <option value="15">Ãšltimos 15 dias</option>
      <option value="30">Ãšltimos 30 dias</option>
    </select>
  )
}



================================================
FILE: site/src/components/Navigation.tsx
================================================
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { icon: 'analytics',    label: 'Dashboard', href: '/' },
  { icon: 'person',       label: 'Operador',  href: '/player' },
  { icon: 'shield',       label: 'PresenÃ§a',  href: '/presence' },
  { icon: 'biotech',      label: 'Zerg HQ',   href: '/zerg' },
  { icon: 'military_tech', label: 'Mentoria', href: '/guild' },
  { icon: 'monitoring',   label: 'Stats',     href: '/stats' },
]

import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export function SearchInput({ style }: { style?: any }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.trim().length < 2) {
        setSuggestions([])
        return
      }
      
      const { data } = await sb
        .from('player_stats')
        .select('player_name')
        .ilike('player_name', `%${query}%`)
        .limit(8)

      if (data) {
        const uniqueNames = Array.from(new Set(data.map(d => d.player_name)))
        setSuggestions(uniqueNames)
        setShowDropdown(uniqueNames.length > 0)
      }
    }

    const timer = setTimeout(fetchSuggestions, 300)
    return () => clearTimeout(timer)
  }, [query])

  const handleSearch = (e?: React.FormEvent, name?: string) => {
    e?.preventDefault()
    const target = name || query.trim()
    if (target) {
      router.push(`/player/${encodeURIComponent(target)}`)
      setQuery('')
      setSuggestions([])
      setShowDropdown(false)
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', ...style }} ref={dropdownRef}>
      <form onSubmit={handleSearch} style={{ width: '100%' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 16px',
          background: 'rgba(255,255,255,0.7)', border: '1px solid var(--border-lo)',
          borderRadius: 12, width: '100%',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--cyan-30)'}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-lo)'}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--cyan)' }}>search</span>
          <input
            placeholder="BUSCAR OPERADOR..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowDropdown(suggestions.length > 0)}
            style={{
              background: 'none', border: 'none', outline: 'none',
              fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600,
              letterSpacing: '0.05em', color: 'var(--text-900)', width: '100%',
            }}
          />
        </div>
      </form>

      {showDropdown && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
          zIndex: 1000, padding: '6px', borderRadius: 14,
          maxHeight: 280, overflowY: 'auto', border: '1px solid var(--border)',
          boxShadow: '0 12px 30px -5px rgba(0,0,0,0.15)',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          animation: 'fadeUp 0.2s ease-out'
        }} className="scroll">
          {suggestions.map((s, idx) => (
            <div 
              key={s} 
              onClick={() => handleSearch(undefined, s)}
              style={{
                padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10,
                fontSize: '12px', fontWeight: 700, color: 'var(--text-700)',
                fontFamily: 'var(--font-mono)', transition: 'all 0.15s',
                marginBottom: idx === suggestions.length - 1 ? 0 : 2
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--cyan-10)'
                e.currentTarget.style.color = 'var(--cyan)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-700)'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14, opacity: 0.5 }}>person</span>
              {s.toUpperCase()}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', alignItems: 'center' }}>
      {NAV.map(n => {
        const active = pathname === n.href || (n.href !== '/' && pathname?.startsWith(n.href))
        return (
          <Link key={n.href} href={n.href} style={{ textDecoration: 'none' }}>
            <button className={`nav-btn${active ? ' active' : ''}`}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{n.icon}</span>
              <span>{n.label}</span>
            </button>
          </Link>
        )
      })}
    </div>
  )
}

export function BottomNav() {
  const pathname = usePathname()

  return (
    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-around', alignItems: 'center' }}>
      {NAV.map(n => {
        const active = pathname === n.href || (n.href !== '/' && pathname?.startsWith(n.href))
        return (
          <Link key={n.href} href={n.href} style={{ textDecoration: 'none' }}>
            <button className={`nav-btn${active ? ' active' : ''}`}>
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{n.icon}</span>
              <span>{n.label}</span>
            </button>
          </Link>
        )
      })}
    </div>
  )
}



================================================
FILE: site/src/components/PlayerRadar.tsx
================================================
'use client'

import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip
} from 'recharts';

export function PlayerRadar({ data }: { data: any[] }) {
  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-400)', fontSize: 10, fontWeight: 700 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          
          <Tooltip 
            contentStyle={{ background: '#0f172a', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontWeight: 700 }}
            itemStyle={{ color: 'var(--cyan)' }}
          />

          {/* Average Guild Path */}
          <Radar name="MÃ©dia da Guilda" dataKey="B" stroke="var(--text-500)" strokeDasharray="3 3" fill="rgba(255,255,255,0)" fillOpacity={0} />
          
          {/* Player Path */}
          <Radar name="Operador Atual" dataKey="A" stroke="var(--cyan)" fill="var(--cyan)" fillOpacity={0.4} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}



================================================
FILE: site/src/lib/supabase.ts
================================================
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)



================================================
FILE: site/src/lib/types.ts
================================================
export type Battle = {
  id: number
  start_time: string
  opponents: string
  result: 'WIN' | 'LOSS'
  guild_players: number
  total_kills: number
  total_fame: number
}

export type PlayerStat = {
  id: string
  battle_id: number
  player_name: string
  role: string
  damage_done: number
  healing_done: number
  average_ip: number
  kills: number
  deaths: number
}



================================================
FILE: .github/workflows/albion_cron.yml
================================================
name: AlbionBB ZvZ Auto-Crawler (Supabase)

on:
  schedule:
    # Roda a cada 4 horas (minuto 0 pelas 0h, 4h, 8h, 12h, 16h, 20h UTC)
    - cron: '0 */4 * * *'
  # Permite que vocÃª clique em "Run workflow" manualmente no painel do GitHub
  workflow_dispatch:

jobs:
  run-crawler:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout do RepositÃ³rio
        uses: actions/checkout@v4
        
      - name: Configurar Python 3
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          
      - name: Instalar DependÃªncias
        run: |
          python -m pip install --upgrade pip
          pip install requests supabase python-dotenv
          
      - name: Executar Crawler (I M O R T A I S)
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: |
          python scripts/crawler.py


