/* ============================================================ 
   === [ ENGINE DE INICIATIVA - V5.5 (CHAT PADRONIZADO) ] === 
   ============================================================ */

window.iniciativa = {
    participantesIds: [],
    modoSelecao: false,
    fila: [],
    turnoAtual: 0,

    togglePainel: function() {
        const panel = document.getElementById('panel-mestre');
        if (!panel) return;
        panel.classList.toggle('active');
        const icon = panel.querySelector('.panel-trigger i');
        if (icon) icon.className = panel.classList.contains('active') ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up';
    },

    limparDestaquesVisuais: function() {
        document.querySelectorAll('.token-vtt').forEach(el => {
            el.style.boxShadow = "none";
            el.classList.remove('vez-do-token');
            el.classList.remove('incorporado-mestre');
            el.style.outline = "none";
        });
    },

    sairSemLimpar: function() {
        this.modoSelecao = false;
        this.limparDestaquesVisuais();
        if(window.spellEngine) window.spellEngine.desincorporar();
        const panel = document.getElementById('panel-mestre');
        if(panel) panel.classList.remove('active');

        // 🔥 O COMBATE ACABOU: O painel de atributos volta a aparecer
        const painelMult = document.getElementById('painel-multiplicadores');
        if(painelMult) painelMult.style.display = "block";

        // Reseta o botão de selecionar
        const btn = document.getElementById('btn-init-mode');
        if(btn) { btn.style.background = ""; btn.innerHTML = "<i class='fa-solid fa-mouse-pointer'></i> Selecionar Participantes"; }
    },

    removerDaFila: function(tokenId) {
        const indexNaFila = this.fila.findIndex(p => p.id === tokenId);
        if (indexNaFila !== -1) {
            if (indexNaFila < this.turnoAtual) {
                this.turnoAtual--;
            } else if (indexNaFila === this.turnoAtual && this.turnoAtual === this.fila.length - 1) {
                this.turnoAtual = 0;
            }
            this.fila.splice(indexNaFila, 1);
            if (this.fila.length === 0) {
                this.limparRapido();
            } else {
                window.mapaRef.update({ filaIniciativa: this.fila, turnoAtual: this.turnoAtual });
                if (indexNaFila === this.turnoAtual) this.focarTurnoAtual();
            }
        }
        const idxSel = this.participantesIds.indexOf(tokenId);
        if (idxSel !== -1) this.participantesIds.splice(idxSel, 1);
    },

    toggleModoSelecao: function() {
        this.modoSelecao = !this.modoSelecao;
        const btn = document.getElementById('btn-init-mode');
        const btnRoll = document.getElementById('btn-roll-init');
        
        if(this.modoSelecao) {
            if(btn) { btn.style.background = "#28a745"; btn.innerHTML = "Confirmar Seleção"; }
            if(btnRoll) btnRoll.style.display = "none";
            this.participantesIds = [];
            this.limparDestaquesVisuais();
        } else {
            if(btn) { btn.style.background = ""; btn.innerHTML = "<i class='fa-solid fa-mouse-pointer'></i> Selecionar Participantes"; }
            if(this.participantesIds.length > 0 && btnRoll) btnRoll.style.display = "inline-block";
        }
    },

    adicionarOuRemover: function(tokenId) {
        const index = this.participantesIds.indexOf(tokenId);
        const el = document.getElementById(`token-${tokenId}`);
        if(index === -1) {
            this.participantesIds.push(tokenId);
            if(el) el.style.boxShadow = "0 0 15px 5px #00ffcc";
        } else {
            this.participantesIds.splice(index, 1);
            if(el) el.style.boxShadow = "none";
        }
    },

    rolarTodos: async function() {
        if (this.participantesIds.length === 0) return alert("Selecione os tokens primeiro!");

        let resultados = [];
        for(let id of this.participantesIds) {
            const snap = await window.mapaRef.child('tokens').child(id).once('value');
            const dados = snap.val();
            if(!dados) continue;

            // REVELAÇÃO (CÓDICE)
            if (dados.tipo === 'monstro' || dados.tipo === 'npc') {
                const cat = dados.tipo === 'monstro' ? 'monstros' : 'npcs';
                window.database.ref(cat).orderByChild('nome').equalTo(dados.nome).once('value', libSnap => {
                    libSnap.forEach(child => child.ref.update({ descoberto: true }));
                });
            }

            const dex = parseInt(dados.atributos?.dex) || 0;
            const d20 = Math.floor(Math.random() * 20) + 1;
            const total = d20 + dex;
            const nomePersonagem = dados.nome || "Token";

            if (typeof window.enviarMensagemChat === 'function') {
                window.enviarMensagemChat(
                    "⏱️ INICIATIVA", 
                    `<b>${nomePersonagem}</b> rolou <b>${total}</b> <span style="font-size:11px; color:#aaa;">(D20: ${d20} + Dex: ${dex})</span>`, 
                    "#00ffcc"
                );
            }

            resultados.push({
                id: id,
                nome: nomePersonagem,
                img: dados.url || dados.img || "https://via.placeholder.com/45",
                iniciativa: total,
                dono: dados.dono || ""
            });
        }

        this.fila = resultados.sort((a, b) => b.iniciativa - a.iniciativa);
        this.turnoAtual = 0;
        this.modoSelecao = false;
        
        const btnRoll = document.getElementById('btn-roll-init');
        if(btnRoll) btnRoll.style.display = "none";

        // 🔥 O COMBATE COMEÇOU: Esconde o painel de multiplicadores para limpar a tela
        const painelMult = document.getElementById('painel-multiplicadores');
        if (painelMult) painelMult.style.display = "none";
        
        this.focarTurnoAtual();
    },

    focarTurnoAtual: function() {
        this.limparDestaquesVisuais();
        const personagemAtivo = this.fila[this.turnoAtual];
        
        if (personagemAtivo) {
            window.mapaRef.update({ 
                turnoAtivo: personagemAtivo.id,
                turnoAtual: this.turnoAtual,
                filaIniciativa: this.fila 
            });

            const el = document.getElementById(`token-${personagemAtivo.id}`);
            if(window.spellEngine) {
                window.spellEngine.incorporarToken(personagemAtivo.id, personagemAtivo.nome, el);
            }
        }
    },

    renderizarBarraTurno: function() {
        const bar = document.getElementById('turn-order-bar');
        if(!bar) return;
        
        if(!this.fila || this.fila.length === 0) { 
            bar.style.display = 'none'; 
            bar.innerHTML = ''; 
            return; 
        }

        bar.style.display = 'flex';
        bar.innerHTML = '';

        const euSouGM = localStorage.getItem('rubi_role') === 'gm';
        const meuUsuario = localStorage.getItem('rubi_username');

        this.fila.forEach((p, index) => {
            const div = document.createElement('div');
            div.className = index === this.turnoAtual ? 'turn-item active' : 'turn-item';
            div.style.backgroundImage = `url('${p.img}')`;
            div.title = `${p.nome} (Init: ${p.iniciativa})`;

            // 🔥 LÓGICA DE CLIQUE NA BARRA (TRAVA SEGURA)
            const eMeuToken = p.dono && meuUsuario && p.dono.toLowerCase() === meuUsuario.toLowerCase();
            const eVezDele = index === this.turnoAtual;

            if (euSouGM || (eMeuToken && eVezDele)) {
                div.style.cursor = "pointer";
                div.style.border = "2px solid #00ffcc"; // Dica visual que pode clicar
                
                div.onclick = () => { 
                    let msg = euSouGM ? `Pular para o turno de ${p.nome}?` : `Encerrar seu turno (${p.nome})?`;
                    if(confirm(msg)) {
                        // Se for GM pula pra onde clicou. Se for Player, apenas avança (Next)
                        if (euSouGM) {
                            this.turnoAtual = index;
                            this.focarTurnoAtual();
                        } else {
                            this.proximoTurno();
                        }
                    }
                };
            } else {
                div.style.cursor = "default";
                div.style.opacity = index === this.turnoAtual ? "1" : "0.7";
            }
            
            bar.appendChild(div);
        });
    },

    proximoTurno: function() {
        if(this.fila.length === 0) return;
        this.turnoAtual = (this.turnoAtual + 1) % this.fila.length;
        this.focarTurnoAtual();
    },

    limpar: function() {
        if(!confirm("Encerrar combate e limpar fila?")) return;
        this.limparRapido();
    },

    limparRapido: function() {
        this.participantesIds = [];
        this.fila = [];
        this.turnoAtual = 0;
        this.modoSelecao = false;
        this.limparDestaquesVisuais();
        if(window.spellEngine) window.spellEngine.desincorporar();
        window.mapaRef.update({ turnoAtivo: null, turnoAtual: null, filaIniciativa: null });
        this.sairSemLimpar();
    },

    deletarSelecionados: function() {
        if(this.participantesIds.length === 0) return alert("Selecione tokens primeiro!");
        if(!confirm(`Deletar ${this.participantesIds.length} tokens?`)) return;
        this.participantesIds.forEach(id => window.mapaRef.child('tokens').child(id).remove());
        this.participantesIds = [];
        this.toggleModoSelecao();
    }
};

