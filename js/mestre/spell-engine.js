/* ============================================================
   === [ SISTEMA COMPLETO DE MAGIAS V5.3 ] ===
   === Fixes: Drama na Conjuração (Cegueira/Confusão Pós-Rolagem)
   ============================================================ */

// ------------------------------------------------------------
// 1. ENGINE DE CRIAÇÃO (O EDITOR DE GRID)
// ------------------------------------------------------------
window.spellEditor = {
    colunas: 5,
    linhas: 8,
    matriz: [],

    renderizarGrid: function() {
        const grid = document.getElementById('spell-grid-editor');
        if (!grid) return;
        grid.innerHTML = '';
        
        for (let i = 0; i < (this.colunas * this.linhas); i++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            if (this.matriz[i] === 1) cell.classList.add('active');
            
            if (i === 37) cell.classList.add('origin-point'); 

            cell.onclick = () => {
                this.matriz[i] = this.matriz[i] === 0 ? 1 : 0;
                if(this.matriz[i] === 1) cell.classList.add('active');
                else cell.classList.remove('active');
                this.salvarMatrizNoInput();
            };
            grid.appendChild(cell);
        }
        this.salvarMatrizNoInput();
    },

    resetar: function() {
        this.matriz = new Array(this.colunas * this.linhas).fill(0);
        this.renderizarGrid();
    },

    carregar: function(stringMatriz) {
        if (stringMatriz && typeof stringMatriz === 'string' && stringMatriz.trim() !== "") {
            try { this.matriz = JSON.parse(stringMatriz); } 
            catch(e) { this.matriz = new Array(this.colunas * this.linhas).fill(0); }
        } else {
            this.matriz = new Array(this.colunas * this.linhas).fill(0);
        }
        this.renderizarGrid();
    },

    init: function() { this.resetar(); }, 

    salvarMatrizNoInput: function() {
        const input = document.getElementById('reg-magia-matriz');
        if (input) {
            input.value = JSON.stringify(this.matriz);
        }
    },

    atualizarUIEfeitos: function() {
        const tipo = document.getElementById('reg-magia-efeito-tipo')?.value;
        const campoRange = document.getElementById('campo-distancia-teleporte');
        const gridEditor = document.getElementById('spell-grid-editor');

        if (!gridEditor) return;

        if (tipo === 'teleporte') {
            if(campoRange) campoRange.style.display = 'block';
            gridEditor.style.opacity = '0.3';
            gridEditor.style.pointerEvents = 'none';
        } else {
            if(campoRange) campoRange.style.display = 'none';
            gridEditor.style.opacity = '1';
            gridEditor.style.pointerEvents = 'auto';
        }
    }
};

// CSS dinâmico
if (!document.getElementById('spell-editor-style')) {
    const style = document.createElement('style');
    style.id = 'spell-editor-style';
    style.innerHTML = `
        .spell-grid-editor { display: grid; grid-template-columns: repeat(5, 25px); gap: 2px; background: #111; padding: 5px; border: 2px solid #f3e520; width: fit-content; margin: 10px 0; border-radius: 4px; }
        .grid-cell { width: 25px; height: 25px; background: #222; cursor: pointer; border: 1px solid #333; transition: all 0.2s; }
        .grid-cell:hover { background: #444; border-color: #555; }
        .grid-cell.active { background: #f3e520; box-shadow: inset 0 0 10px #ffaa00, 0 0 5px rgba(243, 229, 32, 0.5); border-color: #fff; }
        .grid-cell.origin-point { border: 2px solid #00ffcc !important; position: relative; }
        .grid-cell.origin-point::after { content: '👤'; font-size: 10px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; }
    `;
    document.head.appendChild(style);
}

