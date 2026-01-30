const msgDiv = document.getElementById('messages');
const input = document.getElementById('chatInput');
const btn = document.getElementById('sendBtn');

const CHAT_KEY = "com.light-darkness.chat/metadata";
let canSend = false;

/* =========================
   RENDER (Desenha as mensagens)
========================= */
function renderChat(messages) {
    if (!messages || !Array.isArray(messages)) return;
    msgDiv.innerHTML = '';

    messages.forEach(msg => {
        const p = document.createElement('p');
        // Se for você, coloca uma cor, se for outro, outra cor
        p.innerHTML = `<strong style="color:#44afff">${msg.user}:</strong> ${msg.text}`;
        msgDiv.appendChild(p);
    });

    msgDiv.scrollTop = msgDiv.scrollHeight;
}

/* =========================
   INIT (Conecta ao Owlbear)
========================= */
function init() {
    if (!window.OBR) {
        console.warn("OBR não encontrado");
        return;
    }

    window.OBR.onReady(async () => {
        console.log("Chat LD: OBR Pronto. Verificando cena...");

        const waitScene = setInterval(async () => {
            // Só libera quando a cena E o player estiverem prontos
            if (!window.OBR.scene || !window.OBR.player) return;

            clearInterval(waitScene);
            canSend = true;
            console.log("Chat LD: Tudo pronto! Chat liberado.");

            // Escuta mudanças de outros jogadores
            window.OBR.scene.onMetadataChange((metadata) => {
                const chat = metadata[CHAT_KEY];
                if (chat && chat.messages) renderChat(chat.messages);
            });

            // Carregamento inicial
            try {
                const metadata = await window.OBR.scene.getMetadata();
                if (metadata[CHAT_KEY] && metadata[CHAT_KEY].messages) {
                    renderChat(metadata[CHAT_KEY].messages);
                }
            } catch (e) {
                console.error("Erro no load inicial:", e);
            }
        }, 500);
    });
}

/* =========================
   SEND (Onde o problema estava)
========================= */
async function sendMessage() {
    if (!canSend) {
        console.warn("Chat ainda não está pronto para enviar.");
        return;
    }

    const text = input.value.trim();
    if (!text) return;

    try {
        // AJUSTE DE SEGURANÇA: Se o getName falhar, o chat não trava
        let playerName = "Jogador";
        try {
            playerName = await window.OBR.player.getName();
        } catch (nameError) {
            console.warn("Não pegou o nome, usando padrão.");
        }

        // PEGAR METADATA E FAZER O MERGE CORRETAMENTE
        const metadata = await window.OBR.scene.getMetadata();
        const chatData = metadata[CHAT_KEY] || { messages: [] };

        // Adiciona a nova mensagem ao array
        chatData.messages.push({
            user: playerName,
            text: text,
            time: Date.now()
        });

        // Mantém apenas as últimas 40 para não estourar o limite do Owlbear
        if (chatData.messages.length > 40) chatData.messages.shift();

        // ENVIO: Aqui usamos o ...metadata para não apagar o resto da cena
        await window.OBR.scene.setMetadata({
            ...metadata,
            [CHAT_KEY]: chatData
        });

        input.value = '';
        input.focus();
    } catch (e) {
        console.error("ERRO CRÍTICO NO ENVIO:", e);
        // Se der erro de Metadata, tentamos avisar no chat local
        const p = document.createElement('p');
        p.style.color = "red";
        p.innerText = "Erro ao sincronizar com a sala.";
        msgDiv.appendChild(p);
    }
}

/* =========================
   EVENTS
========================= */
btn.addEventListener('click', sendMessage);
input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        e.preventDefault(); // Evita quebra de linha
        sendMessage();
    }
});

init();
