import eel
import tkinter as tk
from tkinter import filedialog
import sys
import re
import json
import os

# Initialize eel and point it to your web folder
eel.init('web')

# Global variable to store the currently opened file's path (if needed)
current_file_path = None

KEYWORDS = {
    "auto", "break", "case", "char", "const", "continue", "default", "do", "double", 
    "else", "enum", "extern", "float", "for", "goto", "if", "int", "long", "register", 
    "return", "short", "signed", "sizeof", "static", "struct", "switch", "typedef", 
    "union", "unsigned", "void", "volatile", "while", "do"
}

OPERATORS = {
    "++", "--", "->", "+", "-", "*", "/", "%", "=", "==", "!=", "<", ">", "<=", ">=", 
    "&&", "||", "!", "&", "|", "^", "~", "<<", ">>", "+=", "-=", "*=", "/=", "%=", 
    "&=", "|=", "^=", "<<=", ">>="
}

SYMBOLS = {
    "(", ")", "{", "}", "[", "]", ";", ",", ":", "?"
}

# Valid number pattern: integers, floats
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
        
        if kind in ("SINGLE_LINE_COMMENT", "MULTI_LINE_COMMENT", "WHITESPACE"):
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
        if kind == "INVALID_FLOAT":
            errors.append({
                "error_message": f"Invalid number format: {value} (missing decimal digits)",
                "line": line_num,
                "column": col_num
            })
            continue
        if kind == "DOT":
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

    with open("tokens.txt", "w", encoding="utf-8") as token_file:
        for token in tokens:
            token_file.write(f"{token['token_type']} {token['lexeme']} Linea:{token['line']} Col:{token['column']}\n")

    with open("errores.txt", "w", encoding="utf-8") as error_file:
        for error in errors:
            error_file.write(f"Error: {error['error_message']} Linea:{error['line']} Col:{error['column']}\n")

    return tokens, errors

