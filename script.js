import OBR from "https://cdn.jsdelivr.net/npm/@owlbear-rodeo/sdk@latest/dist/obr-sdk.js";

const CHANNEL_ID = "com.light_and_darkness.chat_v2";

// Função para renderizar as mensagens de forma segura
function renderMsg(name, text, isMe) {
    const log = document.getElementById("log");
    if (!log) return; // Evita o erro de 'appendChild'

    const div = document.createElement("div");
    div.className = isMe ? "msg me" : "msg";
    div.innerHTML = `<b>${name}</b><span>${text}</span>`;
    
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}

OBR.onReady(async () => {
    console.log("LD Chat: Iniciado");
    
    const input = document.getElementById("chat-input");
    if (!input) return;

    // ESCUTAR mensagens de outros
    OBR.room.onMessage(CHANNEL_ID, (data) => {
        if (data && data.msg) {
            renderMsg(data.user || "Inominável", data.msg, false);
        }
    });

    // ENVIAR mensagem
    input.addEventListener("keydown", async (e) => {
        if (e.key === "Enter") {
            const message = input.value.trim();
            if (!message) return;

            try {
                // Tenta pegar o nome do player, usa "Mestre/Jogador" se falhar
                let userName = "Jogador";
                try {
                    userName = await OBR.player.getName();
                } catch (e) {
                    console.warn("Usando nome genérico por restrição de política.");
                }

                // Envia para a sala
                await OBR.room.sendMessage(CHANNEL_ID, { 
                    user: userName, 
                    msg: message 
                });

                // Mostra na própria tela
                renderMsg(userName, message, true);
                input.value = "";
            } catch (err) {
                console.error("Erro no fluxo de envio:", err);
            }
        }
    });
});
