// main.js
const initChat = () => {
    const msgDiv = document.getElementById('messages');
    const input = document.getElementById('chatInput');
    const btn = document.getElementById('sendBtn');

    if (!msgDiv || !window.OBR) return;

    window.OBR.onReady(() => {
        // Escuta mensagens da party
        window.OBR.party.onChatMessage((msgs) => {
            msgs.forEach(m => {
                const p = document.createElement('p');
                p.style.color = "#00ff88";
                p.textContent = `${m.senderName || 'Alguém'}: ${m.text}`;
                msgDiv.appendChild(p);
                msgDiv.scrollTop = msgDiv.scrollHeight;
            });
        });
    });

    async function send() {
        const text = input.value.trim();
        if (!text) return;
        
        // Renderiza localmente primeiro
        const p = document.createElement('p');
        p.textContent = `Você: ${text}`;
        msgDiv.appendChild(p);

        await window.OBR.party.sendChatMessage([{ text: text }]);
        input.value = '';
    }

    btn.onclick = send;
};

// Garante que o código só rode após o SDK carregar
if (document.readyState === 'complete') {
    initChat();
} else {
    window.addEventListener('load', initChat);
}
