const msgDiv = document.getElementById('messages');
const input = document.getElementById('chatInput');
const btn = document.getElementById('sendBtn');
const CHAT_KEY = "com.light-darkness.chat/metadata";

let canSend = false;
let syncMode = "party"; // Começa no modo simples que não trava

function renderMsg(sender, text, color = "#44afff") {
    const p = document.createElement('p');
    p.innerHTML = `<strong style="color:${color}">${sender}:</strong> ${text}`;
    msgDiv.appendChild(p);
    msgDiv.scrollTop = msgDiv.scrollHeight;
}

async function init() {
    if (!window.OBR) return;

    window.OBR.onReady(async () => {
        console.log("Chat LD: Conectado!");
        
        // LIBERA O CHAT IMEDIATAMENTE
        canSend = true;

        // Escuta mensagens rápidas (Modo Party) - Funciona mesmo sem mapa
        window.OBR.party.onChatMessage((msgs) => {
            if (syncMode === "party") {
                msgs.forEach(m => renderMsg(m.senderName || "Jogador", m.text, "#00ff88"));
            }
        });

        // Tenta ativar o modo de Cena (Metadata) em silêncio
        const checkScene = setInterval(async () => {
            try {
                if (window.OBR.scene && typeof window.OBR.scene.getMetadata === 'function') {
                    const testMetadata = await window.OBR.scene.getMetadata();
                    if (testMetadata) {
                        console.log("Chat LD: Modo Persistente Ativado.");
                        syncMode = "scene";
                        clearInterval(checkScene);

                        // Muda para escutar o Metadata
                        window.OBR.scene.onMetadataChange((metadata) => {
                            const data = metadata[CHAT_KEY];
                            if (data && data.messages) {
                                msgDiv.innerHTML = '';
                                data.messages.forEach(m => renderMsg(m.user, m.text));
                            }
                        });
                    }
                }
            } catch (e) {
                // Silencioso: cena ainda não pronta
            }
        }, 2000);
    });
}

async function sendMessage() {
    if (!canSend) return;
    const text = input.value.trim();
    if (!text) return;

    try {
        let name = "Jogador";
        try { name = await window.OBR.player.getName(); } catch(e) {}

        if (syncMode === "scene") {
            // Tenta salvar na cena
            const metadata = await window.OBR.scene.getMetadata();
            const chatData = metadata[CHAT_KEY] || { messages: [] };
            chatData.messages.push({ user: name, text: text });
            if (chatData.messages.length > 30) chatData.messages.shift();

            await window.OBR.scene.setMetadata({
                ...metadata,
                [CHAT_KEY]: chatData
            });
        } else {
            // Envia apenas para a party (instantâneo)
            await window.OBR.party.sendChatMessage([{ text: text }]);
            renderMsg("Você", text);
        }

        input.value = '';
        input.focus();
    } catch (e) {
        console.error("Erro no envio:", e);
        // Se falhar o modo cena, tenta o modo party como emergência
        window.OBR.party.sendChatMessage([{ text: text }]);
        renderMsg("Você", text);
        input.value = '';
    }
}

btn.onclick = sendMessage;
input.onkeydown = (e) => { if (e.key === 'Enter') sendMessage(); };

init();
