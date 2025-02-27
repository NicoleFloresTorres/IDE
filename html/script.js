//Manejo de pestañas de la parte superior derecha
//Seleccionar todas las pestañas y agregar un evento de click
document.querySelectorAll('.tab').forEach(tab => {
    //Por cada tab, hay un metodo de click y por cada click se ejecuta una funcion
    tab.addEventListener('click', function() {
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

//Metodo de eel para llamar la funcion dentro del parentesis desde Python
eel.expose(actualizarLexicoContent);
//Funcion para actualizar el contenido del textarea de lexico
function actualizarLexicoContent(content){
    //Obtener el elemento con el id lexicoContent y asignarle el contenido
    document.getElementById('lexicoContent').value = content;
}

eel.expose(actualizarSintacticoContent);
function actualizarSintacticoContent(content){
    document.getElementById('sintacticoContent').value = content;
}

eel.expose(actualizarSemanticoContent);
function actualizarSemanticoContent(content){
    document.getElementById('semanticoContent').value = content;
}

//Mismo metodo, solo que para una tabla
eel.expose(actualizarHashTable);
function actualizarHashTable(data){
    //Obtener la tabla con el id hashTable
    const table = document.getElementById('hashTable');
    //Eliminar todas las filas de la tabla
    while(table.rows.length > 1){
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
function actualizarIntermedioContent(content){
    document.getElementById('intermedioContent').value = content;
}

eel.expose(actualizarConsola);
function actualizarConsola(content){
    const consoleElement = document.getElementById('consola');
    consoleElement.value += content + '\n';
    consoleElement.scrollTop = consoleElement.scrollHeight;
}

eel.expose(limpiarConsola);
function limpiarConsola(){
    document.getElementById('consola').value = '';
}