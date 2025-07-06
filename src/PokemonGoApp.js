/**
 * PokemonGoApp - Main application manager
 * Orchestrates LocalDatabase, DataUpdateManager, and PokeGenieManager
 * Provides unified interface for Pokemon GO comprehensive database app
 */

import LocalDatabase from './data/LocalDatabase.js';
import DataUpdateManager from './data/DataUpdateManager.js';
import PokeGenieManager from './data/PokeGenieManager.js';

class PokemonGoApp {
    constructor() {
        this.db = null;
        this.dataUpdateManager = null;
        this.pokeGenieManager = null;
        this.isInitialized = false;
        this.callbacks = {
            onInitialized: [],
            onDataUpdated: [],
            onError: []
        };
    }

    /**
     * Initialize the entire application
     */
    async initialize() {
        console.log('Initializing Pokemon GO App...');
        
        try {
            // Initialize database
            this.db = new LocalDatabase();
            await this.db.initialize();
            
            // Initialize data update manager
            this.dataUpdateManager = new DataUpdateManager(this.db);
            await this.dataUpdateManager.initialize();
            
            // Initialize PokeGenie manager
            this.pokeGenieManager = new PokeGenieManager(this.db);
            await this.pokeGenieManager.initialize();
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('Pokemon GO App initialized successfully');
            
            // Trigger callbacks
            this.triggerCallbacks('onInitialized');
            
        } catch (error) {
            console.error('Error initializing app:', error);
            this.triggerCallbacks('onError', error);
            throw error;
        }
    }

    /**
     * Set up event listeners between components
     */
    setupEventListeners() {
        // Data update events
        this.dataUpdateManager.on('onUpdateComplete', (updateTask) => {
            console.log(`Data update completed: ${updateTask.source.name}`);
            this.triggerCallbacks('onDataUpdated', updateTask);
        });

        this.dataUpdateManager.on('onUpdateError', (updateTask) => {
            console.error(`Data update failed: ${updateTask.source.name}`, updateTask.error);
            this.triggerCallbacks('onError', updateTask.error);
        });
    }

    /**
     * PRIMARY FEATURE: Search Pokemon (works without user collection)
     */
    async searchPokemon(query, filters = {}) {
        if (!this.isInitialized) {
            throw new Error('App not initialized');
        }
        
        return await this.db.searchPokemon(query, filters);
    }

    /**
     * PRIMARY FEATURE: Get Pokemon details with all rankings and tiers
     */
    async getPokemonDetails(pokemonId) {
        if (!this.isInitialized) {
            throw new Error('App not initialized');
        }
        
        try {
            // Get basic Pokemon info
            const pokemon = await this.db.get(`
                SELECT 
                    p.pk_pokemon_id, p.pokemon_number, p.pokemon_name, p.form,
                    p.base_attack, p.base_defense, p.base_stamina, p.max_cp,
                    p.generation, p.is_legendary, p.is_mythical,
                    t1.type_name as primary_type, t2.type_name as secondary_type,
                    f.family_name, f.candy_type
                FROM fact_pokemon p
                LEFT JOIN dim_types t1 ON p.fk_primary_type_id = t1.pk_type_id
                LEFT JOIN dim_types t2 ON p.fk_secondary_type_id = t2.pk_type_id
                LEFT JOIN dim_pokemon_families f ON p.fk_pokemon_family_id = f.pk_family_id
                WHERE p.pk_pokemon_id = ?
            `, [pokemonId]);
            
            if (!pokemon) {
                throw new Error('Pokemon not found');
            }
            
            // Get PvP rankings
            const pvpRankings = await this.db.getPokemonPvPRankings(pokemonId);
            
            // Get PvE tiers
            const pveTiers = await this.db.getPokemonPvETiers(pokemonId);
            
            // Get available moves
            const moves = await this.db.getPokemonMoves(pokemonId);
            
            // Get evolution chain
            const evolutionChain = await this.db.getPokemonEvolutionChain(pokemonId);
            
            // Get user's copies if collection is active
            let userCopies = [];
            if (this.pokeGenieManager.activeCollectionId) {
                userCopies = await this.pokeGenieManager.getUserPokemon(
                    this.pokeGenieManager.activeCollectionId,
                    { pokemonId: pokemonId }
                );
            }
            
            return {
                pokemon,
                pvpRankings,
                pveTiers,
                moves,
                evolutionChain,
                userCopies
            };
            
        } catch (error) {
            console.error('Error getting Pokemon details:', error);
            throw error;
        }
    }

