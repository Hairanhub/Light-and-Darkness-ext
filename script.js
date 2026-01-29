const attrContainer = document.getElementById("attributes");
const panel = document.getElementById("panel");
const toggleBtn = document.getElementById("toggle");
const chatMessages = document.getElementById("chat-messages");

const compactValues = [
  document.getElementById("c0"), document.getElementById("c1"),
  document.getElementById("c2"), document.getElementById("c3"),
  document.getElementById("c4"), document.getElementById("c5"),
];

const defaults = [
  { name: "FOR", color: "#5B1F1F" }, { name: "DEX", color: "#371E59" },
  { name: "DEF", color: "#1F3B5B" }, { name: "INT", color: "#5B1F3B" },
  { name: "CAR", color: "#594F1E" }, { name: "CON", color: "#1E592D" },
];

let currentAttrValue = 0;
const diceModal = document.getElementById("dice-modal");
const modalAttrName = document.getElementById("modal-attr-name");

function addToCustomChat(text) {
  const entry = document.createElement("div");
  entry.className = "chat-entry";
  entry.innerHTML = text;
  chatMessages.appendChild(entry);
  const chatDiv = document.getElementById("custom-chat");
  chatDiv.scrollTop = chatDiv.scrollHeight;
}

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
  modsContainer.className = "mods-container";
  modsContainer.appendChild(createMod());

  div.innerHTML = `
    <input class="attr-name" maxlength="3" value="${defaults[index].name}">
    <input type="number" class="base" value="0">
    <div class="mods-target"></div>
    <button class="add">+</button><button class="rem">-</button>
    <input type="number" class="mult" value="1">
    <div class="result">0</div>
  `;
  div.querySelector(".mods-target").appendChild(modsContainer);

  const update = () => {
    const base = +div.querySelector(".base").value || 0;
    const mult = +div.querySelector(".mult").value || 1;
    const mods = [...div.querySelectorAll(".mod-value")].reduce((s, m) => s + (+m.value || 0), 0);
    const result = (base + mods) * mult;
    div.querySelector(".result").innerText = result;
    compactValues[index].innerText = `${div.querySelector(".attr-name").value} ${result}`;
  };

  div.addEventListener("input", update);
  div.querySelector(".add").onclick = () => { modsContainer.appendChild(createMod()); update(); };
  div.querySelector(".rem").onclick = () => { if(modsContainer.children.length > 1) modsContainer.lastChild.remove(); update(); };
  update();
  return div;
}

defaults.forEach((_, i) => attrContainer.appendChild(createAttribute(i)));

toggleBtn.onclick = async () => {
  const isExpanded = panel.classList.toggle("expanded");
  toggleBtn.textContent = isExpanded ? "▼" : "▲";
  if (window.OBR) await OBR.viewport.setHeight(isExpanded ? 500 : 65);
};

function openDiceModal(name, value) {
  currentAttrValue = parseInt(value);
  diceModal.style.display = "flex";
  modalAttrName.innerText = name;
  document.getElementById("modal-attr-value").innerText = value;
  if (window.OBR) OBR.viewport.setHeight(500);
}

document.getElementById("close-modal").onclick = () => {
  diceModal.style.display = "none";
  if (!panel.classList.contains("expanded") && window.OBR) OBR.viewport.setHeight(65);
};

compactValues.forEach((span, i) => {
  span.onclick = () => openDiceModal(defaults[i].name, span.innerText.split(" ")[1]);
});

document.getElementById("roll-button").onclick = async () => {
  const qty = +document.getElementById("dice-qty").value || 1;
  const faces = +document.getElementById("dice-faces").value || 20;
  const mod = +document.getElementById("dice-mod").value || 0;
  const bonus = document.getElementById("use-attr-check").checked ? currentAttrValue : 0;
  
  let sum = 0;
  for(let i=0; i<qty; i++){ sum += Math.floor(Math.random()*faces)+1; }
  const total = sum + bonus + mod;

  const msg = `<strong>${modalAttrName.innerText}</strong>: 🎲 ${total} <small>(${sum}+${bonus+mod})</small>`;
  addToCustomChat(msg);

  if (window.OBR && OBR.isReady) {
    const name = await OBR.player.getName();
    OBR.chat.sendMessage(`${name} rolou ${modalAttrName.innerText}: **${total}**`);
  }
  document.getElementById("roll-result").innerText = "Total: " + total;
};
