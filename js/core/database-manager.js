/* ============================================================
   === [ DATABASE MANAGER - V1.0 (A CENTRAL DE DADOS) ] ===
   === A ÚNICA porta de entrada e saída para o Firebase.
   ============================================================ */

window.DatabaseManager = {
    
    // Devolve a referência base (segurança caso o DB não esteja pronto)
    ref: function(caminho) {
        if (!window.database) {
            console.error("❌ ERRO FATAL: Firebase não inicializado!");
            return null;
        }
        return window.database.ref(caminho);
    },

    // ==========================================
    // 🛠️ 1. OPERAÇÕES GENÉRICAS (O MOTOR BASE)
    // ==========================================
    
    salvar: async function(caminho, dados) {
        return this.ref(caminho).set(dados);
    },

    atualizar: async function(caminho, dados) {
        return this.ref(caminho).update(dados);
    },

    adicionarNaLista: async function(caminho, dados) {
        return this.ref(caminho).push(dados);
    },

    deletar: async function(caminho) {
        return this.ref(caminho).remove();
    },

    lerUmaVez: async function(caminho) {
        const snap = await this.ref(caminho).once('value');
        return snap.val();
    },

    // ==========================================
    // ⚔️ 2. ATALHOS ESPECÍFICOS DO SEU VTT
    // ==========================================
    
    Tokens: {
        atualizarHP: async function(tokenId, novoHp) {
            // Usa window.mapaRef se existir, senão usa o caminho padrão
            const caminho = window.mapaRef ? window.mapaRef.child(`tokens/${tokenId}`) : window.DatabaseManager.ref(`mapa/tokens/${tokenId}`);
            return caminho.update({ hpAtual: novoHp });
        },
        
        atualizarMana: async function(tokenId, novaMana) {
            const caminho = window.mapaRef ? window.mapaRef.child(`tokens/${tokenId}`) : window.DatabaseManager.ref(`mapa/tokens/${tokenId}`);
            return caminho.update({ manaAtual: novaMana });
        },
        
        deletar: async function(tokenId) {
            const caminho = window.mapaRef ? window.mapaRef.child(`tokens/${tokenId}`) : window.DatabaseManager.ref(`mapa/tokens/${tokenId}`);
            return caminho.remove();
        }
    },

    Chat: {
        enviar: async function(sender, text, color = "#ffffff") {
            const msg = {
                sender: sender.toUpperCase(),
                text: text,
                color: color,
                timestamp: Date.now()
            };
            // Usa window.chatRef se existir
            if (window.chatRef) return window.chatRef.push(msg);
            return window.DatabaseManager.adicionarNaLista('chat_geral', msg);
        }
    },

    Ficha: {
        lerAtributos: async function(nomeJogador) {
            return window.DatabaseManager.lerUmaVez(`usuarios/${nomeJogador}/atributos`);
        },
        
        atualizarDinheiro: async function(nomeJogador, novoValorCobre) {
            return window.DatabaseManager.atualizar(`usuarios/${nomeJogador}`, { cobre: novoValorCobre });
        }
    }
};