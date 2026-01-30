import OBR from "https://cdn.skypack.dev/@owlbear-rodeo/sdk";

// Canal que o Rumble escuta
const RUMBLE_CHANNEL = "com.battle-system.dice-roller/roll-result";

OBR.onReady(async () => {
    console.log("✅ Conectado ao Owlbear Rodeo!");
    
    const resDiv = document.getElementById("result");
    const btn = document.getElementById("roll-btn");

    // Avisa na tela que a conexão deu certo
    if (resDiv) resDiv.innerText = "Pronto para rolar!";

    btn.addEventListener("click", async () => {
        try {
            // Pega o nome do player ou usa 'Jogador'
            let name = "Jogador";
            try {
                name = await OBR.player.getName();
            } catch (e) {
                console.warn("Não foi possível ler o nome do jogador.");
            }

            // Lógica do dado
            const die = Math.floor(Math.random() * 20) + 1;
            const total = die + 5;

            // 1. Atualiza a tela da sua extensão
            if (resDiv) resDiv.innerText = `Rolado: ${total}`;

            // 2. Envia para o Rumble (formato Battle-System)
            const payload = {
                name: name,
                roll: "1d20+5",
                total: total,
                result: `[${die}] + 5`,
                type: "PLAYER_ROLL"
            };

            await OBR.room.sendMessage(RUMBLE_CHANNEL, payload);
            console.log("🎲 Dados enviados para o Rumble!", payload);

        } catch (err) {
            console.error("Erro ao rolar:", err);
            if (resDiv) resDiv.innerText = "Erro na rolagem!";
        }
    });
});
