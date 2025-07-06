-- Pokemon Go Comprehensive Database Schema
-- Star Schema Design with Pokemon as Central Entity

-- ============================================================
-- CORE FACT TABLE (Central Hub)
-- ============================================================

CREATE TABLE fact_pokemon (
    pk_pokemon_id TEXT PRIMARY KEY,
    pokemon_number INTEGER NOT NULL,
    pokemon_name TEXT NOT NULL,
    form TEXT DEFAULT 'Normal',
    fk_pokemon_family_id TEXT,
    fk_primary_type_id TEXT,
    fk_secondary_type_id TEXT,
    base_attack INTEGER NOT NULL,
    base_defense INTEGER NOT NULL,
    base_stamina INTEGER NOT NULL,
    max_cp INTEGER NOT NULL,
    generation INTEGER NOT NULL,
    is_legendary BOOLEAN DEFAULT FALSE,
    is_mythical BOOLEAN DEFAULT FALSE,
    is_shadow_available BOOLEAN DEFAULT FALSE,
    is_mega_available BOOLEAN DEFAULT FALSE,
    release_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fk_pokemon_family_id) REFERENCES dim_pokemon_families(pk_family_id),
    FOREIGN KEY (fk_primary_type_id) REFERENCES dim_types(pk_type_id),
    FOREIGN KEY (fk_secondary_type_id) REFERENCES dim_types(pk_type_id)
);

-- ============================================================
-- METRICS FACT TABLES (Time-Varying Data)
-- ============================================================

CREATE TABLE fact_pokemon_pvp_rankings (
    pk_pvp_ranking_id TEXT PRIMARY KEY,
    fk_pokemon_id TEXT NOT NULL,
    fk_league_id TEXT NOT NULL,
    fk_moveset_id TEXT NOT NULL,
    fk_date_id TEXT NOT NULL,
    fk_scenario_id TEXT NOT NULL,
    pvp_rank_percent REAL,
    pvp_rank_number INTEGER,
    pvp_score REAL,
    stat_product REAL,
    usage_percent REAL,
    effective_from_date DATE,
    effective_to_date DATE,
    is_current BOOLEAN DEFAULT TRUE,
    data_source_version TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fk_pokemon_id) REFERENCES fact_pokemon(pk_pokemon_id),
    FOREIGN KEY (fk_league_id) REFERENCES dim_leagues(pk_league_id),
    FOREIGN KEY (fk_moveset_id) REFERENCES dim_movesets(pk_moveset_id),
    FOREIGN KEY (fk_date_id) REFERENCES dim_date(pk_date_id),
    FOREIGN KEY (fk_scenario_id) REFERENCES dim_battle_scenarios(pk_scenario_id)
);

CREATE TABLE fact_pokemon_pve_tiers (
    pk_pve_tier_id TEXT PRIMARY KEY,
    fk_pokemon_id TEXT NOT NULL,
    fk_attacking_type_id TEXT NOT NULL,
    fk_defending_type_id TEXT NOT NULL,
    fk_date_id TEXT NOT NULL,
    tier_rank TEXT, -- S, A, B, C, D, F
    tier_score REAL,
    effectiveness_rating REAL,
    pve_overall_rank INTEGER,
    effective_from_date DATE,
    effective_to_date DATE,
    is_current BOOLEAN DEFAULT TRUE,
    data_source_version TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fk_pokemon_id) REFERENCES fact_pokemon(pk_pokemon_id),
    FOREIGN KEY (fk_attacking_type_id) REFERENCES dim_types(pk_type_id),
    FOREIGN KEY (fk_defending_type_id) REFERENCES dim_types(pk_type_id),
    FOREIGN KEY (fk_date_id) REFERENCES dim_date(pk_date_id)
);

