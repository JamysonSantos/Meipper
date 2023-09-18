const fraseInput = document.getElementById('fraseInput');
const adicionarAtividadeButton = document.getElementById('adicionarAtividade');
const adicionarInicioButton = document.getElementById('adicionarInicio');
const adicionarTerminoButton = document.getElementById('adicionarTermino');
const ajudaButton = document.getElementById('ajuda');
const fluxograma = document.getElementById('fluxograma');

let inicioFluxo = null;
let atividades = [];
let terminoFluxo = null;

function criarCirculo(cor) {
    const circulo = document.createElement('div');
    circulo.className = `circulo ${cor}`;
    return circulo;
}

function criarAtividade(descricao) {
    const atividade = document.createElement('div');
    atividade.className = "atividade";
    atividade.textContent = descricao;
    fluxograma.appendChild(atividade);
    return atividade;
}

function criarSeta() {
    const seta = document.createElement('div');
    seta.className = 'seta';
    return seta;
}

function conectarElementos(elementoA, elementoB) {
    const seta = criarSeta();
    fluxograma.appendChild(seta);

    const posicaoA = elementoA.getBoundingClientRect();
    const posicaoB = elementoB.getBoundingClientRect();

    const topoA = posicaoA.top + posicaoA.height / 2;
    const topoB = posicaoB.top + posicaoB.height / 2;

    const esquerdaA = posicaoA.left + posicaoA.width;
    const esquerdaB = posicaoB.left;

    seta.style.top = `${topoA}px`;
    seta.style.left = `${esquerdaA}px`;
    seta.style.width = `${esquerdaB - esquerdaA}px`;
    seta.style.transform = 'translateY(-50%)';

    seta.style.position = 'absolute';
    seta.style.borderTop = '2px solid black'; // Estilo da seta

    // Adicione uma classe para identificar a conexão
    seta.classList.add('conexao');

    // Adicione um evento para remover a conexão quando uma tarefa é excluída
    elementoA.addEventListener('click', () => {
        fluxograma.removeChild(seta);
    });
}

function criarExcluirTarefa(indice) {
    const excluirTarefa = document.createElement('span');
    excluirTarefa.className = 'excluir-tarefa';
    excluirTarefa.textContent = 'x';
    excluirTarefa.addEventListener('click', () => {
        if (atividades[indice]) {
            fluxograma.removeChild(atividades[indice]);
            atividades.splice(indice, 1);
            fluxograma.removeChild(fluxograma.getElementsByClassName('seta')[indice - 1]);
        }
    });
    return excluirTarefa;
}

function mostrarTooltip(elemento, mensagem) {
    let timeout;
    elemento.addEventListener('mouseover', () => {
        timeout = setTimeout(() => {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = mensagem;
            elemento.appendChild(tooltip);
        }, 1000);
    });

    elemento.addEventListener('mouseout', () => {
        clearTimeout(timeout);
        const tooltip = elemento.querySelector('.tooltip');
        if (tooltip) {
            elemento.removeChild(tooltip);
        }
    });
}

adicionarInicioButton.addEventListener('click', () => {
    if (!inicioFluxo) {
        inicioFluxo = criarCirculo("verde");
        fluxograma.appendChild(inicioFluxo);
    }
});

adicionarAtividadeButton.addEventListener('click', () => {
    const descricaoAtividade = fraseInput.value;

    if (descricaoAtividade) {
        const atividade = criarAtividade(descricaoAtividade);
        atividades.push(atividade);

        if (atividades.length > 1) {
            conectarElementos(atividades[atividades.length - 2], atividade);
        }

        const excluirTarefa = criarExcluirTarefa(atividades.length - 1);
        atividade.appendChild(excluirTarefa);

        fraseInput.value = '';
    }
});

adicionarTerminoButton.addEventListener('click', () => {
    if (!terminoFluxo && atividades.length > 0) {
        terminoFluxo = criarCirculo("vermelho");
        fluxograma.appendChild(terminoFluxo);
        conectarElementos(atividades[atividades.length - 1], terminoFluxo);
    }
});

mostrarTooltip(adicionarInicioButton, 'Clique para iniciar o fluxo');
mostrarTooltip(adicionarTerminoButton, 'Clique para finalizar o fluxo');
mostrarTooltip(adicionarAtividadeButton, 'Clique para adicionar uma tarefa');

ajudaButton.addEventListener('click', () => {
    alert('Este é o BeFluxe, uma ferramenta para criar fluxogramas simples.\n\n- Clique em "Iniciar Fluxo" para adicionar o ponto de início.\n- Clique em "Finalizar Fluxo" para adicionar o ponto de finalização.\n- Digite o nome de uma atividade e clique em "Adicionar Tarefa" para adicionar atividades entre o início e o final.');
});


