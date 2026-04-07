-- Tabela 1: Batalhas (Registra os ZvZs da Guilda)
CREATE TABLE public.battles (
    id bigint PRIMARY KEY, -- ID exato da batalha no Albion
    start_time timestamp with time zone NOT NULL,
    opponents text NOT NULL, -- Quais guildas/alianças inimigas estavam
    result text NOT NULL, -- WIN ou LOSS (Baseado em mais kills ou K/D)
    guild_players integer NOT NULL, -- Quantos Membros da sua guilda participaram
    total_kills integer,
    total_fame bigint
);

-- Tabela 2: Estatísticas dos Membros (Vinculada à tabela de batalhas)
CREATE TABLE public.player_stats (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    battle_id bigint REFERENCES public.battles(id) ON DELETE CASCADE,
    player_name text NOT NULL,
    role text NOT NULL, -- Tank, Healer, Ranged, Support, Melee
    damage_done bigint DEFAULT 0,
    healing_done bigint DEFAULT 0,
    average_ip integer DEFAULT 0,
    kills integer DEFAULT 0,
    deaths integer DEFAULT 0
);

-- Cria um índice para consultas rápidas por nome do jogador (Usado na página de presenças)
CREATE INDEX idx_player_stats_name ON public.player_stats(player_name);
