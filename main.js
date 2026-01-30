const msgDiv = document.getElementById('messages');
const input = document.getElementById('chatInput');
const btn = document.getElementById('sendBtn');

const CHAT_KEY = "com.light-darkness.chat/metadata";

let sceneReady = false;

/* =========================
   RENDERIZAÇÃO DO CHAT
========================= */
function renderChat(messages) {
    if (!messages) return;

    msgDiv.innerHTML = '';

    messages.forEach(msg => {
        const p = document.createElement('p');
        p.innerHTML = `<strong style="color:#44afff">${msg.user}:</strong> ${msg.text}`;
        msgDiv.appendChild(p);
    });

    msgDiv.scrollTop = msgDiv.scrollHeight;
}

/* =========================
   INICIALIZAÇÃO
========================= */
async function init() {
    if (!window.OBR) {
        console.warn("OBR não encontrado");
        return;
    }

    window.OBR.onReady(async () => {
        console.log("Chat LD: OBR pronto, aguardando cena...");

        // ESSENCIAL
        await window.OBR.scene.ready();
        sceneReady = true;

        console.log("Chat LD: Cena pronta e sincronizada!");

        // Escuta mudanças de metadata (multiplayer)
        window.OBR.scene.onMetadataChange((metadata) => {
            const chat = metadata[CHAT_KEY];
            if (chat?.messages) {
                renderChat(chat.messages);
            }
        });

        // Carrega histórico inicial
        const metadata = await window.OBR.scene.getMetadata();
        if (metadata[CHAT_KEY]?.messages) {
            renderChat(metadata[CHAT_KEY].messages);
        }
    });
}

/* =========================
   ENVIO DE MENSAGEM
========================= */
async function sendMessage() {
    if (!sceneReady) {
        console.warn("Cena ainda não está pronta");
        return;
    }

    const text = input.value.trim();
    if (!text) return;

    try {
        const playerName = await window.OBR.player.getName();

        const fullMetadata = await window.OBR.scene.getMetadata();
        const chatData = fullMetadata[CHAT_KEY] || { messages: [] };

        chatData.messages.push({
            user: playerName,
            text,
            time: Date.now()
        });

        if (chatData.messages.length > 40) {
            chatData.messages.shift();
        }

        await window.OBR.scene.setMetadata({
            ...fullMetadata,
            [CHAT_KEY]: chatData
        });

        input.value = '';
        input.focus();
    } catch (err) {
        console.error("Erro ao enviar mensagem:", err);
    }
}

/* =========================
   EVENTOS
========================= */
btn.addEventListener('click', sendMessage);
input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
});

init();
