# 03 — Roadmap de Expansões Futuras

> **Battle Board I M O R T A I S** — Backlog de Funcionalidades Estratégicas

Este documento reúne todas as ideias de expansão de produto desenhadas para transformar o Battle Board no ERP definitivo da guilda.

---

## 1. 🛡️ Módulo de Regear Automático (Logística & Prata)

* **Objetivo:** Automatizar o processo de reembolso de sets para membros que caem em combate servindo à guilda.
* **Mecânica:**
  1. O sistema lê as mortes das batalhas marcadas como ZvZs oficiais.
  2. Filtra jogadores nas roles prioritárias (`tank`, `healer`, `support`) que possuem assiduidade &ge;70%.
  3. Gera um painel para a liderança: `[Aprovar Regear T8 para Fulano]`.
  4. Integra com webhook do Discord para notificar o membro e o responsável pelo baú.

---

## 2. 🤖 Bot de Notificação no Discord (Post-CTA Intel)

* **Objetivo:** Engajamento automático sem necessidade de abrir o site após a luta.
* **Mecânica:**
  1. Assim que o `crawler.py` detectar uma nova batalha, dispara uma mensagem rica em Markdown no canal de Discord `#zvz-logs`:
     ```
     ⚔️ NOVA BATALHA REGISTRADA — vs Take Care (NWA)
     🏆 Resultado: VITÓRIA (+14 Kills / 9.2M Fame)
     💥 Top Dano: @MagoPoderoso (440k Dmg)
     💚 Top Cura: @HealerBrabo (320k Heal)
     💀 MVP Abates: @Rafaeliz (8 Kills)
     📊 Relatório completo: https://seu-site.com/guild
     ```

---

## 3. 💳 Player Hero Cards (Cartões de Herói)

* **Objetivo:** Gamificação e reconhecimento dos membros da guilda.
* **Mecânica:**
  1. Na página do jogador, um botão `"Gerar Card de Herói"`.
  2. Gera uma imagem em formato 16:9 ou card vertical com estética cibernética/Albion contendo:
     - Avatar e nome do operador.
     - Role principal e arma de assinatura.
     - WinRate histórico, KDA e maior dano/cura já causados.
     - Selos de maestria (*"Maestria T8"*, *"Matador Elite"*, etc.).
  3. Pode ser baixada ou compartilhada no Discord com 1 clique.

---

## 4. ☁️ Crawler 100% em Nuvem (Automação sem `.bat`)

* **Objetivo:** Eliminar a necessidade de rodar scripts manualmente no computador.
* **Mecânica:**
  1. Criar um workflow do **GitHub Actions** (ou cron job na Vercel/Render).
  2. Executa a cada 30 minutos em segundo plano de graça.
  3. Alimenta o banco Supabase em tempo real.
