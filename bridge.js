import OBR from "https://cdn.skypack.dev/@owlbear-rodeo/sdk";

const RUMBLE_CHANNEL = "com.battle-system.dice-roller/roll-result";

OBR.onReady(async () => {
    // Se chegar aqui, o console vai gritar de alegria
    console.log("✅ CONEXÃO ESTABELECIDA!");
    
    const resDiv = document.getElementById("result");
    const btn = document.getElementById("roll-btn");

    if (resDiv) resDiv.innerText = "Pronto para rolar!";

    btn.addEventListener("click", async () => {
        try {
            const name = await OBR.player.getName();
            const die = Math.floor(Math.random() * 20) + 1;
            const total = die + 5;

            await OBR.room.sendMessage(RUMBLE_CHANNEL, {
                name: name,
                roll: "1d20+5",
                total: total,
                result: `[${die}] + 5`,
                type: "PLAYER_ROLL"
            });

            if (resDiv) resDiv.innerText = `Total: ${total}`;
            console.log("🎲 Dado enviado!");
        } catch (err) {
            console.error("Erro ao clicar:", err);
        }
    });
});
