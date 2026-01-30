import OBR from "https://unpkg.com/@owlbear-rodeo/sdk/dist/obr-sdk.js";

// Canal que o Rumble escuta para rolagens externas
const RUMBLE_CHANNEL = "com.battle-system.dice-roller/roll-result";

OBR.onReady(async () => {
    console.log("✅ Bridge do Rumble: SDK Carregada com sucesso!");

    const btn = document.getElementById("roll-btn");
    const resDiv = document.getElementById("result");

    btn.addEventListener("click", async () => {
        try {
            // Tenta pegar o nome do jogador (se falhar, usa "Jogador")
            let userName = "Jogador";
            try {
                userName = await OBR.player.getName();
            } catch (e) {
                console.warn("Aviso: Não foi possível ler o nome do player, usando padrão.");
            }

            // Lógica do Dado
            const die = Math.floor(Math.random() * 20) + 1;
            const mod = 5;
            const total = die + mod;

            // Estrutura de dados que o Rumble/Battle-System espera
            const payload = {
                name: userName,
                roll: "1d20+5",
                total: total,
                result: `[${die}] + 5`,
                type: "PLAYER_ROLL" 
            };

            // 1. Mostrar na nossa interface local
            resDiv.innerText = `Rolado: ${total} (${die}+5)`;

            // 2. Enviar para o Rumble
            await OBR.room.sendMessage(RUMBLE_CHANNEL, payload);
            
            console.log("🎲 Dados enviados para o Rumble!", payload);

        } catch (err) {
            console.error("❌ Erro ao processar clique:", err);
            resDiv.innerText = "Erro ao rolar!";
        }
    });
});
