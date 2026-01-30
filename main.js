// Aguarda o DOM carregar completamente antes de buscar os elementos
document.addEventListener('DOMContentLoaded', () => {
    const msgDiv = document.getElementById('messages');
    const input = document.getElementById('chatInput');
    const btn = document.getElementById('sendBtn');

    function render(name, text, color = "#44afff") {
        if (!msgDiv) return; // Evita o erro de appendChild se o div sumir
        const p = document.createElement('p');
        // Usando textContent para segurança, mas mantendo o strong com innerHTML
        p.innerHTML = `<strong style="color:${color}">${name}:</strong> `;
        const span = document.createElement('span');
        span.textContent = text;
        p.appendChild(span);
        
        msgDiv.appendChild(p);
        msgDiv.scrollTop = msgDiv.scrollHeight;
    }

    function init() {
        if (!window.OBR) {
            console.error("SDK do Owlbear não encontrado!");
            return;
        }

        window.OBR.onReady(() => {
            console.log("Chat LD: Conectado e Pronto!");

            // Escuta mensagens de outros jogadores (Vindo do SDK)
            window.OBR.party.onChatMessage((msgs) => {
                if (Array.isArray(msgs)) {
                    msgs.forEach(m => {
                        // Evita duplicar a própria mensagem que você já renderizou localmente
                        render(m.senderName || "Jogador", m.text, "#00ff88");
                    });
                }
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
    input.onkeydown = (e) => { 
        if (e.key === 'Enter') {
            e.preventDefault(); // Evita quebra de linha indesejada
            sendMessage();
        }
    };

    init();
});
