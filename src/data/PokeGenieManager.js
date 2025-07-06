/**
 * PokeGenieManager - Handles PokeGenie CSV imports and user collection management
 * Provides filtered views of Pokemon database based on user's actual collection
 */

class PokeGenieManager {
    constructor(database) {
        this.db = database;
        this.collections = new Map();
        this.activeCollectionId = null;
        this.storageKey = 'pokegenie_collections';
    }

    /**
     * Initialize the PokeGenie manager
     */
    async initialize() {
        console.log('Initializing PokeGenie Manager...');
        
        // Load existing collections from localStorage
        await this.loadCollections();
        
        console.log('PokeGenie Manager initialized successfully');
    }

    /**
     * Load collections from localStorage
     */
    async loadCollections() {
        try {
            const savedCollections = localStorage.getItem(this.storageKey);
            if (savedCollections) {
                const collectionsData = JSON.parse(savedCollections);
                
                // Restore collections to database
                for (const collection of collectionsData) {
                    await this.restoreCollection(collection);
                    this.collections.set(collection.id, collection);
                }
                
                console.log(`Loaded ${collectionsData.length} collections from localStorage`);
            }
        } catch (error) {
            console.error('Error loading collections:', error);
        }
    }

    /**
     * Save collections to localStorage
     */
    saveCollections() {
        try {
            const collectionsArray = Array.from(this.collections.values());
            localStorage.setItem(this.storageKey, JSON.stringify(collectionsArray));
            console.log('Collections saved to localStorage');
        } catch (error) {
            console.error('Error saving collections:', error);
        }
    }

