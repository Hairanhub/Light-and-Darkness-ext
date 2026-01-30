import OBR from "https://cdn.jsdelivr.net/npm/@owlbear-rodeo/sdk@latest/dist/obr-sdk.js";

const ID_CANAL = "LD_CHAT_ROOM_V2";

function adicionarMensagem(autor, texto, ehMinha) {
    const log = document.getElementById("log");
    if (!log) {
        console.error("Elemento #log não encontrado!");
        return;
    }
    const div = document.createElement("div");
    div.className = ehMinha ? "msg me" : "msg";
    div.innerHTML = `<b>${autor}</b>${texto}`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}

// Só roda quando o OBR avisar que está pronto
OBR.onReady(() => {
    console.log("LD Chat: OBR Ready!");
    
    const campo = document.getElementById("chat-input");

    // Escuta mensagens de outros
    OBR.room.onMessage(ID_CANAL, (dados) => {
        if (dados && dados.msg) {
            adicionarMensagem(dados.nome || "Anônimo", dados.msg, false);
        }
    });

    // Envio ao apertar Enter
    campo.addEventListener("keydown", async (evento) => {
        if (evento.key === "Enter") {
            const texto = campo.value.trim();
            if (!texto) return;

            try {
                const meuNome = await OBR.player.getName();
                
                // Envia para a sala
                await OBR.room.sendMessage(ID_CANAL, { 
                    nome: meuNome, 
                    msg: texto 
                });

                // Renderiza localmente
                adicionarMensagem(meuNome, texto, true);
                campo.value = "";
            } catch (erro) {
                console.error("Falha no envio:", erro);
            }
        }
    });
});
