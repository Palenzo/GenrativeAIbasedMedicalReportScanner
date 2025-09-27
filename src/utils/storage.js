const fs = require('fs').promises;
const path = require('path');

class PersistentStorage {
    constructor(options = {}) {
        this.results = [];
        this.nextId = 1;
        this.maxItems = options.maxItems || 1000; // Default max items
        this.storageFile = options.storageFile || path.join(process.cwd(), 'data', 'extraction-results.json');
        this.saveInterval = options.saveInterval || 5 * 60 * 1000; // Default: 5 minutes

        // Create data directory if it doesn't exist
        this.initStorage();
        
        // Load data from file on startup
        this.loadFromFile();

        // Set up periodic saving
        setInterval(() => this.saveToFile(), this.saveInterval);
    }

    async initStorage() {
        const dataDir = path.dirname(this.storageFile);
        try {
            await fs.mkdir(dataDir, { recursive: true });
        } catch (error) {
            console.error('Error creating data directory:', error);
        }
    }

    async loadFromFile() {
        try {
            const data = await fs.readFile(this.storageFile, 'utf8');
            const parsed = JSON.parse(data);
            this.results = parsed.results || [];
            this.nextId = parsed.nextId || 1;
            console.log(`Loaded ${this.results.length} results from storage file`);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Error loading from storage file:', error);
            }
            // If file doesn't exist or is invalid, start with empty state
            this.results = [];
            this.nextId = 1;
        }
    }

    async saveToFile() {
        try {
            const data = JSON.stringify({
                results: this.results,
                nextId: this.nextId
            }, null, 2);
            await fs.writeFile(this.storageFile, data, 'utf8');
            console.log(`Saved ${this.results.length} results to storage file`);
        } catch (error) {
            console.error('Error saving to storage file:', error);
        }
    }

    add(result) {
        const newResult = {
            id: this.nextId++,
            ...result,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Add to front of array and enforce limit
        this.results.unshift(newResult);
        if (this.results.length > this.maxItems) {
            this.results = this.results.slice(0, this.maxItems);
        }

        // Trigger save to file
        this.saveToFile();

        return newResult;
    }

    getLast() {
        return this.results[0] || null;
    }

    update(id, updateData) {
        const index = this.results.findIndex(r => r.id === Number(id));
        if (index === -1) return null;
        
        const updated = {
            ...this.results[index],
            ...updateData,
            id: this.results[index].id, // Preserve the original ID
            updatedAt: new Date()
        };
        
        this.results[index] = updated;
        
        // Trigger save to file
        this.saveToFile();
        
        return updated;
    }

    // Get total number of stored results
    getCount() {
        return this.results.length;
    }

    // Clear all results (for testing)
    async clear() {
        this.results = [];
        this.nextId = 1;
        await this.saveToFile();
    }
}

// Create singleton instance with default options
const storage = new PersistentStorage({
    maxItems: 1000,                     // Maximum items to keep in memory
    storageFile: path.join(process.cwd(), 'data', 'extraction-results.json'),
    saveInterval: 5 * 60 * 1000         // Save every 5 minutes
});

module.exports = storage;