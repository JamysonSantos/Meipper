// Global variables
        const COLORS = ['#2196f3', '#f44336', '#4caf50', '#ff9800', '#9c27b0', '#3f51b5', '#009688', '#795548'];
        const EXTENDED_COLORS = ['#607d8b', '#e91e63', '#cddc39', '#00bcd4', '#ffc107', '#8bc34a', '#ff5722', '#673ab7'];
        
        let actors = {};
        let selectedColor = COLORS[0];
        let colors = [...COLORS];
        let tasks = [];
        let connections = [];
        let selectedTask = null;
        let gatewayMode = false;
        let gatewayPaths = [
            { label: 'Caminho 1', pathName: 'Sim', task: '', actor: '', tasks: [] },
            { label: 'Caminho 2', pathName: 'Não', task: '', actor: '', tasks: [] }
        ];
        let taskIdCounter = 1;
        let connectionIdCounter = 1;

        // Canvas variables
        let zoomLevel = 1;
        let panX = 0;
        let panY = 0;
        let isDragging = false;
        let isDraggingTask = false;
        let draggedTask = null;
        let lastMouseX = 0;
        let lastMouseY = 0;
        let dragOffsetX = 0;
        let dragOffsetY = 0;

        // Connection variables
        let isConnecting = false;
        let connectionStart = null;
        let tempConnectionEnd = null;

        const SPACING_X = 160;
        const SPACING_Y = 120;
        const INITIAL_X = 50;
        const INITIAL_Y = 50;

        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            renderColorPicker();
            updateProcessInfo();
            setupCanvasEvents();
            setupKeyboardEvents();
        });

        // Keyboard events
        function setupKeyboardEvents() {
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Delete' && selectedTask) {
                    deleteTask(selectedTask);
                }
            });
        }

        // Canvas setup
        function setupCanvasEvents() {
            const viewport = document.getElementById('canvas-viewport');
            const canvas = document.getElementById('canvas');

            // Zoom with mouse wheel
            viewport.addEventListener('wheel', function(e) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                zoomLevel = Math.max(0.1, Math.min(3, zoomLevel * delta));
                updateCanvasTransform();
            });

            // Pan with mouse drag
            viewport.addEventListener('mousedown', function(e) {
                if (e.target === viewport || e.target === canvas) {
                    isDragging = true;
                    lastMouseX = e.clientX;
                    lastMouseY = e.clientY;
                    viewport.style.cursor = 'grabbing';
                }
            });

            document.addEventListener('mousemove', function(e) {
                if (isDragging && !isDraggingTask && !isConnecting) {
                    const deltaX = e.clientX - lastMouseX;
                    const deltaY = e.clientY - lastMouseY;
                    panX += deltaX / zoomLevel;
                    panY += deltaY / zoomLevel;
                    lastMouseX = e.clientX;
                    lastMouseY = e.clientY;
                    updateCanvasTransform();
                } else if (isDraggingTask && draggedTask) {
                    const rect = document.getElementById('canvas-viewport').getBoundingClientRect();
                    const x = (e.clientX - rect.left - panX * zoomLevel) / zoomLevel - dragOffsetX;
                    const y = (e.clientY - rect.top - panY * zoomLevel) / zoomLevel - dragOffsetY;
                    
                    draggedTask.x = Math.max(0, Math.min(19800, x));
                    draggedTask.y = Math.max(0, Math.min(19800, y));
                    
                    renderCanvas();
                } else if (isConnecting && connectionStart) {
                    // Update temporary connection line
                    const rect = viewport.getBoundingClientRect();
                    const x = (e.clientX - rect.left - panX * zoomLevel) / zoomLevel;
                    const y = (e.clientY - rect.top - panY * zoomLevel) / zoomLevel;
                    tempConnectionEnd = { x, y };
                    renderTempConnection();
                }
            });

            document.addEventListener('mouseup', function() {
                isDragging = false;
                isDraggingTask = false;
                draggedTask = null;
                viewport.style.cursor = 'grab';
                
                // End connection if in progress
                if (isConnecting) {
                    isConnecting = false;
                    connectionStart = null;
                    tempConnectionEnd = null;
                    renderCanvas();
                }
                
                // Remove dragging class from all elements
                document.querySelectorAll('.task-element.dragging').forEach(el => {
                    el.classList.remove('dragging');
                });
            });
        }

        function updateCanvasTransform() {
            const canvas = document.getElementById('canvas');
            canvas.style.transform = `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`;
            document.getElementById('zoom-indicator').textContent = Math.round(zoomLevel * 100) + '%';
            document.getElementById('zoom-display').textContent = 'Zoom: ' + Math.round(zoomLevel * 100) + '%';
        }

        function zoomIn() {
            zoomLevel = Math.min(3, zoomLevel * 1.2);
            updateCanvasTransform();
        }

        function zoomOut() {
            zoomLevel = Math.max(0.1, zoomLevel * 0.8);
            updateCanvasTransform();
        }

        function resetZoom() {
            zoomLevel = 1;
            panX = 0;
            panY = 0;
            updateCanvasTransform();
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

        // Position checking for smart placement
        function isPositionOccupied(x, y, excludeId = null) {
            const buffer = 50; // Buffer space around elements
            return tasks.some(task => {
                if (task.id === excludeId) return false;
                
                const taskWidth = task.type === 'task' ? 220 : (task.type === 'gateway' ? 50 : 50);
                const taskHeight = task.type === 'task' ? 80 : (task.type === 'gateway' ? 80 : 50);
                
                return (x < task.x + taskWidth + buffer && 
                        x + taskWidth + buffer > task.x &&
                        y < task.y + taskHeight + buffer && 
                        y + taskHeight + buffer > task.y);
            });
        }

        function findAvailablePosition(preferredX, preferredY) {
            let x = preferredX;
            let y = preferredY;
            
            // Try the preferred position first
            if (!isPositionOccupied(x, y)) {
                return { x, y };
            }
            
            // Try positions in a spiral pattern
            const maxAttempts = 50;
            const step = 40;
            
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                // Try positions around the preferred location
                const positions = [
                    { x: preferredX + (step * attempt), y: preferredY },
                    { x: preferredX, y: preferredY + (step * attempt) },
                    { x: preferredX - (step * attempt), y: preferredY },
                    { x: preferredX, y: preferredY - (step * attempt) },
                    { x: preferredX + (step * attempt), y: preferredY + (step * attempt) },
                    { x: preferredX - (step * attempt), y: preferredY - (step * attempt) },
                    { x: preferredX + (step * attempt), y: preferredY - (step * attempt) },
                    { x: preferredX - (step * attempt), y: preferredY + (step * attempt) }
                ];
                
                for (const pos of positions) {
                    if (pos.x >= 0 && pos.y >= 0 && pos.x <= 19800 && pos.y <= 19800 && !isPositionOccupied(pos.x, pos.y)) {
                        return pos;
                    }
                }
            }
            
            // Fallback to original position if no free space found
            return { x: preferredX, y: preferredY };
        }

        // Task management
        function getNextPosition() {
            if (tasks.length === 0) {
                return { x: INITIAL_X, y: INITIAL_Y };
            }

            if (selectedTask) {
                const selected = tasks.find(t => t.id === selectedTask);
                if (selected) {
                    const preferredX = selected.x + SPACING_X;
                    const preferredY = selected.y;
                    return findAvailablePosition(preferredX, preferredY);
                }
            }

            const lastTask = tasks[tasks.length - 1];
            const preferredX = lastTask.x + SPACING_X;
            const preferredY = lastTask.y;
            return findAvailablePosition(preferredX, preferredY);
        }

        function addTask(type) {
            if (type !== 'start' && tasks.length === 0) {
                alert('Você precisa iniciar o processo primeiro!');
                return;
            }

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

                const position = getNextPosition();
                const newTask = {
                    id: `task-${taskIdCounter++}`,
                    name: taskName,
                    actor: selectedActor,
                    x: position.x,
                    y: position.y,
                    type: 'task'
                };

                tasks.push(newTask);
                taskInput.value = '';

                // Create connection
                if (tasks.length > 1) {
                    const fromTask = selectedTask ? tasks.find(t => t.id === selectedTask) : tasks[tasks.length - 2];
                    if (fromTask) {
                        connections.push({
                            id: `conn-${connectionIdCounter++}`,
                            from: fromTask.id,
                            to: newTask.id
                        });
                    }
                }

                selectedTask = newTask.id;
            } else if (type === 'start') {
                const position = { x: INITIAL_X, y: INITIAL_Y + 150 };
                const newTask = {
                    id: `task-${taskIdCounter++}`,
                    name: 'Início',
                    actor: '',
                    x: position.x,
                    y: position.y,
                    type: 'start'
                };

                tasks.push(newTask);
                selectedTask = newTask.id;
            } else if (type === 'end') {
                const position = getNextPosition();
                const newTask = {
                    id: `task-${taskIdCounter++}`,
                    name: 'Fim',
                    actor: '',
                    x: position.x,
                    y: position.y,
                    type: 'end'
                };

                tasks.push(newTask);

                // Create connection
                if (tasks.length > 1) {
                    const fromTask = selectedTask ? tasks.find(t => t.id === selectedTask) : tasks[tasks.length - 2];
                    if (fromTask) {
                        connections.push({
                            id: `conn-${connectionIdCounter++}`,
                            from: fromTask.id,
                            to: newTask.id
                        });
                    }
                }

                selectedTask = newTask.id;
            }

            renderCanvas();
        }

        function selectTask(taskId, event) {
            if (event) event.stopPropagation();
            selectedTask = taskId;
            renderCanvas();
        }

        function deleteTask(taskId) {
            tasks = tasks.filter(t => t.id !== taskId);
            connections = connections.filter(c => c.from !== taskId && c.to !== taskId);
            
            if (selectedTask === taskId) {
                selectedTask = null;
            }
            
            renderCanvas();
        }

        function handleTaskInputKeydown(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                addTask('task');
            }
        }

        // Connection functions
        function startConnection(taskId, type, event) {
            event.stopPropagation();
            if (type === 'output') {
                isConnecting = true;
                connectionStart = { taskId, type };
            }
        }

        function endConnection(taskId, type, event) {
            event.stopPropagation();
            if (isConnecting && connectionStart && type === 'input' && connectionStart.taskId !== taskId) {
                // Verifica se a conexão já existe
                const existingConnection = connections.find(c => 
                    c.from === connectionStart.taskId && c.to === taskId
                );
                
                if (!existingConnection) {
                    connections.push({
                        id: `conn-${connectionIdCounter++}`,
                        from: connectionStart.taskId,
                        to: taskId
                    });
                    renderCanvas();
                }
            }
            isConnecting = false;
            connectionStart = null;
            tempConnectionEnd = null;
        }

        function renderTempConnection() {
            if (!isConnecting || !connectionStart || !tempConnectionEnd) return;

            const svg = document.getElementById('connections-svg');
            const fromTask = tasks.find(t => t.id === connectionStart.taskId);
            if (!fromTask) return;

            const fromPoints = getConnectionPoints(fromTask);
            const fromPoint = fromPoints.output;
            if (!fromPoint) return;

            // Remove existing temp connection
            const existingTemp = svg.querySelector('.temp-connection');
            if (existingTemp) {
                existingTemp.remove();
            }

            // Create temp connection line
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('class', 'temp-connection');
            line.setAttribute('x1', fromPoint.x);
            line.setAttribute('y1', fromPoint.y);
            line.setAttribute('x2', tempConnectionEnd.x);
            line.setAttribute('y2', tempConnectionEnd.y);
            svg.appendChild(line);
        }

        // Gateway functions
        function startGatewayMode() {
            if (!selectedTask) {
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
                // Renumerar os caminhos
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

            const selectedTaskObj = tasks.find(t => t.id === selectedTask);
            if (!selectedTaskObj) return;

            // Create gateway
            const gatewayPosition = findAvailablePosition(selectedTaskObj.x + SPACING_X, selectedTaskObj.y);
            const gatewayTask = {
                id: `task-${taskIdCounter++}`,
                name: question,
                actor: '',
                x: gatewayPosition.x,
                y: gatewayPosition.y,
                type: 'gateway',
                question: question,
                paths: validPaths
            };

            tasks.push(gatewayTask);
            connections.push({
                id: `conn-${connectionIdCounter++}`,
                from: selectedTask,
                to: gatewayTask.id
            });

            // Create tasks for each path with smart positioning
            const totalPaths = validPaths.length;
            const pathSpacing = 100;
            const startY = gatewayPosition.y - ((totalPaths - 1) * pathSpacing / 2);
            
            validPaths.forEach((path, index) => {
                const preferredY = startY + (index * pathSpacing);
                const pathTaskPosition = findAvailablePosition(gatewayPosition.x + SPACING_X, preferredY);

                const pathTask = {
                    id: `task-${taskIdCounter++}`,
                    name: path.task,
                    actor: path.actor,
                    x: pathTaskPosition.x,
                    y: pathTaskPosition.y,
                    type: 'task'
                };

                tasks.push(pathTask);
                connections.push({
                    id: `conn-${connectionIdCounter++}`,
                    from: gatewayTask.id,
                    to: pathTask.id,
                    pathLabel: path.pathName
                });
            });

            cancelGateway();
            renderCanvas();
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

        // Get precise connection points for each element type
        function getConnectionPoints(task) {
            const element = document.getElementById(task.id);
            if (!element) return {};
            
            const rect = element.getBoundingClientRect();
            const canvasRect = document.getElementById('canvas').getBoundingClientRect();
            
            // Ajuste para coordenadas relativas ao canvas
            const x = rect.left - canvasRect.left + panX * zoomLevel;
            const y = rect.top - canvasRect.top + panY * zoomLevel;
            const width = rect.width;
            const height = rect.height;
            
            const points = {};
            
            switch(task.type) {
                case 'start':
                    points.output = { 
                        x: x + width, 
                        y: y + height / 2 
                    };
                    break;
                    
                case 'end':
                    points.input = { 
                        x: x, 
                        y: y + height / 2 
                    };
                    break;
                    
                case 'gateway':
                    points.input = { 
                        x: x, 
                        y: y + height / 2 
                    };
                    points.output = { 
                        x: x + width, 
                        y: y + height / 2 
                    };
                    break;
                    
                default: // task
                    points.input = { 
                        x: x, 
                        y: y + height / 2 
                    };
                    points.output = { 
                        x: x + width, 
                        y: y + height / 2 
                    };
            }
            
            return points;
        }

        // Text editing functions
        function editTaskText(event, taskId) {
            event.stopPropagation();
            const element = event.target;
            element.setAttribute('contenteditable', 'true');
            element.focus();
            
            // Seleciona todo o texto
            const range = document.createRange();
            range.selectNodeContents(element);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);

            const finishEditing = () => {
                element.removeAttribute('contenteditable');
                const task = tasks.find(t => t.id === taskId);
                if (task) {
                    task.name = element.textContent.trim();
                    renderCanvas();
                }
            };

            const handleKeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    finishEditing();
                }
                if (e.key === 'Escape') {
                    element.textContent = tasks.find(t => t.id === taskId).name;
                    finishEditing();
                }
            };

            // Adiciona os listeners corretamente (apenas uma vez)
            element.addEventListener('blur', finishEditing, { once: true });
            element.addEventListener('keydown', handleKeydown);

            // Remove os listeners quando terminar
            const cleanUp = () => {
                element.removeEventListener('keydown', handleKeydown);
            };
            element.addEventListener('blur', cleanUp, { once: true });
        }

        function editGatewayText(element, taskId) {
            element.setAttribute('contenteditable', 'true');
            element.focus();

            // Select all text
            const range = document.createRange();
            range.selectNodeContents(element);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);

            element.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    element.blur();
                }
                e.stopPropagation();
            });

            element.addEventListener('blur', function() {
                element.removeAttribute('contenteditable');
                
                // Update gateway data
                const task = tasks.find(t => t.id === taskId);
                if (task) {
                    task.question = element.textContent.trim();
                    task.name = element.textContent.trim();
                    renderCanvas();
                }
            }, { once: true });
        }

        function editConnectionLabel(textElement, connectionId, event) {
            event.stopPropagation();
            
            textElement.setAttribute('contenteditable', 'true');
            textElement.focus();

            // Select all text
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(textElement);
            selection.removeAllRanges();
            selection.addRange(range);

            textElement.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    textElement.blur();
                }
            });

            textElement.addEventListener('blur', function() {
                textElement.removeAttribute('contenteditable');
                
                // Update connection data
                const connection = connections.find(c => c.id === connectionId);
                if (connection) {
                    connection.pathLabel = textElement.textContent.trim();
                    renderCanvas();
                }
            }, { once: true });
        }

        // Canvas rendering
        function renderCanvas() {
    const canvas = document.getElementById('canvas');
    const svg = document.getElementById('connections-svg');
    
    // Limpeza segura mantendo apenas o SVG defs
    const defs = svg.querySelector('defs');
    svg.innerHTML = '';
    if (defs) {
        svg.appendChild(defs);
    } else {
        // Garante que o marcador de seta exista
        const newDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrow');
        marker.setAttribute('viewBox', '0 0 10 10');
        marker.setAttribute('refX', '10');
        marker.setAttribute('refY', '5');
        marker.setAttribute('markerWidth', '6');
        marker.setAttribute('markerHeight', '6');
        marker.setAttribute('orient', 'auto-start-reverse');
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
        path.setAttribute('fill', '#4b5563');
        
        marker.appendChild(path);
        newDefs.appendChild(marker);
        svg.appendChild(newDefs);
    }

    // Remove apenas os elementos de tarefa, não todo o conteúdo do canvas
    const existingTasks = canvas.querySelectorAll('.task-element');
    existingTasks.forEach(el => el.remove());

    // Render tasks
    tasks.forEach(task => {
        const taskEl = document.createElement('div');
        taskEl.className = 'task-element';
        taskEl.id = task.id;
        taskEl.style.left = task.x + 'px';
        taskEl.style.top = task.y + 'px';
        taskEl.onclick = (e) => {
            e.stopPropagation();
            selectTask(task.id, e);
        };
        taskEl.oncontextmenu = (e) => showContextMenu(e, task.id);

        // Add drag functionality
        taskEl.onmousedown = (e) => {
            if (e.button === 0 && !e.target.hasAttribute('contenteditable') && !e.target.classList.contains('connection-point')) {
                e.stopPropagation();
                isDraggingTask = true;
                draggedTask = task;
                taskEl.classList.add('dragging');
                
                const rect = taskEl.getBoundingClientRect();
                const canvasRect = document.getElementById('canvas-viewport').getBoundingClientRect();
                dragOffsetX = (e.clientX - rect.left) / zoomLevel;
                dragOffsetY = (e.clientY - rect.top) / zoomLevel;
                
                selectTask(task.id, e);
            }
        };

        if (task.id === selectedTask) {
            taskEl.classList.add('selected');
        }

        if (task.type === 'start') {
            taskEl.innerHTML = `
                <div class="start-node">▶
                    <div class="output-point connection-point" onmousedown="startConnection('${task.id}', 'output', event)"></div>
                </div>
            `;
        } else if (task.type === 'end') {
            taskEl.innerHTML = `
                <div class="end-node">⏹
                    <div class="input-point connection-point" onmousedown="endConnection('${task.id}', 'input', event)"></div>
                </div>
            `;
        } else if (task.type === 'gateway') {
            taskEl.innerHTML = `
                <div class="gateway-node">
                    <div class="gateway-shape"></div>
                    <div class="gateway-label" ondblclick="editGatewayText(this, '${task.id}')">${task.question || 'Decisão'}</div>
                    <div class="input-point connection-point" onmousedown="endConnection('${task.id}', 'input', event)"></div>
                    <div class="output-point connection-point" onmousedown="startConnection('${task.id}', 'output', event)"></div>
                </div>
            `;
        } else {
            const actorColor = actors[task.actor] || '#2196f3';
            taskEl.innerHTML = `
                <div class="task-node">
                    <div class="task-content" style="background-color: ${actorColor}" ondblclick="editTaskText(event, '${task.id}')">
                        ${task.name}
                    </div>
                    <div class="task-actor">${task.actor}</div>
                    <div class="input-point connection-point" onmousedown="endConnection('${task.id}', 'input', event)"></div>
                    <div class="output-point connection-point" onmousedown="startConnection('${task.id}', 'output', event)"></div>
                </div>
            `;
        }

        canvas.appendChild(taskEl);
    });

    // Render connections
    connections.forEach(conn => {
        const fromTask = tasks.find(t => t.id === conn.from);
        const toTask = tasks.find(t => t.id === conn.to);
        
        if (!fromTask || !toTask) return;
        
        const fromPoints = getConnectionPoints(fromTask);
        const toPoints = getConnectionPoints(toTask);
        
        const fromPoint = fromPoints.output;
        const toPoint = toPoints.input;
        
        if (!fromPoint || !toPoint) return;
        
        // Create curved path
        const dx = toPoint.x - fromPoint.x;
        const dy = toPoint.y - fromPoint.y;
        const curve = Math.abs(dx) * 0.5;
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const pathData = `M ${fromPoint.x} ${fromPoint.y} C ${fromPoint.x + curve} ${fromPoint.y}, ${toPoint.x - curve} ${toPoint.y}, ${toPoint.x} ${toPoint.y}`;
        
        path.setAttribute('d', pathData);
        path.setAttribute('class', 'connection-path');
        path.setAttribute('marker-end', 'url(#arrow)');
        svg.appendChild(path);
        
        // Add path label if exists
        if (conn.pathLabel) {
            const midX = (fromPoint.x + toPoint.x) / 2;
            const midY = (fromPoint.y + toPoint.y) / 2;
            
            // Create background rectangle for label
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            const textLength = conn.pathLabel.length * 6;
            rect.setAttribute('x', midX - textLength/2 - 4);
            rect.setAttribute('y', midY - 10);
            rect.setAttribute('width', textLength + 8);
            rect.setAttribute('height', 16);
            rect.setAttribute('fill', 'white');
            rect.setAttribute('stroke', '#e5e7eb');
            rect.setAttribute('stroke-width', '1');
            rect.setAttribute('rx', '4');
            rect.setAttribute('filter', 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))');
            rect.setAttribute('class', 'connection-label-bg');
            rect.setAttribute('onclick', `editConnectionLabel(this.nextSibling, '${conn.id}', event)`);
            svg.appendChild(rect);
            
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', midX);
            text.setAttribute('y', midY + 1);
            text.setAttribute('class', 'connection-label');
            text.setAttribute('ondblclick', `editConnectionLabel(this, '${conn.id}', event)`);
            text.textContent = conn.pathLabel;
            svg.appendChild(text);
                }
            });

            // Ensure arrow marker exists
            if (!svg.querySelector('defs marker')) {
                const defs = svg.querySelector('defs') || svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'defs'));
                const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
                marker.setAttribute('id', 'arrow');
                marker.setAttribute('viewBox', '0 0 10 10');
                marker.setAttribute('refX', '10');
                marker.setAttribute('refY', '5');
                marker.setAttribute('markerWidth', '6');
                marker.setAttribute('markerHeight', '6');
                marker.setAttribute('orient', 'auto-start-reverse');
                
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
                path.setAttribute('fill', '#4b5563');
                
                marker.appendChild(path);
                defs.appendChild(marker);
            }
        }

        // Context menu
        function showContextMenu(event, taskId) {
            event.preventDefault();
            event.stopPropagation();
            
            const existingMenu = document.querySelector('.context-menu');
            if (existingMenu) {
                existingMenu.remove();
            }

            const menu = document.createElement('div');
            menu.className = 'context-menu';
            menu.style.left = event.pageX + 'px';
            menu.style.top = event.pageY + 'px';
            
            menu.innerHTML = `
                <button class="delete" onclick="deleteTask('${taskId}'); this.parentElement.remove();">
                    Excluir tarefa
                </button>
            `;
            
            document.body.appendChild(menu);
            
            // Close menu when clicking outside
            setTimeout(() => {
                document.addEventListener('click', function closeMenu() {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                });
            }, 0);
        }

        // Utility functions
        function clearAll() {
            if (confirm('Tem certeza que deseja limpar todo o fluxo?')) {
                tasks = [];
                connections = [];
                selectedTask = null;
                gatewayMode = false;
                taskIdCounter = 1;
                connectionIdCounter = 1;
                cancelGateway();
                renderCanvas();
            }
        }

        // Event listeners
        document.getElementById('process-name').addEventListener('input', updateProcessInfo);

        // Click outside to deselect
        document.getElementById('canvas').addEventListener('click', function(e) {
            if (e.target === this) {
                selectedTask = null;
                renderCanvas();
            }
        });

        // Initialize
        renderColorPicker();
