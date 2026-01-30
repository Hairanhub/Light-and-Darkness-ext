const msgDiv = document.getElementById('messages');
const input = document.getElementById('chatInput');
const btn = document.getElementById('sendBtn');

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

        // ESCUTAR: Aqui recebemos o que os outros enviam
        window.OBR.party.onChatMessage((messages) => {
            if (Array.isArray(messages)) {
                messages.forEach(msg => {
                    // Renderiza a mensagem vinda da rede
                    renderMsg(msg.senderName || "Jogador", msg.text, "#00ff88");
                });
            }
        });
    });
}

async function sendMessage() {
    const text = input.value.trim();
    if (text && window.OBR) {
        try {
            // ENVIAR: Manda para a sala do Owlbear
            await window.OBR.party.sendChatMessage([{ text: text }]);
            
            // Renderiza na sua tela (local)
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
