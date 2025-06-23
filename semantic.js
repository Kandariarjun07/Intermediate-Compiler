// semantic.js
// This file contains the SemanticAnalyzer and SymbolTable classes.

import { ASTNode } from './astNodes.js';

export class SymbolTable {
    constructor(name, parent = null) {
        this.name = name;
        this.parent = parent;
        this.symbols = {};
    }
    define(name, type, params = []) {
        if (this.symbols[name]) return false;
        this.symbols[name] = { type, params };
        return true;
    }
    lookup(name) {
        let scope = this;
        while (scope) {
            if (scope.symbols[name]) return scope.symbols[name];
            scope = scope.parent;
        }
        return null;
    }
}

export class SemanticAnalyzer {
    constructor() {
        this.globalScope = new SymbolTable('global');
        this.currentScope = this.globalScope;
        this.scopes = [this.globalScope];
        this.errors = [];
        // Pre-define built-in functions
        this.globalScope.define('printf', 'function');
    }

    error(message, node) {
        this.errors.push({ message: `Semantic Error: ${message}`, line: node.token.line });
    }

    analyze(ast) {
        this.visit(ast);
        return { errors: this.errors, scopes: this.scopes };
    }

    enterScope(name) {
        const newScope = new SymbolTable(name, this.currentScope);
        this.scopes.push(newScope);
        this.currentScope = newScope;
    }

    exitScope() {
        this.currentScope = this.currentScope.parent;
    }

    visit(node) {
        if (!node) return;
        const visitorMethod = `visit${node.constructor.name}`;
        if (this[visitorMethod]) {
            this[visitorMethod](node);
        } else {
            this.genericVisit(node);
        }
    }

    genericVisit(node) {
        for (const key in node) {
            if (node[key] instanceof ASTNode) {
                this.visit(node[key]);
            } else if (Array.isArray(node[key])) {
                node[key].forEach(item => this.visit(item));
            }
        }
    }

    visitProgramNode(node) { this.genericVisit(node); }
    visitFunctionDefinitionNode(node) { if (!this.globalScope.define(node.name.name, 'function', node.params)) this.error(`Function '${node.name.name}' already defined.`, node.name); this.enterScope(node.name.name); node.params.forEach(p => this.currentScope.define(p.paramName.name, p.paramType)); this.visit(node.body); this.exitScope(); }
    visitBlockNode(node) { this.enterScope('block'); this.genericVisit(node); this.exitScope(); }
    visitVariableDeclarationNode(node) { if (!this.currentScope.define(node.varName.name, 'variable')) this.error(`Variable '${node.varName.name}' already declared.`, node.varName); if (node.value) this.visit(node.value); }
    visitIdentifierNode(node) { if (!this.currentScope.lookup(node.name)) this.error(`Undeclared variable '${node.name}'.`, node); }
    visitAssignmentNode(node) { this.visit(node.left); this.visit(node.right); }
    visitBinaryOpNode(node) { this.visit(node.left); this.visit(node.right); }
    visitIfStatementNode(node) { this.visit(node.condition); this.visit(node.ifBody); if (node.elseBody) this.visit(node.elseBody); }
    visitForLoopNode(node) { this.enterScope('for-loop'); this.visit(node.init); this.visit(node.condition); this.visit(node.increment); this.visit(node.body); this.exitScope(); }
    visitFunctionCallNode(node) { const f = this.currentScope.lookup(node.name.name); if (!f) this.error(`Function '${node.name.name}' not defined.`, node.name); else if (f.type !== 'function') this.error(`'${node.name.name}' is not a function.`, node.name); this.genericVisit(node); }
    visitReturnStatementNode(node) { this.visit(node.value); }
    visitParamNode(node) { }
    visitNumberNode(node) { }
    visitStringLiteralNode(node) { }
}
