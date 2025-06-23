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

    let contadorNodo = 1;

    function renderAST(node, container, depth = 0) {
        if (!node || typeof node !== 'object') return;

        // Ocultar nodos tipo expression_statement
        if (node.type === 'expression_statement' && node.expression) {
            renderAST(node.expression, container, depth);
            return;
        }

        let tipo = node.type || 'Nodo';
        let nombre = '';

        switch (tipo) {
            case 'program':
                tipo = 'Programa';
                break;
            case 'starting_point':
                tipo = 'Punto de Inicio';
                break;
            case 'function_definition':
                tipo = 'Bloque Principal';
                nombre = node.name;
                break;
            case 'compound_statement':
                tipo = 'Bloque';
                break;
            case 'declaration':
                tipo = 'Declaración';
                nombre = node.data_type;
                break;
            case 'assignment_expression':
                tipo = 'Asignación';
                nombre = node.left?.name || '';
                break;
            case 'call_expression':
                tipo = 'Llamada a función';
                nombre = node.callee;
                break;
            case 'string_literal':
                tipo = 'Cadena';
                nombre = node.value;
                break;
            case 'if_statement':
                tipo = 'Sentencia If';
                break;
            case 'condition':
                tipo = 'Condición';
                break;
            case 'then_branch':
                tipo = 'Then';
                break;
            case 'else_branch':
                tipo = 'Else';
                break;
            case 'identifier':
                tipo = 'Variable';
                nombre = node.name;
                break;
            case 'integer_literal':
                tipo = 'Número Entero';
                nombre = node.value;
                break;
            case 'float_literal':
                tipo = 'Número Decimal';
                nombre = node.value;
                break;
            case 'binary_expression':
                tipo = 'Expresión Binaria';
                nombre = node.operator;
                break;
            case 'for_statement':
                tipo = 'Bucle For';
                break;
            case 'while_statement':
                tipo = 'Bucle While';
                break;
            case 'for_init':
                tipo = 'Inicialización For';
                break;
            case 'for_condition':
                tipo = 'Condición For';
                break;
            case 'for_update':
                tipo = 'Actualización For';
                break;
            case 'for_body':
                tipo = 'Cuerpo For';
                break;
            case 'while_condition':
                tipo = 'Condición While';
                break;
            case 'while_body':
                tipo = 'Cuerpo While';
                break;
            case 'postfix_expression':
                tipo = 'Expresión Postfija';
                nombre = node.operator;
            case 'do_while_statement':
                tipo = 'Bucle Do-While';
                break;
            case 'do_while_body':
                tipo = 'Cuerpo';
                break;
            case 'do_while_condition':
                tipo = 'Condición';
                break;
            case 'binary_expression':
                tipo = 'Expresión Binaria';
                nombre = node.operator;
                // Add support for shift operators
                if (node.operator === '<<' || node.operator === '>>') {
                    tipo = 'Operador de Desplazamiento';
                    nombre = node.operator;
                }
                break;
            default:
                tipo = 'Nodo';
        }

        const displayText = `[${contadorNodo++}] ${tipo}${nombre != null ? ` (${nombre})` : ''}`;

        // Create child container first to determine if we have children
        const childContainer = document.createElement('ul');
        childContainer.style.display = 'none';
        childContainer.style.listStyle = 'none';
        childContainer.style.margin = '0';
        childContainer.style.padding = '0';

        // Process children first to determine if node is expandable
        if (node.type === 'program') {
            node.body?.forEach(child => renderAST(child, childContainer, depth + 1));
        }

        if (node.type === 'starting_point') {
            node.body?.forEach(child => renderAST(child, childContainer, depth + 1));
        }

        if (node.type === 'if_statement') {
            const condWrapper = { type: 'condition', expression: node.condition };
            renderAST(condWrapper, childContainer, depth + 1);

            const thenWrapper = { type: 'then_branch', body: node.then_branch };
            renderAST(thenWrapper, childContainer, depth + 1);

            if (node.else_branch) {
                const elseWrapper = { type: 'else_branch', body: node.else_branch };
                renderAST(elseWrapper, childContainer, depth + 1);
            }
        }

        if (node.type === 'condition' && node.expression) {
            renderAST(node.expression, childContainer, depth + 1);
        }

        if (node.type === 'then_branch' && node.body) {
            renderAST(node.body, childContainer, depth + 1);
        }

        if (node.type === 'else_branch' && node.body) {
            renderAST(node.body, childContainer, depth + 1);
        }

        if (node.type === 'call_expression' && node.arguments) {
            node.arguments.forEach(arg => {
                renderAST(arg, childContainer, depth + 1);
            });
        }

        if (node.type === 'function_definition') {
            renderAST(node.body, childContainer, depth + 1);
        }

        if (node.type === 'compound_statement') {
            node.body?.forEach(child => renderAST(child, childContainer, depth + 1));
        }

        if (node.type === 'declaration') {
            node.declarations?.forEach(variable => {
                const varLi = document.createElement('li');
                varLi.textContent = `[${contadorNodo++}] Variable (${variable.name})`;
                varLi.style.marginLeft = `${(depth + 1) * 1.5}rem`;
                varLi.style.fontFamily = 'monospace';
                childContainer.appendChild(varLi);
            });
        }

        if (node.type === 'assignment_expression') {
            if (node.right) {
                renderAST(node.right, childContainer, depth + 1);
            }
        }

        if (node.type === 'binary_expression') {
            // Add special handling for shift operators
            if (node.operator === '<<' || node.operator === '>>') {
                const leftLabel = document.createElement('div');
                leftLabel.textContent = `Operando Izquierdo`;
                leftLabel.style.fontWeight = 'bold';
                leftLabel.style.color = 'var(--primary-purple)';
                childContainer.appendChild(leftLabel);
                renderAST(node.left, childContainer, depth + 1);
                
                const rightLabel = document.createElement('div');
                rightLabel.textContent = `Operando Derecho`;
                rightLabel.style.fontWeight = 'bold';
                rightLabel.style.color = 'var(--primary-purple)';
                childContainer.appendChild(rightLabel);
                renderAST(node.right, childContainer, depth + 1);
            } else {
                // Regular binary expression handling
                if (node.left) renderAST(node.left, childContainer, depth + 1);
                if (node.right) renderAST(node.right, childContainer, depth + 1);
            }
        }

        if (node.type === 'for_statement') {
            // Inicialización
            if (node.init) {
                const initWrapper = { type: 'for_init', expression: node.init };
                renderAST(initWrapper, childContainer, depth + 1);
            }

            // Condición
            if (node.condition) {
                const condWrapper = { type: 'for_condition', expression: node.condition };
                renderAST(condWrapper, childContainer, depth + 1);
            }

            // Actualización
            if (node.update) {
                const updateWrapper = { type: 'for_update', expression: node.update };
                renderAST(updateWrapper, childContainer, depth + 1);
            }

            // Cuerpo
            if (node.body) {
                const bodyWrapper = { type: 'for_body', body: node.body };
                renderAST(bodyWrapper, childContainer, depth + 1);
            }
        }

        // Procesar bucles while
        if (node.type === 'while_statement') {
            // Condición
            if (node.condition) {
                const condWrapper = { type: 'while_condition', expression: node.condition };
                renderAST(condWrapper, childContainer, depth + 1);
            }

            // Cuerpo
            if (node.body) {
                const bodyWrapper = { type: 'while_body', body: node.body };
                renderAST(bodyWrapper, childContainer, depth + 1);
            }
        }
        if (node.type === 'for_init' && node.expression) {
            renderAST(node.expression, childContainer, depth + 1);
        }

        if (node.type === 'for_condition' && node.expression) {
            renderAST(node.expression, childContainer, depth + 1);
        }

        if (node.type === 'for_update' && node.expression) {
            renderAST(node.expression, childContainer, depth + 1);
        }

        if (node.type === 'for_body' && node.body) {
            renderAST(node.body, childContainer, depth + 1);
        }

        // Procesar los wrappers creados para las partes del while
        if (node.type === 'while_condition' && node.expression) {
            renderAST(node.expression, childContainer, depth + 1);
        }

        if (node.type === 'while_body' && node.body) {
            renderAST(node.body, childContainer, depth + 1);
        }

        // Procesar expresiones postfijas
        if (node.type === 'postfix_expression' && node.operand) {
            renderAST(node.operand, childContainer, depth + 1);
        }

        if (node.type === 'do_while_statement') {
            // Body
            if (node.body) {
                const bodyWrapper = { type: 'do_while_body', body: node.body };
                renderAST(bodyWrapper, childContainer, depth + 1);
            }

            // Condition
            if (node.condition) {
                const condWrapper = { type: 'do_while_condition', expression: node.condition };
                renderAST(condWrapper, childContainer, depth + 1);
            }
        }

        if (node.type === 'do_while_body' && node.body) {
            renderAST(node.body, childContainer, depth + 1);
        }

        // Process do-while condition
        if (node.type === 'do_while_condition' && node.expression) {
            renderAST(node.expression, childContainer, depth + 1);
        }

        

        const ul = document.createElement('ul');
        ul.style.listStyle = 'none';
        ul.style.paddingLeft = '0.5rem';

        const li = document.createElement('li');
        li.style.marginLeft = `${depth * 1}rem`;

        const nodeHeader = document.createElement('div');
        nodeHeader.style.display = 'flex';
        nodeHeader.style.alignItems = 'center';
        nodeHeader.style.fontFamily = 'monospace';

        // Only add toggle if node has children
        const hasChildren = childContainer.childElementCount > 0;

        if (hasChildren) {
            const toggle = document.createElement('span');
            toggle.textContent = '▶ ';
            toggle.style.cursor = 'pointer';
            toggle.style.userSelect = 'none';
            toggle.style.marginRight = '0.3rem';

            toggle.addEventListener('click', () => {
                const visible = childContainer.style.display === 'block';
                childContainer.style.display = visible ? 'none' : 'block';
                toggle.textContent = visible ? '▶ ' : '▼ ';
            });

            nodeHeader.appendChild(toggle);
        } else {
            // Add spacer to align leaf nodes with parent nodes
            const spacer = document.createElement('span');
            spacer.textContent = '  '; // Two spaces for alignment
            spacer.style.marginRight = '0.3rem';
            nodeHeader.appendChild(spacer);
        }

        const label = document.createElement('span');
        label.textContent = displayText;
        label.style.fontWeight = 'normal';

        nodeHeader.appendChild(label);
        li.appendChild(nodeHeader);

        if (hasChildren) {
            li.appendChild(childContainer);
        }

        ul.appendChild(li);
        container.appendChild(ul);
    }

    function displaySyntaxErrors(errors) {
        const erroresContainer = document.getElementById('erroressinContent');

        if (!erroresContainer) {
            console.error("Syntax error container not found.");
            return;
        }

        erroresContainer.value !== undefined
            ? erroresContainer.value = ''
            : erroresContainer.innerHTML = '';

        if (errors.length > 0) {
            const errorMessages = errors.map(error =>
                `Error en línea ${error.line}, columna ${error.column}: ${error.error_message}`
            ).join('\n');

            if (erroresContainer.value !== undefined) {
                erroresContainer.value = errorMessages;
            } else {
                erroresContainer.innerText = errorMessages;
            }

            // Automatically switch to the tab
            const tab = document.querySelector('.tab-consola[data-tab="consola-erroressin"]');
            if (tab) tab.click();
        }
    }

    document.getElementById('sintacticoBtn').addEventListener('click', async function (event) {
        event.preventDefault();

        // Automatically switch to the Sintáctico tab in the right panel
        const tabs = document.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');

        // Remove active class from all tabs and content
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        // Add active class to Sintáctico tab and content
        const sintacticoTab = document.querySelector('.tab[data-tab="sintactico"]');
        const sintacticoContent = document.getElementById('sintactico');

        if (sintacticoTab) sintacticoTab.classList.add('active');
        if (sintacticoContent) sintacticoContent.classList.add('active');

        const code = editor.getValue();
        try {
            const syntaxAnalysis = await eel.parse_code(code)();
            console.log(syntaxAnalysis);

            // Clear previous AST and errors
            const container = document.getElementById('sintacticoContent');
            container.innerHTML = '';
            displaySyntaxErrors([]); // Clear previous errors

            // Handle analysis results
            // ALWAYS display AST if present in response
            if (syntaxAnalysis.ast) {
                contadorNodo = 1;
                renderAST(syntaxAnalysis.ast, container);
            } else {
                console.warn("No AST found in response");
            }

            // Display errors if they exist
            if (syntaxAnalysis.errors && syntaxAnalysis.errors.length > 0) {
                displaySyntaxErrors(syntaxAnalysis.errors);
            }
        } catch (error) {
            console.error("Error calling eel.parse_code:", error);
            // Display error in UI
            displaySyntaxErrors([{
                line: 1,
                column: 1,
                error_message: `Analysis failed: ${error.message || error}`
            }]);
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

            console.log(lexicalAnalysis);

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