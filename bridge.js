import OBR from "https://cdn.jsdelivr.net/npm/@owlbear-rodeo/sdk@latest/dist/obr-sdk.js";

// Este é o canal que extensões da Battle-System (Rumble) costumam observar
const RUMBLE_CHANNEL = "com.battle-system.dice-roller/roll-result";

OBR.onReady(() => {
    const btn = document.getElementById("roll-btn");
    const resDiv = document.getElementById("result");

    btn.addEventListener("click", async () => {
        const mod = parseInt(document.getElementById("mod").value) || 0;
        const die = Math.floor(Math.random() * 20) + 1;
        const total = die + mod;

        const userName = await OBR.player.getName();

        // 1. Mostrar na nossa própria telinha
        resDiv.innerText = `Resultado: ${total} (${die} + ${mod})`;

        // 2. Tentar enviar para o Rumble
        // O Rumble espera um objeto com essa estrutura aproximada:
        const rollData = {
            name: userName,
            roll: `1d20 + ${mod}`,
            total: total,
            result: `[${die}] + ${mod}`,
            type: "PLAYER_ROLL" 
        };

        try {
            await OBR.room.sendMessage(RUMBLE_CHANNEL, rollData);
            console.log("Tentativa de envio para o Rumble concluída.");
        } catch (e) {
            console.error("O Rumble não parece estar aceitando mensagens externas:", e);
        }
    });
});
