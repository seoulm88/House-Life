/**
 * Mamma Store - LocalStorage Wrapper
 */

const STORAGE_KEY = 'mamma_data';

const defaultData = {
    ingredients: {}, // { '양파': { costPerGram: 10 }, '소고기': { costPerGram: null } } -> null means undecided
    categories: ['한식', '일식', '양식', '중식', '분식', '기타'],
    recipes: [], // { id, name, category, ingredients: [{name, grams}], totalCost, hasUndecidedCost }
    logs: {}, // { '2026-03-15': { breakfast: [recipeId], lunch: [], dinner: [] } }
    shoppingList: { selectedMenus: [], customItems: [] } // Phase 2: Shopping List State
};

class Store {
    constructor() {
        this.data = this.loadData();
    }

    loadData() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
        return JSON.parse(JSON.stringify(defaultData));
    }

    saveData() {
        this.saveDataLocally();
        if (this.cloudSync && this.cloudSync.isConnected) {
            this.cloudSync.syncToCloud();
        }
    }

    saveDataLocally() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    }

    // Ingredients
    getIngredients() { return this.data.ingredients; }
    saveIngredient(name, costPerGram) {
        // Phase 2/3: Handle null/undefined cost as "Undecided"
        const cost = costPerGram ? Number(costPerGram) : null;
        this.data.ingredients[name] = { costPerGram: cost };
        // We no longer update existing recipes when global price changes.
        this.saveData();
    }
    deleteIngredient(name) {
        delete this.data.ingredients[name];
        this.saveData();
    }

    // Recipes
    getRecipes() { return this.data.recipes; }
    getRecipe(id) { return this.data.recipes.find(r => r.id === id); }
    
    calculateRecipeCost(ingredientsList) {
        let total = 0;
        let hasUndecidedCost = false;
        
        ingredientsList.forEach(item => {
            // Legacy Migration: if cost is undefined, calculate it once from global dict
            if (item.cost === undefined) {
                const ingr = this.data.ingredients[item.name];
                if (ingr && ingr.costPerGram !== null) {
                    item.cost = ingr.costPerGram * item.grams;
                } else {
                    item.cost = null;
                }
            }

            if (item.cost === null || item.cost === undefined) {
                hasUndecidedCost = true;
            } else {
                total += item.cost;
            }
        });
        return { totalCost: total, hasUndecidedCost };
    }

    saveRecipe(idx = null, recipeData) {
        // Auto-register new ingredients with null cost
        recipeData.ingredients.forEach(i => {
            if (!this.data.ingredients[i.name]) {
                this.saveIngredient(i.name, null); // Marked as undecided
            }
        });

        const costCalc = this.calculateRecipeCost(recipeData.ingredients);
        recipeData.totalCost = costCalc.totalCost;
        recipeData.hasUndecidedCost = costCalc.hasUndecidedCost;
        
        if (idx !== null && idx !== undefined) {
            const index = this.data.recipes.findIndex(r => r.id === idx);
            if (index > -1) {
                this.data.recipes[index] = { ...this.data.recipes[index], ...recipeData };
            }
        } else {
            recipeData.id = Date.now().toString();
            this.data.recipes.push(recipeData);
        }
        this.saveData();
    }

    deleteRecipe(id) {
        this.data.recipes = this.data.recipes.filter(r => r.id !== id);
        // Remove from logs as well? For now, keep in logs but map might fail to find names.
        this.saveData();
    }

    // Logs
    getLogs() { return this.data.logs; }
    getLogForDate(dateStr) {
        if (!this.data.logs[dateStr]) {
            this.data.logs[dateStr] = { breakfast: [], lunch: [], dinner: [] };
        }
        return this.data.logs[dateStr];
    }
    
    addMealToLog(dateStr, mealType, recipeId) {
        const log = this.getLogForDate(dateStr);
        log[mealType].push(recipeId);
        this.saveData();
    }

    removeMealFromLog(dateStr, mealType, recipeId, index) {
        const log = this.getLogForDate(dateStr);
        log[mealType].splice(index, 1);
        this.saveData();
    }

    // Common Utilities
    getCategories() { return this.data.categories; }

    // Phase 2: Shopping List Features
    getShoppingList() {
        if (!this.data.shoppingList) this.data.shoppingList = { selectedMenus: [], customItems: [] };
        return this.data.shoppingList;
    }
    updateShoppingListMenus(menus) {
        this.getShoppingList().selectedMenus = menus;
        this.saveData();
    }
    addCustomShoppingItem(item) {
        this.getShoppingList().customItems.push({ id: Date.now().toString(), name: item, isChecked: false });
        this.saveData();
    }
    toggleCustomShoppingItem(id) {
        const item = this.getShoppingList().customItems.find(i => i.id === id);
        if (item) item.isChecked = !item.isChecked;
        this.saveData();
    }
    deleteCustomShoppingItem(id) {
        this.getShoppingList().customItems = this.getShoppingList().customItems.filter(i => i.id !== id);
        this.saveData();
    }

    // Phase 2: Export/Import for Sync
    exportData() {
        return btoa(encodeURIComponent(JSON.stringify(this.data)));
    }
    importData(base64String) {
        try {
            const parsed = JSON.parse(decodeURIComponent(atob(base64String)));
            if (parsed && parsed.recipes && parsed.logs) {
                this.data = parsed;
                this.saveData();
                return true;
            }
        } catch (e) {
            console.error("Invalid import data", e);
        }
        return false;
    }
}

export const store = new Store();
// Attach to window so non-module legacy code (like inline onclick handlers) still work
window.store = store;

// Init cloud sync
import { CloudSync } from './firebase-config.js';
store.cloudSync = new CloudSync(store);
// Attempt to auto-login if key is present
store.cloudSync.initSync();
