# Arquitetura Estratégica: API e Brainstorming de Funcionalidades (I M O R T A I S)

Este documento foi atualizado durante a Fase 3 para redirecionar o nosso escopo criativo.
A regra de ouro agora é: **Se o AlbionBB já faz com perfeição (filtrar o mundo todo e mostrar UI limpa), nós copiamos a inteligência para nosso banco, mas nosso Front-end DEVE fazer o que o AlbionBB NÃO FAZ.** 

Nosso foco é exclusivamente criar **Sistemas de Gestão Estratégica de Guilda**. O AlbionBB é uma ferramenta de consulta pública; o nosso "Battle Board" é um ERP (Sistema de Gestão) fechado e administrativo para a I M O R T A I S.

---

## 1. O Mapa do Tesouro: O Que a API Nos Entrega Atualmente
A conexão com o endpoint `/battles` do **AlbionBB** já decodificou um oceano de cálculos que demoraríamos dias para processar da API oficial. Hoje, nós capturamos e possuímos nativamente no nosso Supabase:

*   **Identificação Perfeita:** Sabermos quem jogou, a role exata (`tank, melee, range, healer, support`) e a guilda atual (inclusive se puxamos players de outras alianças que caíram no nosso filtro de luta).
*   **Armamento (Restrito):** A arma da mão principal `weapon.name` e qualidade, útil para o Inspector Primário.
*   **Dados Absolutos de Performance:** `damage_done` calculado exato e `healing_done` cruzado com o `average_ip` (O IP do set no momento da morte ou da contagem da batalha).
*   **Resultado de K/D (Kills and Deaths):** Sabemos se o jogador está "sangrando" a economia da guilda morrendo demais ou se é a ponta de lança do K/D.

### O Que Fica de Fora (Limitação Constatada)
O AlbionBB suprime o payload do inventário/gear completo para a resposta da API ser veloz. Logo, nós **não** recebemos:
*   As botas, armaduras de peito, montarias, comidas e poções.
*   Valor financeiro estimado de logísticas (Loot vs Pérdidas).

---

## 2. Brainstorming Exclusivo: O Que Faremos Diferente?
Como transformar toda essa base de dados num "Gestor VIP" que não copia o site público? Abaixo, ideias de sistemas orgânicos para o desenvolvimento:

### 💡 Ideia A: Sistema de Regear e Economia Automatizada (O Diferencial de Ouro)
O AlbionBB visualiza lutas. Nós vamos **Pagar a Guilda** através dessas lutas!
Podemos criar um Módulo de "Logística e Prata" na *Fase 4*. O algoritmo olhará para o número de Deaths que a pessoa sofreu na ZvZ como *Tank* e conectará com o painel de Regear:
*   Se Fulano morreu de Tank numa ZvZ chancelada (onde ele tem 80% de presença nas lutas aprovadas), o site levanta uma flag no Discord: `[@Fulano] Regear Liberado: Tier 8 Camlann Depositado em seu nome na Aba 2, devolva quando quiser`. 
*   Em resumo: **Gestão de Banco da Guilda Atrelada aos Kills/Mortes Automáticos.**

### 💡 Ideia B: Dashboard de Penalidades (Multas de Zerg Police)
Nosso Inspetor de Arsenal detecta as "Trolladas" baseado nas armas fora do Meta. Em vez de só observar, criaremos no painel um botão para os Officership aplicarem *"Strikes"*. 
*   **Sistema:** O Strike desconta Silver virtual do sistema de loot daquele jogador, impedindo-o de ganhar premiações do Baú até ele regularizar as atitudes bélicas (usar a Build Mandatória de Lanças ou etc). O AlbionBB jamais faria isso porque é algo íntimo da I M O R T A I S.

### 💡 Ideia C: Hall da Fama e Cartões de Herói (Player Cards Promocionais)
Um gerador de imagem in-house. Os generais entram no perfil do jogador (ex: `ygdriart`), que renderiza uma credencial de Herói cibernética constando:
*   Win Rate de ZvZ particular dele.
*   Maior Dano já causado na história da Guilda.
*   IP Médio dele vs IP Médio Global.
Isso serve como uma forma incrível para postarmos no mural de Discord, promovendo o engajamento e competição saudável onde players competem pelo título do "Mês".

### 💡 Ideia D: Rivalidade Tracker (O "Blacklist" de Alianças)
Se o nosso banco já sabe com quem lutamos, podemos criar um mini-dashboard de "Guerras Declaradas". 
Quantos Biliões de Fama já retiramos de guildas rivais (Ex: Archs ou concorrentes locais)?
*   Métrica: "Derrotamos a guilda rival 45 vezes nestes dois meses!". Para usar isso como propaganda no fórum oficial de recrutamento do Albion América.

