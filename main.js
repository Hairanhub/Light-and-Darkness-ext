const msgDiv = document.getElementById('messages');
const input = document.getElementById('chatInput');
const btn = document.getElementById('sendBtn');

// Função para colocar a mensagem no visual
function displayMessage(sender, text) {
    const p = document.createElement('p');
    p.innerHTML = `<span class="sender">${sender}:</span> ${text}`;
    msgDiv.appendChild(p);
    msgDiv.scrollTop = msgDiv.scrollHeight; // Rola para baixo
}

// Inicialização segura
async function init() {
    // Espera o OBR estar disponível no window
    if (typeof window.OBR === 'undefined') {
        setTimeout(init, 100);
        return;
    }

    window.OBR.onReady(() => {
        console.log("Chat conectado com sucesso!");

        // Escuta mensagens recebidas (O OBR manda um Array)
        window.OBR.party.onChatMessage((messages) => {
            if (Array.isArray(messages)) {
                messages.forEach(msg => {
                    displayMessage(msg.senderName || "Anônimo", msg.text);
                });
            }
        });
    });
}

// Função de Envio
async function sendMessage() {
    const text = input.value.trim();
    if (text && window.OBR) {
        try {
            // O SDK exige um Array de objetos [{text: ""}]
            await window.OBR.party.sendChatMessage([{ text: text }]);
            input.value = '';
            input.focus();
        } catch (e) {
            console.error("Falha ao enviar:", e);
        }
    }
}

// Eventos
btn.addEventListener('click', sendMessage);
input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Começar a execução
init();
