// astNodes.js
// This file defines the classes for each type of node in our Abstract Syntax Tree.

export class ASTNode { }
export class ProgramNode extends ASTNode { constructor(c) { super(); this.children = c; } }
export class FunctionDefinitionNode extends ASTNode { constructor(rt, n, p, b) { super(); this.returnType = rt; this.name = n; this.params = p; this.body = b; } }
export class ParamNode extends ASTNode { constructor(pt, pn) { super(); this.paramType = pt; this.paramName = pn; } }
export class BlockNode extends ASTNode { constructor(s) { super(); this.statements = s; } }
export class VariableDeclarationNode extends ASTNode { constructor(vt, vn, v = null) { super(); this.varType = vt; this.varName = vn; this.value = v; } }
export class AssignmentNode extends ASTNode { constructor(l, r) { super(); this.left = l; this.right = r; } }
export class BinaryOpNode extends ASTNode { constructor(l, o, r) { super(); this.left = l; this.op = o; this.right = r; } }
export class NumberNode extends ASTNode { constructor(t) { super(); this.token = t; this.value = t.value; } }
export class IdentifierNode extends ASTNode { constructor(t) { super(); this.token = t; this.name = t.value; } }
export class StringLiteralNode extends ASTNode { constructor(t) { super(); this.token = t; this.value = t.value; } }
export class FunctionCallNode extends ASTNode { constructor(n, a) { super(); this.name = n; this.args = a; } }
export class IfStatementNode extends ASTNode { constructor(c, ib, eb = null) { super(); this.condition = c; this.ifBody = ib; this.elseBody = eb; } }
export class ForLoopNode extends ASTNode { constructor(init, cond, inc, body) { super(); this.init = init; this.condition = cond; this.increment = inc; this.body = body; } }
export class ReturnStatementNode extends ASTNode { constructor(v) { super(); this.value = v; } }
export class UnaryOpNode extends ASTNode { constructor(op, arg) { super(); this.op = op; this.arg = arg; } }
