const RUMBLE_CHANNEL = "com.battle-system.dice-roller/roll-result";

// No Chrome, usando a tag <script> no HTML, o OBR fica disponível globalmente
OBR.onReady(async () => {
    console.log("✅ AGORA SIM! OBR carregado e pronto.");
    
    const btn = document.getElementById("roll-btn");
    const resDiv = document.getElementById("result");

    resDiv.innerText = "Conectado ao Owlbear!";

    btn.addEventListener("click", async () => {
        try {
            const name = await OBR.player.getName();
            const die = Math.floor(Math.random() * 20) + 1;
            const total = die + 5;

            const payload = {
                name: name,
                roll: "1d20+5",
                total: total,
                result: `[${die}] + 5`,
                type: "PLAYER_ROLL"
            };

            // Envia para o Rumble
            await OBR.room.sendMessage(RUMBLE_CHANNEL, payload);
            
            resDiv.innerText = `Total: ${total}`;
            console.log("🎲 Enviado ao Rumble!", payload);
        } catch (e) {
            console.error("Erro ao rolar:", e);
        }
    });
});