class Parser:
    INVALID_KEYWORDS = {'end', 'until', 'then'}  # Add other non-C keywords here
    def __init__(self, tokens, errors):
        self.tokens = tokens
        self.errors = errors
        self.current_token_index = 0
        self.current_token = tokens[0] if tokens else None
        self.in_panic_mode = False
        self.error_count = 0
        
    def advance(self):
        self.current_token_index += 1
        if self.current_token_index < len(self.tokens):
            self.current_token = self.tokens[self.current_token_index]
        else:
            self.current_token = None
            
    def match(self, token_type, lexeme=None):
        if self.current_token and self.current_token['token_type'] == token_type:
            if lexeme is None or self.current_token['lexeme'] == lexeme:
                token = self.current_token
                self.advance()
                return token
        return None
        
    def consume(self, token_type, lexeme=None, error_message="Syntax error"):
        token = self.match(token_type, lexeme)
        if not token:
            self.add_error(error_message)
            # Return a placeholder token to prevent crashes
            return {
                "lexeme": "<missing>",
                "token_type": "MISSING",
                "line": self.current_token['line'] if self.current_token else -1,
                "column": self.current_token['column'] if self.current_token else -1
            }
        return token
    
    def add_error(self, message):
        """Add an error and potentially enter panic mode"""
        if not self.in_panic_mode:
            if self.current_token:
                self.errors.append({
                    "error_message": f"{message}. Found '{self.current_token['lexeme']}'",
                    "line": self.current_token['line'],
                    "column": self.current_token['column']
                })
            else:
                self.errors.append({
                    "error_message": f"{message}. Unexpected end of input",
                    "line": -1,
                    "column": -1
                })
            self.error_count += 1
            
            # Enter panic mode if too many consecutive errors
            if self.error_count > 3:
                self.in_panic_mode = True
    
    def synchronize(self):
        """Synchronize parser after an error by finding a safe point"""
        self.in_panic_mode = False
        self.error_count = 0
        
        # Add invalid keywords to synchronization points
        while self.current_token:
            if self.current_token['token_type'] == 'SYMBOL' and self.current_token['lexeme'] == ';':
                self.advance()
                return
            elif self.current_token['token_type'] == 'SYMBOL' and self.current_token['lexeme'] in ['{', '}']:
                return
            # Add check for invalid keywords
            elif self.current_token['lexeme'] in self.INVALID_KEYWORDS:
                self.advance()
                return
            elif self.current_token['token_type'] == 'KEYWORD' and self.current_token['lexeme'] in ['if', 'while', 'for', 'return', 'int', 'float', 'char', 'void']:
                return
            self.advance()
    
    def parse(self):
        return self.parse_program()
    
    def parse_program(self):
        declarations = []
        while self.current_token:
            try:
                if self.in_panic_mode:
                    self.synchronize()
                if not self.current_token:
                    break

                # Detect 'main {' as starting point
                if self.current_token['token_type'] == 'ID' and self.current_token['lexeme'] == 'main':
                    if self.lookahead(1, 'SYMBOL', '{'):
                        declarations.append(self.parse_starting_point())
                        continue

                if self.match('KEYWORD', 'int') or self.match('KEYWORD', 'float') or \
                self.match('KEYWORD', 'char') or self.match('KEYWORD', 'void'):
                    # Back up to the type keyword
                    self.current_token_index -= 1
                    self.current_token = self.tokens[self.current_token_index]

                    if self.lookahead(1, 'ID') and self.lookahead(2, 'SYMBOL', '('):
                        declarations.append(self.parse_function_definition())
                    else:
                        declarations.append(self.parse_declaration())
                else:
                    self.add_error("Unexpected token in global scope")
                    self.synchronize()
            except Exception as e:
                print(f"Parser exception: {e}")
                self.synchronize()
        return {"type": "program", "body": declarations}
    
    def lookahead(self, offset, token_type=None, lexeme=None):
        index = self.current_token_index + offset
        if index < len(self.tokens):
            token = self.tokens[index]
            if token_type and token['token_type'] != token_type:
                return False
            if lexeme and token['lexeme'] != lexeme:
                return False
            return True
        return False
    
    def parse_function_definition(self):
        return_type = self.consume('KEYWORD', None, "Expected type specifier")
        name = self.consume('ID', None, "Expected function name")
        self.consume('SYMBOL', '(', "Expected '(' after function name")
        
        params = []
        if not self.match('SYMBOL', ')'):
            params = self.parse_parameter_list()
            self.consume('SYMBOL', ')', "Expected ')' after parameters")
        
        body = self.parse_compound_statement()
        
        return {
            "type": "function_definition",
            "name": name['lexeme'],
            "return_type": return_type['lexeme'],
            "params": params,
            "body": body
        }
    
    def parse_parameter_list(self):
        params = []
        while True:
            param_type = self.consume('KEYWORD', None, "Expected parameter type")
            param_name = self.consume('ID', None, "Expected parameter name")
            params.append({
                "type": "parameter",
                "data_type": param_type['lexeme'],
                "name": param_name['lexeme']
            })
            
            if not self.match('SYMBOL', ','):
                break
                
        return params
    
    def parse_compound_statement(self):
        self.consume('SYMBOL', '{', "Expected '{'")
        body = []
        while self.current_token and self.current_token['lexeme'] != '}':
            try:
                stmt = self.parse_statement()
                if stmt:
                    body.append(stmt)
            except Exception as e:
                print(f"Error parsing statement: {e}")
                self.synchronize()
        self.consume('SYMBOL', '}', "Expected '}'")
        return {"type": "compound_statement", "body": body}
    
    def parse_declaration(self, require_semicolon=True):  # Add require_semicolon parameter
        decl_type = self.consume('KEYWORD', None, "Expected type specifier")
        
        # Parse a list of declarators (variables) separated by commas
        declarations = []
        while True:
            name = self.consume('ID', None, "Expected variable name")
            
            # Check for array declaration
            array_size = None
            if self.match('SYMBOL', '['):
                array_size = self.parse_expression()
                self.consume('SYMBOL', ']', "Expected ']' after array size")
            
            initializer = None
            if self.match('OP', '='):
                initializer = self.parse_expression()
                
            declarations.append({
                "name": name['lexeme'],
                "array_size": array_size,
                "initializer": initializer
            })
            
            # Check for more variables
            if not self.match('SYMBOL', ','):
                break
                
        if require_semicolon:  # Conditionally consume semicolon
            self.consume('SYMBOL', ';', "Expected ';' after declaration")
        
        return {
            "type": "declaration",
            "data_type": decl_type['lexeme'],
            "declarations": declarations
        }
    
    def parse_statement(self):
        if not self.current_token:
            return None

        if self.current_token['token_type'] == 'ID' and self.current_token['lexeme'] in self.INVALID_KEYWORDS:
            lexeme = self.current_token['lexeme']
            self.add_error(f"Invalid keyword: '{lexeme}'")
            self.advance()
            return None
            
        if self.current_token['token_type'] == 'SYMBOL' and self.current_token['lexeme'] == '{':
            # Don't advance here, let parse_compound_statement handle it
            return self.parse_compound_statement()
        elif self.current_token['token_type'] == 'KEYWORD':
            if self.current_token['lexeme'] == 'if':
                return self.parse_if_statement()
            elif self.current_token['lexeme'] == 'do':  # Add this
                return self.parse_do_while_statement()  # Add this
            elif self.current_token['lexeme'] == 'while':
                return self.parse_while_statement()
            elif self.current_token['lexeme'] == 'for':
                return self.parse_for_statement()
            elif self.current_token['lexeme'] == 'return':
                return self.parse_return_statement()
            elif self.current_token['lexeme'] in ['int', 'float', 'char', 'void']:
                return self.parse_declaration()
            else:
                # Skip unknown keywords and try to continue
                self.add_error(f"Unexpected keyword '{self.current_token['lexeme']}'")
                self.advance()
                return None
        else:
            return self.parse_expression_statement()

    def parse_do_while_statement(self):
        start_line = self.current_token['line']
        self.advance()  # consume 'do'
        
        # Parse the body (statement or compound statement)
        body = self.parse_statement()
        
        # Expect 'while' keyword after body
        self.consume('KEYWORD', 'while', "Expected 'while' after do-while body")
        
        # Parse condition in parentheses
        self.consume('SYMBOL', '(', "Expected '(' after 'while'")
        condition = self.parse_expression()
        self.consume('SYMBOL', ')', "Expected ')' after condition")
        
        # Consume the terminating semicolon
        self.consume('SYMBOL', ';', "Expected ';' after do-while condition")
        
        return {
            "type": "do_while_statement",
            "body": body,
            "condition": condition,
            "line": start_line
        }
    
    def parse_if_statement(self):
        self.advance()  # consume 'if'
        
        # Check for C-style condition with parentheses
        has_parens = self.match('SYMBOL', '(')
        condition = self.parse_expression()
        if has_parens:
            self.consume('SYMBOL', ')', "Expected ')' after condition")
        
        # Skip non-C keywords like 'then'
        if self.current_token and self.current_token['lexeme'] == 'then':
            self.add_error("C syntax doesn't use 'then' keyword")
            self.advance()
        
        then_branch = self.parse_statement()
        else_branch = None
        
        # Skip 'else' if present
        if self.current_token and self.current_token['token_type'] == 'KEYWORD' and self.current_token['lexeme'] == 'else':
            self.advance()
            else_branch = self.parse_statement()
        
        # Skip non-C keywords like 'end'
        if self.current_token and self.current_token['lexeme'] == 'end':
            self.add_error("C syntax doesn't use 'end' keyword")
            self.advance()
            
        return {
            "type": "if_statement",
            "condition": condition,
            "then_branch": then_branch,
            "else_branch": else_branch
        }
    
    def parse_while_statement(self):
        self.advance()  # consume 'while'
        
        has_parens = self.match('SYMBOL', '(')
        condition = self.parse_expression()
        if has_parens:
            self.consume('SYMBOL', ')', "Expected ')' after condition")
        
        body = self.parse_statement()
        
        return {
            "type": "while_statement",
            "condition": condition,
            "body": body
        }
    
    def parse_for_statement(self):
        self.advance()  # consume 'for'
        self.consume('SYMBOL', '(', "Expected '(' after 'for'")
        
        init = None
        if not (self.current_token and self.current_token['token_type'] == 'SYMBOL' and self.current_token['lexeme'] == ';'):
            init = self.parse_for_init()
        self.consume('SYMBOL', ';', "Expected ';' after for initializer")
            
        condition = None
        if not (self.current_token and self.current_token['token_type'] == 'SYMBOL' and self.current_token['lexeme'] == ';'):
            condition = self.parse_expression()
        self.consume('SYMBOL', ';', "Expected ';' after condition")
        
        update = None
        if not (self.current_token and self.current_token['token_type'] == 'SYMBOL' and self.current_token['lexeme'] == ')'):
            update = self.parse_for_update()  # Use special method for update expression
        self.consume('SYMBOL', ')', "Expected ')' after for clauses")
        
        body = self.parse_statement()
        
        return {
            "type": "for_statement",
            "init": init,
            "condition": condition,
            "update": update,
            "body": body
        }

    def parse_shift(self):
        expr = self.parse_additive()
        
        while self.current_token and self.current_token['token_type'] == 'OP' and \
            self.current_token['lexeme'] in ['<<', '>>']:
            operator = self.current_token['lexeme']
            self.advance()
            right = self.parse_additive()
            expr = {
                "type": "binary_expression",
                "operator": operator,
                "left": expr,
                "right": right
            }
            
        return expr
        
    def parse_additive(self):
        expr = self.parse_shift()  # Changed from parse_multiplicative()
        
        while self.current_token and self.current_token['token_type'] == 'OP' and \
            self.current_token['lexeme'] in ['+', '-']:
            operator = self.current_token['lexeme']
            self.advance()
            right = self.parse_shift()  # Changed from parse_multiplicative()
            expr = {
                "type": "binary_expression",
                "operator": operator,
                "left": expr,
                "right": right
            }
            
        return expr

    def parse_for_update(self):
        """Parse the update expression in a for loop, handling postfix operators"""
        if not self.current_token:
            return None
        
        # Handle postfix increment/decrement specially
        if self.current_token['token_type'] == 'ID':
            # Look ahead for postfix operators
            if self.lookahead(1, 'OP', '++') or self.lookahead(1, 'OP', '--'):
                name = self.current_token['lexeme']
                self.advance()
                op = self.current_token['lexeme']
                self.advance()
                return {
                    "type": "postfix_expression",
                    "operator": op,
                    "operand": {"type": "identifier", "name": name}
                }
        
        # Handle prefix increment/decrement
        if self.current_token['token_type'] == 'OP' and self.current_token['lexeme'] in ['++', '--']:
            op = self.current_token['lexeme']
            self.advance()
            if self.current_token and self.current_token['token_type'] == 'ID':
                name = self.current_token['lexeme']
                self.advance()
                return {
                    "type": "prefix_expression",
                    "operator": op,
                    "operand": {"type": "identifier", "name": name}
                }
        
        # Fall back to regular expression parsing
        return self.parse_expression()     
        
    
    def parse_for_init(self):
        if self.current_token and self.current_token['token_type'] == 'KEYWORD' and \
        self.current_token['lexeme'] in ['int', 'float', 'char', 'void']:
            # Parse declaration without requiring semicolon
            return self.parse_declaration(require_semicolon=False)
        else:
            return self.parse_expression()
    
    def parse_return_statement(self):
        self.advance()  # consume 'return'
        
        expr = None
        if not (self.current_token and self.current_token['token_type'] == 'SYMBOL' and self.current_token['lexeme'] == ';'):
            expr = self.parse_expression()
            
        self.consume('SYMBOL', ';', "Expected ';' after return statement")
        
        return {
            "type": "return_statement",
            "value": expr
        }
    
    def parse_expression_statement(self):
        if self.current_token and self.current_token['token_type'] == 'SYMBOL' and self.current_token['lexeme'] == ';':
            self.advance()
            return {
                "type": "expression_statement",
                "expression": None
            }

        # Handle postfix operators
        if self.current_token and self.current_token['token_type'] == 'ID':
            if self.lookahead(1, 'OP', '++') or self.lookahead(1, 'OP', '--'):
                name = self.current_token['lexeme']
                self.advance()
                op = self.current_token['lexeme']
                self.advance()
                self.consume('SYMBOL', ';', "Expected ';' after statement")
                return {
                    "type": "expression_statement",
                    "expression": {
                        "type": "postfix_expression",
                        "operator": op,
                        "operand": {"type": "identifier", "name": name}
                    }
                }

        expr = self.parse_expression()
        
        # Fix: Advance if we have an empty expression
        if expr is None:
            if self.current_token and self.is_expression_terminator():
                self.advance()  # Skip terminator token

        # Handle semicolon
        if self.current_token and self.current_token['token_type'] == 'SYMBOL' and self.current_token['lexeme'] == ';':
            self.advance()
        else:
            if self.current_token and not self.is_statement_terminator():
                self.add_error("Expected ';' after expression")
                if not self.in_panic_mode:
                    self.advance()

        return {
            "type": "expression_statement",
            "expression": expr
        }
        
    def is_statement_terminator(self):
        print("I am here! Statemnet terminator")
        if not self.current_token:
            return True
        return self.current_token['lexeme'] in [';', ',', ')', ']', '}'] or \
            self.current_token['token_type'] == 'KEYWORD'
    
    def parse_expression(self):
        if self.is_expression_terminator():
            return None
        return self.parse_logical_or()
    
    def parse_assignment(self):
        if self.is_expression_terminator():
            return None
        
        left = self.parse_equality()
        
        # Check for assignment operators
        if self.current_token and self.current_token['token_type'] == 'OP' and \
        self.current_token['lexeme'] in ['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=']:
            operator = self.current_token['lexeme']
            self.advance()
            right = self.parse_assignment()
            return {
                "type": "assignment_expression",
                "operator": operator,
                "left": left,
                "right": right
            }
            
        return left
    
    def parse_equality(self):
        expr = self.parse_relational()
        
        while self.current_token and self.current_token['token_type'] == 'OP' and \
            self.current_token['lexeme'] in ['==', '!=']:
            operator = self.current_token['lexeme']
            self.advance()
            right = self.parse_relational()
            expr = {
                "type": "binary_expression",
                "operator": operator,
                "left": expr,
                "right": right
            }
            
        return expr
    
    def parse_relational(self):
        expr = self.parse_additive()  # This now calls parse_shift indirectly
        
        while self.current_token and self.current_token['token_type'] == 'OP' and \
            self.current_token['lexeme'] in ['<', '>', '<=', '>=']:
            operator = self.current_token['lexeme']
            self.advance()
            right = self.parse_additive()  # This now calls parse_shift indirectly
            expr = {
                "type": "binary_expression",
                "operator": operator,
                "left": expr,
                "right": right
            }
            
        return expr
    
    def parse_additive(self):
        expr = self.parse_multiplicative()
        
        while self.current_token and self.current_token['token_type'] == 'OP' and \
            self.current_token['lexeme'] in ['+', '-']:
            operator = self.current_token['lexeme']
            self.advance()
            right = self.parse_multiplicative()
            expr = {
                "type": "binary_expression",
                "operator": operator,
                "left": expr,
                "right": right
            }
            
        return expr
    
    def parse_multiplicative(self):
        expr = self.parse_unary()
        
        while self.current_token and self.current_token['token_type'] == 'OP' and \
            self.current_token['lexeme'] in ['*', '/', '%']:
            operator = self.current_token['lexeme']
            self.advance()
            right = self.parse_unary()
            expr = {
                "type": "binary_expression",
                "operator": operator,
                "left": expr,
                "right": right
            }
            
        return expr
    
    def parse_unary(self):
        # Check for unary operators
        if self.current_token and self.current_token['token_type'] == 'OP' and \
        self.current_token['lexeme'] in ['!', '~', '-', '++', '--', '&', '*']:
            operator = self.current_token['lexeme']
            self.advance()
            operand = self.parse_unary()
            return {
                "type": "unary_expression",
                "operator": operator,
                "operand": operand
            }
        
        return self.parse_primary()
    
    def parse_primary(self):
        if not self.current_token:
            return {"type": "error"}
        
        if self.current_token['token_type'] == 'INTEGER':
            value = int(self.current_token['lexeme'])
            self.advance()
            return {
                "type": "integer_literal",
                "value": value
            }
        elif self.current_token['token_type'] == 'FLOAT':
            value = float(self.current_token['lexeme'])
            self.advance()
            return {
                "type": "float_literal",
                "value": value
            }
        elif self.current_token['token_type'] == 'CHAR':
            value = self.current_token['lexeme'][1:-1]  # Remove quotes
            self.advance()
            return {
                "type": "char_literal",
                "value": value
            }
        elif self.current_token['token_type'] == 'STRING':
            value = self.current_token['lexeme'][1:-1]  # Remove quotes
            self.advance()
            return {
                "type": "string_literal",
                "value": value
            }
        elif self.current_token['token_type'] == 'ID':
            name = self.current_token['lexeme']
            self.advance()
            
            # Check for postfix increment/decrement
            if self.current_token and self.current_token['token_type'] == 'OP' and \
            self.current_token['lexeme'] in ['++', '--']:
                op = self.current_token['lexeme']
                self.advance()
                return {
                    "type": "postfix_expression",
                    "operator": op,
                    "operand": {"type": "identifier", "name": name}
                }
            
            # Check for function call
            if self.current_token and self.current_token['token_type'] == 'SYMBOL' and self.current_token['lexeme'] == '(':
                self.advance()  # consume '('
                args = []
                if not (self.current_token and self.current_token['token_type'] == 'SYMBOL' and self.current_token['lexeme'] == ')'):
                    args = self.parse_argument_list()
                self.consume('SYMBOL', ')', "Expected ')' after arguments")
                return {
                    "type": "call_expression",
                    "callee": name,
                    "arguments": args
                }
            
            # Check for array access
            if self.current_token and self.current_token['token_type'] == 'SYMBOL' and self.current_token['lexeme'] == '[':
                self.advance()  # consume '['
                index = self.parse_expression()
                self.consume('SYMBOL', ']', "Expected ']' after index")
                return {
                    "type": "array_access",
                    "array": name,
                    "index": index
                }
            
            # Simple variable
            return {
                "type": "identifier",
                "name": name
            }
        elif self.current_token['token_type'] == 'SYMBOL' and self.current_token['lexeme'] == '(':
            self.advance()  # consume '('
            expr = self.parse_expression()
            self.consume('SYMBOL', ')', "Expected ')' after expression")
            return expr
        else:
            # Skip unexpected tokens without generating too many errors
            if not self.in_panic_mode:
                self.add_error(f"Unexpected token in expression: {self.current_token['lexeme']}")
            self.advance()
            return {"type": "error"}
    
    def is_expression_terminator(self):
        if not self.current_token:
            return True
        return self.current_token['token_type'] == 'SYMBOL' and \
            self.current_token['lexeme'] in [';', ',', ')', ']', '}']
    
    def parse_argument_list(self):
        args = []
        while True:
            # Check if we've reached the end of arguments
            if self.current_token and self.current_token['token_type'] == 'SYMBOL' and self.current_token['lexeme'] == ')':
                break
                
            arg = self.parse_expression()
            if arg:
                args.append(arg)
            
            # Check for comma separator or end of arguments
            if not self.match('SYMBOL', ','):
                # If next token is closing parenthesis, break
                if self.current_token and self.current_token['token_type'] == 'SYMBOL' and self.current_token['lexeme'] == ')':
                    break
                # Otherwise, we might have an error but continue
                break
                
        return args

    def parse_logical_or(self):
        expr = self.parse_logical_and()
        
        while self.current_token and self.current_token['token_type'] == 'OP' and \
            self.current_token['lexeme'] == '||':
            operator = self.current_token['lexeme']
            self.advance()
            right = self.parse_logical_and()
            expr = {
                "type": "binary_expression",
                "operator": operator,
                "left": expr,
                "right": right
            }
            
        return expr

    def parse_logical_and(self):
        expr = self.parse_assignment()  # Changed from parse_equality()
        
        while self.current_token and self.current_token['token_type'] == 'OP' and \
            self.current_token['lexeme'] == '&&':
            operator = self.current_token['lexeme']
            self.advance()
            right = self.parse_assignment()
            expr = {
                "type": "binary_expression",
                "operator": operator,
                "left": expr,
                "right": right
            }
            
        return expr
    
    def parse_starting_point(self):
        self.consume('ID', 'main', "Expected 'main'")
        self.consume('SYMBOL', '{', "Expected '{' after 'main'")
        
        body = []
        while not self.match('SYMBOL', '}'):
            if not self.current_token:
                self.add_error("Expected '}' before end of file")
                break
            try:
                stmt = self.parse_statement()
                if stmt:
                    body.append(stmt)
            except Exception as e:
                print(f"Error parsing starting point statement: {e}")
                self.synchronize()

        return {
            "type": "starting_point",
            "body": body
        }

