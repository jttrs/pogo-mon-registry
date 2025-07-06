/**
 * DataUpdateManager - Comprehensive data update strategy for Pokemon GO app
 * Handles monitoring and updating data from PvPoke, Dialgadex, and pokemon-resources
 */

class DataUpdateManager {
    constructor(database) {
        this.db = database;
        this.updateSources = [
            {
                id: 'pvpoke-gamemaster',
                name: 'PvPoke GameMaster',
                type: 'gamemaster',
                repositoryUrl: 'https://github.com/pvpoke/pvpoke.git',
                filePath: 'src/data/gamemaster.json',
                checkInterval: 6 * 60 * 60 * 1000, // 6 hours
                lastCheckTime: null,
                lastUpdateTime: null,
                isActive: true
            },
            {
                id: 'pvpoke-rankings',
                name: 'PvPoke Rankings',
                type: 'rankings',
                repositoryUrl: 'https://github.com/pvpoke/pvpoke.git',
                filePath: 'src/data/rankings/',
                checkInterval: 12 * 60 * 60 * 1000, // 12 hours
                lastCheckTime: null,
                lastUpdateTime: null,
                isActive: true
            },
            {
                id: 'pokemon-resources',
                name: 'Pokemon Resources',
                type: 'tiers',
                repositoryUrl: 'https://github.com/mgrann03/pokemon-resources.git',
                filePath: 'pogo_pkm_tiers.json',
                checkInterval: 24 * 60 * 60 * 1000, // 24 hours
                lastCheckTime: null,
                lastUpdateTime: null,
                isActive: true
            },
            {
                id: 'dialgadex-data',
                name: 'Dialgadex Data',
                type: 'tiers',
                repositoryUrl: 'https://github.com/mgrann03/dialgadex.git',
                filePath: 'scripts/',
                checkInterval: 24 * 60 * 60 * 1000, // 24 hours
                lastCheckTime: null,
                lastUpdateTime: null,
                isActive: true
            }
        ];
        
        this.updateQueue = [];
        this.isProcessing = false;
        this.callbacks = {
            onUpdateStart: [],
            onUpdateComplete: [],
            onUpdateError: [],
            onDataChange: []
        };
    }

    /**
     * Initialize the data update system
     */
    async initialize() {
        console.log('Initializing Data Update Manager...');
        
        // Initialize data sources in database
        await this.initializeDataSources();
        
        // Start monitoring
        this.startMonitoring();
        
        // Initial data load if needed
        await this.performInitialDataLoad();
        
        console.log('Data Update Manager initialized successfully');
    }

