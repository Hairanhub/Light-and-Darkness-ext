import OBR from "https://cdn.jsdelivr.net/npm/@owlbear-rodeo/sdk@latest/dist/obr-sdk.js";

const ID_CANAL = "LD_CHAT_ROOM";

// Função para colocar a mensagem na tela
function adicionarMensagem(autor, texto, ehMinha) {
  const log = document.getElementById("log");
  const div = document.createElement("div");
  div.className = ehMinha ? "msg me" : "msg";
  div.innerHTML = `<b>${autor}</b>${texto}`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

OBR.onReady(async () => {
  const campo = document.getElementById("chat-input");

  // ESCUTAR: Quando alguém manda mensagem
  OBR.room.onMessage(ID_CANAL, (dados) => {
    adicionarMensagem(dados.nome, dados.msg, false);
  });

  // ENVIAR: Quando você aperta ENTER
  campo.addEventListener("keydown", async (evento) => {
    if (evento.key === "Enter") {
      const texto = campo.value.trim();
      if (!texto) return;

      try {
        // Pega o nome do player no OBR, se falhar usa "Anônimo"
        let meuNome = "Anônimo";
        try { meuNome = await OBR.player.getName(); } catch(e) {}

        // 1. Envia para os outros
        await OBR.room.sendMessage(ID_CANAL, { nome: meuNome, msg: texto });

        // 2. Mostra na sua tela
        adicionarMensagem(meuNome, texto, true);

        // 3. Limpa o campo
        campo.value = "";
      } catch (erro) {
        console.error("Erro ao enviar:", erro);
      }
    }
  });

  console.log("Script.js carregado!");
});
