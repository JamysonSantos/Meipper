// Global variables
const COLORS = ['#2196f3', '#f44336', '#4caf50', '#ff9800', '#9c27b0', '#3f51b5', '#009688', '#795548'];
const EXTENDED_COLORS = ['#607d8b', '#e91e63', '#cddc39', '#00bcd4', '#ffc107', '#8bc34a', '#ff5722', '#673ab7'];

let actors = {};
let selectedColor = COLORS[0];
let colors = [...COLORS];
let selectedNodeId = null;
let gatewayMode = false;
let gatewayPaths = [
    { label: 'Caminho 1', pathName: 'Sim', task: '', actor: '', tasks: [] },
    { label: 'Caminho 2', pathName: 'Não', task: '', actor: '', tasks: [] }
];
let nodeIdCounter = 1;

// Sistema melhorado de gerenciamento de labels
let connectionLabels = new Map(); // Mapeia connectionId -> labelElement
let labelUpdateCallbacks = new Map(); // Mapeia labelId -> função de atualização

// Drawflow instance
let editor;
let currentZoom = 1;
let container;

// Initialize
    initializeDrawflow();
    renderColorPicker();
    updateProcessInfo();
    setupKeyboardEvents();
});

function initializeDrawflow() {
    container = document.getElementById('drawflow');
    editor = new Drawflow(container);
    editor.reroute = true;
    editor.reroute_fix_curvature = true;
    editor.force_first_input = false;
    editor.start();

    setupDrawflowEvents();
}

function setupDrawflowEvents() {
    // Event listeners originais
    editor.on('nodeSelected', function(id) {
        selectedNodeId = id;
        updateZoomDisplay();
    });

    editor.on('nodeUnselected', function() {
        selectedNodeId = null;
    });

    editor.on('zoom', function(zoom) {
        currentZoom = zoom;
        updateZoomDisplay();
        // Atualizar posições dos labels quando há zoom
        updateAllLabelPositions();
    });

    // Novos event listeners para gerenciar labels
    editor.on('nodeRemoved', function(id) {
        removeLabelsForNode(id);
    });

    editor.on('connectionRemoved', function(connection) {
        removeLabelForConnection(connection.output_id, connection.input_id);
    });

    // Atualizar labels quando nós são movidos
    editor.on('nodeMoved', function(id) {
        setTimeout(updateAllLabelPositions, 10); // Pequeno delay para garantir que a posição foi atualizada
    });

    // Usar MutationObserver para detectar mudanças no DOM mais eficientemente
    const observer = new MutationObserver(function(mutations) {
        let shouldUpdate = false;
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && 
                (mutation.attributeName === 'style' || mutation.attributeName === 'transform')) {
                shouldUpdate = true;
            }
        });
        if (shouldUpdate) {
            updateAllLabelPositions();
        }
    });

    // Observar mudanças nos nós
    observer.observe(container, {
        attributes: true,
        subtree: true,
        attributeFilter: ['style', 'transform']
    });
}

function updateZoomDisplay() {
    const zoomPercentage = Math.round(currentZoom * 100);
    document.getElementById('zoom-indicator').textContent = zoomPercentage + '%';
    document.getElementById('zoom-display').textContent = 'Zoom: ' + zoomPercentage + '%';
}

// Keyboard events
function setupKeyboardEvents() {
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Delete' && selectedNodeId) {
            deleteNode(selectedNodeId);
        }
    });
}

// Zoom functions
function zoomIn() {
    editor.zoom_in();
}

function zoomOut() {
    editor.zoom_out();
}

function resetZoom() {
    editor.zoom_reset();
}

// Color picker functions
function renderColorPicker() {
    const container = document.getElementById('color-picker');
    container.innerHTML = '';
    
    colors.forEach(color => {
        const colorEl = document.createElement('div');
        colorEl.className = 'color-option';
        colorEl.style.backgroundColor = color;
        if (color === selectedColor) {
            colorEl.classList.add('selected');
        }
        colorEl.onclick = () => selectColor(color);
        container.appendChild(colorEl);
    });
}

