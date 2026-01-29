let playerName = "Jogador";

// Função para garantir que o código só rode após o HTML carregar
window.onload = () => {
  const startBtn = document.getElementById("start-btn");
  const nameInput = document.getElementById("user-name-input");
  const setupScreen = document.getElementById("setup-screen");
  const mainContent = document.getElementById("main-content");

  // AÇÃO DO BOTÃO ENTRAR
  startBtn.onclick = () => {
    const name = nameInput.value.trim();
    if (name) {
      playerName = name;
      setupScreen.style.display = "none";
      mainContent.style.display = "block";
    } else {
      alert("Por favor, digite seu nome!");
    }
  };

  // Inicialização do restante do Widget
  initWidget();
};

function initWidget() {
  const attrContainer = document.getElementById("attributes");
  const panel = document.getElementById("panel");
  const toggleBtn = document.getElementById("toggle");
  const chatLog = document.getElementById("chat-log");
  const compactSpans = [0,1,2,3,4,5].map(i => document.getElementById(`c${i}`));

  const defaults = [
    { n: "FOR", c: "#5B1F1F" }, { n: "DEX", c: "#371E59" },
    { n: "DEF", c: "#1F3B5B" }, { n: "INT", c: "#5B1F3B" },
    { n: "CAR", c: "#594F1E" }, { n: "CON", c: "#1E592D" }
  ];

  let currentVal = 0;
  const diceModal = document.getElementById("dice-modal");

  function addMsg(sender, text) {
    const div = document.createElement("div");
    div.className = "chat-msg";
    div.innerHTML = `<b>${sender}:</b> ${text}`;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  if (window.OBR) {
    OBR.onReady(() => {
      OBR.chat.onMessagesChange((m) => {
        const last = m[m.length - 1];
        if (last) addMsg(last.senderName || "Sistema", last.text);
      });
    });
  }

  function createAttribute(idx) {
    const div = document.createElement("div");
    div.className = "attribute";
    div.style.background = defaults[idx].c;
    div.innerHTML = `
      <input class="attr-name" maxlength="3" value="${defaults[idx].n}">
      <div class="mods"><div class="mod-item"><input class="mod-name" value="MOD"><input type="number" class="mod-value" value="0"></div></div>
      <button class="add">+</button><button class="rem">-</button>
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
      compactSpans[idx].innerText = `${name} ${res}`;
    };

    div.addEventListener("input", update);
    div.querySelector(".add").onclick = () => {
      const m = document.createElement("div"); m.className = "mod-item";
      m.innerHTML = `<input class="mod-name" value="MOD"><input type="number" class="mod-value" value="0">`;
      div.querySelector(".mods").appendChild(m); update();
    };
    div.querySelector(".rem").onclick = () => {
      const items = div.querySelectorAll(".mod-item");
      if (items.length > 1) items[items.length-1].remove(); update();
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
    s.onclick = () => {
      const p = s.innerText.split(" ");
      currentVal = parseInt(p[1]);
      diceModal.style.display = "flex";
      document.getElementById("modal-attr-name").innerText = p[0];
      document.getElementById("modal-attr-value").innerText = p[1];
    };
  });

  document.getElementById("close-modal").onclick = () => diceModal.style.display = "none";

  document.getElementById("roll-button").onclick = () => {
  const q = +document.getElementById("dice-qty").value || 1;
  const f = +document.getElementById("dice-faces").value || 20;
  const modManual = +document.getElementById("dice-mod").value || 0; // Modificador do dado
  const bonusAttr = document.getElementById("use-attr-check").checked ? currentVal : 0; // Atributo
  
  let sum = 0, raw = [];
  for(let i=0; i<q; i++) { 
    let r = Math.floor(Math.random() * f) + 1; 
    sum += r; 
    raw.push(r); 
  }
  
  // O Total soma tudo, mas a mensagem vai separar
  const total = sum + bonusAttr + modManual;
  
  // Formatação da string de modificadores: "+ bônus + mod"
  let modString = "";
  if (bonusAttr !== 0) modString += ` + ${bonusAttr}(Attr)`;
  if (modManual !== 0) modString += ` + ${modManual}(Mod)`;

  const txt = `rolou ${document.getElementById("modal-attr-name").innerText}: **${total}** [${raw.join('+')}]${modString}`;
  
  document.getElementById("roll-result").innerHTML = `Total: ${total}`;
  
  if (window.OBR) {
    OBR.chat.sendMessage({ text: `**${playerName}** ${txt}` });
  } else {
    addMsg(playerName, txt);
  }
};
