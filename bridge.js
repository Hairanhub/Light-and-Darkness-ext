import OBR from "https://cdn.jsdelivr.net/npm/@owlbear-rodeo/sdk@3.1.0/dist/obr-sdk.min.js";

const RUMBLE_CHANNEL = "com.battle-system.dice-roller/roll-result";

OBR.onReady(async () => {
    // Se você vir esta mensagem no console (F12), a SDK finalmente carregou!
    console.log("✅ Conexão estabelecida com sucesso!");

    const btn = document.getElementById("roll-btn");
    const resDiv = document.getElementById("result");

    if (!btn) {
        console.error("Botão 'roll-btn' não encontrado no seu HTML!");
        return;
    }

    btn.addEventListener("click", async () => {
        try {
            let userName = "Jogador";
            try {
                userName = await OBR.player.getName();
            } catch (e) {
                console.warn("Usando nome genérico.");
            }

            const die = Math.floor(Math.random() * 20) + 1;
            const mod = 5;
            const total = die + mod;

            if (resDiv) resDiv.innerText = `Total: ${total} ([${die}] + 5)`;

            const payload = {
                name: userName,
                roll: "1d20+5",
                total: total,
                result: `[${die}] + 5`,
                type: "PLAYER_ROLL"
            };

            await OBR.room.sendMessage(RUMBLE_CHANNEL, payload);
            console.log("🎲 Resultado enviado ao Rumble!", payload);

        } catch (err) {
            console.error("Erro ao processar a rolagem:", err);
            if (resDiv) resDiv.innerText = "Erro ao rolar!";
        }
    });
});
