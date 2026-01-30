import OBR from "https://cdn.jsdelivr.net/npm/@owlbear-rodeo/sdk@latest/dist/obr-sdk.js";

const chatLog = document.getElementById("chat-log");
const chatInput = document.getElementById("chat-input");
const CHANNEL = "light-darkness/chat-v1";

OBR.onReady(async () => {
  // Receber mensagens
  OBR.room.onMessage(CHANNEL, (data) => {
    renderMessage(data.sender, data.text, false);
  });

  // Enviar mensagens
  chatInput.addEventListener("keydown", async (e) => {
    if (e.key === "Enter" && chatInput.value.trim() !== "") {
      const name = await OBR.player.getName();
      const message = chatInput.value.trim();

      OBR.room.sendMessage(CHANNEL, { sender: name, text: message });
      renderMessage(name, message, true);
      chatInput.value = "";
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
