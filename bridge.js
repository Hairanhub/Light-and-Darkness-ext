// CONFIGURAÇÃO DO CANAL
const RUMBLE_CHANNEL = "com.battle-system.dice-roller/roll-result";

// TENTATIVA DE CONEXÃO MANUAL CASO A SDK NÃO CARREGUE
if (typeof window.OBR === 'undefined') {
    window.OBR = window.parent.OBR; 
}

function iniciarExtensao() {
    const resDiv = document.getElementById("result");
    const btn = document.getElementById("roll-btn");

    // Tenta se conectar ao Owlbear Rodeo
    try {
        OBR.onReady(async () => {
            console.log("✅ Conectado com sucesso!");
            if (resDiv) resDiv.innerText = "Pronto para rolar!";

            btn.addEventListener("click", async () => {
                const name = await OBR.player.getName();
                const die = Math.floor(Math.random() * 20) + 1;
                const total = die + 5;

                // Envia para o Rumble
                await OBR.room.sendMessage(RUMBLE_CHANNEL, {
                    name: name,
                    roll: "1d20+5",
                    total: total,
                    result: `[${die}] + 5`,
                    type: "PLAYER_ROLL"
                });

                if (resDiv) resDiv.innerText = `Rolado: ${total}`;
                console.log("🎲 Enviado ao Rumble!");
            });
        });
    } catch (err) {
        console.error("Erro ao conectar:", err);
        if (resDiv) resDiv.innerText = "Clique aqui para tentar reconectar";
        resDiv.onclick = () => location.reload();
    }
}

// Espera a página carregar e tenta iniciar
window.onload = iniciarExtensao;
