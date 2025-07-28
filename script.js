// Global variables
console.log("Script.js carregado!");
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
let connectionLabels = new Map();
let labelUpdateCallbacks = new Map();

// Drawflow instance
let editor;
let currentZoom = 1;
let container;

// Sistema de histórico melhorado
let history = [];
let historyIndex = -1;
const MAX_HISTORY = 50;
let isPerformingUndoRedo = false;

// ======================
// EXPOSIÇÃO DE FUNÇÕES GLOBAIS
// ======================
window.removeActor = removeActor;
window.editTaskText = editTaskText;
window.editGatewayText = editGatewayText;
window.addTask = addTask;
window.startGatewayMode = startGatewayMode;
window.addGatewayPath = addGatewayPath;
window.updateGatewayPath = updateGatewayPath;
window.removeGatewayPath = removeGatewayPath;
window.finalizeGateway = finalizeGateway;
window.cancelGateway = cancelGateway;
window.clearAll = clearAll;
window.saveToLocalStorage = saveToLocalStorage;
window.loadFromLocalStorage = loadFromLocalStorage;
window.exportToPNG = exportToPNG;
window.exportToPDF = exportToPDF;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.resetZoom = resetZoom;
window.addMoreColors = addMoreColors;
window.addActor = addActor;

// ======================
// INICIALIZAÇÃO
// ======================
document.addEventListener('DOMContentLoaded', function() {
    initializeDrawflow();
    renderColorPicker();
    updateProcessInfo();
    setupKeyboardEvents();
    setupButtonListeners();
    saveState();
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

function setupButtonListeners() {
    // Botões de histórico
    document.getElementById('undo-btn').addEventListener('click', undo);
    document.getElementById('redo-btn').addEventListener('click', redo);
    
    // Botão de mais cores
    document.querySelector('[data-action="more-colors"]').addEventListener('click', addMoreColors);
    
    // Botão de salvar ator
    document.querySelector('[data-action="add-actor"]').addEventListener('click', addActor);
    
    // Botões de tarefa
    document.querySelector('[data-action="add-start-task"]').addEventListener('click', () => addTask('start'));
    document.querySelector('[data-action="add-task"]').addEventListener('click', () => addTask('task'));
    document.querySelector('[data-action="start-gateway"]').addEventListener('click', startGatewayMode);
    document.querySelector('[data-action="add-end-task"]').addEventListener('click', () => addTask('end'));
    
    // Botões de exportação
    document.querySelector('[data-action="export-png"]').addEventListener('click', exportToPNG);
    document.querySelector('[data-action="export-pdf"]').addEventListener('click', exportToPDF);;
    
    // Botões de zoom
    document.querySelector('[data-action="zoom-in"]').addEventListener('click', zoomIn);
    document.querySelector('[data-action="zoom-out"]').addEventListener('click', zoomOut);
    document.querySelector('[data-action="reset-zoom"]').addEventListener('click', resetZoom);
    
    // Botões de gateway
    document.querySelector('[data-action="add-gateway-path"]').addEventListener('click', addGatewayPath);
    document.querySelector('[data-action="finalize-gateway"]').addEventListener('click', finalizeGateway);
    document.querySelector('[data-action="cancel-gateway"]').addEventListener('click', cancelGateway);
    
    // Botões de ação principais
    document.querySelector('[data-action="clear-all"]').addEventListener('click', clearAll);
    document.querySelector('[data-action="save-flow"]').addEventListener('click', saveToLocalStorage);
    document.querySelector('[data-action="load-flow"]').addEventListener('click', loadFromLocalStorage);
}

// ======================
// FUNÇÕES DO DRAWFLOW
// ======================
function setupDrawflowEvents() {
    editor.on('nodeSelected', function(id) {
        selectedNodeId = id;
        updateZoomDisplay();
    });

    editor.on('nodeUnselected', function() {
        selectedNodeId = null;
    });

    editor.on('nodeCreated', function(id) {
        if (!isPerformingUndoRedo) saveState();
    });

    editor.on('nodeRemoved', function(id) {
        removeLabelsForNode(id);
        if (!isPerformingUndoRedo) saveState();
    });

    editor.on('nodeMoved', function(id) {
        setTimeout(() => {
            updateAllLabelPositions();
            if (!isPerformingUndoRedo) saveState();
        }, 100);
    });

    editor.on('connectionCreated', function(connection) {
        if (!isPerformingUndoRedo) saveState();
    });

    editor.on('connectionRemoved', function(connection) {
        removeLabelForConnection(connection.output_id, connection.input_id);
        if (!isPerformingUndoRedo) saveState();
    });

    const observer = new MutationObserver(function(mutations) {
        let shouldUpdate = false;
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && 
                (mutation.attributeName === 'style' || mutation.attributeName === 'transform')) {
                shouldUpdate = true;
            }
        });
        if (shouldUpdate) updateAllLabelPositions();
    });

    observer.observe(container, {
        attributes: true,
        subtree: true,
        attributeFilter: ['style', 'transform']
    });
}

