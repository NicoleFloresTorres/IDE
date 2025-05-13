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
NUMBER_PATTERN = r"\b\d+(?:\.\d+)?(?:[eE][-+]?\d+)?\b"

INTEGER_PATTERN = r"\b\d+\b"
FLOAT_PATTERN = r"\b(?:\d+\.\d+|\.\d+)\b"


# Patterns for invalid number formats:
INVALID_NUMBER_PATTERNS = [
    # Multiple dots (2 or more) in the number
    r"\b\d+(?:\.\d+){2,}\b",
    # Trailing dot without digits (e.g., '34.' or '34.+')
    r"\b\d+\.(?!\d)"
]

TOKEN_SPEC = [
    # Put comments first to ensure they take precedence over operators
    ("SINGLE_LINE_COMMENT", r"//.*?$"),
    ("MULTI_LINE_COMMENT", r"/\*[\s\S]*?\*/"),
    ("UNCLOSED_MULTI_LINE_COMMENT", r"/\*[\s\S]*?$"),
    ("INVALID_NUMBER_MULTI", INVALID_NUMBER_PATTERNS[0]),
    ("INVALID_NUMBER_TRAILING", INVALID_NUMBER_PATTERNS[1]),
    ("FLOAT", FLOAT_PATTERN),
    ("INTEGER", INTEGER_PATTERN),
    ("ID", r"\b[a-zA-Z_]\w*\b"),
    ("STRING", r'"([^"\\]|\\.)*"'),
    ("CHAR", r"'([^'\\]|\\.)'"),
    ("OP", r"|".join(re.escape(op) for op in sorted(OPERATORS, key=len, reverse=True))),
    ("SYMBOL", r"|".join(re.escape(sym) for sym in SYMBOLS)),
    ("WHITESPACE", r"[ \t\n]+"),
    # Catch any other unexpected characters
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
        if kind in ("INVALID_NUMBER_MULTI", "INVALID_NUMBER_TRAILING"):
            errors.append({
                "error_message": f"Invalid number format: {value}",
                "line": line_num,
                "column": col_num
            })
            continue
        if kind in ("FLOAT", "INTEGER") and not validate_number(value):
            errors.append({
                "error_message": f"Invalid {kind.lower()} format: {value}",
                "line": line_num,
                "column": col_num
            })
            continue
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
