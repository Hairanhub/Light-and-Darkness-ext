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

  // Função que renderiza a mensagem no HTML local
  function addMsg(sender, text, color) {
    if (!chatLog) return;
    const div = document.createElement("div");
    div.className = "chat-msg";
    div.style.setProperty('--user-color', color);
    div.innerHTML = `<b>${sender}</b> ${text}`;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  // SINCRONIZAÇÃO GLOBAL: Escuta o chat do Owlbear Rodeo
  if (window.OBR) {
    OBR.onReady(() => {
      OBR.chat.onMessagesChange((messages) => {
        // Pega apenas a última mensagem recebida no chat global
        const last = messages[messages.length - 1];
        if (last) {
          // Extrai o metadado de cor [C:#hex] se existir
          const colorMatch = last.text.match(/\[C:(#[0-9a-fA-F]{6})\]/);
          const msgColor = colorMatch ? colorMatch[1] : "#ffd700";
          
          // Remove a tag de cor para não exibir o código [C:...] no texto
          const cleanText = last.text.replace(/\[C:#[0-9a-fA-F]{6}\]/, "");
          
          // Renderiza a mensagem para TODOS que estiverem com a extensão aberta
          addMsg(last.senderName || "Sistema", cleanText, msgColor);
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
      <input type="number" class="base" value="0">
      <input type="number" class="mult" value="1">
      <div class="mods">
        <div class="mod-item">
          <input class="mod-name" value="MOD">
          <input type="number" class="mod-value" value="0">
        </div>
      </div>
      <button class="add">+</button>
      <button class="rem">-</button>
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
        currentAttrColor = defaults[i].c;
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
      if (r === f) raw.push(`<span class="die-crit">${r}</span>`);
      else if (r === 1) raw.push(`<span class="die-fail">${r}</span>`);
      else raw.push(r);
    }

    const total = sum + bAttr + mManual;
    const attrName = document.getElementById("modal-attr-name").innerText;
    
    let detalhes = `${q}d${f}[${raw.join('+')}]`;
    if (bAttr !== 0) detalhes += ` + ${bAttr}(Atrib)`;
    if (mManual !== 0) detalhes += ` + ${mManual}(Mod)`;

    const coloredAttr = `<span style="color: ${currentAttrColor}; font-weight: bold; text-shadow: 1px 1px 2px #000;">${attrName}</span>`;
    
    // Texto formatado para o chat
    const txt = `rolou ${coloredAttr}: **${total}** ${detalhes}`;

    // Mostra o resultado apenas no seu modal (feedback visual rápido)
    document.getElementById("roll-result").innerHTML = `<div style="font-size: 1.8rem; color: #ffd700;">Total: ${total}</div>`;

    // ENVIO PARA O OBR: Isso faz a mensagem ir para todos
    if (window.OBR) {
      OBR.chat.sendMessage({ text: `[C:${playerColor}] **${playerName}** ${txt}` });
    } else {
      // Caso esteja testando fora do Owlbear
      addMsg(playerName, txt, playerColor);
    }
  };
}
