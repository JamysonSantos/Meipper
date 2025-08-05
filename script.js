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
    { label: 'Caminho 1', pathName: 'Sim', task: '', description: '', actor: '', tasks: [] },
    { label: 'Caminho 2', pathName: 'Não', task: '', description: '', actor: '', tasks: [] }
];
let nodeIdCounter = 1;

// Sistema melhorado de gerenciamento de labels
let connectionLabels = new Map();
let labelUpdateCallbacks = new Map();

// Sistema de descrições de tarefas
let taskDescriptions = new Map();
let currentEditingTask = null;

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
window.exportDocumentationPDF = exportDocumentationPDF;
window.exportDocumentationWord = exportDocumentationWord;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.resetZoom = resetZoom;
window.addMoreColors = addMoreColors;
window.addActor = addActor;
window.showTaskDescription = showTaskDescription;
window.editPathLabel = editPathLabel;

// ======================
// INICIALIZAÇÃO
// ======================
document.addEventListener('DOMContentLoaded', function() {
    initializeDrawflow();
    renderColorPicker();
    updateProcessInfo();
    setupKeyboardEvents();
    setupButtonListeners();
    setupExportDropdown();
    setupDescriptionPopup();
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

function setupExportDropdown() {
    const exportBtn = document.querySelector('[data-action="toggle-export"]');
    const exportDropdown = document.querySelector('.export-dropdown');
    const exportMenu = document.getElementById('export-menu');

    if (exportBtn && exportDropdown) {
        exportBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            exportDropdown.classList.toggle('active');
        });

        // Fechar dropdown ao clicar fora
        document.addEventListener('click', function(e) {
            if (!exportDropdown.contains(e.target)) {
                exportDropdown.classList.remove('active');
            }
        });

        // Fechar dropdown ao selecionar uma opção
        const exportOptions = exportMenu.querySelectorAll('.export-option');
        exportOptions.forEach(option => {
            option.addEventListener('click', function() {
                exportDropdown.classList.remove('active');
            });
        });
    }
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
    
    // Botões de exportação visual
    document.querySelector('[data-action="export-png"]').addEventListener('click', exportToPNG);
    document.querySelector('[data-action="export-pdf"]').addEventListener('click', exportToPDF);

    // Botões de exportação de documentação
    document.querySelector('[data-action="export-doc-pdf"]').addEventListener('click', exportDocumentationPDF);
    document.querySelector('[data-action="export-doc-word"]').addEventListener('click', exportDocumentationWord);

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

    // Adicionar tarefa ao pressionar Enter
    document.getElementById('task-input').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTask('task');
        }
    });
}

// ======================
// SISTEMA DE DESCRIÇÕES
// ======================
function setupDescriptionPopup() {
    const popup = document.getElementById('description-popup');
    const closeBtn = document.getElementById('description-popup-close');
    const cancelBtn = document.getElementById('description-popup-cancel');
    const saveBtn = document.getElementById('description-popup-save');

    closeBtn.addEventListener('click', hideDescriptionPopup);
    cancelBtn.addEventListener('click', hideDescriptionPopup);
    saveBtn.addEventListener('click', saveTaskDescription);

    // Fechar popup ao clicar fora
    popup.addEventListener('click', function(e) {
        if (e.target === popup) {
            hideDescriptionPopup();
        }
    });

    // ESC para fechar
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && popup.classList.contains('active')) {
            hideDescriptionPopup();
        }
    });
}

function showTaskDescription(nodeId, taskName) {
    currentEditingTask = nodeId;
    const popup = document.getElementById('description-popup');
    const title = document.getElementById('description-popup-title');
    const textarea = document.getElementById('description-popup-textarea');

    title.textContent = `Descrição: ${taskName}`;
    textarea.value = taskDescriptions.get(nodeId) || '';
    
    popup.classList.add('active');
    
    // Focus no textarea após a animação
    setTimeout(() => {
        textarea.focus();
    }, 300);
}

