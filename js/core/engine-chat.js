// Listener para receber mensagens em tempo real
if (window.chatRef) {
    window.chatRef.limitToLast(30).on('child_added', snapshot => {
        const data = snapshot.val();
        const chatLog = document.getElementById('chat-log');
        
        if (chatLog) {
            const div = document.createElement('div');
            div.className = "chat-msg-row"; 
            
            const senderColor = data.color || "#ffcc00"; 
            
            // Aplica a cor do remetente também na borda lateral do balão
            div.style.borderLeftColor = senderColor;
            
            // Estrutura em Blocos: Sender em cima, Texto embaixo
            div.innerHTML = `
                <div class="chat-sender" style="color: ${senderColor};">
                    ${data.sender || 'Sistema'}
                </div>
                <div class="chat-text">
                    ${data.text}
                </div>
            `;
            
            chatLog.appendChild(div);
            chatLog.scrollTop = chatLog.scrollHeight;
        }
    });
}

// Função Unificada de Envio (Mestre/Jogador)
window.sendMessage = function() {
    const input = document.getElementById('chat-message-input');
    if (!input) return;
    
    const msg = input.value.trim();
    if (msg === "") return;

    let finalMsg = msg;
    let msgColor = "#ffffff"; // Cor padrão para falas

    // Lógica de Comando de Dados
    if (msg.startsWith('/d')) {
        const faces = parseInt(msg.replace('/d', '')) || 20;
        const result = Math.floor(Math.random() * faces) + 1;
        finalMsg = `Rolou um dado de ${faces} faces e tirou <b>${result}</b>`;
        msgColor = "#00ffcc"; // Verde neon para dados
    }

    if (window.chatRef) {
        window.chatRef.push({
            sender: window.usuarioLogadoNome || "MESTRE",
            text: finalMsg,
            color: msgColor,
            timestamp: Date.now()
        });
    }

    input.value = "";
    input.focus();
};

// Escutar a tecla ENTER de forma segura
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chat-message-input');
    chatInput?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            window.sendMessage();
        }
    });
});

/**
 * Função para enviar mensagens automáticas do sistema/combate para o Firebase
 * @param {string} titulo - Quem está enviando (Ex: "⚔️ COMBATE")
 * @param {string} texto - A mensagem em si
 * @param {string} cor - Cor do nome do emissor (opcional)
 */
window.enviarMensagemChat = function(titulo, texto, cor = "#ffcc00") {
    if (window.chatRef) {
        window.chatRef.push({
            sender: titulo.toUpperCase(),
            text: texto,
            color: cor,
            timestamp: Date.now()
        });
    } else {
        console.error("❌ Erro: Referência do Chat (chatRef) não encontrada!");
    }
};