def transform_ast(node):
    if isinstance(node, dict):
        # First, recursively transform all children
        for key in list(node.keys()):
            node[key] = transform_ast(node[key])
        
        # Replace postfix_expression with assignment
        if node.get('type') == 'postfix_expression' and node.get('operator') in ['++', '--']:
            operator = node['operator']
            operand = node['operand']
            
            # Create new assignment node
            return {
                "type": "assignment_expression",
                "operator": "=",
                "left": operand,
                "right": {
                    "type": "binary_expression",
                    "operator": "+" if operator == "++" else "-",
                    "left": operand,
                    "right": {
                        "type": "integer_literal",
                        "value": 1
                    }
                }
            }
        return node
    elif isinstance(node, list):
        return [transform_ast(item) for item in node]
    else:
        return node


@eel.expose
def parse_code(code):
    tokens, lex_errors = lex(code)
    parser = Parser(tokens, lex_errors)
    ast = parser.parse()
    
    # Apply transformation to AST
    transformed_ast = transform_ast(ast)
    
    # Convert to JSON-serializable format
    def convert_node(node):
        if isinstance(node, dict):
            return {k: convert_node(v) for k, v in node.items()}
        elif isinstance(node, list):
            return [convert_node(item) for item in node]
        else:
            return node
            
    json_ast = convert_node(transformed_ast)
    all_errors = lex_errors + parser.errors
    
    # Write AST and errors to files
    with open("ast.json", "w") as f:
        json.dump(json_ast, f, indent=2)
        
    with open("syntax_errors.txt", "w") as f:
        for error in all_errors:
            f.write(f"Line {error['line']}, Col {error['column']}: {error['error_message']}\n")
    
    return {"ast": json_ast, "errors": all_errors}

if __name__ == "__main__":
    eel.start("index.html")