const msgDiv = document.getElementById('messages');
const input = document.getElementById('chatInput');
const btn = document.getElementById('sendBtn');

function renderMsg(sender, text) {
    const p = document.createElement('p');
    p.innerHTML = `<strong>${sender}:</strong> ${text}`;
    msgDiv.appendChild(p);
    msgDiv.scrollTop = msgDiv.scrollHeight;
}

// OBR agora virá do arquivo obr-sdk.js
async function init() {
    if (typeof window.OBR === 'undefined') {
        console.error("SDK não encontrado no arquivo obr-sdk.js!");
        return;
    }

    window.OBR.onReady(() => {
        console.log("SUCESSO: LD Chat Conectado!");
        
        window.OBR.party.onChatMessage((messages) => {
            messages.forEach(msg => {
                renderMsg(msg.senderName || "Mestre", msg.text);
            });
        });
    });
}

async function sendMessage() {
    const text = input.value.trim();
    if (text && window.OBR) {
        await window.OBR.party.sendChatMessage([{ text: text }]);
        input.value = '';
    }
}

btn.onclick = sendMessage;
input.onkeydown = (e) => { if (e.key === 'Enter') sendMessage(); };

init();
