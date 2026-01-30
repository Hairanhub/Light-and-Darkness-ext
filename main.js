import OBR from "https://cdn.jsdelivr.net/npm/@owlbear-rodeo/sdk@latest/dist/obr-sdk.js";

const chatLog = document.getElementById("chat-log");
const chatInput = document.getElementById("chat-input");
const CHANNEL = "com.light-darkness.chat"; // Use um ID único com pontos

OBR.onReady(() => {
    console.log("Chat pronto e conectado ao Owlbear!");

    // ESCUTAR mensagens (Isso roda quando OUTRA pessoa envia)
    OBR.room.onMessage(CHANNEL, (data) => {
        console.log("Mensagem recebida:", data);
        renderMessage(data.sender, data.text, false);
    });

    // ENVIAR mensagem
    chatInput.addEventListener("keydown", async (e) => {
        if (e.key === "Enter" && chatInput.value.trim() !== "") {
            try {
                const name = await OBR.player.getName();
                const message = chatInput.value.trim();

                // 1. Enviar para os outros jogadores
                await OBR.room.sendMessage(CHANNEL, { 
                    sender: name, 
                    text: message 
                });

                // 2. Renderizar na nossa própria tela (já que o onMessage não volta pra gente)
                renderMessage(name, message, true);
                
                chatInput.value = "";
                console.log("Mensagem enviada com sucesso!");
            } catch (error) {
                console.error("Erro ao enviar mensagem:", error);
            }
        }
    });
});

function renderMessage(sender, text, isMe) {
    const div = document.createElement("div");
    div.className = isMe ? "msg me" : "msg";
    div.innerHTML = `<b>${sender}</b>${text}`;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
}
