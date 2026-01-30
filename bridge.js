import OBR from "https://cdn.jsdelivr.net/npm/@owlbear-rodeo/sdk@latest/dist/obr-sdk.js";

// Canal oficial do sistema de dados da Battle-System (Rumble)
const RUMBLE_CHANNEL = "com.battle-system.dice-roller/roll-result";

OBR.onReady(async () => {
    console.log("Bridge do Rumble: Ativa!");

    const btn = document.getElementById("roll-btn");
    
    btn.addEventListener("click", async () => {
        const name = await OBR.player.getName();
        const die = Math.floor(Math.random() * 20) + 1;
        const mod = 5;
        const total = die + mod;

        // O Rumble espera EXATAMENTE esta estrutura de objeto
        const payload = {
            name: name,
            roll: "1d20+5",
            total: total,
            result: `[${die}] + 5`,
            type: "PLAYER_ROLL" // Ou "CUSTOM"
        };

        try {
            // Enviando para o canal do Rumble
            await OBR.room.sendMessage(RUMBLE_CHANNEL, payload);
            
            console.log("Mensagem disparada para o Rumble:", payload);
            
            // Feedback visual na sua tela para saber que o clique funcionou
            document.getElementById("result").innerText = `Enviado: ${total}`;
        } catch (err) {
            console.error("Erro ao falar com o Rumble:", err);
        }
    });
});
