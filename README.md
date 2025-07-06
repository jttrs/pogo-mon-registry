# Pokemon GO Comprehensive Database & Collection Manager

A comprehensive web application that provides detailed Pokemon GO information including PvP rankings, PvE tier lists, and personal collection management. The app works fully offline with local data storage and automated updates from community sources.

## 🎯 Core Features

### Primary Features (No User Data Required)
- **Pokemon Search**: Search by name, number, type, generation, or special attributes
- **PvP Rankings**: View Pokemon rankings across all leagues (Great, Ultra, Master, Little Cup)
- **PvE Tier Lists**: See Pokemon effectiveness against all defending types
- **Move Analysis**: Complete movesets with legacy and Elite TM information
- **Evolution Chains**: Full evolution paths with requirements and costs
- **Type Effectiveness**: Interactive type chart with damage multipliers

### Secondary Features (Enhanced with PokeGenie Import)
- **Personal Collection**: Import your Pokemon from PokeGenie CSV exports
- **Collection Filtering**: Filter the database by Pokemon you actually own
- **IV Analysis**: See how your specific Pokemon rank with their actual IVs
- **Team Building**: Find your best Pokemon for specific leagues and matchups
- **Collection Statistics**: Track your progress and analyze your collection

## 🏗️ Architecture Overview

### Data Sources
- **PvPoke**: PvP rankings, battle simulations, and meta analysis
- **Dialgadex**: PvE tier rankings and type effectiveness calculations  
- **Pokemon Resources**: Base Pokemon data, moves, and game mechanics
- **PokeGenie**: User's personal Pokemon collection (CSV import)

### Technology Stack
- **Frontend**: JavaScript/ES6+ modules
- **Database**: SQLite (via SQL.js) with local storage persistence
- **Data Updates**: Automated git monitoring and incremental updates
- **Storage**: Browser localStorage with optional export/import

## 📊 Database Schema

### Pokemon-Centric Star Schema Design

#### Core Fact Table
- `fact_pokemon` - Central hub containing all Pokemon with base stats, types, and metadata

#### Metrics Fact Tables  
- `fact_pokemon_pvp_rankings` - PvP rankings by league, scenario, and moveset
- `fact_pokemon_pve_tiers` - PvE tier rankings by attacking/defending type matchups
- `fact_pokemon_pve_performance_metrics` - Detailed damage calculations and battle metrics
- `fact_user_pokemon_collection` - User's imported Pokemon with IVs and movesets

#### Dimension Tables
- `dim_pokemon_families` - Evolution families and candy types
- `dim_pokemon_evolutions` - Evolution chains with requirements
- `dim_types` - Pokemon types with colors and effectiveness
- `dim_moves` - All moves with PvP/PvE stats and availability
- `dim_movesets` - Move combinations for rankings
- `dim_leagues` - PvP leagues and PvE scenarios

#### Data Update Tracking
- `dim_data_sources` - External data source monitoring
- `fact_data_updates` - Update history and status tracking
- `fact_data_changes` - Detailed change logs for transparency

## 🔄 Data Update Strategy

### Automated Monitoring
- **Git Repository Monitoring**: Tracks changes in PvPoke, Dialgadex, and Pokemon Resources
- **Scheduled Updates**: Configurable intervals (6-24 hours) for different data types
- **Change Detection**: Git commit hash comparison to detect actual changes
- **Priority Queue**: GameMaster changes prioritized over rankings updates

### Update Processing Pipeline
1. **Detection**: Monitor repository commits via GitHub API
2. **Validation**: Verify data integrity and structure
3. **Staging**: Load new data into temporary tables
4. **Incremental Updates**: Preserve historical data while updating current rankings
5. **Rollback Capability**: Ability to revert failed or problematic updates

### Data Versioning
- All fact tables include `effective_from_date` and `effective_to_date`
- Historical rankings preserved for trend analysis
- `is_current` flag for latest data
- `data_source_version` tracking for audit trails

## 💾 Local Storage Implementation

### Browser-Based SQLite
- **SQL.js**: SQLite compiled to WebAssembly for client-side operation
- **localStorage Persistence**: Database automatically saved to browser storage
- **No Server Required**: Fully client-side operation
- **Export/Import**: Complete database backup and restore functionality

