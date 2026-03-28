// ============================================================
// === [ CORE: INICIALIZAÇÃO DEFINITIVA ] ===
// ============================================================

var firebaseConfig = {
    apiKey: "AIzaSyAtDr19A4a_XkTuCpUotp0ReSgGQ37BNsw",
    authDomain: "light-and-darkness-project.firebaseapp.com",
    projectId: "light-and-darkness-project",
    databaseURL: "https://light-and-darkness-project-default-rtdb.firebaseio.com",
    storageBucket: "light-and-darkness-project.firebasestorage.app",
    messagingSenderId: "536659913128",
    appId: "1:536659913128:web:9b43ecc46c6cce8779dcc5"
};

// Inicializa o Firebase se ainda não estiver inicializado
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Define o banco de dados no escopo global
window.database = firebase.database();

// === PONTE DE COMPATIBILIDADE ===
// Criamos as referências individuais (para o chat.js e engine-mapa.js antigo)
// e o objeto refs (para o Criador.js e sistemas novos) simultaneamente.

window.chatRef = database.ref('chat_geral');
window.mapaRef = database.ref('mapa_atual');
window.arenaRef = database.ref('arena_ativa');

window.refs = {
    monstros: database.ref('monstros'), 
    npcs:     database.ref('npcs'),
    chat:     window.chatRef,  // Aponta para a mesma referência
    arena:    window.arenaRef,
    mapa:     window.mapaRef
};

console.log("🔥 Firebase conectado! Referências 'chatRef' e 'refs' prontas.");