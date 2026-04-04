/* ============================================================
   === [ SISTEMA COMPLETO DE MAGIAS V5.7 ] ===
   === Fixes: Magias que zeram no escudo agora aplicam status e não param o loop
   === Feat: Magia Cruel + Estilhaçar 30% + Passivas (Maldição/Veneno/Sorte)
   ============================================================ */

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
        
        // 🛑 JUIZ DA CONJURAÇÃO (Parte 1) - Gelo não trava mais a mira inicial, pois é 50% de erro na rolagem
        const tokenDOM = document.getElementById(`token-${this.tokenControlado.id}`);
        if (tokenDOM && tokenDOM.dataset.statusAtivos && window.StatusSystem) {
            let statusAtualizados = {};
            try { statusAtualizados = JSON.parse(tokenDOM.dataset.statusAtivos); } catch(e){}
            
            let statusBloqueador = null;
            for (let sId in statusAtualizados) {
                let s = statusAtualizados[sId];
                if (!s || !s.tipo) continue;
                let def = window.StatusSystem.definitions[s.tipo.toUpperCase()];
                
                if ((def && def.travaTurno) || ['TERRA', 'SONO', 'SUSPENSO'].includes(s.tipo.toUpperCase())) {
                    statusBloqueador = def ? def.nome : s.tipo.toUpperCase();
                    break;
                }
            }
            if (statusBloqueador) {
                if (window.combate && window.combate.notificarCombate) {
                    window.combate.notificarCombate(this.tokenControlado.nome.toUpperCase(), `🛑 <b>CONJURAÇÃO BLOQUEADA!</b><br>Impedido por: ${statusBloqueador}.`, "#ff3333");
                }
                return; 
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
                    if ((def && def.travaTurno) || ['TERRA', 'SONO', 'SUSPENSO'].includes(s.tipo.toUpperCase())) {
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
            const rolagem = await window.combate.esperarRolagemManual();
            
            const snapAtacante = await window.mapaRef.child('tokens').child(this.tokenControlado.id).once('value');
            const dadosAtacante = snapAtacante.val();

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
                        break;
                    }
                }

                // ❄️ JUIZ DO GELO: 50% DE CHANCE DE FALHAR A MAGIA
                if (!falhou && window.StatusSystem.temStatus(dadosAtacante, "GELO")) {
                    if (Math.random() < 0.5) {
                        window.combate.notificarCombate(this.tokenControlado.nome.toUpperCase(), `🎲 <i>Rolou ${rolagem.resultado}... mas</i><br>❌ <b>FALHOU!</b> O gelo congelou suas mãos! (50% de erro)`, "#00ffff");
                        falhou = true;
                    }
                }

                if (falhou) {
                    if (window.iniciativa && window.iniciativa.fila.length > 0) setTimeout(() => window.iniciativa.proximoTurno(), 1500);
                    return; 
                }
            }

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

            if (window.StatusSystem) {
                await window.StatusSystem.aplicarDanoReacao(this.tokenControlado.id);
            }

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

            // Se a magia não passar da esquiva, ela retorna antes de calcular as passivas.
            // Isso já resolve automaticamente o problema do veneno procar em "erro" para magias!
            if (poderAtaque > 0 && poderAtaque <= dexAlvo) {
                window.combate.notificarCombate(dadosAlvo.nome.toUpperCase(), `💨 ESQUIVOU DA MAGIA!`, "#aaa");
                return; 
            }

            // 💤 VERIFICA SONO E ❄️ GELO
            let alvoDormindo = false;
            let alvoCongelado = false;
            if (window.StatusSystem) {
                if (window.StatusSystem.temStatus(dadosAlvo, "SONO")) alvoDormindo = true;
                if (window.StatusSystem.temStatus(dadosAlvo, "GELO")) alvoCongelado = true;
            }

            let danoBase = Math.max(0, poderAtaque - resMagica);
            let danoFinal = danoBase;

            // --- LEITURA DAS PASSIVAS NAS MAGIAS ---
            let logPassiva = "";
            let passivaMaldicao = false;
            let passivaVeneno = false;
            let passivaSorte = null;
            let danoExtraPassiva = 0;
            let condicaoElementalAtivou = null;
            
            if (window.PassiveSystem && this.tokenControlado) {
                const snapAtac = await window.mapaRef.child('tokens').child(this.tokenControlado.id).once('value');
                // Adicionados os novos parâmetros: ataqueAcertou (true) e tipoArma ("magia")
                const resPassiva = window.PassiveSystem.calcularDanoExtra(snapAtac.val(), "magia", dadosAlvo, true, "magia");
                logPassiva = resPassiva.log || "";
                
                if (resPassiva.maldicaoAtivou) passivaMaldicao = true;
                if (resPassiva.venenoAtivou) passivaVeneno = true;
                if (resPassiva.aplicarStatusSorte) passivaSorte = resPassiva.aplicarStatusSorte;
                
                // Resgata os novos dados das passivas elementais
                if (resPassiva.danoExtra) danoExtraPassiva = resPassiva.danoExtra;
                if (resPassiva.condicaoElementalAtivou) condicaoElementalAtivou = resPassiva.condicaoElementalAtivou;
            }

            // 🛌🔮 CRÍTICO MÁGICO AUTOMÁTICO (Dormindo ou com Marca da Maldição)
            let foiCriticoMagico = alvoDormindo || passivaMaldicao;
            if (foiCriticoMagico && danoFinal > 0) {
                danoFinal *= 2; 
            }

            // ❄️ BÔNUS DE DANO: GELO ESTILHAÇADO (+30%)
            if (alvoCongelado && danoFinal > 0) {
                danoFinal = Math.floor(danoFinal * 1.3);
            }

            // 🔥 Adiciona o dano flat elemental da passiva (4 ou 12) ao dano final da magia
            danoFinal += danoExtraPassiva;

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
                        window.combate.notificarCombate("COLISÃO MÁGICA", `💥 Impacto! Ambos recebem +${bonusColisao} de dano extra.`, "#ff9900");
                    } else {
                        await window.mapaRef.child('tokens').child(idAlvo).update({ x: destinoX, y: destinoY });
                    }
                }
            }
            
            // --- APLICA OS STATUS DAS PASSIVAS (MESMO SE O DANO FOR ZERO) ---
            if (passivaVeneno && window.StatusSystem) {
                 setTimeout(() => window.StatusSystem.aplicarStatus(idAlvo, "VENENO", 1), 500);
            }
            if (passivaSorte && window.StatusSystem) {
                 setTimeout(() => window.StatusSystem.aplicarStatus(idAlvo, passivaSorte, 1), 600);
            }
            // ⚡ Aplica a Condição Elemental dos 10%
            if (condicaoElementalAtivou && window.StatusSystem) {
                 setTimeout(() => window.StatusSystem.aplicarStatus(idAlvo, condicaoElementalAtivou, 1), 700);
            }

            let msgDefesa = "";
            if (danoFinal <= 0) {
                 msgDefesa = `🛡️ RESISTIU À MAGIA! A proteção mágica anulou o dano do ataque.`;
                 if (alvoDormindo) msgDefesa += `<br><b style="color: #fff;">🔔 Mas o impacto o ACORDOU!</b>`;
                 if (alvoCongelado) msgDefesa += `<br><b style="color: #00ffff;">❄️ E o gelo foi ESTILHAÇADO!</b>`;
            }

            // 🔔 REMOVE STATUS DE CONTROLE (Apenas se ele realmente tinha o status, não remove da maldição)
            if (window.StatusSystem && typeof window.StatusSystem.removerStatus === 'function') {
                if (alvoDormindo) await window.StatusSystem.removerStatus(idAlvo, "SONO");
                if (alvoCongelado) await window.StatusSystem.removerStatus(idAlvo, "GELO");
            }

            let hpAtual = parseFloat(dadosAlvo.hpAtual !== undefined ? dadosAlvo.hpAtual : (dadosAlvo.atributos?.hp || 20));
            
            let conMult = 1;
            if (window.combate && typeof window.combate.obterMultiplicadores === 'function') {
                conMult = window.combate.obterMultiplicadores(dadosAlvo).con || 1;
            }

            const danoConvertido = danoFinal / conMult;
            const novoHP = Math.max(0, hpAtual - danoConvertido);
            
            if (danoFinal > 0) {
                await window.mapaRef.child('tokens').child(idAlvo).update({
                    hpAtual: novoHP,
                    "atributos/hp": novoHP 
                });
            }

            if (window.StatusSystem && tipoStatus) {
                await window.StatusSystem.aplicarStatus(idAlvo, tipoStatus, danoFinal);
            }

            let hpVisualAntes = Math.round(hpAtual * conMult);
            let hpVisualDepois = Math.round(novoHP * conMult);
            
            let mensagemRica = "";
            
            // Tratamento das mensagens visuais de forma independente
            if (danoFinal > 0) {
                if (alvoDormindo) {
                    mensagemRica = `🛌 <b style="color:#ff4d4d;">MAGIA CRUEL (CRÍTICO)!</b> -${danoFinal} HP <br>`;
                } else if (passivaMaldicao) {
                    mensagemRica = `🔮 <b style="color:#9b59b6;">MAGIA AMALDIÇOADA (CRÍTICO 100%)!</b> -${danoFinal} HP <br>`;
                } else if (alvoCongelado) {
                    mensagemRica = `❄️ <b style="color:#00ffff;">ESTILHAÇADO (+30% DANO BÔNUS)!</b> -${danoFinal} HP <br>`;
                } else {
                    mensagemRica = `💥 DANO: -${danoFinal} HP <br>`;
                }
            } else {
                mensagemRica = `${msgDefesa}<br>`;
            }
            
            mensagemRica += logPassiva; 
            
            if (danoFinal > 0) {
                mensagemRica += `<span style="font-size: 11px; color: #cccccc;">[❤️ ${hpVisualAntes} ➔ ${hpVisualDepois}]</span>`;
            }
            
            window.combate.notificarCombate(dadosAlvo.nome.toUpperCase(), mensagemRica, danoFinal > 0 ? "#ff4d4d" : "#aaa");

            if (novoHP <= 0) {
                window.combate.notificarCombate(dadosAlvo.nome.toUpperCase(), "💀 DERROTADO PELA MAGIA!", "#ff0000");
                if (window.lootEngine) window.lootEngine.processarMorte(idAlvo, dadosAlvo, 10);
            }

            if (danoFinal > 0) {
                const elAlvo = document.getElementById(`token-${idAlvo}`);
                if (elAlvo) {
                    elAlvo.classList.add('token-damaged');
                    setTimeout(() => elAlvo.classList.remove('token-damaged'), 600);
                }
            }
            
        } catch (e) {
            console.error("Erro ao processar magia:", e);
        }
    }
};