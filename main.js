import OBR from "@owlbear-rodeo/sdk";

const msgDiv = document.getElementById('messages');
const input = document.getElementById('chatInput');
const btn = document.getElementById('sendBtn');

function renderMsg(sender, text) {
    const p = document.createElement('p');
    p.innerHTML = `<strong>${sender}:</strong> ${text}`;
    msgDiv.appendChild(p);
    msgDiv.scrollTop = msgDiv.scrollHeight;
}

// Inicialização direta do SDK
OBR.onReady(async () => {
    console.log("Conectado ao Owlbear via Módulo!");

    // Escuta mensagens recebidas
    OBR.party.onChatMessage((messages) => {
        messages.forEach(msg => {
            renderMsg(msg.senderName || "Sistema", msg.text);
        });
    });
});

async function sendMessage() {
    const text = input.value.trim();
    if (text) {
        try {
            // OBR já está disponível pelo import
            await OBR.party.sendChatMessage([{ text: text }]);
            input.value = '';
        } catch (err) {
            console.error("Erro ao enviar:", err);
        }
    }
}

// Eventos
btn.onclick = sendMessage;
input.onkeydown = (e) => {
    if (e.key === 'Enter') sendMessage();
};
