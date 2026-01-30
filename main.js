const msgDiv = document.getElementById('messages');
const input = document.getElementById('chatInput');
const btn = document.getElementById('sendBtn');

// Função para colocar a mensagem no visual
function renderMsg(sender, text) {
    const p = document.createElement('p');
    // Se for você, o nome aparece em azul, se for outro, em branco
    const color = sender === "Você" ? "#44afff" : "#ffffff";
    p.innerHTML = `<strong style="color: ${color}">${sender}:</strong> ${text}`;
    msgDiv.appendChild(p);
    msgDiv.scrollTop = msgDiv.scrollHeight;
}

async function init() {
    if (typeof window.OBR === 'undefined') return;

    window.OBR.onReady(() => {
        console.log("SUCESSO: LD Chat Conectado!");

        // Escuta mensagens de outros jogadores
        window.OBR.party.onChatMessage((messages) => {
            if (Array.isArray(messages)) {
                messages.forEach(msg => {
                    // Renderiza a mensagem vinda da party
                    renderMsg(msg.senderName || "Mestre", msg.text);
                });
            }
        });
    });
}

async function sendMessage() {
    const text = input.value.trim();
    if (text && window.OBR) {
        try {
            // 1. Envia para a party
            await window.OBR.party.sendChatMessage([{ text: text }]);
            
            // 2. Renderiza na SUA tela imediatamente
            renderMsg("Você", text);
            
            // 3. Limpa e foca o campo de texto
            input.value = '';
            input.focus();
        } catch (err) {
            console.error("Erro ao enviar:", err);
            alert("Erro ao enviar mensagem!");
        }
    }
}

// Configura os eventos
btn.onclick = sendMessage;
input.onkeydown = (e) => { 
    if (e.key === 'Enter') {
        e.preventDefault(); // Impede que o Enter pule linha no input
        sendMessage();
    }
};

init();
