/* ============================================================
   === [ ENGINE DE LOOT E DROPS DINÂMICOS - VERSÃO V2.0 ] ===
   ============================================================ */

window.lootEngine = {
    
    // Mapeamento das categorias baseado no resultado do d20
    categorias: {
        20: "magia",               // Busca na coleção 'magias'
        19: ["arma", "armadura"],  // Busca na coleção 'itens'
        18: ["acessorio", "anel", "colar"],
        17: "artefato",
        16: "artefato",
        15: "artefato"
    },

    processarMorte: async function(tokenId, dadosMonstro, resultadoDado) {
        const categoriaDesejada = this.categorias[resultadoDado];

        // 1. Remove o monstro IMEDIATAMENTE do mapa
        window.mapaRef.child('tokens').child(tokenId).remove();
        window.enviarMensagemChat("SISTEMA", `💀 <b>${dadosMonstro.nome}</b> foi derrotado!`, "#ff4d4d");

        // 2. Se o dado resultou em drop (15 a 20), inicia a geração
        if (categoriaDesejada) {
            setTimeout(() => {
                this.gerarDrop(dadosMonstro.x, dadosMonstro.y, categoriaDesejada, dadosMonstro.nome);
            }, 500);
        }
    },

    gerarDrop: async function(x, y, categoria, nomeInimigo) {
        if (!window.database) return;

        // --- LÓGICA DE ROTA DINÂMICA ---
        // Se a categoria for "magia", apontamos para o nó de magias, senão, para itens.
        const eMagia = (categoria === "magia");
        const caminhoFirebase = eMagia ? 'magias' : 'itens';
        
        const snap = await window.database.ref(caminhoFirebase).once('value');
        const biblioteca = snap.val();
        
        if (!biblioteca) {
            console.warn(`Biblioteca ${caminhoFirebase} está vazia ou inacessível.`);
            return;
        }

        const categoriasBusca = Array.isArray(categoria) ? categoria : [categoria];
        
        // Filtra apenas o que está marcado como "marcadoParaDrop"
        const itensPossiveis = Object.values(biblioteca).filter(item => {
            const isMarcado = item.marcadoParaDrop === true;
            
            if (eMagia) {
                // Para magias, basta estar marcada para drop
                return isMarcado;
            } else {
                // Para itens, checa se o subTipo bate com o sorteado no d20
                const subTipoItem = (item.subTipo || item.tipoItem || "").toLowerCase();
                return isMarcado && categoriasBusca.includes(subTipoItem);
            }
        });

        if (itensPossiveis.length > 0) {
            // Sorteia um item/magia aleatório dentro dos que sobraram no filtro
            const sorteado = itensPossiveis[Math.floor(Math.random() * itensPossiveis.length)];
            
            // Define o tipo corretamente para o engine-tokens saber como renderizar o overlay
            const tipoFinal = eMagia ? "magia" : "itens";

            // Spawn no mapa
            window.spawnTokenGlobal({
                ...sorteado,
                x: x,
                y: y,
                tipo: tipoFinal,
                hpAtual: 0, // Itens e Magias dropados não precisam de barra de HP cheia
                isDrop: true // Ativa a animação de "drop" definida no CSS
            });

            const icone = eMagia ? "🔮" : "🎁";
            window.enviarMensagemChat("LOOT", `${icone} O destino sorriu! <b>${sorteado.nome}</b> caiu de ${nomeInimigo}!`, "#ffcc00");
        } else {
            console.log(`Nenhum drop disponível para a categoria: ${categoria}`);
        }
    }
};