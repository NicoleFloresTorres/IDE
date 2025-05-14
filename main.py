import eel
import tkinter as tk
from tkinter import filedialog
import sys
import re
import json

# Initialize eel and point it to your web folder
eel.init('web')

# Global variable to store the currently opened file's path (if needed)
current_file_path = None

KEYWORDS = {
    "auto", "break", "case", "char", "const", "continue", "default", "do", "double", 
    "else", "enum", "extern", "float", "for", "goto", "if", "int", "long", "register", 
    "return", "short", "signed", "sizeof", "static", "struct", "switch", "typedef", 
    "union", "unsigned", "void", "volatile", "while", "main"
}

OPERATORS = {
    "++", "--", "->", "+", "-", "*", "/", "%", "=", "==", "!=", "<", ">", "<=", ">=", 
    "&&", "||", "!", "&", "|", "^", "~", "<<", ">>", "+=", "-=", "*=", "/=", "%=", 
    "&=", "|=", "^=", "<<=", ">>="
}

SYMBOLS = {
    "(", ")", "{", "}", "[", "]", ";", ",", ":", "?"
}

# Valid number pattern: integers, floats, scientific notation
FLOAT_PATTERN = r"\b\d+\.\d+\b"  # Solo números con un punto
INTEGER_PATTERN = r"\b\d+\b"  # Enteros
INVALID_FLOAT_PATTERN = r"\b\d+\.(?!\d)\b"  # Números con punto final sin dígitos



TOKEN_SPEC = [
    # Comentarios primero
    ("SINGLE_LINE_COMMENT", r"//.*?$"),
    ("MULTI_LINE_COMMENT", r"/\*[\s\S]*?\*/"),
    ("UNCLOSED_MULTI_LINE_COMMENT", r"/\*[\s\S]*?$"),
    
    # Números inválidos (punto final primero para prioridad)
    ("INVALID_FLOAT", INVALID_FLOAT_PATTERN),
    
    # Números válidos
    ("FLOAT", FLOAT_PATTERN),
    ("INTEGER", INTEGER_PATTERN),
    
    # Resto de los tokens...
    ("ID", r"\b[a-zA-Z_]\w*\b"),
    ("STRING", r'"([^"\\]|\\.)*"'),
    ("CHAR", r"'([^'\\]|\\.)'"),
    ("OP", r"|".join(re.escape(op) for op in sorted(OPERATORS, key=len, reverse=True))),
    ("SYMBOL", r"|".join(re.escape(sym) for sym in SYMBOLS)),
    ("WHITESPACE", r"[ \t\n]+"),
    
    # Punto solitario (para capturar puntos adicionales en números)
    ("DOT", r"\."),
    
    # Cualquier otro carácter inesperado
    ("MISMATCH", r"\S")
]

TOK_REGEX = re.compile(
    "|".join(f"(?P<{name}>{pattern})" for name, pattern in TOKEN_SPEC),
    re.DOTALL | re.MULTILINE
)

def validate_number(value):
    if value.count('.') > 1:
        return False
    if '.' in value:
        integer_part, fractional_part = value.split('.', 1)
        if not fractional_part.isdigit():
            return False
    return True

@eel.expose
def open_file():
    global current_file_path
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True)
    file_path = filedialog.askopenfilename(
        title="Open file",
        filetypes=[("Text Files", "*.txt"), ("All Files", "*.*")]
    )
    root.destroy()
    if file_path:
        current_file_path = file_path
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        return content
    return ""

@eel.expose
def save_file(content):
    global current_file_path
    if current_file_path:
        try:
            with open(current_file_path, "w", encoding="utf-8") as f:
                f.write(content)
            return "File saved successfully."
        except Exception as e:
            return f"Error saving file: {e}"
    else:
        return save_file_as(content)

@eel.expose
def save_file_as(content):
    global current_file_path
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True)
    file_path = filedialog.asksaveasfilename(
        title="Save file as",
        filetypes=[("Text Files", "*.txt"), ("All Files", "*.*")]
    )
    root.destroy()
    if file_path:
        print("Hola!")
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
            current_file_path = file_path
            return "File saved successfully."
        except Exception as e:
            return f"Error saving file: {e}"
    return "Save canceled."

@eel.expose
def close_app():
    print("Closing application...")
    sys.exit()

@eel.expose
def lex(code):
    tokens = []
    errors = []
    for match in TOK_REGEX.finditer(code):
        kind = match.lastgroup
        value = match.group()
        start = match.start()
        line_num = code.count("\n", 0, start) + 1
        line_start = code.rfind("\n", 0, start) + 1
        col_num = start - line_start + 1
        
        if kind == "WHITESPACE":
            continue
        if kind in ("SINGLE_LINE_COMMENT", "MULTI_LINE_COMMENT"):
            continue
        if kind == "ID" and value in KEYWORDS:
            kind = "KEYWORD"
        if kind == "UNCLOSED_MULTI_LINE_COMMENT":
            errors.append({
                "error_message": "Unclosed multi-line comment",
                "line": line_num,
                "column": col_num
            })
            continue
            
        # Manejar números con punto final (como "34.")
        if kind == "INVALID_FLOAT":
            errors.append({
                "error_message": f"Invalid number format: {value} (missing decimal digits)",
                "line": line_num,
                "column": col_num
            })
            continue
            
        # Manejar puntos adicionales en números (como "34.34.34")
        if kind == "DOT":
            # Verificar si el punto está entre dígitos (parte de un número inválido)
            prev_char = code[start-1] if start > 0 else ''
            next_char = code[start+1] if start+1 < len(code) else ''
            
            if prev_char.isdigit() and next_char.isdigit():
                errors.append({
                    "error_message": "Invalid additional decimal point in number : {}".format(value),
                    "line": line_num,
                    "column": col_num
                })
                continue
            else:
                # Si no está entre dígitos, es un operador o símbolo
                kind = "SYMBOL"
                
        if kind == "MISMATCH":
            errors.append({
                "error_message": f"Unexpected character: {value}",
                "line": line_num,
                "column": col_num
            })
            continue
            
        tokens.append({
            "token_type": kind,
            "lexeme": value,
            "line": line_num,
            "column": col_num
        })
    
    return tokens, errors

if __name__ == "__main__":
    eel.start("index.html")