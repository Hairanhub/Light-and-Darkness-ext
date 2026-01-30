const msgDiv = document.getElementById('messages');
const input = document.getElementById('chatInput');
const btn = document.getElementById('sendBtn');
const CHAT_KEY = "com.light-darkness.chat/metadata";

let canSend = false;
let mode = "party"; // Começa no modo simples, tenta subir para metadata

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
        
        // Libera o envio básico imediatamente
        canSend = true;

        // Tenta ativar o modo de sincronização por Metadata (Cena)
        const checkScene = setInterval(async () => {
            if (window.OBR.scene) {
                console.log("Chat LD: Cena detectada! Ativando sincronização persistente.");
                mode = "scene";
                clearInterval(checkScene);

                // Escuta mudanças no metadata da cena
                window.OBR.scene.onMetadataChange((metadata) => {
                    const data = metadata[CHAT_KEY];
                    if (data && data.messages) {
                        msgDiv.innerHTML = ''; // Limpa para atualizar histórico
                        data.messages.forEach(m => renderMsg(m.user, m.text));
                    }
                });
            }
        }, 1000);

        // Escuta mensagens rápidas (Party) caso o metadata falhe ou para mensagens instantâneas
        window.OBR.party.onChatMessage((msgs) => {
            if (mode === "party") { // Só usa se não estivermos no modo cena
                msgs.forEach(m => renderMsg(m.senderName || "Jogador", m.text, "#00ff88"));
            }
        });
    });
}

async function sendMessage() {
    if (!canSend) return;
    const text = input.value.trim();
    if (!text) return;

    try {
        let name = "Jogador";
        try { name = await window.OBR.player.getName(); } catch(e) {}

        if (mode === "scene" && window.OBR.scene) {
            // Lógica de Metadata (Persistente)
            const metadata = await window.OBR.scene.getMetadata();
            const chatData = metadata[CHAT_KEY] || { messages: [] };
            chatData.messages.push({ user: name, text: text });
            if (chatData.messages.length > 30) chatData.messages.shift();

            await window.OBR.scene.setMetadata({
                ...metadata,
                [CHAT_KEY]: chatData
            });
        } else {
            // Lógica de Party (Instantânea - Não salva histórico)
            await window.OBR.party.sendChatMessage([{ text: text }]);
            renderMsg("Você", text); // Mostra para si mesmo
        }

        input.value = '';
        input.focus();
    } catch (e) {
        console.error("Erro ao enviar:", e);
    }
}

btn.onclick = sendMessage;
input.onkeydown = (e) => { if (e.key === 'Enter') sendMessage(); };

init();
