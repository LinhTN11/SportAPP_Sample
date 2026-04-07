const fs = require('fs');
const path = require('path');

/**
 * ActionRegistry
 * Responsibility: Automatically discovers and loads all AI actions from the actions directory.
 * Provides easy access to tool definitions for the AI and execution logic for the system.
 */
class ActionRegistry {
    constructor() {
        this.actions = new Map();
        this.loadActions();
    }

    /**
     * Scans the actions directory and registers all .action.js files.
     */
    loadActions() {
        const actionsPath = path.join(__dirname, '../actions');
        const files = fs.readdirSync(actionsPath);

        for (const file of files) {
            if (file.endsWith('.action.js')) {
                const action = require(path.join(actionsPath, file));
                const actionName = action.definition.function.name;
                this.actions.set(actionName, action);
                console.log(`[Chatbot Registry] Registered action: ${actionName}`);
            }
        }
    }

    /**
     * Returns an array of tool definitions filtered by user role.
     * @param {string} userRole 
     */
    getToolDefinitions(userRole) {
        const definitions = [];
        for (const action of this.actions.values()) {
            if (action.roles.includes(userRole)) {
                definitions.push(action.definition);
            }
        }
        return definitions;
    }

    /**
     * Executes a specific tool by name.
     * @param {string} name 
     * @param {object} context - { args, userId, userRole, userLocation, prisma }
     */
    async executeAction(name, context) {
        const action = this.actions.get(name);
        if (!action) throw new Error(`Action ${name} not found in registry.`);
        
        if (!action.roles.includes(context.userRole)) {
            throw new Error(`Unauthorized: Role ${context.userRole} cannot access action ${name}.`);
        }

        return await action.execute(context);
    }
}

module.exports = new ActionRegistry();
