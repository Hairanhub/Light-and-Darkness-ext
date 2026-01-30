// Função para colocar texto na tela
function renderMsg(sender, text) {
  const msgDiv = document.getElementById('messages');
  msgDiv.innerHTML += `<p><strong>${sender}:</strong> ${text}</p>`;
  msgDiv.scrollTop = msgDiv.scrollHeight;
}

async function init() {
  // Verifica se o SDK (OBR) carregou
  if (typeof OBR === 'undefined' || !OBR) {
    console.error("SDK do Owlbear não encontrado. Tentando novamente...");
    setTimeout(init, 500);
    return;
  }

  OBR.onReady(() => {
    console.log("LD Chat Conectado!");

    // Escuta mensagens da party
    OBR.party.onChatMessage((messages) => {
      messages.forEach(msg => {
        renderMsg(msg.senderName, msg.text);
      });
    });
  });
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();

  if (text && typeof OBR !== 'undefined') {
    try {
      await OBR.party.sendChatMessage([{ text: text }]);
      input.value = '';
    } catch (err) {
      console.error("Erro ao enviar:", err);
    }
  }
}

// Configura os botões
document.getElementById('sendBtn').onclick = sendMessage;
document.getElementById('chatInput').onkeyup = (e) => {
  if (e.key === 'Enter') sendMessage();
};

// Inicia a verificação
init();