function selectColor(color) {
    selectedColor = color;
    renderColorPicker();
}

function addMoreColors() {
    if (colors.length === COLORS.length) {
        colors.push(...EXTENDED_COLORS);
        renderColorPicker();
    }
}

// Actor management
function addActor() {
    const input = document.getElementById('actor-input');
    const name = input.value.trim();
    
    if (!name) return;
    
    if (actors[name]) {
        alert('Esse responsável já existe!');
        return;
    }

    const colorInUse = Object.values(actors).includes(selectedColor);
    if (colorInUse) {
        alert('Essa cor já está em uso. Escolha uma cor diferente.');
        return;
    }

    actors[name] = selectedColor;
    input.value = '';

    updateActorSelect();
    updateActorsList();
    updateProcessInfo();
}

function removeActor(name) {
    delete actors[name];
    updateActorSelect();
    updateActorsList();
    updateProcessInfo();
}

function updateActorSelect() {
    const select = document.getElementById('actor-select');
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">Selecione...</option>';
    
    Object.keys(actors).forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });

    if (actors[currentValue]) {
        select.value = currentValue;
    } else if (Object.keys(actors).length > 0 && !currentValue) {
        select.value = Object.keys(actors)[0];
    }
}

function updateActorsList() {
    const container = document.getElementById('actors-list');
    container.innerHTML = '';

    Object.entries(actors).forEach(([name, color]) => {
        const badge = document.createElement('div');
        badge.className = 'actor-badge';
        badge.style.backgroundColor = color;
        badge.innerHTML = `
            ${name}
            <button onclick="removeActor('${name}')">×</button>
        `;
        container.appendChild(badge);
    });
}

function updateProcessInfo() {
    const processName = document.getElementById('process-name').value.trim();
    document.getElementById('process-display-name').textContent = processName || 'Processo sem nome';

    const legend = document.getElementById('actors-legend');
    legend.innerHTML = '';

    Object.entries(actors).forEach(([name, color]) => {
        const badge = document.createElement('div');
        badge.className = 'actor-badge';
        badge.style.backgroundColor = color;
        badge.textContent = name;
        legend.appendChild(badge);
    });
}

// Node creation functions
function addTask(type) {
    if (type === 'task') {
        const taskInput = document.getElementById('task-input');
        const taskName = taskInput.value.trim();
        const actorSelect = document.getElementById('actor-select');
        const selectedActor = actorSelect.value;

        if (!taskName) {
            alert('Digite o nome da tarefa!');
            return;
        }

        if (!selectedActor) {
            alert('Selecione um responsável!');
            return;
        }

        const actorColor = actors[selectedActor] || '#2196f3';
        const nodeId = createTaskNode(taskName, selectedActor, actorColor);
        taskInput.value = '';
        
        // Auto connect if there's a selected node
        if (selectedNodeId) {
            editor.addConnection(selectedNodeId, nodeId, 'output_1', 'input_1');
        }
        
        selectedNodeId = nodeId;

    } else if (type === 'start') {
        const nodeId = createStartNode();
        selectedNodeId = nodeId;

    } else if (type === 'end') {
        const nodeId = createEndNode();
        
        // Auto connect if there's a selected node
        if (selectedNodeId) {
            editor.addConnection(selectedNodeId, nodeId, 'output_1', 'input_1');
        }
        
        selectedNodeId = nodeId;
    }
}

function createStartNode() {
    const nodeId = nodeIdCounter++;
    const html = `
        <div class="start-node">
            ▶
        </div>
    `;
    
    const posX = getNextPosition().x - 100;
    const posY = getNextPosition().y - 60;
    
    editor.addNode('start', 0, 1, posX, posY, 'start', { name: 'Início' }, html);
    return nodeId;
}

