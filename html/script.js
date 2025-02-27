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

eel.expose(actualizarLexicoContent);
function actualizarLexicoContent(content){
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

eel.expose(actualizarHashTable);
function actualizarHashTable(data){
    const table = document.getElementById('hashTable');
    while(table.rows.length > 1){
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