/**
 * LocalDatabase - Manages SQLite database operations in the browser
 * Handles initialization, queries, and data management for Pokemon GO app
 */

import initSqlJs from 'sql.js';

class LocalDatabase {
    constructor() {
        this.db = null;
        this.SQL = null;
        this.isInitialized = false;
        this.dbName = 'pokemon_go_database';
        this.version = '1.0.0';
    }

    /**
     * Initialize the database
     */
    async initialize() {
        console.log('Initializing Local Database...');
        
        try {
            // Initialize SQL.js
            this.SQL = await initSqlJs({
                locateFile: file => `https://sql.js.org/dist/${file}`
            });
            
            // Try to load existing database from localStorage
            const savedDb = localStorage.getItem(this.dbName);
            
            if (savedDb) {
                console.log('Loading existing database from localStorage...');
                const buffer = new Uint8Array(JSON.parse(savedDb));
                this.db = new this.SQL.Database(buffer);
                
                // Verify database version and structure
                await this.verifyDatabaseStructure();
            } else {
                console.log('Creating new database...');
                await this.createNewDatabase();
            }
            
            this.isInitialized = true;
            console.log('Local Database initialized successfully');
            
        } catch (error) {
            console.error('Error initializing database:', error);
            throw error;
        }
    }

    /**
     * Create a new database with schema
     */
    async createNewDatabase() {
        this.db = new this.SQL.Database();
        
        // Load and execute schema
        await this.executeSchema();
        
        // Initialize with basic data
        await this.initializeBasicData();
        
        // Save to localStorage
        this.saveDatabase();
    }

