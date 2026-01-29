let playerName = "Jogador";
let playerColor = "#ffd700";

window.onload = () => {
  const startBtn = document.getElementById("start-btn");
  const nameInput = document.getElementById("user-name-input");
  const colorInput = document.getElementById("user-color-input");
  const setupScreen = document.getElementById("setup-screen");
  const mainContent = document.getElementById("main-content");

  if (startBtn) {
    startBtn.onclick = () => {
      const name = nameInput.value.trim();
      if (name) {
        playerName = name;
        playerColor = colorInput.value;
        setupScreen.style.display = "none";
        mainContent.style.display = "block";
      } else { 
        alert("Por favor, digite seu nome!"); 
      }
    };
  }
  initWidget();
};

function initWidget() {
  const attrContainer = document.getElementById("attributes");
  const panel = document.getElementById("panel");
  const toggleBtn = document.getElementById("toggle");
  const chatLog = document.getElementById("chat-log");
  const compactSpans = [0, 1, 2, 3, 4, 5].map(i => document.getElementById(`c${i}`));

  const defaults = [
    { n: "FOR", c: "#5B1F1F" }, { n: "DEX", c: "#371E59" },
    { n: "DEF", c: "#1F3B5B" }, { n: "INT", c: "#5B1F3B" },
    { n: "CAR", c: "#594F1E" }, { n: "CON", c: "#1E592D" }
  ];

  let currentVal = 0;
  let currentAttrColor = "#ffd700";
  const diceModal = document.getElementById("dice-modal");

  // Função para adicionar mensagens ao log com cor personalizada
  function addMsg(sender, text, color) {
    if (!chatLog) return;
    const div = document.createElement("div");
    div.className = "chat-msg";
    div.style.setProperty('--user-color', color);
    div.innerHTML = `<b>${sender}</b> ${text}`;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  // Integração OBR
  if (window.OBR) {
    OBR.onReady(() => {
      OBR.chat.onMessagesChange((m) => {
        const last = m[m.length - 1];
        if (last && !last.text.includes(`**${playerName}**`)) {
          // Extrai a cor enviada na tag oculta
          const colorMatch = last.text.match(/\[C:(#[0-9a-fA-F]{6})\]/);
          const cleanText = last.text.replace(/\[C:#[0-9a-fA-F]{6}\]/, "");
          addMsg(last.senderName || "Sistema", cleanText, colorMatch ? colorMatch[1] : "#ffd700");
        }
      });
    });
  }

  function createAttribute(idx) {
    const div = document.createElement("div");
    div.className = "attribute";
    div.style.background = defaults[idx].c;
    div.innerHTML = `
      <input class="attr-name" maxlength="3" value="${defaults[idx].n}">
      <div class="mods">
        <div class="mod-item">
          <input class="mod-name" value="MOD">
          <input type="number" class="mod-value" value="0">
        </div>
      </div>
      <button class="add">+</button>
      <button class="rem">-</button>
      <input type="number" class="base" value="0">
      <input type="number" class="mult" value="1">
      <div class="result">0</div>
    `;

    const update = () => {
      const name = div.querySelector(".attr-name").value.toUpperCase();
      const base = +div.querySelector(".base").value || 0;
      const mult = +div.querySelector(".mult").value || 1;
      const mods = [...div.querySelectorAll(".mod-value")].reduce((s, m) => s + (+m.value || 0), 0);
      const res = (base + mods) * mult;
      div.querySelector(".result").innerText = res;
      if (compactSpans[idx]) compactSpans[idx].innerText = `${name} ${res}`;
    };

    div.addEventListener("input", update);
    div.querySelector(".add").onclick = () => {
      const m = document.createElement("div");
      m.className = "mod-item";
      m.innerHTML = `<input class="mod-name" value="MOD"><input type="number" class="mod-value" value="0">`;
      div.querySelector(".mods").appendChild(m);
      update();
    };
    div.querySelector(".rem").onclick = () => {
      const items = div.querySelectorAll(".mod-item");
      if (items.length > 1) { items[items.length - 1].remove(); update(); }
    };
    setTimeout(update, 10);
    return div;
  }

  defaults.forEach((_, i) => attrContainer.appendChild(createAttribute(i)));

  toggleBtn.onclick = () => {
    panel.classList.toggle("expanded");
    toggleBtn.textContent = panel.classList.contains("expanded") ? "▼" : "▲";
  };

  compactSpans.forEach((s, i) => {
    if (s) {
      s.onclick = () => {
        const p = s.innerText.split(" ");
        currentVal = parseInt(p[1]) || 0;
        currentAttrColor = defaults[i].c; // Captura a cor do atributo clicado
        diceModal.style.display = "flex";
        document.getElementById("modal-attr-name").innerText = p[0];
        document.getElementById("modal-attr-value").innerText = p[1];
        document.getElementById("roll-result").innerHTML = "";
      };
    }
  });

  document.getElementById("close-modal").onclick = () => diceModal.style.display = "none";

  document.getElementById("roll-button").onclick = () => {
    const q = +document.getElementById("dice-qty").value || 1;
    const f = +document.getElementById("dice-faces").value || 20;
    const mManual = +document.getElementById("dice-mod").value || 0;
    const bAttr = document.getElementById("use-attr-check").checked ? currentVal : 0;

    let sum = 0, raw = [];
    for (let i = 0; i < q; i++) {
      let r = Math.floor(Math.random() * f) + 1;
      sum += r;
      // Destaque de Crítico e Erro
      if (r === f) raw.push(`<span class="die-crit">${r}</span>`);
      else if (r === 1) raw.push(`<span class="die-fail">${r}</span>`);
      else raw.push(r);
    }

    const total = sum + bAttr + mManual;
    const attrName = document.getElementById("modal-attr-name").innerText;
    
    // Formatação da mensagem com Atributo colorido
    let detalhes = `${q}d${f}[${raw.join('+')}]`;
    if (bAttr !== 0) detalhes += ` + ${bAttr}(Atrib)`;
    if (mManual !== 0) detalhes += ` + ${mManual}(Mod)`;

    const coloredAttr = `<span style="color: ${currentAttrColor}; font-weight: bold; text-shadow: 1px 1px 2px #000;">${attrName}</span>`;
    const txt = `rolou ${coloredAttr}: **${total}** ${detalhes}`;

    document.getElementById("roll-result").innerHTML = `<div style="font-size: 1.8rem; color: #ffd700;">Total: ${total}</div>`;

    if (window.OBR) {
      // Envia a cor do jogador de forma "escondida" no texto
      OBR.chat.sendMessage({ text: `[C:${playerColor}] **${playerName}** ${txt}` });
    }
    addMsg(playerName, txt, playerColor);
  };
}