    /**
     * PRIMARY FEATURE: Get league rankings
     */
    async getLeagueRankings(leagueId, scenario = 'overall', limit = 100) {
        if (!this.isInitialized) {
            throw new Error('App not initialized');
        }
        
        const sql = `
            SELECT 
                r.pk_pvp_ranking_id,
                r.fk_pokemon_id,
                r.pvp_rank_percent,
                r.pvp_rank_number,
                r.pvp_score,
                r.stat_product,
                p.pokemon_name,
                p.form,
                p.pokemon_number,
                t1.type_name as primary_type,
                t2.type_name as secondary_type,
                ms.moveset_name
            FROM fact_pokemon_pvp_rankings r
            JOIN fact_pokemon p ON r.fk_pokemon_id = p.pk_pokemon_id
            LEFT JOIN dim_types t1 ON p.fk_primary_type_id = t1.pk_type_id
            LEFT JOIN dim_types t2 ON p.fk_secondary_type_id = t2.pk_type_id
            JOIN dim_movesets ms ON r.fk_moveset_id = ms.pk_moveset_id
            WHERE r.fk_league_id = ? AND r.fk_scenario_id = ? AND r.is_current = 1
            ORDER BY r.pvp_rank_percent DESC
            LIMIT ?
        `;
        
        return await this.db.all(sql, [leagueId, scenario, limit]);
    }

    /**
     * PRIMARY FEATURE: Get type effectiveness chart
     */
    async getTypeEffectiveness(attackingType = null, defendingType = null) {
        if (!this.isInitialized) {
            throw new Error('App not initialized');
        }
        
        return await this.db.getTypeEffectiveness(attackingType, defendingType);
    }

    /**
     * PRIMARY FEATURE: Get PvE tier list for a defending type
     */
    async getPvETierList(defendingType, limit = 50) {
        if (!this.isInitialized) {
            throw new Error('App not initialized');
        }
        
        const sql = `
            SELECT 
                t.pk_pve_tier_id,
                t.fk_pokemon_id,
                t.tier_rank,
                t.tier_score,
                t.effectiveness_rating,
                p.pokemon_name,
                p.form,
                p.pokemon_number,
                t1.type_name as primary_type,
                t2.type_name as secondary_type,
                dt.type_name as defending_type
            FROM fact_pokemon_pve_tiers t
            JOIN fact_pokemon p ON t.fk_pokemon_id = p.pk_pokemon_id
            LEFT JOIN dim_types t1 ON p.fk_primary_type_id = t1.pk_type_id
            LEFT JOIN dim_types t2 ON p.fk_secondary_type_id = t2.pk_type_id
            JOIN dim_types dt ON t.fk_defending_type_id = dt.pk_type_id
            WHERE dt.type_name = ? AND t.is_current = 1
            ORDER BY t.tier_score DESC
            LIMIT ?
        `;
        
        return await this.db.all(sql, [defendingType, limit]);
    }

    /**
     * SECONDARY FEATURE: Import PokeGenie CSV
     */
    async importPokeGenieCSV(file, collectionName = 'My Collection') {
        if (!this.isInitialized) {
            throw new Error('App not initialized');
        }
        
        return await this.pokeGenieManager.importCSV(file, collectionName);
    }

    /**
     * SECONDARY FEATURE: Get user's Pokemon collection
     */
    async getUserPokemon(filters = {}) {
        if (!this.isInitialized) {
            throw new Error('App not initialized');
        }
        
        return await this.pokeGenieManager.getUserPokemon(null, filters);
    }

    /**
     * SECONDARY FEATURE: Get user's best Pokemon for a league
     */
    async getUserBestForLeague(league, limit = 50) {
        if (!this.isInitialized) {
            throw new Error('App not initialized');
        }
        
        return await this.pokeGenieManager.getUserBestForLeague(league, limit);
    }