### 💡 Ideia E: Alertas e Automação de Operações Diárias
Enquanto o AlbionBB requer que o usuário fique atualizando a página para ver quem quebrou a base de dados em Dano ou em Kills, o nosso diferencial de Fase 3 enviará um bot para agir.
Batalha acabou de ocorrer? 2 minutos depois, no canal de #zvz-log da I M O R T A I S no Discord:
> *"⚔️ Batalha Identificada na T6_Black_Zone."*
> *"MVP de Dano: @MagoPoderoso (441k Dmg)"* 
> *"Acesse: guild-imortais.com/stats para o Board final!"*

---

## 3. Otimizações de Elite (Micro-Melhorias no que já construímos)
Para aperfeiçoar instantaneamente as interfaces e dados desenvolvidos nas Fases Iniciais, documentamos melhorias prontas para o ataque:

1. **Dashboard Principal (Filtros Globais):** Embutir um filtro de `Start/End Date` no Dashboard (`/`) para que o `Win Rate` e os Leaderboards reflitam a performance do Mês ou de um Evento Focado, não sendo mais um agregado imutável do Histórico Total de Kills e Mortes.
2. **Presença com "Sparklines" (Github Contribution Style):** Em `/presence`, trocar a visão seca de "Números Totais" por caixinhas ou barras coloridas representando os dias da semana (ex: Domingo a Sábado). Permitirá que o líder bata o olho e enxergue o histórico ("veio anteontem e ontem, porém sumiu hoje").
3. **Aconselhamento Tático no Zerg HQ:** Evoluir a exibição passiva em Pizza para fornecer análise cruzada. O sistema deverá juntar Win Rate com Role. Retornará avisos do tipo: *"Nas ZvZs que tivemos <12% Healers atuando, o Win Rate desabou gravemente (25%) / Acertem o Meta!"*
4. **Desacoplamento do Crawler Analógico (Automação em Nuvem):** Enviar o `crawler.py` que o Officer é obrigado a rodar no terminal para um `CronJob` na Vercel ou Actions. O banco Supabase receberá a garimpagem de Fama e Batalhas Massivas de "Graça, 24 horas por dia", eliminando intervenções humanas!

---

## 4. O Futuro Gigante: Módulo de Mentoria e Finanças (Fase 5 em diante)
Como nos distanciamos do padrão "site de tabelas" para virarmos um sistema de ERP para a Guilda, aqui estão ramificações agressivas para as próximas fases:

### 💡 Mentoria Individual (O Treinador Inteligente)
Ao criar uma página de Perfil Única para os membros (ex: `/player/RanaldoKun`), usaremos o banco para se comportar como um Treinador ou Analista de Dados particular:
*   **Aviso de Baixa Eficiência (Arma Errada):** *"Notamos que você usa [Light Crossbow] há 5 CTAS, mas o seu KDA com ela é 0.2 e o WinRate cai para 30%. Porém, quando você usou [Heavy Mace], salvou a backline com 60% Win Rate. Considere focar como Tank Secundário!"*
*   **Radar de Sobrevivência:** Dizer ao player: *"Como Healer, você morre em média aos 1min 20s de Luta (Morte Precoce). Afaste-se da Frontlane."* (Baseado na hora da morte dele cruzada com o tempo da ZvZ).

### 💡 Sistema Automático de Repasse de Loot (A Calculadora de Espólios)
Em toda vitória massiva de Black Zone, existe a "Mula" que pega as bags. Atualmente as guildas quebram a cabeça no Excel para dividir.
*   Nosso Site pode ter uma página **"Dividir Loot"**. Você digita: "O baú rendeu 50 Milhões de Prata".
*   O Sistema aperta um botão, faz uma leitura profunda puxando todo mundo que participou dessa ZvZ específica, dá bônus matemático no pagamento para os Mains Healers e Tanks, tira os inativos e gera a planilha perfeita e inquestionável dizendo os centavos exatos de quem ganha o quê.

### 💡 Histórico Mercenário / Portfólio de Aliança
Quando o Caller for buscar diplomacias fora do servidor ou ser pago para "limpar mapas" para alianças gigantes, envia o link `/portfolio`.
Lá é uma página que ignora as mortes e mostra puramente: *"IMORTAIS é uma Força Independente: Causa X milhões de dano em zona T8 e vence 70% das trocas desvantajosas com menos homens"*. Como se fosse um cartão de visitas de Serviço Militar para recrutar e negociar bases rentáveis.