window.toggleBottomPanel = function() { window.iniciativa.togglePainel(); };

window.initEngineIniciativa = function() {
    if(!window.mapaRef) { setTimeout(window.initEngineIniciativa, 500); return; }

    window.mapaRef.child('filaIniciativa').on('value', snap => {
        window.iniciativa.fila = snap.val() || [];
        window.iniciativa.renderizarBarraTurno();
    });

    window.mapaRef.child('turnoAtual').on('value', snap => {
        const val = snap.val();
        if (val !== null) {
            window.iniciativa.turnoAtual = val;
            window.iniciativa.renderizarBarraTurno();
        }
    });

    window.mapaRef.child('turnoAtivo').on('value', async snapshot => {
        const idAtivo = snapshot.val();
        if (!idAtivo) { if (window.iniciativa) window.iniciativa.limparDestaquesVisuais(); return; }

        const snapToken = await window.mapaRef.child('tokens').child(idAtivo).once('value');
        const dadosToken = snapToken.val();
        if (!dadosToken) return;

        if (window.StatusSystem && typeof window.StatusSystem.processarTurno === "function") {
            await window.StatusSystem.processarTurno(idAtivo);
        }

        if (window.PassiveSystem && typeof window.PassiveSystem.rodarAuraVeneno === "function") {
            const meuNome = window.usuarioLogadoNome || localStorage.getItem('rubi_username');
            if (dadosToken.dono && meuNome && dadosToken.dono.toLowerCase() === meuNome.toLowerCase()) {
                window.PassiveSystem.rodarAuraVeneno(idAtivo, dadosToken.x, dadosToken.y);
            }
        }

        await window.mapaRef.child('tokens').child(idAtivo).update({
            movimentoRestante: dadosToken.movimentoMaximo !== undefined ? dadosToken.movimentoMaximo : 8
        });

        window.iniciativa.limparDestaquesVisuais();
        const el = document.getElementById(`token-${idAtivo}`);
        if (el) {
            el.classList.add('vez-do-token');
            el.style.boxShadow = "0 0 20px 5px rgba(255, 255, 255, 0.7)";
        }
    });

    window.mapaRef.child('tokens').on('child_removed', (snap) => {
        if (window.iniciativa) window.iniciativa.removerDaFila(snap.key);
    });
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', window.initEngineIniciativa);
else window.initEngineIniciativa();