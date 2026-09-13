/* ============================================================
   === [ ENGINE DE LOOT E DROPS DINÂMICOS - VERSÃO V2.3 (MODO TESTE) ] ===
   ============================================================ */

window.lootEngine = {
    
    // Mapeamento das categorias baseado no resultado de um d20 virtual de sorte
    categorias: {
        20: "magia",               
        19: ["arma", "armadura"],  
        18: ["acessorio", "anel", "colar"],
        17: "runa", 
        16: "runa",
        15: "runa"
    },

    processarMorte: async function(tokenId, dadosMonstro, dadoIgnorado) {
        console.log(`🎲 [LOOT ENGINE] Iniciando roleta para: ${dadosMonstro.nome}`);
        
        // 🔥 MODO TESTE: Lê a variável global se existir
        let dadoSorte;
        if (window.forcarDrop !== undefined && window.forcarDrop !== null) {
            dadoSorte = window.forcarDrop;
            console.warn(`🛠️ [MODO DE TESTE] O dado de Loot foi FORÇADO para cair: ${dadoSorte}`);
        } else {
            dadoSorte = Math.floor(Math.random() * 20) + 1;
        }
        
        console.log(`🎲 [LOOT ENGINE] Dado rolado na sorte: ${dadoSorte}`);
        
        const categoriaDesejada = this.categorias[dadoSorte];
        console.log(`🎲 [LOOT ENGINE] Categoria que caiu: ${categoriaDesejada ? categoriaDesejada : 'NENHUMA (Azar)'}`);

        // 1. Remove o monstro
        window.mapaRef.child('tokens').child(tokenId).remove()
            .then(() => console.log(`🎲 [LOOT ENGINE] Token removido do banco.`));
            
        window.enviarMensagemChat("SISTEMA", `💀 <b>${dadosMonstro.nome}</b> foi derrotado!`, "#ff4d4d");

        // 2. Se caiu loot, tenta gerar
        if (categoriaDesejada) {
            console.log(`🎲 [LOOT ENGINE] Agendando criação do Drop...`);
            setTimeout(() => {
                this.gerarDrop(dadosMonstro.x, dadosMonstro.y, categoriaDesejada, dadosMonstro.nome);
            }, 500);
        }
    },

    gerarDrop: async function(x, y, categoria, nomeInimigo) {
        console.log(`🎁 [GERAR DROP] Procurando item da categoria:`, categoria);
        if (!window.database) return;

        const eMagia = (categoria === "magia");
        const caminhoFirebase = eMagia ? 'magias' : 'itens';
        
        const snap = await window.database.ref(caminhoFirebase).once('value');
        const biblioteca = snap.val();
        
        if (!biblioteca) {
            console.error(`🎁 [ERRO] A pasta /${caminhoFirebase} está vazia ou não existe!`);
            return;
        }

        const categoriasBusca = Array.isArray(categoria) ? categoria : [categoria];
        
        // Filtra
        const itensPossiveis = Object.values(biblioteca).filter(item => {
            const isMarcado = item.marcadoParaDrop === true;
            if (eMagia) return isMarcado;
            
            // Procura pelo subtipo ou tipoItem (em minúsculas para não ter erro)
            const subTipoItem = (item.subTipo || item.tipoItem || "").toLowerCase();
            return isMarcado && categoriasBusca.includes(subTipoItem);
        });

        console.log(`🎁 [GERAR DROP] Foram encontrados ${itensPossiveis.length} itens marcados como dropáveis para esta categoria.`);

        if (itensPossiveis.length > 0) {
            const sorteado = itensPossiveis[Math.floor(Math.random() * itensPossiveis.length)];
            console.log(`🎁 [GERAR DROP] ✨ ITEM SORTEADO: ${sorteado.nome}! Colocando no mapa...`);
            
            const tipoFinal = eMagia ? "magia" : "itens";

            window.spawnTokenGlobal({
                ...sorteado, x: x, y: y, tipo: tipoFinal, hpAtual: 0, isDrop: true 
            });

            const icone = eMagia ? "🔮" : "🎁";
            window.enviarMensagemChat("LOOT", `${icone} O destino sorriu! <b>${sorteado.nome}</b> caiu de ${nomeInimigo}!`, "#ffcc00");
        } else {
            console.warn(`🎁 [GERAR DROP] Falha: O dado caiu na categoria, mas não há NENHUM item dessa categoria com a caixinha 'Drop' marcada no banco.`);
        }
    }
};