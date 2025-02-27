// Manejo de pestañas de la parte superior derecha
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.tab').forEach(t => {
            t.classList.remove('active');
        });
        this.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        const tabId = this.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
        eel.tab_changed(tabId);
    });
});

// Manejo de pestañas de la parte inferior, la consola
document.querySelectorAll('.tab-consola').forEach(tab => {
    tab.addEventListener('click', function() {
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

// Funciones expuestas para Eel
eel.expose(actualizarLexicoContent);
function actualizarLexicoContent(content) {
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

eel.expose(actualizarHashTable);
function actualizarHashTable(data) {
    const table = document.getElementById('hashTable');
    while (table.rows.length > 1) {
        table.deleteRow(1);
    }
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

let archivoActual = null;

function abrirArchivo() {
    let input = document.getElementById("fileInput");
    input.click();

    input.onchange = function() {
        if (input.files.length > 0) {
            let archivo = input.files[0];
            let reader = new FileReader();

            reader.onload = function(event) {
                document.getElementById("editor").value = event.target.result;
                archivoActual = archivo;
            };

            reader.readAsText(archivo);
        }
    };
}

// 🔹 GUARDAR ARCHIVO (SOBREESCRIBIR)
document.getElementById("botonGuardar").addEventListener("click", function() {
    if (archivoActual) {
        let contenido = document.getElementById("editor").value;
        let blob = new Blob([contenido], { type: "text/plain" });

        let enlace = document.createElement("a");
        enlace.href = URL.createObjectURL(blob);
        enlace.download = archivoActual.name;
        enlace.click();
    } else {
        guardarComo();
    }
});

// 🔹 GUARDAR COMO (NUEVO ARCHIVO)
document.getElementById("botonGuardarComo").addEventListener("click", function() {
    guardarComo();
});

function guardarComo() {
    let contenido = document.getElementById("editor").value;
    let nombreArchivo = prompt("Ingrese el nombre del archivo:", "nuevo_archivo.txt");

    if (nombreArchivo) {
        let blob = new Blob([contenido], { type: "text/plain" });
        let enlace = document.createElement("a");
        enlace.href = URL.createObjectURL(blob);
        enlace.download = nombreArchivo;
        enlace.click();
    }
}

function cerrarAplicacion() {
    window.close();
}

document.getElementById('guardarDropdown').addEventListener('click', function() {
    document.getElementById('botonGuardar').click();
});

document.getElementById('guardarComoDropdown').addEventListener('click', function() {
    document.getElementById('botonGuardarComo').click();
});

const editor = document.getElementById('editor');
const numeralContainer = document.getElementById('numeralContainer');
const textContainer = document.getElementById('textContainer');

function actualizarNumerosDeLinea() {
    const numeroDeLineas = editor.value.split('\n').length;

    let contenidoNumeros = '';
    for (let i = 1; i <= numeroDeLineas; i++) {
        contenidoNumeros += `<div>${i}</div>`;
    }

    numeralContainer.innerHTML = contenidoNumeros;

    numeralContainer.scrollTop = editor.scrollTop;
}

function sincronizarAltura() {
    numeralContainer.style.height = `${editor.clientHeight}px`;
}

editor.addEventListener('input', () => {
    actualizarNumerosDeLinea();
    sincronizarAltura();
});

// Evento para sincronizar el scroll del editor con el numeralContainer
editor.addEventListener('scroll', () => {
    numeralContainer.scrollTop = editor.scrollTop;
});

window.addEventListener('resize', sincronizarAltura);

actualizarNumerosDeLinea();
sincronizarAltura();