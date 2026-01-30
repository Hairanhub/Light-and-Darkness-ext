// Canal do Rumble
const RUMBLE_CHANNEL = "com.battle-system.dice-roller/roll-result";

// Função para rodar o código
function startBridge() {
    const resDiv = document.getElementById("result");

    // Verifica se a biblioteca OBR foi carregada pelo HTML
    if (typeof OBR === "undefined") {
        if (resDiv) resDiv.innerText = "Erro: SDK não carregada!";
        console.error("A biblioteca OBR não foi encontrada.");
        return;
    }

    OBR.onReady(async () => {
        console.log("✅ Conectado ao Owlbear Rodeo!");
        if (resDiv) resDiv.innerText = "Pronto para rolar!";
        
        const btn = document.getElementById("roll-btn");

        btn.addEventListener("click", async () => {
            try {
                // Pega o nome do player
                const name = await OBR.player.getName();
                
                // Rolagem
                const die = Math.floor(Math.random() * 20) + 1;
                const total = die + 5;

                // Mostra na tela da extensão
                if (resDiv) resDiv.innerText = `Total: ${total}`;

                // Envia para o Rumble
                await OBR.room.sendMessage(RUMBLE_CHANNEL, {
                    name: name,
                    roll: "1d20+5",
                    total: total,
                    result: `[${die}] + 5`,
                    type: "PLAYER_ROLL"
                });

                console.log("🎲 Enviado ao Rumble!");
            } catch (err) {
                console.error("Erro no clique:", err);
            }
        });
    });
}

// Executa a função após um pequeno delay para garantir que o OBR existe
setTimeout(startBridge, 500);
