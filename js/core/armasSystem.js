/* ============================================================
   === [ MOTOR DE ARMAS - V5.5 (CATÁLOGO ORGANIZADO) ] ===
   ============================================================ */

window.MotorArmas = {
    observadores: [], // Array para guardar os vigias

    catalogo: {
        // 🪓 ATRIBUTO: FORÇA (Dano Físico)
        "espadão":    { tipo: "melee", duasMaos: true,  atributoBase: "for", categoriaDano: "fisico", efeito: "30% de chance: Sangramento", status: "SANGRAMENTO", chance: 0.3 },
        "espada":     { tipo: "melee", duasMaos: false, atributoBase: "for", categoriaDano: "fisico", efeito: "30% de chance: Sangramento", status: "SANGRAMENTO", chance: 0.3 },
        "machadão":   { tipo: "melee", duasMaos: true,  atributoBase: "for", categoriaDano: "fisico", efeito: "30% de chance: Medo", status: "MEDO", chance: 0.3 },
        "machado":    { tipo: "melee", duasMaos: false, atributoBase: "for", categoriaDano: "fisico", efeito: "30% de chance: Medo", status: "MEDO", chance: 0.3 },
        "martelão":   { tipo: "melee", duasMaos: true,  atributoBase: "for", categoriaDano: "fisico", efeito: "30% de chance: Suspenso", status: "SUSPENSO", chance: 0.3 },
        "maça":       { tipo: "melee", duasMaos: false, atributoBase: "for", categoriaDano: "fisico", efeito: "30% de chance: Suspenso", status: "SUSPENSO", chance: 0.3 },
        "lança":      { tipo: "melee", duasMaos: true,  atributoBase: "for", categoriaDano: "fisico", efeito: "Alcance 2 SQM / 30% Ignorar Armadura", alcance: 2.5, ignoraDefesaChance: 0.3 },

        // 🏹 ATRIBUTO: DESTREZA (Dano Físico)
        "besta":      { tipo: "ranged", duasMaos: false, atributoBase: "dex", categoriaDano: "fisico", efeito: "Crítico Expandido (16-20)", margemCritico: 16 },
        "katana":     { tipo: "melee", duasMaos: true,  atributoBase: "dex", categoriaDano: "fisico", efeito: "Soma Atributo Secundário / Combo Mortal", somaAtributoSecundario: "for", penalizaEsquivaPorForca: true, ataqueBonus: true },
        "adaga":      { tipo: "melee", duasMaos: false, atributoBase: "dex", categoriaDano: "fisico", efeito: "Leve e Rápida / Combo Mortal", ataqueBonus: true },
        "arco":       { tipo: "ranged", duasMaos: true,  atributoBase: "dex", categoriaDano: "fisico", efeito: "Crítico Expandido (16-20)", margemCritico: 16 },

        // 🛡️ ATRIBUTO: DEFESA (Dano Físico)
        "escudão":    { tipo: "melee", duasMaos: true,  atributoBase: "def", categoriaDano: "fisico", efeito: "Dano por DEF (x1) / Dano -50%", travaMultiplicador: 1, penalidadeDano: 0.5 },
        "escudo":     { tipo: "melee", duasMaos: false, atributoBase: "def", categoriaDano: "fisico", efeito: "Dano por DEF (x1) / Dano -50%", travaMultiplicador: 1, penalidadeDano: 0.5 },

        // 🔮 ATRIBUTO: INTELIGÊNCIA (Dano Mágico)
        "cajado":     { tipo: "ranged", duasMaos: true,  atributoBase: "int", categoriaDano: "magico", efeito: "30% de chance: Maldição", status: "MALDICAO", chance: 0.3 },
        "varinha":    { tipo: "ranged", duasMaos: false, atributoBase: "int", categoriaDano: "magico", efeito: "30% de chance: Maldição", status: "MALDICAO", chance: 0.3 },
        "pergaminho": { tipo: "ranged", duasMaos: true,  atributoBase: "int", categoriaDano: "magico", efeito: "Invoca Espírito Ancestral na Iniciativa", invocaFamiliar: true },
        "tomo":       { tipo: "ranged", duasMaos: false, atributoBase: "int", categoriaDano: "magico", efeito: "Invoca Espírito Ancestral na Iniciativa", invocaFamiliar: true },
        "pistola":    { tipo: "ranged", duasMaos: false, atributoBase: "int", categoriaDano: "magico", efeito: "Ataque Bônus / Dano Mágico / 30% Confusão", ataqueBonus: true, status: "CONFUSAO", chance: 0.3 },

        // ❤️ ATRIBUTO: CONSTITUIÇÃO (Dano Mágico)
        "bastão":     { tipo: "melee", duasMaos: true,  atributoBase: "con", categoriaDano: "magico", efeito: "Ataque denso de pura força vital" },
        "luva":       { tipo: "melee", duasMaos: false, atributoBase: "con", categoriaDano: "magico", efeito: "Ataque denso de pura força vital" },

        // ✨ ATRIBUTO: CARISMA (Dano Mágico)
        "alaúde":     { tipo: "ranged", duasMaos: true,  atributoBase: "car", categoriaDano: "magico", efeito: "Som destrutivo" },
        "flauta":     { tipo: "ranged", duasMaos: false, atributoBase: "car", categoriaDano: "magico", efeito: "Som destrutivo" }
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
        return "leve"; 
    },

    checarSeEhDuasMaos: function(itemData) {
        if (!itemData) return false;
        try {
            const item = typeof itemData === 'string' ? JSON.parse(itemData) : itemData;
            if (item.maos == 2 || item.maos === "2") return true;

            const textoBusca = [item.tipoEspecifico || "", item.subTipo || "", item.nome || "", item.descricao || ""].join(" ").toLowerCase();
            const arma = this.identificarArma(textoBusca);
            
            if (arma && arma.duasMaos) return true;
            if (textoBusca.includes("duas mãos") || textoBusca.includes("two-handed")) return true;
        } catch (e) { return false; }
        return false;
    },

    verificarEmpunhadura: function() {
        const slotMaoDir = document.querySelector('[data-slot-index="63"]');
        const slotMaoEsq = document.querySelector('[data-slot-index="65"]');
        
        if (!slotMaoDir || !slotMaoEsq) return;

        let bloquearEsquerda = false;
        let motivo = "";

        if (slotMaoDir.dataset.itemFullData) {
            if (this.checarSeEhDuasMaos(slotMaoDir.dataset.itemFullData)) {
                bloquearEsquerda = true;
                motivo = "Mão Direita Ocupada (2 Mãos)";
            }
        }

        if (!bloquearEsquerda && slotMaoEsq.dataset.itemFullData) {
            if (this.checarSeEhDuasMaos(slotMaoEsq.dataset.itemFullData)) {
                bloquearEsquerda = true;
                motivo = "ILEGAL: Arma de 2 Mãos no Slot Secundário";
            }
        }

        if (bloquearEsquerda) {
            if (!slotMaoEsq.classList.contains('slot-bloqueado')) {
                slotMaoEsq.classList.add('slot-bloqueado');
                slotMaoEsq.style.opacity = '0.3';
                slotMaoEsq.style.filter = 'grayscale(100%)';
                slotMaoEsq.style.border = '2px solid red';
                slotMaoEsq.title = `⛔ ${motivo}`;
            }
        } else {
            if (slotMaoEsq.classList.contains('slot-bloqueado')) {
                slotMaoEsq.classList.remove('slot-bloqueado');
                slotMaoEsq.style.opacity = '1';
                slotMaoEsq.style.filter = 'none';
                slotMaoEsq.style.border = '1px solid #444';
                slotMaoEsq.title = "Mão Secundária";
            }
        }
    },

    verificarMaoEsquerda: function() {
        const slotEsq = document.querySelector('[data-slot-index="65"]'); 
        if (!slotEsq || !slotEsq.dataset.itemFullData) return false;
        if (slotEsq.classList.contains('slot-bloqueado')) return false;
        return true; 
    },

    validarAlcance: function(atacante, alvo) {
        const isOffHand = window.combate && window.combate.ataqueSecundarioRealizado;
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
            const limiteMelee = (arma && arma.alcance) ? arma.alcance : 1.5;
            if (distanciaSQM > limiteMelee) return { pode: false, msg: `Muito longe para ataque corpo-a-corpo! (Max ${limiteMelee} SQM)` };
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

    iniciarObservadores: function() {
        if (this.observadores.length > 0) return; 

        const slotMaoDir = document.querySelector('[data-slot-index="63"]');
        const slotMaoEsq = document.querySelector('[data-slot-index="65"]');
        
        if (slotMaoDir && slotMaoEsq) {
            const config = { attributes: true, childList: true, subtree: true, characterData: true };
            const callback = () => window.MotorArmas.verificarEmpunhadura();
            const obs1 = new MutationObserver(callback); obs1.observe(slotMaoDir, config); this.observadores.push(obs1);
            const obs2 = new MutationObserver(callback); obs2.observe(slotMaoEsq, config); this.observadores.push(obs2);
            this.verificarEmpunhadura();
        } else {
            setTimeout(() => window.MotorArmas.iniciarObservadores(), 1000);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => window.MotorArmas.iniciarObservadores());
setTimeout(() => window.MotorArmas.iniciarObservadores(), 500);