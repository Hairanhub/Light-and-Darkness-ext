/* ============================================================
   === [ SISTEMA DE PASSIVAS - V5.9.1 (AATROX SEM BLOQUEIO) ] ===
   ============================================================ */
window.PassiveSystem = {
    observadorAtivo: false,
    ultimoElementoSalvo: undefined, 
    ultimaPassivaSalva: undefined, 

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

    contarArmas: function() {
        let qtd = 0;
        const slotDir = document.querySelector('[data-slot-index="63"]');
        if (slotDir && slotDir.dataset.itemFullData) qtd++;
        const slotEsq = document.querySelector('[data-slot-index="65"]');
        if (slotEsq && slotEsq.dataset.itemFullData) qtd++;
        return Math.max(1, qtd);
    },

    obterPassivaEquipada: function() {
        const slotPassiva = document.querySelector('[data-slot-index="67"]');
        if (!slotPassiva || !slotPassiva.dataset.itemFullData) return null;

        try {
            const item = JSON.parse(slotPassiva.dataset.itemFullData);
            const textoParaBusca = JSON.stringify(item).toUpperCase();
            const nivel = parseInt(item.nivel) || parseInt(item.level) || 1;

            if (textoParaBusca.includes("DRAKAR") || textoParaBusca.includes("DRAKTAR")) return { tipo: "DRAKAR", nome: "Anel de Drakar", nivel: nivel };
            if (textoParaBusca.includes("ISOLDE")) return { tipo: "ISOLDE", nome: "Colar de Isolde", nivel: nivel };
            if (textoParaBusca.includes("HORUZ"))  return { tipo: "HORUZ",  nome: "Anel de Horuz",  nivel: nivel };
            if (textoParaBusca.includes("AATROX")) return { tipo: "AATROX", nome: "Máscara de Aatrox", nivel: nivel };

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

    atualizarVisualPassivas: function() {
        const passiva = this.obterPassivaEquipada();
        const slotsAlvos = [61, 62, 66, 68];

        slotsAlvos.forEach(idx => {
            const s = document.querySelector(`[data-slot-index="${idx}"]`);
            if (s) { 
                s.style.opacity = "1"; 
                s.style.filter = "none"; 
                s.style.border = "1px solid #444"; 
                s.classList.remove('slot-bloqueado'); 
                s.title = ""; 
            }
        });

        let novoElemento = (passiva && passiva.tipo === "ELEMENTAL") ? passiva.elemento : "";
        let novoTipoPassiva = passiva ? passiva.tipo : "";
        
        if (this.ultimoElementoSalvo !== novoElemento || this.ultimaPassivaSalva !== novoTipoPassiva) {
            this.ultimoElementoSalvo = novoElemento;
            this.ultimaPassivaSalva = novoTipoPassiva;
            this.sincronizarElementoNoBanco(novoElemento, novoTipoPassiva);
        }

        if (!passiva) return;

        let slotParaBloquear = null;
        let motivo = "";

        if (passiva.tipo === "DRAKAR") { slotParaBloquear = 68; motivo = "Bloqueado pelo Anel de Drakar (Passiva)"; }
        if (passiva.tipo === "HORUZ") { slotParaBloquear = 66; motivo = "Bloqueado pelo Anel de Horuz (Passiva)"; }
        if (passiva.tipo === "ISOLDE") { slotParaBloquear = 61; motivo = "Bloqueado pelo Colar de Isolde (Passiva)"; }
        
        // A MÁSCARA DE AATROX NÃO BLOQUEIA MAIS NENHUM SLOT!

        if (slotParaBloquear) {
            const s = document.querySelector(`[data-slot-index="${slotParaBloquear}"]`);
            if (s) {
                s.style.opacity = "0.4";
                s.style.filter = "grayscale(100%)";
                s.style.border = "1px solid #ff0000"; 
                s.classList.add('slot-bloqueado');
                s.title = motivo;
            }
        }
    },

    sincronizarElementoNoBanco: function(elemento, tipoPassiva) {
        const meuNome = window.usuarioLogadoNome || localStorage.getItem('rubi_username');
        if (!meuNome || !window.mapaRef) {
            this.ultimoElementoSalvo = undefined; 
            this.ultimaPassivaSalva = undefined;
            return;
        }
        window.mapaRef.child('tokens').orderByChild('dono').equalTo(meuNome).once('value', snap => {
            if (snap.exists()) {
                snap.forEach(child => {
                    child.ref.update({ elemento: elemento, passivaAtiva: tipoPassiva });
                });
            }
        });
    },

    iniciarObservador: function() {
        if (this.observadorAtivo) return;
        const slotPassiva = document.querySelector('[data-slot-index="67"]');
        if (slotPassiva) {
            const observer = new MutationObserver(() => { this.atualizarVisualPassivas(); });
            observer.observe(slotPassiva, { attributes: true, attributeFilter: ['data-item-full-data'] });
            this.observadorAtivo = true;
            this.atualizarVisualPassivas(); 
        }
    },

    calcularDanoExtra: function(atacante, tipoAtaque, dadosAlvo) {
        let passiva = null;

        if (atacante && (atacante.tipo === 'monstro' || atacante.tipo === 'monstros')) {
            if (atacante.elemento) {
                const nivelMonstro = parseInt(atacante.nivel) || 1; 
                passiva = { tipo: "ELEMENTAL", elemento: atacante.elemento.toUpperCase(), nivel: nivelMonstro };
            }
        } else { passiva = this.obterPassivaEquipada(); }

        if (!passiva) return { danoExtra: 0, log: "", curaBase: 0 };

        const modoTeste = window.forcarPassiva ? 1.0 : null;

        if (passiva.tipo === "DRAKAR") {
            if (Math.random() <= (modoTeste || 0.25)) return { drakarAtivou: true, log: ` <b style="color:#ff4d4d;">[DRAKTAR: DANO DOBRADO!]</b>` };
            return { danoExtra: 0, log: "" };
        }

        if (passiva.tipo === "ISOLDE") {
            const tentativas = this.contarArmas();
            let ativou = false;
            for (let i = 0; i < tentativas; i++) {
                if (Math.random() <= (modoTeste || 0.20)) { ativou = true; break; }
            }
            if (ativou) return { isoldeAtivou: true, log: ` <b style="color:#00d4ff;">[ISOLDE: ATAQUE DUPLO!]</b>` };
            return { danoExtra: 0, log: "" };
        }

        if (passiva.tipo === "AATROX") {
            if (Math.random() <= (modoTeste || 0.25)) {
                let rankAlvo = "G";
                if (dadosAlvo) rankAlvo = (dadosAlvo.rank || dadosAlvo.nivel || "G").toString().toUpperCase();

                // Tabela em BASE Atual (1 Base = 4 Visual)
                const tabelaCuraBase = { "G": 1, "F": 1, "E": 1, "D": 2, "C": 2, "B": 2, "A": 3, "S": 3, "SS": 4, "SSS": 5 };
                let curaBaseCalculada = tabelaCuraBase[rankAlvo] || 1;

                return { 
                    aatroxAtivou: true, 
                    curaBase: curaBaseCalculada, 
                    log: ` <b style="color:#2ecc71;">[AATROX: ROUBOU SANGUE!]</b>` 
                };
            }
            return { danoExtra: 0, log: "", curaBase: 0 };
        }

        if (passiva.tipo === "ELEMENTAL") {
            const elAtaque = passiva.elemento; 
            const elDefensor = dadosAlvo ? (dadosAlvo.elemento || "").toUpperCase() : "";
            const afinidade = this.affinities[elAtaque];
            
            let danoBaseFlat = (elAtaque === "VENENO") ? 8 : ((passiva.nivel >= 2) ? 12 : 4);
            let log = ` <span style="color:#ffcc00;">(+${danoBaseFlat} ${elAtaque})</span>`;

            if (elAtaque !== "VENENO" && elDefensor && afinidade) {
                if (afinidade.forte.includes(elDefensor)) {
                    danoBaseFlat *= 2; 
                    log = ` <span style="color:#f1c40f;"><b>VANTAGEM!</b> (+${danoBaseFlat} ${elAtaque})</span>`;
                } else if (afinidade.fraco.includes(elDefensor)) {
                    danoBaseFlat = 0;  
                    log = ` <span style="color:#e74c3c;"><b>RESISTIDO!</b> (Imune a ${elAtaque})</span>`;
                }
            }
            return { danoExtra: danoBaseFlat, log, elemento: elAtaque };
        }
        return { danoExtra: 0, log: "" };
    },

    verificarDefesaEspecial: function(dadosAlvo) {
        let temHoruz = false;
        if (dadosAlvo && dadosAlvo.passivaAtiva) temHoruz = (dadosAlvo.passivaAtiva === "HORUZ");
        else {
            const passivaLoc = this.obterPassivaEquipada();
            temHoruz = (passivaLoc && passivaLoc.tipo === "HORUZ");
        }
        if (temHoruz && Math.random() <= (window.forcarPassiva ? 1.0 : 0.25)) {
            return { horuzAtivou: true, log: ` <b style="color:#ffffff; text-shadow: 0 0 10px gold;">🛡️ [HORUZ: ATAQUE IGNORADO!]</b>` };
        }
        return null;
    },

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

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { if(window.PassiveSystem) window.PassiveSystem.iniciarObservador(); }, 1000);
    setTimeout(() => { if(window.PassiveSystem) window.PassiveSystem.iniciarObservador(); }, 3000);
});