    /**
     * SECONDARY FEATURE: Get filtered Pokemon based on user's collection
     */
    async getFilteredPokemon(query, filters = {}) {
        if (!this.isInitialized) {
            throw new Error('App not initialized');
        }
        
        // If no active collection, return regular search
        if (!this.pokeGenieManager.activeCollectionId) {
            return await this.searchPokemon(query, filters);
        }
        
        // Add "user owns" filter
        filters.userOwns = true;
        
        let sql = `
            SELECT DISTINCT
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
                f.candy_type,
                COUNT(upc.pk_user_pokemon_id) as owned_count,
                MAX(upc.iv_avg) as best_iv_avg,
                MAX(upc.cp) as highest_cp
            FROM fact_pokemon p
            LEFT JOIN dim_types t1 ON p.fk_primary_type_id = t1.pk_type_id
            LEFT JOIN dim_types t2 ON p.fk_secondary_type_id = t2.pk_type_id
            LEFT JOIN dim_pokemon_families f ON p.fk_pokemon_family_id = f.pk_family_id
            JOIN fact_user_pokemon_collection upc ON p.pk_pokemon_id = upc.fk_pokemon_id
            WHERE p.is_active = 1 AND upc.fk_collection_id = ? AND upc.is_archived = 0
        `;
        
        const params = [this.pokeGenieManager.activeCollectionId];
        
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
        
        sql += ' GROUP BY p.pk_pokemon_id ORDER BY p.pokemon_number ASC';
        
        if (filters.limit) {
            sql += ' LIMIT ?';
            params.push(filters.limit);
        }
        
        return await this.db.all(sql, params);
    }

    /**
     * Get app statistics
     */
    async getAppStats() {
        if (!this.isInitialized) {
            throw new Error('App not initialized');
        }
        
        const dbStats = await this.db.getStats();
        const collectionStats = this.pokeGenieManager.activeCollectionId ? 
            await this.pokeGenieManager.getCollectionStats() : null;
        
        return {
            database: dbStats,
            collection: collectionStats,
            collections: this.pokeGenieManager.getCollections(),
            activeCollection: this.pokeGenieManager.getActiveCollection()
        };
    }

    /**
     * Get available leagues
     */
    async getLeagues() {
        if (!this.isInitialized) {
            throw new Error('App not initialized');
        }
        
        return await this.db.all(`
            SELECT pk_league_id, league_name, cp_limit, league_category
            FROM dim_leagues 
            WHERE is_active = 1 
            ORDER BY league_category, cp_limit
        `);
    }

    /**
     * Get available types
     */
    async getTypes() {
        if (!this.isInitialized) {
            throw new Error('App not initialized');
        }
        
        return await this.db.all(`
            SELECT pk_type_id, type_name, type_color
            FROM dim_types 
            ORDER BY type_name
        `);
    }

    /**
     * Force data update
     */
    async forceDataUpdate() {
        if (!this.isInitialized) {
            throw new Error('App not initialized');
        }
        
        // Queue updates for all active sources
        for (const source of this.dataUpdateManager.updateSources) {
            if (source.isActive) {
                this.dataUpdateManager.queueUpdate(source);
            }
        }
    }

    /**
     * Export user data
     */
    async exportUserData() {
        if (!this.isInitialized) {
            throw new Error('App not initialized');
        }
        
        const collections = this.pokeGenieManager.getCollections();
        const userData = {
            collections,
            exportDate: new Date().toISOString(),
            appVersion: '1.0.0'
        };
        
        const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `pokemon_go_user_data_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    /**
     * Clear user data
     */
    async clearUserData() {
        if (!this.isInitialized) {
            throw new Error('App not initialized');
        }
        
        // Clear all user collections
        const collections = this.pokeGenieManager.getCollections();
        for (const collection of collections) {
            await this.pokeGenieManager.deleteCollection(collection.id);
        }
        
        console.log('All user data cleared');
    }

    /**
     * Event handling
     */
    on(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event].push(callback);
        }
    }

    triggerCallbacks(event, data = null) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in callback for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Get initialization status
     */
    isReady() {
        return this.isInitialized;
    }
}

// Export singleton instance
const pokemonGoApp = new PokemonGoApp();
export default pokemonGoApp; 