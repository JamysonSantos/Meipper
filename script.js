const fraseInput = document.getElementById('fraseInput');
const adicionarAtividadeButton = document.getElementById('adicionarAtividade');
const adicionarInicioButton = document.getElementById('adicionarInicio');
const adicionarTerminoButton = document.getElementById('adicionarTermino');
const fluxograma = document.getElementById('fluxograma');

let inicioFluxo = null;
let atividades = [];
let terminoFluxo = null;

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
            conectarElementos(atividades[atividades.length - 2], atividades[atividades.length - 1]);
        }

        // Adicionar o ícone "x" para excluir a tarefa
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

function conectarElementos(elementoA, elementoB) {
    const conector = document.createElement('div');
    conector.className = 'conector';
    fluxograma.insertBefore(conector, elementoB);
    const seta = document.createElement('div');
    seta.className = 'seta';
    conector.appendChild(seta);
}

function criarExcluirTarefa(indice) {
    const excluirTarefa = document.createElement('span');
    excluirTarefa.className = 'excluir-tarefa';
    excluirTarefa.textContent = 'x';
    excluirTarefa.addEventListener('click', () => {
        if (atividades[indice]) {
            fluxograma.removeChild(atividades[indice]);
            atividades.splice(indice, 1);

            if (indice > 0) {
                const conector = fluxograma.getElementsByClassName('conector')[indice - 1];
                fluxograma.removeChild(conector);
            }
        }
    });
    return excluirTarefa;
}

