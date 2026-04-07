# Relatório Atualizado: O "Atalho" da API do AlbionBB

Após mergulhar na arquitetura do site `albionbb.com`, descobrimos uma mina de ouro. Em vez do AlbionBB consumir o jogo e fazer todos os cálculos no lado do cliente, eles possuem um servidor próprio (`api.albionbb.com`) onde eles já mastigaram todos os dados complexos do jogo.

Isso muda o nosso jogo. Em vez de calcular tudo do zero, nós podemos **consultar a API pública deles**.

## 1. Como a API do AlbionBB Funciona (O Atalho)

A estrutura de endpoints que eles deixam abertos é infinitamente superior e mais rica que a oficial do jogo. Olha o que nós ganhamos ao bater nos caminhos deles:

### A) Busca de Batalhas Facilitada
*   **Endpoint:** `https://api.albionbb.com/us/battles?search=IMORTAIS`
*   **O que faz:** Retorna uma lista limpa apenas das lutas que envolveram a guilda IMORTAIS, informando o ID da Batalha, oponente principal, data, total de jogadores da frente e fama conquistada, sem precisarmos varrer um milhão de lutas de guildas que não nos interessam!

### B) Os Dados Mastigados (A Grande Vantagem)
*   **Endpoint:** `https://api.albionbb.com/us/battles/{ID_DA_BATALHA}`
*   **O que faz:** Quando você consulta uma batalha neles, ao invés de vir um monte de eventos difíceis de ler, vem uma Array (lista) de `players` contendo:
    *   `DamageDone` (Dano total já somado da luta inteira).
    *   `SupportHealingDone` (Cura total já somada!).
    *   **`Role` (Classe Assinalada):** O site já te diz se o jogador era "Tank", "Range", "Melee" ou "Heal". Adeus complicação de ler array de espadas e cajados!
    *   `Average IP`: IP consolidado da luta.

### C) A Rota de "Attendance" (Presença)
*   **Endpoint:** `https://api.albionbb.com/us/guilds/{ID_DA_GUILDA}/attendance`
*   **O que faz:** Traz estatísticas mensais ou quinzenais agregadas de quanto dano a guilda deu junta e a média de presenças.

---

## 2. A Nova Arquitetura de Software com Supabase

Usando essa API, nós cortamos nosso tempo de desenvolvimento pela metade. Agora, o Supabase passa a ser apenas o nosso "Filtro Pessoal", para que possamos construir o visual rico do seu site e o Bot do Discord com velocidade.

### Como as Tabelas do Supabase Serão Desenhadas (Para você aprender):
Vamos criar duas "Planilhas" principais no seu banco:

**Tabela 1: `batalhas_registradas`**
*   `battle_id` (Ex: 123456789)
*   `data_hora` (Ex: 06/04/2026 21:00)
*   `oponentes` (Ex: "ROTA, BLS")
*   `status_analisada` (Se o nosso robô já baixou as informações da luta ou não).

**Tabela 2: `estatisticas_dos_membros`**
*   `player_name` (Ex: ygdriart)
*   `battle_id` (Linka com a tabela de batalha acima)
*   `funcao_realizada` (Ex: Ranged DPS)
*   `dano_total` (Ex: 69100)
*   `cura_total` (Ex: 54600)
*   `ip_usado` (Ex: 1537)

**O Fluxo de Vida Real:** Seu site não fará login na API do Albion. O nosso script em Python ou Node.js fará o seguinte a cada 30 minutos:
1. Puxa do AlbionBB se a "IMORTAIS" teve nova batalha.
2. Descobre quem lutou e puxa os danos/curas já caculados.
3. Salva no Supabase nas tabelas acima.
4. O WebSite da guilda exibe os dados lidos apenas do seu Supabase.

---

## 3. Novas Ideias Nascidas com esse Atalho!

1. **Dashboard de Retenção de Função:** Agora que os papéis (Tank/Heal/Mage) já vêm prontos do AlbionBB, é ridiculamente fácil criar na homepage um gráfico de Pizza mostrando a **"Composição Habitual da Zerg"**: (Ex: Estamos saindo com 40% DPS, 10% Tank e 50% Healer. Faltam tanques front-line!).
2. **Sorteios de VIPs Automáticos:** Já que os dados estarão no Supabase com muita limpeza, podemos no final do mês lançar um botão secreto no site chamado "Rodar Sorteio", onde o script pega quem teve mais de 80% de "Attendance" e rola a roleta para a liderança dar o Premium grátis pro abençoado!
3. **Rankings de Combate por Função (Match-ups):** Em vez de comparar todos do clã, o Supabase nos permite filtrar: "Me mostre o top Ranking de K/D APENAS de quem jogou de Tank no mês". Assim, é justo comparar tanques com tanques e curandeiros com curandeiros.
