# Resumo da Atualização (Experiência do Usuário e Tooltips)

Nesta etapa focada em **Usabilidade e Melhoria Cognitiva**, fizemos uma varredura por toda a aplicação implementando dicas contextuais e melhorando os painéis para diminuir a carga mental dos usuários na leitura dos dados. 

## Mudanças e Adições 🌟

### 1. Sistema Global de Tooltips
Implementamos um sistema elegante de tooltips puramente em CSS (`globals.css`). Agora, colocar o cursor sobre elementos com o atributo de dicas revela informações precisas instantaneamente (sem carregar o peso de bibliotecas de Javascript pesadas).

### 2. Dashboard (`/`)
- Adicionadas tooltips contextuais nas coroas de **Top DPS**, **Top Healers** e **Top Kills** explicando o que é cada métrica.
- O Gráfico de **Evolução do Win Rate** ganhou legendas dinâmicas. Agora você pode passar o mouse sobre cada ponto e ver exatamente a quantidade de batalhas e a porcentagem.

### 3. Busca Inteligente (`/player`)
- A página de busca não é mais apenas uma caixa vazia. Inserimos uma listagem inteligente com os **20 Operadores Mais Ativos** (com base no banco de dados). Eles servem como atalhos para os perfis táticos.

### 4. Perfil Individual Tático (`/player/[name]`)
- **Radar Honesto**: Os valores do gráfico de radar (BaseLine Ideal da Guilda) agora são calculados diretamente de **dados reais** do mesmo *role* e não mais fixados. (Ex: O DPS do jogador X é comparado com o DPS médio dos demais jogadores que fizeram papel de DPS nas mesmas lutas).
- **Conselhos de Mentoria**: O algoritmo AI Coach agora percebe se o jogador tem menos de 3 batalhas e avisa da *Amostragem Insuficiente* antes de tecer críticas.
- **Weapon Icons**: A tabela de desempenho e o *Match History* agora exibem o ícone real do armamento ao lado do nome da arma (utilizando o *WeaponIcon* alimentado pela API do Albion). 
- O histórico **Op.gg (ZvZs)** agora possui links que vão direto para a *AlbionBB*.

### 5. Zerg HQ (`/zerg`)
- Banner Explicativo: Incluímos uma chamada clara indicando o objetivo estratégico da página.
- Gráfico de Composição: Ao passar o mouse sobre cada cor da legenda, um tooltip diz quantos jogadores de cada *role* formam a composição.

### 6. Mentoria da Zerg (`/guild`)
- Retiramos a abreviação "K" das Kills, pois poderia confundir com "mil" (ex: 20K = 20 mil? Não, eram apenas 20 kills).
- Todos os cabeçalhos dos murais (*Top Healers*, *Tanks de Sobrevivência*, *Top DPS*, *Top Kills*) receberam **badges informativos** (tooltips).
- **Off-Meta**: Explicamos que as armas da tabela "Off-Meta" são aquelas subutilizadas, mas que estranhamente bateram um altíssimo WinRate.
- **Red Flags Corrigido**: Redefinimos o Tribunal das Red Flags! A análise de armas perigosas (WinRate abaixo de 40%) foca especificamente em **DPS e Healers**. Tanks e Supports foram removidos desse algoritmo, já que dependem quase inteiramente de como a linha de DPS e Healers avança, evitando culpar o Tank por mortes globais alheias.

A aplicação agora respira um ar extremamente mais analítico, responsivo e *Premium*.

### 7. Correções Críticas (Pós-Revisão)
- **Guildas Aliadas (Filtro Inteligente):** O crawler agora possui um *fallback* inteligente (ALLIED_GUILDS). Mesmo que a API do Albion falhe em informar a aliança de uma guilda, o sistema saberá quais guildas amigas ignorar no cálculo de oponentes, evitando poluir o Win Rate com friendly-fire.
- **Gráfico de Win Rate Aprimorado:** O eixo X do gráfico agora mostra as **datas reais** de cada intervalo de batalha, substituindo a numeração abstrata de blocos. O tooltip nativo também foi fixado para renderização SVG, garantindo interatividade 100% funcional.

### 8. Auditoria de Qualidade Pós-Entrega
Depois de verificar o código real em detalhe, foram identificadas e corrigidas 3 falhas sutis:
- **wStats role incorreto:** O `role` de cada arma era registrado apenas com o primeiro registro encontrado. Isso causava classificação errada no Red Flags (ex: se a primeira aparição da arma era como `tank`, ela seria excluída mesmo que 90% dos usos fossem como `dps`). Agora acumulamos os roles e pegamos o **dominante** com `Object.entries(roleCounts).sort()`.
- **Coaching Padrão Genérico:** O caso padrão de coaching ("Monitoramento Padrão Ativo") gerava o mesmo texto para todos os jogadores sem dados suficientes para outro diagnóstico. Agora o texto inclui: total de CTAs, classificação do WinRate (acima da média / dentro do esperado / abaixo do ideal) e comentário direcionado baseado no `relativePct`.
- **Tribunal de Rivalidades com aviso de dados antigos:** Adicionamos um banner de aviso no topo do painel explicando que se aparecerem aliados, é porque foram importados antes do filtro `ALLIED_GUILDS` existir, e que basta rodar o crawler novamente para corrigir.