CREATE TABLE fact_pokemon_pve_performance_metrics (
    pk_pve_performance_id TEXT PRIMARY KEY,
    fk_pokemon_id TEXT NOT NULL,
    fk_moveset_id TEXT NOT NULL,
    fk_target_type_id TEXT NOT NULL,
    fk_date_id TEXT NOT NULL,
    fk_scenario_id TEXT NOT NULL,
    damage_per_second REAL,
    total_damage_output REAL,
    time_to_win REAL,
    deaths INTEGER,
    energy_efficiency REAL,
    survivability_score REAL,
    type_effectiveness_multiplier REAL,
    stab_bonus REAL,
    weather_bonus REAL,
    friendship_bonus REAL,
    mega_bonus REAL,
    shadow_bonus REAL,
    composite_score REAL,
    rank_vs_type INTEGER,
    percentile_score REAL,
    effective_from_date DATE,
    effective_to_date DATE,
    is_current BOOLEAN DEFAULT TRUE,
    data_source_version TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fk_pokemon_id) REFERENCES fact_pokemon(pk_pokemon_id),
    FOREIGN KEY (fk_moveset_id) REFERENCES dim_movesets(pk_moveset_id),
    FOREIGN KEY (fk_target_type_id) REFERENCES dim_types(pk_type_id),
    FOREIGN KEY (fk_date_id) REFERENCES dim_date(pk_date_id),
    FOREIGN KEY (fk_scenario_id) REFERENCES dim_pve_scenarios(pk_pve_scenario_id)
);

-- Optional: User collection table (for PokeGenie integration)
CREATE TABLE fact_user_pokemon_collection (
    pk_user_pokemon_id TEXT PRIMARY KEY,
    fk_pokemon_id TEXT NOT NULL,
    fk_collection_id TEXT NOT NULL,
    fk_moveset_id TEXT,
    fk_scan_date_id TEXT,
    cp INTEGER,
    hp INTEGER,
    atk_iv INTEGER CHECK (atk_iv >= 0 AND atk_iv <= 15),
    def_iv INTEGER CHECK (def_iv >= 0 AND def_iv <= 15),
    sta_iv INTEGER CHECK (sta_iv >= 0 AND sta_iv <= 15),
    iv_avg REAL,
    level_min REAL,
    level_max REAL,
    is_lucky BOOLEAN DEFAULT FALSE,
    is_shadow BOOLEAN DEFAULT FALSE,
    is_purified BOOLEAN DEFAULT FALSE,
    is_favorite BOOLEAN DEFAULT FALSE,
    dust_cost INTEGER,
    candy_cost INTEGER,
    great_league_rank_percent REAL,
    ultra_league_rank_percent REAL,
    little_league_rank_percent REAL,
    catch_date DATE,
    weight REAL,
    height REAL,
    is_archived BOOLEAN DEFAULT FALSE,
    import_batch_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fk_pokemon_id) REFERENCES fact_pokemon(pk_pokemon_id),
    FOREIGN KEY (fk_collection_id) REFERENCES dim_user_collections(pk_collection_id),
    FOREIGN KEY (fk_moveset_id) REFERENCES dim_movesets(pk_moveset_id),
    FOREIGN KEY (fk_scan_date_id) REFERENCES dim_date(pk_date_id)
);

-- ============================================================
-- DIMENSION TABLES (Descriptive Attributes)
-- ============================================================

CREATE TABLE dim_pokemon_families (
    pk_family_id TEXT PRIMARY KEY,
    family_name TEXT NOT NULL,
    base_pokemon_id TEXT,
    family_type TEXT CHECK (family_type IN ('linear', 'branching', 'single')),
    candy_type TEXT NOT NULL,
    is_legendary_family BOOLEAN DEFAULT FALSE,
    generation_introduced INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dim_pokemon_evolutions (
    pk_evolution_id TEXT PRIMARY KEY,
    fk_from_pokemon_id TEXT NOT NULL,
    fk_to_pokemon_id TEXT NOT NULL,
    fk_family_id TEXT NOT NULL,
    evolution_stage INTEGER,
    candy_cost INTEGER,
    evolution_item TEXT,
    walking_distance REAL,
    special_requirement TEXT,
    is_mega_evolution BOOLEAN DEFAULT FALSE,
    is_temporary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fk_from_pokemon_id) REFERENCES fact_pokemon(pk_pokemon_id),
    FOREIGN KEY (fk_to_pokemon_id) REFERENCES fact_pokemon(pk_pokemon_id),
    FOREIGN KEY (fk_family_id) REFERENCES dim_pokemon_families(pk_family_id)
);

