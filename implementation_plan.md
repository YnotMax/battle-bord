# Plano de Melhorias — Battle Board IMORTAIS (Revisão UX + Bugs)

## Contexto
Revisão geral do app com foco em: reduzir carga cognitiva do usuário, corrigir dados incorretos (guildas da aliança aparecendo como inimigas), adicionar ícones de armas, melhorar tooltips e explicações, e aumentar o histórico capturado.

---

## 1. Encher_Banco_Com_Historico — Mais Histórico

**Problema:** O script `populate_history.py` está configurado para varrer apenas **2 páginas** da API (linha 60: `fetch_deep_history(2)`). Com ZvZ acontecendo 3x por dia e filtrando por 21+ jogadores, 2 páginas = apenas 2 dias de histórico.

**Correção:** Aumentar para **10 páginas** no `.py` e ajustar o `.bat` para informar o usuário sobre o tempo estimado.

---

## 2. Filtro de Aliança — Guildas Amigas como Inimigas

> [!CAUTION]
> **Bug de Dados Grave.** Guildas da aliança estão aparecendo como inimigas no Tribunal de Rivalidades e no campo `opponents` das batalhas. Isso polui o Win Rate e rivalidades.

**Raiz do Problema:** No `crawler.py`, a função `process_battle_details` pega **todas** as guildas que não são "I M O R T A I S" como opositoras. Porém, em ZvZs de aliança, há outras guildas amigas também presentes.

**Solução:** Criar uma lista de guildas aliadas configurável em `crawler.py`. Na hora de salvar `opponents`, excluir as guildas dessa lista. A lista deve ser fácil de editar (bloco destacado no topo do arquivo).

```python
# Guildas que jogam na nossa ALIANÇA (não são inimigas)
ALLIED_GUILDS = [
    "We Profit",
    # Adicione aqui outras guildas aliadas
]
```

---

## 3. Ícones de Armas da API do Albion Online

A API oficial do Albion Online fornece ícones em formato PNG via:
```
https://render.albiononline.com/v1/item/{WEAPON_ID}.png?size=48
```
Exemplo: `T8_MAIN_ARCANESTAFF` → `https://render.albiononline.com/v1/item/T8_MAIN_ARCANESTAFF.png`

**Implementação:** Criar um componente `WeaponIcon` reutilizável que recebe o `rawWeapon` (nome cru da API como `T8_2H_DAGGERPAIR_MORGANA@3`) e renderiza um `<img>` de 24x24px ao lado do nome da arma. Usar tamanho `?size=48` e exibir com CSS em 24px (fica nítido). Colocar em:
- Tabela de Eficiência de Armamento (perfil do jogador)
- Coaching / Monitoramento Ativo
- Ranking Global de Arquétipos (Mentoria)
- Armas Off-Meta e Red Flags

---

## 4. Melhorias por Página

### 4.1 Dashboard (`/`)

#### Top DPS / Top Healers / Top Kills — Contextualizar
**Problema:** Usuário não sabe se é dano total histórico, por luta ou do filtro ativo.
**Correção:**
- Adicionar legenda abaixo de cada título: *"Dano acumulado em todas as batalhas do período selecionado"*
- Exibir o número de batalhas consideradas: *"(baseado em 12 batalhas)"*
- No card de kills: mudar `{p.kills}` para mostrar claramente `{p.kills} kills` e adicionar tooltip de que é a **soma** de participações de kills

#### Operational Battle Log — Guildas Amigas como "vs"
**Já coberto pelo item 2.** Quando corrigirmos o campo `opponents` no crawler, a lista vai mostrar apenas inimigos reais.

#### Gráfico de Evolução do Win Rate — Legibilidade
**Problema:** Texto no SVG muito pequeno (4.5px), mostra só 0% ou 100% porque há poucas batalhas (um bloco com 1 batalha = 0% ou 100%).
**Correção:**
- Adicionar hover com tooltip nativo (`title` no SVG ou um `<foreignObject>`) mostrando: `Bloco X: Y batalhas | Z vitórias | Win Rate W%`
- Ajustar `chunkSize` para no mínimo 1 e máximo proporcional ao total de batalhas
- Adicionar labels de eixo Y (0%, 50%, 100%) e eixo X com datas
- Aumentar fonte dos labels para pelo menos 7px com `overflow: visible` no SVG

