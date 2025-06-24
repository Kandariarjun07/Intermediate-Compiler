// semantic.js
// Handles semantic analysis and symbol table management

import { ASTNode } from './astNodes.js';

// ------------------------
// 📚 Symbol Table
// ------------------------
export class SymbolTable {
    constructor(name, parent = null) {
        this.name = name;              // Scope name (e.g., 'global', 'main', 'block')
        this.parent = parent;          // Reference to the parent scope
        this.symbols = {};             // Stores symbols as { name: { type, params } }
    }

    // Define a new symbol in the current scope
    define(name, type, params = []) {
        if (this.symbols[name]) return false; // Already defined
        this.symbols[name] = { type, params };
        return true;
    }

    // Lookup symbol in current or parent scopes
    lookup(name) {
        let scope = this;
        while (scope) {
            if (scope.symbols[name]) return scope.symbols[name];
            scope = scope.parent;
        }
        return null; // Not found
    }
}

// ------------------------
// 🧠 Semantic Analyzer
// ------------------------
export class SemanticAnalyzer {
    constructor() {
        this.globalScope = new SymbolTable('global');
        this.currentScope = this.globalScope;
        this.scopes = [this.globalScope];
        this.errors = [];

        // Add built-in functions
        this.globalScope.define('printf', 'function');
    }

    // Record an error with line info
    error(message, node) {
        this.errors.push({
            message: `Semantic Error: ${message}`,
            line: node.token.line
        });
    }

    // Main entry to start semantic analysis
    analyze(ast) {
        this.visit(ast);
        return {
            errors: this.errors,
            scopes: this.scopes
        };
    }

    // Enter a new nested scope
    enterScope(name) {
        const newScope = new SymbolTable(name, this.currentScope);
        this.scopes.push(newScope);
        this.currentScope = newScope;
    }

    // Exit current scope to parent
    exitScope() {
        this.currentScope = this.currentScope.parent;
    }

    // Dispatcher: calls the right visit method for each node type
    visit(node) {
        if (!node) return;
        const methodName = `visit${node.constructor.name}`;
        if (this[methodName]) {
            this[methodName](node);
        } else {
            this.genericVisit(node); // fallback
        }
    }

    // Visit all children recursively
    genericVisit(node) {
        for (const key in node) {
            if (node[key] instanceof ASTNode) {
                this.visit(node[key]);
            } else if (Array.isArray(node[key])) {
                node[key].forEach(child => this.visit(child));
            }
        }
    }

    // --------------------
    // Node-Specific Visits
    // --------------------

    visitProgramNode(node) {
        this.genericVisit(node);
    }

    visitFunctionDefinitionNode(node) {
        // Register function in global scope
        const name = node.name.name;
        const defined = this.globalScope.define(name, 'function', node.params);
        if (!defined) {
            this.error(`Function '${name}' already defined.`, node.name);
        }

        // New scope for function body
        this.enterScope(name);

        // Define function parameters
        node.params.forEach(param => {
            this.currentScope.define(param.paramName.name, param.paramType);
        });

        this.visit(node.body);
        this.exitScope();
    }

    visitBlockNode(node) {
        this.enterScope('block');
        this.genericVisit(node);
        this.exitScope();
    }

    visitVariableDeclarationNode(node) {
        const name = node.varName.name;
        const defined = this.currentScope.define(name, 'variable');
        if (!defined) {
            this.error(`Variable '${name}' already declared.`, node.varName);
        }
        if (node.value) {
            this.visit(node.value); // Check initializer
        }
    }

    visitIdentifierNode(node) {
        const found = this.currentScope.lookup(node.name);
        if (!found) {
            this.error(`Undeclared variable '${node.name}'.`, node);
        }
    }

    visitAssignmentNode(node) {
        this.visit(node.left);
        this.visit(node.right);
    }

    visitBinaryOpNode(node) {
        this.visit(node.left);
        this.visit(node.right);
    }

    visitIfStatementNode(node) {
        this.visit(node.condition);
        this.visit(node.ifBody);
        if (node.elseBody) {
            this.visit(node.elseBody);
        }
    }

    visitForLoopNode(node) {
        this.enterScope('for-loop');
        this.visit(node.init);
        this.visit(node.condition);
        this.visit(node.increment);
        this.visit(node.body);
        this.exitScope();
    }

    visitFunctionCallNode(node) {
        const name = node.name.name;
        const func = this.currentScope.lookup(name);

        if (!func) {
            this.error(`Function '${name}' not defined.`, node.name);
        } else if (func.type !== 'function') {
            this.error(`'${name}' is not a function.`, node.name);
        }

        this.genericVisit(node); // visit args
    }

    visitReturnStatementNode(node) {
        this.visit(node.value);
    }

    // No-op visits (handled elsewhere or trivial)
    visitParamNode(node) { }
    visitNumberNode(node) { }
    visitStringLiteralNode(node) { }
}
