/* ============================================================
   === [ SISTEMA COMPLETO DE MAGIAS V6.60 (MATRIZ 9x9) ] ===
   === Feat: Reações Automáticas na Lista de Buffs
   ============================================================ */

// ============================================================
// 1. ENGINE DO CRIADOR DE MAGIAS (TABULEIRO)
// ============================================================
window.spellEditor = {
    colunas: 9, 
    linhas: 9,  
    matriz: [],

    temVerde: function() { return this.matriz.some(v => [3, 5, 6, 7, 8, 9].includes(v)); },
    temLaranja: function() { return this.matriz.some(v => [4, 5, 8, 9].includes(v)); },
    temAzul: function() { return this.matriz.some(v => [2, 6, 9].includes(v)); },

    renderizarGrid: function() {
        const grid = document.getElementById('spell-grid-editor');
        if (!grid) return;
        grid.innerHTML = '';
        
        grid.style.gridTemplateColumns = `repeat(${this.colunas}, 18px)`;
        grid.style.gridTemplateRows = `repeat(${this.linhas}, 18px)`;
        
        for (let i = 0; i < (this.colunas * this.linhas); i++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            
            if (this.matriz[i] === 1) cell.classList.add('active'); 
            if (this.matriz[i] === 2) cell.classList.add('teleport-dest'); 
            if (this.matriz[i] === 3) cell.classList.add('origin-point'); 
            if (this.matriz[i] === 4) cell.classList.add('mouse-anchor'); 
            if (this.matriz[i] === 5) cell.classList.add('origin-anchor'); 
            if (this.matriz[i] === 6) cell.classList.add('origin-teleport'); 
            if (this.matriz[i] === 7) cell.classList.add('origin-area'); 
            if (this.matriz[i] === 8) cell.classList.add('origin-anchor-area'); 
            if (this.matriz[i] === 9) cell.classList.add('origin-anchor-teleport'); 

            cell.onclick = () => {
                const valProj = (document.getElementById('reg-magia-projecao')?.value || "").toLowerCase();
                const isTeleporte = valProj.includes('tele');
                const isSolta = valProj.includes('solt') || valProj.includes('area') || valProj.includes('barreira');
                
                let current = this.matriz[i];
                
                if (current === 0) {
                    if (!this.temVerde()) { this.matriz[i] = 3; }
                    else if (isSolta && !this.temLaranja()) { this.matriz[i] = 4; }
                    else if (isTeleporte && !this.temAzul()) { this.matriz[i] = 2; }
                    else { this.matriz[i] = 1; }
                } 
                else if (current === 3) { 
                    if (isSolta && !this.temLaranja()) this.matriz[i] = 5; 
                    else if (isTeleporte && !this.temAzul()) this.matriz[i] = 6; 
                    else this.matriz[i] = 7; 
                }
                else if (current === 5) { 
                    if (isTeleporte && !this.temAzul()) this.matriz[i] = 9; 
                    else this.matriz[i] = 8; 
                }
                else if (current === 7) { 
                    if (isSolta && !this.temLaranja()) this.matriz[i] = 8; 
                    else this.matriz[i] = 0;
                }
                else if (current === 6) { 
                    if (isSolta && !this.temLaranja()) this.matriz[i] = 9; 
                    else this.matriz[i] = 0;
                }
                else {
                    this.matriz[i] = 0; 
                }
                
                this.salvarMatrizNoInput();
                this.renderizarGrid();
            };
            grid.appendChild(cell);
        }
        this.salvarMatrizNoInput();
    },

    resetar: function() {
        this.matriz = new Array(this.colunas * this.linhas).fill(0);
        this.matriz[40] = 3; 
        this.renderizarGrid();
    },

    carregar: function(stringMatriz) {
        if (stringMatriz && typeof stringMatriz === 'string' && stringMatriz.trim() !== "") {
            try { 
                let m = JSON.parse(stringMatriz);
                if (m.length === (this.colunas * this.linhas)) {
                    this.matriz = m;
                } else {
                    this.matriz = new Array(this.colunas * this.linhas).fill(0);
                    let oldSize = Math.sqrt(m.length); 
                    let offset = Math.floor((this.colunas - oldSize) / 2); 
                    for (let i = 0; i < m.length; i++) {
                        let oldX = i % oldSize;
                        let oldY = Math.floor(i / oldSize);
                        let newX = oldX + offset;
                        let newY = oldY + offset;
                        if (newX >= 0 && newX < this.colunas && newY >= 0 && newY < this.linhas) {
                            let newIndex = newY * this.colunas + newX;
                            this.matriz[newIndex] = m[i];
                        }
                    }
                }
                if (!this.temVerde()) this.matriz[40] = 3; 
            } catch(e) { 
                this.matriz = new Array(this.colunas * this.linhas).fill(0); 
                this.matriz[40] = 3;
            }
        } else {
            this.matriz = new Array(this.colunas * this.linhas).fill(0);
            this.matriz[40] = 3;
        }
        this.renderizarGrid();
    },

    init: function() { this.resetar(); }, 

    salvarMatrizNoInput: function() {
        const input = document.getElementById('reg-magia-matriz');
        if (input) input.value = JSON.stringify(this.matriz);
    },

    atualizarUIEfeitos: function() {
        const gridEditor = document.getElementById('spell-grid-editor');
        if (!gridEditor) return;

        const valProj = (document.getElementById('reg-magia-projecao')?.value || "").toLowerCase();
        const isTeleporte = valProj.includes('tele');
        
        if (isTeleporte) {
            gridEditor.style.opacity = '1'; 
            gridEditor.style.pointerEvents = 'auto'; 
        } else {
            gridEditor.style.opacity = '1';
            gridEditor.style.pointerEvents = 'auto';
            if (this.temAzul()) {
                this.matriz = this.matriz.map(v => (v === 2 ? 1 : (v === 6 ? 7 : (v === 9 ? 8 : v))));
                this.renderizarGrid();
            }
        }
    }
};

