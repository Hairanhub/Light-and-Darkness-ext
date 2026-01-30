import OBR from "https://cdn.jsdelivr.net/npm/@owlbear-rodeo/sdk@latest/dist/obr-sdk.js";

const chatLog = document.getElementById("chat-log");
const chatInput = document.getElementById("chat-input");
const MSG_CHANNEL = "com.socialchat.plugin/message";

OBR.onReady(async () => {
  // Receber mensagens de outros jogadores
  OBR.room.onMessage(MSG_CHANNEL, (data) => {
    appendMessage(data.sender, data.text, false);
  });

  // Enviar mensagem
  chatInput.addEventListener("keydown", async (e) => {
    if (e.key === "Enter" && chatInput.value.trim() !== "") {
      const name = await OBR.player.getName();
      const text = chatInput.value.trim();

      OBR.room.sendMessage(MSG_CHANNEL, { sender: name, text: text });
      appendMessage(name, text, true);
      
      chatInput.value = "";
    }
  });
});

function appendMessage(sender, text, isMe) {
  const div = document.createElement("div");
  div.classList.add("msg");
  if (isMe) div.classList.add("me");
  
  div.innerHTML = `<b>${sender}</b> ${text}`;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}
