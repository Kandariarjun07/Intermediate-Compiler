// parser.js
// This file contains the Parser class, which builds the AST from tokens.
import { ProgramNode, FunctionDefinitionNode, ParamNode, BlockNode, VariableDeclarationNode, AssignmentNode, BinaryOpNode, NumberNode, IdentifierNode, StringLiteralNode, FunctionCallNode, IfStatementNode, ForLoopNode, ReturnStatementNode, UnaryOpNode } from './astNodes.js';

export class Parser {
    constructor(t) { this.tokens = t; this.pos = 0; this.errors = []; }
    currentToken() { return this.pos < this.tokens.length ? this.tokens[this.pos] : null; }
    advance() { this.pos++; }
    error(m, t) { const tok = t || this.currentToken(); const i = tok ? `at line ${tok.line}` : `at EOF`; this.errors.push({ message: `Syntax Error: ${m} ${i}` }); if (tok) this.advance(); }
    expect(ty, v = null) { const t = this.currentToken(); if (t && t.type === ty && (v === null || t.value === v)) { this.advance(); return t; } this.error(`Expected ${v || ty}`, t); return null; }

    parse() {
        const functions = [];
        while (this.currentToken()) {
            const func = this.parseFunctionDefinition();
            if (func) functions.push(func);
            else if (this.errors.length > 0) break;
        }
        return { ast: new ProgramNode(functions), errors: this.errors };
    }

    parseFunctionDefinition() {
        const type = this.expect('KEYWORD'); const name = this.expect('IDENTIFIER'); if (!type || !name) return null;
        this.expect('SEPARATOR', '(');
        const params = [];
        if (this.currentToken()?.value !== ')') {
            do {
                const paramType = this.expect('KEYWORD');
                const paramName = this.expect('IDENTIFIER');
                if (paramType && paramName) params.push(new ParamNode(paramType.value, new IdentifierNode(paramName)));
                if (this.currentToken()?.value !== ',') break;
                this.advance();
            } while (true);
        }
        this.expect('SEPARATOR', ')');
        const body = this.parseBlock();
        return new FunctionDefinitionNode(type.value, new IdentifierNode(name), params, body);
    }

    parseBlock() { this.expect('SEPARATOR', '{'); const stmts = []; while (this.currentToken() && this.currentToken().value !== '}') { const s = this.parseStatement(); if (s) stmts.push(s); else if (this.errors.length > 0) this.recover(); } this.expect('SEPARATOR', '}'); return new BlockNode(stmts); }

    recover() { while (this.currentToken() && this.currentToken().value !== ';' && this.currentToken().value !== '}') this.advance(); if (this.currentToken()?.value === ';') this.advance(); }

    parseStatement() {
        const t = this.currentToken(); if (!t) return null;
        if (t.type === 'KEYWORD') {
            switch (t.value) {
                case 'int': return this.parseVariableDeclaration();
                case 'if': return this.parseIfStatement();
                case 'for': return this.parseForLoop();
                case 'return': return this.parseReturnStatement();
            }
        }
        if (t.type === 'IDENTIFIER' || t.value === 'printf') {
            if (this.tokens[this.pos + 1]?.value === '(') return this.parseFunctionCallStatement();
            if (this.tokens[this.pos + 1]?.value === '=') return this.parseAssignment();
            // Support i++; and i--;
            if (this.tokens[this.pos + 1]?.type === 'OPERATOR' && (this.tokens[this.pos + 1].value === '++' || this.tokens[this.pos + 1].value === '--')) {
                const idTok = this.currentToken();
                this.advance();
                const opTok = this.currentToken();
                this.advance();
                this.expect('SEPARATOR', ';');
                return new UnaryOpNode(opTok.value, new IdentifierNode(idTok));
            }
        }
        this.error("Invalid statement"); return null;
    }

