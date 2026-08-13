# 02 — Sistema de Mentoria Tática & AI Coaching

> **Battle Board I M O R T A I S** — Especificação Completa do Algoritmo de Coaching

---

## 1. O Algoritmo de AI Coaching do Jogador (`/player/[name]`)

No centro da página de cada operador, o sistema analisa o histórico completo e emite **1 diagnóstico prioritário** acionável, avaliado na seguinte ordem de precedência:

```
┌──────────────────────────────────────────────────────────┐
│  Prioridade 1: Amostragem Insuficiente (< 3 CTAs)        │
├──────────────────────────────────────────────────────────┤
│  Prioridade 2: Morte Precoce Crônica (≥50% em ≤60s)      │
├──────────────────────────────────────────────────────────┤
│  Prioridade 2.5: Carrasco Pessoal (≥30% mortes p/ arma)  │
├──────────────────────────────────────────────────────────┤
│  Prioridade 3: Momento de Queda Severa (WR recente <30%) │
├──────────────────────────────────────────────────────────┤
│  Prioridade 4: Sobrevivência Crítica (Mortes 2x > role)  │
├──────────────────────────────────────────────────────────┤
│  Prioridade 5: IP Subutilizado (IP +5% acima & Dano -20%)│
├──────────────────────────────────────────────────────────┤
│  Prioridade 6: Baixo Desempenho Relativo (Dano/Cura -20%)│
├──────────────────────────────────────────────────────────┤
│  Prioridade 7: Talento Oculto (Arma secundária +15% WR)  │
├──────────────────────────────────────────────────────────┤
│  Prioridade 8: Matador NATO Elite (KDA ≥3 e WR ≥55%)     │
├──────────────────────────────────────────────────────────┤
│  Prioridade 9: Maestria Certificada T8 (WR ≥65% e 5+ CTAs)│
├──────────────────────────────────────────────────────────┤
│  Prioridade 10: Monitoramento Padrão Ativo (Baseline)    │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Indicadores Rápidos do Operador (6 Badges)

Exibidos em formato de cards responsivos com tooltips interativos (`HintIcon`):

| Badge | Métrica | Critérios de Cor |
|---|---|---|
| **📈 Tendência** | WR últimas 5 lutas vs histórico | 🟩 +15% (Ascensão) \| 🟥 -15% (Queda) \| ⬜ Estável |
| **🏃 Assiduidade** | % de CTAs da guilda participadas | 🟩 ≥70% (Assíduo) \| 🟥 <30% (Irregular) |
| **🛡️ Sobrevivência** | Média de mortes/luta vs média do Role | 🟥 ≥2x média (Crítica) \| 🟩 ≤0.5x (Exemplar) |
| **⚡ KDA** | `Kills / Math.max(1, Mortes)` | 🟧 ≥3.0 (Elite) \| 🟥 <0.5 (Baixo) |
| **⏱️ Morte Cedo** | % de mortes em &le;60s da luta | 🟥 ≥40% (Alerta de Defensivas) \| 🟩 0% (Seguro) |
| **🗡️ Arma Fatal** | Arma que mais causou mortes ao player | 🟧 ≥2 mortes (Exibe ícone oficial da arma) |

---

## 3. Inteligência Macro de Guilda: Fases de Combate (`/guild`)

Em vez de analisar apenas uma batalha isolada, a aba Mentoria analisa a distribuição de combate de **todas as batalhas do período**:

### As 4 Fases Táticas do Albion ZvZ
1. **0s a 30s (1º Engage / Abertura):**
   - *Condição:* Todos os operadores possuem 100% das poções, defensivas e botas disponíveis.
   - *Alerta se mortes ≥ 45%:* Baixas por economia de defensivas, falta de foco no shotcaller ou posicionamento desorganizado na abertura.
2. **31s a 60s (Pós-Choque / Reset):**
   - *Condição:* Habilidades e poções principais entraram em tempo de recarga (~30s CD).
   - *Alerta se mortes ≥ 40%:* A guilda sobrevive ao primeiro choque, mas não recua de forma coordenada durante o cooldown (falta de chamada de "RESET e ESPALHAR").
3. **61s a 120s (2º Engage / Batalha Sustentada):**
   - *Condição:* Segunda rotação de habilidades, reposicionamento de Healers e Tanks segurando a formação.
4. **120s+ (Finalização / Desgaste):**
   - *Condição:* Sobrevivência tardia, perseguição e clean-up.

---

## 4. Detecção de Bomb Squads vs Zerg Claps

Quando ocorrem picos de 4+ mortes em uma janela de 5 segundos, o algoritmo classifica o evento examinando as armas dos assassinos:

* **Armas de Bomb Squad (Flanco/Burst):**
  `Rift Glaive`, `Glaive`, `Hellfire Hands`, `Bloodletter`, `Wailing Bow`, `Fire Bomb Staff`, `Hallowfall`, `Glacial Staff`, `Soulscythe`, `Camlann Mace`, `Grovekeeper`.
* **Armas de Zerg Clap (Choque Frontal da Main Zerg):**
  `Dual Scimitar Undead`, `Galatine Pair`, `Kingmaker`, `Arcane Staff`, `Fire Staff`, `Holy Staff`, `Cursed Staff`, `Spear`.
