// lexer.js
// This file contains the Lexer class, which is responsible for tokenizing the source code.

export class Lexer {
    constructor(code) { this.code = code; }

    tokenize() {
        const tokens = [];
        const tokenSpecs = [
            { type: 'FLOAT_LIT', regex: /^\d+\.\d+/ }, { type: 'INT_LIT', regex: /^\d+/ },
            { type: 'STRING_LIT', regex: /^"[^"]*"/ },
            { type: 'KEYWORD', regex: /^\b(int|void|if|else|while|for|return|printf)\b/ },
            { type: 'IDENTIFIER', regex: /^[a-zA-Z_][a-zA-Z0-9_]*/ },
            { type: 'OPERATOR', regex: /^(==|!=|<=|>=|&&|\|\||[+\-*/=<>!])/ },
            { type: 'SEPARATOR', regex: /^[\(\)\{\};,]/ }, { type: 'MISMATCH', regex: /^./ },
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
