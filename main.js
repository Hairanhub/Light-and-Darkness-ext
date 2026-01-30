const msgDiv = document.getElementById('messages');
const input = document.getElementById('chatInput');
const btn = document.getElementById('sendBtn');
const CHAT_KEY = "com.light-darkness.chat/metadata";

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
        console.log("Chat LD: OBR Pronto. Verificando módulos...");

        // Aguarda um pequeno delay para garantir que scene e player existam
        const checkModules = setInterval(async () => {
            if (window.OBR.scene && window.OBR.player) {
                clearInterval(checkModules);
                console.log("Módulos detectados!");

                // ESCUTAR MUDANÇAS
                window.OBR.scene.onMetadataChange((metadata) => {
                    const data = metadata[CHAT_KEY];
                    if (data && data.messages) {
                        renderChat(data.messages);
                    }
                });

                // CARREGAR INICIAL
                const metadata = await window.OBR.scene.getMetadata();
                if (metadata[CHAT_KEY]) {
                    renderChat(metadata[CHAT_KEY].messages);
                }
            }
        }, 300);
    });
}

async function sendMessage() {
    const text = input.value.trim();
    if (!text || !window.OBR.scene || !window.OBR.player) return;

    try {
        // Fallback seguro para o nome
        let playerName = "Jogador";
        try { playerName = await window.OBR.player.getName(); } catch (e) {}

        // PEGAR METADATA ATUAL COMPLETO
        const fullMetadata = await window.OBR.scene.getMetadata();
        
        // Pega as mensagens ou cria array novo
        const chatData = fullMetadata[CHAT_KEY] || { messages: [] };

        // Adiciona nova mensagem
        chatData.messages.push({
            user: playerName,
            text: text,
            time: Date.now()
        });

        // Limite de 40 mensagens
        if (chatData.messages.length > 40) chatData.messages.shift();

        // O PULO DO GATO: Fazemos o merge para não apagar outros dados da cena
        const newMetadata = { ...fullMetadata }; // Copia tudo que já existe
        newMetadata[CHAT_KEY] = chatData;        // Atualiza/Adiciona só o chat

        await window.OBR.scene.setMetadata(newMetadata);

        input.value = '';
        input.focus();
    } catch (err) {
        console.error("Erro ao sincronizar:", err);
    }
}

btn.onclick = sendMessage;
input.onkeydown = (e) => { if (e.key === 'Enter') sendMessage(); };

init();
