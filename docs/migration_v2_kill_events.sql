-- =====================================================================
-- MIGRAÇÃO: Mentoria ZvZ V2 — Kill Events
-- Arquivo: docs/migration_v2_kill_events.sql
--
-- Executar no Supabase SQL Editor antes de rodar o crawler_kills.py
-- Documentação completa: docs/coaching_v2_roadmap.md
-- =====================================================================


-- 1. Adicionar coluna finished_at na tabela battles (se não existir)
ALTER TABLE battles
  ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;


-- 2. Criar a tabela kill_events
CREATE TABLE IF NOT EXISTS kill_events (
  event_id              BIGINT        PRIMARY KEY,
  battle_id             BIGINT        NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  timestamp             TIMESTAMPTZ   NOT NULL,

  -- Vítima (sempre um jogador da nossa guilda)
  victim_name           TEXT          NOT NULL,
  victim_guild          TEXT,

  -- Assassino (last hit)
  killer_name           TEXT,
  killer_guild          TEXT,
  killer_weapon         TEXT,           -- ID completo ex: "T6_2H_DUALSCIMITAR_UNDEAD@3"
  killer_weapon_norm    TEXT,           -- ID normalizado ex: "2H_DUALSCIMITAR_UNDEAD"

  -- Contexto da kill
  total_participants    INT           DEFAULT 0,   -- Quantas pessoas participaram da kill
  seconds_into_battle   INT,                       -- Segundos desde o início da batalha
  is_early_death        BOOLEAN       DEFAULT FALSE, -- TRUE se morreu nos primeiros 60s

  created_at            TIMESTAMPTZ   DEFAULT NOW()
);

-- Índices para queries rápidas no site
CREATE INDEX IF NOT EXISTS idx_kill_events_battle       ON kill_events(battle_id);
CREATE INDEX IF NOT EXISTS idx_kill_events_victim       ON kill_events(victim_name);
CREATE INDEX IF NOT EXISTS idx_kill_events_early_death  ON kill_events(is_early_death);
CREATE INDEX IF NOT EXISTS idx_kill_events_weapon       ON kill_events(killer_weapon_norm);
CREATE INDEX IF NOT EXISTS idx_kill_events_time         ON kill_events(seconds_into_battle);


-- 3. Habilitar Row Level Security (manter padrão do projeto)
ALTER TABLE kill_events ENABLE ROW LEVEL SECURITY;

-- Política: leitura pública (igual às outras tabelas)
-- NOTA: CREATE POLICY não suporta IF NOT EXISTS no PostgreSQL
CREATE POLICY "kill_events_public_read"
  ON kill_events FOR SELECT
  USING (true);

-- Política: apenas service role pode inserir (crawler usa SUPABASE_SERVICE_ROLE_KEY)
CREATE POLICY "kill_events_service_insert"
  ON kill_events FOR INSERT
  WITH CHECK (true);