// ======================
// SISTEMA DE HISTÓRICO
// ======================
function saveState() {
    if (isPerformingUndoRedo) return;
    
    const state = {
        drawflow: editor.export(),
        actors: JSON.parse(JSON.stringify(actors)),
        nodeIdCounter: nodeIdCounter,
        processName: document.getElementById('process-name').value,
        selectedColor: selectedColor,
        colors: [...colors],
        connectionLabels: Array.from(connectionLabels.entries()),
        timestamp: Date.now()
    };
    
    if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
    }
    
    history.push(state);
    
    if (history.length > MAX_HISTORY) {
        history.shift();
    } else {
        historyIndex++;
    }
    
    updateHistoryButtons();
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        restoreState(history[historyIndex]);
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        restoreState(history[historyIndex]);
    }
}

function restoreState(state) {
    isPerformingUndoRedo = true;
    
    try {
        editor.clear();
        connectionLabels.clear();
        labelUpdateCallbacks.clear();
        
        const existingLabelContainer = document.querySelector('.connection-label-container');
        if (existingLabelContainer) existingLabelContainer.remove();
        
        actors = state.actors;
        nodeIdCounter = state.nodeIdCounter;
        selectedColor = state.selectedColor;
        colors = state.colors;
        
        document.getElementById('process-name').value = state.processName;
        updateActorSelect();
        updateActorsList();
        updateProcessInfo();
        renderColorPicker();
        
        if (state.drawflow && state.drawflow.drawflow) {
            editor.import(state.drawflow);
        }
        
        if (state.connectionLabels && state.connectionLabels.length > 0) {
            const labelContainer = document.createElement('div');
            labelContainer.className = 'connection-label-container';
            document.getElementById('drawflow').appendChild(labelContainer);
            
            setTimeout(() => {
                state.connectionLabels.forEach(([connectionKey, labelData]) => {
                    const [sourceId, targetId] = connectionKey.split('-');
                    if (labelData && labelData.textContent) {
                        createConnectionLabel(sourceId, targetId, labelData.textContent, labelContainer);
                    }
                });
            }, 100);
        }
        
    } catch (error) {
        console.error('Erro ao restaurar estado:', error);
    } finally {
        isPerformingUndoRedo = false;
        updateHistoryButtons();
    }
}

function updateHistoryButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    
    if (undoBtn && redoBtn) {
        undoBtn.disabled = historyIndex <= 0;
        redoBtn.disabled = historyIndex >= history.length - 1;
    }
}

// ======================
// FUNÇÕES DE INTERFACE
// ======================
function updateZoomDisplay() {
    const zoomPercentage = Math.round(currentZoom * 100);
    document.getElementById('zoom-indicator').textContent = zoomPercentage + '%';
    document.getElementById('zoom-display').textContent = 'Zoom: ' + zoomPercentage + '%';
}

