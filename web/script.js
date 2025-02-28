//Manejo de pestañas de la parte superior derecha
//Seleccionar todas las pestañas y agregar un evento de click
document.querySelectorAll('.tab').forEach(tab => {
    //Por cada tab, hay un metodo de click y por cada click se ejecuta una funcion
    tab.addEventListener('click', function () {
        //Remover la clase active de todas las pestañas
        document.querySelectorAll('.tab').forEach(t => {
            t.classList.remove('active');
        });
        //Agregar la clase active a la pestaña seleccionada
        this.classList.add('active');

        //Remover la clase active de todos los contenidos
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        //Obtener el id de la pestaña seleccionada
        const tabId = this.getAttribute('data-tab');
        //Agregar la clase active al contenido correspondiente
        document.getElementById(tabId).classList.add('active');
        //Llamar a la funcion tab_changed de eel
        eel.tab_changed(tabId);
    });
});

//Manejo de pestañas de la parte inferior, la consola
document.querySelectorAll('.tab-consola').forEach(tab => {
    tab.addEventListener('click', function () {
        document.querySelectorAll('.tab-consola').forEach(t => {
            t.classList.remove('active');
        });
        this.classList.add('active');

        document.querySelectorAll('.tab-content-consola').forEach(content => {
            content.classList.remove('active');
        });

        const tabId = this.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
        eel.tab_changed(tabId);
    });
});

//Metodo de eel para llamar la funcion dentro del parentesis desde Python
eel.expose(actualizarLexicoContent);
//Funcion para actualizar el contenido del textarea de lexico
function actualizarLexicoContent(content) {
    //Obtener el elemento con el id lexicoContent y asignarle el contenido
    document.getElementById('lexicoContent').value = content;
}

eel.expose(actualizarSintacticoContent);
function actualizarSintacticoContent(content) {
    document.getElementById('sintacticoContent').value = content;
}

eel.expose(actualizarSemanticoContent);
function actualizarSemanticoContent(content) {
    document.getElementById('semanticoContent').value = content;
}

//Mismo metodo, solo que para una tabla
eel.expose(actualizarHashTable);
function actualizarHashTable(data) {
    //Obtener la tabla con el id hashTable
    const table = document.getElementById('hashTable');
    //Eliminar todas las filas de la tabla
    while (table.rows.length > 1) {
        //Eliminar la fila 1, ya que la 0 es el header
        table.deleteRow(1);
    }

    //Por cada item en data, agregar una fila a la tabla
    data.forEach(item => {
        const row = table.insertRow();
        row.insertCell(0).textContent = item.index;
        row.insertCell(1).textContent = item.id;
        row.insertCell(2).textContent = item.type;
        row.insertCell(3).textContent = item.value;
    });
}

eel.expose(actualizarIntermedioContent);
function actualizarIntermedioContent(content) {
    document.getElementById('intermedioContent').value = content;
}

eel.expose(actualizarConsola);
function actualizarConsola(content) {
    const consoleElement = document.getElementById('consola');
    consoleElement.value += content + '\n';
    consoleElement.scrollTop = consoleElement.scrollHeight;
}

eel.expose(limpiarConsola);
function limpiarConsola() {
    document.getElementById('consola').value = '';
}

document.addEventListener("DOMContentLoaded", function () {
    // Initialize CodeMirror inside the textContainer div
    const editor = CodeMirror.fromTextArea(document.getElementById("codeEditor"), {
        lineNumbers: true,
        mode: "python",
        theme: "default",
        value: "" // initial empty content
    });

    var statusBar = document.createElement("div");
    statusBar.id = "statusBar";
    statusBar.style.padding = "8px";
    statusBar.style.background = "var(--primary-purple)";
    statusBar.style.color = "white";
    statusBar.style.fontSize = "14px";
    statusBar.style.textAlign = "right";

    // Append it to the bottom panel
    document.getElementById("bottom-panel").appendChild(statusBar);

    // Function to update cursor position
    function updateCursorPosition() {
        var cursor = editor.getCursor();
        statusBar.textContent = `Linea: ${cursor.line + 1}, Columna: ${cursor.ch + 1}`;
    }

    // Listen for cursor movement
    editor.on("cursorActivity", updateCursorPosition);

    // Set initial position
    updateCursorPosition();

    // Function to open a file
    async function openFile(event) {
        event.preventDefault();
        try {
            // Call the Python function exposed via eel
            const fileContent = await eel.open_file()();
            editor.setValue(fileContent);
        } catch (error) {
            console.error("Error calling eel.open_file:", error);
        }
    }

    // Function to save the current file
    async function saveFile(event) {
        event.preventDefault();
        try {
            const content = editor.getValue();
            const response = await eel.save_file(content)();
            console.log(response);
        } catch (error) {
            console.error("Error calling eel.save_file:", error);
        }
    }

    // Function to "Save As" the current file
    async function saveFileAs(event) {
        event.preventDefault();
        event.stopPropagation();
        try {
            const content = editor.getValue();
            const response = await eel.save_file_as(content)();
            console.log(response);
        } catch (error) {
            console.error("Error calling eel.save_file_as:", error);
        }
    }

    document.getElementById("closeFileBtn").addEventListener("click", function () {
        console.log("File close requested");
        // Implement logic to close the file (e.g., clearing editor content)
        document.getElementById("codeEditor").value = "";  // Example: Clear editor
    });

    document.getElementById("closeAppBtn").addEventListener("click", function () {
        eel.close_app();  // Call Python function to close the application
        window.close();
    });

    // Bind event listeners to both the dropdown menu items and the image buttons
    document.getElementById("dropdownOpen").addEventListener("click", openFile);
    document.getElementById("dropdownSave").addEventListener("click", saveFile);
    document.getElementById("dropdownSaveAs").addEventListener("click", saveFileAs);

    document.getElementById("openFileBtn").addEventListener("click", openFile);
    document.getElementById("saveFileBtn").addEventListener("click", saveFile);
    document.getElementById("saveAsFileBtn").addEventListener("click", saveFileAs);


    document.getElementById('actionBar').addEventListener('click', function (event) {
        let btn = event.target.closest('.btn'); // Get the closest button (if any)
        if (!btn) return; // Ignore clicks outside buttons
    
        event.preventDefault(); // Prevent default action (if needed)
        console.log('Button clicked:', btn.id);
    });    
});