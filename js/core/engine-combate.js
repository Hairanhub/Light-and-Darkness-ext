/* ============================================================
   === [ MOTOR DE COMBATE - V15.1 ] ===
   === Fix: O Juiz do Drama Físico + Proteção Total da Armadura
   ============================================================ */

window.combate = {
    tokenAtivoId: null,
    modoDelecao: false,
    ataqueSecundarioRealizado: false, 
    
    snapshot: { temMaoEsquerda: false },
    
    calc: {
        atributoSelecionado: null,
        quantidades: { d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0 },
        extraMod: 0
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

        const slotId = this.ataqueSecundarioRealizado ? "65" : "63";
        const slotElement = document.querySelector(`[data-slot-index="${slotId}"]`);
        
        let tipoDanoDaArma = "fisico";

        if (slotElement && slotElement.dataset.itemFullData) {
            try {
                const item = JSON.parse(slotElement.dataset.itemFullData);
                if (item.categoriaDano) tipoDanoDaArma = item.categoriaDano;
            } catch (e) { console.warn("Erro ao ler arma", e); }
        }

        document.querySelectorAll('.btn-attr').forEach(btn => {
            const attr = btn.dataset.attr;
            let permitido = false;

            if (tipoDanoDaArma === "fisico") {
                if (attr === "for" || attr === "dex") permitido = true;
            } else if (tipoDanoDaArma === "magico") {
                if (attr === "int") permitido = true;
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
        const snapAtacante = await window.mapaRef.child('tokens').child(idAtacante).once('value');
        const dadosA = snapAtacante.val();
        if(!dadosA) return;

        // 🛑 BARRICADA (PRÉ-ROLAGEM)
        if (window.StatusSystem) {
            const statusBloqueio = ["SONO", "TERRA", "GELO"];
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

        // 🎭 O JUIZ DO DRAMA (PÓS-ROLAGEM)
        if (window.StatusSystem) {
            const statusDrama = ["CONFUSAO", "CEGUEIRA", "MEDO"];
            let falhou = false;
            for (let tipo of statusDrama) {
                const check = window.StatusSystem.checarProbabilidade(dadosA, tipo);
                if (check.ativou && check.efeito !== "enfraquecido") {
                    this.notificarCombate(
                        dadosA.nome.toUpperCase(), 
                        `🎲 <i>Rolou ${info.resultado} no ataque em área... mas</i><br>❌ <b>FALHOU!</b> ${check.msg}`, 
                        "#ff4d4d"
                    );
                    falhou = true;
                    break;
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
            const snapAlvo = await window.mapaRef.child('tokens').child(idAlvo).once('value');
            if(!snapAlvo.val()) continue;
            
            const dadosB = snapAlvo.val();
            const res = this.processarCombate(dadosA, dadosB, info);
            
            if (res.dano > 0) {
                const multAlvo = this.obterMultiplicadores(dadosB);
                const conMult = multAlvo.con || 1;
                const danoConvertidoParaBase = res.dano / conMult;

                const ref = window.mapaRef.child('tokens').child(idAlvo);
                const snapFresco = await ref.once('value');
                if (snapFresco.exists()) {
                    const fichaF = snapFresco.val();
                    const hpAtual = parseFloat(fichaF.hpAtual !== undefined ? fichaF.hpAtual : (fichaF.atributos?.hp || 20));
                    let novoHp = Math.max(0, hpAtual - danoConvertidoParaBase);
                
                    const hpVisualAntes = Math.round(hpAtual * conMult);
                    const hpVisualDepois = Math.round(novoHp * conMult);
                    res.status += `<br><span style="font-size: 11px; color: #cccccc;">[❤️ ${hpVisualAntes} ➔ ${hpVisualDepois}]</span>`;
                    
                    if (novoHp === 0 && (fichaF.tipo === 'monstro' || fichaF.tipo === 'monstros' || fichaF.tipo === 'npc')) {
                        await ref.remove();
                        this.notificarCombate("💀 ABATE", `<b>${fichaF.nome}</b> foi destruído!`, "#ff0000");
                    } else if (novoHp === 0 && hpAtual > 0) {
                        
                        const dadoMutilacao = Math.floor(Math.random() * 20) + 1;
                        console.log(`%c[MUTILAÇÃO - ÁREA] Alvo: ${fichaF.nome} | D20 Rolou: ${dadoMutilacao} | Arranca se for <= 5`, 'color: #ff3333; font-weight: bold; font-size: 14px;');

                        if (dadoMutilacao <= 5) {
                            if (fichaF.membroPerdido) {
                                await ref.remove();
                                this.notificarCombate("🩸 MUTILADO!", `<b>${fichaF.nome}</b> perdeu outro membro e não suportou os ferimentos. Morte Instantânea!`, "#000000");
                            } else {
                                const membros = ['Braço Direito', 'Braço Esquerdo', 'Perna Direita', 'Perna Esquerda'];
                                const membroSorteado = membros[Math.floor(Math.random() * membros.length)];
                                
                                try {
                                    const snapItens = await window.database.ref('itens').once('value');
                                    const biblioteca = snapItens.val();
                                    
                                    if (biblioteca) {
                                        const chaveItem = Object.keys(biblioteca).find(key => biblioteca[key].nome === membroSorteado);
                                        
                                        if (chaveItem) {
                                            let artefatoObj = { ...biblioteca[chaveItem] }; 
                                            artefatoObj.nome = `${membroSorteado} de ${fichaF.nome}`;
                                            artefatoObj.x = fichaF.x;
                                            artefatoObj.y = fichaF.y;
                                            artefatoObj.tipo = "itens"; 
                                            artefatoObj.isDrop = true; 
                                            
                                            window.spawnTokenGlobal(artefatoObj); 
                                        } else {
                                            console.warn(`SISTEMA: Mestre, o Artefato "${membroSorteado}" não foi encontrado na aba Itens!`);
                                        }
                                    }
                                } catch (e) { console.error("Erro ao processar o drop do membro", e); }

                                await ref.update({ hpAtual: 1, "atributos/hp": 1, membroPerdido: membroSorteado, morte: null });
                                this.notificarCombate("🪓 AMPUTADO!", `Um pedaço de <b>${fichaF.nome}</b> voou longe! Perdeu o(a) <b>${membroSorteado}</b>!`, "#cc0000");
                            }
                        } else {
                            await ref.update({ hpAtual: 0, "atributos/hp": 0, morte: { sucessos: 0, falhas: 0 } });
                            this.notificarCombate("🚑 INCONSCIENTE!", `<b>${fichaF.nome}</b> caiu! Os Testes de Morte vão começar.`, "#e74c3c");
                        }
                    } else {
                        await ref.update({ hpAtual: novoHp, "atributos/hp": novoHp });
                    }
                }
            }
            this.notificarCombate("DANO DE ÁREA", `${dadosB.nome} atingido!<br>${res.status}`);
        }
        window.esconderConsoleDados();
        this.resetarCalculadora();
    },

    executarAtaque: async function(idAtacante, idAlvo, elAlvo) {
        const elAtacante = document.getElementById(`token-${idAtacante}`);
        if (!elAtacante) return;

        const snapAtacante = await window.mapaRef.child('tokens').child(idAtacante).once('value');
        const snapAlvo = await window.mapaRef.child('tokens').child(idAlvo).once('value');
        const dadosA = snapAtacante.val();
        const dadosB = snapAlvo.val();

        const hpAtacante = parseFloat(dadosA.hpAtual !== undefined ? dadosA.hpAtual : (dadosA.atributos?.hp || 20));
        if (hpAtacante <= 0) {
            this.notificarCombate("SISTEMA", "💀 Você está inconsciente! Clique em si mesmo na sua vez para o Teste de Morte.", "#ff0000");
            this.finalizarTurnoForcado(idAtacante, elAtacante);
            return;
        }

        if (window.MotorArmas && typeof window.MotorArmas.verificarMaoEsquerda === 'function') {
            this.snapshot.temMaoEsquerda = window.MotorArmas.verificarMaoEsquerda();
        } else {
            const slotEsq = document.querySelector('[data-slot-index="65"]');
            this.snapshot.temMaoEsquerda = (slotEsq && !!slotEsq.dataset.itemFullData);
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

        // 🛑 BARRICADA (PRÉ-ROLAGEM): Sono, Terra, Gelo
        if (window.StatusSystem) {
            const statusBloqueio = ["SONO", "TERRA", "GELO"];
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
        
        // 🎭 O JUIZ DO DRAMA (PÓS-ROLAGEM): Confusão, Cegueira, Medo
        if (window.StatusSystem) {
            const statusDrama = ["CONFUSAO", "CEGUEIRA", "MEDO"];
            let falhou = false;
            for (let tipo of statusDrama) {
                const check = window.StatusSystem.checarProbabilidade(dadosA, tipo);
                if (check.ativou && check.efeito !== "enfraquecido") {
                    this.notificarCombate(
                        dadosA.nome.toUpperCase(), 
                        `🎲 <i>Rolou ${info.resultado} e avançou... mas</i><br>❌ <b>FALHOU!</b> ${check.msg}`, 
                        "#ff4d4d"
                    );
                    falhou = true;
                    break;
                }
            }
            if (falhou) {
                this.finalizarTurnoForcado(idAtacante, elAtacante);
                if (elAlvo) elAlvo.classList.remove('token-alvo');
                return;
            }
        }

        if (elAlvo) elAlvo.classList.add('token-alvo'); 

        const res = this.processarCombate(dadosA, dadosB, info);

        if (foraDeAlcance) {
            res.dano = 0;
            res.status = `<b style="color: #ff4d4d;">🚫 GOLPE NO VAZIO!</b><br><small>${msgAlcance}</small>`;
            res.isoldeAtivou = false; 
            res.curaAtacanteBase = 0; 
        }

        if (res.dano > 0) {
            let danoFinal = res.dano;
            const multAlvo = this.obterMultiplicadores(dadosB);
            const conMult = multAlvo.con || 1;

            if (window.StatusSystem && typeof window.StatusSystem.aplicarReducoesDeDano === "function") {
                danoFinal = window.StatusSystem.aplicarReducoesDeDano(dadosA, danoFinal);
            }
            
            const danoConvertidoParaBase = danoFinal / conMult;

            const ref = window.mapaRef.child('tokens').child(idAlvo);
            const snapFresco = await ref.once('value');
            if (snapFresco.exists()) {
                const fichaF = snapFresco.val();
                const hpAtual = parseFloat(fichaF.hpAtual !== undefined ? fichaF.hpAtual : (fichaF.atributos?.hp || 20));
                let novoHp = Math.max(0, hpAtual - danoConvertidoParaBase);
                
                const hpVisualAntes = Math.round(hpAtual * conMult);
                const hpVisualDepois = Math.round(novoHp * conMult);
                res.status += `<br><span style="font-size: 11px; color: #cccccc;">[❤️ ${hpVisualAntes} ➔ ${hpVisualDepois}]</span>`;
                
                if (novoHp === 0 && (fichaF.tipo === 'monstro' || fichaF.tipo === 'monstros' || fichaF.tipo === 'npc')) {
                    await ref.remove(); 
                    this.notificarCombate("💀 ABATE", `<b>${fichaF.nome}</b> foi destruído!`, "#ff0000");
                } else if (novoHp === 0 && hpAtual > 0) {
                    
                    const dadoMutilacao = Math.floor(Math.random() * 20) + 1;
                    console.log(`%c[MUTILAÇÃO - ATAQUE] Alvo: ${fichaF.nome} | D20 Rolou: ${dadoMutilacao} | Arranca se for <= 5`, 'color: #ff3333; font-weight: bold; font-size: 14px;');

                    if (dadoMutilacao <= 5) {
                        if (fichaF.membroPerdido) {
                            await ref.remove();
                            this.notificarCombate("🩸 MUTILADO!", `<b>${fichaF.nome}</b> perdeu outro membro e não suportou os ferimentos. Morte Instantânea!`, "#000000");
                        } else {
                            const membros = ['Braço Direito', 'Braço Esquerdo', 'Perna Direita', 'Perna Esquerda'];
                            const membroSorteado = membros[Math.floor(Math.random() * membros.length)];
                            
                            try {
                                const snapItens = await window.database.ref('itens').once('value');
                                const biblioteca = snapItens.val();
                                
                                if (biblioteca) {
                                    const chaveItem = Object.keys(biblioteca).find(key => biblioteca[key].nome === membroSorteado);
                                    
                                    if (chaveItem) {
                                        let artefatoObj = { ...biblioteca[chaveItem] }; 
                                        artefatoObj.nome = `${membroSorteado} de ${fichaF.nome}`;
                                        artefatoObj.x = fichaF.x;
                                        artefatoObj.y = fichaF.y;
                                        artefatoObj.tipo = "itens"; 
                                        artefatoObj.isDrop = true; 
                                        
                                        window.spawnTokenGlobal(artefatoObj); 
                                    } else {
                                        console.warn(`SISTEMA: Mestre, o Artefato "${membroSorteado}" não foi encontrado na aba Itens!`);
                                    }
                                }
                            } catch (e) { console.error("Erro ao processar o drop do membro", e); }

                            await ref.update({ hpAtual: 1, "atributos/hp": 1, membroPerdido: membroSorteado, morte: null });
                            this.notificarCombate("🪓 AMPUTADO!", `Um pedaço de <b>${fichaF.nome}</b> voou longe! Perdeu o(a) <b>${membroSorteado}</b>!`, "#cc0000");
                        }
                    } else {
                        await ref.update({ hpAtual: 0, "atributos/hp": 0, morte: { sucessos: 0, falhas: 0 } });
                        this.notificarCombate("🚑 INCONSCIENTE!", `<b>${fichaF.nome}</b> caiu! Os Testes de Morte vão começar.`, "#e74c3c");
                    }
                } else {
                    await ref.update({ hpAtual: novoHp, "atributos/hp": novoHp });
                }
            }
            
            if (res.curaAtacanteBase > 0) {
                const snapAtacFresco = await window.mapaRef.child('tokens').child(idAtacante).once('value');
                const fichaFresca = snapAtacFresco.val();
                
                if (fichaFresca) {
                    const hpMax = parseFloat(fichaFresca.hpMax || fichaFresca.atributos?.con || 20);
                    const hpAgora = parseFloat(fichaFresca.hpAtual !== undefined ? fichaFresca.hpAtual : hpMax);
                    
                    let novoHpCura = hpAgora + res.curaAtacanteBase;
                    if (novoHpCura > hpMax) novoHpCura = hpMax;

                    if (novoHpCura > hpAgora) {
                        await window.mapaRef.child('tokens').child(idAtacante).update({ 
                            hpAtual: novoHpCura,
                            "atributos/hp": novoHpCura 
                        });
                        
                        const mults = this.obterMultiplicadores(fichaFresca);
                        const conMultA = mults.con || 1;
                        const curaVisualText = Math.round((novoHpCura - hpAgora) * conMultA);
                        
                        this.notificarCombate("MÁSCARA DE AATROX", `🩸 <b>${fichaFresca.nome}</b> drenou +${curaVisualText} HP!`, "#2ecc71");
                        
                        const pinoAtacante = document.getElementById(`token-${idAtacante}`);
                        if (pinoAtacante) {
                            pinoAtacante.style.transition = "box-shadow 0.3s ease";
                            pinoAtacante.style.boxShadow = "0 0 25px 10px #2ecc71";
                            setTimeout(() => { pinoAtacante.style.boxShadow = "none"; }, 1000);
                        }
                    }
                }
            }

            const tipoStatusRaw = document.getElementById('reg-magia-status-tipo')?.value || 
                                 (this.calc.atributoSelecionado === "int" ? "Fogo" : null);
            if (tipoStatusRaw && window.StatusSystem) await window.StatusSystem.aplicarStatus(idAlvo, tipoStatusRaw);
            if (window.StatusSystem) await window.StatusSystem.aplicarDanoReacao(idAtacante);

            if (elAlvo) {
                elAlvo.classList.add('tomando-dano');
                setTimeout(() => elAlvo.classList.remove('tomando-dano'), 500);
            }
        }

        const iconAcao = this.calc.atributoSelecionado === "int" ? "✨ MAGIA" : "⚔️ ATAQUE";
        const labelAtaque = this.ataqueSecundarioRealizado ? "(OFF-HAND)" : "(MAIN-HAND)";
        
        let msg = `${iconAcao} ${labelAtaque}: <b>${dadosB.nome}</b><br>` +
                  `🎲 Total: <b>${res.total}</b> vs ${res.alvoDefesa}<br>` +
                  `<small style="color: #bbb">${res.detalhe}</small><br>` +
                  `${res.status}`;
                  
        if (dadosA.membroPerdido && dadosA.membroPerdido.includes('Braço')) {
            msg += `<br><small style="color: #ff9900;"><i>(Ataque Extra anulado pela falta do braço)</i></small>`;
        }

        this.notificarCombate(dadosA.nome.toUpperCase(), msg);

        if (dadosA.furtivo) {
            await window.mapaRef.child('tokens').child(idAtacante).update({ furtivo: null });
        }

        setTimeout(() => {
            if (elAlvo) elAlvo.classList.remove('token-alvo');
            
            window.esconderConsoleDados();
            this.resetarCalculadora();

            if (res.isoldeAtivou) {
                this.notificarCombate("COLAR DE ISOLDE", "⚡ <b>ATAQUE EXTRA!</b> Jogue novamente!", "#00d4ff");
                return; 
            }

            if (this.snapshot.temMaoEsquerda && !this.ataqueSecundarioRealizado) {
                this.ataqueSecundarioRealizado = true; 
                this.atualizarTravaAtributos(idAtacante);
                this.notificarCombate("DUAL WIELD", "⚔️ <b>ATAQUE SECUNDÁRIO!</b> Jogue novamente!", "#ff00cc");
                return;
            }

            if (elAtacante) elAtacante.classList.remove('token-preparo');
            this.tokenAtivoId = null;
            this.ataqueSecundarioRealizado = false; 
            this.snapshot.temMaoEsquerda = false; 
            
            document.querySelectorAll('.btn-attr').forEach(b => {
                b.style.pointerEvents = 'auto'; b.style.opacity = '1'; b.style.filter = 'none';
            });

            if (window.iniciativa && window.iniciativa.fila.length > 0) {
                window.iniciativa.proximoTurno();
            }
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
            this.snapshot.temMaoEsquerda = false;

            let donoToken = el.dataset.dono;
            if (!donoToken) {
                const snap = await window.mapaRef.child('tokens').child(tokenId).once('value');
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

            this.tokenAtivoId = tokenId;
            el.classList.add('token-preparo');
            this.atualizarTravaAtributos(tokenId);

        } else {
            if (this.tokenAtivoId === tokenId) {
                this.executarAutoAcao(tokenId, el);
            } else {
                this.executarAtaque(this.tokenAtivoId, tokenId, el);
            }
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
            return { dano: 0, alvoDefesa: 'STATUS', status: `<b style="color:#aa00ff;">✨ ${msg}</b>`, detalhe: 'Falha por Status' };
        }
        return null;
    },

    finalizarTurnoForcado: function(idAtacante, elAtacante) {
        if (elAtacante) elAtacante.classList.remove('token-preparo');
        this.tokenAtivoId = null;
        this.resetarCalculadora();
        this.ataqueSecundarioRealizado = false; 
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
        if (window.enviarMensagemChat) window.enviarMensagemChat(titulo, msg, cor);
    },

    executarAutoAcao: async function(id, el) {
        el.classList.remove('token-preparo');
        el.classList.add('token-auto-acao');
        const snap = await window.mapaRef.child('tokens').child(id).once('value');
        const dadosA = snap.val();

        const hpAt = parseFloat(dadosA.hpAtual !== undefined ? dadosA.hpAtual : (dadosA.atributos?.hp || 20));
        
        // 🛑 BARRICADA (PRÉ-ROLAGEM) para auto-ação
        if (hpAt > 0 && window.StatusSystem) {
            const statusBloqueio = ["SONO", "TERRA", "GELO"];
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
        
        // TESTE DE MORTE
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
                mortes.falhas = 3;
                statusMsg = "💀 <b>FALHA CRÍTICA!</b> O coração parou definitivamente.";
                cor = "#000000";
            } else if (dado === lados) {
                mortes.sucessos = 3;
                statusMsg = `🌟 <b>SUCESSO CRÍTICO!</b> Renasceu das cinzas com ${hpVisualRenascimento} HP!`;
                cor = "#ffff00";
            } else if (dado >= 10) {
                mortes.sucessos += 1;
                statusMsg = `✅ <b>Resistiu à Morte!</b> (${mortes.sucessos}/3 Sucessos)`;
                cor = "#2ecc71";
            } else {
                mortes.falhas += 1;
                statusMsg = `❌ <b>A luz está apagando...</b> (${mortes.falhas}/3 Falhas)`;
                cor = "#e74c3c";
            }
            
            this.notificarCombate(`TESTE DE MORTE: ${dadosA.nome.toUpperCase()}`, `Rolou <b>${dado}</b> no dado.<br>${statusMsg}`, cor);
            
            if (mortes.falhas >= 3) {
                await window.mapaRef.child('tokens').child(id).remove();
                this.notificarCombate("🪦 FIM DA LINHA", `<b>${dadosA.nome}</b> sucumbiu aos ferimentos e morreu permanentemente.`, "#000000");
            } else if (mortes.sucessos >= 3) {
                await window.mapaRef.child('tokens').child(id).update({ hpAtual: 1, "atributos/hp": 1, morte: null });
                
                if (dado !== lados) {
                    setTimeout(() => {
                        this.notificarCombate("🚑 ESTÁVEL!", `<b>${dadosA.nome}</b> abriu os olhos com ${hpVisualRenascimento} HP.`, "#2ecc71");
                    }, 500);
                }
            } else {
                await window.mapaRef.child('tokens').child(id).update({ morte: mortes });
            }
            
            setTimeout(() => {
                el.classList.remove('token-auto-acao');
                window.esconderConsoleDados();
                this.tokenAtivoId = null;
                this.resetarCalculadora();
                this.ataqueSecundarioRealizado = false;
                document.querySelectorAll('.btn-attr').forEach(b => {
                    b.style.pointerEvents = 'auto'; b.style.opacity = '1'; b.style.filter = 'none';
                });
                if (window.iniciativa && window.iniciativa.fila.length > 0) window.iniciativa.proximoTurno();
            }, 1500);
            
            return; 
        }

        // 🎭 O JUIZ DO DRAMA (PÓS-ROLAGEM) para auto-ação (Ataque de Monstro, etc)
        if (hpAt > 0 && window.StatusSystem) {
            const statusDrama = ["CONFUSAO", "CEGUEIRA", "MEDO"];
            let falhou = false;
            for (let tipo of statusDrama) {
                const check = window.StatusSystem.checarProbabilidade(dadosA, tipo);
                if (check.ativou && check.efeito !== "enfraquecido") {
                    this.notificarCombate(
                        dadosA.nome.toUpperCase(), 
                        `🎲 <i>Rolou ${info.resultado}... mas</i><br>❌ <b>FALHOU!</b> ${check.msg}`, 
                        "#ff4d4d"
                    );
                    falhou = true;
                    break;
                }
            }
            if (falhou) {
                setTimeout(() => {
                    el.classList.remove('token-auto-acao');
                    window.esconderConsoleDados();
                    this.tokenAtivoId = null;
                    this.resetarCalculadora();
                    if (window.iniciativa && window.iniciativa.fila.length > 0) window.iniciativa.proximoTurno();
                }, 1500);
                return;
            }
        }

        const res = this.processarCombate(dadosA, dadosA, info);

        const msg = `rolou <b>${res.total}</b>!<br><small style="color: #bbb">${res.detalhe}</small>`;
        this.notificarCombate(dadosA.nome.toUpperCase(), msg, "#00ffcc");

        if (window.StatusSystem) window.StatusSystem.aplicarDanoReacao(id);

        if (dadosA.furtivo) {
            await window.mapaRef.child('tokens').child(id).update({ furtivo: null });
        }

        setTimeout(() => {
            el.classList.remove('token-auto-acao');
            window.esconderConsoleDados();
            this.tokenAtivoId = null;
            this.resetarCalculadora();
            this.ataqueSecundarioRealizado = false;
            
            document.querySelectorAll('.btn-attr').forEach(b => {
                b.style.pointerEvents = 'auto'; b.style.opacity = '1'; b.style.filter = 'none';
            });

            if (window.iniciativa && window.iniciativa.fila.length > 0) window.iniciativa.proximoTurno();
        }, 1500);
    },

    processarCombate: function(dadosAtacante, dadosAlvo, infoRolagem) {
        const face = infoRolagem.lados;
        const valorDado = infoRolagem.resultado;
        let qtd = this.calc.quantidades[`d${face}`] || 1;
        let totalDados = valorDado * qtd;
        
        let atributoAtaque = this.calc.atributoSelecionado;
        
        if (!atributoAtaque && (dadosAtacante.tipo === 'monstro' || dadosAtacante.tipo === 'monstros')) {
            atributoAtaque = (dadosAtacante.tipoDano === 'magico') ? 'int' : 'for';
        }

        const multAtacante = this.obterMultiplicadores(dadosAtacante);
        let modAtributo = 0;
        if (atributoAtaque && dadosAtacante.atributos) {
            modAtributo = (parseInt(dadosAtacante.atributos[atributoAtaque]) || 0) * (multAtacante[atributoAtaque] || 1);
        }
        
        let modExtra = parseInt(document.getElementById('extra-mod')?.value) || 0;

        let danoPassivoTotal = 0;
        let logPassiva = "";
        let multiplicadorDrakar = 1;
        let isoldeTrigger = false;
        let curaAatroxTotal = 0;
        
        if (window.PassiveSystem && typeof window.PassiveSystem.calcularDanoExtra === "function") {
            const elementoAtaque = document.getElementById('reg-magia-status-tipo')?.value || "FISICO";
            const resultadoPassiva = window.PassiveSystem.calcularDanoExtra(dadosAtacante, elementoAtaque, dadosAlvo);
            
            danoPassivoTotal = resultadoPassiva.danoExtra || 0;
            logPassiva = resultadoPassiva.log || "";
            if (resultadoPassiva.drakarAtivou) multiplicadorDrakar = 2;
            if (resultadoPassiva.isoldeAtivou) isoldeTrigger = true;
            if (resultadoPassiva.aatroxAtivou) curaAatroxTotal = resultadoPassiva.curaBase || 0;
        }

        const totalAtaque = totalDados + modAtributo + modExtra + danoPassivoTotal;
        
        const multAlvo = this.obterMultiplicadores(dadosAlvo);
        const dexAlvo = (parseInt(dadosAlvo.atributos?.dex || 0)) * (multAlvo.dex || 1);

        if (totalAtaque <= dexAlvo) {
            return { 
                dano: 0, total: totalAtaque, alvoDefesa: 'ESQUIVA',
                status: `<b style="color: #ff9900;">💨 ESQUIVOU!</b>` + (logPassiva ? `<br>${logPassiva}` : ''), 
                detalhe: `${totalDados} + ${modAtributo} + ${modExtra}` + (danoPassivoTotal > 0 ? ` + ${danoPassivoTotal}(P)` : ''),
                isoldeAtivou: false,
                curaAtacanteBase: 0 
            };
        }

        if (window.StatusSystem && typeof this.verificarStatusCombate === "function") {
            const checkStatus = this.verificarStatusCombate(dadosAtacante, dadosAlvo);
            if (checkStatus) return { ...checkStatus, total: totalAtaque, isoldeAtivou: false, curaAtacanteBase: 0 };
        }

        let logDefesa = "";
        if (window.PassiveSystem && typeof window.PassiveSystem.verificarDefesaEspecial === "function") {
            const defesaEspecial = window.PassiveSystem.verificarDefesaEspecial(dadosAlvo);
            if (defesaEspecial) {
                if (defesaEspecial.horuzAtivou) {
                    return { 
                        dano: 0, total: totalAtaque, alvoDefesa: 'HORUZ',
                        status: defesaEspecial.log + (logPassiva ? `<br>${logPassiva}` : ''), 
                        detalhe: 'Ataque completamente anulado!',
                        isoldeAtivou: isoldeTrigger,
                        curaAtacanteBase: 0 
                    };
                } else if (defesaEspecial.logFalha) {
                    logDefesa = defesaEspecial.logFalha; 
                }
            }
        }

        const ataqueEhMagico = (atributoAtaque === "int" || dadosAtacante.tipoDano === "magico");
        const valorReducao = ataqueEhMagico ? 
                             (parseInt(dadosAlvo.atributos?.int || 0) * (multAlvo.int || 1)) : 
                             (parseInt(dadosAlvo.atributos?.def || 0) * (multAlvo.def || 1));

        // 🔥 A MUDANÇA: Agora começa em 0. Se a armadura tankar, o golpe não perfura!
        let danoBase = Math.max(0, totalAtaque - valorReducao);
        
        // Se a armadura/resistência tankou tudo, bloqueia dano, mutilação e o status!
        if (danoBase <= 0) {
            return { 
                dano: 0, 
                total: totalAtaque, 
                alvoDefesa: (ataqueEhMagico ? "INT" : "DEF"),
                status: `<b style="color: #aaa;">🛡️ DEFENDIDO! A armadura/resistência anulou o ataque e seus efeitos.</b>`, 
                detalhe: `${totalDados} + ${modAtributo} (${atributoAtaque?.toUpperCase() || ''}) + ${modExtra}`,
                isoldeAtivou: false,
                curaAtacanteBase: 0 
            };
        }

        if (multiplicadorDrakar > 1) danoBase *= multiplicadorDrakar;
        
        if (window.StatusSystem && typeof window.StatusSystem.aplicarReducoesDeDano === "function") {
            danoBase = window.StatusSystem.aplicarReducoesDeDano(dadosAtacante, danoBase);
        }

        let isFurtivo = (dadosAtacante.furtivo === true);
        let isCriticoNormal = (valorDado === face);

        let statusFinal = `💥 Dano: <b>${danoBase}</b>`;
        
        if (isCriticoNormal || isFurtivo) {
            danoBase *= 2; 
            
            if (isFurtivo) {
                statusFinal = `<b style="color: #8a2be2;">🗡️ ASSASSINATO (CRÍTICO GARANTIDO!): ${danoBase}</b>`;
            } else {
                statusFinal = `<b style="color: #ff4d4d;">🔥 CRÍTICO: ${danoBase}!</b>`;
            }
        }
        
        if (logPassiva) statusFinal += `<br>${logPassiva}`;
        if (logDefesa) statusFinal += `<br>${logDefesa}`;

        return { 
            dano: danoBase, 
            total: totalAtaque, 
            alvoDefesa: (ataqueEhMagico ? "INT" : "DEF"),
            status: statusFinal, 
            detalhe: `${totalDados} + ${modAtributo} (${atributoAtaque?.toUpperCase() || ''}) + ${modExtra}` + (danoPassivoTotal > 0 ? ` + ${danoPassivoTotal}(P)` : ''),
            isoldeAtivou: isoldeTrigger,
            curaAtacanteBase: curaAatroxTotal 
        };
    }
};