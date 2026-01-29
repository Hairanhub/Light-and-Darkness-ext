let playerName = "Jogador";
let playerColor = "#ffd700";

window.onload = () => {
  const startBtn = document.getElementById("start-btn");
  const nameInput = document.getElementById("user-name-input");
  const colorInput = document.getElementById("user-color-input");
  const setupScreen = document.getElementById("setup-screen");
  const mainContent = document.getElementById("main-content");

  // Carrega perfil salvo
  const savedUser = JSON.parse(localStorage.getItem("user_profile"));
  if (savedUser) {
    nameInput.value = savedUser.name;
    colorInput.value = savedUser.color;
  }

  if (startBtn) {
    startBtn.onclick = () => {
      const name = nameInput.value.trim();
      if (name) {
        playerName = name;
        playerColor = colorInput.value;
        localStorage.setItem("user_profile", JSON.stringify({name: playerName, color: playerColor}));
        setupScreen.style.display = "none";
        mainContent.style.display = "block";
      } else { alert("Por favor, digite seu nome!"); }
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

  // Função que desenha no SEU CHAT (index.html)
  function addMsg(sender, text, color) {
    if (!chatLog) return;
    const div = document.createElement("div");
    div.className = "chat-msg";
    div.style.setProperty('--user-color', color);
    div.innerHTML = `<b>${sender}</b> ${text}`;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  // OUVINTE DO CHAT DO OWLBEAR
  if (window.OBR) {
    OBR.onReady(() => {
      OBR.chat.onMessagesChange((messages) => {
        const last = messages[messages.length - 1];
        // Só processa se a mensagem tiver a nossa "assinatura" [DICE]
        if (last && last.text && last.text.includes("[DICE]")) {
          
          // Extrai a cor [C:#hex]
          const colorMatch = last.text.match(/\[C:(#[0-9a-fA-F]{6})\]/);
          const msgColor = colorMatch ? colorMatch[1] : "#ffd700";
          
          // Limpa as tags para mostrar o texto bonitinho
          const cleanText = last.text
            .replace("[DICE]", "")
            .replace(/\[C:#[0-9a-fA-F]{6}\]/, "")
            .trim();

          // Evita duplicar na sua própria tela (já que o OBR manda de volta pra você)
          const isMine = last.text.includes(`**${playerName}**`);
          if (!isMine) {
            addMsg(last.senderName || "Sistema", cleanText, msgColor);
          }
        }
      });
    });
  }

  function createAttribute(idx) {
    const attrKey = `attr_data_${idx}`;
    const div = document.createElement("div");
    div.className = "attribute";
    div.style.background = defaults[idx].c;
    div.innerHTML = `
      <input class="attr-name" maxlength="3" value="${defaults[idx].n}">
      <input type="number" class="base" value="0">
      <input type="number" class="mult" value="1">
      <div class="mods"></div>
      <button class="add">+</button><button class="rem">-</button>
      <div class="result">0</div>
    `;

    const update = (save = true) => {
      const name = div.querySelector(".attr-name").value.toUpperCase();
      const base = +div.querySelector(".base").value || 0;
      const mult = +div.querySelector(".mult").value || 1;
      const modInputs = [...div.querySelectorAll(".mod-value")];
      const mods = modInputs.reduce((s, m) => s + (+m.value || 0), 0);
      const res = (base + mods) * mult;
      div.querySelector(".result").innerText = res;
      if (compactSpans[idx]) compactSpans[idx].innerText = `${name} ${res}`;

      if (save) {
        const modsData = modInputs.map(m => ({ name: m.previousElementSibling.value, value: m.value }));
        localStorage.setItem(attrKey, JSON.stringify({ name, base, mult, modsData }));
      }
    };

    const savedData = JSON.parse(localStorage.getItem(attrKey));
    if (savedData) {
      div.querySelector(".attr-name").value = savedData.name;
      div.querySelector(".base").value = savedData.base;
      div.querySelector(".mult").value = savedData.mult;
      savedData.modsData.forEach(m => addModField(m.name, m.value));
    } else { addModField("MOD", 0); }

    function addModField(mName = "MOD", mVal = 0) {
      const m = document.createElement("div");
      m.className = "mod-item";
      m.innerHTML = `<input class="mod-name" value="${mName}"><input type="number" class="mod-value" value="${mVal}">`;
      m.addEventListener("input", () => update());
      div.querySelector(".mods").appendChild(m);
    }

    div.addEventListener("input", () => update());
    div.querySelector(".add").onclick = () => { addModField(); update(); };
    div.querySelector(".rem").onclick = () => {
      const container = div.querySelector(".mods");
      if (container.children.length > 0) { container.lastElementChild.remove(); update(); }
    };
    setTimeout(() => update(false), 50);
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
    const txt = `rolou ${coloredAttr}: **${total}** ${detalhes}`;
    
    document.getElementById("roll-result").innerHTML = `<div style="font-size: 1.8rem; color: #ffd700;">Total: ${total}</div>`;

    // 1. Mostra na sua tela
    addMsg(playerName, txt, playerColor);

    // 2. Envia para o Owlbear com a tag [DICE] para os outros verem
    if (window.OBR) {
      OBR.chat.sendMessage({ text: `[DICE] [C:${playerColor}] **${playerName}** ${txt}` });
    }
  };
}
