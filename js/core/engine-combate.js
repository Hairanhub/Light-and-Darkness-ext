/* ============================================================
   === [ MOTOR DE COMBATE - V12.3 (TRAVA DE ARMAS & DUAL WIELD) ] ===
   ============================================================ */

window.combate = {
    tokenAtivoId: null,
    modoDelecao: false,
    ataqueSecundarioRealizado: false, 
    
    // Armazena dados temporários do turno atual
    snapshot: {
        temMaoEsquerda: false
    },
    
    calc: {
        atributoSelecionado: null,
        quantidades: { d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0 },
        extraMod: 0
    },

    // --- NOVA FUNÇÃO: TRAVA VISUAL DOS BOTÕES ---
    atualizarTravaAtributos: function(idAtacante) {
        const role = localStorage.getItem('rubi_role');
        
        // Mestre (GM) não tem travas, pode rolar o que quiser
        if (role === 'gm') {
            document.querySelectorAll('.btn-attr').forEach(b => {
                b.style.pointerEvents = 'auto';
                b.style.opacity = '1';
                b.style.filter = 'none';
            });
            return;
        }

        // 1. Identifica qual slot olhar (64=Direita, 65=Esquerda)
        const slotId = this.ataqueSecundarioRealizado ? "65" : "63";
        const slotElement = document.querySelector(`[data-slot-index="${slotId}"]`);
        
        let tipoDanoDaArma = "fisico"; // Padrão se estiver desarmado ou item sem config

        // 2. Lê os dados da arma equipada no slot correspondente ao ataque da vez
        if (slotElement && slotElement.dataset.itemFullData) {
            try {
                const item = JSON.parse(slotElement.dataset.itemFullData);
                if (item.categoriaDano) tipoDanoDaArma = item.categoriaDano;
            } catch (e) {
                console.warn("Erro ao ler arma para trava de atributo", e);
            }
        }

        // 3. Aplica a trava nos botões da interface (FOR, DEX, INT...)
        document.querySelectorAll('.btn-attr').forEach(btn => {
            const attr = btn.dataset.attr;
            let permitido = false;

            if (tipoDanoDaArma === "fisico") {
                if (attr === "for" || attr === "dex") permitido = true;
            } else if (tipoDanoDaArma === "magico") {
                if (attr === "int") permitido = true;
            }

            // Aplica o visual de "bloqueado"
            btn.style.pointerEvents = permitido ? 'auto' : 'none';
            btn.style.opacity = permitido ? '1' : '0.2';
            btn.style.filter = permitido ? 'none' : 'grayscale(1)';
            
            // Auto-seleciona para poupar cliques e evitar erros do jogador
            if (permitido && !this.calc.atributoSelecionado) {
                this.selecionarAtributo(attr);
            }
        });
    },

    // --- 1. ATAQUE EM ÁREA ---
    executarAtaqueArea: async function(idAtacante, idsAlvos) {
        window.mostrarConsoleDados();
        const info = await this.esperarRolagemManual(); 
        for (const idAlvo of idsAlvos) {
            const snapAtacante = await window.mapaRef.child('tokens').child(idAtacante).once('value');
            const snapAlvo = await window.mapaRef.child('tokens').child(idAlvo).once('value');
            if(!snapAtacante.val() || !snapAlvo.val()) continue;
            const res = this.processarCombate(snapAtacante.val(), snapAlvo.val(), info);
            if (res.dano > 0) await window.StatusSystem.modificarHP(idAlvo, -res.dano);
            this.notificarCombate("DANO DE ÁREA", `${snapAlvo.val().nome} atingido!<br>${res.status}`);
        }
        window.esconderConsoleDados();
        this.resetarCalculadora();
    },

    // --- 2. ATAQUE INDIVIDUAL ---
    executarAtaque: async function(idAtacante, idAlvo, elAlvo) {
        const elAtacante = document.getElementById(`token-${idAtacante}`);
        
        if (!elAtacante) {
            console.error("❌ Token atacante não encontrado.");
            return;
        }

        const snapAtacante = await window.mapaRef.child('tokens').child(idAtacante).once('value');
        const snapAlvo = await window.mapaRef.child('tokens').child(idAlvo).once('value');
        const dadosA = snapAtacante.val();
        const dadosB = snapAlvo.val();

        // --- 📸 SNAPSHOT: SALVA O ESTADO DA ARMA AGORA ---
        if (window.MotorArmas && typeof window.MotorArmas.verificarMaoEsquerda === 'function') {
            this.snapshot.temMaoEsquerda = window.MotorArmas.verificarMaoEsquerda();
        } else {
            const slotEsq = document.querySelector('[data-slot-index="65"]');
            this.snapshot.temMaoEsquerda = (slotEsq && !!slotEsq.dataset.itemFullData);
        }
        
        console.log(`📸 [SNAPSHOT] Arma Secundária detectada: ${this.snapshot.temMaoEsquerda ? "SIM" : "NÃO"}`);

        // 🔥 NOVA VALIDAÇÃO DE ALCANCE (NÃO CANCELA O TURNO, APENAS PREPARA PARA ZERAR O DANO)
        let foraDeAlcance = false;
        let msgAlcance = "";
        if (window.MotorArmas && typeof window.MotorArmas.validarAlcance === 'function') {
            const checagemAlcance = window.MotorArmas.validarAlcance(dadosA, dadosB);
            if (!checagemAlcance.pode) {
                foraDeAlcance = true;
                msgAlcance = checagemAlcance.msg;
                // Avisa que o golpe vai falhar, mas permite rolar o dado para consumir a ação!
                this.notificarCombate("ALCANCE", `⚠️ O golpe vai falhar: ${msgAlcance}`, "#ff9900");
            }
        }

        // 🛑 STATUS (Sono, etc) - Isso ainda cancela porque o personagem não pode se mover
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

        // --- ROLAGEM ---
        window.mostrarConsoleDados();
        const info = await this.esperarRolagemManual(); 
        if (elAlvo) elAlvo.classList.add('token-alvo'); 

        const res = this.processarCombate(dadosA, dadosB, info);

        // 🔥 SE ESTAVA FORA DE ALCANCE, FORÇA O DANO ZERO ANTES DE APLICAR
        if (foraDeAlcance) {
            res.dano = 0;
            res.status = `<b style="color: #ff4d4d;">🚫 GOLPE NO VAZIO!</b><br><small>${msgAlcance}</small>`;
            res.isoldeAtivou = false; // Não pode ativar passivas extras se bateu no vento
        }

        // --- DANO ---
        if (res.dano > 0) {
            let danoFinal = res.dano;
            if (window.StatusSystem) {
                danoFinal = window.StatusSystem.aplicarReducoesDeDano(dadosA, danoFinal);
                await window.StatusSystem.modificarHP(idAlvo, -danoFinal);
            } else {
                const ref = window.mapaRef.child('tokens').child(idAlvo);
                const currentHP = parseInt(dadosB.hpAtual || dadosB.atributos?.hp || 20);
                await ref.update({ hpAtual: Math.max(0, currentHP - danoFinal) });
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

        // --- DECISÃO DE CONTINUIDADE (USA O SNAPSHOT) ---
        setTimeout(() => {
            if (elAlvo) elAlvo.classList.remove('token-alvo');
            
            window.esconderConsoleDados();
            this.resetarCalculadora();

            // 1. ISOLDE (Prioridade Máxima)
            if (res.isoldeAtivou) {
                console.log("⚡ [ISOLDE] Ativou! Turno reiniciado.");
                this.notificarCombate("COLAR DE ISOLDE", "⚡ <b>ATAQUE EXTRA!</b> Jogue novamente!", "#00d4ff");
                return; 
            }

            // 2. DUAL WIELD (Usa a memória do Snapshot)
            if (this.snapshot.temMaoEsquerda && !this.ataqueSecundarioRealizado) {
                console.log("⚔️ [DUAL WIELD] Ataque secundário disponível.");
                this.ataqueSecundarioRealizado = true; 
                
                // 🔥 TRAVA DA ARMA SECUNDÁRIA (Gatilho 2)
                this.atualizarTravaAtributos(idAtacante);

                this.notificarCombate("DUAL WIELD", "⚔️ <b>ATAQUE SECUNDÁRIO!</b> Jogue novamente!", "#ff00cc");
                return;
            }

            // 3. FIM DO TURNO
            console.log("🏁 [SISTEMA] Fim de Turno.");
            if (elAtacante) elAtacante.classList.remove('token-preparo');
            this.tokenAtivoId = null;
            this.ataqueSecundarioRealizado = false; 
            this.snapshot.temMaoEsquerda = false; 
            
            // Remove as travas caso tenha finalizado
            document.querySelectorAll('.btn-attr').forEach(b => {
                b.style.pointerEvents = 'auto'; b.style.opacity = '1'; b.style.filter = 'none';
            });

            if (window.iniciativa && window.iniciativa.fila.length > 0) {
                window.iniciativa.proximoTurno();
            }
        }, 1200); 
    },

    // --- FUNÇÕES DE SUPORTE ---
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

            // 🔥 TRAVA DA ARMA PRINCIPAL (Gatilho 1)
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
        
        // Remove travas em caso de aborto
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

    // --- 3. AUTO AÇÃO ---
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
            
            // Remove travas após auto-ação
            document.querySelectorAll('.btn-attr').forEach(b => {
                b.style.pointerEvents = 'auto'; b.style.opacity = '1'; b.style.filter = 'none';
            });

            if (window.iniciativa && window.iniciativa.fila.length > 0) window.iniciativa.proximoTurno();
        }, 1500);
    },

    // --- 4. CÁLCULOS (ATUALIZADO COM TIPO DE DANO DO MONSTRO) ---
    processarCombate: function(dadosAtacante, dadosAlvo, infoRolagem) {
        const face = infoRolagem.lados;
        const valorDado = infoRolagem.resultado;
        let qtd = this.calc.quantidades[`d${face}`] || 1;
        let totalDados = valorDado * qtd;
        
        let atributoAtaque = this.calc.atributoSelecionado;
        
        if (!atributoAtaque && dadosAtacante.tipo === 'monstro') {
            atributoAtaque = (dadosAtacante.tipoDano === 'magico') ? 'int' : 'for';
            console.log(`🤖 Auto-Ataque do Monstro: Usando ${atributoAtaque.toUpperCase()}`);
        }

        let modAtributo = 0;
        if (atributoAtaque && dadosAtacante.atributos) {
            modAtributo = parseInt(dadosAtacante.atributos[atributoAtaque]) || 0;
        }
        
        let modExtra = parseInt(document.getElementById('extra-mod')?.value) || 0;

        let danoPassivoTotal = 0;
        let logPassiva = "";
        let multiplicadorDrakar = 1;
        let isoldeTrigger = false;
        
        if (window.PassiveSystem && typeof window.PassiveSystem.calcularDanoExtra === "function") {
            const elementoAtaque = document.getElementById('reg-magia-status-tipo')?.value || "FISICO";
            const elementoMonstro = dadosAlvo.elemento || "";
            const resultadoPassiva = window.PassiveSystem.calcularDanoExtra(dadosAtacante, elementoAtaque, elementoMonstro);
            
            danoPassivoTotal = resultadoPassiva.danoExtra || 0;
            logPassiva = resultadoPassiva.log || "";
            if (resultadoPassiva.drakarAtivou) multiplicadorDrakar = 2;
            if (resultadoPassiva.isoldeAtivou) isoldeTrigger = true;
        }

        const totalAtaque = totalDados + modAtributo + modExtra + danoPassivoTotal;
        const dexAlvo = parseInt(dadosAlvo.atributos?.dex || 0);

        if (totalAtaque <= dexAlvo) {
            return { 
                dano: 0, total: totalAtaque, alvoDefesa: 'ESQUIVA',
                status: `<b style="color: #ff9900;">💨 ESQUIVOU!</b>` + (logPassiva ? `<br>${logPassiva}` : ''), 
                detalhe: `${totalDados} + ${modAtributo} + ${modExtra}` + (danoPassivoTotal > 0 ? ` + ${danoPassivoTotal}(P)` : ''),
                isoldeAtivou: false 
            };
        }

        if (window.StatusSystem) {
            const checkStatus = this.verificarStatusCombate(dadosAtacante, dadosAlvo);
            if (checkStatus) return { ...checkStatus, total: totalAtaque, isoldeAtivou: false };
        }

        const ataqueEhMagico = (atributoAtaque === "int" || dadosAtacante.tipoDano === "magico");
        const valorReducao = ataqueEhMagico ? 
                             parseInt(dadosAlvo.atributos?.int || 0) : 
                             parseInt(dadosAlvo.atributos?.def || 0);

        let danoBase = Math.max(1, totalAtaque - valorReducao);
        if (multiplicadorDrakar > 1) danoBase *= multiplicadorDrakar;
        
        if (window.StatusSystem) danoBase = window.StatusSystem.aplicarReducoesDeDano(dadosAtacante, danoBase);

        let statusFinal = `💥 Dano: <b>${danoBase}</b>`;
        if (valorDado === face) {
            danoBase *= 2;
            statusFinal = `<b style="color: #ff4d4d;">🔥 CRÍTICO: ${danoBase}!</b>`;
        }
        if (logPassiva) statusFinal += `<br>${logPassiva}`;

        return { 
            dano: danoBase, total: totalAtaque, 
            alvoDefesa: (ataqueEhMagico ? "INT" : "DEF"),
            status: statusFinal, 
            detalhe: `${totalDados} + ${modAtributo.toString().toUpperCase ? modAtributo : modAtributo} (${atributoAtaque?.toUpperCase() || ''}) + ${modExtra}` + (danoPassivoTotal > 0 ? ` + ${danoPassivoTotal}(P)` : ''),
            isoldeAtivou: isoldeTrigger
        };
    }
};