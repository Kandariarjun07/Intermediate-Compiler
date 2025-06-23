// tac.js
// This file contains the TACGenerator class for generating Three Address Code.

export class TACGenerator {
    constructor() {
        this.tempCounter = 0;
        this.labelCounter = 0;
        this.code = [];
    }

    newTemp() {
        return `t${this.tempCounter++}`;
    }

    newLabel() {
        return `L${this.labelCounter++}`;
    }

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

    visitProgramNode(node) {
        node.children.forEach(child => this.visit(child));
    }

    visitFunctionDefinitionNode(node) {
        this.emit(`${node.name.name}`);
        this.visit(node.body);
    }

    visitBlockNode(node) {
        node.statements.forEach(stmt => this.visit(stmt));
    }

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

    visitNumberNode(node) {
        return node.value.toString();
    }

    visitIdentifierNode(node) {
        return node.name;
    }

    visitStringLiteralNode(node) {
        return node.value;
    }

    visitFunctionCallNode(node) {
        // Generate code for arguments
        const argTemps = node.args.map(arg => this.visit(arg));

        // Emit parameter passing
        argTemps.forEach((argTemp, index) => {
            this.emit('param', argTemp);
        });

        // Emit function call
        const resultTemp = this.newTemp();
        this.emit('call', node.name.name, argTemps.length.toString(), resultTemp);
        return resultTemp;
    }

    visitIfStatementNode(node) {
        const conditionTemp = this.visit(node.condition);
        const elseLabel = this.newLabel();
        const endLabel = this.newLabel();

        this.emit('ifFalse', conditionTemp, `goto ${elseLabel}`);
        this.visit(node.ifBody);
        this.emit('goto', endLabel);

        this.emit(elseLabel);
        if (node.elseBody) {
            this.visit(node.elseBody);
        }
        this.emit(endLabel);
    }

    visitForLoopNode(node) {
        const startLabel = this.newLabel();
        const endLabel = this.newLabel();

        // Initialize
        this.visit(node.init);

        // Loop start
        this.emit(startLabel);

        // Condition check
        const conditionTemp = this.visit(node.condition);
        this.emit('ifFalse', conditionTemp, `goto ${endLabel}`);

        // Loop body
        this.visit(node.body);

        // Increment
        this.visit(node.increment);

        // Jump back to condition
        this.emit('goto', startLabel);

        // End label
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