// ------------------------------------------------------------
// 2. ENGINE DE CONJURAÇÃO (O MOTOR NO MAPA)
// ------------------------------------------------------------
window.spellEngine = {
    magiaAtiva: null,
    direcaoAtual: 'norte',
    tokenControlado: null,
    gridSize: 35,
    posicaoMiraSolta: null,

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

    prepararConjuracao: function(id) {
        if (!this.tokenControlado) return alert("Mestre, incorpore um token primeiro!");
        
        // 🛑 JUIZ DA CONJURAÇÃO (Parte 1): Verifica Hard CC (Terra, Gelo, Sono)
        const tokenDOM = document.getElementById(`token-${this.tokenControlado.id}`);
        if (tokenDOM && tokenDOM.dataset.statusAtivos && window.StatusSystem) {
            let statusAtualizados = {};
            try { statusAtualizados = JSON.parse(tokenDOM.dataset.statusAtivos); } catch(e){}
            
            let statusBloqueador = null;
            for (let sId in statusAtualizados) {
                let s = statusAtualizados[sId];
                if (!s || !s.tipo) continue;
                let def = window.StatusSystem.definitions[s.tipo.toUpperCase()];
                
                if ((def && def.travaTurno) || ['TERRA', 'GELO', 'SONO'].includes(s.tipo.toUpperCase())) {
                    statusBloqueador = def ? def.nome : s.tipo.toUpperCase();
                    break;
                }
            }
            if (statusBloqueador) {
                if (window.combate && window.combate.notificarCombate) {
                    window.combate.notificarCombate(this.tokenControlado.nome.toUpperCase(), `🛑 <b>CONJURAÇÃO BLOQUEADA!</b><br>Impedido por: ${statusBloqueador}.`, "#ff3333");
                }
                return; // ⛔ Aborta a magia aqui!
            }
        }

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

    confirmarLancamento: async function() {
        if (!this.magiaAtiva || !this.tokenControlado) return;

        const snapConjurador = await window.mapaRef.child('tokens').child(this.tokenControlado.id).once('value');
        const dadosConjurador = snapConjurador.val();
        
        if (dadosConjurador) {
            
            // 🛑 JUIZ DA CONJURAÇÃO (Parte 2): Hard CC Checado na hora de apertar o gatilho!
            if (dadosConjurador.statusAtivos && window.StatusSystem) {
                let statusBloqueador = null;
                for (let sId in dadosConjurador.statusAtivos) {
                    let s = dadosConjurador.statusAtivos[sId];
                    let def = window.StatusSystem.definitions[s.tipo.toUpperCase()];
                    if ((def && def.travaTurno) || ['TERRA', 'GELO', 'SONO'].includes(s.tipo.toUpperCase())) {
                        statusBloqueador = def ? def.nome : s.tipo.toUpperCase();
                        break;
                    }
                }
                if (statusBloqueador) {
                    window.combate.notificarCombate(this.tokenControlado.nome.toUpperCase(), `🛑 <b>CONJURAÇÃO INTERROMPIDA!</b><br>Impedido por: ${statusBloqueador}.`, "#ff3333");
                    this.magiaAtiva = null;
                    this.desativarModoMira();
                    this.removerPreviews();
                    return; 
                }
            }

            const custoMana = parseInt(this.magiaAtiva.custo) || 0; 
            const isJogador = dadosConjurador.tipo === 'jogador' || dadosConjurador.manaMax > 0;
            
            // Verifica a mana disponível, mas só vai DESCONTAR depois do dado rolar.
            if (isJogador && custoMana > 0) {
                const manaAtual = parseInt(dadosConjurador.manaAtual) || 0;
                
                if (manaAtual < custoMana) {
                    window.combate.notificarCombate(this.tokenControlado.nome.toUpperCase(), `❌ SEM MANA PARA CONJURAR! (Custo: ${custoMana}🔷)`, "#00aeff");
                    this.magiaAtiva = null;
                    this.desativarModoMira();
                    this.removerPreviews();
                    return; 
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
            // 🎲 Rola o Dado! O Jogador confirmou a ação.
            const rolagem = await window.combate.esperarRolagemManual();
            
            const snapAtacante = await window.mapaRef.child('tokens').child(this.tokenControlado.id).once('value');
            const dadosAtacante = snapAtacante.val();

            // Gasta a Mana AGORA (Ele tentou fazer a magia, a energia foi gasta)
            const custoMana = parseInt(this.magiaAtiva.custo) || 0; 
            const isJogador = dadosAtacante.tipo === 'jogador' || dadosAtacante.manaMax > 0;
            if (isJogador && custoMana > 0) {
                const manaAtual = parseInt(dadosAtacante.manaAtual) || 0;
                await window.mapaRef.child('tokens').child(this.tokenControlado.id).update({
                    manaAtual: manaAtual - custoMana
                });
            }
            
            // 🎭 O JUIZ DO DRAMA: Checa a falha DEPOIS da rolagem!
            if (window.StatusSystem && dadosAtacante) {
                const statusImpedimento = ["CONFUSAO", "CEGUEIRA", "AR", "MEDO"];
                let falhou = false;
                
                for (let tipo of statusImpedimento) {
                    const check = window.StatusSystem.checarProbabilidade(dadosAtacante, tipo);
                    if (check.ativou && check.efeito !== "enfraquecido") {
                        window.combate.notificarCombate(
                            this.tokenControlado.nome.toUpperCase(), 
                            `🎲 <i>Rolou ${rolagem.resultado} e tentou conjurar... mas</i><br>❌ <b>FALHOU!</b> ${check.msg}`, 
                            "#ff4d4d"
                        );
                        falhou = true;
                        break; // Se errou, errou. Sai do loop.
                    }
                }

                if (falhou) {
                    // A magia foi gasta e rolada, mas nada aconteceu (errou / ficou cego)
                    if (window.iniciativa && window.iniciativa.fila.length > 0) setTimeout(() => window.iniciativa.proximoTurno(), 1500);
                    return; 
                }
            }

            // Se sobreviveu à roleta do status, calcula o dano final
            const multAtacante = window.combate.obterMultiplicadores(dadosAtacante);
            const attrSelecionado = window.combate.calc.atributoSelecionado;
            
            let valorAtributo = 0;
            let nomeExibicaoAttr = "PURO";

            if (attrSelecionado && dadosAtacante?.atributos) {
                const baseAttr = parseInt(dadosAtacante.atributos[attrSelecionado]) || 0;
                valorAtributo = baseAttr * (multAtacante[attrSelecionado] || 1);
                nomeExibicaoAttr = attrSelecionado.toUpperCase();
            }
            
            const poderFinal = rolagem.resultado + valorAtributo;

            window.combate.notificarCombate(this.tokenControlado.nome.toUpperCase(), `✨ LANÇOU <b>${this.magiaAtiva.nome}</b> (Poder: ${poderFinal})`, "#f3e520");

            for (const idAlvo of alvosIDs) {
                await this.processarDanoAlvo(idAlvo, poderFinal, rolagem.resultado, valorAtributo, nomeExibicaoAttr, this.magiaAtiva);
            }

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

            const multAlvo = window.combate.obterMultiplicadores(dadosAlvo);
            
            const dexAlvo = (parseInt(dadosAlvo.atributos?.dex || 10)) * (multAlvo.dex || 1);
            const defBruta = (parseInt(dadosAlvo.atributos?.def || 0)) * (multAlvo.def || 1);
            const intBruta = (parseInt(dadosAlvo.atributos?.int || 0)) * (multAlvo.int || 1);
            
            const resMagica = Math.max(defBruta, intBruta);

            if (poderAtaque > 0 && poderAtaque <= dexAlvo) {
                window.combate.notificarCombate(dadosAlvo.nome.toUpperCase(), `💨 ESQUIVOU!`, "#aaa");
                return;
            }

            let danoBase = Math.max(0, poderAtaque - resMagica);
            let danoFinal = danoBase;

            const tipoStatus = dadosMagia.statusTipo ? dadosMagia.statusTipo.toUpperCase() : "";
            
            if (tipoStatus === "SUSPENSO") {
                let oX, oY;

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

                    if (Math.abs(aX - oX) >= Math.abs(aY - oY)) {
                        moveX = aX >= oX ? 35 : -35;
                    } else {
                        moveY = aY >= oY ? 35 : -35;
                    }

                    const destinoX = aX + moveX;
                    const destinoY = aY + moveY;

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
                        const bonusColisao = danoFinal > 0 ? Math.floor(danoFinal * 0.5) : 5;
                        danoFinal += bonusColisao;
                        
                        await window.StatusSystem.modificarHP(tokenColisaoId, -bonusColisao);
                        window.combate.notificarCombate("COLISÃO", `💥 Impacto! Ambos recebem +${bonusColisao} de dano extra.`, "#ff9900");
                    } else {
                        await window.mapaRef.child('tokens').child(idAlvo).update({ x: destinoX, y: destinoY });
                    }
                }
            }

            let hpAtual = parseFloat(dadosAlvo.hpAtual !== undefined ? dadosAlvo.hpAtual : (dadosAlvo.atributos?.hp || 20));
            
            let conMult = 1;
            if (window.combate && typeof window.combate.obterMultiplicadores === 'function') {
                conMult = window.combate.obterMultiplicadores(dadosAlvo).con || 1;
            }

            const danoConvertido = danoFinal / conMult;
            const novoHP = Math.max(0, hpAtual - danoConvertido);
            
            await window.mapaRef.child('tokens').child(idAlvo).update({
                hpAtual: novoHP,
                "atributos/hp": novoHP 
            });

            if (window.StatusSystem && tipoStatus) {
                await window.StatusSystem.aplicarStatus(idAlvo, tipoStatus);
            }

            if (danoFinal > 0) {
                let hpVisualAntes = Math.round(hpAtual * conMult);
                let hpVisualDepois = Math.round(novoHP * conMult);
                
                let mensagemRica = `💥 DANO: -${danoFinal} HP <br><span style="font-size: 11px; color: #cccccc;">[❤️ ${hpVisualAntes} ➔ ${hpVisualDepois}]</span>`;
                window.combate.notificarCombate(dadosAlvo.nome.toUpperCase(), mensagemRica, "#ff4d4d");
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