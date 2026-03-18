/* ============================================================
   === [ SISTEMA DE PASSIVAS - V5.3 (BLOQUEIO VISUAL EM TEMPO REAL) ] ===
   ============================================================ */
window.PassiveSystem = {
    observadorAtivo: false,

    affinities: {
        "FOGO":     { forte: ["GELO", "NATUREZA"], fraco: ["AGUA", "VENTO"] },
        "AGUA":     { forte: ["TERRA", "FOGO"],    fraco: ["RAIO", "NATUREZA"] },
        "GELO":     { forte: ["RAIO", "VENTO"],    fraco: ["TERRA", "FOGO"] },
        "TERRA":    { forte: ["GELO", "RAIO"],     fraco: ["NATUREZA", "AGUA"] },
        "NATUREZA": { forte: ["TERRA", "AGUA"],    fraco: ["FOGO", "VENTO"] },
        "RAIO":     { forte: ["AGUA", "VENTO"],    fraco: ["TERRA", "GELO"] },
        "VENTO":    { forte: ["FOGO", "NATUREZA"], fraco: ["GELO", "RAIO"] },
        "VENENO":   { forte: [], fraco: ["FOGO", "AGUA", "GELO", "TERRA", "NATUREZA", "RAIO", "VENTO"] }
    },

    // --- HELPER: CONTA ARMAS EQUIPADAS ---
    contarArmas: function() {
        let qtd = 0;
        const slotDir = document.querySelector('[data-slot-index="63"]');
        if (slotDir && slotDir.dataset.itemFullData) qtd++;
        const slotEsq = document.querySelector('[data-slot-index="65"]');
        if (slotEsq && slotEsq.dataset.itemFullData) qtd++;
        return Math.max(1, qtd);
    },

    // 1. LER A GAVETA DE PASSIVAS (Slot 67)
    obterPassivaEquipada: function() {
        const slotPassiva = document.querySelector('[data-slot-index="67"]');
        if (!slotPassiva || !slotPassiva.dataset.itemFullData) return null;

        try {
            const item = JSON.parse(slotPassiva.dataset.itemFullData);
            const textoParaBusca = JSON.stringify(item).toUpperCase();
            const nivel = parseInt(item.nivel) || parseInt(item.level) || 1;

            if (textoParaBusca.includes("DRAKAR")) return { tipo: "DRAKAR", nome: "Anel de Drakar", nivel: nivel };
            if (textoParaBusca.includes("ISOLDE")) return { tipo: "ISOLDE", nome: "Colar de Isolde", nivel: nivel };
            if (textoParaBusca.includes("HORUZ"))  return { tipo: "HORUZ",  nome: "Anel de Horuz",  nivel: nivel };

            let elementoDetectado = null;
            if (textoParaBusca.includes("VENENO")) {
                elementoDetectado = "VENENO";
            } else {
                for(let el in this.affinities) {
                    if (el === "VENENO") continue;
                    const elComAcento = (el === 'AGUA') ? 'ÁGUA' : el;
                    if (textoParaBusca.includes(el) || textoParaBusca.includes(elComAcento)) {
                        elementoDetectado = el;
                        break;
                    }
                }
            }

            if (!elementoDetectado) return null;

            return { tipo: "ELEMENTAL", elemento: elementoDetectado, nivel: nivel, nomeOriginal: item.nome };
        } catch(e) { return null; }
    },

    // 2. ATUALIZAR VISUAL (AQUI ESTÁ A CORREÇÃO DO BLOQUEIO)
    atualizarVisualPassivas: function() {
        const passiva = this.obterPassivaEquipada();
        
        // Slots que podem ser bloqueados: 61 (Colar), 66 (Anel Esq), 68 (Anel Dir)
        const slotsAlvos = [61, 66, 68];

        // 1. Limpa o bloqueio de todos primeiro (Reset)
        slotsAlvos.forEach(idx => {
            const s = document.querySelector(`[data-slot-index="${idx}"]`);
            if (s) { 
                s.style.opacity = "1"; 
                s.style.filter = "none"; 
                s.style.border = "1px solid #444"; // Borda padrão
                s.classList.remove('slot-bloqueado'); 
                s.title = ""; // Limpa tooltip
            }
        });

        if (!passiva) return;

        // 2. Decide qual slot bloquear
        let slotParaBloquear = null;
        let motivo = "";

        if (passiva.tipo === "DRAKAR") { 
            slotParaBloquear = 68; // Anel Direito
            motivo = "Bloqueado pelo Anel de Drakar (Passiva)";
        }
        if (passiva.tipo === "HORUZ") { 
            slotParaBloquear = 66; // Anel Esquerdo
            motivo = "Bloqueado pelo Anel de Horuz (Passiva)";
        }
        if (passiva.tipo === "ISOLDE") { 
            slotParaBloquear = 61; // Colar
            motivo = "Bloqueado pelo Colar de Isolde (Passiva)";
        }

        // 3. Aplica o visual de bloqueio (Igual arma de duas mãos)
        if (slotParaBloquear) {
            const s = document.querySelector(`[data-slot-index="${slotParaBloquear}"]`);
            if (s) {
                s.style.opacity = "0.4";
                s.style.filter = "grayscale(100%)";
                s.style.border = "1px solid #ff0000"; // Borda vermelha pra indicar bloqueio
                s.classList.add('slot-bloqueado');
                s.title = motivo;
            }
        }
    },

    // 3. OBSERVADOR (VIGIA O SLOT 67 EM TEMPO REAL)
    iniciarObservador: function() {
        if (this.observadorAtivo) return;

        const slotPassiva = document.querySelector('[data-slot-index="67"]');
        if (slotPassiva) {
            // Cria o vigia
            const observer = new MutationObserver(() => {
                // Sempre que mudar algo no slot 67, roda a atualização visual
                this.atualizarVisualPassivas();
            });

            // Manda vigiar mudanças nos atributos (ex: quando arrasta um item pra lá)
            observer.observe(slotPassiva, { attributes: true, attributeFilter: ['data-item-full-data'] });
            
            this.observadorAtivo = true;
            this.atualizarVisualPassivas(); // Roda uma vez pra garantir
            console.log("✅ Sistema de Passivas: Observador Iniciado!");
        }
    },

    // 4. CÁLCULO DE BÔNUS
    calcularDanoExtra: function(atacante, tipoAtaque, elementoMonstro) {
        const passiva = this.obterPassivaEquipada();
        if (!passiva) return { danoExtra: 0, log: "" };

        // DRAKAR (25%)
        if (passiva.tipo === "DRAKAR") {
            if (Math.random() <= 0.25) return { drakarAtivou: true, log: ` <b style="color:#ff4d4d;">[DRAKAR: DANO DOBRADO!]</b>` };
            return { danoExtra: 0, log: "" };
        }

        // ISOLDE (CHECK POR ARMA - DUAL CHANCE)
        if (passiva.tipo === "ISOLDE") {
            const tentativas = this.contarArmas();
            let ativou = false;
            for (let i = 0; i < tentativas; i++) {
                if (Math.random() <= 0.20) { ativou = true; break; }
            }
            if (ativou) return { isoldeAtivou: true, log: ` <b style="color:#00d4ff;">[ISOLDE: ATAQUE DUPLO!]</b>` };
            return { danoExtra: 0, log: "" };
        }

        // ELEMENTAIS
        if (passiva.tipo === "ELEMENTAL") {
            const elAtaque = passiva.elemento; 
            const elMonstro = (elementoMonstro || "").toUpperCase();
            const afinidade = this.affinities[elAtaque];
            let danoBaseFlat = (elAtaque === "VENENO") ? 8 : ((passiva.nivel >= 2) ? 12 : 4);
            let log = ` <span style="color:#ffcc00;">(+${danoBaseFlat} ${elAtaque})</span>`;

            if (elAtaque !== "VENENO" && elMonstro && afinidade) {
                if (afinidade.forte.includes(elMonstro)) {
                    danoBaseFlat *= 2; 
                    log = ` <span style="color:#f1c40f;"><b>VANTAGEM!</b> (+${danoBaseFlat} ${elAtaque})</span>`;
                } else if (afinidade.fraco.includes(elMonstro)) {
                    danoBaseFlat = 0;  
                    log = ` <span style="color:#e74c3c;"><b>RESISTIDO!</b> (Imune a ${elAtaque})</span>`;
                }
            }
            return { danoExtra: danoBaseFlat, log, elemento: elAtaque };
        }
        return { danoExtra: 0, log: "" };
    },

    // 5. DEFESA (HORUZ)
    verificarDefesaEspecial: function() {
        const passiva = this.obterPassivaEquipada();
        if (passiva && passiva.tipo === "HORUZ" && Math.random() <= 0.25) {
            return { horuzAtivou: true, log: ` <b style="color:#ffffff; text-shadow: 0 0 10px gold;">[HORUZ: ATAQUE IGNORADO!]</b>` };
        }
        return null;
    },

    // 6. AURA VENENOSA
    rodarAuraVeneno: function(meuTokenId, posicaoX, posicaoY) {
        const passiva = this.obterPassivaEquipada();
        if (passiva && passiva.elemento === 'VENENO' && passiva.nivel >= 2 && window.mapaRef) {
            window.mapaRef.child('tokens').once('value', snap => {
                let curouAlguem = false;
                snap.forEach(child => {
                    const tk = child.val();
                    if (tk.id !== meuTokenId && tk.tipo !== 'monstros') {
                        const distBlocos = Math.max(Math.abs(tk.x - posicaoX), Math.abs(tk.y - posicaoY)) / 35;
                        if (distBlocos <= 2) {
                            let novoHp = Math.min((parseInt(tk.hpAtual) || 0) + 4, parseInt(tk.hpMax) || 20);
                            child.ref.update({ hpAtual: novoHp });
                            curouAlguem = true;
                        }
                    }
                });
                if (curouAlguem && window.enviarMensagemChat) {
                    window.enviarMensagemChat(window.usuarioLogadoNome || "Sistema", `<b style="color:#2ecc71;">Aura Venenosa</b> curou aliados!`, "#2ecc71");
                }
            });
        }
    }
};

// Inicializador Robusto
document.addEventListener('DOMContentLoaded', () => {
    // Tenta iniciar imediatamente
    setTimeout(() => { if(window.PassiveSystem) window.PassiveSystem.iniciarObservador(); }, 1000);
    // Tenta de novo depois (caso a ficha demore a carregar)
    setTimeout(() => { if(window.PassiveSystem) window.PassiveSystem.iniciarObservador(); }, 3000);
});