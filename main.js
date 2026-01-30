const msgDiv = document.getElementById('messages');
const input = document.getElementById('chatInput');
const btn = document.getElementById('sendBtn');

// Renderiza na tela
function render(name, text, color = "#44afff") {
    const p = document.createElement('p');
    p.innerHTML = `<strong style="color:${color}">${name}:</strong> ${text}`;
    msgDiv.appendChild(p);
    msgDiv.scrollTop = msgDiv.scrollHeight;
}

// Inicia o OBR
function init() {
    if (!window.OBR) return;

    window.OBR.onReady(() => {
        console.log("Chat LD: Conectado via canal de rádio!");

        // Escuta direta (Modo Party)
        window.OBR.party.onChatMessage((msgs) => {
            msgs.forEach(m => render(m.senderName || "Jogador", m.text, "#00ff88"));
        });
    });
}

// Envia mensagem
async function sendMessage() {
    const text = input.value.trim();
    if (!text || !window.OBR) return;

    try {
        // Envia via canal de rádio (mais leve que Metadata)
        await window.OBR.party.sendChatMessage([{ text: text }]);
        render("Você", text); // Mostra para você
        input.value = '';
    } catch (e) {
        console.error("Falha no envio:", e);
    }
}

btn.onclick = sendMessage;
input.onkeydown = (e) => { if (e.key === 'Enter') sendMessage(); };

init();
