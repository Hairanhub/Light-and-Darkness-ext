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
  modsContainer.className = "mods-wrap";
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

// Aqui você continuaria com a lógica do roll-button usando addToCustomChat(resultado);