function setupKeyboardEvents() {
    document.addEventListener('keydown', function(e) {
        if (document.activeElement.tagName !== 'INPUT' && 
            document.activeElement.tagName !== 'TEXTAREA' && 
            !document.activeElement.hasAttribute('contenteditable')) {
            
            if (e.key === 'Delete' && selectedNodeId) {
                e.preventDefault();
                deleteNode(selectedNodeId);
            }
            
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    undo();
                } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
                    e.preventDefault();
                    redo();
                }
            }
        }
    });
}

// ======================
// FUNÇÕES DE ZOOM
// ======================
function zoomIn() {
    editor.zoom_in();
    setTimeout(updateAllLabelPositions, 100);
}

function zoomOut() {
    editor.zoom_out();
    setTimeout(updateAllLabelPositions, 100);
}

function resetZoom() {
    editor.zoom_reset();
    setTimeout(updateAllLabelPositions, 100);
}

// ======================
// FUNÇÕES DE CORES
// ======================
function renderColorPicker() {
    const container = document.getElementById('color-picker');
    if (!container) return;
    
    container.innerHTML = '';
    
    colors.forEach(color => {
        const colorEl = document.createElement('div');
        colorEl.className = 'color-option';
        colorEl.style.backgroundColor = color;
        if (color === selectedColor) colorEl.classList.add('selected');
        colorEl.addEventListener('click', () => selectColor(color));
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

// ======================
// GERENCIAMENTO DE ATORES
// ======================
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
    saveState();
}

function removeActor(name) {
    delete actors[name];
    updateActorSelect();
    updateActorsList();
    updateProcessInfo();
    saveState();
}

function updateActorSelect() {
    const select = document.getElementById('actor-select');
    if (!select) return;
    
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
    if (!container) return;
    
    container.innerHTML = '';

    Object.entries(actors).forEach(([name, color]) => {
        const badge = document.createElement('div');
        badge.className = 'actor-badge';
        badge.style.backgroundColor = color;
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;
        
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', () => removeActor(name));
        
        badge.appendChild(nameSpan);
        badge.appendChild(removeBtn);
        container.appendChild(badge);
    });
}

function updateProcessInfo() {
    const processName = document.getElementById('process-name').value.trim();
    const displayName = document.getElementById('process-display-name');
    const legend = document.getElementById('actors-legend');
    
    if (displayName) displayName.textContent = processName || 'Processo sem nome';
    if (!legend) return;
    
    legend.innerHTML = '';

    Object.entries(actors).forEach(([name, color]) => {
        const badge = document.createElement('div');
        badge.className = 'actor-badge';
        badge.style.backgroundColor = color;
        badge.textContent = name;
        legend.appendChild(badge);
    });
}

// ======================
// FUNÇÕES DE NÓS
// ======================
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
        
        if (selectedNodeId) {
            editor.addConnection(selectedNodeId, nodeId, 'output_1', 'input_1');
        }
        
        selectedNodeId = nodeId;

    } else if (type === 'start') {
        const nodeId = createStartNode();
        selectedNodeId = nodeId;

    } else if (type === 'end') {
        const nodeId = createEndNode();
        
        if (selectedNodeId) {
            editor.addConnection(selectedNodeId, nodeId, 'output_1', 'input_1');
        }
        
        selectedNodeId = nodeId;
    }
}

function createStartNode() {
    const nodeId = nodeIdCounter++;
    const html = `<div class="start-node">▶</div>`;
    const pos = getNextPosition();
    
    editor.addNode('start', 0, 1, pos.x - 100, pos.y - 60, 'start', { name: 'Início' }, html);
    return nodeId;
}