    /**
     * Execute the database schema
     */
    async executeSchema() {
        // Load schema from file (in production, this would be bundled)
        const schemaResponse = await fetch('/database/schema.sql');
        const schemaSQL = await schemaResponse.text();
        
        // Split and execute each statement
        const statements = schemaSQL.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    this.db.run(statement);
                } catch (error) {
                    console.error('Error executing schema statement:', statement, error);
                }
            }
        }
    }

    /**
     * Initialize basic reference data
     */
    async initializeBasicData() {
        console.log('Initializing basic data...');
        
        // Initialize Pokemon types
        await this.initializeTypes();
        
        // Initialize leagues
        await this.initializeLeagues();
        
        // Initialize battle scenarios
        await this.initializeBattleScenarios();
        
        // Initialize PvE scenarios
        await this.initializePvEScenarios();
    }

    /**
     * Initialize Pokemon types
     */
    async initializeTypes() {
        const types = [
            { id: 'normal', name: 'Normal', color: '#A8A878', generation: 1 },
            { id: 'fire', name: 'Fire', color: '#F08030', generation: 1 },
            { id: 'water', name: 'Water', color: '#6890F0', generation: 1 },
            { id: 'electric', name: 'Electric', color: '#F8D030', generation: 1 },
            { id: 'grass', name: 'Grass', color: '#78C850', generation: 1 },
            { id: 'ice', name: 'Ice', color: '#98D8D8', generation: 1 },
            { id: 'fighting', name: 'Fighting', color: '#C03028', generation: 1 },
            { id: 'poison', name: 'Poison', color: '#A040A0', generation: 1 },
            { id: 'ground', name: 'Ground', color: '#E0C068', generation: 1 },
            { id: 'flying', name: 'Flying', color: '#A890F0', generation: 1 },
            { id: 'psychic', name: 'Psychic', color: '#F85888', generation: 1 },
            { id: 'bug', name: 'Bug', color: '#A8B820', generation: 1 },
            { id: 'rock', name: 'Rock', color: '#B8A038', generation: 1 },
            { id: 'ghost', name: 'Ghost', color: '#705898', generation: 1 },
            { id: 'dragon', name: 'Dragon', color: '#7038F8', generation: 1 },
            { id: 'dark', name: 'Dark', color: '#705848', generation: 2 },
            { id: 'steel', name: 'Steel', color: '#B8B8D0', generation: 2 },
            { id: 'fairy', name: 'Fairy', color: '#EE99AC', generation: 6 }
        ];
        
        for (const type of types) {
            await this.run(`
                INSERT INTO dim_types (pk_type_id, type_name, type_color, generation_introduced)
                VALUES (?, ?, ?, ?)
            `, [type.id, type.name, type.color, type.generation]);
        }
    }

    /**
     * Initialize leagues
     */
    async initializeLeagues() {
        const leagues = [
            { id: 'great', name: 'Great League', cpLimit: 1500, category: 'pvp' },
            { id: 'ultra', name: 'Ultra League', cpLimit: 2500, category: 'pvp' },
            { id: 'master', name: 'Master League', cpLimit: null, category: 'pvp' },
            { id: 'little', name: 'Little Cup', cpLimit: 500, category: 'pvp' },
            { id: 'premier_ultra', name: 'Premier Ultra', cpLimit: 2500, category: 'pvp' },
            { id: 'premier_master', name: 'Premier Master', cpLimit: null, category: 'pvp' },
            { id: 'raids', name: 'Raids', cpLimit: null, category: 'pve' },
            { id: 'gyms', name: 'Gyms', cpLimit: null, category: 'pve' }
        ];
        
        for (const league of leagues) {
            await this.run(`
                INSERT INTO dim_leagues (pk_league_id, league_name, cp_limit, league_category, is_active)
                VALUES (?, ?, ?, ?, ?)
            `, [league.id, league.name, league.cpLimit, league.category, true]);
        }
    }

    /**
     * Initialize battle scenarios
     */
    async initializeBattleScenarios() {
        const scenarios = [
            { id: 'leads', name: 'leads', description: 'Opening Pokemon', category: 'pvp' },
            { id: 'closers', name: 'closers', description: 'Finishing Pokemon', category: 'pvp' },
            { id: 'switches', name: 'switches', description: 'Switch Pokemon', category: 'pvp' },
            { id: 'chargers', name: 'chargers', description: 'Charge Move Users', category: 'pvp' },
            { id: 'attackers', name: 'attackers', description: 'Attack Focused', category: 'pvp' },
            { id: 'overall', name: 'overall', description: 'Overall Performance', category: 'pvp' }
        ];
        
        for (const scenario of scenarios) {
            await this.run(`
                INSERT INTO dim_battle_scenarios (pk_scenario_id, scenario_name, scenario_description, scenario_category)
                VALUES (?, ?, ?, ?)
            `, [scenario.id, scenario.name, scenario.description, scenario.category]);
        }
    }

    /**
     * Initialize PvE scenarios
     */
    async initializePvEScenarios() {
        const scenarios = [
            { id: 'raid_t1', name: 'Tier 1 Raids', description: 'Tier 1 Raid Boss', bossT: 1, timeLimit: 180, teamSize: 6 },
            { id: 'raid_t3', name: 'Tier 3 Raids', description: 'Tier 3 Raid Boss', bossT: 3, timeLimit: 180, teamSize: 6 },
            { id: 'raid_t5', name: 'Tier 5 Raids', description: 'Tier 5 Raid Boss', bossT: 5, timeLimit: 300, teamSize: 6 },
            { id: 'gym_defense', name: 'Gym Defense', description: 'Defending Gyms', bossT: null, timeLimit: null, teamSize: 1 },
            { id: 'gym_attack', name: 'Gym Attack', description: 'Attacking Gyms', bossT: null, timeLimit: 300, teamSize: 6 },
            { id: 'rocket_grunt', name: 'Rocket Grunt', description: 'Team Rocket Grunt', bossT: null, timeLimit: null, teamSize: 3 }
        ];
        
        for (const scenario of scenarios) {
            await this.run(`
                INSERT INTO dim_pve_scenarios (pk_pve_scenario_id, scenario_name, scenario_description, boss_tier, time_limit, team_size)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [scenario.id, scenario.name, scenario.description, scenario.bossT, scenario.timeLimit, scenario.teamSize]);
        }
    }

    /**
     * Verify database structure and version
     */
    async verifyDatabaseStructure() {
        try {
            // Check if core tables exist
            const tables = await this.all(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name LIKE 'fact_%' OR name LIKE 'dim_%'
            `);
            
            const requiredTables = [
                'fact_pokemon', 'fact_pokemon_pvp_rankings', 'fact_pokemon_pve_tiers',
                'dim_types', 'dim_moves', 'dim_leagues'
            ];
            
            const existingTables = tables.map(t => t.name);
            const missingTables = requiredTables.filter(t => !existingTables.includes(t));
            
            if (missingTables.length > 0) {
                console.log('Missing tables detected, recreating database...');
                await this.createNewDatabase();
            }
            
        } catch (error) {
            console.error('Error verifying database structure:', error);
            await this.createNewDatabase();
        }
    }

    /**
     * Save database to localStorage
     */
    saveDatabase() {
        try {
            const data = this.db.export();
            const buffer = Array.from(data);
            localStorage.setItem(this.dbName, JSON.stringify(buffer));
            console.log('Database saved to localStorage');
        } catch (error) {
            console.error('Error saving database:', error);
        }
    }

    /**
     * Execute a SQL query that returns results
     */
    async all(sql, params = []) {
        if (!this.isInitialized) {
            throw new Error('Database not initialized');
        }
        
        try {
            const stmt = this.db.prepare(sql);
            const results = [];
            
            while (stmt.step()) {
                const row = stmt.getAsObject();
                results.push(row);
            }
            
            stmt.free();
            return results;
        } catch (error) {
            console.error('Error executing query:', sql, params, error);
            throw error;
        }
    }

    /**
     * Execute a SQL query that returns a single result
     */
    async get(sql, params = []) {
        const results = await this.all(sql, params);
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Execute a SQL query that doesn't return results
     */
    async run(sql, params = []) {
        if (!this.isInitialized) {
            throw new Error('Database not initialized');
        }
        
        try {
            const stmt = this.db.prepare(sql);
            stmt.run(params);
            stmt.free();
            
            // Auto-save after modifications
            this.saveDatabase();
            
            return { changes: this.db.getRowsModified() };
        } catch (error) {
            console.error('Error executing statement:', sql, params, error);
            throw error;
        }
    }

    /**
     * Execute multiple SQL statements in a transaction
     */
    async transaction(statements) {
        if (!this.isInitialized) {
            throw new Error('Database not initialized');
        }
        
        try {
            this.db.run('BEGIN TRANSACTION');
            
            for (const { sql, params } of statements) {
                await this.run(sql, params);
            }
            
            this.db.run('COMMIT');
            this.saveDatabase();
            
        } catch (error) {
            this.db.run('ROLLBACK');
            console.error('Transaction failed:', error);
            throw error;
        }
    }

    /**
     * Search Pokemon by name, number, or type
     */
    async searchPokemon(query, filters = {}) {
        let sql = `
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
            WHERE p.is_active = 1
        `;
        
        const params = [];
        
        // Add search conditions
        if (query) {
            sql += ' AND (p.pokemon_name LIKE ? OR p.pokemon_number = ?)';
            params.push(`%${query}%`, parseInt(query) || 0);
        }
        
        // Add filters
        if (filters.type) {
            sql += ' AND (t1.type_name = ? OR t2.type_name = ?)';
            params.push(filters.type, filters.type);
        }
        
        if (filters.generation) {
            sql += ' AND p.generation = ?';
            params.push(filters.generation);
        }
        
        if (filters.legendary !== undefined) {
            sql += ' AND p.is_legendary = ?';
            params.push(filters.legendary);
        }
        
        if (filters.mythical !== undefined) {
            sql += ' AND p.is_mythical = ?';
            params.push(filters.mythical);
        }
        
        // Add ordering
        sql += ' ORDER BY p.pokemon_number ASC, p.form ASC';
        
        // Add limit
        if (filters.limit) {
            sql += ' LIMIT ?';
            params.push(filters.limit);
        }
        
        return await this.all(sql, params);
    }

    /**
     * Get Pokemon PvP rankings
     */
    async getPokemonPvPRankings(pokemonId, leagueId = null) {
        let sql = `
            SELECT 
                r.pk_pvp_ranking_id,
                r.fk_pokemon_id,
                l.league_name,
                s.scenario_name,
                r.pvp_rank_percent,
                r.pvp_rank_number,
                r.pvp_score,
                r.stat_product,
                ms.moveset_name,
                ms.pk_moveset_id
            FROM fact_pokemon_pvp_rankings r
            JOIN dim_leagues l ON r.fk_league_id = l.pk_league_id
            JOIN dim_battle_scenarios s ON r.fk_scenario_id = s.pk_scenario_id
            JOIN dim_movesets ms ON r.fk_moveset_id = ms.pk_moveset_id
            WHERE r.fk_pokemon_id = ? AND r.is_current = 1
        `;
        
        const params = [pokemonId];
        
        if (leagueId) {
            sql += ' AND r.fk_league_id = ?';
            params.push(leagueId);
        }
        
        sql += ' ORDER BY r.pvp_rank_percent DESC, l.league_name, s.scenario_name';
        
        return await this.all(sql, params);
    }

    /**
     * Get Pokemon PvE tiers
     */
    async getPokemonPvETiers(pokemonId, defendingType = null) {
        let sql = `
            SELECT 
                t.pk_pve_tier_id,
                t.fk_pokemon_id,
                at.type_name as attacking_type,
                dt.type_name as defending_type,
                t.tier_rank,
                t.tier_score,
                t.effectiveness_rating,
                t.pve_overall_rank
            FROM fact_pokemon_pve_tiers t
            JOIN dim_types at ON t.fk_attacking_type_id = at.pk_type_id
            JOIN dim_types dt ON t.fk_defending_type_id = dt.pk_type_id
            WHERE t.fk_pokemon_id = ? AND t.is_current = 1
        `;
        
        const params = [pokemonId];
        
        if (defendingType) {
            sql += ' AND dt.type_name = ?';
            params.push(defendingType);
        }
        
        sql += ' ORDER BY t.tier_score DESC, dt.type_name';
        
        return await this.all(sql, params);
    }

    /**
     * Get Pokemon evolution chain
     */
    async getPokemonEvolutionChain(pokemonId) {
        const sql = `
            SELECT 
                e.pk_evolution_id,
                e.fk_from_pokemon_id,
                e.fk_to_pokemon_id,
                e.evolution_stage,
                e.candy_cost,
                e.evolution_item,
                e.walking_distance,
                e.special_requirement,
                e.is_mega_evolution,
                pf.pokemon_name as from_name,
                pf.pokemon_number as from_number,
                pt.pokemon_name as to_name,
                pt.pokemon_number as to_number,
                f.family_name,
                f.candy_type
            FROM dim_pokemon_evolutions e
            JOIN fact_pokemon pf ON e.fk_from_pokemon_id = pf.pk_pokemon_id
            JOIN fact_pokemon pt ON e.fk_to_pokemon_id = pt.pk_pokemon_id
            JOIN dim_pokemon_families f ON e.fk_family_id = f.pk_family_id
            WHERE e.fk_from_pokemon_id = ? OR e.fk_to_pokemon_id = ?
            ORDER BY e.evolution_stage ASC
        `;
        
        return await this.all(sql, [pokemonId, pokemonId]);
    }

    /**
     * Get available moves for a Pokemon
     */
    async getPokemonMoves(pokemonId) {
        const sql = `
            SELECT 
                m.pk_move_id,
                m.move_name,
                m.move_category,
                m.power,
                m.energy_cost,
                m.energy_gain,
                m.cooldown,
                m.is_legacy,
                m.is_elite_tm_only,
                m.pvp_power,
                m.pve_power,
                t.type_name as move_type,
                t.type_color,
                bm.learn_method,
                bm.availability_start_date,
                bm.availability_end_date
            FROM bridge_pokemon_available_moves bm
            JOIN dim_moves m ON bm.fk_move_id = m.pk_move_id
            JOIN dim_types t ON m.fk_move_type_id = t.pk_type_id
            WHERE bm.fk_pokemon_id = ?
            ORDER BY m.move_category DESC, m.move_name ASC
        `;
        
        return await this.all(sql, [pokemonId]);
    }

    /**
     * Get type effectiveness chart
     */
    async getTypeEffectiveness(attackingType = null, defendingType = null) {
        let sql = `
            SELECT 
                e.pk_effectiveness_id,
                at.type_name as attacking_type,
                dt.type_name as defending_type,
                e.effectiveness_multiplier,
                e.effectiveness_text
            FROM dim_type_effectiveness e
            JOIN dim_types at ON e.fk_attacking_type_id = at.pk_type_id
            JOIN dim_types dt ON e.fk_defending_type_id = dt.pk_type_id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (attackingType) {
            sql += ' AND at.type_name = ?';
            params.push(attackingType);
        }
        
        if (defendingType) {
            sql += ' AND dt.type_name = ?';
            params.push(defendingType);
        }
        
        sql += ' ORDER BY at.type_name, dt.type_name';
        
        return await this.all(sql, params);
    }

    /**
     * Get database statistics
     */
    async getStats() {
        const stats = {};
        
        // Pokemon count
        const pokemonResult = await this.get('SELECT COUNT(*) as count FROM fact_pokemon WHERE is_active = 1');
        stats.totalPokemon = pokemonResult.count;
        
        // Rankings count
        const rankingsResult = await this.get('SELECT COUNT(*) as count FROM fact_pokemon_pvp_rankings WHERE is_current = 1');
        stats.totalRankings = rankingsResult.count;
        
        // Tiers count
        const tiersResult = await this.get('SELECT COUNT(*) as count FROM fact_pokemon_pve_tiers WHERE is_current = 1');
        stats.totalTiers = tiersResult.count;
        
        // Moves count
        const movesResult = await this.get('SELECT COUNT(*) as count FROM dim_moves WHERE status = "active"');
        stats.totalMoves = movesResult.count;
        
        // User collections count
        const collectionsResult = await this.get('SELECT COUNT(*) as count FROM dim_user_collections');
        stats.totalCollections = collectionsResult.count;
        
        // User Pokemon count
        const userPokemonResult = await this.get('SELECT COUNT(*) as count FROM fact_user_pokemon_collection WHERE is_archived = 0');
        stats.totalUserPokemon = userPokemonResult.count;
        
        // Last update
        const lastUpdateResult = await this.get(`
            SELECT MAX(created_at) as last_update 
            FROM fact_data_updates 
            WHERE update_status = 'completed'
        `);
        stats.lastUpdate = lastUpdateResult.last_update;
        
        return stats;
    }

    /**
     * Clear all data (for testing or reset)
     */
    async clearAllData() {
        const tables = [
            'fact_pokemon_pvp_rankings',
            'fact_pokemon_pve_tiers',
            'fact_pokemon_pve_performance_metrics',
            'fact_user_pokemon_collection',
            'fact_pokemon',
            'dim_pokemon_evolutions',
            'dim_movesets',
            'dim_moves',
            'dim_pokemon_families',
            'bridge_pokemon_available_moves',
            'bridge_pokemon_optimal_movesets',
            'fact_data_updates',
            'fact_data_changes'
        ];
        
        for (const table of tables) {
            await this.run(`DELETE FROM ${table}`);
        }
        
        console.log('All data cleared');
    }

    /**
     * Export database
     */
    exportDatabase() {
        const data = this.db.export();
        const blob = new Blob([data], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `pokemon_database_${new Date().toISOString().split('T')[0]}.db`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    /**
     * Import database
     */
    async importDatabase(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const buffer = new Uint8Array(e.target.result);
                    this.db = new this.SQL.Database(buffer);
                    
                    await this.verifyDatabaseStructure();
                    this.saveDatabase();
                    
                    resolve(true);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }
}

export default LocalDatabase; 