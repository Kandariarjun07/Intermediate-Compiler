# ⚡ C Code Dissector (Compiler Frontend)

Welcome! You've stumbled upon a handcrafted, artisanal **Compiler Frontend** written entirely in vanilla JavaScript.

No magic black boxes here. Just pure code transforming your C-like syntax into something computers (or at least virtual machines) can potentially understand.

---

## 🧐 What is this?

Think of this as an interactive X-Ray for code. It takes a snippet of C code and dissects it right before your eyes in the browser.

It performs the classic "Compiler Dance":

1.  **Lexing (The Chopper 🪓):** Chews up your text code into bite-sized tokens.
2.  **Parsing (The Architect 📐):** Arranges those tokens into a meaningful structure called an Abstract Syntax Tree (AST).
3.  **Semantic Analysis (The Lawyer ⚖️):** Checks if your code actually follows the rules (e.g., "Hey, you never declared that variable!").
4.  **TAC Generation (The Translator 🗣️):** Spits out **Three-Address Code** – the assembly-like language that intermediate optimizers love.

## 🚀 Experience It

Zero installation. Zero backend. Zero npm install nonsense.

1.  Clone this repo (or just download the zip).
2.  Double-click `index.html`.
3.  **Boom.** You're compiling.

## ✨ Features

- **👀 Live Tokenizer:** Watch your code get smashed into `int`, `main`, `(`, `)` tokens real-time.
- **🌳 Recursive Descent Parser:** Old school, reliable, builds a neat tree structure behind the scenes.
- **🛡️ Scope Police:** Handles nested scopes like a boss. Tries to access a local variable from the global scope? _BEEEP_ Error.
- **⚙️ The TAC Factory:** Generates linear, assembly-style code (quadruples) that looks super technical and cool.
- **🎨 Modern UI:** A clean interface because we are developers and we appreciate nice things.

## 🎮 Playground (What input works?)

This isn't GCC, but it tries its best! It speaks a specific dialect of C.

**Try pasting this into the editor:**

```c
int square(int x) {
    return x * x;
}

int main() {
    int count = 5;
    int result = 0;

    // It handles loops!
    for (int i = 0; i < count; i = i + 1) {
        if (i > 2) {
            result = result + square(i);
        }
    }

    return result;
}
```

**Supported Vocabulary:**

- **Types:** `int`, `void`
- **Control:** `if`, `else`, `while`, `for`, `return`
- **Math & Logic:** `+`, `-`, `*`, `/`, `==`, `!=`, `<`, `>`, `&&`, `||`
- **Output:** `printf("hello", val)`

## 📁 Under the Hood

If you're curious how the sausage is made:

- `main.js`: The brain. Ties the UI to the compiler logic.
- `lexer.js`: Regular expressions galore. Matches patterns to find tokens.
- `parser.js`: Loops through tokens to ensure your syntax is valid.
- `semantic.js`: Manages symbol tables (who is declared where).
- `tac.js`: Walks the tree and generates the intermediate code.

## 🤝 Contributing

Found a bug? Want to add pointer arithmetic (brave soul)? Feel free to open a Pull Request!

---

_Built with ❤️, JavaScript, and a lot of `console.log`_
