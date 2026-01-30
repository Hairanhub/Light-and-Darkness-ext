const msgDiv = document.getElementById('messages');
const input = document.getElementById('chatInput');
const btn = document.getElementById('sendBtn');

const CHAT_KEY = "com.light-darkness.chat/metadata";

let canSend = false;

/* =========================
   RENDER
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
   INIT
========================= */
function init() {
    if (!window.OBR) {
        console.warn("OBR não encontrado");
        return;
    }

    window.OBR.onReady(async () => {
        console.log("Chat LD: OBR Pronto. Verificando cena...");

        // Espera a cena EXISTIR
        const waitScene = setInterval(async () => {
            if (!window.OBR.scene) return;

            clearInterval(waitScene);
            canSend = true;

            console.log("Chat LD: Cena detectada. Chat liberado!");

            // Escuta multiplayer
            window.OBR.scene.onMetadataChange((metadata) => {
                const chat = metadata[CHAT_KEY];
                if (chat?.messages) renderChat(chat.messages);
            });

            // Load inicial
            const metadata = await window.OBR.scene.getMetadata();
            if (metadata[CHAT_KEY]?.messages) {
                renderChat(metadata[CHAT_KEY].messages);
            }
        }, 200);
    });
}

/* =========================
   SEND
========================= */
async function sendMessage() {
    if (!canSend) {
        console.warn("Chat ainda não pronto");
        return;
    }

    const text = input.value.trim();
    if (!text) return;

    try {
        const playerName = await window.OBR.player.getName();

        const metadata = await window.OBR.scene.getMetadata();
        const chatData = metadata[CHAT_KEY] || { messages: [] };

        chatData.messages.push({
            user: playerName,
            text,
            time: Date.now()
        });

        if (chatData.messages.length > 40) chatData.messages.shift();

        await window.OBR.scene.setMetadata({
            ...metadata,
            [CHAT_KEY]: chatData
        });

        input.value = '';
        input.focus();
    } catch (e) {
        console.error("Erro ao enviar:", e);
    }
}

/* =========================
   EVENTS
========================= */
btn.addEventListener('click', sendMessage);
input.addEventListener('keydown', e => {
    if (e.key === 'Enter') sendMessage();
});

init();
