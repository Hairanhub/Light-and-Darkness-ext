const OBR = window.OBR;

const msgDiv = document.getElementById('messages');
const input = document.getElementById('chatInput');
const btn = document.getElementById('sendBtn');

// Aguarda a conexão com o Owlbear Rodeo
OBR.onReady(() => {
    console.log("Extensão conectada!");

    // Escuta mensagens recebidas (Isso roda sempre que alguém envia algo)
    OBR.party.onChatMessage((messages) => {
        messages.forEach(msg => {
            const p = document.createElement('p');
            p.innerHTML = `<strong>${msg.senderName}:</strong> ${msg.text}`;
            msgDiv.appendChild(p);
            msgDiv.scrollTop = msgDiv.scrollHeight; // Rola para o fim
        });
    });
});

// Função para disparar a mensagem
async function sendMessage() {
    const text = input.value.trim();
    if (text) {
        // O OBR espera uma lista de mensagens [{ text: "..." }]
        await OBR.party.sendChatMessage([{ text: text }]);
        input.value = '';
    }
}

// Eventos de clique e tecla Enter
btn.onclick = sendMessage;
input.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