function createEndNode() {
    const nodeId = nodeIdCounter++;
    const html = `
        <div class="end-node">
            ⏹
        </div>
    `;
    
    const posX = getNextPosition().x + 50; // Ajuste aqui a distância extra para o fim
    const posY = getNextPosition().y;
    
    editor.addNode('end', 1, 0, posX, posY, 'end', { name: 'Fim' }, html);
    return nodeId;
}

function createTaskNode(taskName, actor, color) {
    const nodeId = nodeIdCounter++;
    const html = `
        <div class="task-node">
            <div class="task-content" style="background-color: ${color}" ondblclick="editTaskText(event, ${nodeId})">
                ${taskName}
            </div>
            <div class="task-actor">${actor}</div>
        </div>
    `;
    
    const posX = getNextPosition().x;
    const posY = getNextPosition().y;
    
    editor.addNode('task', 1, 1, posX, posY, 'task', { 
        name: taskName, 
        actor: actor, 
        color: color 
    }, html);
    return nodeId;
}

function createGatewayNode(question) {
    const nodeId = nodeIdCounter++;
    const html = `
        <div class="gateway-node">
            <div class="gateway-shape" style="width: 80%; height: 80%;"></div>
            <div class="gateway-label" ondblclick="editGatewayText(event, ${nodeId})">${question}</div>
        </div>
    `;
    
    const posX = getNextPosition().x + 25; // Ajuste aqui a distância do gateway
    const posY = getNextPosition().y;
    
    editor.addNode('gateway', 1, 1, posX, posY, 'gateway', { 
        question: question 
    }, html);
    return nodeId;
}

function getNextPosition() {
    const nodes = editor.getNodesFromName('task').concat(
        editor.getNodesFromName('start'),
        editor.getNodesFromName('end'),
        editor.getNodesFromName('gateway')
    );
    
    if (nodes.length === 0) {
        return { x: 100, y: 200 };
    }
    
    if (selectedNodeId) {
        const selectedNode = editor.getNodeFromId(selectedNodeId);
        if (selectedNode) {
            return { 
                x: selectedNode.pos_x + 150,
                y: selectedNode.pos_y 
            };
        }
    }
    
    // Find rightmost node
    let maxX = 0;
    let maxY = 200;
    nodes.forEach(node => {
        if (node.pos_x > maxX) {
            maxX = node.pos_x;
            maxY = node.pos_y;
        }
    });
    
    return { x: maxX + 350, y: maxY };
}

function deleteNode(nodeId) {
    // Remover labels associados antes de deletar o nó
    removeLabelsForNode(nodeId);
    
    editor.removeNodeId('node-' + nodeId);
    if (selectedNodeId === nodeId) {
        selectedNodeId = null;
    }
}

function handleTaskInputKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        addTask('task');
    }
}

// Gateway functions
function startGatewayMode() {
    if (!selectedNodeId) {
        alert('Selecione uma tarefa antes de criar um caminho de decisão!');
        return;
    }
    
    gatewayMode = true;
    document.getElementById('gateway-panel').style.display = 'block';
    renderGatewayPaths();
}

function renderGatewayPaths() {
    const container = document.getElementById('gateway-paths');
    container.innerHTML = '';

    gatewayPaths.forEach((path, index) => {
        const pathDiv = document.createElement('div');
        pathDiv.className = 'path-block';
        pathDiv.innerHTML = `
            <div class="path-header">
                <span class="path-label">${path.label}</span>
                ${gatewayPaths.length > 2 ? `<button class="remove-path-btn" onclick="removeGatewayPath(${index})">×</button>` : ''}
            </div>
            <div class="form-group">
                <label>Nome do caminho:</label>
                <input type="text" value="${path.pathName}" onchange="updateGatewayPath(${index}, 'pathName', this.value)" placeholder="Ex: Sim, Não, Pendente...">
                <label>Tarefa:</label>
                <textarea placeholder="Tarefa para este caminho" onchange="updateGatewayPath(${index}, 'task', this.value)">${path.task}</textarea>
                <label>Responsável:</label>
                <select onchange="updateGatewayPath(${index}, 'actor', this.value)">
                    <option value="">Selecionar responsável...</option>
                    ${Object.keys(actors).map(actor => 
                        `<option value="${actor}" ${path.actor === actor ? 'selected' : ''}>${actor}</option>`
                    ).join('')}
                </select>
            </div>
        `;
        container.appendChild(pathDiv);
    });
}

