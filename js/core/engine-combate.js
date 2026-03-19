/* ============================================================
   === [ MOTOR DE COMBATE - V13.0 (AATROX BYPASS DIRETO) ] ===
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
        const isJogador = (dadosToken.tipo === 'jogador');
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
        window.mostrarConsoleDados();
        const info = await this.esperarRolagemManual(); 
        for (const idAlvo of idsAlvos) {
            const snapAtacante = await window.mapaRef.child('tokens').child(idAtacante).once('value');
            const snapAlvo = await window.mapaRef.child('tokens').child(idAlvo).once('value');
            if(!snapAtacante.val() || !snapAlvo.val()) continue;
            
            const dadosA = snapAtacante.val();
            const dadosB = snapAlvo.val();
            const res = this.processarCombate(dadosA, dadosB, info);
            
            if (res.dano > 0) {
                const multAlvo = this.obterMultiplicadores(dadosB);
                const conMult = multAlvo.con || 1;
                const danoConvertidoParaBase = res.dano / conMult;

                if (window.StatusSystem && typeof window.StatusSystem.modificarHP === "function") {
                    await window.StatusSystem.modificarHP(idAlvo, -danoConvertidoParaBase);
                } else {
                    const ref = window.mapaRef.child('tokens').child(idAlvo);
                    const currentHPBase = parseFloat(dadosB.hpAtual ?? dadosB.atributos?.hp ?? 20);
                    await ref.update({ hpAtual: Math.max(0, currentHPBase - danoConvertidoParaBase) });
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

        if (window.MotorArmas && typeof window.MotorArmas.verificarMaoEsquerda === 'function') {
            this.snapshot.temMaoEsquerda = window.MotorArmas.verificarMaoEsquerda();
        } else {
            const slotEsq = document.querySelector('[data-slot-index="65"]');
            this.snapshot.temMaoEsquerda = (slotEsq && !!slotEsq.dataset.itemFullData);
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
            if (window.StatusSystem.temStatus(dadosA, "SONO")) {
                this.notificarCombate(dadosA.nome.toUpperCase(), "💤 Está dormindo e perdeu a ação!", "#aaa");
                this.finalizarTurnoForcado(idAtacante, elAtacante);
                return;
            }
            const statusProbabilidade = ["TERRA", "GELO", "CONFUSAO", "CEGUEIRA", "MEDO"];
            for (let tipo of statusProbabilidade) {
                const check = window.StatusSystem.checarProbabilidade(dadosA, tipo);
                if (check.ativou && check.efeito !== "enfraquecido") {
                    this.notificarCombate(dadosA.nome.toUpperCase(), `❌ ${check.msg}`, "#ff4d4d");
                    this.finalizarTurnoForcado(idAtacante, elAtacante);
                    return;
                }
            }
        }

        window.mostrarConsoleDados();
        const info = await this.esperarRolagemManual(); 
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

            if (window.StatusSystem && typeof window.StatusSystem.modificarHP === "function") {
                await window.StatusSystem.modificarHP(idAlvo, -danoConvertidoParaBase);
            } else {
                const ref = window.mapaRef.child('tokens').child(idAlvo);
                const currentHPBase = parseFloat(dadosB.hpAtual ?? dadosB.atributos?.hp ?? 20);
                await ref.update({ hpAtual: Math.max(0, currentHPBase - danoConvertidoParaBase) });
            }
            
            // 🔥 AATROX: BYPASS DIRETO PARA O BANCO DE DADOS (COM EFEITO VISUAL) 🔥
            if (res.curaAtacanteBase > 0) {
                // Lemos a ficha mais atual possível
                const snapFresco = await window.mapaRef.child('tokens').child(idAtacante).once('value');
                const fichaFresca = snapFresco.val();
                
                if (fichaFresca) {
                    const hpMax = parseFloat(fichaFresca.hpMax || fichaFresca.atributos?.con || 20);
                    const hpAgora = parseFloat(fichaFresca.hpAtual !== undefined ? fichaFresca.hpAtual : hpMax);
                    
                    let novoHp = hpAgora + res.curaAtacanteBase;
                    if (novoHp > hpMax) novoHp = hpMax; // Não deixa passar da vida máxima

                    if (novoHp > hpAgora) {
                        // IGNORAMOS a função StatusSystem porque ela é bugada com números positivos.
                        // Atualizamos direto na veia do banco de dados (ambos os campos)!
                        await window.mapaRef.child('tokens').child(idAtacante).update({ 
                            hpAtual: novoHp,
                            "atributos/hp": novoHp 
                        });
                        
                        const mults = this.obterMultiplicadores(fichaFresca);
                        const conMultA = mults.con || 1;
                        const curaVisualText = Math.round((novoHp - hpAgora) * conMultA);
                        
                        this.notificarCombate("MÁSCARA DE AATROX", `🩸 <b>${fichaFresca.nome}</b> drenou +${curaVisualText} HP!`, "#2ecc71");
                        
                        // Faz o token dar um brilho verde na tela!
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
        
        const msg = `${iconAcao} ${labelAtaque}: <b>${dadosB.nome}</b><br>` +
                    `🎲 Total: <b>${res.total}</b> vs ${res.alvoDefesa}<br>` +
                    `<small style="color: #bbb">${res.detalhe}</small><br>` +
                    `${res.status}`;

        this.notificarCombate(dadosA.nome.toUpperCase(), msg);

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

        if (window.iniciativa && window.iniciativa.fila.length > 0) window.iniciativa.proximoTurno();
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

        window.mostrarConsoleDados();
        const info = await this.esperarRolagemManual(); 
        const res = this.processarCombate(dadosA, dadosA, info);

        const msg = `rolou <b>${res.total}</b>!<br><small style="color: #bbb">${res.detalhe}</small>`;
        this.notificarCombate(dadosA.nome.toUpperCase(), msg, "#00ffcc");

        if (window.StatusSystem) window.StatusSystem.aplicarDanoReacao(id);

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

        if (window.PassiveSystem && typeof window.PassiveSystem.verificarDefesaEspecial === "function") {
            const defesaEspecial = window.PassiveSystem.verificarDefesaEspecial(dadosAlvo);
            if (defesaEspecial && defesaEspecial.horuzAtivou) {
                return { 
                    dano: 0, total: totalAtaque, alvoDefesa: 'HORUZ',
                    status: defesaEspecial.log + (logPassiva ? `<br>${logPassiva}` : ''), 
                    detalhe: 'Ataque completamente anulado!',
                    isoldeAtivou: isoldeTrigger,
                    curaAtacanteBase: 0 
                };
            }
        }

        const ataqueEhMagico = (atributoAtaque === "int" || dadosAtacante.tipoDano === "magico");
        const valorReducao = ataqueEhMagico ? 
                             (parseInt(dadosAlvo.atributos?.int || 0) * (multAlvo.int || 1)) : 
                             (parseInt(dadosAlvo.atributos?.def || 0) * (multAlvo.def || 1));

        let danoBase = Math.max(1, totalAtaque - valorReducao);
        if (multiplicadorDrakar > 1) danoBase *= multiplicadorDrakar;
        
        if (window.StatusSystem && typeof window.StatusSystem.aplicarReducoesDeDano === "function") {
            danoBase = window.StatusSystem.aplicarReducoesDeDano(dadosAtacante, danoBase);
        }

        let statusFinal = `💥 Dano: <b>${danoBase}</b>`;
        if (valorDado === face) {
            danoBase *= 2;
            statusFinal = `<b style="color: #ff4d4d;">🔥 CRÍTICO: ${danoBase}!</b>`;
        }
        if (logPassiva) statusFinal += `<br>${logPassiva}`;

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