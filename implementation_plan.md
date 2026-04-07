# Battle Board IMORTAIS - Road Map e Prioridades

As ideias que tivemos são incríveis, mas na arquitetura de software (ainda mais lidando com estatísticas), nós temos o "Efeito Dominó". Um gráfico de MVP não pode existir se não existir um cálculo de dano prévio; e um cálculo de dano não existe sem a tabela de batalha básica.

Fiz uma filtragem baseada na **Viabilidade Técnica** e no **Engajamento Máximo** que isso vai gerar para sua guilda, dividindo em Três Fases cruciais.

## Fase 1: A Fundação de Aço (Prioridade Máxima)
**O que é:** O alicerce! Nenhuma outra ideia super legal que tivemos consegue operar se os dados não estiverem guardadinhos na sua casa primeiro.
- **Estruturação Tecnológica:** Setup do Frontend usando **Next.js** + Setup do banco de dados **Supabase**.
- **Desenvolvimento do Crawler:** Vamos codar o seu script que bate na `api.albionbb.com`, puxa as lutas diárias da IMORTAIS e injeta no Supabase em tabelas otimizadas chamadas `Batalhas` e `Participantes`.
- **UI Base e Leaderboards Simples:** A sua Home Page provisória terá a listagem de **"Últimas Lutas"** (igual ao AlbionBB) e duas colunas de Troféu globais: O Campeão Supremo de **Dano** (DPS Global) e de **Cura** Global.
- **Por que é o 1º Passo:** Isso prova que o ecossistema (AlbionBB > Supabase > Nosso Site) funciona liso em segundos, e já te entrega um placar pronto pra instigar a guilda a subir números.

---

## Fase 2: O Radar de Presença e a Justiça Cega
**O que é:** Transformar os dados numéricos brutos em planilhas que os Gestores da Guilda imploram para ter, organizando o Clã.
- **Painel de Attendance (Presença Limpa):** Uma página feita só para os Co-Leaders avaliarem, num clique, quem logou em 80% das batalhas do final de semana vs quem zerou no mês (facilita os famosos "kicks").
- **Tabelas de Roles Filtradas (Ranking Justo):** Você parou para pensar que um Healer ou um Tank jamais será reconhecido numa leaderboard de Dano? Aqui vamos criar o "Match-up por Classes", o site vai fazer um pódio visual incrível apenas do Top 3 Healers de HPM (Cura/Min), Top 3 Suportes, Top 3 Tanks com maior sobrevida.
- **Por que é o 2º Passo:** Com o Supabase já alimentado pela Fase 1, cruzar quantas vezes o "ygdriart" aparece como Healer exige poucas linhas de código do Banco. Vai gerar uma competição muito saudável na Zerg e ajudar ativamente na gestão administrativa da IMORTAIS.

---

## Fase 3: As Features Picas (Premium)
**O que é:** O puro brilho! Ferramentas analíticas e gráficas para colocar a sua IMORTAIS dez passos a frente de guildas gigantes do Albion, usando os dados já validados.
- **Gráfico de "Zerg Comp Habitual":** Um belíssimo gráfico de Pizza no centro da Dashboard principal avisando os jogadores: *Temos 15% Tanks, 45% Range e precisamos de Caster Supports*.
- **"O Teste Econômico" (O Inspetor de Gear/Zerg Police):** Avaliamos o Array de "*Equipment*" da luta que puxamos lá na Fase 1. Se os equipamentos daquele membro não correspondem às metralhadoras ou cajados permitidos na Build de Zerg, apontamos uma "multa"/tag vermelha indicando Troller (set barato demais ou classe inventada na hora H).
- **Bot Alerta (Webhook):** Assim que o robô da Fase 1 pescar uma Batalha no Banco Supabase, ele ejeta mensagem automática no Chat do Discord. "Batalha Registrada contra a ROTA. Acessem `imortais-board.app` para ver o herói MVP."

## User Review Required

> [!IMPORTANT]
> **Você aprova essa divisão de Fases de Desenvolvimento?**
> Sendo assim, o nosso "Marco Zero" que começaremos as mãos na massa amanhã mesmo é: Bolar e Inicializar o Setup do Next.js UI para a fundação e a extração limpa desses dados em um Supabase. Posso dar a largada por este plano de Arquitetura em Fases?
