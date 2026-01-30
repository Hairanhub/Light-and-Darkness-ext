<script type="module">
  import OBR from "https://cdn.jsdelivr.net/npm/@owlbear-rodeo/sdk@latest/dist/obr-sdk.js";

  const CHANNEL = "light_darkness_chat_v1"; // Canal simples sem caracteres especiais

  // Função de renderização fora para ser acessível
  function renderMessage(sender, text, isMe) {
    const chatLog = document.getElementById("chat-log");
    if (!chatLog) return;
    const div = document.createElement("div");
    div.className = isMe ? "msg me" : "msg";
    div.innerHTML = `<b>${sender}</b>${text}`;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  OBR.onReady(async () => {
    const chatInput = document.getElementById("chat-input");

    // Escutar mensagens (vêm de outros jogadores)
    OBR.room.onMessage(CHANNEL, (data) => {
      if (data && data.sender && data.text) {
        renderMessage(data.sender, data.text, false);
      }
    });

    // Evento de envio
    chatInput.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        e.preventDefault(); // Impede quebra de linha ou comportamentos estranhos
        
        const message = chatInput.value.trim();
        if (message === "") return;

        try {
          // Tenta pegar o nome, se falhar usa "Jogador"
          let name = "Jogador";
          try {
            name = await OBR.player.getName();
          } catch (pErr) {
            console.warn("Não foi possível ler o nome do jogador, usando padrão.");
          }

          // ENVIA PARA OS OUTROS
          await OBR.room.sendMessage(CHANNEL, { sender: name, text: message });
          
          // MOSTRA PARA VOCÊ MESMO
          renderMessage(name, message, true);
          
          // Limpa o campo
          chatInput.value = "";
        } catch (err) {
          console.error("Erro crítico ao enviar:", err);
          alert("Erro ao enviar mensagem. Verifique o console (F12).");
        }
      }
    });

    console.log("Sistema de Chat Social Ativo!");
  });
</script>
