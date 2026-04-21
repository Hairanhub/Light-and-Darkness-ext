/* ============================================================
   === [ MOTOR DE COMBATE - V18.15 (FIX LANÇA E TEXTO CON) ] ===
   ============================================================ */

window.combate = {
    tokenAtivoId: null,
    modoDelecao: false,
    ataqueSecundarioRealizado: false, 
    comboMortalRealizado: false, 
    snapshot: { temMaoEsquerda: false },
    calc: { atributoSelecionado: null, quantidades: { d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0 }, extraMod: 0 },

    toggleBoosterAtivo: function() {
        if (!this.tokenAtivoId) {
            this.notificarCombate("SISTEMA", "⚠️ Selecione um personagem (Ctrl+Click) antes de ligar/desligar o Booster!", "#ffaa00");
            return;
        }
        this.toggleBoosterToken(this.tokenAtivoId);
    },

    toggleBoosterToken: async function(tokenId) {
        if (window.iniciativa && window.iniciativa.fila && window.iniciativa.fila.length > 0) {
            this.notificarCombate("SISTEMA", "🚫 O Booster NÃO PODE ser ativado ou desativado durante um combate ativo!", "#ff0000");
            return;
        }

        const ref = window.mapaRef ? window.mapaRef.child('tokens').child(tokenId) : window.database.ref(`mapa/tokens/${tokenId}`);
        const snap = await ref.once('value');
        const dados = snap.val();
        if (!dados) return;

        const estadoAtual = dados.boosterAtivo || false;
        const novoEstado = !estadoAtual;

        let updates = { 
            boosterAtivo: novoEstado,
            boosterTurnos: 0 
        };

        let msgExtra = "";

        if (novoEstado) {
            const bEfeitos = this.calcularEfeitosBooster(dados, null);
            if (bEfeitos) {
                // 🔥 SE A INTELIGÊNCIA FOR DRENADA, CORTA A MANA PELA METADE
                if (bEfeitos.atributoPenalizado === 'int') {
                    let manaAtual = parseFloat(dados.manaAtual !== undefined ? dados.manaAtual : (dados.atributos?.int || 0));
                    let novaMana = Math.floor(manaAtual / 2);
                    
                    updates.manaAtual = novaMana;
                    if (dados.atributos && dados.atributos.mana !== undefined) {
                        updates["atributos/mana"] = novaMana;
                    }
                    
                    const meuUser = (localStorage.getItem('rubi_username') || "").toLowerCase();
                    if (window.EstadoFicha && dados.dono && dados.dono.toLowerCase() === meuUser) {
                        if (typeof window.EstadoFicha.manaAtual !== 'undefined') window.EstadoFicha.manaAtual = novaMana;
                        if (window.EstadoFicha.atributos && typeof window.EstadoFicha.atributos.mana !== 'undefined') window.EstadoFicha.atributos.mana = novaMana;
                    }

                    msgExtra = "<br>🧠 <b>Sobrecarga Mental!</b> A Inteligência foi sacrificada e sua <b>Mana caiu pela metade</b>!";
                } 
                // 🔥 SE A CONSTITUIÇÃO FOR DRENADA, CORTA A VIDA PELA METADE
                else if (bEfeitos.atributoPenalizado === 'con') {
                    let hpAtual = parseFloat(dados.hpAtual !== undefined ? dados.hpAtual : (dados.atributos?.hp || 20));
                    let novoHp = Math.floor(hpAtual / 2);
                    
                    updates.hpAtual = novoHp;
                    if (dados.atributos && dados.atributos.hp !== undefined) {
                        updates["atributos/hp"] = novoHp;
                    }
                    
                    const meuUser = (localStorage.getItem('rubi_username') || "").toLowerCase();
                    if (window.EstadoFicha && dados.dono && dados.dono.toLowerCase() === meuUser) {
                        if (typeof window.EstadoFicha.hpAtual !== 'undefined') window.EstadoFicha.hpAtual = novoHp;
                        if (window.EstadoFicha.atributos && typeof window.EstadoFicha.atributos.hp !== 'undefined') window.EstadoFicha.atributos.hp = novoHp;
                    }

                    msgExtra = "<br>❤️‍🩹 <b>Sobrecarga Física!</b> A Constituição foi sacrificada e sua <b>Vida caiu pela metade</b>!";
                }
            }
        }

        await ref.update(updates);

        const meuNome = window.usuarioLogadoNome || localStorage.getItem('rubi_username');
        if (dados.dono && dados.dono.toLowerCase() === (meuNome || "").toLowerCase()) {
            if (window.EstadoFicha) {
                window.EstadoFicha.boosterLigado = novoEstado;
                if (typeof window.EstadoFicha.renderizarEcra === 'function') window.EstadoFicha.renderizarEcra();
                if (typeof window.EstadoFicha.sincronizarComFirebase === 'function') await window.EstadoFicha.sincronizarComFirebase();
            }
        }

        if (novoEstado) {
            this.notificarCombate(dados.nome.toUpperCase(), `🚀 <b>BOOSTER ATIVADO!</b> O poder transborda pelo corpo...${msgExtra}`, "#ff4d4d");
            const el = document.getElementById(`token-${tokenId}`);
            if(el) el.style.filter = "drop-shadow(0 0 15px #ff4d4d) contrast(1.2)";
        } else {
            this.notificarCombate(dados.nome.toUpperCase(), "🧊 <b>BOOSTER DESATIVADO.</b> A pulsação volta ao normal. <br><small style='color:#bbb;'>(A vida/mana perdida não retorna sozinha)</small>", "#00ffff");
            const el = document.getElementById(`token-${tokenId}`);
            if(el) el.style.filter = "none";
        }
    },

    calcularEfeitosBooster: function(dadosToken, atributoPrincipal = null) {
        if (!dadosToken.boosterAtivo || !dadosToken.atributos) return null;

        atributoPrincipal = atributoPrincipal ? atributoPrincipal.toLowerCase().trim() : null;

        let attrs = {};
        if (typeof dadosToken.atributos === 'string') {
            const parts = dadosToken.atributos.split('/');
            attrs = {
                for: parseInt(parts[0])||0, dex: parseInt(parts[1])||0, int: parseInt(parts[2])||0,
                def: parseInt(parts[3])||0, car: parseInt(parts[4])||0, con: parseInt(parts[5])||0
            };
        } else {
            attrs = {
                for: parseInt(dadosToken.atributos.for)||0, dex: parseInt(dadosToken.atributos.dex)||0,
                int: parseInt(dadosToken.atributos.int)||0, def: parseInt(dadosToken.atributos.def)||0,
                car: parseInt(dadosToken.atributos.car)||0, con: parseInt(dadosToken.atributos.con)||0
            };
        }

        let grupo = [];
        
        if (!atributoPrincipal) {
            let maxFisico = Math.max(attrs.for, attrs.dex, attrs.def);
            let maxMagico = Math.max(attrs.int, attrs.car, attrs.con);
            grupo = maxMagico > maxFisico ? ['int', 'car', 'con'] : ['for', 'dex', 'def'];
            
            let sortedGroup = [...grupo].sort((a, b) => attrs[b] - attrs[a]);
            atributoPrincipal = sortedGroup[0];
        } else {
            let isMagico = ['int', 'con', 'car'].includes(atributoPrincipal);
            grupo = isMagico ? ['int', 'car', 'con'] : ['for', 'dex', 'def'];
        }

        let candidatosBooster = grupo.filter(a => a !== atributoPrincipal);
        if (candidatosBooster.length === 0) candidatosBooster = grupo;

        let atributoBooster = candidatosBooster[0];
        if (candidatosBooster.length > 1 && attrs[candidatosBooster[1]] > attrs[candidatosBooster[0]]) {
            atributoBooster = candidatosBooster[1];
        }

        let bonusDano = attrs[atributoBooster];
        if (bonusDano <= 0) bonusDano = 0;

        return {
            bonusDano: bonusDano,
            atributoPenalizado: atributoBooster,
            valorCortado: Math.floor(attrs[atributoBooster] / 2)
        };
    },

    injetarArmaReal: async function(dados) {
        if (!dados || !dados.dono) return dados;
        let tipo = (dados.tipo || "").toLowerCase();
        
        if (tipo === 'monstro' || tipo === 'npc' || tipo === 'monstros' || dados.isInvocacao) return dados;
        
        try {
            if (window.DatabaseManager) {
                dados.armaEquipada = await window.DatabaseManager.lerUmaVez(`usuarios/${dados.dono}/status_equipado/armaEquipada`) || "";
            } else {
                const snap = await window.database.ref(`usuarios/${dados.dono}/status_equipado/armaEquipada`).once('value');
                dados.armaEquipada = snap.val() || "";
            }
        } catch(e) {}
        return dados;
    },

    espelharAtributosMestre: async function(dadosToken) {
        if (dadosToken && dadosToken.isInvocacao && dadosToken.invocadorId) {
            try {
                const refMestre = window.mapaRef ? window.mapaRef.child('tokens').child(dadosToken.invocadorId) : window.database.ref(`mapa/tokens/${dadosToken.invocadorId}`);
                const snapMestre = await refMestre.once('value');
                if (snapMestre.exists()) {
                    const mestre = snapMestre.val();
                    if (mestre.atributos) {
                        if (typeof mestre.atributos === 'string') {
                            dadosToken.atributos = mestre.atributos;
                        } else if (typeof mestre.atributos === 'object') {
                            dadosToken.atributos = { ...mestre.atributos };
                        }
                    }
                }
            } catch(e) {}
        }
        return dadosToken;
    },

    obterMultiplicadores: function(dadosToken) {
        const temDono = (dadosToken.dono && dadosToken.dono.trim() !== "");
        const isJogador = (dadosToken.tipo === 'jogador' || temDono);
        const multPadrao = { for: 1, dex: 1, int: 1, def: 1, car: 1, con: 1 };
        return isJogador ? (window.multiplicadoresGlobais || multPadrao) : multPadrao;
    },

    atualizarTravaAtributos: function(idAtacante) {
        const role = localStorage.getItem('rubi_role');
        if (role === 'gm') {
            document.querySelectorAll('.btn-attr').forEach(b => {
                b.style.pointerEvents = 'auto'; b.style.opacity = '1'; b.style.filter = 'none';
            });
            return;
        }

        let atributoExigido = null;
        let tipoDanoDaArma = "fisico";

        const slotId = this.ataqueSecundarioRealizado ? "65" : "63";
        const slotElement = document.querySelector(`[data-slot-index="${slotId}"]`);
        
        if (slotElement && slotElement.dataset.itemFullData) {
            try {
                const item = JSON.parse(slotElement.dataset.itemFullData);
                if (item.categoriaDano) tipoDanoDaArma = item.categoriaDano;
                if (item.atributoBase) atributoExigido = item.atributoBase;

                if (window.MotorArmas) {
                    const nomeParaBusca = [item.tipoEspecifico, item.subTipo, item.nome, item.descricao].join(" ");
                    const armaMotor = window.MotorArmas.identificarArma(nomeParaBusca);
                    if (armaMotor && armaMotor.atributoBase) {
                        atributoExigido = armaMotor.atributoBase;
                        tipoDanoDaArma = armaMotor.categoriaDano || "fisico";
                    }
                }
            } catch (e) {}
        }

        this.calc.atributoSelecionado = null; 

        document.querySelectorAll('.btn-attr').forEach(btn => {
            const attr = btn.dataset.attr;
            let permitido = false;

            if (atributoExigido) {
                permitido = (attr === atributoExigido.toLowerCase());
            } else {
                if (tipoDanoDaArma === "fisico") permitido = (attr === "for" || attr === "dex" || attr === "def");
                else if (tipoDanoDaArma === "magico") permitido = (attr === "int" || attr === "con" || attr === "car");
            }

            btn.style.pointerEvents = permitido ? 'auto' : 'none';
            btn.style.opacity = permitido ? '1' : '0.2';
            btn.style.filter = permitido ? 'none' : 'grayscale(1)';
            
            if (permitido && !this.calc.atributoSelecionado) {
                this.selecionarAtributo(attr);
            }
        });
    },

    executarAtaqueArea: async function(idAtacante, idsAlvos) {
        const refAtacante = window.mapaRef ? window.mapaRef.child('tokens').child(idAtacante) : window.database.ref(`mapa/tokens/${idAtacante}`);
        const snapAtacante = await refAtacante.once('value');
        let dadosA = snapAtacante.val();
        if(!dadosA) return;

        dadosA = await this.injetarArmaReal(dadosA);
        dadosA = await this.espelharAtributosMestre(dadosA);

        let nomeArmaArea = "";
        
        if (!dadosA.isInvocacao) {
            const souEuArea = (dadosA.dono || "").toLowerCase() === (localStorage.getItem('rubi_username') || "").toLowerCase();
            
            if (souEuArea && dadosA.tipo !== 'monstro' && dadosA.tipo !== 'npc' && dadosA.tipo !== 'monstros') {
                const indexMao = this.ataqueSecundarioRealizado ? "65" : "63";
                const slotMao = document.querySelector(`[data-slot-index="${indexMao}"]`);
                
                if (slotMao && slotMao.dataset.itemFullData) {
                    try { 
                        const iData = JSON.parse(slotMao.dataset.itemFullData);
                        nomeArmaArea = ((iData.nome || "") + " " + (iData.tipoEspecifico || "")).toLowerCase();
                    } catch(e){}
                } else if (dadosA.dono) {
                    try {
                        const invSnap = await window.database.ref(`usuarios/${dadosA.dono}/inventario/${indexMao}`).once('value');
                        let iF = invSnap.val();
                        if (typeof iF === 'string') { try { iF = JSON.parse(iF); } catch(e){ iF = null; } }
                        if (iF) nomeArmaArea = ((iF.nome || "") + " " + (iF.tipoEspecifico || "")).toLowerCase();
                    } catch(e){}
                }
            } else {
                nomeArmaArea = (dadosA.armaEquipada || "").toLowerCase();
            }

            if (nomeArmaArea.includes("tomo") || nomeArmaArea.includes("pergaminho")) {
                this.notificarCombate("SISTEMA", "🚫 <b>ARMA MÁGICA:</b> Invocadores não realizam ataques básicos em área! Use suas magias.", "#ffaa00");
                this.resetarCalculadora();
                if (window.iniciativa && window.iniciativa.fila.length > 0) window.iniciativa.proximoTurno();
                return;
            }
        }

        if (window.StatusSystem) {
            const statusBloqueio = ["SONO", "TERRA", "SUSPENSO"];
            let statusImpedidor = null;
            for (let tipo of statusBloqueio) {
                if (window.StatusSystem.temStatus(dadosA, tipo)) {
                    statusImpedidor = window.StatusSystem.definitions[tipo]?.nome || tipo;
                    break;
                }
            }
            if (statusImpedidor) {
                this.notificarCombate(dadosA.nome.toUpperCase(), `🛑 <b>AÇÃO BLOQUEADA!</b><br>Impedido por: ${statusImpedidor}.`, "#aaa");
                this.resetarCalculadora();
                if (window.iniciativa && window.iniciativa.fila.length > 0) window.iniciativa.proximoTurno();
                return;
            }
        }

        window.mostrarConsoleDados();
        const info = await this.esperarRolagemManual(); 

        if (window.StatusSystem) {
            const statusDrama = ["CONFUSAO", "CEGUEIRA", "MEDO"];
            let falhou = false;
            for (let tipo of statusDrama) {
                const check = window.StatusSystem.checarProbabilidade(dadosA, tipo);
                if (check.ativou && check.efeito !== "enfraquecido") {
                    this.notificarCombate(dadosA.nome.toUpperCase(), `🎲 <i>Rolou ${info.resultado} no ataque em área... mas</i><br>❌ <b>FALHOU!</b> ${check.msg}`, "#ff4d4d");
                    falhou = true;
                    break;
                }
            }
            if (!falhou && window.StatusSystem.temStatus(dadosA, "GELO")) {
                if (Math.random() < 0.5) {
                    this.notificarCombate(dadosA.nome.toUpperCase(), `🎲 <i>Rolou ${info.resultado}... mas</i><br>❌ <b>FALHOU!</b> O gelo travou seus movimentos! (50% de erro)`, "#00ffff");
                    falhou = true;
                }
            }
            if (falhou) {
                window.esconderConsoleDados();
                this.resetarCalculadora();
                if (window.iniciativa && window.iniciativa.fila.length > 0) setTimeout(() => window.iniciativa.proximoTurno(), 1500);
                return;
            }
        }

        for (const idAlvo of idsAlvos) {
            const refAlvo = window.mapaRef ? window.mapaRef.child('tokens').child(idAlvo) : window.database.ref(`mapa/tokens/${idAlvo}`);
            const snapAlvo = await refAlvo.once('value');
            if(!snapAlvo.val()) continue;
            
            let dadosB = snapAlvo.val();
            dadosB = await this.injetarArmaReal(dadosB);
            dadosB = await this.espelharAtributosMestre(dadosB);

            const res = this.processarCombate(dadosA, dadosB, info, idAlvo);

            if (res.alvoDefesa === 'BLOQUEADO') {
                this.notificarCombate("DANO DE ÁREA", res.status);
                continue;
            }

            if (window.StatusSystem && typeof window.StatusSystem.removerStatus === 'function') {
                if (res.acordouAlvo) await window.StatusSystem.removerStatus(idAlvo, "SONO");
                if (res.quebrouGelo) await window.StatusSystem.removerStatus(idAlvo, "GELO");
            }
            
            if (res.dano > 0) {
                const snapFresco = await refAlvo.once('value');
                if (snapFresco.exists()) {
                    const fichaF = snapFresco.val();

                    let idAlvoReal = idAlvo;
                    let refAlvoReal = refAlvo;
                    let fichaAlvoReal = fichaF;

                    if (fichaF.isInvocacao && fichaF.invocadorId) {
                        idAlvoReal = fichaF.invocadorId;
                        refAlvoReal = window.mapaRef ? window.mapaRef.child('tokens').child(idAlvoReal) : window.database.ref(`mapa/tokens/${idAlvoReal}`);
                        const snapMestre = await refAlvoReal.once('value');
                        if (snapMestre.exists()) {
                            fichaAlvoReal = snapMestre.val();
                            res.status += `<br><b style="color: #ff0044;">🩸 ELO DE SANGUE! O dano atravessou a invocação para ${fichaAlvoReal.nome}!</b>`;
                        }
                    }

                    let danoFinal = res.dano;
                    if (window.StatusSystem && typeof window.StatusSystem.aplicarReducoesDeDano === "function") {
                        let danoAntes = danoFinal;
                        danoFinal = window.StatusSystem.aplicarReducoesDeDano(dadosA, danoFinal);
                        
                        if (danoAntes > danoFinal && window.StatusSystem.temStatus(dadosA, "MALDICAO")) {
                            res.status += `<br><span style="color:#9b59b6;">📉 Dano reduzido pela Maldição (-30%)!<br>Dano causado: <b>${danoFinal}</b></span>`;
                        }
                    }

                    const multAlvoReal = this.obterMultiplicadores(fichaAlvoReal);
                    const conMult = multAlvoReal.con || 1;
                    const danoConvertidoParaBase = danoFinal / conMult;

                    const hpAtual = parseFloat(fichaAlvoReal.hpAtual !== undefined ? fichaAlvoReal.hpAtual : (fichaAlvoReal.atributos?.hp || 20));
                    let novoHp = Math.max(0, hpAtual - danoConvertidoParaBase);
                
                    const hpVisualAntes = Math.round(hpAtual * conMult);
                    const hpVisualDepois = Math.round(novoHp * conMult);
                    res.status += `<br><span style="font-size: 11px; color: #cccccc;">[❤️ ${hpVisualAntes} ➔ ${hpVisualDepois}]</span>`;
                    
                    if (res.empurrarAlvo && hpAtual > 0) {
                        const dx = dadosB.x - dadosA.x;
                        const dy = dadosB.y - dadosA.y;
                        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
                        
                        const pushX = Math.round((dadosB.x + (dx / dist) * 35) / 35) * 35;
                        const pushY = Math.round((dadosB.y + (dy / dist) * 35) / 35) * 35;
                        
                        await refAlvo.update({ x: pushX, y: pushY });
                        res.status += `<br><b style="color: #ff6600;">☄️ IMPACTO COLOSSAL! Arremessado para trás!</b>`;
                    }

                    await refAlvoReal.update({ hpAtual: novoHp, "atributos/hp": novoHp });

                    if (fichaF.isInvocacao && fichaF.invocadorId) {
                        await refAlvo.update({ hpAtual: novoHp, "atributos/hp": novoHp });
                    }

                    const tipoAlvoReal = (fichaAlvoReal.tipo || "").toLowerCase();
                    const isMonstroReal = (tipoAlvoReal === 'monstro' || tipoAlvoReal === 'monstros' || tipoAlvoReal === 'npc');

                    if (novoHp === 0 && isMonstroReal) {
                        if (window.DatabaseManager) await window.DatabaseManager.Tokens.deletar(idAlvoReal);
                        else await refAlvoReal.remove();
                        this.notificarCombate("💀 ABATE", `<b>${fichaAlvoReal.nome}</b> foi destruído!`, "#ff0000");
                    } else if (novoHp === 0 && hpAtual > 0) {
                        const dadoMutilacao = Math.floor(Math.random() * 20) + 1;
                        if (dadoMutilacao <= 5) {
                            if (fichaAlvoReal.membroPerdido) {
                                if (window.DatabaseManager) await window.DatabaseManager.Tokens.deletar(idAlvoReal);
                                else await refAlvoReal.remove();
                                this.notificarCombate("🩸 MUTILADO FATAL!", `<b>${fichaAlvoReal.nome}</b> perdeu outro membro e não suportou os ferimentos. Morte Instantânea!`, "#000000");
                            } else {
                                const membros = ['Braço Direito', 'Braço Esquerdo', 'Perna Direita', 'Perna Esquerda'];
                                const membroSorteado = membros[Math.floor(Math.random() * membros.length)];
                                try {
                                    const snapItens = window.DatabaseManager ? await window.DatabaseManager.lerUmaVez('itens') : await window.database.ref('itens').once('value').then(s => s.val());
                                    if (snapItens) {
                                        const chaveItem = Object.keys(snapItens).find(key => snapItens[key].nome === membroSorteado);
                                        if (chaveItem) {
                                            let artefatoObj = { ...snapItens[chaveItem] }; 
                                            artefatoObj.nome = `${membroSorteado} de ${fichaAlvoReal.nome}`;
                                            artefatoObj.x = fichaAlvoReal.x; artefatoObj.y = fichaAlvoReal.y;
                                            artefatoObj.tipo = "itens"; artefatoObj.isDrop = true; 
                                            window.spawnTokenGlobal(artefatoObj); 
                                        }
                                    }
                                } catch (e) {}
                                await refAlvoReal.update({ hpAtual: 1, "atributos/hp": 1, membroPerdido: membroSorteado, morte: null });
                                this.notificarCombate("🪓 AMPUTADO!", `Um pedaço de <b>${fichaAlvoReal.nome}</b> voou longe! Perdeu o(a) <b>${membroSorteado}</b>!`, "#cc0000");
                            }
                        } else {
                            await refAlvoReal.update({ hpAtual: 0, "atributos/hp": 0, morte: { sucessos: 0, falhas: 0 } });
                            this.notificarCombate("🚑 INCONSCIENTE!", `<b>${fichaAlvoReal.nome}</b> caiu! Os Testes de Morte vão começar.`, "#e74c3c");
                        }
                    }
                }
            }
            
            const tipoDanoHtml = res.ehMagico 
                ? `<span style="color: #00f2ff; font-weight: bold; font-size: 11px;">[ DANO MÁGICO ]</span>` 
                : `<span style="color: #ffaa00; font-weight: bold; font-size: 11px;">[ DANO FÍSICO ]</span>`;

            this.notificarCombate("DANO DE ÁREA", `${dadosB.nome} atingido! ${tipoDanoHtml}<br>${res.status}`);
        }
        window.esconderConsoleDados();
        this.resetarCalculadora();
    },

    executarAtaque: async function(idAtacante, idAlvo, elAlvo) {
        const elAtacante = document.getElementById(`token-${idAtacante}`);
        if (!elAtacante) return;

        const refAtacante = window.mapaRef ? window.mapaRef.child('tokens').child(idAtacante) : window.database.ref(`mapa/tokens/${idAtacante}`);
        const refAlvo = window.mapaRef ? window.mapaRef.child('tokens').child(idAlvo) : window.database.ref(`mapa/tokens/${idAlvo}`);

        const snapAtacante = await refAtacante.once('value');
        const snapAlvo = await refAlvo.once('value');
        
        let valA = snapAtacante.val();
        let valB = snapAlvo.val();

        if (!valA || !valB) return;

        let dadosA = await this.injetarArmaReal(valA);
        let dadosB = await this.injetarArmaReal(valB);

        dadosA = await this.espelharAtributosMestre(dadosA);
        dadosB = await this.espelharAtributosMestre(dadosB);

        const hpAtacante = parseFloat(dadosA.hpAtual !== undefined ? dadosA.hpAtual : (dadosA.atributos?.hp || 20));
        if (hpAtacante <= 0) {
            this.notificarCombate("SISTEMA", "💀 Você está inconsciente! Clique em si mesmo na sua vez para o Teste de Morte.", "#ff0000");
            this.finalizarTurnoForcado(idAtacante, elAtacante);
            return;
        }

        let nomeArmaAtual = "";
        
        if (!dadosA.isInvocacao) {
            const souEuA = (dadosA.dono || "").toLowerCase() === (localStorage.getItem('rubi_username') || "").toLowerCase();
            
            if (souEuA && dadosA.tipo !== 'monstro' && dadosA.tipo !== 'npc' && dadosA.tipo !== 'monstros') {
                const indexMao = this.ataqueSecundarioRealizado ? "65" : "63";
                const slotMao = document.querySelector(`[data-slot-index="${indexMao}"]`);
                
                if (slotMao && slotMao.dataset.itemFullData) {
                    try { 
                        const iData = JSON.parse(slotMao.dataset.itemFullData);
                        nomeArmaAtual = ((iData.nome || "") + " " + (iData.tipoEspecifico || "")).toLowerCase();
                    } catch(e){}
                } else if (dadosA.dono) {
                    try {
                        const invSnap = await window.database.ref(`usuarios/${dadosA.dono}/inventario/${indexMao}`).once('value');
                        let iF = invSnap.val();
                        if (typeof iF === 'string') { try { iF = JSON.parse(iF); } catch(e){ iF = null; } }
                        if (iF) nomeArmaAtual = ((iF.nome || "") + " " + (iF.tipoEspecifico || "")).toLowerCase();
                    } catch(e){}
                }
            } else {
                nomeArmaAtual = (dadosA.armaEquipada || "").toLowerCase();
            }

            if (nomeArmaAtual.includes("tomo") || nomeArmaAtual.includes("pergaminho")) {
                this.notificarCombate("SISTEMA", "🚫 <b>ARMA MÁGICA:</b> Invocadores não realizam ataques básicos! Use suas magias ou comande sua Invocação.", "#ffaa00");
                this.finalizarTurnoForcado(idAtacante, elAtacante);
                if (elAlvo) elAlvo.classList.remove('token-alvo');
                return;
            }
        }

        this.snapshot.temMaoEsquerda = false;
        const isMonstrAtacanteDW = (dadosA.tipo === 'monstro' || dadosA.tipo === 'npc' || dadosA.tipo === 'monstros');
        
        if (!dadosA.isInvocacao && !isMonstrAtacanteDW) {
            if (window.MotorArmas && typeof window.MotorArmas.verificarMaoEsquerda === 'function') {
                this.snapshot.temMaoEsquerda = window.MotorArmas.verificarMaoEsquerda();
            } else {
                const slotEsq = document.querySelector('[data-slot-index="65"]');
                if (slotEsq && slotEsq.dataset.itemFullData) {
                    try {
                        const itemE = JSON.parse(slotEsq.dataset.itemFullData);
                        const nomeArmaEsq = (itemE.nome || "").toLowerCase();
                        if (!nomeArmaEsq.includes("escudo")) {
                            this.snapshot.temMaoEsquerda = true;
                        }
                    } catch(e) {
                        this.snapshot.temMaoEsquerda = true;
                    }
                }
            }
        }

        if (dadosA.membroPerdido && dadosA.membroPerdido.includes('Braço')) {
            this.snapshot.temMaoEsquerda = false; 
        }

        let foraDeAlcance = false;
        let msgAlcance = "";
        if (window.MotorArmas && typeof window.MotorArmas.validarAlcance === 'function') {
            const checagemAlcance = window.MotorArmas.validarAlcance(dadosA, dadosB);
            if (!checagemAlcance.pode) {
                foraDeAlcance = true;
                msgAlcance = checagemAlcance.msg;
                this.notificarCombate("ALCANCE", `⚠️ O golpe vai falhar: ${msgAlcance}`, "#ff9900");
            }
        }

        if (window.StatusSystem) {
            const statusBloqueio = ["SONO", "TERRA", "SUSPENSO"];
            let statusImpedidor = null;
            for (let tipo of statusBloqueio) {
                if (window.StatusSystem.temStatus(dadosA, tipo)) {
                    statusImpedidor = window.StatusSystem.definitions[tipo]?.nome || tipo;
                    break;
                }
            }
            if (statusImpedidor) {
                this.notificarCombate(dadosA.nome.toUpperCase(), `🛑 <b>AÇÃO BLOQUEADA!</b><br>Incapaz de agir sob efeito de ${statusImpedidor}.`, "#aaa");
                this.finalizarTurnoForcado(idAtacante, elAtacante);
                return;
            }
        }

        window.mostrarConsoleDados();
        const info = await this.esperarRolagemManual(); 
        
        if (window.StatusSystem) {
            const statusDrama = ["CONFUSAO", "CEGUEIRA", "MEDO"];
            let falhou = false;
            for (let tipo of statusDrama) {
                const check = window.StatusSystem.checarProbabilidade(dadosA, tipo);
                if (check.ativou && check.efeito !== "enfraquecido") {
                    this.notificarCombate(dadosA.nome.toUpperCase(), `🎲 <i>Rolou ${info.resultado} e avançou... mas</i><br>❌ <b>FALHOU!</b> ${check.msg}`, "#ff4d4d");
                    falhou = true;
                    break;
                }
            }
            if (!falhou && window.StatusSystem.temStatus(dadosA, "GELO")) {
                if (Math.random() < 0.5) {
                    this.notificarCombate(dadosA.nome.toUpperCase(), `🎲 <i>Rolou ${info.resultado}... mas</i><br>❌ <b>FALHOU!</b> O gelo travou seus movimentos! (50% de erro)`, "#00ffff");
                    falhou = true;
                }
            }
            if (falhou) {
                this.finalizarTurnoForcado(idAtacante, elAtacante);
                if (elAlvo) elAlvo.classList.remove('token-alvo');
                return;
            }
        }

        if (elAlvo) elAlvo.classList.add('token-alvo'); 

        const res = this.processarCombate(dadosA, dadosB, info, idAlvo, foraDeAlcance, msgAlcance);

        if (res.alvoDefesa === 'BLOQUEADO') {
            this.notificarCombate(dadosA.nome.toUpperCase(), res.status);
            this.finalizarTurnoForcado(idAtacante, elAtacante);
            if (elAlvo) elAlvo.classList.remove('token-alvo');
            return;
        }

        if (window.StatusSystem && typeof window.StatusSystem.removerStatus === 'function') {
            if (res.acordouAlvo) await window.StatusSystem.removerStatus(idAlvo, "SONO");
            if (res.quebrouGelo) await window.StatusSystem.removerStatus(idAlvo, "GELO");
        }

        if (res.dano > 0) {
            const snapFresco = await refAlvo.once('value');
            if (snapFresco.exists()) {
                const fichaF = snapFresco.val();

                let idAlvoReal = idAlvo;
                let refAlvoReal = refAlvo;
                let fichaAlvoReal = fichaF;

                if (fichaF.isInvocacao && fichaF.invocadorId) {
                    idAlvoReal = fichaF.invocadorId;
                    refAlvoReal = window.mapaRef ? window.mapaRef.child('tokens').child(idAlvoReal) : window.database.ref(`mapa/tokens/${idAlvoReal}`);
                    const snapMestre = await refAlvoReal.once('value');
                    if (snapMestre.exists()) {
                        fichaAlvoReal = snapMestre.val();
                        res.status += `<br><b style="color: #ff0044;">🩸 ELO DE SANGUE! O dano refletiu direto para ${fichaAlvoReal.nome}!</b>`;
                    }
                }

                let danoFinal = res.dano;
                if (window.StatusSystem && typeof window.StatusSystem.aplicarReducoesDeDano === "function") {
                    let danoAntes = danoFinal;
                    danoFinal = window.StatusSystem.aplicarReducoesDeDano(dadosA, danoFinal);
                    
                    if (danoAntes > danoFinal && window.StatusSystem.temStatus(dadosA, "MALDICAO")) {
                        res.status += `<br><span style="color:#9b59b6;">📉 Dano reduzido pela Maldição (-30%)!<br>Dano causado: <b>${danoFinal}</b></span>`;
                    }
                }

                const multAlvoReal = this.obterMultiplicadores(fichaAlvoReal);
                const conMult = multAlvoReal.con || 1;
                const danoConvertidoParaBase = danoFinal / conMult;

                const hpAtual = parseFloat(fichaAlvoReal.hpAtual !== undefined ? fichaAlvoReal.hpAtual : (fichaAlvoReal.atributos?.hp || 20));
                let novoHp = Math.max(0, hpAtual - danoConvertidoParaBase);
                
                const hpVisualAntes = Math.round(hpAtual * conMult);
                const hpVisualDepois = Math.round(novoHp * conMult);
                res.status += `<br><span style="font-size: 11px; color: #cccccc;">[❤️ ${hpVisualAntes} ➔ ${hpVisualDepois}]</span>`;
                
                if (res.empurrarAlvo && hpAtual > 0) {
                    const dx = dadosB.x - dadosA.x;
                    const dy = dadosB.y - dadosA.y;
                    const dist = Math.sqrt(dx*dx + dy*dy) || 1;
                    
                    const pushX = Math.round((dadosB.x + (dx / dist) * 35) / 35) * 35;
                    const pushY = Math.round((dadosB.y + (dy / dist) * 35) / 35) * 35;
                    
                    await refAlvo.update({ x: pushX, y: pushY });
                    res.status += `<br><b style="color: #ff6600;">☄️ IMPACTO COLOSSAL! O alvo foi arremessado para trás!</b>`;
                }

                await refAlvoReal.update({ hpAtual: novoHp, "atributos/hp": novoHp });

                if (fichaF.isInvocacao && fichaF.invocadorId) {
                    await refAlvo.update({ hpAtual: novoHp, "atributos/hp": novoHp });
                }

                const tipoAlvoReal = (fichaAlvoReal.tipo || "").toLowerCase();
                const isMonstroReal = (tipoAlvoReal === 'monstro' || tipoAlvoReal === 'monstros' || tipoAlvoReal === 'npc');

                if (novoHp === 0 && isMonstroReal) {
                    if (window.DatabaseManager) await window.DatabaseManager.Tokens.deletar(idAlvoReal);
                    else await refAlvoReal.remove(); 
                    this.notificarCombate("💀 ABATE", `<b>${fichaAlvoReal.nome}</b> foi destruído!`, "#ff0000");
                } else if (novoHp === 0 && hpAtual > 0) {
                    const dadoMutilacao = Math.floor(Math.random() * 20) + 1;
                    if (dadoMutilacao <= 5) {
                        if (fichaAlvoReal.membroPerdido) {
                            if (window.DatabaseManager) await window.DatabaseManager.Tokens.deletar(idAlvoReal);
                            else await refAlvoReal.remove();
                            this.notificarCombate("🩸 MUTILADO FATAL!", `<b>${fichaAlvoReal.nome}</b> perdeu outro membro e não suportou os ferimentos. Morte Instantânea!`, "#000000");
                        } else {
                            const membros = ['Braço Direito', 'Braço Esquerdo', 'Perna Direita', 'Perna Esquerda'];
                            const membroSorteado = membros[Math.floor(Math.random() * membros.length)];
                            try {
                                const snapItens = window.DatabaseManager ? await window.DatabaseManager.lerUmaVez('itens') : await window.database.ref('itens').once('value').then(s => s.val());
                                if (snapItens) {
                                    const chaveItem = Object.keys(snapItens).find(key => snapItens[key].nome === membroSorteado);
                                    if (chaveItem) {
                                        let artefatoObj = { ...snapItens[chaveItem] }; 
                                        artefatoObj.nome = `${membroSorteado} de ${fichaAlvoReal.nome}`;
                                        artefatoObj.x = fichaAlvoReal.x; artefatoObj.y = fichaAlvoReal.y;
                                        artefatoObj.tipo = "itens"; artefatoObj.isDrop = true; 
                                        window.spawnTokenGlobal(artefatoObj); 
                                    }
                                }
                            } catch (e) {}
                            await refAlvoReal.update({ hpAtual: 1, "atributos/hp": 1, membroPerdido: membroSorteado, morte: null });
                            this.notificarCombate("🪓 AMPUTADO!", `Um pedaço de <b>${fichaAlvoReal.nome}</b> voou longe! Perdeu o(a) <b>${membroSorteado}</b>!`, "#cc0000");
                        }
                    } else {
                        await refAlvoReal.update({ hpAtual: 0, "atributos/hp": 0, morte: { sucessos: 0, falhas: 0 } });
                        this.notificarCombate("🚑 INCONSCIENTE!", `<b>${fichaAlvoReal.nome}</b> caiu! Os Testes de Morte vão começar.`, "#e74c3c");
                    }
                }
            }
        }
        
        if (res.curaAtacanteBase > 0) {
            const snapAtacFresco = await refAtacante.once('value');
            const fichaFresca = snapAtacFresco.val();
            if (fichaFresca) {
                const hpMax = parseFloat(fichaFresca.hpMax || fichaFresca.atributos?.con || 20);
                const hpAgora = parseFloat(fichaFresca.hpAtual !== undefined ? fichaFresca.hpAtual : hpMax);
                let novoHpCura = hpAgora + res.curaAtacanteBase;
                if (novoHpCura > hpMax) novoHpCura = hpMax;

                if (novoHpCura > hpAgora) {
                    await refAtacante.update({ hpAtual: novoHpCura, "atributos/hp": novoHpCura });
                    const mults = this.obterMultiplicadores(fichaFresca);
                    const conMultA = mults.con || 1;
                    const curaVisualText = Math.round((novoHpCura - hpAgora) * conMultA);
                    this.notificarCombate("MÁSCARA DE AATROX", `🩸 <b>${fichaFresca.nome}</b> drenou +${curaVisualText} HP!`, "#2ecc71");
                }
            }
        }

        if (elAlvo) {
            elAlvo.classList.add('tomando-dano');
            setTimeout(() => elAlvo.classList.remove('tomando-dano'), 500);
        }

        const tipoStatusRaw = document.getElementById('reg-magia-status-tipo')?.value;
        if (tipoStatusRaw && window.StatusSystem) {
            await window.StatusSystem.aplicarStatus(idAlvo, tipoStatusRaw, res.dano);
        }

        if (window.StatusSystem) await window.StatusSystem.aplicarDanoReacao(idAtacante);

        const iconAcao = res.ehMagico ? "✨ MAGIA" : "⚔️ ATAQUE";
        const labelAtaque = this.ataqueSecundarioRealizado ? "(MÃO ESQUERDA)" : "(MÃO DIREITA)";
        
        const tipoDanoHtml = res.ehMagico 
            ? `<span style="color: #00f2ff; font-weight: bold; font-size: 11px;">[ DANO MÁGICO ]</span>` 
            : `<span style="color: #ffaa00; font-weight: bold; font-size: 11px;">[ DANO FÍSICO ]</span>`;

        let msg = `${iconAcao} ${labelAtaque}: <b>${dadosB.nome}</b> ${tipoDanoHtml}<br>` +
                  `🎲 Total: <b>${res.total}</b> vs ${res.alvoDefesa}<br>` +
                  `<small style="color: #bbb">${res.detalhe}</small><br>` +
                  `${res.status}`;
                  
        if (dadosA.membroPerdido && dadosA.membroPerdido.includes('Braço')) {
            msg += `<br><small style="color: #ff9900;"><i>(Ataque Extra anulado pela falta do braço)</i></small>`;
        }

        this.notificarCombate(dadosA.nome.toUpperCase(), msg);

        if (dadosA.furtivo) await refAtacante.update({ furtivo: null });

        setTimeout(() => {
            if (elAlvo) elAlvo.classList.remove('token-alvo');
            
            window.esconderConsoleDados();
            this.resetarCalculadora();

            if (res.isoldeAtivou) {
                this.notificarCombate("COLAR DE ISOLDE", "⚡ <b>ATAQUE EXTRA!</b> Jogue novamente com a mesma arma!", "#00d4ff");
                return; 
            }

            if (res.ataqueBonusArma && !this.comboMortalRealizado) {
                this.comboMortalRealizado = true; 
                this.atualizarTravaAtributos(idAtacante);
                this.notificarCombate("CORTES RÁPIDOS", "⚔️ <b>COMBO MORTAL!</b> A arma permite mais um golpe com a MESMA MÃO!", "#ff00cc");
                return;
            }

            if (this.snapshot.temMaoEsquerda && !this.ataqueSecundarioRealizado) {
                this.ataqueSecundarioRealizado = true; 
                this.comboMortalRealizado = false;
                this.atualizarTravaAtributos(idAtacante);
                this.notificarCombate("DUAL WIELD", "⚔️ <b>ATAQUE SECUNDÁRIO!</b> Jogue novamente para a arma da MÃO ESQUERDA!", "#ff00cc");
                return;
            }

            if (elAtacante) elAtacante.classList.remove('token-preparo');
            this.tokenAtivoId = null;
            this.ataqueSecundarioRealizado = false; 
            this.comboMortalRealizado = false; 
            this.snapshot.temMaoEsquerda = false; 
            
            document.querySelectorAll('.btn-attr').forEach(b => {
                b.style.pointerEvents = 'auto'; b.style.opacity = '1'; b.style.filter = 'none';
            });

            if (window.iniciativa && window.iniciativa.fila.length > 0) window.iniciativa.proximoTurno();
        }, 1200); 
    },

    tratarCliqueCombate: async function(e, tokenId) {
        if (window.iniciativa && window.iniciativa.modoSelecao) {
            window.iniciativa.adicionarOuRemover(tokenId);
            return;
        }

        if (window.spellEngine && window.spellEngine.magiaAtiva) return;

        if (!e.ctrlKey) return; 
        e.preventDefault(); e.stopPropagation();

        const el = document.getElementById(`token-${tokenId}`);
        const souGM = localStorage.getItem('rubi_role') === 'gm';
        const meuUsuario = (localStorage.getItem('rubi_username') || "").trim().toLowerCase();
        
        if (!this.tokenAtivoId) {
            this.ataqueSecundarioRealizado = false; 
            this.comboMortalRealizado = false;
            this.snapshot.temMaoEsquerda = false;

            let donoToken = el.dataset.dono;
            if (!donoToken) {
                const ref = window.mapaRef ? window.mapaRef.child('tokens').child(tokenId) : window.database.ref(`mapa/tokens/${tokenId}`);
                const snap = await ref.once('value');
                donoToken = snap.val()?.dono || "";
                el.dataset.dono = donoToken; 
            }
            donoToken = (donoToken || "").trim().toLowerCase();

            if (window.iniciativa && window.iniciativa.fila && window.iniciativa.fila.length > 0) {
                const turnoData = window.iniciativa.fila[window.iniciativa.turnoAtual];
                if (turnoData) {
                    const idDaVez = turnoData.id;
                    if (tokenId !== idDaVez && !souGM) {
                        this.notificarCombate("SISTEMA", "⛔ Não é a vez deste personagem!", "#ff0000");
                        return;
                    }
                }
            }

            const ehMeu = (donoToken === meuUsuario);
            if (!souGM && !ehMeu) {
                this.notificarCombate("SISTEMA", `🚫 Este token pertence a: ${donoToken || 'Ninguém'}`, "#ff0000");
                return;
            }

            const refT = window.mapaRef ? window.mapaRef.child('tokens').child(tokenId) : window.database.ref(`mapa/tokens/${tokenId}`);
            const snapT = await refT.once('value');
            let dadosTk = snapT.val();
            
            if (!dadosTk) return;
            dadosTk = await this.espelharAtributosMestre(dadosTk);

            if (dadosTk && dadosTk.boosterAtivo) {
                const bEfeitos = this.calcularEfeitosBooster(dadosTk, null);
                if (bEfeitos && bEfeitos.atributoPenalizado === 'for') {
                    const idTurno = (window.iniciativa && window.iniciativa.fila && window.iniciativa.fila.length > 0)
                        ? `combate_${window.iniciativa.rodadaAtual}_${window.iniciativa.turnoAtual}`
                        : `livre_${Math.floor(Date.now() / 10000)}`;

                    if (dadosTk.ultimoTurnoDanoBooster !== idTurno) {
                        let turnosAtivos = (dadosTk.boosterTurnos || 0) + 1;
                        let danoSangria = turnosAtivos * 2;

                        let mults = this.obterMultiplicadores(dadosTk);
                        let hpReal = parseFloat(dadosTk.hpAtual !== undefined ? dadosTk.hpAtual : (dadosTk.atributos?.hp || 20));
                        let novoHp = Math.max(0, hpReal - (danoSangria / (mults.con || 1)));

                        await refT.update({
                            hpAtual: novoHp,
                            boosterTurnos: turnosAtivos,
                            ultimoTurnoDanoBooster: idTurno
                        });

                        this.notificarCombate("SANGUE FERVENDO (BOOSTER)", `🩸 A Força cobrou seu preço! <b>${dadosTk.nome}</b> perdeu ${danoSangria} HP.`, "#cc0000");
                    }
                }
            }

            this.tokenAtivoId = tokenId;
            el.classList.add('token-preparo');
            this.atualizarTravaAtributos(tokenId);

        } else {
            if (this.tokenAtivoId === tokenId) this.executarAutoAcao(tokenId, el);
            else this.executarAtaque(this.tokenAtivoId, tokenId, el);
        }
    },

    verificarStatusCombate: function(dadosAtacante, dadosAlvo) {
        const checkAgua = window.StatusSystem.checarProbabilidade(dadosAlvo, "AGUA");
        const checkNatu = window.StatusSystem.checarProbabilidade(dadosAlvo, "NATUREZA");
        const checkAr = window.StatusSystem.checarProbabilidade(dadosAtacante, "AR");
        if (checkAgua.ativou || checkNatu.ativou || checkAr.ativou) {
            const msg = checkAr.ativou ? "🌪️ O AR desequilibrou o golpe!" : (checkAgua.ativou ? checkAgua.msg : checkNatu.msg);
            if (checkAr.ativou && window.spellEngine) {
                const idReal = dadosAtacante.id || this.tokenAtivoId;
                if (idReal) setTimeout(() => {
                    this.notificarCombate("VENTO", "🌪️ REPELIDO!", "#55aaff");
                    window.spellEngine.processarDanoAlvo(idReal, 0, 0, 0, "REPELIR", { statusTipo: "SUSPENSO", origemForcada: {x:dadosAlvo.x, y:dadosAlvo.y}});
                }, 100);
            }
            return { dano: 0, total: 0, alvoDefesa: 'STATUS', status: `<b style="color:#aa00ff;">✨ ${msg}</b>`, detalhe: 'Falha por Status' };
        }
        return null;
    },

    finalizarTurnoForcado: function(idAtacante, elAtacante) {
        if (elAtacante) elAtacante.classList.remove('token-preparo');
        this.tokenAtivoId = null;
        this.resetarCalculadora();
        this.ataqueSecundarioRealizado = false; 
        this.comboMortalRealizado = false;
        window.esconderConsoleDados();
        document.querySelectorAll('.btn-attr').forEach(b => {
            b.style.pointerEvents = 'auto'; b.style.opacity = '1'; b.style.filter = 'none';
        });
        if (window.iniciativa && window.iniciativa.fila.length > 0) setTimeout(() => window.iniciativa.proximoTurno(), 1500);
    },

    selecionarAtributo: function(attr) {
        document.querySelectorAll('.btn-attr').forEach(b => b.classList.remove('selected'));
        const btn = document.querySelector(`[data-attr="${attr}"]`);
        if (btn) btn.classList.add('selected');
        this.calc.atributoSelecionado = attr;
    },
    alterarQuantidade: function(tipo, valor) {
        this.calc.quantidades[tipo] = Math.max(0, (this.calc.quantidades[tipo] || 0) + valor);
        const el = document.getElementById(`count-${tipo}`);
        if (el) { el.textContent = this.calc.quantidades[tipo]; el.classList.toggle('active', this.calc.quantidades[tipo] > 0); }
    },
    resetarCalculadora: function() {
        this.calc.atributoSelecionado = null;
        this.calc.quantidades = { d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0 };
        document.querySelectorAll('.btn-attr').forEach(b => b.classList.remove('selected'));
        document.querySelectorAll('.dice-counter').forEach(c => { c.textContent = "0"; c.classList.remove('active'); });
        const extraInput = document.getElementById('extra-mod'); if (extraInput) extraInput.value = "";
    },
    esperarRolagemManual: function() {
        return new Promise((resolve) => {
            const aoTerminar = (e) => {
                window.removeEventListener('diceFinished', aoTerminar);
                const res = e.detail.result !== undefined ? e.detail.result : e.detail.resultado;
                const sid = e.detail.sides !== undefined ? e.detail.sides : (e.detail.lados || 20);
                resolve({ resultado: res, lados: sid });
            };
            window.addEventListener('diceFinished', aoTerminar);
        });
    },

    notificarCombate: function(titulo, msg, cor = "#ffcc00") {
        if (window.DatabaseManager && window.DatabaseManager.Chat) window.DatabaseManager.Chat.enviar(titulo, msg, cor);
        else if (window.enviarMensagemChat) window.enviarMensagemChat(titulo, msg, cor);
    },

    executarAutoAcao: async function(id, el) {
        el.classList.remove('token-preparo');
        el.classList.add('token-auto-acao');
        
        const refAtacante = window.mapaRef ? window.mapaRef.child('tokens').child(id) : window.database.ref(`mapa/tokens/${id}`);
        const snap = await refAtacante.once('value');
        if (!snap.val()) return;
        
        let dadosA = await this.injetarArmaReal(snap.val()); 
        dadosA = await this.espelharAtributosMestre(dadosA);

        const hpAt = parseFloat(dadosA.hpAtual !== undefined ? dadosA.hpAtual : (dadosA.atributos?.hp || 20));
        const tipoAtacante = (dadosA.tipo || "").toLowerCase();
        const isMonstroAuto = (tipoAtacante === 'monstro' || tipoAtacante === 'monstros' || tipoAtacante === 'npc');

        if (hpAt <= 0 && isMonstroAuto) {
            this.notificarCombate("💀 CORPO INERTE", `<b>${dadosA.nome}</b> é apenas um cadáver no chão.`, "#777777");
            setTimeout(() => {
                el.classList.remove('token-auto-acao');
                this.tokenAtivoId = null;
                this.resetarCalculadora();
                this.ataqueSecundarioRealizado = false;
                this.comboMortalRealizado = false;
                document.querySelectorAll('.btn-attr').forEach(b => { b.style.pointerEvents = 'auto'; b.style.opacity = '1'; b.style.filter = 'none'; });
                if (window.iniciativa && window.iniciativa.fila.length > 0) window.iniciativa.proximoTurno();
            }, 1000);
            return;
        }

        if (hpAt > 0 && window.StatusSystem) {
            const statusBloqueio = ["SONO", "TERRA", "SUSPENSO"];
            let statusImpedidor = null;
            for (let tipo of statusBloqueio) {
                if (window.StatusSystem.temStatus(dadosA, tipo)) {
                    statusImpedidor = window.StatusSystem.definitions[tipo]?.nome || tipo;
                    break;
                }
            }
            if (statusImpedidor) {
                this.notificarCombate(dadosA.nome.toUpperCase(), `🛑 <b>AÇÃO BLOQUEADA!</b><br>Impedido por: ${statusImpedidor}.`, "#aaa");
                setTimeout(() => {
                    el.classList.remove('token-auto-acao');
                    this.tokenAtivoId = null;
                    this.resetarCalculadora();
                    if (window.iniciativa && window.iniciativa.fila.length > 0) window.iniciativa.proximoTurno();
                }, 100);
                return;
            }
        }

        window.mostrarConsoleDados();
        const info = await this.esperarRolagemManual(); 
        
        if (hpAt <= 0) {
            const dado = info.resultado;
            const lados = info.lados;
            let mortes = dadosA.morte || { sucessos: 0, falhas: 0 };
            let statusMsg = "";
            let cor = "";
            
            const mults = this.obterMultiplicadores(dadosA);
            const conMult = mults.con || 1;
            const hpVisualRenascimento = 1 * conMult;
            
            if (dado === 1) {
                mortes.falhas = 3; statusMsg = "💀 <b>FALHA CRÍTICA!</b> O coração parou definitivamente."; cor = "#000000";
            } else if (dado === lados) {
                mortes.sucessos = 3; statusMsg = `🌟 <b>SUCESSO CRÍTICO!</b> Renasceu das cinzas com ${hpVisualRenascimento} HP!`; cor = "#ffff00";
            } else if (dado >= 10) {
                mortes.sucessos += 1; statusMsg = `✅ <b>Resistiu à Morte!</b> (${mortes.sucessos}/3 Sucessos)`; cor = "#2ecc71";
            } else {
                mortes.falhas += 1; statusMsg = `❌ <b>A luz está apagando...</b> (${mortes.falhas}/3 Falhas)`; cor = "#e74c3c";
            }
            
            this.notificarCombate(`TESTE DE MORTE: ${dadosA.nome.toUpperCase()}`, `Rolou <b>${dado}</b> no dado.<br>${statusMsg}`, cor);
            
            if (mortes.falhas >= 3) {
                if (window.DatabaseManager) await window.DatabaseManager.Tokens.deletar(id);
                else await refAtacante.remove();
                this.notificarCombate("🪦 FIM DA LINHA", `<b>${dadosA.nome}</b> sucumbiu aos ferimentos e morreu permanentemente.`, "#000000");
            } else if (mortes.sucessos >= 3) {
                await refAtacante.update({ hpAtual: 1, "atributos/hp": 1, morte: null });
                if (dado !== lados) {
                    setTimeout(() => this.notificarCombate("🚑 ESTÁVEL!", `<b>${dadosA.nome}</b> abriu os olhos com ${hpVisualRenascimento} HP.`, "#2ecc71"), 500);
                }
            } else {
                await refAtacante.update({ morte: mortes });
            }
            
            setTimeout(() => {
                el.classList.remove('token-auto-acao'); window.esconderConsoleDados(); this.tokenAtivoId = null; this.resetarCalculadora(); this.ataqueSecundarioRealizado = false; this.comboMortalRealizado = false;
                document.querySelectorAll('.btn-attr').forEach(b => { b.style.pointerEvents = 'auto'; b.style.opacity = '1'; b.style.filter = 'none'; });
                if (window.iniciativa && window.iniciativa.fila.length > 0) window.iniciativa.proximoTurno();
            }, 1500);
            return; 
        }

        if (hpAt > 0 && window.StatusSystem) {
            const statusDrama = ["CONFUSAO", "CEGUEIRA", "MEDO"];
            let falhou = false;
            for (let tipo of statusDrama) {
                const check = window.StatusSystem.checarProbabilidade(dadosA, tipo);
                if (check.ativou && check.efeito !== "enfraquecido") {
                    this.notificarCombate(dadosA.nome.toUpperCase(), `🎲 <i>Rolou ${info.resultado}... mas</i><br>❌ <b>FALHOU!</b> ${check.msg}`, "#ff4d4d");
                    falhou = true;
                    break;
                }
            }
            if (!falhou && window.StatusSystem.temStatus(dadosA, "GELO")) {
                if (Math.random() < 0.5) {
                    this.notificarCombate(dadosA.nome.toUpperCase(), `🎲 <i>Rolou ${info.resultado}... mas</i><br>❌ <b>FALHOU!</b> O gelo travou seus movimentos! (50% de erro)`, "#00ffff");
                    falhou = true;
                }
            }
            if (falhou) {
                setTimeout(() => {
                    el.classList.remove('token-auto-acao'); window.esconderConsoleDados(); this.tokenAtivoId = null; this.resetarCalculadora();
                    if (window.iniciativa && window.iniciativa.fila.length > 0) window.iniciativa.proximoTurno();
                }, 1500);
                return;
            }
        }

        const res = this.processarCombate(dadosA, dadosA, info, id);
        
        if (res.alvoDefesa === 'BLOQUEADO') {
            this.notificarCombate(dadosA.nome.toUpperCase(), res.status);
        } else {
            this.notificarCombate(dadosA.nome.toUpperCase(), `rolou <b>${res.total}</b>!<br><small style="color: #bbb">${res.detalhe}</small>`, "#00ffcc");
        }

        if (window.StatusSystem) window.StatusSystem.aplicarDanoReacao(id);
        if (dadosA.furtivo) await refAtacante.update({ furtivo: null });

        setTimeout(() => {
            el.classList.remove('token-auto-acao'); window.esconderConsoleDados(); this.tokenAtivoId = null; this.resetarCalculadora(); this.ataqueSecundarioRealizado = false; this.comboMortalRealizado = false;
            document.querySelectorAll('.btn-attr').forEach(b => { b.style.pointerEvents = 'auto'; b.style.opacity = '1'; b.style.filter = 'none'; });
            if (window.iniciativa && window.iniciativa.fila.length > 0) window.iniciativa.proximoTurno();
        }, 1500);
    },

    processarCombate: function(dadosAtacante, dadosAlvo, infoRolagem, idAlvo = null, foraDeAlcance = false, msgAlcance = "") {
        
        let atributoAtaque = this.calc.atributoSelecionado; 
        let armaAtacante = null;
        let isMonstroAtacante = (dadosAtacante.tipo === 'monstro' || dadosAtacante.tipo === 'npc' || dadosAtacante.tipo === 'monstros');
        let euSouOAtacante = (dadosAtacante.dono || "").toLowerCase() === (localStorage.getItem('rubi_username') || "").toLowerCase();

        let nomeArmaUsada = (dadosAtacante.armaEquipada || "").toLowerCase();
        if (euSouOAtacante && !isMonstroAtacante && !dadosAtacante.isInvocacao) {
            const slotMao = document.querySelector(`[data-slot-index="${this.ataqueSecundarioRealizado ? '65' : '63'}"]`);
            if (slotMao && slotMao.dataset.itemFullData) {
                try { nomeArmaUsada = JSON.parse(slotMao.dataset.itemFullData).nome.toLowerCase(); } catch(e) {}
            }
        }

        if (euSouOAtacante && !isMonstroAtacante) {
            if (!dadosAtacante.atributos || typeof dadosAtacante.atributos !== 'object') dadosAtacante.atributos = {};
            ['for', 'dex', 'int', 'def', 'car', 'con'].forEach(attr => {
                const el = document.getElementById(`stat-${attr}`);
                if (el) dadosAtacante.atributos[attr] = parseInt(el.innerText) || 0;
            });
        }

        if (window.MotorArmas) {
            if (!isMonstroAtacante && euSouOAtacante) {
                const slotId = this.ataqueSecundarioRealizado ? "65" : "63";
                const slotArma = document.querySelector(`[data-slot-index="${slotId}"]`);
                if (slotArma && slotArma.dataset.itemFullData) {
                    try {
                        const item = JSON.parse(slotArma.dataset.itemFullData);
                        armaAtacante = window.MotorArmas.identificarArma([item.tipoEspecifico, item.subTipo, item.nome, item.descricao].join(" "));
                    } catch(e) {}
                }
            } else if (dadosAtacante.armaEquipada) {
                armaAtacante = window.MotorArmas.identificarArma(dadosAtacante.armaEquipada);
            }
        }

        if (armaAtacante && armaAtacante.atributoBase) atributoAtaque = armaAtacante.atributoBase.toLowerCase();
        if (!atributoAtaque && isMonstroAtacante) atributoAtaque = (dadosAtacante.tipoDano === 'magico') ? 'int' : 'for';

        let ataqueEhMagico = false;
        if (atributoAtaque) ataqueEhMagico = ["int", "con", "car"].includes(atributoAtaque);
        else ataqueEhMagico = (dadosAtacante.tipoDano === "magico");
        if (armaAtacante && armaAtacante.categoriaDano) ataqueEhMagico = (armaAtacante.categoriaDano === "magico");

        let modBooster = 0;
        const boosterAtacante = this.calcularEfeitosBooster(dadosAtacante, atributoAtaque);

        if (ataqueEhMagico && boosterAtacante && boosterAtacante.atributoPenalizado === 'car') {
            return {
                dano: 0, total: 0, alvoDefesa: 'BLOQUEADO',
                status: `<b style="color: #ff00ff;">❌ MAGIA DISSIPADA!</b><br><small>Sua mente não consegue conjurar mágica sob o caos do Booster.</small>`,
                detalhe: 'Penalidade de Carisma (Booster)',
                isoldeAtivou: false, curaAtacanteBase: 0, acordouAlvo: false, quebrouGelo: false, ataqueBonusArma: false, empurrarAlvo: false
            };
        }

        const multAtacante = this.obterMultiplicadores(dadosAtacante);
        let modAtributo = 0;
        let attrExibicao = 0;
        let avisoReducao = "";
        
        if (atributoAtaque) {
            let multUsado = multAtacante[atributoAtaque] || 1;
            if (armaAtacante && armaAtacante.travaMultiplicador !== undefined) multUsado = armaAtacante.travaMultiplicador; 
            
            let valorAttrBruto = 0;
            if (dadosAtacante.atributos) {
                if (typeof dadosAtacante.atributos === 'string') {
                    const parts = dadosAtacante.atributos.split('/');
                    const map = { 'for': 0, 'dex': 1, 'int': 2, 'def': 3, 'car': 4, 'con': 5 };
                    valorAttrBruto = parseInt(parts[map[atributoAtaque]]) || 0;
                } else {
                    valorAttrBruto = parseInt(dadosAtacante.atributos[atributoAtaque]) || 0;
                }
            }
            
            modAtributo = valorAttrBruto * multUsado;
            attrExibicao = modAtributo; 

            // 🔥 PASSO 1: FIX VISUAL CON E ESCUDO NO CHAT 🔥
            if (atributoAtaque === 'con') {
                modAtributo = Math.floor(modAtributo / 4);
                attrExibicao = modAtributo; // Agora o chat vai ler os 20!
                avisoReducao = `<br><span style="color:#ffaa00; font-size:11px;">(Dano por CON pura: +${modAtributo})</span>`;
            }
            if (nomeArmaUsada.includes('escudo') || nomeArmaUsada.includes('escudão')) {
                modAtributo = Math.floor(modAtributo * 0.5);
                attrExibicao = modAtributo; // Agora o chat vai ler a defesa pela metade
                avisoReducao = `<br><span style="color:#ffaa00; font-size:11px;">(Armas de DEF reduzem o status em 50% para atacar: +${modAtributo})</span>`;
            }

            if (boosterAtacante) {
                modBooster = boosterAtacante.bonusDano;
            }

            if (armaAtacante && armaAtacante.somaAtributoSecundario) {
                let attrSec = armaAtacante.somaAtributoSecundario.toLowerCase();
                let valorSec = 0;
                
                if (typeof dadosAtacante.atributos === 'string') {
                    const parts = dadosAtacante.atributos.split('/');
                    const map = { 'for': 0, 'dex': 1, 'int': 2, 'def': 3, 'car': 4, 'con': 5 };
                    valorSec = parseInt(parts[map[attrSec]]) || 0;
                } else {
                    valorSec = parseInt(dadosAtacante.atributos[attrSec]) || 0;
                }

                if (boosterAtacante && attrSec === boosterAtacante.atributoPenalizado) {
                    valorSec = boosterAtacante.valorCortado;
                }

                let extraSec = valorSec * (multAtacante[attrSec] || 1);
                modAtributo += extraSec; 
                attrExibicao += extraSec; 
            }
        }

        let modExtra = parseInt(document.getElementById('extra-mod')?.value) || 0;
        const totalDados = infoRolagem.resultado * (this.calc.quantidades[`d${infoRolagem.lados}`] || 1);
        
        const totalAtaque = totalDados + modAtributo + modExtra + modBooster; 

        if (foraDeAlcance) {
            return { 
                dano: 0, total: totalAtaque, alvoDefesa: 'ALCANCE',
                status: `<b style="color: #ff4d4d;">🚫 GOLPE NO VAZIO!</b><br><small>${msgAlcance}</small>`,
                detalhe: `${totalDados} + ${attrExibicao} (${(atributoAtaque || "N/A").toUpperCase()}) + ${modExtra}${avisoReducao}`,
                isoldeAtivou: false, curaAtacanteBase: 0, acordouAlvo: false, quebrouGelo: false, ataqueBonusArma: false, empurrarAlvo: false 
            };
        }

        if (window.StatusSystem && typeof this.verificarStatusCombate === "function") {
            const checkStatus = this.verificarStatusCombate(dadosAtacante, dadosAlvo);
            if (checkStatus) return { ...checkStatus, total: totalAtaque, isoldeAtivou: false, curaAtacanteBase: 0, acordouAlvo: false, quebrouGelo: false, ataqueBonusArma: false, empurrarAlvo: false };
        }

        let armaAlvo = null;
        let alvoIsMonstro = (dadosAlvo.tipo === 'monstro' || dadosAlvo.tipo === 'npc' || dadosAlvo.tipo === 'monstros');
        let euSouOAlvo = (dadosAlvo.dono || "").toLowerCase() === (localStorage.getItem('rubi_username') || "").toLowerCase();

        if (window.MotorArmas) {
            if (dadosAlvo.armaEquipada) armaAlvo = window.MotorArmas.identificarArma(dadosAlvo.armaEquipada);
            else if (!alvoIsMonstro && euSouOAlvo) {
                const slotMao = document.querySelector('[data-slot-index="63"]');
                if (slotMao && slotMao.dataset.itemFullData) {
                    try { armaAlvo = window.MotorArmas.identificarArma([JSON.parse(slotMao.dataset.itemFullData).tipoEspecifico, JSON.parse(slotMao.dataset.itemFullData).nome].join(" ")); } catch(e) {}
                }
            }
        }

        const objAtacante = { modificadorExtra: modExtra + modBooster, valorAtributoUsado: modAtributo, ehMagico: ataqueEhMagico, isFurtivo: (dadosAtacante.furtivo === true), alvoDefesa: ataqueEhMagico ? "INT" : "DEF", danoMultiplicador: dadosAtacante.danoMultiplicador };
        
        let atributoAtaqueAlvo = null;
        if (armaAlvo && armaAlvo.atributoBase) atributoAtaqueAlvo = armaAlvo.atributoBase.toLowerCase();
        else if (dadosAlvo.tipoDano) atributoAtaqueAlvo = dadosAlvo.tipoDano === 'magico' ? 'int' : 'for';
        
        const boosterAlvo = this.calcularEfeitosBooster(dadosAlvo, atributoAtaqueAlvo);

        const objAlvo = { atributos: { ...dadosAlvo.atributos }, multiplicadores: this.obterMultiplicadores(dadosAlvo), statusAtuais: { dormindo: window.StatusSystem?.temStatus(dadosAlvo, "SONO"), congelado: window.StatusSystem?.temStatus(dadosAlvo, "GELO") } };

        if (boosterAlvo) {
            if (typeof objAlvo.atributos === 'string') {
                 const parts = objAlvo.atributos.split('/');
                 objAlvo.atributos = {
                     for: parseInt(parts[0])||0, dex: parseInt(parts[1])||0, int: parseInt(parts[2])||0,
                     def: parseInt(parts[3])||0, car: parseInt(parts[4])||0, con: parseInt(parts[5])||0
                 };
            }
            objAlvo.atributos[boosterAlvo.atributoPenalizado] = boosterAlvo.valorCortado;
        }

        let configPassivas = { danoExtra: 0, log: "", multiplicadorDrakar: 1, isoldeAtivou: false, aatroxAtivou: false, curaBase: 0, maldicaoAtivou: false, venenoAtivou: false, aplicarStatusSorte: null, condicaoElementalAtivou: null, ignoraDefesa: false };
        
        // --- 🎲 CHECAGEM DA LANÇA (30% DE IGNORAR DEFESA) ---
        if (armaAtacante && armaAtacante.ignoraDefesaChance) {
            if (Math.random() <= armaAtacante.ignoraDefesaChance) {
                configPassivas.ignoraDefesa = true;
            }
        }

        if (window.PassiveSystem) {
            if (window.PassiveSystem.verificarDefesaEspecial && window.PassiveSystem.verificarDefesaEspecial(dadosAlvo)?.horuzAtivou) {
                return { dano: 0, total: totalAtaque, alvoDefesa: 'HORUZ', status: window.PassiveSystem.verificarDefesaEspecial(dadosAlvo).log + "<br>Ataque completely anulado!", detalhe: 'Anulado', isoldeAtivou: false, curaAtacanteBase: 0, acordouAlvo: false, quebrouGelo: false, ataqueBonusArma: false, empurrarAlvo: false };
            }
            if (window.PassiveSystem.calcularDanoExtra) {
                const passivasCalculadas = window.PassiveSystem.calcularDanoExtra(dadosAtacante, ataqueEhMagico ? "magico" : "fisico", dadosAlvo, true, armaAtacante ? armaAtacante.tipo : "melee");
                configPassivas = { ...configPassivas, ...passivasCalculadas };
            }
        }

        if (!window.CombateMatematica) return { dano: 0, total: 0, alvoDefesa: 'ERRO', status: "Erro Motor Matemático.", detalhe: "0", isoldeAtivou: false, curaAtacanteBase: 0, acordouAlvo: false, quebrouGelo: false, ataqueBonusArma: false, empurrarAlvo: false };
        
        const recibo = window.CombateMatematica.calcularGolpe(objAtacante, objAlvo, armaAtacante, armaAlvo, infoRolagem, configPassivas);

        let deveEmpurrar = false;

        if (recibo.acertou && idAlvo && window.StatusSystem) {
            if (armaAtacante && armaAtacante.status && armaAtacante.chance && Math.random() < armaAtacante.chance) {
                setTimeout(() => window.StatusSystem.aplicarStatus(idAlvo, armaAtacante.status, 1), 800);
                if (armaAtacante.status === "SUSPENSO") deveEmpurrar = true;
            }
            if (configPassivas.venenoAtivou) setTimeout(() => window.StatusSystem.aplicarStatus(idAlvo, "VENENO", 1), 500);
            if (configPassivas.aplicarStatusSorte) setTimeout(() => window.StatusSystem.aplicarStatus(idAlvo, configPassivas.aplicarStatusSorte, 1), 600);
            if (configPassivas.condicaoElementalAtivou) setTimeout(() => window.StatusSystem.aplicarStatus(idAlvo, configPassivas.condicaoElementalAtivou, 1), 700);
        }

        let textoDetalhe = `${totalDados} + ${attrExibicao} (${(atributoAtaque || 'N/A').toUpperCase()}) + ${modExtra}${avisoReducao}`;
        
        if (dadosAtacante.boosterAtivo) {
            if (modBooster > 0) {
                textoDetalhe += ` + <b style="color:#ff4d4d;">${modBooster} (BOOSTER)</b>`;
            } else if (boosterAtacante && boosterAtacante.atributoPenalizado !== 'car') {
                textoDetalhe += ` + <b style="color:#777;">0 (BOOSTER VAZIO)</b>`;
            }
        }

        let temAtaqueExtraNat = false;
        
        if (nomeArmaUsada.includes('pistola')) {
            temAtaqueExtraNat = true;
        } else if (nomeArmaUsada.includes('adaga') || nomeArmaUsada.includes('katana')) {
            if (Math.random() <= 0.3) temAtaqueExtraNat = true;
        }

        return {
            dano: recibo.dano,
            total: totalAtaque,
            alvoDefesa: objAtacante.alvoDefesa,
            status: recibo.statusTexto || recibo.status,
            detalhe: textoDetalhe,
            isoldeAtivou: configPassivas.isoldeAtivou || false,
            curaAtacanteBase: configPassivas.curaBase || 0,
            acordouAlvo: recibo.acordouAlvo || false,
            quebrouGelo: recibo.quebrouGelo || false,
            ataqueBonusArma: temAtaqueExtraNat,
            empurrarAlvo: deveEmpurrar,
            ehMagico: ataqueEhMagico
        };
    }
};