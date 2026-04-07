# Mapeamento Técnico de Battleboards (Padrão AlbionBB)

Após realizar uma varredura profunda em repositórios abertos, scripts desenvolvidos pela comunidade, na documentação não oficial dos endpoints e cruzar os dados com os dashboards que o AlbionBB constrói (conforme suas imagens), aqui está o fluxo técnico **preciso** (sem especulação) de como os dados são extraídos, agregados e as tecnologias ideais para o seu projeto.

## 1. Como AlbionBB captura dados tão profundos (Dano, Cura, IP, Presença)?

A Gameinfo API oficial não possui um endpoint mágico do tipo `/obter_estatisticas_de_dano_da_guilda`. O site **AlbionBB** cria tudo isso através de **agregação e matemática**. O fluxo que eles seguem por baixo dos panos é este:

### A) Identificação da Batalha (ZvZ)
Primeiro, eles consultam a lista de guildas no endpoint de batalhas:
- **Endpoint:** `GET /battles` (e.g., `https://gameinfo.albiononline.com/api/gameinfo/battles?offset=0&limit=50&sort=recent`)
Isso retorna uma lista de batalhas grandes. Uma batalha no Albion online não é um evento único, mas sim um "agrupamento de abates/eventos" gerado pelos servidores quando percebe grande concentração de PvP numa mesma `ZoneId`. Cada batalha tem o seu próprio `BattleId`.

### B) Varrimento de Todos os Eventos (Kills) dessa Batalha
Para conseguir saber quanto dano o "ygdriart" ou o "PancadaSeca" (seus membros) deram, o bot bate no seguinte endpoint específico:
- **Endpoint:** `GET /battles/{ID}` ou `GET /events/battle/{BattleId}`
Isso retorna uma lista JSON massiva contendo **todos os abates (events)** de uma única batalha ZvZ.

### C) Extração dos Dados Ocultos (DamageDone e SupportHealingDone)
Se você olhar o JSON cru que a API retorna de uma *kill* (evento), ele possui não apenas quem matou (Killer) e quem morreu (Victim), mas também um array gigante chamado `Participants` (quem deu assistência na kill).
A "mágica" mora dentro de cada jogador desse array. As chaves cruas da API são:
- `DamageDone`: Dano causado àquela vítima.
- `SupportHealingDone`: Cura efetuada naquele evento de morte.
- `AverageItemPower`: O IP do participante no momento da morte.

> **Como o AlbionBB calcula os Totais:** Eles rodam um script que pega os 100~300 eventos de morte de uma batalha e vai somando: "O ygdriart deu 500 de dano na morte 1 + 1200 na morte 2... Total: 69.1k na Batalha inteira". O mesmo é feito para Cura. O Item Power das tabelas deles (`AVG IP`) é a média de IP em todas essas participações.

## 2. Como eles descobrem a "Classe/Papel/Role" do jogador?
Na imagem que você mandou, à direita da tabela, existem ícones (Tank - escudo, Support - bandeira, Healer - cruz verde, Melee - espada, Ranged - arco). 
O Albion _não fornece essa classe_. O AlbionBB usa um robô que olha o array `Equipment` do jogador em cada abate. Esse array expõe a arma (`MainHand`), as armaduras (`Armor`) e off-hand. 

Eles fazem uma classificação Hard Coded ("se/então"):
- **Healer:** Se `MainHand` for "Holy Staff" (Cajados Sagrados) ou "Nature Staff" (Cajados da Natureza).
- **Tank:** Se `MainHand` for Maca (Mace), Martelo (Hammer) ou Lanças específicas, e `Armor` for roupa de Plate (Placa).
- **Suporte ZvZ:** Locus, Enigma.
- **Ranged DPS:** Frost, Fire, Bows.
- Eles tabulam e contam com quantas builds diferentes você jogou. Se o "PancadaSeca" jogou 35 vezes de Melee e 7 vezes de Healer, essa classificação ali na direita será preenchida correspondente a essas vezes.

## 3. Presença de Guilda (Attendance)
Attendance de Jogador não vem de nenhum endpoint chamado `/attendance`. O AlbionBB simplesmente sabe quantas batalhas a Guilda "IMORTAIS" esteve presente nos últimos 30 dias. Toda vez que aparece o ID de um jogador na lista de matadores (`Killer`), participantes (`Participants`) ou Vítimas (`Victim`) de uma batalha da guilda, eles contabilizam **+1 em Attendance** no banco de dados para ele.

---

## 4. Arquitetura Ideal para Construir (O que Usar?)

Se quisermos construir algo com a qualidade de AlbionBB ou superior, ser preciso, veloz, customizado e o mais importante: sem sofrer os temidos banimentos/rate-limit de IP da Sandbox (Cloudflare Error 1020), o projeto tem que ser desenhado com duas partes:

### Parte 1: O "Scraper Worker" (Backend no Modo Invisível)
Você precisará de um script, idealmente em **Node.js (TypeScript) ou Python (Celery/RQ)** rodando sem parar.
- **Tarefa:** Esse script de 5 em 5 minutos consulta `GET /battles`. Toda vez que o ID novo for detectado e tiver a presença da guilda *IMORTAIS*, o Worker baixa todos os Kills desse ID.
- **Processamento:** Ele soma todos os `DamageDone`, `SupportHealingDone`, extrai os IPs e Classes pelo `Equipment` e condensa a média. O *scrapper* precisa imitar headers de navegador (User-Agent legível).
- **Destino:** Salva esses dados mastigados e limpinhos já aglomerados em um banco de dados local da sua plataforma, preferencialmente **PostgreSQL** (se os esquemas de dados forem definidos), pois as buscas de player X na batalha Y são complexas.

### Parte 2: O Visual "Battle Board" (O Painel UI)
Aí sim entra sua aplicação Web. Como você me mostrou telas maravilhosas do AlbionBB e pediu algo impactante e completo:
- **Frontend Realtime:** Usar o framework **Next.js** com a biblioteca de componentes visuais do **TailwindCSS** + **Shadcn** ou **Mantine** (possibilitam facilmente aqueles visuais Dark Mode, caixinhas coloridas brilhantes de Status, gráficos lindos).
- Para os gráficos de Attendance ao longo do tempo (Dano distribuído vs Cura), a implementação da biblioteca *Recharts* ou *Chart.js* vai encantar os Oficiais da sua Guilda para gerenciar os membros.
- Quando o site for requisitado (O jogador visita: `meusite.com/guild/imortais`), ele **não vai falar com os servidores da Albion**, pois já sofre restrições brutais. O Frontend de seu painel acessará os dados já processados do seu banco de dados Postgre/MongoDB local. É isso que permite ao AlbionBB carregar estatísticas na velocidade da luz e dar filtros com zero delay.

## Resumo Executivo para a Ação:
Você **pode** recriar isso fielmente porque os dados vitais (`DamageDone` e `SupportHealingDone`) que nós confirmamos estarem lá em **nível atômico** nas requests dos *Participants*, são somados e tabelados localmente. O desenvolvimento será 80% sobre organizar o robô pescador (parser JSON) para limpar os eventos e fazer médias corretas de matemátca simples e 20% no Design de um ótimo UI de Dashboards (que eu posso codar pra você em React UI futuramente, já prevendo estes dados).