function addGatewayPath() {
    const pathNumber = gatewayPaths.length + 1;
    gatewayPaths.push({ 
        label: `Caminho ${pathNumber}`, 
        pathName: '', 
        task: '', 
        actor: '', 
        tasks: [] 
    });
    renderGatewayPaths();
}

function updateGatewayPath(index, field, value) {
    gatewayPaths[index][field] = value;
}

function removeGatewayPath(index) {
    if (gatewayPaths.length > 2) {
        gatewayPaths.splice(index, 1);
        gatewayPaths.forEach((path, i) => {
            path.label = `Caminho ${i + 1}`;
        });
        renderGatewayPaths();
    }
}

function finalizeGateway() {
    const question = document.getElementById('gateway-question').value.trim();
    
    if (!question) {
        alert('Digite a pergunta da decisão!');
        return;
    }

    const validPaths = gatewayPaths.filter(p => p.task.trim() && p.actor && p.pathName.trim());
    if (validPaths.length === 0) {
        alert('Adicione pelo menos um caminho com nome, tarefa e responsável!');
        return;
    }

    // Create gateway
    const gatewayId = createGatewayNode(question);
    
    // Connect selected node to gateway
    if (selectedNodeId) {
        editor.addConnection(selectedNodeId, gatewayId, 'output_1', 'input_1');
    }

    const gatewayNode = editor.getNodeFromId(gatewayId);
    const gatewayY = gatewayNode ? gatewayNode.pos_y : 0;
    
    // Criar container para labels se não existir
    let labelContainer = document.querySelector('.connection-label-container');
    if (!labelContainer) {
        labelContainer = document.createElement('div');
        labelContainer.className = 'connection-label-container';
        document.getElementById('drawflow').appendChild(labelContainer);
    }

    validPaths.forEach((path, index) => {
        const actorColor = actors[path.actor] || '#2196f3';
        const offsetY = (index - (validPaths.length - 1) / 2) * 150;
        const pathY = gatewayY + offsetY;
        const pathTaskId = createTaskNodeAtPosition(path.task, path.actor, actorColor, gatewayNode.pos_x + 150, pathY);
        
        editor.addConnection(gatewayId, pathTaskId, 'output_1', 'input_1');

        // Criar label com sistema melhorado
        createConnectionLabel(gatewayId, pathTaskId, path.pathName, labelContainer);
    });

    cancelGateway();
    selectedNodeId = gatewayId;
}

function createTaskNodeAtPosition(taskName, actor, color, x, y) {
    const nodeId = nodeIdCounter++;
    const html = `
        <div class="task-node">
            <div class="task-content" style="background-color: ${color}" ondblclick="editTaskText(event, ${nodeId})">
                ${taskName}
            </div>
            <div class="task-actor">${actor}</div>
        </div>
    `;
    
    editor.addNode('task', 1, 1, x, y, 'task', { 
        name: taskName, 
        actor: actor, 
        color: color 
    }, html);
    return nodeId;
}

function cancelGateway() {
    gatewayMode = false;
    document.getElementById('gateway-panel').style.display = 'none';
    document.getElementById('gateway-question').value = '';
    gatewayPaths = [
        { label: 'Caminho 1', pathName: 'Sim', task: '', actor: '', tasks: [] },
        { label: 'Caminho 2', pathName: 'Não', task: '', actor: '', tasks: [] }
    ];
}

