/* SDK MINIFICADA EMBUTIDA */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(exports):"function"==typeof define&&define.amd?define(["exports"],t):t((e="undefined"!=typeof globalThis?globalThis:e||self).OBR={})}(this,(function(e){"use strict";var t=window.parent;const n=()=>new Promise((e=>{const n=t=>{if("OBR_READY"===t.data.type)return window.removeEventListener("message",n),e()};window.addEventListener("message",n),t.postMessage({type:"OBR_READY_CHECK"},"*")}));e.onReady=e=>n().then(e),e.player={getName:()=>new Promise((e=>{const n=t=>{if("OBR_PLAYER_GET_NAME"===t.data.type)return window.removeEventListener("message",n),e(t.data.name)};window.addEventListener("message",n),t.postMessage({type:"OBR_PLAYER_GET_NAME"},"*")}))},e.room={sendMessage:(e,n)=>new Promise((o=>{t.postMessage({type:"OBR_ROOM_SEND_MESSAGE",channel:e,payload:n},"*"),o()}))}}));

/* SEU CÓDIGO DE ROLAGEM */
const RUMBLE_CHANNEL = "com.battle-system.dice-roller/roll-result";

OBR.onReady(async () => {
    console.log("🚀 CONECTADO!");
    const resDiv = document.getElementById("result");
    const btn = document.getElementById("roll-btn");

    if (resDiv) resDiv.innerText = "Pronto para rolar!";

    btn.addEventListener("click", async () => {
        try {
            const name = await OBR.player.getName() || "Jogador";
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
        } catch (err) {
            console.error(err);
        }
    });
});
