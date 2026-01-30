const msgDiv = document.getElementById('messages');
const input = document.getElementById('chatInput');
const btn = document.getElementById('sendBtn');

function renderMsg(sender, text) {
    const p = document.createElement('p');
    p.innerHTML = `<strong>${sender}:</strong> ${text}`;
    msgDiv.appendChild(p);
    msgDiv.scrollTop = msgDiv.scrollHeight;
}

// O SDK do JSDelivr coloca o OBR direto na window
async function init() {
    if (typeof window.OBR === 'undefined') {
        console.log("Aguardando SDK...");
        setTimeout(init, 500);
        return;
    }

    window.OBR.onReady(() => {
        console.log("LD Chat Conectado e Pronto!");

        // Escuta mensagens
        window.OBR.party.onChatMessage((messages) => {
            messages.forEach(msg => {
                renderMsg(msg.senderName || "Mestre", msg.text);
            });
        });
    });
}

async function sendMessage() {
    const text = input.value.trim();
    if (text && window.OBR) {
        try {
            await window.OBR.party.sendChatMessage([{ text: text }]);
            input.value = '';
        } catch (err) {
            console.error("Erro ao enviar:", err);
        }
    }
}

btn.onclick = sendMessage;
input.onkeydown = (e) => {
    if (e.key === 'Enter') sendMessage();
};

init();