// Sistema melhorado de gerenciamento de labels
function createConnectionLabel(sourceId, targetId, labelText, container) {
    const connectionKey = `${sourceId}-${targetId}`;
    
    // Criar elemento do label
    const label = document.createElement('div');
    label.className = 'connection-label';
    label.textContent = labelText;
    label.id = `connection-label-${connectionKey}`;
    label.dataset.sourceId = sourceId;
    label.dataset.targetId = targetId;
    
    // Adicionar funcionalidade de edição
    label.addEventListener('dblclick', function(event) {
        editConnectionLabel(event, label);
    });
    
    container.appendChild(label);
    
    // Armazenar referência
    connectionLabels.set(connectionKey, label);
    
    // Função de atualização otimizada
    const updatePosition = () => {
        updateSingleLabelPosition(label, sourceId, targetId);
    };
    
    labelUpdateCallbacks.set(label.id, updatePosition);
    
    // Posição inicial
    updatePosition();
    
    return label;
}

function updateSingleLabelPosition(label, sourceId, targetId) {
    const sourceNode = document.getElementById(`node-${sourceId}`);
    const targetNode = document.getElementById(`node-${targetId}`);
    
    if (!sourceNode || !targetNode || !label.parentElement) {
        return;
    }
    
    const containerRect = document.getElementById('drawflow').getBoundingClientRect();
    const sourceRect = sourceNode.getBoundingClientRect();
    const targetRect = targetNode.getBoundingClientRect();
    
    // Calcular ponto médio com transformação de zoom
    const midX = ((sourceRect.right + targetRect.left) / 2 - containerRect.left) / currentZoom;
    const midY = (((sourceRect.top + sourceRect.bottom) / 2 + (targetRect.top + targetRect.bottom) / 2) / 2 - containerRect.top) / currentZoom;
    
    label.style.left = `${midX}px`;
    label.style.top = `${midY}px`;
}

function updateAllLabelPositions() {
    // Usar requestAnimationFrame para otimizar performance
    requestAnimationFrame(() => {
        labelUpdateCallbacks.forEach((updateFn, labelId) => {
            updateFn();
        });
    });
}

function removeLabelsForNode(nodeId) {
    const labelsToRemove = [];
    
    // Encontrar todos os labels associados ao nó
    connectionLabels.forEach((label, connectionKey) => {
        const [sourceId, targetId] = connectionKey.split('-');
        if (sourceId == nodeId || targetId == nodeId) {
            labelsToRemove.push({ label, connectionKey });
        }
    });
    
    // Remover labels
    labelsToRemove.forEach(({ label, connectionKey }) => {
        removeLabelElement(label, connectionKey);
    });
}

function removeLabelForConnection(outputNodeId, inputNodeId) {
    const connectionKey = `${outputNodeId}-${inputNodeId}`;
    const label = connectionLabels.get(connectionKey);
    
    if (label) {
        removeLabelElement(label, connectionKey);
    }
}

function removeLabelElement(label, connectionKey) {
    // Limpar callback de atualização
    if (labelUpdateCallbacks.has(label.id)) {
        labelUpdateCallbacks.delete(label.id);
    }
    
    // Remover do mapa
    connectionLabels.delete(connectionKey);
    
    // Remover do DOM
    if (label.parentElement) {
        label.parentElement.removeChild(label);
    }
}