let styleEditor = document.getElementById('spell-editor-style');
if (!styleEditor) {
    styleEditor = document.createElement('style');
    styleEditor.id = 'spell-editor-style';
    document.head.appendChild(styleEditor);
}

styleEditor.innerHTML = `
    .spell-grid-editor { display: grid; gap: 2px; background: #111; padding: 5px; border: 2px solid #f3e520; width: max-content; margin: 10px auto; border-radius: 4px; }
    .grid-cell { width: 18px; height: 18px; background: #222; cursor: pointer; border: 1px solid #333; transition: all 0.2s; position: relative; }
    .grid-cell:hover { background: #444; border-color: #555; }
    
    .grid-cell.active { background: #f3e520; box-shadow: inset 0 0 10px #ffaa00, 0 0 5px rgba(243, 229, 32, 0.5); border-color: #fff; }
    .grid-cell.teleport-dest { background: #00ffff; box-shadow: inset 0 0 10px #00aaff; border-color: #fff; }
    .grid-cell.teleport-dest::after { content: '🌀'; font-size: 11px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; }
    
    .grid-cell.origin-point { background: #00ffcc; box-shadow: inset 0 0 10px #00aa88; border: 2px solid #fff !important; }
    .grid-cell.origin-point::after { content: '👤'; font-size: 10px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; }
    
    .grid-cell.mouse-anchor { background: #ff8800; box-shadow: inset 0 0 10px #cc6600; border: 2px solid #fff !important; }
    .grid-cell.mouse-anchor::after { content: '🎯'; font-size: 10px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; }

    .grid-cell.origin-anchor { background: linear-gradient(135deg, #00ffcc 50%, #ff8800 50%); border: 2px solid #fff !important; }
    .grid-cell.origin-anchor::after { content: '👤🎯'; font-size: 8px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; letter-spacing: -2px; }
    
    .grid-cell.origin-teleport { background: linear-gradient(135deg, #00ffcc 50%, #00ffff 50%); border: 2px solid #fff !important; }
    .grid-cell.origin-teleport::after { content: '👤🌀'; font-size: 8px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; letter-spacing: -2px; }
    
    .grid-cell.origin-area { background: linear-gradient(135deg, #00ffcc 50%, #f3e520 50%); border: 2px solid #fff !important; }
    .grid-cell.origin-area::after { content: '👤💥'; font-size: 8px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; letter-spacing: -2px; }

    .grid-cell.origin-anchor-area { background: linear-gradient(135deg, #00ffcc 33%, #ff8800 33%, #ff8800 66%, #f3e520 66%); border: 2px solid #fff !important; }
    .grid-cell.origin-anchor-area::after { content: '👤🎯💥'; font-size: 6px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; letter-spacing: -1px; }

    .grid-cell.origin-anchor-teleport { background: linear-gradient(135deg, #00ffcc 33%, #ff8800 33%, #ff8800 66%, #00ffff 66%); border: 2px solid #fff !important; }
    .grid-cell.origin-anchor-teleport::after { content: '👤🎯🌀'; font-size: 6px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; letter-spacing: -1px; }
`;


