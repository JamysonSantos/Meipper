document.getElementById("generate-flow").addEventListener("click", () => {
  const input = document.getElementById("text-input").value;
  const flowContainer = document.getElementById("flow-container");

  // Limpa o conteúdo anterior
  flowContainer.innerHTML = "";

  // Divide o texto em linhas e remove vazios
  const lines = input
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) {
    flowContainer.innerHTML = "<p>Nenhuma etapa detectada.</p>";
    return;
  }

  // Cria e insere os blocos
  lines.forEach((line, index) => {
    const block = document.createElement("div");
    block.className = "flow-block";
    block.textContent = line;

    flowContainer.appendChild(block);

    // Se não for o último, adiciona um conector
    if (index < lines.length - 1) {
      const arrow = document.createElement("div");
      arrow.className = "flow-arrow";
      arrow.innerHTML = "↓"; // pode trocar por SVG depois
      flowContainer.appendChild(arrow);
    }
  });
});



