document.addEventListener('DOMContentLoaded', function () {
    // Initialize CodeMirror
    const editor = CodeMirror.fromTextArea(document.getElementById('codeEditor'), {
        lineNumbers: true,
        mode: "text/x-csrc",
        theme: 'default',
        indentUnit: 4,
        indentWithTabs: false,
        autoCloseBrackets: true,
        matchBrackets: true
    });

    editor.addOverlay({
        token: function (stream) {
            // Check if the current token is "main"
            if (stream.match(/\bmain\b/)) {
                return "keyword";
            }
            // Skip to the next token if it's not "main"
            stream.next();
            return null;
        }
    });

    document.getElementById('lexicoBtn').addEventListener('click', async function (event) {
        event.preventDefault();

        // Get the current content of the editor
        const code = editor.getValue();

        try {
            // Call the Python function exposed via eel to perform lexical analysis
            const lexicalAnalysis = await eel.lex(code)();

            // Process the lexical analysis data
            processLexicalAnalysis(lexicalAnalysis);
        } catch (error) {
            console.error("Error calling eel.lex:", error);
        }
    });

    var statusBar = document.createElement("div");
    statusBar.id = "statusBar";
    statusBar.style.padding = "8px";
    statusBar.style.background = "var(--primary-purple)";
    statusBar.style.color = "white";
    statusBar.style.fontSize = "14px";
    statusBar.style.textAlign = "right";

    document.getElementById("bottom-panel").appendChild(statusBar);
    function updateCursorPosition() {
        var cursor = editor.getCursor();
        statusBar.textContent = `Linea: ${cursor.line + 1}, Columna: ${cursor.ch + 1}`;
    }

    editor.on("cursorActivity", updateCursorPosition);

    // Set initial size
    editor.setSize('100%', '400px');

    // Tab switching for right panel
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');

            // Remove active class from all tabs and content
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to selected tab and content
            tab.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Tab switching for console panel
    const tabsConsola = document.querySelectorAll('.tab-consola');
    console.log(tabsConsola);
    const tabContentsConsola = document.querySelectorAll('.tab-content-consola');

    tabsConsola.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab').replace('consola-', '');

            // Remove active class from all tabs and content
            tabsConsola.forEach(t => t.classList.remove('active'));
            tabContentsConsola.forEach(content => content.classList.remove('active'));

            // Add active class to selected tab and content
            tab.classList.add('active');
            console.log(document.getElementById(tabId));
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Function to open a file
    async function openFile(event) {
        event.preventDefault();
        try {
            // Call the Python function exposed via eel
            const fileContent = await eel.open_file()();
            editor.setValue(fileContent);

            // Get lexical analysis from the backend
            const lexicalAnalysis = await eel.lex(fileContent)();

            // Process the lexical analysis data
            processLexicalAnalysis(lexicalAnalysis);
        } catch (error) {
            console.error("Error calling eel.open_file:", error);
        }
    }

    // Process lexical analysis data
    function processLexicalAnalysis(data) {
        if (!Array.isArray(data) || data.length !== 2) {
            console.error("Invalid lexical analysis data format:", data);
            return;
        }

        const tokens = data[0];
        const errors = data[1];

        // Display tokens in the lexical table
        displayTokens(tokens);

        // Display errors in the errors section
        displayErrors(errors);
    }

    // Display tokens in a table
    function displayTokens(tokens) {
        if (!Array.isArray(tokens)) {
            console.error("Invalid tokens data format:", tokens);
            return;
        }

        // Get the lexical tab content
        const lexicoTab = document.getElementById('lexico');

        // Clear existing content
        lexicoTab.innerHTML = '<h2>Análisis Léxico</h2>';

        // Create a container for the table with scrolling
        const tableContainer = document.createElement('div');
        tableContainer.style.maxHeight = '300px'; // Limit the height
        tableContainer.style.overflowY = 'auto'; // Enable vertical scrolling
        tableContainer.style.border = '1px solid var(--secondary-lilac)';
        tableContainer.style.borderRadius = '6px';

        // Create the table
        const table = document.createElement('table');
        table.id = 'tokenTable';
        table.classList.add('token-table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';

        // Create the table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        ['Tipo', 'Lexema', 'Linea', 'Columna'].forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            th.style.background = 'var(--primary-purple)';
            th.style.color = 'white';
            th.style.padding = '8px';
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create the table body
        const tbody = document.createElement('tbody');

        tokens.forEach(token => {
            const row = document.createElement('tr');

            // Create cells for each token property
            const typeCell = document.createElement('td');
            typeCell.textContent = token.token_type || '';

            const lexemeCell = document.createElement('td');
            lexemeCell.textContent = token.lexeme || '';

            const lineCell = document.createElement('td');
            lineCell.textContent = token.line || '';

            const columnCell = document.createElement('td');
            columnCell.textContent = token.column || '';

            // Style the cells
            [typeCell, lexemeCell, lineCell, columnCell].forEach(cell => {
                cell.style.padding = '8px';
                cell.style.borderBottom = '1px solid var(--secondary-lilac)';
            });

            // Add cells to the row
            row.appendChild(typeCell);
            row.appendChild(lexemeCell);
            row.appendChild(lineCell);
            row.appendChild(columnCell);

            // Add row to the table body
            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        tableContainer.appendChild(table);
        lexicoTab.appendChild(tableContainer);
    }

    // Display errors in the error section
    function displayErrors(errors) {
        const erroresLexTextarea = document.getElementById('erroreslexContent');
        // Clear existing content
        erroresLexTextarea.value = '';

        if (errors.length > 0) {
            const errorMessages = errors.map(error =>
                `Error en línea ${error.line}, columna ${error.column}: ${error.error_message}`
            );
            erroresLexTextarea.value = errorMessages.join('\n');
            // Show the errors tab
            document.querySelector('.tab-consola[data-tab="consola-erroreslex"]').click();
        }
    }

    // Add event listeners for the buttons
    document.getElementById('openFileBtn').addEventListener('click', openFile);
    document.getElementById('dropdownOpen').addEventListener('click', openFile);

    // Function to save a file (placeholder)
    function saveFile(event) {
        event.preventDefault();
        const content = editor.getValue();
        eel.save_file(content)();
    }

    // Function to save as (placeholder)
    function saveAsFile(event) {
        event.preventDefault();
        const content = editor.getValue();
        console.log("Hola a todos");
        eel.save_file_as(content)();
    }

    // Function to close file (placeholder)
    function closeFile(event) {
        event.preventDefault();
        editor.setValue('');
        // Clear tables and error displays
        document.getElementById('lexicoContent').value = '';
        document.getElementById('erroreslexContent').value = '';

        // Reset tables
        const lexicoTab = document.getElementById('lexico');
        if (lexicoTab.querySelector('table')) {
            lexicoTab.removeChild(lexicoTab.querySelector('table'));
        }
    }

    // Add event listeners for the file operations
    document.getElementById('saveFileBtn').addEventListener('click', saveFile);
    document.getElementById('dropdownSave').addEventListener('click', saveFile);

    document.getElementById('saveAsFileBtn').addEventListener('click', saveAsFile);
    document.getElementById('dropdownSaveAs').addEventListener('click', saveAsFile);

    document.getElementById('closeFileBtn').addEventListener('click', closeFile);
    document.getElementById('dropdownClose').addEventListener('click', closeFile);

    // Manual testing with sample data
    document.getElementById('closeAppBtn').addEventListener('click', function (event) {
        event.preventDefault();
        eel.close_app()();
        window.close();
    });

    // Add CSS styles for the token table
    const style = document.createElement('style');
    style.textContent = `
        .token-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .token-table th {
            background: var(--primary-purple);
            color: white;
            padding: 8px;
            text-align: left;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        
        .token-table td {
            padding: 8px;
            border-bottom: 1px solid var(--secondary-lilac);
        }
        
        .token-table tr:nth-child(even) {
            background: var(--light-lilac);
        }
    `;
    document.head.appendChild(style);
});