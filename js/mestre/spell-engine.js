/* ============================================================
   === [ ENGINE DE CONJURAÇÃO E PROJEÇÃO DE MAGIAS V4.6 ] ===
   ============================================================ */

window.spellEngine = {
    magiaAtiva: null,
    direcaoAtual: 'norte',
    tokenControlado: null,
    gridSize: 35,
    posicaoMiraSolta: null,

    // --- GERENCIAMENTO DE INCORPORAÇÃO ---
    incorporarToken: function(id, nome, elementoHTML) {
        this.tokenControlado = { id: id, nome: nome, el: elementoHTML };
        const status = document.getElementById('status-incorporacao');
        const nomeTxt = document.getElementById('nome-npc-incorporado');
        if (status && nomeTxt) { status.style.display = 'block'; nomeTxt.innerText = nome; }
        this.limparDestaques();
        if (elementoHTML) {
            elementoHTML.style.outline = "3px solid #f3e520";
            elementoHTML.classList.add('incorporado-mestre');
        }
    },

    desincorporar: function() {
        this.limparDestaques();
        this.tokenControlado = null;
        if (document.getElementById('status-incorporacao')) document.getElementById('status-incorporacao').style.display = 'none';
        this.removerPreviews();
        this.desativarModoMira();
    },

    limparDestaques: function() {
        document.querySelectorAll('.token-vtt').forEach(el => {
            el.style.outline = "none";
            el.classList.remove('incorporado-mestre');
        });
    },

    // --- LÓGICA DE MIRA E PROJEÇÃO ---
    prepararConjuracao: function(id) {
        if (!this.tokenControlado) return alert("Mestre, incorpore um token primeiro!");
        window.database.ref('magias').child(id).once('value').then(snap => {
            const d = snap.val();
            if (!d || !d.matrizArea) return alert("Magia sem área definida!");
            this.magiaAtiva = d;
            this.ativarModoMira();
        });
    },

    ativarModoMira: function() {
        this.desativarModoMira();
        this.seguirMouseBound = this.seguirMouse.bind(this);
        window.addEventListener('mousemove', this.seguirMouseBound);
        document.addEventListener('click', this.handleGlobalClick, true);
    },

    desativarModoMira: function() {
        window.removeEventListener('mousemove', this.seguirMouseBound);
        document.removeEventListener('click', this.handleGlobalClick, true);
        this.posicaoMiraSolta = null;
    },

    handleGlobalClick: function(e) {
        if (!window.spellEngine.magiaAtiva) return;
        if (e.ctrlKey) {
            e.preventDefault(); e.stopPropagation();
            window.spellEngine.confirmarLancamento();
        }
    },

    seguirMouse: function(e) {
        if (!this.magiaAtiva || !this.tokenControlado) return;
        const rectMapa = document.getElementById('map-container-vtt').getBoundingClientRect();
        const mX = (e.clientX - rectMapa.left) / (window.currentScale || 1);
        const mY = (e.clientY - rectMapa.top) / (window.currentScale || 1);

        const tX = parseInt(this.tokenControlado.el.style.left) || 0;
        const tY = parseInt(this.tokenControlado.el.style.top) || 0;
        const gridTX = Math.round(tX / this.gridSize);
        const gridTY = Math.round(tY / this.gridSize);

        let originX = gridTX;
        let originY = gridTY;

        if (this.magiaAtiva.modoProjecao === 'solta') {
            const mouseGridX = Math.round(mX / this.gridSize);
            const mouseGridY = Math.round(mY / this.gridSize);
            const dist = Math.abs(mouseGridX - gridTX) + Math.abs(mouseGridY - gridTY);
            const alcanceMax = this.magiaAtiva.alcanceMaximo || 5;

            if (dist <= alcanceMax) {
                originX = mouseGridX;
                originY = mouseGridY;
                this.posicaoMiraSolta = { x: originX, y: originY };
            } else { return; }
        }

        const rectToken = this.tokenControlado.el.getBoundingClientRect();
        const dx = e.clientX - (rectToken.left + rectToken.width / 2); 
        const dy = e.clientY - (rectToken.top + rectToken.height / 2);

        let novaDir = 'norte';
        if (Math.abs(dx) > Math.abs(dy)) novaDir = dx > 0 ? 'leste' : 'oeste';
        else novaDir = dy > 0 ? 'sul' : 'norte';

        if (this.direcaoAtual !== novaDir || this.magiaAtiva.modoProjecao === 'solta') {
            this.direcaoAtual = novaDir;
            this.renderizarPreview(originX, originY, novaDir);
        }
    },

    renderizarPreview: function(originX, originY, direcao) {
        this.removerPreviews();
        let matriz; try { matriz = JSON.parse(this.magiaAtiva.matrizArea); } catch(e) { return; }
        const container = document.getElementById('map-container-vtt');
        
        matriz.forEach((ativo, i) => {
            if (ativo === 1) {
                const col = i % 5, row = Math.floor(i / 5);
                let relX = col - 2, relY = row - 7;
                let fX = relX, fY = relY;
                if (direcao === 'sul') { fX = -relX; fY = -relY; }
                else if (direcao === 'leste') { fX = -relY; fY = relX; }
                else if (direcao === 'oeste') { fX = relY; fY = -relX; }
                this.criarQuadrado(container, originX + fX, originY + fY);
            }
        });
    },

    criarQuadrado: function(parent, gx, gy) {
        const sq = document.createElement('div');
        sq.className = 'spell-preview-cell';
        Object.assign(sq.style, {
            position: 'absolute', width: this.gridSize + 'px', height: this.gridSize + 'px',
            left: (gx * this.gridSize) + 'px', top: (gy * this.gridSize) + 'px',
            background: 'rgba(243, 229, 32, 0.4)', border: '1px solid gold',
            pointerEvents: 'none', zIndex: '5'
        });
        parent.appendChild(sq);
    },

    removerPreviews: function() {
        document.querySelectorAll('.spell-preview-cell').forEach(el => el.remove());
    },

    // --- CONFIRMAÇÃO E PASSAGEM DE TURNO ---
    confirmarLancamento: async function() {
        if (!this.magiaAtiva || !this.tokenControlado) return;

        // --- [NOVO] BUSCA DADOS DO CONJURADOR PARA MANA E STATUS ---
        const snapConjurador = await window.mapaRef.child('tokens').child(this.tokenControlado.id).once('value');
        const dadosConjurador = snapConjurador.val();
        
        if (dadosConjurador) {
            // 1. CHECAGEM E COBRANÇA DE MANA (O Pedágio Arcano 🔷)
            const custoMana = parseInt(this.magiaAtiva.custo) || 0; 
            const isJogador = dadosConjurador.tipo === 'jogador' || dadosConjurador.manaMax > 0;
            
            if (isJogador && custoMana > 0) {
                const manaAtual = parseInt(dadosConjurador.manaAtual) || 0;
                
                // Se não tem mana suficiente, barra a magia!
                if (manaAtual < custoMana) {
                    window.combate.notificarCombate(this.tokenControlado.nome.toUpperCase(), `❌ SEM MANA PARA CONJURAR! (Custo: ${custoMana}🔷)`, "#00aeff");
                    this.magiaAtiva = null;
                    this.desativarModoMira();
                    this.removerPreviews();
                    return; // Aborta o lançamento aqui!
                }

                // Se tem mana, cobra o valor instantaneamente no mapa!
                await window.mapaRef.child('tokens').child(this.tokenControlado.id).update({
                    manaAtual: manaAtual - custoMana
                });
            }

            // 2. TRAVA DE DEBUFFS (Seu código original mantido intacto)
            if (window.StatusSystem) {
                const statusImpedimento = ["CONFUSAO", "CEGUEIRA", "AR", "MEDO"];
                for (let tipo of statusImpedimento) {
                    const check = window.StatusSystem.checarProbabilidade(dadosConjurador, tipo);
                    if (check.ativou && check.efeito !== "enfraquecido") {
                        window.combate.notificarCombate(this.tokenControlado.nome.toUpperCase(), `❌ FALHA: ${check.msg}`, "#ff4d4d");
                        this.magiaAtiva = null;
                        this.desativarModoMira();
                        this.removerPreviews();
                        if (window.iniciativa) setTimeout(() => window.iniciativa.proximoTurno(), 1000);
                        return;
                    }
                }
            }
        }

        const cells = document.querySelectorAll('.spell-preview-cell');
        const coordsArea = Array.from(cells).map(el => ({ x: parseInt(el.style.left), y: parseInt(el.style.top) }));
        const alvosIDs = [];
        
        document.querySelectorAll('.token-vtt').forEach(tokenEl => {
            if (tokenEl.id === `token-${this.tokenControlado.id}`) return;
            const tX = parseInt(tokenEl.style.left), tY = parseInt(tokenEl.style.top);
            if (coordsArea.some(c => c.x === tX && c.y === tY)) {
                alvosIDs.push(tokenEl.id.replace('token-', ''));
            }
        });

        cells.forEach(c => c.style.background = "rgba(0, 255, 255, 0.4)");
        if (window.mostrarConsoleDados) window.mostrarConsoleDados();
        
        try {
            const rolagem = await window.combate.esperarRolagemManual();
            const snapAtacante = await window.mapaRef.child('tokens').child(this.tokenControlado.id).once('value');
            const dadosAtacante = snapAtacante.val();
            
            const attrSelecionado = window.combate.calc.atributoSelecionado;
            let valorAtributo = 0;
            let nomeExibicaoAttr = "PURO";

            if (attrSelecionado && dadosAtacante?.atributos) {
                valorAtributo = parseInt(dadosAtacante.atributos[attrSelecionado]) || 0;
                nomeExibicaoAttr = attrSelecionado.toUpperCase();
            }
            
            const poderFinal = rolagem.resultado + valorAtributo;

            window.combate.notificarCombate(this.tokenControlado.nome.toUpperCase(), `✨ LANÇOU <b>${this.magiaAtiva.nome}</b>`, "#f3e520");

            // Processa o dano em cada alvo
            for (const idAlvo of alvosIDs) {
                await this.processarDanoAlvo(idAlvo, poderFinal, rolagem.resultado, valorAtributo, nomeExibicaoAttr, this.magiaAtiva);
            }

            // --- PASSAR O TURNO AUTOMATICAMENTE ---
            setTimeout(() => {
                if (window.iniciativa && typeof window.iniciativa.proximoTurno === 'function') {
                    window.iniciativa.proximoTurno();
                }
            }, 1500);

        } catch (err) {
            console.error("❌ Erro na magia:", err);
        } finally {
            this.magiaAtiva = null;
            this.desativarModoMira();
            if (window.esconderConsoleDados) window.esconderConsoleDados();
            if (window.combate.resetarCalculadora) window.combate.resetarCalculadora();
            setTimeout(() => this.removerPreviews(), 1000);
        }
    },

    processarDanoAlvo: async function(idAlvo, poderAtaque, dado, bonus, attrNome, dadosMagia) {
        try {
            const snap = await window.mapaRef.child('tokens').child(idAlvo).once('value');
            const dadosAlvo = snap.val();
            if (!dadosAlvo) return;

            const dexAlvo = parseInt(dadosAlvo.atributos?.dex || 10);
            const resMagica = Math.max(parseInt(dadosAlvo.atributos?.def || 0), parseInt(dadosAlvo.atributos?.int || 0));

            // 1. Verificação de Esquiva (Ignorada se poderAtaque for 0, ex: repulsão do AR)
            if (poderAtaque > 0 && poderAtaque <= dexAlvo) {
                window.combate.notificarCombate(dadosAlvo.nome.toUpperCase(), `💨 ESQUIVOU!`, "#aaa");
                return;
            }

            let danoBase = Math.max(0, poderAtaque - resMagica);
            let danoFinal = danoBase;

            // --- LÓGICA DO STATUS SUSPENSO (EMPURRÃO E COLISÃO) ---
            const tipoStatus = dadosMagia.statusTipo ? dadosMagia.statusTipo.toUpperCase() : "";
            
            if (tipoStatus === "SUSPENSO") {
                let oX, oY;

                // Define a origem do empurrão (ou de quem defendeu, ou do conjurador)
                if (dadosMagia.origemForcada) {
                    oX = dadosMagia.origemForcada.x;
                    oY = dadosMagia.origemForcada.y;
                } else if (this.tokenControlado) {
                    oX = parseInt(this.tokenControlado.el.style.left);
                    oY = parseInt(this.tokenControlado.el.style.top);
                }

                if (oX !== undefined && oY !== undefined) {
                    const aX = parseInt(dadosAlvo.x);
                    const aY = parseInt(dadosAlvo.y);

                    let moveX = 0;
                    let moveY = 0;

                    // Calcula direção oposta à origem
                    if (Math.abs(aX - oX) >= Math.abs(aY - oY)) {
                        moveX = aX >= oX ? 35 : -35;
                    } else {
                        moveY = aY >= oY ? 35 : -35;
                    }

                    const destinoX = aX + moveX;
                    const destinoY = aY + moveY;

                    // Verificar se há alguém no local de destino para causar colisão
                    let tokenColisaoId = null;
                    document.querySelectorAll('.token-vtt').forEach(el => {
                        const tid = el.id.replace('token-', '');
                        if (tid !== idAlvo) {
                            const tx = parseInt(el.style.left);
                            const ty = parseInt(el.style.top);
                            if (tx === destinoX && ty === destinoY) tokenColisaoId = tid;
                        }
                    });

                    if (tokenColisaoId) {
                        // COLISÃO: +50% de dano ou mínimo de 5 se o dano for zero (repulsão do AR)
                        const bonusColisao = danoFinal > 0 ? Math.floor(danoFinal * 0.5) : 5;
                        danoFinal += bonusColisao;
                        
                        await window.StatusSystem.modificarHP(tokenColisaoId, -bonusColisao);
                        window.combate.notificarCombate("COLISÃO", `💥 Impacto! Ambos recebem +${bonusColisao} de dano extra.`, "#ff9900");
                    } else {
                        // SEM COLISÃO: Move o token
                        await window.mapaRef.child('tokens').child(idAlvo).update({ x: destinoX, y: destinoY });
                    }
                }
            }

            // 2. Aplicação de Dano Final e Sincronização
            let hpAtual = parseInt(dadosAlvo.hpAtual) || parseInt(dadosAlvo.atributos?.hp) || 20;
            const novoHP = Math.max(0, hpAtual - danoFinal);
            
            await window.mapaRef.child('tokens').child(idAlvo).update({
                hpAtual: novoHP,
                "atributos/hp": novoHP
            });

            // 3. Aplicação do Status Visual
            if (window.StatusSystem && tipoStatus) {
                await window.StatusSystem.aplicarStatus(idAlvo, tipoStatus);
            }

            if (danoFinal > 0) {
                window.combate.notificarCombate(dadosAlvo.nome.toUpperCase(), `💥 DANO: -${danoFinal} HP`, "#ff4d4d");
            }

            if (novoHP <= 0) {
                window.combate.notificarCombate(dadosAlvo.nome.toUpperCase(), "💀 DERROTADO!", "#ff0000");
                if (window.lootEngine) window.lootEngine.processarMorte(idAlvo, dadosAlvo, 10);
            }

            const elAlvo = document.getElementById(`token-${idAlvo}`);
            if (elAlvo) {
                elAlvo.classList.add('token-damaged');
                setTimeout(() => elAlvo.classList.remove('token-damaged'), 600);
            }
            
        } catch (e) {
            console.error("Erro ao processar dano/empurrão:", e);
        }
    }
};