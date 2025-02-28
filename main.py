import eel
import tkinter as tk
from tkinter import filedialog
import sys

# Initialize eel and point it to your web folder
eel.init('web')

# Global variable to store the currently opened file's path (if needed)
current_file_path = None

@eel.expose
def open_file():
    global current_file_path
    root = tk.Tk()
    root.withdraw()  # Oculta la ventana principal
    root.attributes('-topmost', True)  # Asegura que la ventana esté en primer plano
    file_path = filedialog.askopenfilename(
        title="Open file",
        filetypes=[("Text Files", "*.txt"), ("All Files", "*.*")]
    )
    root.destroy()  # Cierra la instancia de Tkinter
    if file_path:
        current_file_path = file_path
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        return content
    return ""

@eel.expose
def save_file(content):
    global current_file_path
    # If a file is already opened, overwrite it; otherwise, ask for a save location
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
    root.attributes('-topmost', True)  # Asegura que la ventana esté en primer plano
    file_path = filedialog.asksaveasfilename(
        title="Save file as",
        filetypes=[("Text Files", "*.txt"), ("All Files", "*.*")]
    )
    root.destroy()
    if file_path:
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
            current_file_path = file_path
            return "File saved successfully."
        except Exception as e:
            return f"Error saving file: {e}"
    return "Save canceled."

@eel.expose
def close_file():
    global current_file_path
    current_file_path = None
    return "File closed."

@eel.expose
def close_app():
    print("Closing application...")
    sys.exit()

# A sample function (similar to your 'prueba' example)
@eel.expose
def prueba():
    return "Hello from Python!"

if __name__ == "__main__":
    # Start the eel application. Adjust size as needed.
    eel.start("index.html")