CREATE TABLE dim_types (
    pk_type_id TEXT PRIMARY KEY,
    type_name TEXT NOT NULL UNIQUE,
    type_color TEXT,
    type_icon_url TEXT,
    generation_introduced INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dim_type_effectiveness (
    pk_effectiveness_id TEXT PRIMARY KEY,
    fk_attacking_type_id TEXT NOT NULL,
    fk_defending_type_id TEXT NOT NULL,
    effectiveness_multiplier REAL NOT NULL,
    effectiveness_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fk_attacking_type_id) REFERENCES dim_types(pk_type_id),
    FOREIGN KEY (fk_defending_type_id) REFERENCES dim_types(pk_type_id)
);

CREATE TABLE dim_moves (
    pk_move_id TEXT PRIMARY KEY,
    move_name TEXT NOT NULL,
    move_category TEXT CHECK (move_category IN ('fast', 'charged')),
    fk_move_type_id TEXT NOT NULL,
    power INTEGER,
    energy_cost INTEGER,
    energy_gain INTEGER,
    cooldown REAL,
    is_legacy BOOLEAN DEFAULT FALSE,
    is_elite_tm_only BOOLEAN DEFAULT FALSE,
    pvp_power INTEGER,
    pve_power INTEGER,
    added_date DATE,
    removed_date DATE,
    status TEXT CHECK (status IN ('active', 'legacy', 'deprecated')) DEFAULT 'active',
    status_changed_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fk_move_type_id) REFERENCES dim_types(pk_type_id)
);

CREATE TABLE dim_movesets (
    pk_moveset_id TEXT PRIMARY KEY,
    fk_fast_move_id TEXT NOT NULL,
    fk_charged_move_1_id TEXT NOT NULL,
    fk_charged_move_2_id TEXT,
    moveset_name TEXT NOT NULL,
    moveset_hash TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fk_fast_move_id) REFERENCES dim_moves(pk_move_id),
    FOREIGN KEY (fk_charged_move_1_id) REFERENCES dim_moves(pk_move_id),
    FOREIGN KEY (fk_charged_move_2_id) REFERENCES dim_moves(pk_move_id)
);