    /**
     * Initialize data sources in database
     */
    async initializeDataSources() {
        for (const source of this.updateSources) {
            await this.db.run(`
                INSERT OR REPLACE INTO dim_data_sources (
                    pk_source_id, source_name, source_type, repository_url,
                    update_frequency, is_active
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                source.id,
                source.name,
                source.type,
                source.repositoryUrl,
                source.checkInterval / (1000 * 60 * 60), // Convert to hours
                source.isActive
            ]);
        }
    }

    /**
     * Start monitoring all data sources
     */
    startMonitoring() {
        this.updateSources.forEach(source => {
            if (source.isActive) {
                this.scheduleSourceCheck(source);
            }
        });
    }

    /**
     * Schedule a check for a specific data source
     */
    scheduleSourceCheck(source) {
        const checkSource = async () => {
            try {
                await this.checkSourceForUpdates(source);
            } catch (error) {
                console.error(`Error checking source ${source.name}:`, error);
            } finally {
                // Schedule next check
                setTimeout(checkSource, source.checkInterval);
            }
        };

        // Initial check after 1 minute, then regular intervals
        setTimeout(checkSource, 60000);
    }

    /**
     * Check a specific source for updates
     */
    async checkSourceForUpdates(source) {
        console.log(`Checking for updates: ${source.name}`);
        
        source.lastCheckTime = new Date();
        
        try {
            const hasUpdates = await this.detectChanges(source);
            
            if (hasUpdates) {
                console.log(`Updates detected for ${source.name}`);
                this.queueUpdate(source);
            } else {
                console.log(`No updates for ${source.name}`);
            }
            
            // Update last check time in database
            await this.db.run(`
                UPDATE dim_data_sources 
                SET last_check_timestamp = ?
                WHERE pk_source_id = ?
            `, [source.lastCheckTime.toISOString(), source.id]);
            
        } catch (error) {
            console.error(`Error checking source ${source.name}:`, error);
        }
    }

    /**
     * Detect changes in a data source
     */
    async detectChanges(source) {
        try {
            // Get current git commit hash
            const currentHash = await this.getCurrentGitHash(source);
            
            // Get last known hash from database
            const lastHash = await this.getLastKnownHash(source);
            
            // Compare hashes
            const hasChanges = currentHash !== lastHash;
            
            if (hasChanges) {
                console.log(`Hash changed for ${source.name}: ${lastHash} -> ${currentHash}`);
            }
            
            return hasChanges;
            
        } catch (error) {
            console.error(`Error detecting changes for ${source.name}:`, error);
            return false;
        }
    }

    /**
     * Get current git commit hash for a source
     */
    async getCurrentGitHash(source) {
        try {
            // This would use git commands or GitHub API
            // For now, simulate with file modification time
            const response = await fetch(`https://api.github.com/repos/${this.getRepoPath(source.repositoryUrl)}/commits/main`);
            const data = await response.json();
            return data.sha;
        } catch (error) {
            console.error(`Error getting git hash for ${source.name}:`, error);
            return null;
        }
    }

    /**
     * Get last known hash from database
     */
    async getLastKnownHash(source) {
        try {
            const result = await this.db.get(`
                SELECT git_commit_hash 
                FROM fact_data_updates 
                WHERE fk_source_id = ? AND update_status = 'completed'
                ORDER BY created_at DESC 
                LIMIT 1
            `, [source.id]);
            
            return result?.git_commit_hash || null;
        } catch (error) {
            console.error(`Error getting last hash for ${source.name}:`, error);
            return null;
        }
    }

    /**
     * Queue an update for processing
     */
    queueUpdate(source) {
        const updateTask = {
            id: this.generateUpdateId(),
            sourceId: source.id,
            source: source,
            status: 'pending',
            queuedAt: new Date(),
            priority: this.getUpdatePriority(source.type)
        };

        this.updateQueue.push(updateTask);
        this.updateQueue.sort((a, b) => b.priority - a.priority);

        console.log(`Queued update for ${source.name} (Priority: ${updateTask.priority})`);

        // Process queue if not already processing
        if (!this.isProcessing) {
            this.processUpdateQueue();
        }
    }

    /**
     * Process the update queue
     */
    async processUpdateQueue() {
        if (this.isProcessing || this.updateQueue.length === 0) {
            return;
        }

        this.isProcessing = true;
        console.log('Starting update queue processing...');

        while (this.updateQueue.length > 0) {
            const updateTask = this.updateQueue.shift();
            
            try {
                await this.processUpdate(updateTask);
            } catch (error) {
                console.error(`Error processing update for ${updateTask.source.name}:`, error);
                updateTask.status = 'failed';
                updateTask.error = error.message;
                
                // Log error to database
                await this.logUpdateError(updateTask, error);
            }
        }

        this.isProcessing = false;
        console.log('Update queue processing completed');
    }

    /**
     * Process a single update
     */
    async processUpdate(updateTask) {
        console.log(`Processing update: ${updateTask.source.name}`);
        
        updateTask.status = 'in_progress';
        updateTask.startTime = new Date();
        
        // Trigger callbacks
        this.triggerCallbacks('onUpdateStart', updateTask);
        
        // Log update start
        const updateId = await this.logUpdateStart(updateTask);
        updateTask.databaseId = updateId;
        
        try {
            // Perform the actual update based on source type
            let result;
            switch (updateTask.source.type) {
                case 'gamemaster':
                    result = await this.updateGameMaster(updateTask);
                    break;
                case 'rankings':
                    result = await this.updateRankings(updateTask);
                    break;
                case 'tiers':
                    result = await this.updateTiers(updateTask);
                    break;
                default:
                    throw new Error(`Unknown source type: ${updateTask.source.type}`);
            }
            
            updateTask.status = 'completed';
            updateTask.result = result;
            updateTask.endTime = new Date();
            
            // Log successful completion
            await this.logUpdateComplete(updateTask);
            
            // Trigger callbacks
            this.triggerCallbacks('onUpdateComplete', updateTask);
            
            console.log(`Update completed: ${updateTask.source.name}`);
            
        } catch (error) {
            updateTask.status = 'failed';
            updateTask.error = error.message;
            updateTask.endTime = new Date();
            
            // Log error
            await this.logUpdateError(updateTask, error);
            
            // Trigger callbacks
            this.triggerCallbacks('onUpdateError', updateTask);
            
            throw error;
        }
    }

    /**
     * Update GameMaster data
     */
    async updateGameMaster(updateTask) {
        console.log('Updating GameMaster data...');
        
        // Load the latest gamemaster.json from pvpoke submodule
        const gameMasterPath = 'pvpoke/src/data/gamemaster.json';
        const gameMasterData = await this.loadJsonFile(gameMasterPath);
        
        if (!gameMasterData) {
            throw new Error('Failed to load GameMaster data');
        }
        
        let recordsAdded = 0;
        let recordsModified = 0;
        
        // Update Pokemon data
        for (const pokemon of gameMasterData.pokemon) {
            const existingPokemon = await this.db.get(
                'SELECT pk_pokemon_id FROM fact_pokemon WHERE pokemon_number = ? AND form = ?',
                [pokemon.dex, pokemon.speciesId]
            );
            
            if (existingPokemon) {
                // Update existing
                await this.updatePokemonRecord(pokemon);
                recordsModified++;
            } else {
                // Insert new
                await this.insertPokemonRecord(pokemon);
                recordsAdded++;
            }
        }
        
        // Update Moves data
        for (const move of gameMasterData.moves) {
            const existingMove = await this.db.get(
                'SELECT pk_move_id FROM dim_moves WHERE move_name = ?',
                [move.name]
            );
            
            if (existingMove) {
                await this.updateMoveRecord(move);
                recordsModified++;
            } else {
                await this.insertMoveRecord(move);
                recordsAdded++;
            }
        }
        
        return { recordsAdded, recordsModified };
    }

    /**
     * Update PvP Rankings data
     */
    async updateRankings(updateTask) {
        console.log('Updating PvP Rankings data...');
        
        let recordsAdded = 0;
        let recordsModified = 0;
        
        const leagues = ['1500', '2500', '10000']; // Great, Ultra, Master
        const scenarios = ['leads', 'closers', 'switches', 'chargers', 'attackers', 'overall'];
        
        for (const league of leagues) {
            for (const scenario of scenarios) {
                const rankingsPath = `pvpoke/src/data/rankings/all/overall/rankings-${league}.json`;
                const rankingsData = await this.loadJsonFile(rankingsPath);
                
                if (rankingsData) {
                    for (const ranking of rankingsData) {
                        const result = await this.updateRankingRecord(ranking, league, scenario);
                        if (result.isNew) {
                            recordsAdded++;
                        } else {
                            recordsModified++;
                        }
                    }
                }
            }
        }
        
        return { recordsAdded, recordsModified };
    }

    /**
     * Update PvE Tiers data
     */
    async updateTiers(updateTask) {
        console.log('Updating PvE Tiers data...');
        
        let recordsAdded = 0;
        let recordsModified = 0;
        
        // Load tier data from pokemon-resources
        const tierPath = 'pokemon-resources/pogo_pkm_tiers.json';
        const tierData = await this.loadJsonFile(tierPath);
        
        if (tierData) {
            for (const tier of tierData) {
                const result = await this.updateTierRecord(tier);
                if (result.isNew) {
                    recordsAdded++;
                } else {
                    recordsModified++;
                }
            }
        }
        
        return { recordsAdded, recordsModified };
    }

    /**
     * Perform initial data load if database is empty
     */
    async performInitialDataLoad() {
        const pokemonCount = await this.db.get('SELECT COUNT(*) as count FROM fact_pokemon');
        
        if (pokemonCount.count === 0) {
            console.log('Database is empty, performing initial data load...');
            
            // Queue initial updates for all sources
            for (const source of this.updateSources) {
                if (source.isActive) {
                    this.queueUpdate(source);
                }
            }
            
            // Process the queue
            await this.processUpdateQueue();
        }
    }

    /**
     * Utility functions
     */
    
    generateUpdateId() {
        return `upd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    getUpdatePriority(sourceType) {
        const priorities = {
            'gamemaster': 10,  // Highest priority
            'rankings': 8,
            'tiers': 6,
            'moves': 4
        };
        return priorities[sourceType] || 1;
    }
    
    getRepoPath(repositoryUrl) {
        // Extract owner/repo from GitHub URL
        const match = repositoryUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        return match ? `${match[1]}/${match[2].replace('.git', '')}` : null;
    }
    
    async loadJsonFile(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error loading JSON file ${filePath}:`, error);
            return null;
        }
    }
    
    /**
     * Database logging functions
     */
    
    async logUpdateStart(updateTask) {
        const updateId = this.generateUpdateId();
        const dateId = this.formatDateId(new Date());
        
        await this.db.run(`
            INSERT INTO fact_data_updates (
                pk_update_id, fk_source_id, fk_date_id, update_type, update_status
            ) VALUES (?, ?, ?, ?, ?)
        `, [
            updateId,
            updateTask.sourceId,
            dateId,
            updateTask.source.type,
            'in_progress'
        ]);
        
        return updateId;
    }
    
    async logUpdateComplete(updateTask) {
        const duration = (updateTask.endTime - updateTask.startTime) / 1000;
        const currentHash = await this.getCurrentGitHash(updateTask.source);
        
        await this.db.run(`
            UPDATE fact_data_updates 
            SET update_status = ?, 
                records_added = ?, 
                records_modified = ?,
                processing_duration = ?,
                git_commit_hash = ?
            WHERE pk_update_id = ?
        `, [
            'completed',
            updateTask.result?.recordsAdded || 0,
            updateTask.result?.recordsModified || 0,
            duration,
            currentHash,
            updateTask.databaseId
        ]);
        
        // Update source last update time
        await this.db.run(`
            UPDATE dim_data_sources 
            SET last_update_timestamp = ?
            WHERE pk_source_id = ?
        `, [updateTask.endTime.toISOString(), updateTask.sourceId]);
    }
    
    async logUpdateError(updateTask, error) {
        const duration = updateTask.endTime ? (updateTask.endTime - updateTask.startTime) / 1000 : 0;
        
        await this.db.run(`
            UPDATE fact_data_updates 
            SET update_status = ?, 
                error_message = ?,
                processing_duration = ?
            WHERE pk_update_id = ?
        `, [
            'failed',
            error.message,
            duration,
            updateTask.databaseId
        ]);
    }
    
    formatDateId(date) {
        return date.toISOString().split('T')[0];
    }
    
    /**
     * Event handling
     */
    
    on(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event].push(callback);
        }
    }
    
    triggerCallbacks(event, data) {
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
     * Database record update methods (to be implemented)
     */
    
    async updatePokemonRecord(pokemon) {
        // Implementation for updating Pokemon records
        // This would parse the GameMaster Pokemon data and update the database
    }
    
    async insertPokemonRecord(pokemon) {
        // Implementation for inserting new Pokemon records
    }
    
    async updateMoveRecord(move) {
        // Implementation for updating move records
    }
    
    async insertMoveRecord(move) {
        // Implementation for inserting new move records
    }
    
    async updateRankingRecord(ranking, league, scenario) {
        // Implementation for updating ranking records
    }
    
    async updateTierRecord(tier) {
        // Implementation for updating tier records
    }
}

export default DataUpdateManager; 