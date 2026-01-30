const msgDiv = document.getElementById('messages');
const input = document.getElementById('chatInput');
const btn = document.getElementById('sendBtn');
const CHAT_KEY = "com.light-darkness.chat/metadata";

// Função para desenhar o chat na tela
function renderChat(messages) {
    if (!messages) return;
    msgDiv.innerHTML = ''; 
    messages.forEach(msg => {
        const p = document.createElement('p');
        p.innerHTML = `<strong style="color: #44afff">${msg.user}:</strong> ${msg.text}`;
        msgDiv.appendChild(p);
    });
    msgDiv.scrollTop = msgDiv.scrollHeight;
}

async function init() {
    if (typeof window.OBR === 'undefined') return;

    window.OBR.onReady(async () => {
        console.log("Chat LD: Conectado. Aguardando Cena...");

        // Verifica se a cena está pronta antes de tentar usar onMetadataChange
        if (window.OBR.scene) {
            window.OBR.scene.onMetadataChange((metadata) => {
                const data = metadata[CHAT_KEY];
                if (data && data.messages) {
                    renderChat(data.messages);
                }
            });

            // Carregamento inicial
            const metadata = await window.OBR.scene.getMetadata();
            if (metadata[CHAT_KEY]) {
                renderChat(metadata[CHAT_KEY].messages);
            }
        }
    });
}

async function sendMessage() {
    const text = input.value.trim();
    if (!text || !window.OBR) return;

    try {
        // Fallback seguro para o nome do jogador
        let playerName = "Jogador";
        try {
            playerName = await window.OBR.player.getName();
        } catch (e) {
            console.log("Usando nome padrão: Jogador");
        }

        const metadata = await window.OBR.scene.getMetadata();
        const chatData = metadata[CHAT_KEY] || { messages: [] };

        chatData.messages.push({
            user: playerName,
            text: text,
            time: Date.now()
        });

        // Mantém apenas as últimas 40 mensagens para não pesar o mapa
        if (chatData.messages.length > 40) chatData.messages.shift();

        await window.OBR.scene.setMetadata({
            [CHAT_KEY]: chatData
        });

        input.value = '';
        input.focus();
    } catch (err) {
        console.error("Erro ao enviar metadata:", err);
    }
}

btn.onclick = sendMessage;
input.onkeydown = (e) => { if (e.key === 'Enter') sendMessage(); };

init();