// Função de edição para labels de conexão
function editConnectionLabel(event, labelElement) {
    event.stopPropagation();
    const originalText = labelElement.textContent;
    
    labelElement.setAttribute('contenteditable', 'true');
    labelElement.focus();
    
    // Selecionar todo o texto
    const range = document.createRange();
    range.selectNodeContents(labelElement);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    function finishEditing() {
        labelElement.removeAttribute('contenteditable');
        const newText = labelElement.textContent.trim();
        if (!newText || newText === originalText) {
            labelElement.textContent = originalText;
        }
        cleanup();
    }

    function handleKeydown(e) {
        e.stopPropagation();
        if (e.key === 'Enter') {
            e.preventDefault();
            finishEditing();
        } else if (e.key === 'Escape') {
            labelElement.textContent = originalText;
            finishEditing();
        }
    }

    function cleanup() {
        labelElement.removeEventListener('blur', finishEditing);
        labelElement.removeEventListener('keydown', handleKeydown);
    }

    labelElement.addEventListener('blur', finishEditing);
    labelElement.addEventListener('keydown', handleKeydown);
}

// Text editing functions
function editTaskText(event, nodeId) {
    event.stopPropagation();
    const element = event.target;
    const originalText = element.textContent;
    
    element.setAttribute('contenteditable', 'true');
    element.focus();
    
    // Select all text
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    function finishEditing() {
        element.removeAttribute('contenteditable');
        const newText = element.textContent.trim();
        if (newText && newText !== originalText) {
            // Update node data
            const nodeData = editor.getNodeFromId(nodeId);
            if (nodeData) {
                nodeData.data.name = newText;
            }
        } else {
            element.textContent = originalText;
        }
        cleanup();
    }

    function handleKeydown(e) {
        e.stopPropagation();
        if (e.key === 'Enter') {
            e.preventDefault();
            finishEditing();
        } else if (e.key === 'Escape') {
            element.textContent = originalText;
            finishEditing();
        }
    }

    function cleanup() {
        element.removeEventListener('blur', finishEditing);
        element.removeEventListener('keydown', handleKeydown);
    }

    element.addEventListener('blur', finishEditing);
    element.addEventListener('keydown', handleKeydown);
}

function editGatewayText(event, nodeId) {
    event.stopPropagation();
    const element = event.target;
    const originalText = element.textContent;
    
    element.setAttribute('contenteditable', 'true');
    element.focus();

    // Select all text
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    function finishEditing() {
        element.removeAttribute('contenteditable');
        const newText = element.textContent.trim();
        if (newText && newText !== originalText) {
            // Update node data
            const nodeData = editor.getNodeFromId(nodeId);
            if (nodeData) {
                nodeData.data.question = newText;
            }
        } else {
            element.textContent = originalText;
        }
        cleanup();
    }

    function handleKeydown(e) {
        e.stopPropagation();
        if (e.key === 'Enter') {
            e.preventDefault();
            finishEditing();
        } else if (e.key === 'Escape') {
            element.textContent = originalText;
            finishEditing();
        }
    }

    function cleanup() {
        element.removeEventListener('blur', finishEditing);
        element.removeEventListener('keydown', handleKeydown);
    }

    element.addEventListener('blur', finishEditing);
    element.addEventListener('keydown', handleKeydown);
}

// Utility functions
function clearAll() {
    if (confirm('Tem certeza que deseja limpar todo o fluxo?')) {
        // Limpar todos os labels e callbacks
        connectionLabels.clear();
        labelUpdateCallbacks.clear();
        
        // Destrói completamente a instância do Drawflow
        editor.clear();
        
        // Remove todos os labels de conexão
        const labelContainer = document.querySelector('.connection-label-container');
        if (labelContainer) {
            labelContainer.remove();
        }
        
        // Reinicializa o Drawflow do zero
        const container = document.getElementById('drawflow');
        container.innerHTML = '';
        
        editor = new Drawflow(container);
        editor.start();
        
        // Reconfigurações essenciais
        editor.reroute = true;
        editor.reroute_fix_curvature = true;
        editor.force_first_input = false;
        
        // Reseta todas as variáveis globais
        selectedNodeId = null;
        gatewayMode = false;
        nodeIdCounter = 1;
        
        // Reativa eventos
        setupDrawflowEvents();
    }
}

// Event listeners
document.getElementById('process-name').addEventListener('input', updateProcessInfo);