    /**
     * Parse and import PokeGenie CSV file
     */
    async importCSV(file, collectionName = 'My Collection') {
        console.log(`Importing PokeGenie CSV: ${file.name}`);
        
        try {
            // Parse CSV file
            const csvText = await this.readFile(file);
            const pokemonData = this.parseCSV(csvText);
            
            // Create collection
            const collection = {
                id: this.generateCollectionId(),
                name: collectionName,
                fileName: file.name,
                importDate: new Date().toISOString(),
                pokemonCount: pokemonData.length,
                lastUpdated: new Date().toISOString()
            };
            
            // Store in database
            await this.storeCollection(collection, pokemonData);
            
            // Store in memory
            this.collections.set(collection.id, collection);
            
            // Set as active collection
            this.activeCollectionId = collection.id;
            
            // Save to localStorage
            this.saveCollections();
            
            console.log(`Successfully imported ${pokemonData.length} Pokemon to collection "${collectionName}"`);
            
            return {
                success: true,
                collection: collection,
                pokemonCount: pokemonData.length
            };
            
        } catch (error) {
            console.error('Error importing CSV:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Parse CSV text into Pokemon data
     */
    parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const pokemon = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = this.parseCSVLine(line);
            if (values.length < headers.length) continue;
            
            const pokemonData = {};
            headers.forEach((header, index) => {
                pokemonData[header] = values[index] || '';
            });
            
            // Convert to our format
            const convertedPokemon = this.convertPokeGenieToPokemon(pokemonData);
            if (convertedPokemon) {
                pokemon.push(convertedPokemon);
            }
        }
        
        return pokemon;
    }

    /**
     * Parse a single CSV line (handles commas within quotes)
     */
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim());
        return values;
    }

    /**
     * Convert PokeGenie format to our database format
     */
    convertPokeGenieToPokemon(pokegenieData) {
        try {
            // Map PokeGenie fields to our format
            const pokemon = {
                index: pokegenieData.Index,
                name: pokegenieData.Name,
                form: pokegenieData.Form || 'Normal',
                pokemonNumber: parseInt(pokegenieData['Pokemon Number']) || 0,
                gender: pokegenieData.Gender,
                cp: parseInt(pokegenieData.CP) || 0,
                hp: parseInt(pokegenieData.HP) || 0,
                atkIV: parseInt(pokegenieData['Atk IV']) || 0,
                defIV: parseInt(pokegenieData['Def IV']) || 0,
                staIV: parseInt(pokegenieData['Sta IV']) || 0,
                ivAvg: parseFloat(pokegenieData['IV Avg']) || 0,
                levelMin: parseFloat(pokegenieData['Level Min']) || 0,
                levelMax: parseFloat(pokegenieData['Level Max']) || 0,
                quickMove: pokegenieData['Quick Move'],
                chargeMove: pokegenieData['Charge Move'],
                chargeMove2: pokegenieData['Charge Move 2'],
                scanDate: pokegenieData['Scan Date'],
                originalScanDate: pokegenieData['Original Scan Date'],
                catchDate: pokegenieData['Catch Date'],
                weight: parseFloat(pokegenieData.Weight) || 0,
                height: parseFloat(pokegenieData.Height) || 0,
                isLucky: pokegenieData.Lucky === 'TRUE',
                shadowPurified: pokegenieData['Shadow/Purified'],
                isFavorite: pokegenieData.Favorite === 'TRUE',
                dust: parseInt(pokegenieData.Dust) || 0,
                // Great League data
                greatLeagueRankPercent: parseFloat(pokegenieData['Rank % (G)']) || null,
                greatLeagueRankNumber: parseInt(pokegenieData['Rank # (G)']) || null,
                greatLeagueStatProd: parseFloat(pokegenieData['Stat Prod (G)']) || null,
                greatLeagueDustCost: parseInt(pokegenieData['Dust Cost (G)']) || null,
                greatLeagueCandyCost: parseInt(pokegenieData['Candy Cost (G)']) || null,
                // Ultra League data
                ultraLeagueRankPercent: parseFloat(pokegenieData['Rank % (U)']) || null,
                ultraLeagueRankNumber: parseInt(pokegenieData['Rank # (U)']) || null,
                ultraLeagueStatProd: parseFloat(pokegenieData['Stat Prod (U)']) || null,
                ultraLeagueDustCost: parseInt(pokegenieData['Dust Cost (U)']) || null,
                ultraLeagueCandyCost: parseInt(pokegenieData['Candy Cost (U)']) || null,
                // Little League data
                littleLeagueRankPercent: parseFloat(pokegenieData['Rank % (L)']) || null,
                littleLeagueRankNumber: parseInt(pokegenieData['Rank # (L)']) || null,
                littleLeagueStatProd: parseFloat(pokegenieData['Stat Prod (L)']) || null,
                littleLeagueDustCost: parseInt(pokegenieData['Dust Cost (L)']) || null,
                littleLeagueCandyCost: parseInt(pokegenieData['Candy Cost (L)']) || null,
                // Other fields
                markedForPvP: pokegenieData['Marked for PvP use'] === 'TRUE'
            };
            
            // Determine shadow/purified status
            pokemon.isShadow = pokemon.shadowPurified === 'Shadow';
            pokemon.isPurified = pokemon.shadowPurified === 'Purified';
            
            return pokemon;
        } catch (error) {
            console.error('Error converting PokeGenie data:', error, pokegenieData);
            return null;
        }
    }

    /**
     * Store collection in database
     */
    async storeCollection(collection, pokemonData) {
        const batchId = this.generateBatchId();
        
        try {
            // Insert collection metadata
            await this.db.run(`
                INSERT INTO dim_user_collections (
                    pk_collection_id, collection_name, collection_type, 
                    is_primary, created_date, last_updated, pokemon_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                collection.id,
                collection.name,
                'main',
                true,
                collection.importDate.split('T')[0],
                collection.lastUpdated.split('T')[0],
                collection.pokemonCount
            ]);
            
            // Insert Pokemon data
            for (const pokemon of pokemonData) {
                await this.insertUserPokemon(collection.id, pokemon, batchId);
            }
            
            console.log(`Stored ${pokemonData.length} Pokemon in database`);
            
        } catch (error) {
            console.error('Error storing collection:', error);
            throw error;
        }
    }

    /**
     * Insert a single user Pokemon
     */
    async insertUserPokemon(collectionId, pokemon, batchId) {
        try {
            // Find matching Pokemon in database
            const dbPokemon = await this.db.get(`
                SELECT pk_pokemon_id FROM fact_pokemon 
                WHERE pokemon_number = ? AND (form = ? OR form = 'Normal')
                ORDER BY form = ? DESC
                LIMIT 1
            `, [pokemon.pokemonNumber, pokemon.form, pokemon.form]);
            
            if (!dbPokemon) {
                console.warn(`Pokemon not found in database: ${pokemon.name} (${pokemon.pokemonNumber})`);
                return;
            }
            
            // Find or create moveset
            let movesetId = null;
            if (pokemon.quickMove && pokemon.chargeMove) {
                movesetId = await this.findOrCreateMoveset(
                    pokemon.quickMove, 
                    pokemon.chargeMove, 
                    pokemon.chargeMove2
                );
            }
            
            // Insert user Pokemon
            await this.db.run(`
                INSERT INTO fact_user_pokemon_collection (
                    pk_user_pokemon_id, fk_pokemon_id, fk_collection_id, fk_moveset_id,
                    cp, hp, atk_iv, def_iv, sta_iv, iv_avg, level_min, level_max,
                    is_lucky, is_shadow, is_purified, is_favorite,
                    dust_cost, candy_cost, great_league_rank_percent, 
                    ultra_league_rank_percent, little_league_rank_percent,
                    catch_date, weight, height, import_batch_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                this.generateUserPokemonId(),
                dbPokemon.pk_pokemon_id,
                collectionId,
                movesetId,
                pokemon.cp,
                pokemon.hp,
                pokemon.atkIV,
                pokemon.defIV,
                pokemon.staIV,
                pokemon.ivAvg,
                pokemon.levelMin,
                pokemon.levelMax,
                pokemon.isLucky,
                pokemon.isShadow,
                pokemon.isPurified,
                pokemon.isFavorite,
                pokemon.dust,
                0, // candy_cost not in PokeGenie
                pokemon.greatLeagueRankPercent,
                pokemon.ultraLeagueRankPercent,
                pokemon.littleLeagueRankPercent,
                pokemon.catchDate || null,
                pokemon.weight,
                pokemon.height,
                batchId
            ]);
            
        } catch (error) {
            console.error('Error inserting user Pokemon:', error, pokemon);
        }
    }

    /**
     * Find or create a moveset
     */
    async findOrCreateMoveset(quickMove, chargeMove1, chargeMove2) {
        try {
            // Find moves in database
            const fastMove = await this.db.get(
                'SELECT pk_move_id FROM dim_moves WHERE move_name = ? AND move_category = "fast"',
                [quickMove]
            );
            
            const chargedMove1 = await this.db.get(
                'SELECT pk_move_id FROM dim_moves WHERE move_name = ? AND move_category = "charged"',
                [chargeMove1]
            );
            
            let chargedMove2 = null;
            if (chargeMove2) {
                chargedMove2 = await this.db.get(
                    'SELECT pk_move_id FROM dim_moves WHERE move_name = ? AND move_category = "charged"',
                    [chargeMove2]
                );
            }
            
            if (!fastMove || !chargedMove1) {
                console.warn(`Moves not found: ${quickMove}, ${chargeMove1}, ${chargeMove2}`);
                return null;
            }
            
            // Check if moveset already exists
            const existingMoveset = await this.db.get(`
                SELECT pk_moveset_id FROM dim_movesets 
                WHERE fk_fast_move_id = ? AND fk_charged_move_1_id = ? 
                AND (fk_charged_move_2_id = ? OR (fk_charged_move_2_id IS NULL AND ? IS NULL))
            `, [fastMove.pk_move_id, chargedMove1.pk_move_id, chargedMove2?.pk_move_id, chargedMove2?.pk_move_id]);
            
            if (existingMoveset) {
                return existingMoveset.pk_moveset_id;
            }
            
            // Create new moveset
            const movesetId = this.generateMovesetId();
            const movesetName = `${quickMove} + ${chargeMove1}${chargeMove2 ? ' + ' + chargeMove2 : ''}`;
            
            await this.db.run(`
                INSERT INTO dim_movesets (
                    pk_moveset_id, fk_fast_move_id, fk_charged_move_1_id, 
                    fk_charged_move_2_id, moveset_name, moveset_hash
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                movesetId,
                fastMove.pk_move_id,
                chargedMove1.pk_move_id,
                chargedMove2?.pk_move_id,
                movesetName,
                this.generateMovesetHash(fastMove.pk_move_id, chargedMove1.pk_move_id, chargedMove2?.pk_move_id)
            ]);
            
            return movesetId;
            
        } catch (error) {
            console.error('Error finding/creating moveset:', error);
            return null;
        }
    }

    /**
     * Get user's Pokemon collection
     */
    async getUserPokemon(collectionId = null, filters = {}) {
        const targetCollection = collectionId || this.activeCollectionId;
        
        if (!targetCollection) {
            return [];
        }
        
        let sql = `
            SELECT 
                upc.pk_user_pokemon_id,
                upc.cp, upc.hp, upc.atk_iv, upc.def_iv, upc.sta_iv, upc.iv_avg,
                upc.is_lucky, upc.is_shadow, upc.is_purified, upc.is_favorite,
                upc.great_league_rank_percent, upc.ultra_league_rank_percent, upc.little_league_rank_percent,
                p.pk_pokemon_id, p.pokemon_number, p.pokemon_name, p.form,
                p.base_attack, p.base_defense, p.base_stamina, p.max_cp,
                p.is_legendary, p.is_mythical,
                t1.type_name as primary_type, t2.type_name as secondary_type,
                ms.moveset_name
            FROM fact_user_pokemon_collection upc
            JOIN fact_pokemon p ON upc.fk_pokemon_id = p.pk_pokemon_id
            LEFT JOIN dim_types t1 ON p.fk_primary_type_id = t1.pk_type_id
            LEFT JOIN dim_types t2 ON p.fk_secondary_type_id = t2.pk_type_id
            LEFT JOIN dim_movesets ms ON upc.fk_moveset_id = ms.pk_moveset_id
            WHERE upc.fk_collection_id = ? AND upc.is_archived = 0
        `;
        
        const params = [targetCollection];
        
        // Add filters
        if (filters.type) {
            sql += ' AND (t1.type_name = ? OR t2.type_name = ?)';
            params.push(filters.type, filters.type);
        }
        
        if (filters.legendary !== undefined) {
            sql += ' AND p.is_legendary = ?';
            params.push(filters.legendary);
        }
        
        if (filters.shiny !== undefined) {
            sql += ' AND upc.is_shadow = ?';
            params.push(filters.shiny);
        }
        
        if (filters.lucky !== undefined) {
            sql += ' AND upc.is_lucky = ?';
            params.push(filters.lucky);
        }
        
        if (filters.minCP) {
            sql += ' AND upc.cp >= ?';
            params.push(filters.minCP);
        }
        
        if (filters.minIV) {
            sql += ' AND upc.iv_avg >= ?';
            params.push(filters.minIV);
        }
        
        sql += ' ORDER BY p.pokemon_number ASC, upc.cp DESC';
        
        return await this.db.all(sql, params);
    }

    /**
     * Get user's best Pokemon for a specific league
     */
    async getUserBestForLeague(league, limit = 50) {
        const targetCollection = this.activeCollectionId;
        
        if (!targetCollection) {
            return [];
        }
        
        const rankField = league === 'great' ? 'great_league_rank_percent' :
                        league === 'ultra' ? 'ultra_league_rank_percent' :
                        'little_league_rank_percent';
        
        const sql = `
            SELECT 
                upc.pk_user_pokemon_id,
                upc.cp, upc.hp, upc.atk_iv, upc.def_iv, upc.sta_iv, upc.iv_avg,
                upc.${rankField} as league_rank_percent,
                upc.is_lucky, upc.is_shadow, upc.is_purified, upc.is_favorite,
                p.pk_pokemon_id, p.pokemon_number, p.pokemon_name, p.form,
                p.base_attack, p.base_defense, p.base_stamina,
                p.is_legendary, p.is_mythical,
                t1.type_name as primary_type, t2.type_name as secondary_type,
                ms.moveset_name
            FROM fact_user_pokemon_collection upc
            JOIN fact_pokemon p ON upc.fk_pokemon_id = p.pk_pokemon_id
            LEFT JOIN dim_types t1 ON p.fk_primary_type_id = t1.pk_type_id
            LEFT JOIN dim_types t2 ON p.fk_secondary_type_id = t2.pk_type_id
            LEFT JOIN dim_movesets ms ON upc.fk_moveset_id = ms.pk_moveset_id
            WHERE upc.fk_collection_id = ? AND upc.is_archived = 0
            AND upc.${rankField} IS NOT NULL
            ORDER BY upc.${rankField} DESC
            LIMIT ?
        `;
        
        return await this.db.all(sql, [targetCollection, limit]);
    }

    /**
     * Get collection statistics
     */
    async getCollectionStats(collectionId = null) {
        const targetCollection = collectionId || this.activeCollectionId;
        
        if (!targetCollection) {
            return null;
        }
        
        const stats = {};
        
        // Total Pokemon
        const totalResult = await this.db.get(`
            SELECT COUNT(*) as count FROM fact_user_pokemon_collection 
            WHERE fk_collection_id = ? AND is_archived = 0
        `, [targetCollection]);
        stats.totalPokemon = totalResult.count;
        
        // By type
        const typeResult = await this.db.all(`
            SELECT t1.type_name as type, COUNT(*) as count
            FROM fact_user_pokemon_collection upc
            JOIN fact_pokemon p ON upc.fk_pokemon_id = p.pk_pokemon_id
            JOIN dim_types t1 ON p.fk_primary_type_id = t1.pk_type_id
            WHERE upc.fk_collection_id = ? AND upc.is_archived = 0
            GROUP BY t1.type_name
            ORDER BY count DESC
        `, [targetCollection]);
        stats.byType = typeResult;
        
        // Special categories
        const specialResult = await this.db.get(`
            SELECT 
                COUNT(CASE WHEN upc.is_lucky = 1 THEN 1 END) as lucky_count,
                COUNT(CASE WHEN upc.is_shadow = 1 THEN 1 END) as shadow_count,
                COUNT(CASE WHEN upc.is_purified = 1 THEN 1 END) as purified_count,
                COUNT(CASE WHEN p.is_legendary = 1 THEN 1 END) as legendary_count,
                COUNT(CASE WHEN p.is_mythical = 1 THEN 1 END) as mythical_count,
                COUNT(CASE WHEN upc.iv_avg >= 90 THEN 1 END) as high_iv_count,
                AVG(upc.iv_avg) as avg_iv
            FROM fact_user_pokemon_collection upc
            JOIN fact_pokemon p ON upc.fk_pokemon_id = p.pk_pokemon_id
            WHERE upc.fk_collection_id = ? AND upc.is_archived = 0
        `, [targetCollection]);
        stats.special = specialResult;
        
        return stats;
    }

    /**
     * Delete a collection
     */
    async deleteCollection(collectionId) {
        try {
            // Delete from database
            await this.db.run('DELETE FROM fact_user_pokemon_collection WHERE fk_collection_id = ?', [collectionId]);
            await this.db.run('DELETE FROM dim_user_collections WHERE pk_collection_id = ?', [collectionId]);
            
            // Remove from memory
            this.collections.delete(collectionId);
            
            // Clear active collection if deleted
            if (this.activeCollectionId === collectionId) {
                this.activeCollectionId = null;
            }
            
            // Save to localStorage
            this.saveCollections();
            
            console.log(`Collection ${collectionId} deleted successfully`);
            
        } catch (error) {
            console.error('Error deleting collection:', error);
            throw error;
        }
    }

    /**
     * Set active collection
     */
    setActiveCollection(collectionId) {
        if (this.collections.has(collectionId)) {
            this.activeCollectionId = collectionId;
            console.log(`Active collection set to: ${collectionId}`);
        } else {
            console.error(`Collection not found: ${collectionId}`);
        }
    }

    /**
     * Get all collections
     */
    getCollections() {
        return Array.from(this.collections.values());
    }

    /**
     * Get active collection
     */
    getActiveCollection() {
        return this.activeCollectionId ? this.collections.get(this.activeCollectionId) : null;
    }

    /**
     * Restore collection from localStorage to database
     */
    async restoreCollection(collection) {
        try {
            // Check if collection already exists in database
            const existing = await this.db.get(
                'SELECT pk_collection_id FROM dim_user_collections WHERE pk_collection_id = ?',
                [collection.id]
            );
            
            if (!existing) {
                await this.db.run(`
                    INSERT INTO dim_user_collections (
                        pk_collection_id, collection_name, collection_type, 
                        is_primary, created_date, last_updated, pokemon_count
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    collection.id,
                    collection.name,
                    'main',
                    true,
                    collection.importDate.split('T')[0],
                    collection.lastUpdated.split('T')[0],
                    collection.pokemonCount
                ]);
            }
        } catch (error) {
            console.error('Error restoring collection:', error);
        }
    }

    /**
     * Utility functions
     */
    
    generateCollectionId() {
        return `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    generateBatchId() {
        return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    generateUserPokemonId() {
        return `user_pkm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    generateMovesetId() {
        return `moveset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    generateMovesetHash(fastMoveId, chargedMove1Id, chargedMove2Id) {
        return `${fastMoveId}_${chargedMove1Id}_${chargedMove2Id || 'null'}`;
    }
    
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
}

export default PokeGenieManager; 