function createEndNode() {
    const nodeId = nodeIdCounter++;
    const html = `<div class="end-node">⏹</div>`;
    const pos = getNextPosition();
    
    editor.addNode('end', 1, 0, pos.x + 50, pos.y, 'end', { name: 'Fim' }, html);
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
    const pos = getNextPosition();
    
    editor.addNode('task', 1, 1, pos.x, pos.y, 'task', { 
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
    const pos = getNextPosition();
    
    editor.addNode('gateway', 1, 1, pos.x + 25, pos.y, 'gateway', { 
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
    
    if (nodes.length === 0) return { x: 100, y: 200 };
    
    if (selectedNodeId) {
        const selectedNode = editor.getNodeFromId(selectedNodeId);
        if (selectedNode) return { x: selectedNode.pos_x + 150, y: selectedNode.pos_y };
    }
    
    let maxX = 0, maxY = 200;
    nodes.forEach(node => {
        if (node.pos_x > maxX) {
            maxX = node.pos_x;
            maxY = node.pos_y;
        }
    });
    
    return { x: maxX + 350, y: maxY };
}

function deleteNode(nodeId) {
    removeLabelsForNode(nodeId);
    editor.removeNodeId('node-' + nodeId);
    if (selectedNodeId === nodeId) selectedNodeId = null;
}

// ======================
// FUNÇÕES DE GATEWAY
// ======================
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
    if (!container) return;
    
    container.innerHTML = '';

    gatewayPaths.forEach((path, index) => {
        const pathDiv = document.createElement('div');
        pathDiv.className = 'path-block';
        pathDiv.innerHTML = `
            <div class="path-header">
                <span class="path-label">${path.label}</span>
                ${gatewayPaths.length > 2 ? `<button class="remove-path-btn" data-index="${index}">×</button>` : ''}
            </div>
            <div class="form-group">
                <label>Nome do caminho:</label>
                <input type="text" value="${path.pathName}" data-index="${index}" data-field="pathName" placeholder="Ex: Sim, Não, Pendente...">
                <label>Tarefa:</label>
                <textarea placeholder="Tarefa para este caminho" data-index="${index}" data-field="task">${path.task}</textarea>
                <label>Responsável:</label>
                <select data-index="${index}" data-field="actor">
                    <option value="">Selecionar responsável...</option>
                    ${Object.keys(actors).map(actor => 
                        `<option value="${actor}" ${path.actor === actor ? 'selected' : ''}>${actor}</option>`
                    ).join('')}
                </select>
            </div>
        `;
        container.appendChild(pathDiv);
    });

    // Adicionar listeners dinamicamente
    document.querySelectorAll('.remove-path-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            removeGatewayPath(parseInt(this.dataset.index));
        });
    });

    document.querySelectorAll('input[data-field="pathName"]').forEach(input => {
        input.addEventListener('change', function() {
            updateGatewayPath(parseInt(this.dataset.index), this.dataset.field, this.value);
        });
    });

    document.querySelectorAll('textarea[data-field="task"]').forEach(textarea => {
        textarea.addEventListener('change', function() {
            updateGatewayPath(parseInt(this.dataset.index), this.dataset.field, this.value);
        });
    });

    document.querySelectorAll('select[data-field="actor"]').forEach(select => {
        select.addEventListener('change', function() {
            updateGatewayPath(parseInt(this.dataset.index), this.dataset.field, this.value);
        });
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
    if (gatewayPaths[index]) {
        gatewayPaths[index][field] = value;
    }
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

    const gatewayId = createGatewayNode(question);
    
    if (selectedNodeId) {
        editor.addConnection(selectedNodeId, gatewayId, 'output_1', 'input_1');
    }

    const gatewayNode = editor.getNodeFromId(gatewayId);
    const gatewayY = gatewayNode ? gatewayNode.pos_y : 0;
    
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
    const panel = document.getElementById('gateway-panel');
    if (panel) panel.style.display = 'none';
    
    const questionInput = document.getElementById('gateway-question');
    if (questionInput) questionInput.value = '';
    
    gatewayPaths = [
        { label: 'Caminho 1', pathName: 'Sim', task: '', actor: '', tasks: [] },
        { label: 'Caminho 2', pathName: 'Não', task: '', actor: '', tasks: [] }
    ];
}

// ======================
// SISTEMA DE LABELS
// ======================
function createConnectionLabel(sourceId, targetId, labelText, container) {
    const connectionKey = `${sourceId}-${targetId}`;
    
    const label = document.createElement('div');
    label.className = 'connection-label';
    label.textContent = labelText;
    label.id = `connection-label-${connectionKey}`;
    label.dataset.sourceId = sourceId;
    label.dataset.targetId = targetId;
    
    label.addEventListener('dblclick', function(event) {
        editConnectionLabel(event, label);
    });
    
    container.appendChild(label);
    connectionLabels.set(connectionKey, label);
    
    const updatePosition = () => updateSingleLabelPosition(label, sourceId, targetId);
    labelUpdateCallbacks.set(label.id, updatePosition);
    updatePosition();
    
    return label;
}

function updateSingleLabelPosition(label, sourceId, targetId) {
    const sourceNode = document.getElementById(`node-${sourceId}`);
    const targetNode = document.getElementById(`node-${targetId}`);
    const drawflow = document.getElementById('drawflow');
    
    if (!sourceNode || !targetNode || !drawflow || !label.parentElement) return;
    
    const containerRect = drawflow.getBoundingClientRect();
    const sourceRect = sourceNode.getBoundingClientRect();
    const targetRect = targetNode.getBoundingClientRect();
    
    const midX = ((sourceRect.right + targetRect.left) / 2 - containerRect.left) / currentZoom;
    const midY = (((sourceRect.top + sourceRect.bottom) / 2 + (targetRect.top + targetRect.bottom) / 2) / 2 - containerRect.top) / currentZoom;
    
    label.style.left = `${midX}px`;
    label.style.top = `${midY}px`;
}

function updateAllLabelPositions() {
    requestAnimationFrame(() => {
        labelUpdateCallbacks.forEach(updateFn => updateFn());
    });
}

function removeLabelsForNode(nodeId) {
    const labelsToRemove = [];
    connectionLabels.forEach((label, connectionKey) => {
        const [sourceId, targetId] = connectionKey.split('-');
        if (sourceId == nodeId || targetId == nodeId) {
            labelsToRemove.push({ label, connectionKey });
        }
    });
    
    labelsToRemove.forEach(({ label, connectionKey }) => {
        removeLabelElement(label, connectionKey);
    });
}

function removeLabelForConnection(outputNodeId, inputNodeId) {
    const connectionKey = `${outputNodeId}-${inputNodeId}`;
    const label = connectionLabels.get(connectionKey);
    if (label) removeLabelElement(label, connectionKey);
}

function removeLabelElement(label, connectionKey) {
    if (labelUpdateCallbacks.has(label.id)) labelUpdateCallbacks.delete(label.id);
    connectionLabels.delete(connectionKey);
    if (label.parentElement) label.parentElement.removeChild(label);
}

function editConnectionLabel(event, labelElement) {
    event.stopPropagation();
    const originalText = labelElement.textContent;
    
    labelElement.setAttribute('contenteditable', 'true');
    labelElement.focus();
    
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
        saveState();
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

// ======================
// FUNÇÕES DE EDIÇÃO DE TEXTO
// ======================
function editTaskText(event, nodeId) {
    event.stopPropagation();
    const element = event.target;
    const originalText = element.textContent;
    
    element.setAttribute('contenteditable', 'true');
    element.focus();
    
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    function finishEditing() {
        element.removeAttribute('contenteditable');
        const newText = element.textContent.trim();
        if (newText && newText !== originalText) {
            const nodeData = editor.getNodeFromId(nodeId);
            if (nodeData) nodeData.data.name = newText;
            saveState();
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

    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    function finishEditing() {
        element.removeAttribute('contenteditable');
        const newText = element.textContent.trim();
        if (newText && newText !== originalText) {
            const nodeData = editor.getNodeFromId(nodeId);
            if (nodeData) nodeData.data.question = newText;
            saveState();
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

// ======================
// FUNÇÕES DE ARMAZENAMENTO
// ======================
function saveToLocalStorage() {
    try {
        const data = {
            drawflow: editor.export(),
            actors: actors,
            nodeIdCounter: nodeIdCounter,
            processName: document.getElementById('process-name').value,
            selectedColor: selectedColor,
            colors: colors,
            connectionLabels: Array.from(connectionLabels.entries()).map(([key, label]) => [
                key, 
                {
                    textContent: label.textContent,
                    sourceId: label.dataset.sourceId,
                    targetId: label.dataset.targetId
                }
            ]),
            history: history.slice(0, historyIndex + 1),
            historyIndex: historyIndex,
            timestamp: Date.now(),
            version: '2.0'
        };
        
        localStorage.setItem('meipperFlow', JSON.stringify(data));
        alert('Fluxo salvo com sucesso!');
    } catch (error) {
        console.error('Erro ao salvar:', error);
        alert('Erro ao salvar o fluxo. Verifique se há espaço suficiente no navegador.');
    }
}

function loadFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('meipperFlow');
        if (savedData) {
            if (confirm('Carregar fluxo salvo? Isso substituirá o fluxo atual.')) {
                const data = JSON.parse(savedData);
                clearAll();
                
                actors = data.actors || {};
                nodeIdCounter = data.nodeIdCounter || 1;
                selectedColor = data.selectedColor || COLORS[0];
                colors = data.colors || [...COLORS];
                
                document.getElementById('process-name').value = data.processName || '';
                updateActorSelect();
                updateActorsList();
                updateProcessInfo();
                renderColorPicker();
                
                if (data.drawflow) editor.import(data.drawflow);
                
                if (data.connectionLabels && data.connectionLabels.length > 0) {
                    setTimeout(() => {
                        let labelContainer = document.querySelector('.connection-label-container');
                        if (!labelContainer) {
                            labelContainer = document.createElement('div');
                            labelContainer.className = 'connection-label-container';
                            document.getElementById('drawflow').appendChild(labelContainer);
                        }
                        
                        data.connectionLabels.forEach(([connectionKey, labelData]) => {
                            const [sourceId, targetId] = connectionKey.split('-');
                            if (labelData && labelData.textContent) {
                                createConnectionLabel(sourceId, targetId, labelData.textContent, labelContainer);
                            }
                        });
                    }, 200);
                }
                
                if (data.history && data.version === '2.0') {
                    history = data.history;
                    historyIndex = data.historyIndex || 0;
                    updateHistoryButtons();
                } else {
                    history = [];
                    historyIndex = -1;
                    saveState();
                }
                
                alert('Fluxo carregado com sucesso!');
            }
        } else {
            alert('Nenhum fluxo salvo encontrado.');
        }
    } catch (error) {
        console.error('Erro ao carregar:', error);
        alert('Erro ao carregar o fluxo salvo.');
    }
}

// ======================
// FUNÇÕES DE EXPORTAÇÃO
// ======================
async function exportToPNG() {
    showLoading('Exportando PNG...', 'Preparando imagem fiel do fluxo');
    
    try {
        // 1. Criar container de exportação
        const exportContainer = document.createElement('div');
        exportContainer.className = 'export-container';
        document.body.appendChild(exportContainer);

        // 2. Clonar todo o conteúdo do drawflow
        const drawflowClone = document.getElementById('drawflow').cloneNode(true);
        
        exportContainer.appendChild(drawflowClone);

        // 4. Configurações do html2canvas
        const canvas = await html2canvas(exportContainer, {
            scale: 2,
            logging: true,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#f8fafc',
            scrollX: 0,
            scrollY: 0,
            ignoreElements: (element) => element.classList.contains('canvas-controls') || 
                                      element.classList.contains('zoom-indicator')
        });

        // 5. Gerar e limpar
        const link = document.createElement('a');
        link.download = `${document.getElementById('process-name').value.trim() || 'processo'}_${new Date().toISOString().slice(0,10)}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        document.body.removeChild(exportContainer);
        hideLoading();
        
    } catch (error) {
        console.error('Erro ao exportar PNG:', error);
        hideLoading();
        alert('Erro ao exportar para PNG. Consulte o console para detalhes.');
    }
}

async function exportToPDF() {
    showLoading('Exportando PDF...', 'Preparando documento fiel do fluxo');
    
    try {
        const { jsPDF } = window.jspdf;
        
        // 1. Criar container de exportação
        const exportContainer = document.createElement('div');
        exportContainer.className = 'export-container';
        document.body.appendChild(exportContainer);

        // 2. Adicionar cabeçalho
        const header = document.createElement('div');
        header.className = 'export-header';
        header.innerHTML = `
            <h2>${document.getElementById('process-name').value.trim() || 'Processo sem nome'}</h2>
            <div class="export-actors">
                <strong>Responsáveis:</strong>
                <div class="export-actors-list">
                    ${Object.entries(actors).map(([name, color]) => `
                        <span class="export-actor-badge" style="background: ${color}">
                            ${name}
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
        exportContainer.appendChild(header);
        
        // 3. Clonar e ajustar o drawflow
        const drawflowClone = document.getElementById('drawflow').cloneNode(true);
        adjustDynamicElementsForExport(drawflowClone);
        
        const flowContainer = document.createElement('div');
        flowContainer.className = 'export-flow-content';
        flowContainer.appendChild(drawflowClone);
        exportContainer.appendChild(flowContainer);
        
        // 4. Configurações do html2canvas
        await new Promise(resolve => setTimeout(resolve, 300));
        const canvas = await html2canvas(exportContainer, {
            scale: 1.5,
            logging: true,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#f8fafc',
            scrollX: 0,
            scrollY: 0,
            windowWidth: exportContainer.scrollWidth,
            windowHeight: exportContainer.scrollHeight
        });
        
        // 5. Gerar PDF
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const widthInMM = imgWidth * 0.264583;
        const heightInMM = imgHeight * 0.264583;
        
        const pdf = new jsPDF({
            orientation: widthInMM > heightInMM ? 'landscape' : 'portrait',
            unit: 'mm',
            format: [widthInMM + 20, heightInMM + 20]
        });
        
        pdf.setProperties({
            title: document.getElementById('process-name').value.trim() || 'Processo sem nome',
            subject: `Fluxo exportado do Meipper - ${new Date().toLocaleDateString()}`,
            creator: 'Meipper'
        });
        
        pdf.addImage(canvas, 'PNG', 10, 10, widthInMM, heightInMM);
        pdf.save(`${document.getElementById('process-name').value.trim().replace(/[^a-z0-9]/gi, '_') || 'processo'}_${new Date().toISOString().slice(0,10)}.pdf`);
        
        document.body.removeChild(exportContainer);
        hideLoading();
        
    } catch (error) {
        console.error('Erro ao exportar PDF:', error);
        hideLoading();
        alert('Erro ao exportar para PDF. Consulte o console para detalhes.');
    }
}

// ======================
// FUNÇÕES UTILITÁRIAS
// ======================
function showLoading(title = 'Processando...', subtitle = 'Aguarde um momento') {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    
    const textEl = document.getElementById('loading-text');
    const subtitleEl = document.getElementById('loading-subtitle');
    
    if (textEl) textEl.textContent = title;
    if (subtitleEl) subtitleEl.textContent = subtitle;
    overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
}

function clearAll() {
    if (confirm('Tem certeza que deseja limpar todo o fluxo?')) {
        connectionLabels.clear();
        labelUpdateCallbacks.clear();
        editor.clear();
        
        const labelContainer = document.querySelector('.connection-label-container');
        if (labelContainer) labelContainer.remove();
        
        const container = document.getElementById('drawflow');
        container.innerHTML = '';
        
        editor = new Drawflow(container);
        editor.start();
        editor.reroute = true;
        editor.reroute_fix_curvature = true;
        editor.force_first_input = false;
        
        selectedNodeId = null;
        gatewayMode = false;
        nodeIdCounter = 1;
        
        history = [];
        historyIndex = -1;
        updateHistoryButtons();
        
        setupDrawflowEvents();
        saveState();
    }
}

// Listener para nome do processo
const processNameInput = document.getElementById('process-name');
if (processNameInput) {
    processNameInput.addEventListener('input', function() {
        updateProcessInfo();
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => saveState(), 1000);
    });
}
