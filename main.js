const msgDiv = document.getElementById('messages');
const input = document.getElementById('chatInput');
const btn = document.getElementById('sendBtn');

// Função centralizada para renderizar mensagens na tela
function renderMsg(sender, text) {
    const p = document.createElement('p');
    // Adiciona uma cor diferente se for você (opcional)
    const isMe = sender === "Você" ? 'style="color: #00ff88;"' : 'class="sender"';
    p.innerHTML = `<span ${isMe}><strong>${sender}:</strong></span> ${text}`;
    msgDiv.appendChild(p);
    msgDiv.scrollTop = msgDiv.scrollHeight;
}

async function init() {
    if (typeof window.OBR === 'undefined') {
        return;
    }

    window.OBR.onReady(async () => {
        console.log("SUCESSO: LD Chat Conectado!");
        
        // Pega o seu próprio nome no Owlbear
        const myName = await window.OBR.player.getName();

        // Escuta mensagens de OUTROS jogadores
        window.OBR.party.onChatMessage((messages) => {
            messages.forEach(msg => {
                // Só renderiza se o nome for diferente do seu (para não duplicar)
                if (msg.senderName !== myName) {
                    renderMsg(msg.senderName || "Mestre", msg.text);
                }
            });
        });
    });
}

async function sendMessage() {
    const text = input.value.trim();
    if (text && window.OBR) {
        try {
            // 1. Envia para os outros jogadores
            await window.OBR.party.sendChatMessage([{ text: text }]);
            
            // 2. MOSTRA NA SUA PRÓPRIA TELA IMEDIATAMENTE
            renderMsg("Você", text);
            
            // 3. Limpa o campo
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
