// parser.js
// This file contains the Parser class, which builds the AST from tokens.

import {
    ProgramNode, FunctionDefinitionNode, ParamNode, BlockNode,
    VariableDeclarationNode, AssignmentNode, BinaryOpNode, NumberNode,
    IdentifierNode, StringLiteralNode, FunctionCallNode, IfStatementNode,
    ForLoopNode, ReturnStatementNode, UnaryOpNode
} from './astNodes.js';

export class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
        this.errors = [];
    }

    currentToken() {
        return this.pos < this.tokens.length ? this.tokens[this.pos] : null;
    }

    advance() {
        this.pos++;
    }

    error(msg, token = this.currentToken()) {
        const info = token ? `at line ${token.line}` : `at EOF`;
        this.errors.push({ message: `Syntax Error: ${msg} ${info}` });
        if (token) this.advance();
    }

    expect(type, value = null) {
        const token = this.currentToken();
        if (token && token.type === type && (value === null || token.value === value)) {
            this.advance();
            return token;
        }
        this.error(`Expected ${value || type}`, token);
        return null;
    }

    parse() {
        const functions = [];

        while (this.currentToken()) {
            const func = this.parseFunctionDefinition();
            if (func) functions.push(func);
            else if (this.errors.length > 0) break;
        }

        return {
            ast: new ProgramNode(functions),
            errors: this.errors
        };
    }

    parseFunctionDefinition() {
        const returnType = this.expect('KEYWORD');
        const name = this.expect('IDENTIFIER');
        if (!returnType || !name) return null;

        this.expect('SEPARATOR', '(');

        const params = [];
        if (this.currentToken()?.value !== ')') {
            do {
                const paramType = this.expect('KEYWORD');
                const paramName = this.expect('IDENTIFIER');

                if (paramType && paramName) {
                    params.push(new ParamNode(paramType.value, new IdentifierNode(paramName)));
                }

                if (this.currentToken()?.value !== ',') break;
                this.advance();
            } while (true);
        }

        this.expect('SEPARATOR', ')');

        const body = this.parseBlock();

        return new FunctionDefinitionNode(returnType.value, new IdentifierNode(name), params, body);
    }

    parseBlock() {
        this.expect('SEPARATOR', '{');

        const statements = [];

        while (this.currentToken() && this.currentToken().value !== '}') {
            const stmt = this.parseStatement();
            if (stmt) statements.push(stmt);
            else if (this.errors.length > 0) this.recover();
        }

        this.expect('SEPARATOR', '}');
        return new BlockNode(statements);
    }

    recover() {
        while (this.currentToken() && this.currentToken().value !== ';' && this.currentToken().value !== '}') {
            this.advance();
        }
        if (this.currentToken()?.value === ';') this.advance();
    }

    parseStatement() {
        const t = this.currentToken();
        if (!t) return null;

        if (t.type === 'KEYWORD') {
            switch (t.value) {
                case 'int': return this.parseVariableDeclaration();
                case 'if': return this.parseIfStatement();
                case 'for': return this.parseForLoop();
                case 'return': return this.parseReturnStatement();
            }
        }

        if (t.type === 'IDENTIFIER' || t.value === 'printf') {
            const next = this.tokens[this.pos + 1];

            if (next?.value === '(') return this.parseFunctionCallStatement();
            if (next?.value === '=') return this.parseAssignment();

            if (next?.type === 'OPERATOR' && (next.value === '++' || next.value === '--')) {
                const id = this.currentToken(); this.advance();
                const op = this.currentToken(); this.advance();
                this.expect('SEPARATOR', ';');
                return new UnaryOpNode(op.value, new IdentifierNode(id));
            }
        }

        this.error("Invalid statement");
        return null;
    }

    parseVariableDeclaration() {
        const type = this.expect('KEYWORD');
        const name = this.expect('IDENTIFIER');
        if (!type || !name) return null;

        let value = null;
        if (this.currentToken()?.value === '=') {
            this.advance();
            value = this.parseExpression();
        }

        this.expect('SEPARATOR', ';');
        return new VariableDeclarationNode(type.value, new IdentifierNode(name), value);
    }

    parseAssignment(noSemicolon = false) {
        const left = new IdentifierNode(this.expect('IDENTIFIER'));
        this.expect('OPERATOR', '=');
        const right = this.parseExpression();
        if (!noSemicolon) this.expect('SEPARATOR', ';');
        return new AssignmentNode(left, right);
    }

    parseFunctionCallStatement() {
        const nameToken = this.currentToken();
        if (nameToken.type !== 'IDENTIFIER' && nameToken.type !== 'KEYWORD') {
            this.error("Expected function name");
            return null;
        }

        this.advance();
        this.expect('SEPARATOR', '(');

        const args = [];
        if (this.currentToken()?.value !== ')') {
            args.push(this.parseExpression());
            while (this.currentToken()?.value === ',') {
                this.advance();
                args.push(this.parseExpression());
            }
        }

        this.expect('SEPARATOR', ')');
        this.expect('SEPARATOR', ';');
        return new FunctionCallNode(new IdentifierNode(nameToken), args);
    }

    parseIfStatement() {
        this.expect('KEYWORD', 'if');
        this.expect('SEPARATOR', '(');
        const condition = this.parseExpression();
        this.expect('SEPARATOR', ')');
        const ifBlock = this.parseBlock();

        let elseBlock = null;
        if (this.currentToken()?.value === 'else') {
            this.advance();
            elseBlock = this.parseBlock();
        }

        return new IfStatementNode(condition, ifBlock, elseBlock);
    }

    parseForLoop() {
        this.expect('KEYWORD', 'for');
        this.expect('SEPARATOR', '(');

        const init = this.parseVariableDeclaration();

        const cond = this.parseExpression();
        this.expect('SEPARATOR', ';'); 

        const inc = this.parseAssignment(true);

        this.expect('SEPARATOR', ')');
        const body = this.parseBlock();

        return new ForLoopNode(init, cond, inc, body);
    }

    parseReturnStatement() {
        this.expect('KEYWORD', 'return');

        let value = null;
        if (this.currentToken()?.value !== ';') {
            value = this.parseExpression();
        }

        this.expect('SEPARATOR', ';');
        return new ReturnStatementNode(value);
    }

    parseExpression() {
        return this.parseLogicalOr();
    }

    parseLogicalOr() {
        let node = this.parseLogicalAnd();

        while (this.currentToken()?.value === '||') {
            const op = this.currentToken(); this.advance();
            const right = this.parseLogicalAnd();
            node = new BinaryOpNode(node, op.value, right);
        }

        return node;
    }

    parseLogicalAnd() {
        let node = this.parseComparison();

        while (this.currentToken()?.value === '&&') {
            const op = this.currentToken(); this.advance();
            const right = this.parseComparison();
            node = new BinaryOpNode(node, op.value, right);
        }

        return node;
    }

    parseComparison() {
        let node = this.parseTerm();

        while (
            this.currentToken()?.type === 'OPERATOR' &&
            ['<', '>', '==', '!=', '<=', '>='].includes(this.currentToken().value)
        ) {
            const op = this.currentToken(); this.advance();
            const right = this.parseTerm();
            node = new BinaryOpNode(node, op.value, right);
        }

        return node;
    }

    parseTerm() {
        let node = this.parseFactor();

        while (
            this.currentToken()?.type === 'OPERATOR' &&
            ['+', '-'].includes(this.currentToken().value)
        ) {
            const op = this.currentToken(); this.advance();
            const right = this.parseFactor();
            node = new BinaryOpNode(node, op.value, right);
        }

        return node;
    }

    parseFactor() {
        let node = this.parsePrimary();

        while (
            this.currentToken()?.type === 'OPERATOR' &&
            ['*', '/'].includes(this.currentToken().value)
        ) {
            const op = this.currentToken(); this.advance();
            const right = this.parsePrimary();
            node = new BinaryOpNode(node, op.value, right);
        }

        return node;
    }

    parsePrimary() {
        const t = this.currentToken();
        if (!t) {
            this.error("Unexpected EOF");
            return null;
        }

        if (t.type === 'IDENTIFIER' && this.tokens[this.pos + 1]?.value === '(') {
            return this.parseFunctionCallExpression();
        }

        if (t.type === 'STRING_LIT') {
            this.advance();
            return new StringLiteralNode(t);
        }

        if (t.type.endsWith('_LIT')) {
            this.advance();
            return new NumberNode(t);
        }

        if (t.type === 'IDENTIFIER') {
            this.advance();
            return new IdentifierNode(t);
        }

        if (t.value === '(') {
            this.advance();
            const expr = this.parseExpression();
            this.expect('SEPARATOR', ')');
            return expr;
        }

        this.error("Invalid primary expression");
        return null;
    }

    parseFunctionCallExpression() {
        const nameToken = this.expect('IDENTIFIER');
        this.expect('SEPARATOR', '(');

        const args = [];
        if (this.currentToken()?.value !== ')') {
            args.push(this.parseExpression());

            while (this.currentToken()?.value === ',') {
                this.advance();
                args.push(this.parseExpression());
            }
        }

        this.expect('SEPARATOR', ')');
        return new FunctionCallNode(new IdentifierNode(nameToken), args);
    }
}
