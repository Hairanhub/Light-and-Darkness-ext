const attrContainer = document.getElementById("attributes");
const panel = document.getElementById("panel");
const toggleBtn = document.getElementById("toggle");

const compactValues = [
  document.getElementById("c0"),
  document.getElementById("c1"),
  document.getElementById("c2"),
  document.getElementById("c3"),
  document.getElementById("c4"),
  document.getElementById("c5"),
];

const defaults = [
  { name: "FOR", color: "#5B1F1F" },
  { name: "DEX", color: "#371E59" },
  { name: "DEF", color: "#1F3B5B" },
  { name: "INT", color: "#5B1F3B" },
  { name: "CAR", color: "#594F1E" },
  { name: "CON", color: "#1E592D" },
];

// VARIÁVEIS DO MODAL
let currentAttrValue = 0;
const diceModal = document.getElementById("dice-modal");
const closeModal = document.getElementById("close-modal");
const modalAttrName = document.getElementById("modal-attr-name");
const modalAttrValue = document.getElementById("modal-attr-value");
const diceContainer = document.getElementById("dice-container");

function createMod() {
  const wrap = document.createElement("div");
  wrap.className = "mod-item";
  wrap.innerHTML = `<input class="mod-name" value="MOD"><input type="number" class="mod-value" value="0">`;
  return wrap;
}

function createAttribute(index) {
  const div = document.createElement("div");
  div.className = "attribute";
  div.style.background = defaults[index].color;

  const modsContainer = document.createElement("div");
  modsContainer.className = "mods";
  modsContainer.appendChild(createMod());

  div.innerHTML = `
    <input class="attr-name" maxlength="3" value="${defaults[index].name}">
    <input type="number" class="base" value="0">
    <button class="add">+</button>
    <button class="rem">-</button>
    <input type="number" class="mult" value="1">
    <div class="result">0</div>
  `;

  div.insertBefore(modsContainer, div.querySelector(".add"));
  const nameInput = div.querySelector(".attr-name");

  const update = () => {
    nameInput.value = nameInput.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
    const base = +div.querySelector(".base").value || 0;
    const mult = +div.querySelector(".mult").value || 1;
    const mods = [...div.querySelectorAll(".mod-value")].reduce((s, m) => s + (+m.value || 0), 0);
    const result = (base + mods) * mult;
    div.querySelector(".result").innerText = result;
    compactValues[index].innerText = `${nameInput.value} ${result}`;
  };

  div.addEventListener("input", update);
  div.querySelector(".add").onclick = () => { modsContainer.appendChild(createMod()); update(); };
  div.querySelector(".rem").onclick = () => {
    const mods = modsContainer.querySelectorAll(".mod-item");
    if (mods.length > 1) mods[mods.length - 1].remove();
    update();
  };

  update();
  return div;
}

// Inicializar Atributos
defaults.forEach((_, i) => { attrContainer.appendChild(createAttribute(i)); });

// --- AJUSTE OWLBEAR: Redimensionamento Inicial ---
if (window.OBR) {
  OBR.onReady(() => {
    // Garante que a janela comece apenas com a altura da barra compacta
    OBR.viewport.setHeight(50); 
  });
}

// Toggle Expandir / Recolher Invertido (Cresce para cima)
toggleBtn.onclick = async () => {
  const isExpanded = panel.classList.toggle("expanded");
  toggleBtn.textContent = isExpanded ? "▼" : "▲";

  if (window.OBR && window.OBR.isReady) {
    // Se expandido, a janela do Popover aumenta para 600px. Se recolhido, volta para 50px.
    const newHeight = isExpanded ? 600 : 50; 
    await OBR.viewport.setHeight(newHeight);
  }
};

// LÓGICA DO MODAL DE DADOS
function openDiceModal(name, value, color) {
  currentAttrValue = parseInt(value);
  diceModal.style.display = "flex";
  modalAttrName.innerText = name;
  modalAttrValue.innerText = value;
  diceContainer.style.borderColor = color;
  document.getElementById("roll-result").innerText = "";
  
  // OBRIGATÓRIO: Se o modal abrir, a janela do Owlbear deve estar em 600px para ele aparecer
  if (window.OBR && window.OBR.isReady) {
    OBR.viewport.setHeight(600);
  }
}

closeModal.onclick = () => { 
  diceModal.style.display = "none"; 
  // Se fechar o modal e o painel estiver recolhido, encolhe a janela de novo
  if (!panel.classList.contains("expanded") && window.OBR) {
    OBR.viewport.setHeight(50);
  }
};

compactValues.forEach((span, index) => {
  span.onclick = () => {
    const parts = span.innerText.split(" ");
    const name = parts[0];
    const value = parts[1];
    openDiceModal(name, value, defaults[index].color);
  };
});

// Botão de Rolar Dados
document.getElementById("roll-button").onclick = async () => {
  const qty = Number(document.getElementById("dice-qty").value) || 1;
  const faces = Number(document.getElementById("dice-faces").value) || 20;
  const modManual = Number(document.getElementById("dice-mod").value) || 0;
  const useAttr = document.getElementById("use-attr-check").checked;
  const attrName = modalAttrName.innerText;

  let rollsHtml = [];
  let rollsRaw = [];
  let sum = 0;

  for (let i = 0; i < qty; i++) {
    let r = Math.floor(Math.random() * faces) + 1;
    sum += r;
    rollsRaw.push(r);

    if (faces === 20 && r === 20) {
      rollsHtml.push(`<span style="color: #00ff00; font-weight: bold;">${r}</span>`);
    } else if (faces === 20 && r === 1) {
      rollsHtml.push(`<span style="color: #ff4d4d; font-weight: bold;">${r}</span>`);
    } else {
      rollsHtml.push(r);
    }
  }

  const bonus = useAttr ? currentAttrValue : 0;
  const total = sum + bonus + modManual;

  document.getElementById("roll-result").innerHTML = `
    <div style="font-size: 0.9rem; color: #aaa;">(${rollsHtml.join(" + ")}) + ${bonus} + ${modManual}</div>
    <div style="font-size: 1.8rem; color: #ffd700;">Total: ${total}</div>
  `;

  if (window.OBR && OBR.isReady) {
    const userName = await OBR.player.getName();
    OBR.chat.sendMessage({
      text: `${userName} rolou ${attrName}: **${total}** [${qty}d${faces}(${rollsRaw.join(',')}) + ${bonus + modManual}]`
    });
  }
};