### 4.2 Buscar Operador (`/player`)

**Problema:** A página de busca está vazia até o usuário digitar. Usuário fica perdido sem saber quais nomes existem.

**Melhoria:** Ao carregar a página, buscar os **20 jogadores mais ativos** (maior contagem de batalhas) do banco e mostrar como uma grade de "atalhos rápidos" clicáveis abaixo do campo de busca. Label: *"Operadores mais ativos"*.

### 4.3 Perfil do Jogador (`/player/[nome]`)

#### Polígono de Playstyle (Radar) — Revisão dos Eixos
**Problema atual:** Os valores do radar estão calculados com fórmulas fixas hardcoded que podem não fazer sentido para todos os roles.

**Revisão dos eixos:**
- **Agressividade (Kills):** Normalizar pelo número de batalhas, não pelo role. Escala: média da guilda = 50, dobro = 100.
- **Sustento Defensivo (Sobrevivência):** Inverso da taxa de mortes/batalha. 0 mortes/batalha = 100%, 3+ mortes = 0%.
- **Dano Zerg (DPS):** Comparar com a média do mesmo role na guilda (não hardcoded). Healer com 0 dano = 0 (justo).
- **Sustain Geral (Heal):** Idem — comparar com média do mesmo role.
- **Frequência Vencedora:** Win Rate puro (já está correto).

**O pontinho azul (Média da Guilda):** Manter, mas usar valores reais calculados do banco, não os valores fixos (65, 70, 60...).

#### Coaching / Monitoramento Ativo — Mais Inteligente
**Problema:** O texto genérico "Você tem flutuado no meta confortavelmente" não diz nada útil.
**Melhoria:** Adicionar mais contexto:
- Quantas batalhas foram analisadas
- Melhor performance do jogador por role vs média da guilda
- Se o jogador tem poucas batalhas (< 3), mostrar: *"Poucos dados ainda. Participe de mais ZvZs para um diagnóstico preciso."*

#### Ícone de Arma — Já descrito no item 3

#### Tooltip nos links do perfil
- Ao passar mouse sobre o nome da batalha no Feed ZvZ: mostrar `"Ver detalhes no AlbionBB"`
- Ao passar mouse sobre o nome da arma: mostrar ícone + `"Ver item no Albion2D"`

### 4.4 Presença (`/presence`)

**Melhoria simples:** Ao passar o mouse sobre o nome do jogador, mostrar um tooltip:
*"Clique para ver o Painel de Mentoria Individual de {nome}"*

Tornar o nome clicável (link para `/player/{nome}`) com `cursor: pointer` e sublinhado suave no hover.

### 4.5 Zerg HQ (`/zerg`) — Contexto e Explicação

**Problema:** Usuário esqueceu para que serve a página.

**O que é o Zerg HQ:**
É o painel de **composição tática da guilda**. Ele responde a pergunta: *"Como estamos distribuídos entre Tanks, Healers, Melees e Ranges?"* Isso importa porque a composição afeta diretamente o Win Rate.

**Melhorias:**
- Adicionar um banner de contexto no topo da página explicando a função
- O alerta tático (advice box) já existe e está bom — melhorar o texto para ser mais específico com os números
- Renomear "Composição Média da Zerg" para "Distribuição de Roles nas Batalhas"
- Adicionar tooltip nas fatias do gráfico de pizza ao passar o mouse

### 4.6 Mentoria Global (`/guild`)

#### Tribunal de Rivalidades — Guildas Amigas
**Já coberto pelo item 2.** Corrigir o crawler para excluir aliados do campo `opponents`.

#### Top Kills — "7K" não são 7.000 kills
**Problema:** O código mostra `{p.kills} K` onde `K` é a letra K hardcoded na UI, não formatter. Usuário interpretou como "7 mil kills".
**Correção:** Remover o ` K` da label. Mostrar como: `{p.kills} kills` ou simplesmente o número sem sufixo K.

