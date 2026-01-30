import OBR from "https://unpkg.com/@owlbear-rodeo/sdk@3.1.0/dist/obr-sdk.js";

const RUMBLE_CHANNEL = "com.battle-system.dice-roller/roll-result";

OBR.onReady(async () => {
    console.log("✅ SDK Carregada e conectada!");

    const btn = document.getElementById("roll-btn");
    const resDiv = document.getElementById("result");

    if (!btn) {
        console.error("Botão 'roll-btn' não encontrado no HTML.");
        return;
    }

    btn.addEventListener("click", async () => {
        try {
            // Tenta obter o nome do jogador
            let userName = "Jogador";
            try {
                userName = await OBR.player.getName();
            } catch (e) {
                console.warn("Usando nome padrão devido a restrições.");
            }

            // Lógica da rolagem
            const die = Math.floor(Math.random() * 20) + 1;
            const mod = 5;
            const total = die + mod;

            // Interface local
            if (resDiv) resDiv.innerText = `Total: ${total} ([${die}] + 5)`;

            // Dados para o Rumble
            const payload = {
                name: userName,
                roll: "1d20+5",
                total: total,
                result: `[${die}] + 5`,
                type: "PLAYER_ROLL"
            };

            // Envio para o canal do Rumble
            await OBR.room.sendMessage(RUMBLE_CHANNEL, payload);
            console.log("🎲 Enviado ao Rumble:", payload);

        } catch (err) {
            console.error("Erro na execução da rolagem:", err);
            if (resDiv) resDiv.innerText = "Erro ao rolar!";
        }
    });
});