function hideDescriptionPopup() {
    const popup = document.getElementById('description-popup');
    popup.classList.remove('active');
    currentEditingTask = null;
}

function saveTaskDescription() {
    if (!currentEditingTask) return;

    const textarea = document.getElementById('description-popup-textarea');
    const description = textarea.value.trim();
    
    if (description) {
        taskDescriptions.set(currentEditingTask, description);
    } else {
        taskDescriptions.delete(currentEditingTask);
    }

    // Atualizar o botão de descrição
    updateDescriptionButton(currentEditingTask);
    
    hideDescriptionPopup();
    saveState();
}

function updateDescriptionButton(nodeId) {
    const node = document.getElementById(`node-${nodeId}`);
    if (!node) return;

    const btn = node.querySelector('.task-description-btn');
    if (!btn) return;

    const hasDescription = taskDescriptions.has(nodeId);
    
    if (hasDescription) {
        btn.classList.add('has-description');
        btn.textContent = '+'; // Mantém o mesmo sinal de "+"
    } else {
        btn.classList.remove('has-description');
        btn.textContent = '+';
    }
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
        taskDescriptions.delete(parseInt(id));
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
        taskDescriptions: Array.from(taskDescriptions.entries()),
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
        taskDescriptions.clear();
        
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

        if (state.taskDescriptions && state.taskDescriptions.length > 0) {
            state.taskDescriptions.forEach(([nodeId, description]) => {
                taskDescriptions.set(parseInt(nodeId), description);
            });
            
            setTimeout(() => {
                state.taskDescriptions.forEach(([nodeId]) => {
                    updateDescriptionButton(parseInt(nodeId));
                });
            }, 200);
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
        const descriptionInput = document.getElementById('task-description-input');
        const description = descriptionInput.value.trim();

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
        
        // Salvar descrição se fornecida
        if (description) {
            taskDescriptions.set(nodeId, description);
            updateDescriptionButton(nodeId);
        }
        
        taskInput.value = '';
        descriptionInput.value = '';
        
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
    
    editor.addNode('start', 0, 1, pos.x - 100, pos.y - 1, 'start', { name: 'Início' }, html);
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
                <button class="task-description-btn" onclick="showTaskDescription(${nodeId}, '${taskName.replace(/'/g, "\\'")}')">+</button>
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
    taskDescriptions.delete(nodeId);
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
                <label>Descrição da Tarefa (opcional):</label>
                <textarea placeholder="Descreva detalhadamente como executar esta tarefa..." 
                          data-index="${index}" 
                          data-field="description"
                          style="min-height: 80px;">${path.description || ''}</textarea>
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

    document.querySelectorAll('input, textarea, select').forEach(element => {
    element.addEventListener('change', function() {
        const index = parseInt(this.dataset.index);
        const field = this.dataset.field;
        const value = this.value;
        
        if (gatewayPaths[index]) {
            gatewayPaths[index][field] = value;
        }
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

    // Atualiza os paths com os valores dos campos antes de criar o gateway
    updateAllGatewayPathsFromUI();

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
        const offsetY = (index - (validPaths.length - 1)/2) * 150;
        const pathY = gatewayY + offsetY;
        
        const pathTaskId = createTaskNodeAtPosition(
            path.task, 
            path.actor, 
            actorColor, 
            gatewayNode.pos_x + 150, 
            pathY,
            path.pathName,
            path.description // Passando a descrição
        );
        
        // Salvando a descrição no mapa global
        if (path.description && path.description.trim()) {
            taskDescriptions.set(pathTaskId, path.description.trim());
            updateDescriptionButton(pathTaskId);
        }
        
        editor.addConnection(gatewayId, pathTaskId, 'output_1', 'input_1');
    });

    cancelGateway();
    selectedNodeId = gatewayId;
    saveState(); // Garantindo que o estado seja salvo
}

function updateAllGatewayPathsFromUI() {
    document.querySelectorAll('.path-block').forEach((block, index) => {
        if (gatewayPaths[index]) {
            gatewayPaths[index].pathName = block.querySelector('[data-field="pathName"]').value;
            gatewayPaths[index].task = block.querySelector('[data-field="task"]').value;
            gatewayPaths[index].description = block.querySelector('[data-field="description"]').value;
            gatewayPaths[index].actor = block.querySelector('[data-field="actor"]').value;
        }
    });
}

function createTaskNodeAtPosition(taskName, actor, color, x, y, pathName, description = '') {
    const nodeId = nodeIdCounter++;
    const hasDescription = description && description.trim() !== '';
    
    const html = `
        <div class="task-node" id="node-${nodeId}">
            <div class="path-label" ondblclick="editPathLabel(event, ${nodeId})">${pathName}</div>
            <div class="task-content" style="background-color: ${color}" ondblclick="editTaskText(event, ${nodeId})">
                ${taskName}
                <button class="task-description-btn ${hasDescription ? 'has-description' : ''}" 
                        onclick="showTaskDescription(${nodeId}, '${taskName.replace(/'/g, "\\'")}')">
                    +
                </button>
            </div>
            <div class="task-actor">${actor}</div>
        </div>
    `;
    
    editor.addNode('task', 1, 1, x, y, 'task', { 
        name: taskName,
        actor: actor,
        color: color,
        pathName: pathName,
        description: description
    }, html);
    
    // Se já tiver descrição, salva no mapa global
    if (hasDescription) {
        taskDescriptions.set(nodeId, description.trim());
    }
    
    return nodeId;
}

function editPathLabel(event, nodeId) {
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
            if (nodeData) nodeData.data.pathName = newText;
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

function cancelGateway() {
    gatewayMode = false;
    const panel = document.getElementById('gateway-panel');
    if (panel) panel.style.display = 'none';
    
    document.getElementById('gateway-question').value = '';
    
    // Reset completo mantendo a estrutura
    gatewayPaths = gatewayPaths.map(path => ({
        ...path,
        task: '',
        description: '',
        actor: ''
    }));
    
    // Forçar nova renderização
    renderGatewayPaths();
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
            taskDescriptions: Array.from(taskDescriptions.entries()),
            history: history.slice(0, historyIndex + 1),
            historyIndex: historyIndex,
            timestamp: Date.now(),
            version: '2.1'
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

                if (data.taskDescriptions && data.taskDescriptions.length > 0) {
                    data.taskDescriptions.forEach(([nodeId, description]) => {
                        taskDescriptions.set(parseInt(nodeId), description);
                    });
                    
                    setTimeout(() => {
                        data.taskDescriptions.forEach(([nodeId]) => {
                            updateDescriptionButton(parseInt(nodeId));
                        });
                    }, 300);
                }
                
                if (data.history && data.version >= '2.0') {
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
// FUNÇÕES DE EXPORTAÇÃO VISUAL
// ======================

async function exportToPNG() {
    // Verificar se há nó selecionado
    if (selectedNodeId) {
        alert('Por favor, desmarque o elemento selecionado antes de exportar. Clique em qualquer área vazia do canvas para desmarcar.');
        return;
    }
    resetZoom();
    showLoading('Exportando PNG...', 'Renderizando fluxo completo...');

    try {
        const processName = document.getElementById('process-name').value.trim() || 'Processo sem nome';
        const actorsList = Object.entries(actors).map(([name, color]) => ({ name, color }));

        // 1. Save original state
        const originalState = {
            transform: document.querySelector('#drawflow').style.transform,
            overflow: document.getElementById('drawflow').style.overflow,
            scrollTop: document.querySelector('.drawflow').scrollTop,
            scrollLeft: document.querySelector('.drawflow').scrollLeft
        };

        // 2. Reset zoom/scroll
        document.querySelector('#drawflow').style.transform = 'none';
        document.getElementById('drawflow').style.overflow = 'visible';
        document.querySelector('.drawflow').scrollTop = 0;
        document.querySelector('.drawflow').scrollLeft = 0;

        // 3. Calculate total flow dimensions
        const { minX, minY, totalWidth, totalHeight } = calculateTotalFlowDimensions();

        // 4. Margin settings
        const margin = {
            top: 180,    // Header + space
            right: 60,
            bottom: 60,
            left: 60
        };

        // 5. Create export container
        const exportContainer = document.createElement('div');
        Object.assign(exportContainer.style, {
            position: 'absolute',
            left: '-9999px',
            width: `${totalWidth + margin.left + margin.right}px`,
            height: `${totalHeight + margin.top + margin.bottom}px`,
            backgroundColor: '#f8fafc',
            overflow: 'visible'
        });
        document.body.appendChild(exportContainer);

        // 6. Add header
        const header = document.createElement('div');
        header.innerHTML = `
            <h2 style="font-size: 20px; margin: 0 0 10px 0;">${processName}</h2>
            <div style="font-size: 14px;">
                <strong>Responsáveis:</strong>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                    ${actorsList.map(actor => `
                        <span style="background: ${actor.color}; color: white; padding: 4px 12px; border-radius: 20px;">
                            ${actor.name}
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
        header.style.position = 'absolute';
        header.style.top = '20px';
        header.style.left = `${margin.left}px`;
        header.style.right = `${margin.right}px`;
        exportContainer.appendChild(header);

        // 7. Clone entire drawflow content
        const drawflowClone = document.querySelector('#drawflow').cloneNode(true);
        drawflowClone.style.transform = 'none';
        drawflowClone.style.position = 'absolute';
        drawflowClone.style.left = `${margin.left - minX}px`;
        drawflowClone.style.top = `${margin.top - minY}px`;
        drawflowClone.style.width = `${totalWidth}px`;
        drawflowClone.style.height = `${totalHeight}px`;
        drawflowClone.style.overflow = 'visible';

        // 8. Hide description buttons for export
        const descriptionBtns = drawflowClone.querySelectorAll('.task-description-btn');
        descriptionBtns.forEach(btn => btn.style.display = 'none');

        // 9. Force render all connections
        await forceRenderAllConnections(drawflowClone);

        exportContainer.appendChild(drawflowClone);
        await new Promise(resolve => setTimeout(resolve, 500));

        // 10. Generate image
        const canvas = await html2canvas(exportContainer, {
            scale: 3,
            backgroundColor: '#f8fafc',
            logging: false,
            useCORS: true,
            windowWidth: exportContainer.scrollWidth,
            windowHeight: exportContainer.scrollHeight,
            ignoreElements: el => el.classList.contains('input') || 
                              el.classList.contains('output') ||
                              el.classList.contains('drawflow-delete') ||
                              el.classList.contains('task-description-btn')
        });

        // 11. Create download
        const link = document.createElement('a');

        // Format process name (replace underscores with spaces)
        const formattedProcessName = processName.replace(/[^a-z0-9]/gi, ' ');

        // Format date in Brazilian format (DD/MM/YYYY)
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        const formattedDate = `(${day}/${month}/${year})`;

        link.download = `${formattedProcessName} ${formattedDate}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        // 12. Restore original state
        document.querySelector('#drawflow').style.transform = originalState.transform;
        document.getElementById('drawflow').style.overflow = originalState.overflow;
        document.querySelector('.drawflow').scrollTop = originalState.scrollTop;
        document.querySelector('.drawflow').scrollLeft = originalState.scrollLeft;
        document.body.removeChild(exportContainer);

    } catch (error) {
        console.error('Erro ao exportar PNG:', error);
        alert('Erro ao exportar: ' + error.message);
    } finally {
        hideLoading();
    }
}

function calculateTotalFlowDimensions() {
    const nodes = Array.from(document.querySelectorAll('.drawflow-node'));
    const container = document.querySelector('#drawflow');
    const containerRect = container.getBoundingClientRect();

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    nodes.forEach(node => {
        const rect = node.getBoundingClientRect();
        const x = rect.left - containerRect.left;
        const y = rect.top - containerRect.top;
        
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + rect.width);
        maxY = Math.max(maxY, y + rect.height);
    });

    return {
        minX: Math.min(minX, 0),
        minY: Math.min(minY, 0),
        totalWidth: Math.max(800, maxX - minX),
        totalHeight: Math.max(600, maxY - minY)
    };
}

async function forceRenderAllConnections(container) {
    // 1. Force SVG recalculation
    const svgElements = container.querySelectorAll('svg.drawflow-connection');
    svgElements.forEach(svg => {
        svg.style.display = 'none';
        void svg.offsetHeight; // Trigger reflow
        svg.style.display = '';
    });

    // 2. Delay for async rendering
    await new Promise(resolve => setTimeout(resolve, 500));

    // 3. Check for missing connections
    const missingConnections = [];
    container.querySelectorAll('.drawflow-node').forEach(node => {
        const nodeId = node.id.replace('node-', '');
        const outputs = node.querySelectorAll('.output .connection');
        
        outputs.forEach(output => {
            const connectionId = output.getAttribute('data-id');
            if (!container.querySelector(`path[data-id="${connectionId}"]`)) {
                missingConnections.push({
                    source: nodeId,
                    target: output.getAttribute('data-node-id')
                });
            }
        });
    });

    // 4. Recreate missing connections
    if (missingConnections.length > 0) {
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        document.body.appendChild(tempDiv);

        missingConnections.forEach(conn => {
            const sourceNode = container.querySelector(`#node-${conn.source}`);
            const targetNode = container.querySelector(`#node-${conn.target}`);
            
            if (sourceNode && targetNode) {
                const pathData = calculateConnectionPath(sourceNode, targetNode);
                const newPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                newPath.setAttribute('d', pathData);
                newPath.setAttribute('class', 'main-path');
                newPath.setAttribute('data-id', `temp-${Date.now()}`);
                
                const svg = container.querySelector('svg.drawflow-connection') || 
                            createNewSvg(container);
                svg.appendChild(newPath);
            }
        });

        document.body.removeChild(tempDiv);
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

function calculateConnectionPath(sourceNode, targetNode) {
    const sourceRect = sourceNode.getBoundingClientRect();
    const targetRect = targetNode.getBoundingClientRect();
    
    const startX = sourceRect.right;
    const startY = sourceRect.top + sourceRect.height / 2;
    const endX = targetRect.left;
    const endY = targetRect.top + targetRect.height / 2;

    // Bezier curve for smooth connection
    const cpX1 = startX + Math.max(100, (endX - startX) / 2);
    const cpX2 = endX - Math.max(100, (endX - startX) / 2);

    return `M${startX},${startY} C${cpX1},${startY} ${cpX2},${endY} ${endX},${endY}`;
}

function createNewSvg(container) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'drawflow-connection');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    container.appendChild(svg);
    return svg;
}

async function exportToPDF() {
    // Verificar se há nó selecionado
    if (selectedNodeId) {
        alert('Por favor, desmarque o elemento selecionado antes de exportar. Clique em qualquer área vazia do canvas para desmarcar.');
        return;
    }

    resetZoom();
    showLoading('Exportando PDF...', 'Renderizando fluxo completo...');

    try {
        const { jsPDF } = window.jspdf;
        const processName = document.getElementById('process-name').value.trim() || 'Processo sem nome';
        const actorsList = Object.entries(actors).map(([name, color]) => ({ name, color }));

        // 1. Save original state
        const originalState = {
            transform: document.querySelector('#drawflow').style.transform,
            overflow: document.getElementById('drawflow').style.overflow,
            scrollTop: document.querySelector('.drawflow').scrollTop,
            scrollLeft: document.querySelector('.drawflow').scrollLeft
        };

        // 2. Reset zoom/scroll
        document.querySelector('#drawflow').style.transform = 'none';
        document.getElementById('drawflow').style.overflow = 'visible';
        document.querySelector('.drawflow').scrollTop = 0;
        document.querySelector('.drawflow').scrollLeft = 0;

        // 3. Calculate total flow dimensions
        const { minX, minY, totalWidth, totalHeight } = calculateTotalFlowDimensions();

        // 4. Margin settings
        const margin = {
            top: 180,    // Header + space
            right: 60,
            bottom: 60,
            left: 60
        };

        // 5. Create export container
        const exportContainer = document.createElement('div');
        Object.assign(exportContainer.style, {
            position: 'absolute',
            left: '-9999px',
            width: `${totalWidth + margin.left + margin.right}px`,
            height: `${totalHeight + margin.top + margin.bottom}px`,
            backgroundColor: '#f8fafc',
            overflow: 'visible'
        });
        document.body.appendChild(exportContainer);

        // 6. Add header
        const header = document.createElement('div');
        header.innerHTML = `
            <h2 style="font-size: 20px; margin: 0 0 10px 0;">${processName}</h2>
            <div style="font-size: 14px;">
                <strong>Responsáveis:</strong>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                    ${actorsList.map(actor => `
                        <span style="background: ${actor.color}; color: white; padding: 4px 12px; border-radius: 20px;">
                            ${actor.name}
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
        header.style.position = 'absolute';
        header.style.top = '20px';
        header.style.left = `${margin.left}px`;
        header.style.right = `${margin.right}px`;
        exportContainer.appendChild(header);

        // 7. Clone entire drawflow content
        const drawflowClone = document.querySelector('#drawflow').cloneNode(true);
        drawflowClone.style.transform = 'none';
        drawflowClone.style.position = 'absolute';
        drawflowClone.style.left = `${margin.left - minX}px`;
        drawflowClone.style.top = `${margin.top - minY}px`;
        drawflowClone.style.width = `${totalWidth}px`;
        drawflowClone.style.height = `${totalHeight}px`;
        drawflowClone.style.overflow = 'visible';

        // 8. Hide description buttons for export
        const descriptionBtns = drawflowClone.querySelectorAll('.task-description-btn');
        descriptionBtns.forEach(btn => btn.style.display = 'none');

        // 9. Force render all connections
        await forceRenderAllConnections(drawflowClone);

        exportContainer.appendChild(drawflowClone);
        await new Promise(resolve => setTimeout(resolve, 500));

        // 10. Generate image
        const canvas = await html2canvas(exportContainer, {
            scale: 2,
            backgroundColor: '#f8fafc',
            logging: false,
            useCORS: true,
            windowWidth: exportContainer.scrollWidth,
            windowHeight: exportContainer.scrollHeight,
            ignoreElements: el => el.classList.contains('input') || 
                              el.classList.contains('output') ||
                              el.classList.contains('drawflow-delete') ||
                              el.classList.contains('task-description-btn')
        });

        // 11. Create PDF
        const pdf = new jsPDF({
            orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });

        pdf.addImage(canvas, 'PNG', 0, 0, canvas.width, canvas.height);

        // Format file name
        const formattedProcessName = processName.replace(/[^a-z0-9]/gi, ' ').replace(/\s+/g, ' ').trim();
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        const fileName = `${formattedProcessName} (${day}/${month}/${year}).pdf`;

        pdf.save(fileName);

        // 12. Restore original state
        document.querySelector('#drawflow').style.transform = originalState.transform;
        document.getElementById('drawflow').style.overflow = originalState.overflow;
        document.querySelector('.drawflow').scrollTop = originalState.scrollTop;
        document.querySelector('.drawflow').scrollLeft = originalState.scrollLeft;
        document.body.removeChild(exportContainer);

    } catch (error) {
        console.error('Erro ao exportar PDF:', error);
        alert('Erro ao exportar: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ======================
// FUNÇÕES DE EXPORTAÇÃO DE DOCUMENTAÇÃO
// ======================

function collectAllTasks() {
    const tasks = [];
    const processedNodes = new Set();
    
    // Obter todos os nós do drawflow
    const drawflowData = editor.export();
    if (!drawflowData || !drawflowData.drawflow || !drawflowData.drawflow.Home || !drawflowData.drawflow.Home.data) {
        return tasks;
    }
    
    const nodes = drawflowData.drawflow.Home.data;
    
    // Processar nós em ordem lógica
    Object.values(nodes).forEach(node => {
        if (processedNodes.has(node.id)) return;
        
        if (node.class === 'task') {
            const nodeData = node.data;
            const taskName = nodeData.name || 'Tarefa sem nome';
            const actor = nodeData.actor || 'Não especificado';
            const description = taskDescriptions.get(parseInt(node.id)) || 'Descrição não fornecida';
            const pathName = nodeData.pathName || null;
            
            tasks.push({
                id: node.id,
                name: taskName,
                description: description,
                actor: actor,
                pathName: pathName,
                type: 'task'
            });
            
            processedNodes.add(node.id);
        } else if (node.class === 'gateway') {
            const nodeData = node.data;
            const question = nodeData.question || 'Decisão sem nome';
            
            tasks.push({
                id: node.id,
                name: question,
                description: 'Ponto de decisão no processo',
                actor: 'Sistema/Processo',
                pathName: null,
                type: 'gateway'
            });
            
            processedNodes.add(node.id);
        }
    });
    
    return tasks.sort((a, b) => parseInt(a.id) - parseInt(b.id));
}

async function exportDocumentationPDF() {
    showLoading('Exportando Documentação PDF...', 'Coletando informações do processo...');
    
    try {
        const { jsPDF } = window.jspdf;
        const processName = document.getElementById('process-name').value.trim() || 'Processo sem nome';
        const tasks = collectAllTasks();
        const today = new Date();
        
        if (tasks.length === 0) {
            alert('Não há tarefas para exportar. Crie algumas tarefas no fluxo primeiro.');
            return;
        }
        
        // Criar PDF
        const pdf = new jsPDF();
        let yPosition = 20;
        const margin = 20;
        const pageWidth = pdf.internal.pageSize.width - 2 * margin;
        
        // Configurar fonte para suporte a caracteres especiais
        pdf.setFont('helvetica');
        
        // Cabeçalho
        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        pdf.text(processName, margin, yPosition);
        yPosition += 15;
        
        // Informações do processo
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        
        // Responsáveis
        const responsaveis = Object.keys(actors).join(', ') || 'Não especificados';
        pdf.text('Responsáveis: ' + responsaveis, margin, yPosition);
        yPosition += 10;
        
        // Data de criação
        const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
        pdf.text('Data de criação: ' + formattedDate, margin, yPosition);
        yPosition += 20;
        
        // Título da seção de atividades
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Atividades', margin, yPosition);
        yPosition += 15;
        
        // Listar tarefas
        pdf.setFontSize(11);
        let taskNumber = 1;
        
        for (const task of tasks) {
            // Verificar se precisa de nova página
            if (yPosition > 250) {
                pdf.addPage();
                yPosition = 20;
            }
            
            let taskTitle = '';
            if (task.type === 'gateway') {
                taskTitle = `${taskNumber}. DECISÃO: ${task.name}`;
            } else {
                taskTitle = `${taskNumber}. ${task.name}`;
                if (task.pathName) {
                    taskTitle += ` (${task.pathName})`;
                }
            }
            
            // Nome da tarefa
            pdf.setFont('helvetica', 'bold');
            const titleLines = pdf.splitTextToSize(taskTitle, pageWidth);
            pdf.text(titleLines, margin, yPosition);
            yPosition += titleLines.length * 5 + 3;
            
            // Responsável
            pdf.setFont('helvetica', 'normal');
            pdf.text('Responsável: ' + task.actor, margin + 10, yPosition);
            yPosition += 7;
            
            // Descrição
            pdf.text('Descrição:', margin + 10, yPosition);
            yPosition += 5;
            
            const descriptionLines = pdf.splitTextToSize(task.description, pageWidth - 20);
            pdf.setFont('helvetica', 'normal');
            pdf.text(descriptionLines, margin + 20, yPosition);
            yPosition += descriptionLines.length * 5 + 10;
            
            taskNumber++;
        }
        
        // Salvar arquivo
        const fileName = `Documentação - ${processName.replace(/[^a-z0-9]/gi, ' ').trim()} (${formattedDate}).pdf`;
        pdf.save(fileName);
        
    } catch (error) {
        console.error('Erro ao exportar documentação PDF:', error);
        alert('Erro ao exportar documentação: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function exportDocumentationWord() {
    showLoading('Exportando Documentação Word...', 'Coletando informações do processo...');
    
    try {
        const processName = document.getElementById('process-name').value.trim() || 'Processo sem nome';
        const tasks = collectAllTasks();
        const today = new Date();
        
        if (tasks.length === 0) {
            alert('Não há tarefas para exportar. Crie algumas tarefas no fluxo primeiro.');
            return;
        }
        
        // Preparar texto para Word
        let documentContent = '';
        
        // Cabeçalho
        documentContent += `${processName}\n`;
        documentContent += `${'='.repeat(processName.length)}\n\n`;
        
        // Informações do processo
        const responsaveis = Object.keys(actors).join(', ') || 'Não especificados';
        const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
        
        documentContent += `Responsáveis: ${responsaveis}\n`;
        documentContent += `Data de criação: ${formattedDate}\n\n`;
        
        // Seção de atividades
        documentContent += `Atividades\n`;
        documentContent += `----------\n\n`;
        
        // Listar tarefas
        let taskNumber = 1;
        
        for (const task of tasks) {
            let taskTitle = '';
            if (task.type === 'gateway') {
                taskTitle = `${taskNumber}. DECISÃO: ${task.name}`;
            } else {
                taskTitle = `${taskNumber}. ${task.name}`;
                if (task.pathName) {
                    taskTitle += ` (${task.pathName})`;
                }
            }
            
            documentContent += `${taskTitle}\n`;
            documentContent += `Responsável: ${task.actor}\n`;
            documentContent += `Descrição: ${task.description}\n\n`;
            
            taskNumber++;
        }
        
        // Criar arquivo Word usando uma abordagem simples
        // Como o docx.js é complexo, vamos criar um arquivo RTF que pode ser aberto pelo Word
        const rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}
\\f0\\fs24 ${documentContent.replace(/\n/g, '\\par ')}}`;
        
        // Alternativamente, criar um arquivo .txt que pode ser importado
        const blob = new Blob([documentContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `Documentação - ${processName.replace(/[^a-z0-9]/gi, ' ').trim()} (${formattedDate}).txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        // Mostrar instruções ao usuário
        alert('Arquivo de documentação exportado com sucesso!\n\nO arquivo foi salvo como .txt para compatibilidade máxima.\nVocê pode abrir este arquivo no Microsoft Word e salvá-lo como .docx se necessário.');
        
    } catch (error) {
        console.error('Erro ao exportar documentação Word:', error);
        alert('Erro ao exportar documentação: ' + error.message);
    } finally {
        hideLoading();
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
        taskDescriptions.clear();
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