#### Explicações de cada seção
Adicionar subtítulo ou badge em cada painel explicando:
- **Top Kills (Abates):** *"Total de participações em kills (abates) somadas em todas as batalhas do período"*
- **Top Dano Bruto (DPS Médio):** *"Dano médio por batalha. Jogadores com 3+ batalhas no período"*
- **Maior Sobrevivência:** *"Jogadores com menor taxa de mortes por batalha (mín. 5 CTAs)"*

#### Ícones de Arma no Ranking Global de Arquétipos
**Já descrito no item 3.**

#### Armas Fora do Meta (Off-Meta Secretas) — Explicar a regra
**Regra atual:** Armas usadas em 2 a 20% das batalhas mas com Win Rate ≥ 50%.
**Contextualizar:** Adicionar label: *"Armas raramente escolhidas mas que entregaram vitórias quando usadas"*

#### Red Flags — Corrigir a regra e explicar
**Problema:** Armas muito usadas com WR < 40% aparecem como Red Flag — mas essas armas podem ser indispensáveis (tanks, healers que morrem por posição, não por arma ruim).

**Regra atual:** `uses >= 30% das batalhas && winRate < 40%`

**Análise:** Uma arma pode estar em Red Flag porque:
1. O jogador está mal posicionado (não é problema da arma)
2. A arma é de suporte/tank e o win rate é da batalha toda (não da arma individualmente)

**Proposta de melhoria:** Excluir roles `tank` e `support` da análise de Red Flags, pois eles estão sujeitos ao resultado da batalha inteira independente de performance individual. Red Flags deve focar em **DPS e Healers** com WR < 40%.

**Contextualizar:** Adicionar label: *"Armas frequentemente escolhidas mas presentes em batalhas perdidas. Atenção: pode indicar necessidade de substituição ou reposicionamento."*

---

## 5. Componente Global de Tooltip

Criar um componente `Tooltip` simples em CSS/HTML puro (sem biblioteca) que ao fazer `hover` em um elemento mostra uma caixinha de texto. Usar em:
- Links externos (AlbionBB, Albion2D)
- Nomes de jogadores (links para perfil)
- Fatias do gráfico de pizza no Zerg HQ
- Labels dos eixos do radar

---

## Perguntas Abertas

> [!IMPORTANT]
> **1. Lista de guildas aliadas:** Quais guildas além de "We Profit" estão na sua aliança atualmente? Precisamos de uma lista completa para o filtro funcionar.

> [!IMPORTANT]
> **2. Quantas páginas de histórico?** 10 páginas (~200 batalhas listadas pela API, considerando o filtro de 21+) deve preencher várias semanas. Podemos colocar um parâmetro interativo no `.bat` perguntando ao usuário quantas páginas varrer (5, 10, 20)?

> [!NOTE]
> **3. Radar — Dados reais vs fixos:** Para o pontinho azul do radar (média da guilda), posso calcular a média real de cada métrica do banco. Isso vai deixar o radar muito mais preciso. Aprovado?

---

## Ordem de Execução Proposta

1. `populate_history.py` → aumentar para 10 páginas (rápido)
2. `crawler.py` → filtro de guildas aliadas (ALLIED_GUILDS)
3. Componente `WeaponIcon` → reutilizável
4. Dashboard → contextualizar leaderboards + corrigir gráfico
5. `/player` → lista inicial de jogadores ativos
6. `/player/[nome]` → radar melhorado + ícones + coaching
7. `/presence` → nomes clicáveis + tooltip
8. `/zerg` → banner de contexto + tooltips no gráfico
9. `/guild` → corrigir labels de kills + ícones + explicações + Red Flags melhorado

---

## 🎯 STATUS FINAL DA EXECUÇÃO
Todas as tarefas foram concluídas e verificadas com sucesso na rodada de refatoração pós-revisão. O código do crawler ganhou `ALLIED_GUILDS` como fallback para resolver bugs na API original e os gráficos SVG ganharam melhorias definitivas de eixo e Tooltips (`<title>`). Todo o histórico pode ser reimportado sem problemas pelas ferramentas criadas.
