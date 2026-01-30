const msgDiv = document.getElementById('messages');
const input = document.getElementById('chatInput');
const btn = document.getElementById('sendBtn');

// Função para renderizar as mensagens
function renderMsg(sender, text, color = "#ffffff") {
    const p = document.createElement('p');
    p.innerHTML = `<strong style="color: ${color}">${sender}:</strong> ${text}`;
    msgDiv.appendChild(p);
    msgDiv.scrollTop = msgDiv.scrollHeight;
}

async function init() {
    if (typeof window.OBR === 'undefined') return;

    window.OBR.onReady(() => {
        console.log("SUCESSO: LD Chat Conectado e Ativo!");

        // ESCUTAR: O receptor precisa disto para ver a mensagem do emissor
        window.OBR.party.onChatMessage((messages) => {
            if (Array.isArray(messages)) {
                messages.forEach(msg => {
                    // Se a mensagem existir, mostre na tela com cor verde
                    if (msg.text) {
                        renderMsg(msg.senderName || "Outro Jogador", msg.text, "#00ff88");
                    }
                });
            }
        });
    });
}

async function sendMessage() {
    const text = input.value.trim();
    if (text && window.OBR) {
        try {
            // ENVIAR: Manda para os outros
            await window.OBR.party.sendChatMessage([{ text: text }]);
            
            // MOSTRAR: Aparece para você na cor azul
            renderMsg("Você", text, "#44afff");
            
            input.value = '';
            input.focus();
        } catch (err) {
            console.error("Erro ao enviar:", err);
        }
    }
}

btn.onclick = sendMessage;
input.onkeydown = (e) => { if (e.key === 'Enter') sendMessage(); };

init();
