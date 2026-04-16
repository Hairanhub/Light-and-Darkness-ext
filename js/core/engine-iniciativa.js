/* ============================================================ 
   === [ ENGINE DE INICIATIVA - V6.2 (SISTEMA DE RANKS DE INVOCAÇÃO) ] === 
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

        const painelMult = document.getElementById('painel-multiplicadores');
        if(painelMult) painelMult.style.display = "block";

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
        
        // 🔥 NOVA LÓGICA DE INVOCAÇÃO (RANKS E ATRIBUTOS)
        const processarInvocacao = async (itemData, dadosInvocador, idInvocador, donoNome) => {
            if (!itemData) return;
            
            const nomeArma = (itemData.nome || "").toLowerCase();
            const tipoEspecifico = (itemData.tipoEspecifico || "").toLowerCase();
            
            const ehTomo = nomeArma.includes("tomo") || tipoEspecifico.includes("tomo");
            const ehPergaminho = nomeArma.includes("pergaminho") || tipoEspecifico.includes("pergaminho");

            if (!ehTomo && !ehPergaminho) return;

            // 1. Descobrir a Raridade da Arma
            let raridadeArma = (itemData.raridade || "").toLowerCase();
            if (!raridadeArma) {
                if (nomeArma.includes("lend")) raridadeArma = "lendario";
                else if (nomeArma.includes("raro") || nomeArma.includes("rara")) raridadeArma = "raro";
                else raridadeArma = "comum"; 
            }

            // 2. Mapear o Rank Exato que a arma exige
            let rankAlvo = "G";
            if (ehTomo) {
                if (raridadeArma.includes("lend")) rankAlvo = "C";
                else if (raridadeArma.includes("raro")) rankAlvo = "E";
                else rankAlvo = "G";
            } else if (ehPergaminho) {
                if (raridadeArma.includes("lend")) rankAlvo = "B";
                else if (raridadeArma.includes("raro")) rankAlvo = "D";
                else rankAlvo = "F";
            }

            const snapMonstros = await window.database.ref('monstros').once('value');
            let candidatos = [];

            // 3. Buscar no banco monstros com "Atributo = Lendário" e o "Rank" calculado
            if (snapMonstros.exists()) {
                snapMonstros.forEach(child => {
                    const m = child.val();
                    const mRank = String(m.rank || m.Rank || "").toUpperCase().trim();
                    
                    // Suporte para o seu sistema: Pode estar salvo como atributo, elemento ou tipo
                    const mAtributo = String(m.atributo || m.elemento || m.tipoElemento || "").toLowerCase();

                    if (mAtributo.includes("lend") && mRank === rankAlvo) {
                        candidatos.push(m);
                    }
                });
            }

            if (candidatos.length > 0) {
                // Sorteia um monstro aleatório caso haja mais de um da mesma classe!
                const monstroTemplate = candidatos[Math.floor(Math.random() * candidatos.length)];

                // Posiciona a 2 SQM (70px) aleatoriamente (Horizontal ou Vertical)
                const offsets = [-70, 70];
                const offsetX = Math.random() > 0.5 ? offsets[Math.floor(Math.random() * offsets.length)] : 0;
                const offsetY = offsetX === 0 ? offsets[Math.floor(Math.random() * offsets.length)] : 0;
                
                const novoX = dadosInvocador.x + offsetX;
                const novoY = dadosInvocador.y + offsetY;

                const multiplicadorDano = ehTomo ? 0.5 : 1;
                const idInvocacao = 'invoc_' + Math.random().toString(36).substr(2, 9);
                
                const tokenInvocacao = {
                    ...monstroTemplate,
                    id: idInvocacao,
                    x: novoX,
                    y: novoY,
                    isInvocacao: true,
                    invocadorId: idInvocador, 
                    dono: donoNome,
                    danoMultiplicador: multiplicadorDano,
                    hpAtual: monstroTemplate.atributos?.hp || 20 
                };

                await window.mapaRef.child('tokens').child(idInvocacao).set(tokenInvocacao);

                const dex = parseInt(tokenInvocacao.atributos?.dex) || 0;
                let d20 = Math.floor(Math.random() * 20) + 1;
                
                resultados.push({
                    id: idInvocacao,
                    nome: tokenInvocacao.nome,
                    img: tokenInvocacao.url || tokenInvocacao.img || "https://via.placeholder.com/45",
                    iniciativa: d20 + dex,
                    dono: donoNome
                });

                if (typeof window.enviarMensagemChat === 'function') {
                    window.enviarMensagemChat("INVOCAÇÃO ANCESTRAL", `✨ O <b>${itemData.nome}</b> de <b>${dadosInvocador.nome}</b> pulsa energia!<br><b>${tokenInvocacao.nome} (Rank ${rankAlvo})</b> emergiu no campo de batalha!`, "#00d4ff");
                }
            }
        };

        for(let id of this.participantesIds) {
            const snap = await window.mapaRef.child('tokens').child(id).once('value');
            const dados = snap.val();
            if(!dados) continue;

            if (dados.tipo === 'monstro' || dados.tipo === 'npc') {
                const cat = dados.tipo === 'monstro' ? 'monstros' : 'npcs';
                window.database.ref(cat).orderByChild('nome').equalTo(dados.nome).once('value', libSnap => {
                    libSnap.forEach(child => child.ref.update({ descoberto: true }));
                });
            }

            const dex = parseInt(dados.atributos?.dex) || 0;
            let d20 = Math.floor(Math.random() * 20) + 1;
            let total = d20 + dex;
            const nomePersonagem = dados.nome || "Token";

            // 🔥 VERIFICAÇÃO DE INVENTÁRIO (MAGIAS E INVOCAÇÕES)
            let temMaldicao = false;
            if (dados.passivaAtiva && String(dados.passivaAtiva).toUpperCase().includes("MALDICAO")) {
                temMaldicao = true;
            } else if (dados.dono) {
                try {
                    const donoFormatado = String(dados.dono).trim();
                    const invSnap = await window.database.ref('usuarios').child(donoFormatado).child('inventario').once('value');
                    const inv = invSnap.val() || {};
                    
                    if (inv['67'] && JSON.stringify(inv['67']).toUpperCase().includes("MALDICAO")) temMaldicao = true;

                    if (dados.tipo === 'jogador' || dados.dono) {
                        let slot63 = inv['63'];
                        let slot65 = inv['65'];
                        
                        try { if (typeof slot63 === 'string') slot63 = JSON.parse(slot63); } catch(e){}
                        try { if (typeof slot65 === 'string') slot65 = JSON.parse(slot65); } catch(e){}

                        await processarInvocacao(slot63, dados, id, donoFormatado);
                        await processarInvocacao(slot65, dados, id, donoFormatado);
                    }
                } catch(e) { console.warn("Erro ao ler inventário no banco de dados", e); }
            }

            if (temMaldicao) {
                total = 999; 
                await window.mapaRef.child('tokens').child(id).update({ furtivo: true });
                
                if (typeof window.enviarMensagemChat === 'function') {
                    window.enviarMensagemChat("MARCA DA MALDIÇÃO", `👻 <b>${nomePersonagem}</b> desapareceu nas sombras e atacará primeiro!`, "#8a2be2");
                }
            } else {
                if (typeof window.enviarMensagemChat === 'function') {
                    window.enviarMensagemChat(
                        "⏱️ INICIATIVA", 
                        `<b>${nomePersonagem}</b> rolou <b>${total}</b> <span style="font-size:11px; color:#aaa;">(D20: ${d20} + Dex: ${dex})</span>`, 
                        "#00ffcc"
                    );
                }
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

            const eMeuToken = p.dono && meuUsuario && p.dono.toLowerCase() === meuUsuario.toLowerCase();
            const eVezDele = index === this.turnoAtual;

            if (euSouGM || (eMeuToken && eVezDele)) {
                div.style.cursor = "pointer";
                div.style.border = "2px solid #00ffcc"; 
                
                div.onclick = () => { 
                    let msg = euSouGM ? `Pular para o turno de ${p.nome}?` : `Encerrar seu turno (${p.nome})?`;
                    if(confirm(msg)) {
                        if (euSouGM) {
                            this.turnoAtual = index;
                            this.focarTurnoAtual();
                        } else {
                            this.proximoTurno();
                        }
                    }
                }
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
        
        if (window.mapaRef) {
            window.mapaRef.child('tokens').once('value', snap => {
                let listaRevividos = [];
                if(snap.exists()) {
                    snap.forEach(child => {
                        const tk = child.val();
                        
                        // AUTO-DELETAR INVOCAÇÕES AO FIM DO COMBATE
                        if (tk.isInvocacao) {
                            child.ref.remove();
                            return; 
                        }

                        const temDono = (tk.dono && tk.dono.trim() !== "");
                        const isJogador = (tk.tipo === 'jogador' || temDono);
                        
                        const hpVerificador = parseFloat(tk.hpAtual !== undefined ? tk.hpAtual : (tk.atributos?.hp || 20));
                        
                        if (isJogador && (hpVerificador <= 0 || tk.morte)) {
                            child.ref.update({ hpAtual: 1, "atributos/hp": 1, morte: null });
                            
                            let mults = { con: 1 };
                            if (window.combate && window.combate.obterMultiplicadores) {
                                mults = window.combate.obterMultiplicadores(tk);
                            } else if (window.multiplicadoresGlobais) {
                                mults = window.multiplicadoresGlobais;
                            }
                            const hpVisualFinal = 1 * (mults.con || 1);
                            
                            listaRevividos.push(`<b>${tk.nome}</b> (${hpVisualFinal} HP)`);
                        }
                    });
                }
                
                if (listaRevividos.length > 0 && typeof window.enviarMensagemChat === 'function') {
                    window.enviarMensagemChat("FIM DO COMBATE", `🌟 A poeira abaixa... Os caídos recuperam o fôlego!<br>${listaRevividos.join(', ')}`, "#2ecc71");
                }
            });
        }

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

        let movRestante = dadosToken.movimentoMaximo !== undefined ? dadosToken.movimentoMaximo : 8;
        if (dadosToken.membroPerdido && dadosToken.membroPerdido.includes('Perna')) {
            movRestante = 1; 
            if (typeof window.enviarMensagemChat === 'function') {
                window.enviarMensagemChat("SISTEMA", `⚠️ <b>${dadosToken.nome}</b> está rastejando (Movimento reduzido a 1)!`, "#ff9900");
            }
        }

        await window.mapaRef.child('tokens').child(idAtivo).update({
            movimentoRestante: movRestante
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

    window.mapaRef.child('tokens').on('child_changed', (snap) => {
        const data = snap.val();
        const el = document.getElementById(`token-${snap.key}`);
        if (el) {
            if (data.furtivo) {
                el.style.opacity = "0.4";
                el.style.filter = "drop-shadow(0 0 10px #8a2be2)";
            } else {
                el.style.opacity = "1";
                el.style.filter = "none";
            }
        }
    });

    window.mapaRef.child('tokens').on('child_added', (snap) => {
        setTimeout(() => { 
            const data = snap.val();
            const el = document.getElementById(`token-${snap.key}`);
            if (el && data.furtivo) {
                el.style.opacity = "0.4";
                el.style.filter = "drop-shadow(0 0 10px #8a2be2)";
            }
        }, 500); 
    });
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', window.initEngineIniciativa);
else window.initEngineIniciativa();