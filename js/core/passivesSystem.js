/* ============================================================
   === [ SISTEMA DE PASSIVAS - V8.2 (TRAVA DE CLASSIFICAÇÃO + FIX) ] ===
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
            if (textoParaBusca.includes("MALDICAO") || textoParaBusca.includes("MALDIÇÃO") || textoParaBusca.includes("MARCA")) return { tipo: "MALDICAO", nome: "Marca da Maldição", nivel: nivel };

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
        
        window.mapaRef.child('tokens').once('value', snap => {
            if (snap.exists()) {
                snap.forEach(child => {
                    const tk = child.val();
                    if (tk.dono && tk.dono.toLowerCase() === meuNome.toLowerCase()) {
                        child.ref.update({ elemento: elemento, passivaAtiva: tipoPassiva });
                    }
                });
            }
        });
    },

    // AQUI ESTÁ A FUNÇÃO QUE EU TINHA ESQUECIDO DE COPIAR!
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

    calcularDanoExtra: function(atacante, tipoAtaque, dadosAlvo, ataqueAcertou = true, tipoArma = "melee") {
        let passiva = null;

        if (atacante && (atacante.tipo === 'monstro' || atacante.tipo === 'monstros')) {
            if (atacante.elemento) {
                const elementoMonstro = atacante.elemento.toUpperCase();
                // 🔥 CORREÇÃO: Só aplica se for um elemento real (FOGO, GELO, etc).
                if (this.affinities[elementoMonstro]) {
                    const nivelMonstro = parseInt(atacante.nivel) || 1; 
                    passiva = { tipo: "ELEMENTAL", elemento: elementoMonstro, nivel: nivelMonstro };
                }
            }
        } else { 
            passiva = this.obterPassivaEquipada(); 
        }

        if (!passiva) return { danoExtra: 0, log: "", curaBase: 0 };

        const modoTeste = window.forcarPassiva ? 1.0 : null;

        if (passiva.tipo === "MALDICAO") {
            const hpAtual = parseFloat(dadosAlvo?.hpAtual !== undefined ? dadosAlvo.hpAtual : (dadosAlvo?.atributos?.hp || 20));
            const hpMax = parseFloat(dadosAlvo?.hpMax || dadosAlvo?.atributos?.hp || 20);
            
            if (hpAtual >= hpMax) {
                return { maldicaoAtivou: true, danoExtra: 0, log: `<br><b style="color:#9b59b6;">[MARCA DA MALDIÇÃO: CRÍTICO GARANTIDO!]</b>` };
            } else {
                return { danoExtra: 0, log: `<br><span style="color:#888; font-size:11px;"><i>(Maldição ignorada: O alvo já está ferido)</i></span>` };
            }
        }

        if (passiva.tipo === "DRAKAR") {
            if (Math.random() <= (modoTeste || 0.25)) {
                return { drakarAtivou: true, log: `<br><b style="color:#ff4d4d;">[DRAKTAR: DANO DOBRADO!]</b>` };
            } else {
                return { danoExtra: 0, log: `<br><span style="color:#888; font-size:11px;"><i>(Draktar falhou)</i></span>` };
            }
        }

        if (passiva.tipo === "ISOLDE") {
            const tentativas = this.contarArmas();
            let ativou = false;
            for (let i = 0; i < tentativas; i++) {
                if (Math.random() <= (modoTeste || 0.20)) { ativou = true; break; }
            }
            if (ativou) {
                return { isoldeAtivou: true, log: `<br><b style="color:#00d4ff;">[ISOLDE: ATAQUE DUPLO!]</b>` };
            } else {
                return { danoExtra: 0, log: `<br><span style="color:#888; font-size:11px;"><i>(Isolde falhou)</i></span>` };
            }
        }

        if (passiva.tipo === "AATROX") {
            if (Math.random() <= (modoTeste || 0.25)) {
                let rankAlvo = "G";
                if (dadosAlvo) rankAlvo = (dadosAlvo.rank || dadosAlvo.nivel || "G").toString().toUpperCase();

                const tabelaCuraBase = { "G": 0.25, "F": 0.50, "E": 0.75, "D": 1.00, "C": 1.25, "B": 1.50, "A": 1.75, "S": 2.00, "SS": 2.25, "SSS": 2.50 };
                let curaBaseCalculada = tabelaCuraBase[rankAlvo] || 0.25;

                return { 
                    aatroxAtivou: true, 
                    curaBase: curaBaseCalculada, 
                    log: `<br><b style="color:#2ecc71;">[AATROX: ROUBOU SANGUE!]</b>` 
                };
            } else {
                return { danoExtra: 0, log: `<br><span style="color:#888; font-size:11px;"><i>(Aatrox falhou)</i></span>`, curaBase: 0 };
            }
        }

        if (passiva.tipo === "ELEMENTAL") {
            const elAtaque = passiva.elemento; 
            
            if (elAtaque === "VENENO") {
                if (!ataqueAcertou || (tipoAtaque === "distancia" && tipoArma === "melee")) {
                    return { danoExtra: 0, log: "" };
                }
                return { venenoAtivou: true, danoExtra: 0, log: `<br><b style="color:#32ff32;">[PASSIVA: +1 STACK DE VENENO]</b>` };
            }

            const elDefensor = dadosAlvo ? (dadosAlvo.elemento || "").toUpperCase() : "";
            const afinidade = this.affinities[elAtaque];
            
            let danoBaseFlat = (passiva.nivel >= 2) ? 12 : 4;
            let logFinal = `<br><span style="color:#ffcc00;">(+${danoBaseFlat} ${elAtaque})</span>`;

            if (elDefensor && afinidade) {
                if (afinidade.forte.includes(elDefensor)) {
                    danoBaseFlat *= 2; 
                    logFinal = `<br><span style="color:#f1c40f;"><b>VANTAGEM!</b> (+${danoBaseFlat} ${elAtaque})</span>`;
                } else if (afinidade.fraco.includes(elDefensor)) {
                    danoBaseFlat = 0;  
                    logFinal = `<br><span style="color:#e74c3c;"><b>RESISTIDO!</b> (Imune a ${elAtaque})</span>`;
                }
            }

            const chance = Math.floor(Math.random() * 100) + 1;
            let aplicouCondicao = false;

            if (chance <= 10 || modoTeste) {
                aplicouCondicao = true;
                console.log(`Condição Elemental (${elAtaque}) ativada com sucesso!`);
                logFinal += `<br><b style="color:#e67e22;">[CONDIÇÃO ${elAtaque} APLICADA!]</b>`;
            } else {
                console.log("condição falhou");
                if (window.enviarMensagemChat) {
                    window.enviarMensagemChat(window.usuarioLogadoNome || "Sistema", "condição falhou", "#888888");
                }
            }

            return { 
                danoExtra: danoBaseFlat, 
                log: logFinal, 
                elemento: elAtaque,
                condicaoElementalAtivou: aplicouCondicao ? elAtaque : null
            };
        }
        return { danoExtra: 0, log: "" };
    },

    verificarDefesaEspecial: function(dadosAlvo) {
        let temHoruz = (dadosAlvo && dadosAlvo.passivaAtiva === "HORUZ");
        
        if (!temHoruz && dadosAlvo && dadosAlvo.dono) {
            const meuNome = (window.usuarioLogadoNome || localStorage.getItem('rubi_username') || "").toLowerCase();
            if (dadosAlvo.dono.toLowerCase() === meuNome) {
                const passivaLoc = this.obterPassivaEquipada();
                if (passivaLoc && passivaLoc.tipo === "HORUZ") {
                    temHoruz = true;
                    this.sincronizarElementoNoBanco(passivaLoc.elemento, "HORUZ");
                }
            }
        }

        if (temHoruz) {
            if (Math.random() <= (window.forcarPassiva ? 1.0 : 0.25)) {
                return { 
                    horuzAtivou: true, 
                    log: `<br><b style="color:#ffffff; text-shadow: 0 0 10px gold;">🛡️ [HORUZ: ATAQUE IGNORADO!]</b>` 
                };
            } else {
                return { 
                    horuzAtivou: false, 
                    logFalha: `<br><span style="color:#888; font-size:11px;"><i>(Horuz falhou na defesa)</i></span>` 
                };
            }
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