CREATE TABLE dim_leagues (
    pk_league_id TEXT PRIMARY KEY,
    league_name TEXT NOT NULL,
    cp_limit INTEGER,
    league_category TEXT CHECK (league_category IN ('pvp', 'pve', 'special')),
    is_active BOOLEAN DEFAULT TRUE,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dim_battle_scenarios (
    pk_scenario_id TEXT PRIMARY KEY,
    scenario_name TEXT NOT NULL,
    scenario_description TEXT,
    scenario_category TEXT CHECK (scenario_category IN ('pvp', 'pve')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dim_pve_scenarios (
    pk_pve_scenario_id TEXT PRIMARY KEY,
    scenario_name TEXT NOT NULL,
    scenario_description TEXT,
    boss_tier INTEGER,
    time_limit INTEGER,
    team_size INTEGER,
    revive_allowed BOOLEAN DEFAULT TRUE,
    dodge_factor REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dim_date (
    pk_date_id TEXT PRIMARY KEY,
    full_date DATE NOT NULL UNIQUE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    day INTEGER NOT NULL,
    quarter INTEGER NOT NULL,
    is_weekend BOOLEAN DEFAULT FALSE,
    season TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optional: User management tables (for PokeGenie collections)
CREATE TABLE dim_user_collections (
    pk_collection_id TEXT PRIMARY KEY,
    collection_name TEXT NOT NULL,
    collection_type TEXT CHECK (collection_type IN ('main', 'alt', 'living_dex', 'pvp_focused')),
    is_primary BOOLEAN DEFAULT FALSE,
    created_date DATE,
    last_updated DATE,
    pokemon_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- BRIDGE TABLES (Many-to-Many Relationships)
-- ============================================================

CREATE TABLE bridge_pokemon_available_moves (
    fk_pokemon_id TEXT NOT NULL,
    fk_move_id TEXT NOT NULL,
    learn_method TEXT CHECK (learn_method IN ('normal', 'legacy', 'elite_tm', 'special', 'community_day')),
    availability_start_date DATE,
    availability_end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (fk_pokemon_id, fk_move_id),
    FOREIGN KEY (fk_pokemon_id) REFERENCES fact_pokemon(pk_pokemon_id),
    FOREIGN KEY (fk_move_id) REFERENCES dim_moves(pk_move_id)
);

CREATE TABLE bridge_pokemon_optimal_movesets (
    fk_pokemon_id TEXT NOT NULL,
    fk_moveset_id TEXT NOT NULL,
    fk_league_id TEXT NOT NULL,
    optimization_type TEXT CHECK (optimization_type IN ('pvp', 'pve', 'raid', 'gym')),
    rank_position INTEGER,
    last_updated DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (fk_pokemon_id, fk_moveset_id, fk_league_id, optimization_type),
    FOREIGN KEY (fk_pokemon_id) REFERENCES fact_pokemon(pk_pokemon_id),
    FOREIGN KEY (fk_moveset_id) REFERENCES dim_movesets(pk_moveset_id),
    FOREIGN KEY (fk_league_id) REFERENCES dim_leagues(pk_league_id)
);

-- ============================================================
-- DATA UPDATE TRACKING TABLES
-- ============================================================

CREATE TABLE dim_data_sources (
    pk_source_id TEXT PRIMARY KEY,
    source_name TEXT NOT NULL,
    source_type TEXT CHECK (source_type IN ('rankings', 'gamemaster', 'tiers', 'moves')),
    repository_url TEXT,
    api_endpoint TEXT,
    last_check_timestamp TIMESTAMP,
    last_update_timestamp TIMESTAMP,
    update_frequency INTEGER, -- hours between checks
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fact_data_updates (
    pk_update_id TEXT PRIMARY KEY,
    fk_source_id TEXT NOT NULL,
    fk_date_id TEXT NOT NULL,
    update_type TEXT CHECK (update_type IN ('pokemon', 'moves', 'rankings', 'tiers', 'gamemaster')),
    records_added INTEGER DEFAULT 0,
    records_modified INTEGER DEFAULT 0,
    records_deprecated INTEGER DEFAULT 0,
    update_status TEXT CHECK (update_status IN ('pending', 'in_progress', 'completed', 'failed')),
    error_message TEXT,
    processing_duration INTEGER, -- seconds
    git_commit_hash TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fk_source_id) REFERENCES dim_data_sources(pk_source_id),
    FOREIGN KEY (fk_date_id) REFERENCES dim_date(pk_date_id)
);

CREATE TABLE fact_data_changes (
    pk_change_id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    change_type TEXT CHECK (change_type IN ('INSERT', 'UPDATE', 'DELETE', 'DEPRECATE')),
    old_values TEXT, -- JSON string
    new_values TEXT, -- JSON string
    change_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_reason TEXT,
    game_update_version TEXT
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Core Pokemon lookups
CREATE INDEX idx_pokemon_number ON fact_pokemon(pokemon_number);
CREATE INDEX idx_pokemon_name ON fact_pokemon(pokemon_name);
CREATE INDEX idx_pokemon_type ON fact_pokemon(fk_primary_type_id, fk_secondary_type_id);
CREATE INDEX idx_pokemon_family ON fact_pokemon(fk_pokemon_family_id);

-- PvP Rankings
CREATE INDEX idx_pvp_pokemon_league ON fact_pokemon_pvp_rankings(fk_pokemon_id, fk_league_id);
CREATE INDEX idx_pvp_current ON fact_pokemon_pvp_rankings(is_current, fk_date_id);
CREATE INDEX idx_pvp_rank ON fact_pokemon_pvp_rankings(pvp_rank_percent, fk_league_id);

-- PvE Tiers
CREATE INDEX idx_pve_pokemon_type ON fact_pokemon_pve_tiers(fk_pokemon_id, fk_attacking_type_id, fk_defending_type_id);
CREATE INDEX idx_pve_tier_rank ON fact_pokemon_pve_tiers(tier_rank, fk_defending_type_id);
CREATE INDEX idx_pve_current ON fact_pokemon_pve_tiers(is_current, fk_date_id);

-- Movesets
CREATE INDEX idx_moveset_pokemon ON bridge_pokemon_available_moves(fk_pokemon_id);
CREATE INDEX idx_moveset_move ON bridge_pokemon_available_moves(fk_move_id);
CREATE INDEX idx_optimal_movesets ON bridge_pokemon_optimal_movesets(fk_pokemon_id, fk_league_id, optimization_type);

-- User Collections (optional)
CREATE INDEX idx_user_collection ON fact_user_pokemon_collection(fk_collection_id);
CREATE INDEX idx_user_pokemon ON fact_user_pokemon_collection(fk_pokemon_id);

-- Type effectiveness
CREATE INDEX idx_type_effectiveness ON dim_type_effectiveness(fk_attacking_type_id, fk_defending_type_id);

-- Evolutions
CREATE INDEX idx_evolution_from ON dim_pokemon_evolutions(fk_from_pokemon_id);
CREATE INDEX idx_evolution_to ON dim_pokemon_evolutions(fk_to_pokemon_id);
CREATE INDEX idx_evolution_family ON dim_pokemon_evolutions(fk_family_id);

-- ============================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================

-- Current Pokemon with full details
CREATE VIEW view_current_pokemon AS
SELECT 
    p.pk_pokemon_id,
    p.pokemon_number,
    p.pokemon_name,
    p.form,
    p.base_attack,
    p.base_defense,
    p.base_stamina,
    p.max_cp,
    p.generation,
    p.is_legendary,
    p.is_mythical,
    t1.type_name as primary_type,
    t2.type_name as secondary_type,
    f.family_name,
    f.candy_type
FROM fact_pokemon p
LEFT JOIN dim_types t1 ON p.fk_primary_type_id = t1.pk_type_id
LEFT JOIN dim_types t2 ON p.fk_secondary_type_id = t2.pk_type_id
LEFT JOIN dim_pokemon_families f ON p.fk_pokemon_family_id = f.pk_family_id
WHERE p.is_active = TRUE;

-- Current PvP Rankings
CREATE VIEW view_current_pvp_rankings AS
SELECT 
    r.fk_pokemon_id,
    p.pokemon_name,
    p.form,
    l.league_name,
    s.scenario_name,
    r.pvp_rank_percent,
    r.pvp_rank_number,
    r.pvp_score,
    ms.moveset_name
FROM fact_pokemon_pvp_rankings r
JOIN fact_pokemon p ON r.fk_pokemon_id = p.pk_pokemon_id
JOIN dim_leagues l ON r.fk_league_id = l.pk_league_id
JOIN dim_battle_scenarios s ON r.fk_scenario_id = s.pk_scenario_id
JOIN dim_movesets ms ON r.fk_moveset_id = ms.pk_moveset_id
WHERE r.is_current = TRUE;

-- Current PvE Tiers
CREATE VIEW view_current_pve_tiers AS
SELECT 
    t.fk_pokemon_id,
    p.pokemon_name,
    p.form,
    at.type_name as attacking_type,
    dt.type_name as defending_type,
    t.tier_rank,
    t.tier_score,
    t.effectiveness_rating
FROM fact_pokemon_pve_tiers t
JOIN fact_pokemon p ON t.fk_pokemon_id = p.pk_pokemon_id
JOIN dim_types at ON t.fk_attacking_type_id = at.pk_type_id
JOIN dim_types dt ON t.fk_defending_type_id = dt.pk_type_id
WHERE t.is_current = TRUE; 