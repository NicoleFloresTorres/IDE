import eel
import tkinter as tk
from tkinter import filedialog

eel.init('web')

@eel.expose
def abrirArchivo():
    tk.Tk().withdraw()
    archivo = filedialog.askopenfilename()
    print("Hola")

eel.start('index.html')