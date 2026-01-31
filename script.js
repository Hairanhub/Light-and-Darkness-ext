const firebaseConfig = {
  apiKey: "AIzaSyAtDr19A4a_XkTuCpUotp0ReSgGQ37BNsw",
  authDomain: "light-and-darkness-project.firebaseapp.com",
  projectId: "light-and-darkness-project",
  storageBucket: "light-and-darkness-project.firebasestorage.app",
  messagingSenderId: "536659913128",
  appId: "1:536659913128:web:9b43ecc46c6cce8779dcc5",
  measurementId: "G-1H7M2QN8JZ"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const chatRef = database.ref('mensagens');

let playerName = "Jogador";
let playerColor = "#ffd700";

window.onload = () => {
  const startBtn = document.getElementById("start-btn");
  if (startBtn) {
    startBtn.onclick = () => {
      const nameInput = document.getElementById("user-name-input");
      const colorInput = document.getElementById("user-color-input");
      if (nameInput.value.trim()) {
        playerName = nameInput.value.trim();
        playerColor = colorInput.value;
        document.getElementById("setup-screen").style.display = "none";
        document.getElementById("main-content").style.display = "block";
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
  const diceModal = document.getElementById("dice-modal");
  const diceContent = document.querySelector(".modal-content");
  const compactSpans = [0, 1, 2, 3, 4, 5].map(i => document.getElementById(`c${i}`));

  const defaults = [
    { n: "FOR", c: "#5B1F1F" }, { n: "DEX", c: "#371E59" },
    { n: "DEF", c: "#1F3B5B" }, { n: "INT", c: "#5B1F3B" },
    { n: "CAR", c: "#594F1E" }, { n: "CON", c: "#1E592D" }
  ];

  let currentVal = 0;
  let currentAttrColor = "#ffd700";

  function addMsg(sender, text, color) {
    const div = document.createElement("div");
    div.className = "chat-msg";
    div.style.setProperty('--user-color', color);
    div.innerHTML = `<b>${sender}</b> ${text}`;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  chatRef.limitToLast(30).on('child_added', (snapshot) => {
    const d = snapshot.val();
    addMsg(d.sender, d.text, d.color);
  });

  function createAttribute(idx) {
    const div = document.createElement("div");
    div.className = "attribute";
    div.style.borderLeft = `4px solid ${defaults[idx].c}`;
    div.innerHTML = `
      <input class="attr-name" maxlength="3" value="${defaults[idx].n}">
      <input type="number" class="base" value="0">
      <input type="number" class="mult" value="1">
      <div class="mods"><div class="mod-item"><input class="mod-name" value="MOD"><input type="number" class="mod-value" value="0"></div></div>
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <button class="add">+</button><button class="rem">-</button>
      </div>
      <div class="result">0</div>
    `;

    const update = () => {
      const base = +div.querySelector(".base").value || 0;
      const mult = +div.querySelector(".mult").value || 1;
      const mods = [...div.querySelectorAll(".mod-value")].reduce((s, m) => s + (+m.value || 0), 0);
      const res = (base + mods) * mult;
      div.querySelector(".result").innerText = res;
      const name = div.querySelector(".attr-name").value.toUpperCase();
      if (compactSpans[idx]) compactSpans[idx].innerText = `${name} ${res}`;
    };

    div.addEventListener("input", update);
    div.querySelector(".add").onclick = () => {
      const m = document.createElement("div"); m.className = "mod-item";
      m.innerHTML = `<input class="mod-name" value="MOD"><input type="number" class="mod-value" value="0">`;
      div.querySelector(".mods").appendChild(m); update();
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
    s.onclick = () => {
      const p = s.innerText.split(" ");
      currentVal = parseInt(p[1]) || 0;
      currentAttrColor = defaults[i].c;
      diceModal.style.display = "flex";
      document.getElementById("modal-attr-name").innerText = p[0];
      document.getElementById("modal-attr-value").innerText = p[1];
    };
  });

  // LOGICA DE FECHAR O DADO
  document.getElementById("close-modal").onclick = () => diceModal.style.display = "none";
  
  // Impede que cliques dentro da aba do dado fechem o modal
  diceContent.onclick = (e) => {
    e.stopPropagation();
  };

  // Fecha apenas se clicar no fundo escuro
  diceModal.onclick = () => {
    diceModal.style.display = "none";
  };

  document.getElementById("roll-button").onclick = () => {
    const q = +document.getElementById("dice-qty").value || 1;
    const f = +document.getElementById("dice-faces").value || 20;
    const mManual = +document.getElementById("dice-mod").value || 0;
    const bAttr = document.getElementById("use-attr-check").checked ? currentVal : 0;

    let sum = 0, raw = [];
    for (let i = 0; i < q; i++) {
      let r = Math.floor(Math.random() * f) + 1;
      sum += r;
      if (r === f) raw.push(`<span style="color:#00ff88;font-weight:bold">${r}</span>`);
      else if (r === 1) raw.push(`<span style="color:#ff4d4d;font-weight:bold">${r}</span>`);
      else raw.push(r);
    }

    const total = sum + bAttr + mManual;
    const attrName = document.getElementById("modal-attr-name").innerText;
    let detalhes = `${q}d${f}[${raw.join('+')}] + ${bAttr}(Atrib) + ${mManual}(Mod)`;
    const txt = `rolou <span style="color:${currentAttrColor};font-weight:bold">${attrName}</span>: <b>${total}</b><br><small style="color:#888">${detalhes}</small>`;

    chatRef.push({ sender: playerName, text: txt, color: playerColor, timestamp: Date.now() });
    diceModal.style.display = "none";
  };
}