### PokeGenie CSV Integration
- **Seamless Import**: Drag-and-drop CSV files from PokeGenie exports
- **Data Mapping**: Automatic conversion from PokeGenie format to internal schema
- **Multiple Collections**: Support for multiple trainer accounts
- **Collection Management**: Archive, delete, or switch between collections

## 🚀 Getting Started

### Prerequisites
```bash
# Modern web browser with ES6+ support
# No server installation required - runs entirely in browser
```

### Installation
```bash
# Clone the repository with submodules
git clone --recursive https://github.com/yourusername/pogo-mon-registry.git
cd pogo-mon-registry

# Initialize git submodules (if not cloned with --recursive)
git submodule update --init --recursive

# Serve the files (any static file server works)
python -m http.server 8000
# or
npx serve .
# or
php -S localhost:8000
```

### First Launch
```javascript
import pokemonGoApp from './src/PokemonGoApp.js';

// Initialize the application
await pokemonGoApp.initialize();

// Search for Pokemon (works immediately)
const results = await pokemonGoApp.searchPokemon('charizard');

// Get detailed Pokemon information
const details = await pokemonGoApp.getPokemonDetails(results[0].pk_pokemon_id);
console.log(details); // Contains rankings, tiers, moves, evolution chain
```

### Import PokeGenie Data (Optional)
```javascript
// Import your PokeGenie CSV file
const fileInput = document.getElementById('pokegenie-file');
const file = fileInput.files[0];

const result = await pokemonGoApp.importPokeGenieCSV(file, 'My Main Account');
if (result.success) {
    console.log(`Imported ${result.pokemonCount} Pokemon!`);
    
    // Now get your personal collection
    const myPokemon = await pokemonGoApp.getUserPokemon();
    const myBestGreat = await pokemonGoApp.getUserBestForLeague('great');
}
```

## 📋 API Reference

### Primary Functions (Database Queries)

#### Pokemon Search
```javascript
// Search Pokemon by name, number, or type
const pokemon = await pokemonGoApp.searchPokemon('dragonite', {
    type: 'dragon',
    generation: 1,
    legendary: false,
    limit: 50
});
```

#### Pokemon Details
```javascript
// Get comprehensive Pokemon information
const details = await pokemonGoApp.getPokemonDetails(pokemonId);
// Returns: basic info, PvP rankings, PvE tiers, moves, evolutions, user copies
```

#### League Rankings
```javascript
// Get top Pokemon for a specific league
const rankings = await pokemonGoApp.getLeagueRankings('great', 'overall', 100);
```

#### PvE Tier Lists
```javascript
// Get best attackers against a specific defending type
const fireCounters = await pokemonGoApp.getPvETierList('fire', 50);
```

#### Type Effectiveness
```javascript
// Get type effectiveness chart
const effectiveness = await pokemonGoApp.getTypeEffectiveness('water', 'fire');
// Returns: 2.0 (super effective)
```

### Secondary Functions (User Collections)

#### Import Collection
```javascript
const result = await pokemonGoApp.importPokeGenieCSV(file, 'Collection Name');
```

#### User Pokemon
```javascript
// Get user's Pokemon with filters
const myDragons = await pokemonGoApp.getUserPokemon({ type: 'dragon' });

// Get best Pokemon for a league
const myBestUltra = await pokemonGoApp.getUserBestForLeague('ultra', 20);

// Get filtered search results (only Pokemon you own)
const ownedFire = await pokemonGoApp.getFilteredPokemon('', { type: 'fire' });
```

### Utility Functions

#### App Statistics
```javascript
const stats = await pokemonGoApp.getAppStats();
console.log(stats.database.totalPokemon); // e.g., 898
console.log(stats.collection.totalPokemon); // e.g., 1247 (user's collection)
```

#### Data Management
```javascript
// Force update from external sources
await pokemonGoApp.forceDataUpdate();

// Export user data
await pokemonGoApp.exportUserData();

// Clear all user collections
await pokemonGoApp.clearUserData();
```

## 📁 Project Structure

```
pogo-mon-registry/
├── database/
│   └── schema.sql                 # Complete SQLite schema
├── src/
│   ├── data/
│   │   ├── LocalDatabase.js       # SQLite database manager
│   │   ├── DataUpdateManager.js   # Automated update system
│   │   └── PokeGenieManager.js    # CSV import and collection management
│   └── PokemonGoApp.js           # Main application interface
├── pvpoke/                       # Git submodule - PvP data source
├── dialgadex/                    # Git submodule - PvE data source
├── pokemon-resources/            # Git submodule - Base Pokemon data
├── README.md
└── index.html                    # Example usage
```