    parseVariableDeclaration() { const t = this.expect('KEYWORD'); const n = this.expect('IDENTIFIER'); if (!t || !n) return null; let v = null; if (this.currentToken()?.value === '=') { this.advance(); v = this.parseExpression(); } this.expect('SEPARATOR', ';'); return new VariableDeclarationNode(t.value, new IdentifierNode(n), v); }
    parseAssignment(noSemicolon = false) { const l = new IdentifierNode(this.expect('IDENTIFIER')); this.expect('OPERATOR', '='); const r = this.parseExpression(); if (!noSemicolon) this.expect('SEPARATOR', ';'); return new AssignmentNode(l, r); }
    parseFunctionCallStatement() { const n = this.currentToken(); if (n.type !== 'IDENTIFIER' && n.type !== 'KEYWORD') { this.error("Expected function name"); return null; } this.advance(); this.expect('SEPARATOR', '('); const a = []; if (this.currentToken()?.value !== ')') { a.push(this.parseExpression()); while (this.currentToken()?.value === ',') { this.advance(); a.push(this.parseExpression()); } } this.expect('SEPARATOR', ')'); this.expect('SEPARATOR', ';'); return new FunctionCallNode(new IdentifierNode(n), a); }
    parseIfStatement() { this.expect('KEYWORD', 'if'); this.expect('SEPARATOR', '('); const c = this.parseExpression(); this.expect('SEPARATOR', ')'); const ib = this.parseBlock(); let eb = null; if (this.currentToken()?.value === 'else') { this.advance(); eb = this.parseBlock(); } return new IfStatementNode(c, ib, eb); }
    parseForLoop() {
        this.expect('KEYWORD', 'for'); this.expect('SEPARATOR', '(');
        const init = this.parseVariableDeclaration();
        const cond = this.parseExpression(); this.expect('SEPARATOR', ';');
        let inc = null;
        if (this.currentToken()?.type !== 'SEPARATOR' || this.currentToken()?.value !== ')') {
            inc = this.parseExpression();
        }
        this.expect('SEPARATOR', ')');
        const body = this.parseBlock();
        return new ForLoopNode(init, cond, inc, body);
    }
    parseReturnStatement() { this.expect('KEYWORD', 'return'); let v = null; if (this.currentToken()?.value !== ';') { v = this.parseExpression(); } this.expect('SEPARATOR', ';'); return new ReturnStatementNode(v); }
    parseExpression() { return this.parseLogicalOr(); }
    parseLogicalOr() { let n = this.parseLogicalAnd(); while (this.currentToken()?.value === '||') { const o = this.currentToken(); this.advance(); const r = this.parseLogicalAnd(); n = new BinaryOpNode(n, o.value, r); } return n; }
    parseLogicalAnd() { let n = this.parseComparison(); while (this.currentToken()?.value === '&&') { const o = this.currentToken(); this.advance(); const r = this.parseComparison(); n = new BinaryOpNode(n, o.value, r); } return n; }
    parseComparison() { let n = this.parseTerm(); while (this.currentToken()?.type === 'OPERATOR' && ['<', '>', '==', '!=', '<=', '>='].includes(this.currentToken().value)) { const o = this.currentToken(); this.advance(); const r = this.parseTerm(); n = new BinaryOpNode(n, o.value, r); } return n; }
    parseTerm() { let n = this.parseFactor(); while (this.currentToken()?.type === 'OPERATOR' && ['+', '-'].includes(this.currentToken().value)) { const o = this.currentToken(); this.advance(); const r = this.parseFactor(); n = new BinaryOpNode(n, o.value, r); } return n; }
    parseFactor() { let n = this.parsePrimary(); while (this.currentToken()?.type === 'OPERATOR' && ['*', '/'].includes(this.currentToken().value)) { const o = this.currentToken(); this.advance(); const r = this.parsePrimary(); n = new BinaryOpNode(n, o.value, r); } return n; }
    parsePrimary() {
        const t = this.currentToken(); if (!t) { this.error("Unexpected EOF"); return null; }
        if (t.type === 'IDENTIFIER' && this.tokens[this.pos + 1]?.value === '(') return this.parseFunctionCallExpression();
        if (t.type === 'STRING_LIT') { this.advance(); return new StringLiteralNode(t); }
        if (t.type.endsWith('_LIT')) { this.advance(); return new NumberNode(t); }
        if (t.type === 'IDENTIFIER') { this.advance(); return new IdentifierNode(t); }
        if (t.value === '(') { this.advance(); const n = this.parseExpression(); this.expect('SEPARATOR', ')'); return n; }
        this.error("Invalid primary expression"); return null;
    }
    parseFunctionCallExpression() {
        const nameToken = this.expect('IDENTIFIER');
        this.expect('SEPARATOR', '(');
        const args = [];
        if (this.currentToken()?.value !== ')') {
            args.push(this.parseExpression());
            while (this.currentToken()?.value === ',') { this.advance(); args.push(this.parseExpression()); }
        }
        this.expect('SEPARATOR', ')');
        return new FunctionCallNode(new IdentifierNode(nameToken), args);
    }
}
