const msgDiv = document.getElementById('messages');
const input = document.getElementById('chatInput');
const btn = document.getElementById('sendBtn');
const CHAT_KEY = "com.ld_social_chat.metadata";

function renderChat(messages) {
    msgDiv.innerHTML = ''; // Limpa para redesenhar o histórico
    messages.forEach(msg => {
        const p = document.createElement('p');
        p.innerHTML = `<strong>${msg.user}:</strong> ${msg.text}`;
        msgDiv.appendChild(p);
    });
    msgDiv.scrollTop = msgDiv.scrollHeight;
}

async function init() {
    if (typeof window.OBR === 'undefined') return;

    window.OBR.onReady(async () => {
        console.log("Chat LD: Sincronizando via Metadata...");

        // 1. Escuta mudanças na cena (quando alguém envia mensagem)
        window.OBR.scene.onMetadataChange((metadata) => {
            const chatData = metadata[CHAT_KEY];
            if (chatData && chatData.messages) {
                renderChat(chatData.messages);
            }
        });

        // 2. Carrega as mensagens existentes ao abrir
        const metadata = await window.OBR.scene.getMetadata();
        if (metadata[CHAT_KEY]) {
            renderChat(metadata[CHAT_KEY].messages);
        }
    });
}

async function sendMessage() {
    const text = input.value.trim();
    if (!text || !window.OBR) return;

    try {
        const name = await window.OBR.player.getName();
        const metadata = await window.OBR.scene.getMetadata();
        
        // Pega o que já existe ou cria um chat novo
        const chatData = metadata[CHAT_KEY] || { messages: [] };
        
        // Adiciona a nova mensagem
        chatData.messages.push({
            user: name || "Jogador",
            text: text,
            time: Date.now()
        });

        // Limita o histórico para as últimas 50 mensagens (evita travar a cena)
        if (chatData.messages.length > 50) chatData.messages.shift();

        // SALVA NA CENA (Sincroniza com todos)
        await window.OBR.scene.setMetadata({
            [CHAT_KEY]: chatData
        });

        input.value = '';
        input.focus();
    } catch (err) {
        console.error("Erro ao sincronizar metadata:", err);
    }
}

btn.onclick = sendMessage;
input.onkeydown = (e) => { if (e.key === 'Enter') sendMessage(); };

init();