## 🔧 Configuration

### Data Update Intervals
```javascript
// Modify update frequencies in DataUpdateManager.js
const updateSources = [
    {
        name: 'PvPoke GameMaster',
        checkInterval: 6 * 60 * 60 * 1000,    // 6 hours
    },
    {
        name: 'PvPoke Rankings', 
        checkInterval: 12 * 60 * 60 * 1000,   // 12 hours
    },
    // ...
];
```

### Database Settings
```javascript
// Modify database settings in LocalDatabase.js
this.dbName = 'pokemon_go_database';
this.version = '1.0.0';
```

## 🎮 Example Usage Scenarios

### Scenario 1: Meta Analysis (No User Data)
```javascript
// Check current Great League meta
const greatMeta = await pokemonGoApp.getLeagueRankings('great', 'overall', 50);

// Find best counters to Azumarill (Water/Fairy)
const azumarillCounters = await pokemonGoApp.getPvETierList('water');
const fairyCounters = await pokemonGoApp.getPvETierList('fairy');

// Check if a specific Pokemon is viable
const skarmoryDetails = await pokemonGoApp.getPokemonDetails('skarmory-normal');
console.log(skarmoryDetails.pvpRankings); // Rankings across all leagues
```

### Scenario 2: Personal Collection Analysis
```javascript
// Import your Pokemon
await pokemonGoApp.importPokeGenieCSV(csvFile, 'Main Account');

// Find your best Great League team
const myBestGreat = await pokemonGoApp.getUserBestForLeague('great', 20);

// Check what legendaries you own
const myLegendaries = await pokemonGoApp.getUserPokemon({ legendary: true });

// Find Pokemon you own that are good against Dragon types
const dragonCounters = await pokemonGoApp.getFilteredPokemon('', { 
    type: 'ice' // Ice beats Dragon
});
```

### Scenario 3: Team Building
```javascript
// Building a Great League team
const teamMembers = [];

// Lead: Check your best leads
const myLeads = await pokemonGoApp.getLeagueRankings('great', 'leads', 10);
const myOwnedLeads = await pokemonGoApp.getUserPokemon({ 
    pokemonIds: myLeads.map(p => p.fk_pokemon_id) 
});

// Closer: Find your best finishers
const myClosers = await pokemonGoApp.getUserBestForLeague('great')
    .filter(p => p.league_rank_percent > 80); // Top tier only

// Switch: Coverage Pokemon
const myDragons = await pokemonGoApp.getUserPokemon({ type: 'dragon' });
```

## 🔒 Privacy & Data

### Local-First Architecture
- **No Server**: All data stored locally in your browser
- **No Account Required**: Works without registration or login
- **Full Control**: Export, import, or delete your data anytime
- **Offline Capable**: Core functionality works without internet

### Data Sources Attribution
- **PvPoke**: Rankings and meta analysis (pvpoke.com)
- **Dialgadex**: PvE tier calculations (dialgadex by mgrann03)
- **Pokemon Resources**: Game data compilation (mgrann03/pokemon-resources)
- **PokeGenie**: Your personal Pokemon collection (Export from PokeGenie app)

## 🤝 Contributing

### Adding New Data Sources
1. Add source configuration to `DataUpdateManager.js`
2. Implement parser for the new data format
3. Create appropriate database tables and relationships
4. Add update logic for the new data type

### Extending the Schema
1. Modify `database/schema.sql` 
2. Update `LocalDatabase.js` initialization
3. Add corresponding JavaScript models
4. Update the main app interface

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- **PvPoke.com** - Comprehensive PvP analysis and rankings
- **Dialgadex** - PvE tier calculations and type effectiveness
- **PokeGenie** - Pokemon collection management and IV calculation
- **Pokemon Resources** - Community-maintained game data
- **SQL.js** - SQLite compiled to WebAssembly
- **Pokemon GO Community** - Ongoing research and data collection

---

**Note**: This is an unofficial tool created by fans for fans. Pokemon GO is a trademark of Niantic, Inc. and The Pokemon Company. 