// --- Utility ---
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
// --- Lexer ---
class Lexer {
    constructor(code) { this.code = code; }
    tokenize() {
        const tokens = [];
        const tokenSpecs = [
            { type: 'FLOAT_LIT', regex: /^\d+\.\d+/ },
            { type: 'INT_LIT', regex: /^\d+/ },
            { type: 'STRING_LIT', regex: /^"[^"]*"/ },
            { type: 'KEYWORD', regex: /^\b(int|void|if|else|while|for|return|printf)\b/ },
            { type: 'IDENTIFIER', regex: /^[a-zA-Z_][a-zA-Z0-9_]*/ },
            { type: 'OPERATOR', regex: /^(==|!=|<=|>=|&&|\|\||[+\-*/=<>!])/ },
            { type: 'SEPARATOR', regex: /^[\(\)\{\};,]/ },
            { type: 'MISMATCH', regex: /^./ },
        ];
        let remainingCode = this.code;
        let line = 1, col = 1;
        while (remainingCode.length > 0) {
            const whitespaceMatch = remainingCode.match(/^\s+/);
            if (whitespaceMatch) {
                const ws = whitespaceMatch[0];
                const newlines = (ws.match(/\n/g) || []).length;
                if (newlines > 0) { line += newlines; col = ws.length - ws.lastIndexOf('\n'); }
                else { col += ws.length; }
                remainingCode = remainingCode.substring(ws.length);
                if (remainingCode.length === 0) break;
            }
            let matched = false;
            for (const spec of tokenSpecs) {
                const match = remainingCode.match(spec.regex);
                if (match) {
                    const value = match[0];
                    tokens.push({ type: spec.type, value, line, col });
                    col += value.length;
                    remainingCode = remainingCode.substring(value.length);
                    matched = true;
                    break;
                }
            }
            if (!matched && remainingCode.length > 0) {
                throw new Error("Lexer error: " + remainingCode.substring(0, 10));
            }
        }
        return tokens;
    }
}
// --- AST Nodes ---
class ASTNode { }
class ProgramNode extends ASTNode { constructor(c) { super(); this.children = c; } }
class FunctionDefinitionNode extends ASTNode { constructor(rt, n, p, b) { super(); this.returnType = rt; this.name = n; this.params = p; this.body = b; } }
class ParamNode extends ASTNode { constructor(pt, pn) { super(); this.paramType = pt; this.paramName = pn; } }
class BlockNode extends ASTNode { constructor(s) { super(); this.statements = s; } }
class VariableDeclarationNode extends ASTNode { constructor(vt, vn, v = null) { super(); this.varType = vt; this.varName = vn; this.value = v; } }
class AssignmentNode extends ASTNode { constructor(l, r) { super(); this.left = l; this.right = r; } }
class BinaryOpNode extends ASTNode { constructor(l, o, r) { super(); this.left = l; this.op = o; this.right = r; } }
class NumberNode extends ASTNode { constructor(t) { super(); this.token = t; this.value = t.value; } }
class IdentifierNode extends ASTNode { constructor(t) { super(); this.token = t; this.name = t.value; } }
class StringLiteralNode extends ASTNode { constructor(t) { super(); this.token = t; this.value = t.value; } }
class FunctionCallNode extends ASTNode { constructor(n, a) { super(); this.name = n; this.args = a; } }
class IfStatementNode extends ASTNode { constructor(c, ib, eb = null) { super(); this.condition = c; this.ifBody = ib; this.elseBody = eb; } }
class ForLoopNode extends ASTNode { constructor(init, cond, inc, body) { super(); this.init = init; this.condition = cond; this.increment = inc; this.body = body; } }
class ReturnStatementNode extends ASTNode { constructor(v) { super(); this.value = v; } }
// --- Parser ---
class Parser {
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
        }
        this.error('Invalid statement'); return null;
    }
    parseVariableDeclaration() { const t = this.expect('KEYWORD'); const n = this.expect('IDENTIFIER'); if (!t || !n) return null; let v = null; if (this.currentToken()?.value === '=') { this.advance(); v = this.parseExpression(); } this.expect('SEPARATOR', ';'); return new VariableDeclarationNode(t.value, new IdentifierNode(n), v); }
    parseAssignment(noSemicolon = false) { const l = new IdentifierNode(this.expect('IDENTIFIER')); this.expect('OPERATOR', '='); const r = this.parseExpression(); if (!noSemicolon) this.expect('SEPARATOR', ';'); return new AssignmentNode(l, r); }
    parseFunctionCallStatement() { const n = this.currentToken(); if (n.type !== 'IDENTIFIER' && n.type !== 'KEYWORD') { this.error('Expected function name'); return null; } this.advance(); this.expect('SEPARATOR', '('); const a = []; if (this.currentToken()?.value !== ')') { a.push(this.parseExpression()); while (this.currentToken()?.value === ',') { this.advance(); a.push(this.parseExpression()); } } this.expect('SEPARATOR', ')'); this.expect('SEPARATOR', ';'); return new FunctionCallNode(new IdentifierNode(n), a); }
    parseIfStatement() { this.expect('KEYWORD', 'if'); this.expect('SEPARATOR', '('); const c = this.parseExpression(); this.expect('SEPARATOR', ')'); const ib = this.parseBlock(); let eb = null; if (this.currentToken()?.value === 'else') { this.advance(); eb = this.parseBlock(); } return new IfStatementNode(c, ib, eb); }
    parseForLoop() {
        this.expect('KEYWORD', 'for'); this.expect('SEPARATOR', '(');
        const init = this.parseVariableDeclaration();
        const cond = this.parseExpression(); this.expect('SEPARATOR', ';');
        const inc = this.parseAssignment(true);
        this.expect('SEPARATOR', ')'); const body = this.parseBlock();
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
        const t = this.currentToken(); if (!t) { this.error('Unexpected EOF'); return null; }
        if (t.type === 'IDENTIFIER' && this.tokens[this.pos + 1]?.value === '(') return this.parseFunctionCallExpression();
        if (t.type === 'STRING_LIT') { this.advance(); return new StringLiteralNode(t); }
        if (t.type.endsWith('_LIT')) { this.advance(); return new NumberNode(t); }
        if (t.type === 'IDENTIFIER') { this.advance(); return new IdentifierNode(t); }
        if (t.value === '(') { this.advance(); const n = this.parseExpression(); this.expect('SEPARATOR', ')'); return n; }
        this.error('Invalid primary expression'); return null;
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
// --- Semantic Analyzer ---
class SymbolTable {
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
class SemanticAnalyzer {
    constructor() {
        this.globalScope = new SymbolTable('global');
        this.currentScope = this.globalScope;
        this.scopes = [this.globalScope];
        this.errors = [];
        this.globalScope.define('printf', 'function');
    }
    error(message, node) {
        this.errors.push({ message: `Semantic Error: ${message}`, line: node.token?.line });
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
// --- TAC Generator ---
class TACGenerator {
    constructor() { this.tempCounter = 0; this.labelCounter = 0; this.code = []; }
    newTemp() { return `t${this.tempCounter++}`; }
    newLabel() { return `L${this.labelCounter++}`; }
    emit(op, arg1 = null, arg2 = null, result = null) {
        let instruction = '';
        if (result && arg2) {
            instruction = `${result} = ${arg1} ${op} ${arg2}`;
        } else if (result && arg1) {
            instruction = `${result} = ${arg1}`;
        } else if (arg1) {
            instruction = `${op} ${arg1}`;
        } else {
            instruction = `${op}:`;
        }
        this.code.push(instruction);
    }
    generate(ast) {
        this.tempCounter = 0;
        this.labelCounter = 0;
        this.code = [];
        this.visit(ast);
        return this.code;
    }
    visit(node) {
        if (!node) return null;
        const methodName = `visit${node.constructor.name}`;
        if (this[methodName]) {
            return this[methodName](node);
        }
        return null;
    }
    visitProgramNode(node) { node.children.forEach(child => this.visit(child)); }
    visitFunctionDefinitionNode(node) {
        this.emit(`func begin ${node.name.name}`);
        this.visit(node.body);
        this.emit(`func end ${node.name.name}`);
    }
    visitBlockNode(node) { node.statements.forEach(stmt => this.visit(stmt)); }
    visitVariableDeclarationNode(node) {
        if (node.value) {
            const valueTemp = this.visit(node.value);
            this.emit('=', valueTemp, null, node.varName.name);
        }
    }
    visitAssignmentNode(node) {
        const rightTemp = this.visit(node.right);
        this.emit('=', rightTemp, null, node.left.name);
        return node.left.name;
    }
    visitBinaryOpNode(node) {
        const leftTemp = this.visit(node.left);
        const rightTemp = this.visit(node.right);
        const resultTemp = this.newTemp();
        this.emit(node.op, leftTemp, rightTemp, resultTemp);
        return resultTemp;
    }
    visitNumberNode(node) { return node.value.toString(); }
    visitIdentifierNode(node) { return node.name; }
    visitStringLiteralNode(node) { return node.value; }
    visitFunctionCallNode(node) {
        const argTemps = node.args.map(arg => this.visit(arg));
        argTemps.forEach((argTemp, index) => { this.emit('param', argTemp); });
        const resultTemp = this.newTemp();
        this.emit('call', node.name.name, argTemps.length.toString(), resultTemp);
        return resultTemp;
    }
    visitIfStatementNode(node) {
        const conditionTemp = this.visit(node.condition);
        const elseLabel = this.newLabel();
        const endLabel = this.newLabel();
        this.emit('if_false', conditionTemp, `goto ${elseLabel}`);
        this.visit(node.ifBody);
        this.emit('goto', endLabel);
        this.emit(elseLabel);
        if (node.elseBody) { this.visit(node.elseBody); }
        this.emit(endLabel);
    }
    visitForLoopNode(node) {
        const startLabel = this.newLabel();
        const endLabel = this.newLabel();
        this.visit(node.init);
        this.emit(startLabel);
        const conditionTemp = this.visit(node.condition);
        this.emit('if_false', conditionTemp, `goto ${endLabel}`);
        this.visit(node.body);
        this.visit(node.increment);
        this.emit('goto', startLabel);
        this.emit(endLabel);
    }
    visitReturnStatementNode(node) {
        if (node.value) {
            const valueTemp = this.visit(node.value);
            this.emit('return', valueTemp);
        } else {
            this.emit('return');
        }
    }
}
// --- UI Logic ---
const analyzeBtn = document.getElementById('analyzeBtn');
const btnText = document.getElementById('btnText');
const codeInput = document.getElementById('codeInput');
const errorPanel = document.getElementById('error-panel');
const errorContent = document.getElementById('error-content');
const tokensContent = document.getElementById('tokens-content');
const tacContent = document.getElementById('tac-content');
const symbolTableContent = document.getElementById('symbol-table-content');
function displayErrors(errors) {
    errorPanel.classList.add('visible');
    errorContent.innerHTML = errors.map(err => `<div class="error-message">${escapeHtml(err.message)}</div>`).join('');
    tokensContent.innerHTML = '<div class="tac-line" style="text-align:center;opacity:0.7;">Analysis halted due to errors.</div>';
    tacContent.innerHTML = '<div class="tac-line" style="text-align:center;opacity:0.7;">Analysis halted due to errors.</div>';
    symbolTableContent.innerHTML = '<div class="tac-line" style="text-align:center;opacity:0.7;">Analysis halted due to errors.</div>';
}
function hideErrors() {
    errorPanel.classList.remove('visible');
    errorContent.innerHTML = '';
}
function displayResults(tokens, tacLines, scopes, errors) {
    if (errors.length > 0) {
        displayErrors(errors);
        return;
    }
    hideErrors();
    // Tokens Table
    let tokenHtml = '<table><thead><tr><th>Type</th><th>Value</th></tr></thead><tbody>';
    tokens.forEach(t => {
        tokenHtml += `<tr><td class="token-type">${t.type}</td><td class="token-value">${escapeHtml(t.value)}</td></tr>`;
    });
    tokenHtml += '</tbody></table>';
    tokensContent.innerHTML = tokenHtml;
    // Symbol Table
    let symbolTableHtml = '';
    scopes.forEach(scope => {
        const symbols = Object.keys(scope.symbols);
        if (symbols.length > 0) {
            symbolTableHtml += `<div class="scope-title">Scope: ${escapeHtml(scope.name)}</div>`;
            symbolTableHtml += '<table><thead><tr><th>Identifier</th><th>Type</th></tr></thead><tbody>';
            symbols.forEach(symbolName => {
                const symbol = scope.symbols[symbolName];
                symbolTableHtml += `<tr><td class="identifier">${escapeHtml(symbolName)}</td><td class="type">${escapeHtml(symbol.type)}</td></tr>`;
            });
            symbolTableHtml += '</tbody></table>';
        }
    });
    symbolTableContent.innerHTML = symbolTableHtml;
    // TAC
    let tacHtml = '';
    tacLines.forEach((line, index) => {
        tacHtml += `<div class="tac-line"><span class="tac-lineno">${(index + 1).toString().padStart(2, '0')}:</span>${escapeHtml(line)}</div>`;
    });
    tacContent.innerHTML = tacHtml;
}
function runAnalysis() {
    const preprocessedCode = codeInput.value.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    analyzeBtn.disabled = true;
    btnText.innerHTML = '<span style="display:inline-block;width:18px;height:18px;border:3px solid #fff3;border-radius:50%;border-top-color:#fff;animation:spin 1s linear infinite;margin-right:8px;vertical-align:middle;"></span>Analyzing...';
    setTimeout(() => {
        try {
            tokensContent.innerHTML = '';
            tacContent.innerHTML = '';
            symbolTableContent.innerHTML = '';
            hideErrors();
            const lexer = new Lexer(preprocessedCode);
            const tokens = lexer.tokenize();
            const parser = new Parser([...tokens]);
            const { ast, errors: syntaxErrors } = parser.parse();
            let semanticErrors = [], intermediateCode = [], scopes = [];
            if (syntaxErrors.length === 0 && ast) {
                const semanticAnalyzer = new SemanticAnalyzer();
                const analysisResult = semanticAnalyzer.analyze(ast);
                semanticErrors = analysisResult.errors;
                scopes = analysisResult.scopes;
                if (semanticErrors.length === 0) {
                    const tacGenerator = new TACGenerator();
                    intermediateCode = tacGenerator.generate(ast);
                }
            }
            displayResults(tokens, intermediateCode, scopes, [...syntaxErrors, ...semanticErrors]);
        } catch (error) {
            displayErrors([{ message: `Critical Error: ${error.message}` }]);
        } finally {
            analyzeBtn.disabled = false;
            btnText.innerText = 'Analyze';
        }
    }, 400);
}
// Set default code
window.addEventListener('DOMContentLoaded', () => {
    codeInput.value = `int square(int n) {
    return n * n;
}

int main() {
    int x = 5;
    
    for (int i = 0; i < 2; i = i + 1) {
        int y = square(i);
        printf("val", y);
    }
    
    return x;
}`;
    runAnalysis();
});
analyzeBtn.addEventListener('click', runAnalysis);
