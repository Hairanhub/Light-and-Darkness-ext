const msgDiv = document.getElementById('messages');
const input = document.getElementById('chatInput');
const btn = document.getElementById('sendBtn');

function render(name, text, color = "#44afff") {
    const p = document.createElement('p');
    p.innerHTML = `<strong style="color:${color}">${name}:</strong> ${text}`;
    msgDiv.appendChild(p);
    msgDiv.scrollTop = msgDiv.scrollHeight;
}

function init() {
    if (!window.OBR) return;

    window.OBR.onReady(() => {
        console.log("Chat LD: Conectado!");

        // Escuta mensagens de outros jogadores
        window.OBR.party.onChatMessage((msgs) => {
            msgs.forEach(m => render(m.senderName || "Jogador", m.text, "#00ff88"));
        });
    });
}

async function sendMessage() {
    const text = input.value.trim();
    if (!text || !window.OBR) return;

    try {
        // Envia para a Party (todos na sala)
        await window.OBR.party.sendChatMessage([{ text: text }]);
        render("Você", text); 
        input.value = '';
    } catch (e) {
        console.error("Erro ao enviar:", e);
    }
}

btn.onclick = sendMessage;
input.onkeydown = (e) => { if (e.key === 'Enter') sendMessage(); };

init();