// ============================================================
// 2. ENGINE DE COMBATE (MIRA NO TABULEIRO VTT)
// ============================================================
window.spellEngine = {
    magiaAtiva: null,
    direcaoAtual: 'norte',
    tokenControlado: null,
    gridSize: 35,
    posicaoMiraSolta: null,
    bloqueioSpam: false, 
    foraDeAlcance: false, 

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
        this.handleGlobalClickBound = this.handleGlobalClick.bind(this);
        this.cancelarMiraBound = this.cancelarMira.bind(this); 
        this.girarMagiaBound = this.girarMagia.bind(this); 

        window.addEventListener('mousemove', this.seguirMouseBound);
        document.addEventListener('click', this.handleGlobalClickBound, true);
        window.addEventListener('contextmenu', this.cancelarMiraBound);
        window.addEventListener('keydown', this.cancelarMiraBound);
        window.addEventListener('wheel', this.girarMagiaBound, {passive: false}); 
    },

    desativarModoMira: function() {
        if (this.seguirMouseBound) window.removeEventListener('mousemove', this.seguirMouseBound);
        if (this.handleGlobalClickBound) document.removeEventListener('click', this.handleGlobalClickBound, true);
        if (this.cancelarMiraBound) {
            window.removeEventListener('contextmenu', this.cancelarMiraBound);
            window.removeEventListener('keydown', this.cancelarMiraBound);
        }
        if (this.girarMagiaBound) window.removeEventListener('wheel', this.girarMagiaBound); 
        this.posicaoMiraSolta = null;
        this.foraDeAlcance = false; 
    },

    girarMagia: function(e) {
        if (!this.magiaAtiva) return;
        const valProj = (this.magiaAtiva.modoProjecao || "").toLowerCase();
        let matriz; try { matriz = JSON.parse(this.magiaAtiva.matrizArea); } catch(err) { return; }
        
        const isSolta = valProj.includes('solt') || valProj.includes('area') || valProj.includes('barreira');
        const isTeleporteSolto = valProj.includes('teleporte_solto') || valProj.includes('teleporte solto');
        const temAncoraLaranja = matriz.some(v => [4, 5, 8, 9].includes(v));
        const colaNoMouse = isSolta || isTeleporteSolto || temAncoraLaranja;

        if (colaNoMouse) {
            e.preventDefault(); 
            const direcoes = ['norte', 'leste', 'sul', 'oeste'];
            let idx = direcoes.indexOf(this.direcaoAtual);
            if (e.deltaY > 0) idx = (idx + 1) % 4;
            else idx = (idx - 1 + 4) % 4;
            this.direcaoAtual = direcoes[idx];
            
            if (this.posicaoMiraSolta) {
                this.renderizarPreview(this.posicaoMiraSolta.x, this.posicaoMiraSolta.y, this.direcaoAtual, this.foraDeAlcance, matriz);
            }
        }
    },

    cancelarMira: function(e) {
        if (e.type === 'keydown' && e.key !== 'Escape') return; 
        if (e.type === 'contextmenu') e.preventDefault(); 

        if (this.magiaAtiva) {
            this.magiaAtiva = null;
            this.desativarModoMira();
            this.removerPreviews();
            if (window.combate && window.combate.notificarCombate) {
                window.combate.notificarCombate(this.tokenControlado?.nome?.toUpperCase() || "SISTEMA", `🚫 <i>Magia cancelada.</i>`, "#aaaaaa");
            }
        }
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
        
        let matriz; try { matriz = JSON.parse(this.magiaAtiva.matrizArea); } catch(err) { return; }

        const mapRect = document.getElementById('map-container-vtt').getBoundingClientRect();
        const mX = (e.clientX - mapRect.left) / (window.currentScale || 1);
        const mY = (e.clientY - mapRect.top) / (window.currentScale || 1);
        
        const mouseGridX = Math.floor(mX / 35);
        const mouseGridY = Math.floor(mY / 35);

        const tX = parseInt(this.tokenControlado.el.style.left) || 0;
        const tY = parseInt(this.tokenControlado.el.style.top) || 0;
        const gridTX = Math.round(tX / 35);
        const gridTY = Math.round(tY / 35);

        let originX = gridTX;
        let originY = gridTY;

        this.foraDeAlcance = false; 
        
        const valProj = (this.magiaAtiva.modoProjecao || "").toLowerCase();
        const isSolta = valProj.includes('solt') || valProj.includes('area') || valProj.includes('barreira');
        const isTeleporteSolto = valProj.includes('teleporte_solto') || valProj.includes('teleporte solto');
        const temAncoraLaranja = matriz.some(v => [4, 5, 8, 9].includes(v));

        const colaNoMouse = isSolta || isTeleporteSolto || temAncoraLaranja;

        if (colaNoMouse) {
            originX = mouseGridX;
            originY = mouseGridY;
            this.posicaoMiraSolta = { x: originX, y: originY };

            const dist = Math.max(Math.abs(mouseGridX - gridTX), Math.abs(mouseGridY - gridTY));
            const alcanceMax = parseInt(this.magiaAtiva.alcanceMaximo) || 10; 
            
            if (dist > alcanceMax) {
                this.foraDeAlcance = true; 
            }
        }

        const rectToken = this.tokenControlado.el.getBoundingClientRect();
        const dx = e.clientX - (rectToken.left + rectToken.width / 2); 
        const dy = e.clientY - (rectToken.top + rectToken.height / 2);

        let novaDir = this.direcaoAtual;
        if (!colaNoMouse) {
            if (Math.abs(dx) > Math.abs(dy)) novaDir = dx > 0 ? 'leste' : 'oeste';
            else novaDir = dy > 0 ? 'sul' : 'norte';
        }

        if (this.direcaoAtual !== novaDir || colaNoMouse) {
            this.direcaoAtual = novaDir;
            this.renderizarPreview(originX, originY, novaDir, this.foraDeAlcance, matriz);
        }
    },
    
    renderizarPreview: function(originX, originY, direcao, foraDeAlcance, matriz) {
        this.removerPreviews();
        const container = document.getElementById('map-container-vtt');
        
        const isOld = matriz.length <= 40; 
        const colunas = isOld ? 5 : 9;
        
        let originIndex = matriz.findIndex(v => [4, 5, 8, 9].includes(v)); 
        if (originIndex === -1) originIndex = matriz.findIndex(v => [2, 6].includes(v)); 
        if (originIndex === -1) originIndex = matriz.findIndex(v => [3, 7].includes(v)); 
        if (originIndex === -1) originIndex = isOld ? 37 : 40; 

        const oCol = originIndex % colunas;
        const oRow = Math.floor(originIndex / colunas);

        matriz.forEach((ativo, i) => {
            if ([1, 2, 4, 5, 6, 7, 8, 9].includes(ativo)) {
                const col = i % colunas;
                const row = Math.floor(i / colunas);
                
                let relX = col - oCol;
                let relY = row - oRow;
                
                let fX = relX, fY = relY;
                if (direcao === 'sul') { fX = -relX; fY = -relY; }
                else if (direcao === 'leste') { fX = -relY; fY = relX; }
                else if (direcao === 'oeste') { fX = relY; fY = -relX; }
                
                let isTeleport = [2, 6, 9].includes(ativo);
                this.criarQuadrado(container, originX + fX, originY + fY, isTeleport, foraDeAlcance);
            }
        });
    },

    criarQuadrado: function(parent, gx, gy, isTeleport, foraDeAlcance) {
        const sq = document.createElement('div');
        sq.className = 'spell-preview-cell';
        if (isTeleport) sq.dataset.teleport = 'true';
        
        let bgColor = isTeleport ? 'rgba(0, 255, 255, 0.6)' : 'rgba(243, 229, 32, 0.4)';
        let brColor = isTeleport ? '2px solid #00ffff' : '1px solid gold';

        if (foraDeAlcance) {
            bgColor = 'rgba(255, 0, 0, 0.4)'; 
            brColor = '2px solid #ff3333';    
        }

        Object.assign(sq.style, {
            position: 'absolute', width: '35px', height: '35px',
            left: (gx * 35) + 'px', top: (gy * 35) + 'px',
            background: bgColor, 
            border: brColor,
            pointerEvents: 'none', zIndex: '5'
        });
        parent.appendChild(sq);
    },

    removerPreviews: function() {
        document.querySelectorAll('.spell-preview-cell').forEach(el => el.remove());
    },

    confirmarLancamento: async function() {
        if (!this.magiaAtiva || !this.tokenControlado) return;
        
        if (this.foraDeAlcance) {
            if (window.combate && window.combate.notificarCombate) {
                window.combate.notificarCombate(this.tokenControlado.nome.toUpperCase(), `❌ <b>ALVO FORA DE ALCANCE!</b><br>Chegue mais perto para conjurar essa magia.`, "#ff3333");
            }
            return; 
        }

        if (this.bloqueioSpam) return;
        this.bloqueioSpam = true;

        const snapTodos = await window.mapaRef.child('tokens').once('value');
        const todosTokens = snapTodos.val() || {};
        const dadosConjurador = todosTokens[this.tokenControlado.id];
        
        const tipoStatus = this.magiaAtiva.statusTipo ? this.magiaAtiva.statusTipo.toUpperCase() : "";
        
        // ✨ AQUI ESTÁ O FIX! Adicionamos as REAÇÕES na lista de Buffs
        const isBuff = ["ESCUDO", "VELOCIDADE", "INSPIRACAO", "REGENERACAO", "REACAO_SUSPENSAO", "REACAO_SANGRAMENTO"].includes(tipoStatus);
        
        const valProj = (this.magiaAtiva.modoProjecao || "").toLowerCase();
        const isBarreira = tipoStatus === "BARREIRA" || valProj.includes("barreira");

        if (dadosConjurador) {
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
                    this.bloqueioSpam = false;
                    return; 
                }
            }

            if (isBuff) {
                let inimigoProximo = false;
                const cX = parseInt(dadosConjurador.x) || 0;
                const cY = parseInt(dadosConjurador.y) || 0;

                for (let tId in todosTokens) {
                    if (tId === this.tokenControlado.id) continue;
                    let tk = todosTokens[tId];
                    if (tk.tipo === 'monstro' || tk.tipo === 'monstros') {
                        let mX = parseInt(tk.x) || 0;
                        let mY = parseInt(tk.y) || 0;
                        let distX = Math.abs(mX - cX) / 35;
                        let distY = Math.abs(mY - cY) / 35;
                        if (Math.max(distX, distY) <= 2.1) {
                            inimigoProximo = true;
                            break;
                        }
                    }
                }
                if (inimigoProximo) {
                    window.combate.notificarCombate(this.tokenControlado.nome.toUpperCase(), `🛑 <b>FALHA AO CONJURAR BUFF/REAÇÃO!</b><br>Você não pode usar suporte com inimigos a 2 sqm de distância!`, "#ff3333");
                    this.magiaAtiva = null;
                    this.desativarModoMira();
                    this.removerPreviews();
                    this.bloqueioSpam = false;
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
                    this.bloqueioSpam = false;
                    return; 
                }
            }
        }

        const cells = document.querySelectorAll('.spell-preview-cell');
        let teleportDest = null;
        let coordsDano = [];
        
        cells.forEach(el => {
            const cX = parseInt(el.style.left);
            const cY = parseInt(el.style.top);
            if (el.dataset.teleport === 'true') {
                teleportDest = { x: cX, y: cY };
            } else {
                coordsDano.push({ x: cX, y: cY });
            }
        });

        const alvosIDs = [];
        document.querySelectorAll('.token-vtt').forEach(tokenEl => {
            if (tokenEl.id === `token-${this.tokenControlado.id}`) return;
            const tX = parseInt(tokenEl.style.left), tY = parseInt(tokenEl.style.top);
            if (coordsDano.some(c => c.x === tX && c.y === tY)) {
                alvosIDs.push(tokenEl.id.replace('token-', ''));
            }
        });

        cells.forEach(c => c.style.background = "rgba(0, 255, 255, 0.4)");

        let valorAtributo = 0;
        let attrVencedor = 'int';
        let nomeExibicaoAttr = 'INT';

        if (dadosConjurador) {
            const strMagia = JSON.stringify(this.magiaAtiva).toLowerCase();
            const isMagiaFisica = strMagia.includes('fisic') || strMagia.includes('físic');
            const attrPermitidos = isMagiaFisica ? ['for', 'dex', 'def'] : ['int', 'car', 'con', 'hp', 'vit']; 

            let maiorValorCalc = -1;
            attrVencedor = isMagiaFisica ? 'for' : 'int'; 

            if (dadosConjurador.atributos) {
                for (let attr of attrPermitidos) {
                    let base = parseInt(dadosConjurador.atributos[attr]) || 0;
                    if (base > maiorValorCalc) {
                        maiorValorCalc = base;
                        attrVencedor = attr;
                    }
                }
            }
            
            valorAtributo = maiorValorCalc > -1 ? maiorValorCalc : 0;
            nomeExibicaoAttr = attrVencedor.toUpperCase();
            if (nomeExibicaoAttr === 'HP' || nomeExibicaoAttr === 'VIT') nomeExibicaoAttr = 'CON';

            if (!isBuff && !isBarreira && !(this.magiaAtiva.efeitoTipo === "teleporte" && coordsDano.length === 0)) {
                if (window.combate && window.combate.calc) {
                    window.combate.calc.atributoSelecionado = attrVencedor;
                }
                document.querySelectorAll('.btn-attr').forEach(btn => {
                    if (btn.dataset.attr === attrVencedor) {
                        btn.style.pointerEvents = 'none'; 
                        btn.style.opacity = '1';
                        btn.style.filter = 'drop-shadow(0 0 8px #00ffff)'; 
                        btn.classList.add('selected');
                    } else {
                        btn.style.pointerEvents = 'none'; 
                        btn.style.opacity = '0.2';
                        btn.style.filter = 'grayscale(1)';
                        btn.classList.remove('selected');
                    }
                });
            }
        }

        try {
            let rolagem = { resultado: 0 };
            
            let semJanela = isBuff || isBarreira;
            if (this.magiaAtiva.efeitoTipo === "teleporte" && coordsDano.length > 0) semJanela = false;

            if (!semJanela) {
                if (window.mostrarConsoleDados) window.mostrarConsoleDados();
                rolagem = await window.combate.esperarRolagemManual();
            }

            const custoMana = parseInt(this.magiaAtiva.custo) || 0; 
            const isJogador = dadosConjurador.tipo === 'jogador' || dadosConjurador.manaMax > 0;
            if (isJogador && custoMana > 0) {
                const manaAtual = parseInt(dadosConjurador.manaAtual) || 0;
                await window.mapaRef.child('tokens').child(this.tokenControlado.id).update({
                    manaAtual: manaAtual - custoMana
                });
            }

            if (window.StatusSystem && dadosConjurador && !semJanela) {
                const statusImpedimento = ["CONFUSAO", "CEGUEIRA", "AR", "MEDO"];
                let falhou = false;
                
                for (let tipo of statusImpedimento) {
                    const check = window.StatusSystem.checarProbabilidade(dadosConjurador, tipo);
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

                if (!falhou && window.StatusSystem.temStatus(dadosConjurador, "GELO")) {
                    if (Math.random() < 0.5) {
                        window.combate.notificarCombate(this.tokenControlado.nome.toUpperCase(), `🎲 <i>Rolou ${rolagem.resultado}... mas</i><br>❌ <b>FALHOU!</b> O gelo congelou suas mãos! (50% de erro)`, "#00ffff");
                        falhou = true;
                    }
                }

                if (falhou) {
                    if (window.iniciativa && window.iniciativa.fila.length > 0) setTimeout(() => window.iniciativa.proximoTurno(), 1500);
                    this.magiaAtiva = null;
                    this.desativarModoMira();
                    if (window.esconderConsoleDados) window.esconderConsoleDados();
                    if (window.combate && window.combate.resetarCalculadora) window.combate.resetarCalculadora();
                    document.querySelectorAll('.btn-attr').forEach(b => {
                        b.style.pointerEvents = 'auto'; b.style.opacity = '1'; b.style.filter = 'none'; b.classList.remove('selected');
                    });
                    setTimeout(() => this.removerPreviews(), 1000);
                    this.bloqueioSpam = false; 
                    return; 
                }
            }
            
            const poderFinal = rolagem.resultado + valorAtributo;
            
            let potenciaStatusDefinida = this.magiaAtiva.statusPotencia;
            if (!potenciaStatusDefinida || potenciaStatusDefinida === "0") {
                potenciaStatusDefinida = poderFinal.toString();
            }

            if (isBuff) {
                window.combate.notificarCombate(this.tokenControlado.nome.toUpperCase(), `✨ APLICOU <b>${this.magiaAtiva.nome}</b> INSTANTANEAMENTE!<br>💥 Poder Total: <b>${poderFinal}</b> (${nomeExibicaoAttr})`, "#00f2ff");
            } else if (!isBarreira && this.magiaAtiva.efeitoTipo === "teleporte" && coordsDano.length === 0) {
                window.combate.notificarCombate(this.tokenControlado.nome.toUpperCase(), `🌀 USOU <b>${this.magiaAtiva.nome.toUpperCase()}</b> E DESAPARECEU NO AR!`, "#00ffff");
            } else if (!isBarreira) {
                window.combate.notificarCombate(this.tokenControlado.nome.toUpperCase(), `✨ LANÇOU <b>${this.magiaAtiva.nome}</b><br>🎲 Rolagem: ${rolagem.resultado} + ${valorAtributo} (${nomeExibicaoAttr})<br>💥 Poder Total: <b>${poderFinal}</b>`, "#f3e520");
            }

            if (teleportDest) {
                await window.mapaRef.child('tokens').child(this.tokenControlado.id).update({
                    x: teleportDest.x, y: teleportDest.y
                });
            }

            if (isBarreira) {
                window.combate.notificarCombate(this.tokenControlado.nome.toUpperCase(), `🧱 ERGUEU UMA <b>${this.magiaAtiva.nome.toUpperCase()}</b>!`, "#aaaaaa");
                
                if (window.StatusSystem) {
                    await window.StatusSystem.aplicarStatus(this.tokenControlado.id, "BARREIRA", 0, "0");
                }

                let hpDaBarreira = parseInt(this.magiaAtiva.barreiraHp) || 10;
                const urlImg = this.magiaAtiva.url || "https://cdn-icons-png.flaticon.com/512/8205/8205321.png";

                const oX = parseInt(this.tokenControlado.el.style.left);
                const oY = parseInt(this.tokenControlado.el.style.top);

                for (let idx = 0; idx < coordsDano.length; idx++) { 
                    const coord = coordsDano[idx];
                    
                    if (coord.x === oX && coord.y === oY) continue; 

                    let idAlvoColisao = null;
                    document.querySelectorAll('.token-vtt').forEach(el => {
                        const tx = parseInt(el.style.left); const ty = parseInt(el.style.top);
                        if (tx === coord.x && ty === coord.y) idAlvoColisao = el.id.replace('token-', '');
                    });

                    if (idAlvoColisao && idAlvoColisao !== this.tokenControlado.id) {
                        let moveX = (coord.x >= oX) ? 35 : -35;
                        let moveY = (coord.y >= oY) ? 35 : -35;
                        if (Math.abs(coord.x - oX) < Math.abs(coord.y - oY)) moveX = 0; else moveY = 0;

                        await window.mapaRef.child('tokens').child(idAlvoColisao).update({ x: coord.x + moveX, y: coord.y + moveY });
                        if (window.StatusSystem) await window.StatusSystem.aplicarStatus(idAlvoColisao, "SUSPENSO", 0, "0");
                    }

                    const idBarreiraFisica = "barr_" + Date.now() + "_" + idx + "_" + Math.floor(Math.random() * 1000);
                    await window.mapaRef.child('tokens').child(idBarreiraFisica).set({
                        nome: "Parede de " + (this.magiaAtiva.nome || "Barreira"),
                        dono: this.tokenControlado.id, 
                        isBarreiraFisica: true,
                        tipo: "monstros", 
                        hpMax: hpDaBarreira, hpAtual: hpDaBarreira,
                        atributos: { hp: hpDaBarreira, def: 5, dex: 0, int: 0, con: 1, for: 0 },
                        x: coord.x, y: coord.y, tamanho: 35, img: urlImg
                    });
                }
            }

            if (window.StatusSystem) {
                await window.StatusSystem.aplicarDanoReacao(this.tokenControlado.id);
                // Aplica a reação em VOCÊ caso seja uma magia de Buff
                if (isBuff) await window.StatusSystem.aplicarStatus(this.tokenControlado.id, tipoStatus, 0, potenciaStatusDefinida);
            }

            if (!isBarreira) {
                for (const idAlvo of alvosIDs) {
                    await this.processarDanoAlvo(idAlvo, poderFinal, rolagem.resultado, valorAtributo, nomeExibicaoAttr, this.magiaAtiva);
                }
            }

            setTimeout(() => {
                if (window.iniciativa && typeof window.iniciativa.proximoTurno === 'function') window.iniciativa.proximoTurno();
            }, 1500);

        } catch (err) {
            console.error("❌ Erro na magia:", err);
        } finally {
            this.magiaAtiva = null;
            this.desativarModoMira();
            if (window.esconderConsoleDados) window.esconderConsoleDados();
            if (window.combate && window.combate.resetarCalculadora) window.combate.resetarCalculadora();
            
            document.querySelectorAll('.btn-attr').forEach(b => {
                b.style.pointerEvents = 'auto'; 
                b.style.opacity = '1'; 
                b.style.filter = 'none'; 
                b.classList.remove('selected');
            });

            setTimeout(() => this.removerPreviews(), 1000);
            this.bloqueioSpam = false; 
        }
    },

    processarDanoAlvo: async function(idAlvo, poderAtaque, dado, bonus, attrNome, dadosMagia) {
        try {
            const snap = await window.mapaRef.child('tokens').child(idAlvo).once('value');
            const dadosAlvo = snap.val();
            if (!dadosAlvo) return;

            const tipoStatus = dadosMagia.statusTipo ? dadosMagia.statusTipo.toUpperCase() : "";
            
            // ✨ FIX NA SEGUNDA FUNÇÃO TAMBÉM: Reações são Buffs!
            const isBuff = ["ESCUDO", "VELOCIDADE", "INSPIRACAO", "REGENERACAO", "REACAO_SUSPENSAO", "REACAO_SANGRAMENTO"].includes(tipoStatus);
            
            let potenciaStatus = dadosMagia.statusPotencia;
            if (!potenciaStatus || potenciaStatus === "0") potenciaStatus = poderAtaque.toString();

            if (isBuff) {
                const ehJogador = (dadosAlvo.tipo === 'jogador' || dadosAlvo.tipo === 'personagem');
                if (!ehJogador) return; 

                if (window.StatusSystem) await window.StatusSystem.aplicarStatus(idAlvo, tipoStatus, 0, potenciaStatus);
                return; 
            }

            const multAlvo = window.combate.obterMultiplicadores(dadosAlvo);
            const dexAlvo = (parseInt(dadosAlvo.atributos?.dex || 10)) * (multAlvo.dex || 1);
            const defBruta = (parseInt(dadosAlvo.atributos?.def || 0)) * (multAlvo.def || 1);
            const intBruta = (parseInt(dadosAlvo.atributos?.int || 0)) * (multAlvo.int || 1);
            const resMagica = Math.max(defBruta, intBruta);

            if (poderAtaque > 0 && poderAtaque <= dexAlvo) {
                window.combate.notificarCombate(dadosAlvo.nome.toUpperCase(), `💨 ESQUIVOU DA MAGIA!`, "#aaa");
                return; 
            }

            let alvoDormindo = false;
            let alvoCongelado = false;
            if (window.StatusSystem) {
                if (window.StatusSystem.temStatus(dadosAlvo, "SONO")) alvoDormindo = true;
                if (window.StatusSystem.temStatus(dadosAlvo, "GELO")) alvoCongelado = true;
            }

            let danoBase = Math.max(0, poderAtaque - resMagica);
            let danoFinal = danoBase;

            let logPassiva = "";
            let passivaMaldicao = false;
            let passivaVeneno = false;
            let passivaSorte = null;
            let danoExtraPassiva = 0;
            let condicaoElementalAtivou = null;
            
            if (window.PassiveSystem && this.tokenControlado) {
                const snapAtac = await window.mapaRef.child('tokens').child(this.tokenControlado.id).once('value');
                const resPassiva = window.PassiveSystem.calcularDanoExtra(snapAtac.val(), "magia", dadosAlvo, true, "magia");
                logPassiva = resPassiva.log || "";
                
                if (resPassiva.maldicaoAtivou) passivaMaldicao = true;
                if (resPassiva.venenoAtivou) passivaVeneno = true;
                if (resPassiva.aplicarStatusSorte) passivaSorte = resPassiva.aplicarStatusSorte;
                if (resPassiva.danoExtra) danoExtraPassiva = resPassiva.danoExtra;
                if (resPassiva.condicaoElementalAtivou) condicaoElementalAtivou = resPassiva.condicaoElementalAtivou;
            }

            let foiCriticoMagico = alvoDormindo || passivaMaldicao;
            if (foiCriticoMagico && danoFinal > 0) danoFinal *= 2; 

            if (alvoCongelado && danoFinal > 0) danoFinal = Math.floor(danoFinal * 1.3);

            danoFinal += danoExtraPassiva;

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

                    let moveX = 0; let moveY = 0;
                    if (Math.abs(aX - oX) >= Math.abs(aY - oY)) moveX = aX >= oX ? 35 : -35;
                    else moveY = aY >= oY ? 35 : -35;

                    const destinoX = aX + moveX;
                    const destinoY = aY + moveY;

                    let tokenColisaoId = null;
                    document.querySelectorAll('.token-vtt').forEach(el => {
                        const tid = el.id.replace('token-', '');
                        if (tid !== idAlvo) {
                            const tx = parseInt(el.style.left); const ty = parseInt(el.style.top);
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
            
            if (passivaVeneno && window.StatusSystem) setTimeout(() => window.StatusSystem.aplicarStatus(idAlvo, "VENENO", 1), 500);
            if (passivaSorte && window.StatusSystem) setTimeout(() => window.StatusSystem.aplicarStatus(idAlvo, passivaSorte, 1), 600);
            if (condicaoElementalAtivou && window.StatusSystem) setTimeout(() => window.StatusSystem.aplicarStatus(idAlvo, condicaoElementalAtivou, 1), 700);

            let msgDefesa = "";
            if (danoFinal <= 0) {
                 msgDefesa = `🛡️ RESISTIU À MAGIA! A proteção mágica anulou o dano do ataque.`;
                 if (alvoDormindo) msgDefesa += `<br><b style="color: #fff;">🔔 Mas o impacto o ACORDOU!</b>`;
                 if (alvoCongelado) msgDefesa += `<br><b style="color: #00ffff;">❄️ E o gelo foi ESTILHAÇADO!</b>`;
            }

            if (window.StatusSystem && typeof window.StatusSystem.removerStatus === 'function') {
                if (alvoDormindo) await window.StatusSystem.removerStatus(idAlvo, "SONO");
                if (alvoCongelado) await window.StatusSystem.removerStatus(idAlvo, "GELO");
            }

            let hpAtual = parseFloat(dadosAlvo.hpAtual !== undefined ? dadosAlvo.hpAtual : (dadosAlvo.atributos?.hp || 20));
            let conMult = window.combate?.obterMultiplicadores(dadosAlvo).con || 1;

            let danoParaAplicar = danoFinal;
            if (danoParaAplicar > 0 && window.StatusSystem) {
                danoParaAplicar = await window.StatusSystem.reduzirDanoNoEscudo(idAlvo, danoParaAplicar);
            }

            const danoConvertido = danoParaAplicar / conMult;
            const novoHP = Math.max(0, hpAtual - danoConvertido);
            
            if (danoParaAplicar > 0) {
                await window.mapaRef.child('tokens').child(idAlvo).update({ hpAtual: novoHP, "atributos/hp": novoHP });
            }

            if (window.StatusSystem && tipoStatus && !isBuff) {
                if (tipoStatus === "VENENO") {
                    await window.StatusSystem.aplicarStatus(idAlvo, tipoStatus, danoFinal, potenciaStatus);
                    await new Promise(r => setTimeout(r, 150)); 
                    await window.StatusSystem.aplicarStatus(idAlvo, tipoStatus, danoFinal, potenciaStatus);
                    await new Promise(r => setTimeout(r, 150));
                    await window.StatusSystem.aplicarStatus(idAlvo, tipoStatus, danoFinal, potenciaStatus);
                } else {
                    await window.StatusSystem.aplicarStatus(idAlvo, tipoStatus, danoFinal, potenciaStatus);
                }
            }

            let hpVisualAntes = Math.round(hpAtual * conMult);
            let hpVisualDepois = Math.round(novoHP * conMult);
            let mensagemRica = "";
            
            if (danoParaAplicar > 0) {
                if (danoParaAplicar < danoFinal) mensagemRica = `💥 DANO: -${danoParaAplicar} HP <br>`;
                else if (alvoDormindo) mensagemRica = `🛌 <b style="color:#ff4d4d;">MAGIA CRUEL (CRÍTICO)!</b> -${danoParaAplicar} HP <br>`;
                else if (passivaMaldicao) mensagemRica = `🔮 <b style="color:#9b59b6;">MAGIA AMALDIÇOADA (CRÍTICO 100%)!</b> -${danoParaAplicar} HP <br>`;
                else if (alvoCongelado) mensagemRica = `❄️ <b style="color:#00ffff;">ESTILHAÇADO (+30% DANO BÔNUS)!</b> -${danoParaAplicar} HP <br>`;
                else mensagemRica = `💥 DANO: -${danoParaAplicar} HP <br>`;
            } else if (danoFinal > 0 && danoParaAplicar <= 0) {
                mensagemRica = `🛡️ <b style="color:#00f2ff;">O ESCUDO MÁGICO ABSORVEU TODO O DANO!</b><br>`;
            } else {
                mensagemRica = `${msgDefesa}<br>`;
            }
            
            mensagemRica += logPassiva; 
            if (danoParaAplicar > 0) mensagemRica += `<span style="font-size: 11px; color: #cccccc;">[❤️ ${hpVisualAntes} ➔ ${hpVisualDepois}]</span>`;
            
            if (mensagemRica.trim() !== "") {
                window.combate.notificarCombate(dadosAlvo.nome.toUpperCase(), mensagemRica, danoParaAplicar > 0 ? "#ff4d4d" : "#aaa");
            }

            if (novoHP <= 0) {
                window.combate.notificarCombate(dadosAlvo.nome.toUpperCase(), "💀 DERROTADO PELA MAGIA!", "#ff0000");
                if (window.lootEngine) window.lootEngine.processarMorte(idAlvo, dadosAlvo, 10);
            }

            if (danoParaAplicar > 0) {
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