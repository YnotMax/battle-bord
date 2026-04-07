# Relatório: Análise de Obtenção de Dados de Killboards do Albion Online

Este relatório responde às dúvidas sobre como sites (como AlbionBB), repositórios (como albion-killbot) e bots de Discord (como Albion Assistant) coletam e organizam dados de lutas e jogadores no Albion Online.

## 1. Como estes sites pegam os dados? (Existe alguma API?)

**Sim, existe uma API, mas ela é interna e não oficial.**

A Sandbox Interactive (desenvolvedora do Albion Online) não oferece uma API pública, suportada e documentada para desenvolvedores terceiros. O que a comunidade faz é utilizar a **Gameinfo API**, que é a exata mesma API que o site oficial ([albiononline.com/killboard](https://albiononline.com/killboard)) usa nos bastidores para exibir suas próprias estatísticas.

Os desenvolvedores descobrem como essa API funciona acessando o Killboard oficial e usando a aba "Network" (Rede) das ferramentas de desenvolvedor do navegador (tecla F12) para inspecionar quais rotas de dados (endpoints) estão sendo requisitadas.

## 2. Como a API funciona e podemos pegar dados diretos?

Você pode fazer requisições HTTP (GET) diretamente para a API. Como o Albion abriu novos servidores, a URL base da API muda dependendo de qual servidor você quer consultar:

- **Americas (West):** `https://gameinfo.albiononline.com/api/gameinfo/`
- **Europe (Europe):** `https://gameinfo-ams.albiononline.com/api/gameinfo/`
- **Asia (East):** `https://gameinfo-sgp.albiononline.com/api/gameinfo/`

### Endpoints mais comuns (utilizados pelos bots e sites):
Embora não exista documentação oficial, a comunidade mapeou diversos endpoints ("caminhos" na URL para pegar dados específicos), tais como:
- `/events`: Traz uma lista dos últimos eventos de kills (quem matou quem, assistência, equipamentos usados, etc.).
- `/events/{KillID}`: Traz detalhes de uma kill específica.
- `/players/{PlayerID}`: Traz estatísticas detalhadas de um jogador (fame, KDA, guilda).
- `/guilds/{GuildID}`: Traz estatísticas de uma página de guilda (fundador, membros, top killers).
- `/guilds/{GuildID}/top` e `/players/{PlayerID}/topkills`: Rankings específicos para tabelas do discord.

Para organizar os dados, repositórios como o `albion-killbot` constroem robôs (em NodeJS ou Python) que ficam consultando (fazendo "pooling") regularmente esses endpoints e salvando os eventos em um banco de dados próprio. Ao receber os dados do arquivo JSON gigante que a API retorna, o programa apenas filtra as informações da guilda ou aliança desejadas.

## 3. É viável usar essa API?

**Sim, é viável e é exatamente o que todos fazem.** Mas há ressalvas importantíssimas que você deve ter em seu radar antes de criar a infraestrutura do seu site:

- **Falta de Estabilidade (Sem SLA):** Como a API é não oficial, a Sandbox pode alterar os _endpoints_, os formatos das respostas JSON, ou até mesmo desativar endpoints temporariamente sem qualquer aviso. 
- **Limites de Requisições (Rate Limits) e Proteções:** Se o seu site/bot fizer centenas de requisições por segundo para vasculhar mortes, os servidores do Albion podem bloquear seu IP. Muitas vezes a API passa por trás do **Cloudflare**, exigindo que as bibliotecas usadas para consultar a API precisem contornar bloqueios de bots (usando headers customizados que imitem um navegador).
- **Atraso nos Dados:** Os eventos raramente caem na API em tempo estritamente real. Geralmente existe um ligeiro atraso entre o que acontece in-game e o registro na página de Gameinfo.

## 4. Onde encontrar bibliotecas, wrappers e repositórios úteis para estudo?

Para facilitar seu desenvolvimento, não é necessário mapear os endpoints do zero. Você pode estudar o código-fonte de várias iniciativas da comunidade para ver exatamente como as requisições estão estruturadas.

**Fontes recomendadas para estudo:**

1. **[albion-killbot](https://github.com/agnjunio/albion-killbot) (e forks):**
   - **O que é:** Um clássico bot de Discord em NodeJS.
   - **O que estudar neles:** Observe a pasta de rotas ou `src/` e veja como eles formam os links da API, configuram as variáveis periodicamente e filtram as "kills" e "deaths" que pertencem apenas à guilda configurada.

2. **[psykzz/albion-api](https://github.com/psykzz/albion-api):**
   - **O que é:** Um "Wrapper" da API construído pela comunidade.
   - **O que estudar:** Ótimo para ver a listagem quase completa de endpoints descritos no código de forma limpa, para referenciar ao fazer o seu painel do site.

3. **[Albion Online Data Project](https://www.albion-online-data.com/):**
   - **O que é:** Esta é uma API focada em **Economia** (Mercado/Crafting), diferentemente do Killboard (focado em lutas/stats). 
   - **Como funciona:** Eles usam um cliente instalável que realiza _packet sniffing_ (capta o que transita na rede do usuário do jogo para o servidor) para alimentar os preços do mercado. Você pode querer integrar com eles no futuro caso seu site da guilda precise de tabelas de reembolso (regear) baseadas em preços de mercado atualizados!

## 5. Próximos Passos Sugeridos para o seu Site

Para criar seu "Battle Board" para a guilda, a rota de arquitetura sugerida seria:

1. Escolher a Stack tecnológica (ex: TypeScript/Node + React ou Next.js, ou Python + Django).
2. Criar um **Backend próprio** que consulte a API do Albion (`/events`, `/guilds/{id}`) de tempos em tempos (cron job saudável, a cada X minutos) para não ter seu painel banido.
3. Este seu Backend salvará essas lutas ("Killboards/Events") selecionadas em um Banco de Dados próprio (como um Postgres ou MongoDB) que pertençam aos integrantes da **sua Guilda**.
4. Construir o seu front-end/site de fato consumindo as informações ricas, agrupadas e já salvas do *seu próprio banco de dados*, resultando em um carregamento ultra-rápido para os usuários da sua guilda e não incomodando os servidores do jogo toda vez que alguém der um F5 na sua página.
