// Wrap em IIFE para garantir escopo seguro
(function(global) {
    'use strict';

    // ============= VARIÁVEIS GLOBAIS =============
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
    let connectionLabels = new Map();
    let labelUpdateCallbacks = new Map();
    let editor;
    let currentZoom = 1;
    let container;

    // ============= INICIALIZAÇÃO PRINCIPAL =============
    function initialize() {
        container = document.getElementById('drawflow');
        if (!container) {
            console.error('Elemento #drawflow não encontrado!');
            return;
        }

        if (typeof Drawflow === 'undefined') {
            console.error('Drawflow não carregado! Verifique o CDN');
            return;
        }

        initializeDrawflow();
        renderColorPicker();
        updateProcessInfo();
        setupKeyboardEvents();
        console.log('Sistema inicializado com sucesso');
    }

    // ============= DRAWFLOW =============
    function initializeDrawflow() {
        editor = new Drawflow(container);
        editor.reroute = true;
        editor.reroute_fix_curvature = true;
        editor.force_first_input = false;
        editor.start();
        setupDrawflowEvents();
    }

    function setupDrawflowEvents() {
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
            updateAllLabelPositions();
        });

        editor.on('nodeRemoved', function(id) {
            removeLabelsForNode(id);
        });

        editor.on('connectionRemoved', function(connection) {
            removeLabelForConnection(connection.output_id, connection.input_id);
        });

        editor.on('nodeMoved', function(id) {
            setTimeout(updateAllLabelPositions, 10);
        });

        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && 
                    (mutation.attributeName === 'style' || mutation.attributeName === 'transform')) {
                    updateAllLabelPositions();
                }
            });
        });

        observer.observe(container, {
            attributes: true,
            subtree: true,
            attributeFilter: ['style', 'transform']
        });
    }

    // ============= GERENCIAMENTO DE NÓS =============
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

    // ============= GERENCIAMENTO DE ATORES =============
    function addActor() {
        const input = document.getElementById('actor-input');
        const name = input.value.trim();
        
        if (!name) return;
        
        if (actors[name]) {
            alert('Esse responsável já existe!');
            return;
        }

        if (Object.values(actors).includes(selectedColor)) {
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
            badge.innerHTML = `${name}<button onclick="removeActor('${name}')">×</button>`;
            container.appendChild(badge);
        });
    }

    // ============= GERENCIAMENTO DE PROCESSOS =============
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

    // ============= FUNÇÕES DE INTERFACE =============
    function renderColorPicker() {
        const container = document.getElementById('color-picker');
        if (!container) return;
        
        container.innerHTML = '';
        colors.forEach(color => {
            const colorEl = document.createElement('div');
            colorEl.className = 'color-option';
            colorEl.style.backgroundColor = color;
            if (color === selectedColor) colorEl.classList.add('selected');
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

    // ============= CONTROLES DE ZOOM =============
    function updateZoomDisplay() {
        const zoomPercentage = Math.round(currentZoom * 100);
        const zoomIndicator = document.getElementById('zoom-indicator');
        const zoomDisplay = document.getElementById('zoom-display');
        
        if (zoomIndicator) zoomIndicator.textContent = zoomPercentage + '%';
        if (zoomDisplay) zoomDisplay.textContent = 'Zoom: ' + zoomPercentage + '%';
    }

    function zoomIn() {
        editor.zoom_in();
    }

    function zoomOut() {
        editor.zoom_out();
    }

    function resetZoom() {
        editor.zoom_reset();
    }

    // ============= GATEWAY FUNCTIONS =============
    function startGatewayMode() {
        if (!selectedNodeId) {
            alert('Selecione uma tarefa antes de criar um caminho de decisão!');
            return;
        }
        
        gatewayMode = true;
        const panel = document.getElementById('gateway-panel');
        if (panel) panel.style.display = 'block';
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
        const questionInput = document.getElementById('gateway-question');
        if (!questionInput) return;
        
        const question = questionInput.value.trim();
        
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
            const offsetY = (index - (validPaths.length - 1)/2) * 150;
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

    // ============= GERENCIAMENTO DE LABELS =============
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
        
        if (!sourceNode || !targetNode || !label.parentElement) return;
        
        const containerRect = document.getElementById('drawflow').getBoundingClientRect();
        const sourceRect = sourceNode.getBoundingClientRect();
        const targetRect = targetNode.getBoundingClientRect();
        
        const midX = ((sourceRect.right + targetRect.left)/2 - containerRect.left)/currentZoom;
        const midY = (((sourceRect.top + sourceRect.bottom)/2 + (targetRect.top + targetRect.bottom)/2)/2 - containerRect.top)/currentZoom;
        
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
        if (labelUpdateCallbacks.has(label.id)) {
            labelUpdateCallbacks.delete(label.id);
        }
        connectionLabels.delete(connectionKey);
        if (label.parentElement) {
            label.parentElement.removeChild(label);
        }
    }

    // ============= EDIÇÃO DE TEXTO =============
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

    // ============= FUNÇÕES UTILITÁRIAS =============
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
            
            setupDrawflowEvents();
        }
    }

    function setupKeyboardEvents() {
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Delete' && selectedNodeId) {
                deleteNode(selectedNodeId);
            }
        });
    }

    function handleTaskInputKeydown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            addTask('task');
        }
    }

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
            selectedNodeId = createStartNode();

        } else if (type === 'end') {
            const nodeId = createEndNode();
            
            if (selectedNodeId) {
                editor.addConnection(selectedNodeId, nodeId, 'output_1', 'input_1');
            }
            
            selectedNodeId = nodeId;
        }
    }

    // ============= EXPORTAÇÃO PARA ESCOPO GLOBAL =============
    global.removeActor = removeActor;
    global.editTaskText = editTaskText;
    global.editGatewayText = editGatewayText;
    global.addTask = addTask;
    global.startGatewayMode = startGatewayMode;
    global.addGatewayPath = addGatewayPath;
    global.removeGatewayPath = removeGatewayPath;
    global.finalizeGateway = finalizeGateway;
    global.cancelGateway = cancelGateway;
    global.zoomIn = zoomIn;
    global.zoomOut = zoomOut;
    global.resetZoom = resetZoom;
    global.clearAll = clearAll;
    global.handleTaskInputKeydown = handleTaskInputKeydown;
    global.addMoreColors = addMoreColors;
    global.selectColor = selectColor;
    global.addActor = addActor;

    // ============= INICIALIZAÇÃO =============
    document.addEventListener('DOMContentLoaded', initialize);

})(window);
