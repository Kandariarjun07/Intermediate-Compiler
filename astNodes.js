// Base AST Node class
export class ASTNode { }

// Root of the program
export class ProgramNode extends ASTNode {
    constructor(children) {
        super();
        this.children = children;
    }
}

// Function definition: return type, name, params, and body
export class FunctionDefinitionNode extends ASTNode {
    constructor(returnType, name, params, body) {
        super();
        this.returnType = returnType;
        this.name = name;
        this.params = params;
        this.body = body;
    }
}

// Function parameter: type and name
export class ParamNode extends ASTNode {
    constructor(paramType, paramName) {
        super();
        this.paramType = paramType;
        this.paramName = paramName;
    }
}

// A block of statements (like function body or loops)
export class BlockNode extends ASTNode {
    constructor(statements) {
        super();
        this.statements = statements;
    }
}

// Variable declaration with optional value
export class VariableDeclarationNode extends ASTNode {
    constructor(varType, varName, value = null) {
        super();
        this.varType = varType;
        this.varName = varName;
        this.value = value;
    }
}

// Assignment: left-hand side and right-hand side
export class AssignmentNode extends ASTNode {
    constructor(left, right) {
        super();
        this.left = left;
        this.right = right;
    }
}

// Binary operation: left, operator, and right
export class BinaryOpNode extends ASTNode {
    constructor(left, op, right) {
        super();
        this.left = left;
        this.op = op;
        this.right = right;
    }
}

// Numeric literal node
export class NumberNode extends ASTNode {
    constructor(token) {
        super();
        this.token = token;
        this.value = token.value;
    }
}

// Identifier (variable or function name)
export class IdentifierNode extends ASTNode {
    constructor(token) {
        super();
        this.token = token;
        this.name = token.value;
    }
}

// String literal
export class StringLiteralNode extends ASTNode {
    constructor(token) {
        super();
        this.token = token;
        this.value = token.value;
    }
}

// Function call: function name and arguments
export class FunctionCallNode extends ASTNode {
    constructor(name, args) {
        super();
        this.name = name;
        this.args = args;
    }
}

// If-Else statement
export class IfStatementNode extends ASTNode {
    constructor(condition, ifBody, elseBody = null) {
        super();
        this.condition = condition;
        this.ifBody = ifBody;
        this.elseBody = elseBody;
    }
}

// For loop: initializer, condition, increment, and body
export class ForLoopNode extends ASTNode {
    constructor(init, condition, increment, body) {
        super();
        this.init = init;
        this.condition = condition;
        this.increment = increment;
        this.body = body;
    }
}

// Return statement
export class ReturnStatementNode extends ASTNode {
    constructor(value) {
        super();
        this.value = value;
    }
}

// Unary operation like !x, -x
export class UnaryOpNode extends ASTNode {
    constructor(op, arg) {
        super();
        this.op = op;
        this.arg = arg;
    }
}
