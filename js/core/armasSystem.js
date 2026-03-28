/* ============================================================
   === [ MOTOR DE ARMAS - V5.1 (RANGE DINÂMICO DUAL WIELD) ] ===
   ============================================================ */

window.MotorArmas = {
    observadores: [], // Array para guardar os vigias

    catalogo: {
        // (Catálogo mantido)
        "espadão":    { tipo: "melee", duasMaos: true,  efeito: "Sangramento" },
        "espada":     { tipo: "melee", duasMaos: false, efeito: "Sangramento" },
        "machadão":   { tipo: "melee", duasMaos: true,  efeito: "Medo" },
        "machado":    { tipo: "melee", duasMaos: false, efeito: "Medo" },
        "martelão":   { tipo: "melee", duasMaos: true,  efeito: "Suspenso" },
        "maça":       { tipo: "melee", duasMaos: false, efeito: "Suspenso" },
        "katana":     { tipo: "melee", duasMaos: true,  efeito: "DEX vira dano físico" },
        "adaga":      { tipo: "melee", duasMaos: false, efeito: "DEX vira dano físico" },
        "escudão":    { tipo: "melee", duasMaos: true,  efeito: "DEF vira dano físico (-50%)" },
        "escudo":     { tipo: "melee", duasMaos: false, efeito: "DEF vira dano físico (-50%)" },
        "bastão":     { tipo: "melee", duasMaos: true,  efeito: "CON vira dano mágico" },
        "luva":       { tipo: "melee", duasMaos: false, efeito: "CON vira dano mágico" },
        "lança":      { tipo: "melee", duasMaos: true,  efeito: "Alcance 2m" },
        "cajado":     { tipo: "ranged", duasMaos: true,  efeito: "Maldição" },
        "varinha":    { tipo: "ranged", duasMaos: false, efeito: "Maldição" },
        "pergaminho": { tipo: "ranged", duasMaos: true,  efeito: "Espírito Ancestral" },
        "tomo":       { tipo: "ranged", duasMaos: false, efeito: "Espírito 50% vida" },
        "arco longo": { tipo: "ranged", duasMaos: true,  efeito: "Ataque Bônus" },
        "arco":       { tipo: "ranged", duasMaos: true,  efeito: "Ataque Bônus" },
        "besta":      { tipo: "ranged", duasMaos: false, efeito: "Ataque Bônus" },
        "alaúde":     { tipo: "ranged", duasMaos: true,  efeito: "CAR vira dano mágico + buff" },
        "flauta":     { tipo: "ranged", duasMaos: false, efeito: "CAR vira dano mágico + buff" },
        "grimoire":   { tipo: "ranged", duasMaos: false, efeito: "Int +2" }
    },

    identificarArma: function(texto) {
        if (!texto) return null;
        const stringBusca = texto.toLowerCase();
        const chaves = Object.keys(this.catalogo).sort((a, b) => b.length - a.length);
        for (let chave of chaves) {
            if (stringBusca.includes(chave)) return this.catalogo[chave];
        }
        return null; 
    },

    lerTipoArmadura: function() {
        // (Mantido igual ao V4.3 - Simplificado aqui pra não ocupar espaço)
        return "leve"; 
    },

    // --- HELPER: VERIFICA SE UM ITEM É DE DUAS MÃOS ---
    checarSeEhDuasMaos: function(itemData) {
        if (!itemData) return false;
        try {
            const item = typeof itemData === 'string' ? JSON.parse(itemData) : itemData;
            
            // 1. Propriedade Explícita
            if (item.maos == 2 || item.maos === "2") return true;

            // 2. Catálogo e Texto
            const textoBusca = [
                item.tipoEspecifico || "", item.subTipo || "", 
                item.nome || "", item.descricao || ""
            ].join(" ").toLowerCase();

            const arma = this.identificarArma(textoBusca);
            if (arma && arma.duasMaos) return true;
            if (textoBusca.includes("duas mãos") || textoBusca.includes("two-handed")) return true;

        } catch (e) { return false; }
        return false;
    },

    // --- LÓGICA CENTRAL DE BLOQUEIO ---
    verificarEmpunhadura: function() {
        const slotMaoDir = document.querySelector('[data-slot-index="63"]');
        const slotMaoEsq = document.querySelector('[data-slot-index="65"]');
        
        if (!slotMaoDir || !slotMaoEsq) return;

        let bloquearEsquerda = false;
        let motivo = "";

        // CASO 1: MÃO DIREITA TEM ARMA DE DUAS MÃOS?
        // Se sim, a esquerda deve ser bloqueada (pois as duas mãos estão ocupadas na direita)
        if (slotMaoDir.dataset.itemFullData) {
            if (this.checarSeEhDuasMaos(slotMaoDir.dataset.itemFullData)) {
                bloquearEsquerda = true;
                motivo = "Mão Direita Ocupada (2 Mãos)";
            }
        }

        // CASO 2 (NOVO): MÃO ESQUERDA TEM ARMA DE DUAS MÃOS?
        // Se sim, isso é ilegal. Bloqueia a esquerda para invalidar o item.
        if (!bloquearEsquerda && slotMaoEsq.dataset.itemFullData) {
            if (this.checarSeEhDuasMaos(slotMaoEsq.dataset.itemFullData)) {
                bloquearEsquerda = true;
                motivo = "ILEGAL: Arma de 2 Mãos no Slot Secundário";
            }
        }

        // APLICAÇÃO DO VISUAL
        if (bloquearEsquerda) {
            if (!slotMaoEsq.classList.contains('slot-bloqueado')) {
                slotMaoEsq.classList.add('slot-bloqueado');
                slotMaoEsq.style.opacity = '0.3';
                slotMaoEsq.style.filter = 'grayscale(100%)';
                slotMaoEsq.style.border = '2px solid red';
                slotMaoEsq.title = `⛔ ${motivo}`;
                console.log(`🔒 [MOTOR ARMAS] Bloqueio Aplicado: ${motivo}`);
            }
        } else {
            if (slotMaoEsq.classList.contains('slot-bloqueado')) {
                slotMaoEsq.classList.remove('slot-bloqueado');
                slotMaoEsq.style.opacity = '1';
                slotMaoEsq.style.filter = 'none';
                slotMaoEsq.style.border = '1px solid #444';
                slotMaoEsq.title = "Mão Secundária";
                console.log("🔓 [MOTOR ARMAS] Slots Liberados");
            }
        }
    },

    // --- FUNÇÕES DE SUPORTE ---
    verificarMaoEsquerda: function() {
        const slotEsq = document.querySelector('[data-slot-index="65"]'); 
        if (!slotEsq || !slotEsq.dataset.itemFullData) return false;
        // Se estiver marcado como bloqueado (ilegal ou ocupado), retorna false
        if (slotEsq.classList.contains('slot-bloqueado')) return false;
        return true; 
    },

    validarAlcance: function(atacante, alvo) {
        // 🔥 O PULO DO GATO: Descobre se estamos no 1º ou 2º ataque do turno
        const isOffHand = window.combate && window.combate.ataqueSecundarioRealizado;
        
        // Se for o 2º ataque, olha o slot 65 (Esquerda). Se for o 1º, olha o 63 (Direita).
        const slotId = isOffHand ? "65" : "63";
        const slotArma = document.querySelector(`[data-slot-index="${slotId}"]`);
        
        let arma = null;
        if (slotArma && slotArma.dataset.itemFullData) {
            try {
                const item = JSON.parse(slotArma.dataset.itemFullData);
                const textoBusca = [item.tipoEspecifico, item.subTipo, item.nome, item.descricao].join(" ");
                arma = this.identificarArma(textoBusca);
            } catch(e) {}
        }
        
        const tipoAtaque = arma ? arma.tipo : "melee";
        const distPixelsX = Math.abs(atacante.x - alvo.x);
        const distPixelsY = Math.abs(atacante.y - alvo.y);
        const distanciaSQM = Math.max(distPixelsX, distPixelsY) / 35;

        if (tipoAtaque === "melee") {
            if (distanciaSQM > 1.5) return { pode: false, msg: "Muito longe para ataque corpo-a-corpo!" };
        } else {
            const tipoArmadura = this.lerTipoArmadura();
            let limite = 7; 
            if (tipoArmadura === "pesada") limite = 3;
            if (tipoArmadura === "media")  limite = 5;
            if (tipoArmadura === "leve")   limite = 7;
            if (distanciaSQM > limite) return { pode: false, msg: `Armadura ${tipoArmadura.toUpperCase()} limita alcance!` };
        }
        return { pode: true };
    },

    // --- INICIALIZADOR DUPLO (VIGIA OS 2 SLOTS) ---
    iniciarObservadores: function() {
        if (this.observadores.length > 0) return; // Já iniciou

        const slotMaoDir = document.querySelector('[data-slot-index="63"]');
        const slotMaoEsq = document.querySelector('[data-slot-index="65"]');
        
        if (slotMaoDir && slotMaoEsq) {
            console.log("✅ [MOTOR ARMAS] Slots 63 e 65 encontrados. Iniciando polícia de slots.");
            
            const config = { attributes: true, childList: true, subtree: true, characterData: true };
            const callback = () => window.MotorArmas.verificarEmpunhadura();

            // Vigia a Direita
            const obs1 = new MutationObserver(callback);
            obs1.observe(slotMaoDir, config);
            this.observadores.push(obs1);

            // Vigia a Esquerda (NOVO!)
            const obs2 = new MutationObserver(callback);
            obs2.observe(slotMaoEsq, config);
            this.observadores.push(obs2);
            
            this.verificarEmpunhadura();

        } else {
            setTimeout(() => window.MotorArmas.iniciarObservadores(), 1000);
        }
    }
};

// Inicia
document.addEventListener('DOMContentLoaded', () => {
    window.MotorArmas.iniciarObservadores();
});
setTimeout(() => window.MotorArmas.iniciarObservadores(), 500);