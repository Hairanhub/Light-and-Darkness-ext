/**
 * js/jogador/inventario.js
 * Sistema de Inventário (Modo Restrito - Layout de 13 Slots)
 * Versão: 4.3 - Trava de Combate e Restrição de Mochila 🎒⚔️
 */

window.Inventario = {
    totalSlots: 60,
    refInventario: null,

    removerItemDoSlot(index) {
        if (!this.refInventario) {
            const nome = window.usuarioLogadoNome || localStorage.getItem('rubi_username');
            this.refInventario = window.database.ref('usuarios').child(nome).child('inventario');
        }
        this.refInventario.child(String(index)).remove()
            .then(() => { console.log("✅ [SUCESSO] Slot limpo no banco de dados."); })
            .catch(err => console.error("❌ Erro ao remover do slot:", err));
    },

    init(nomeUsuario) {
        if (!nomeUsuario) return;

        window.usuarioLogadoNome = nomeUsuario; 
        this.refInventario = window.database.ref('usuarios').child(nomeUsuario).child('inventario');
        
        this.mapearSlotsEquipamentoManual();

        const grid = document.getElementById('grid-principal');
        if (grid) this.gerarSlots();

        const imgInvisivel = new Image();
        imgInvisivel.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

        const tratarDragStart = (e) => {
            // 🔥 RESTRIÇÃO 1: TRAVA DE INICIATIVA
            if (window.iniciativa && window.iniciativa.fila && window.iniciativa.fila.length > 0) {
                const isGM = localStorage.getItem('rubi_role') === 'gm';
                if (!isGM) {
                    alert("⚔️ TENSÃO DE COMBATE! Você não pode trocar equipamentos ou mexer na mochila agora.");
                    e.preventDefault();
                    return;
                }
            }

            const slot = e.target.closest('.item-slot, .equip-slot');
            if (slot && slot.dataset.itemFullData) {
                const index = slot.dataset.slotIndex;
                if(index === undefined) return;

                const data = JSON.parse(slot.dataset.itemFullData);

                e.dataTransfer.clearData();
                e.dataTransfer.setData('application/json', slot.dataset.itemFullData);
                e.dataTransfer.setData('indexOrigem', index);
                e.dataTransfer.effectAllowed = "move";

                e.dataTransfer.setDragImage(imgInvisivel, 0, 0);

                slot.dataset.isDragging = "true";

                window.itemSendoArrastadoIndex = index;
                window.itemSendoArrastadoData = data;
                window.slotOrigemId = slot.id; 
                
                slot.style.opacity = "0.4";
                if (e.target.tagName === 'IMG') e.target.style.opacity = "0.5";
            }
        };

        const tratarDragEnd = (e) => {
            const slot = e.target.closest('.item-slot, .equip-slot');
            if (slot) delete slot.dataset.isDragging;
            
            document.querySelectorAll('.item-slot, .equip-slot').forEach(s => {
                s.style.opacity = "1";
                s.style.borderColor = "";
                s.style.backgroundColor = "";
            });

            if (e.target.tagName === 'IMG') e.target.style.opacity = "1";
            setTimeout(() => { window.itemSendoArrastadoIndex = null; }, 100);
        };

        if (grid) {
            grid.addEventListener('dragstart', tratarDragStart);
            grid.addEventListener('dragend', tratarDragEnd);
        }

        setTimeout(() => {
            const equipSlots = document.querySelectorAll('.equip-slot');
            equipSlots.forEach(slot => {
                slot.setAttribute('draggable', 'true'); 
                slot.addEventListener('dragstart', tratarDragStart);
                slot.addEventListener('dragend', tratarDragEnd);
                
                slot.ondragover = (e) => this.handleDragOverVisuais(e, slot);
                
                slot.ondragleave = () => {
                    slot.style.borderColor = "";
                    slot.style.backgroundColor = "";
                };
                slot.ondrop = (e) => this.handleDropInternal(e, slot);

                slot.ondblclick = () => this.usarItemConsumivel(slot);
                
                // 🔥 NOVA LÓGICA DE CLIQUE: Dispara a engine se for slot de magia (69 a 72)
                slot.onclick = (e) => {
                    const index = parseInt(slot.dataset.slotIndex);
                    if (index >= 69 && index <= 72) {
                        this.usarMagia(slot);
                    }
                };
            });
        }, 1000);

        this.sincronizarComFirebase();
        window.Inventario = this;
        this.ativarGerenciadorTooltip();
    },
    
    mapearSlotsEquipamentoManual() {
        const mapa = {
            'pot': 60, 'pocao': 60,
            'colar': 61,
            'runa': 62,
            'mao-dir': 63, 'arma-1': 63,
            'torso': 64, 'armadura': 64,
            'mao-esq': 65, 'arma-2': 65,
            'anel-1': 66,
            'passiva': 67,
            'anel-2': 68,
            'magia-1': 69,
            'magia-2': 70,
            'magia-3': 71,
            'magia-4': 72
        };
        const indicesUsados = {};

        document.querySelectorAll('.equip-slot').forEach(slot => {
            let tipo = slot.dataset.slot;
            
            if (tipo === 'anel') tipo = indicesUsados[66] ? 'anel-2' : 'anel-1';
            if (tipo === 'arma') tipo = indicesUsados[63] ? 'mao-esq' : 'mao-dir';
            if (tipo === 'magia') {
                if (!indicesUsados[69]) tipo = 'magia-1';
                else if (!indicesUsados[70]) tipo = 'magia-2';
                else if (!indicesUsados[71]) tipo = 'magia-3';
                else if (!indicesUsados[72]) tipo = 'magia-4';
            }

            if (mapa[tipo]) {
                const index = mapa[tipo];
                if (!indicesUsados[index]) {
                    slot.dataset.slotIndex = index;
                    indicesUsados[index] = true;
                }
            }
        });
    },

    gerarSlots() {
        const container = document.getElementById('grid-principal');
        if (!container) return;

        container.innerHTML = '';
        for (let i = 0; i < this.totalSlots; i++) {
            const slot = document.createElement('div');
            slot.className = 'item-slot';
            slot.dataset.slotIndex = i;

            slot.onclick = (e) => { };

            slot.ondblclick = () => this.usarItemConsumivel(slot);

            slot.ondragover = (e) => this.handleDragOverVisuais(e, slot);

            slot.ondragleave = () => { slot.style.borderColor = ""; slot.style.backgroundColor = ""; };
            slot.ondrop = (e) => this.handleDropInternal(e, slot);

            container.appendChild(slot);
        }
    },

    // =======================================================
    // 🔥 MOTOR DE CONSUMO (LIGADO AO ENGINE-CHAT E AO MESTRE)
    // =======================================================
    usarItemConsumivel(slot) {
        if (!slot.dataset.itemFullData) return;

        // 🔥 RESTRIÇÃO 2: VERIFICA SE ESTÁ NA MOCHILA (Slots 0 a 59)
        const slotIndex = parseInt(slot.dataset.slotIndex);
        if (slotIndex < 60) {
            alert("🎒 ITEM NA MOCHILA! Você precisa equipar este item em um dos seus atalhos (Poção ou Runa) antes de usá-lo.");
            return;
        }

        const item = JSON.parse(slot.dataset.itemFullData);
        const tipoStr = (item.tipoItem || item.tipo || "").toLowerCase();
        const nomeDono = window.usuarioLogadoNome || localStorage.getItem('rubi_username');

        // 1. LÓGICA DE POÇÕES
        if (tipoStr.includes('poção') || tipoStr.includes('pocao') || tipoStr.includes('pot') || item.nome.toLowerCase().includes('poção')) {
            
            let cura = parseInt(item.valorCura) || 
                       parseInt(item['reg-pocao-cura']) || 
                       (item.atributos && parseInt(item.atributos['reg-pocao-cura'])) || 
                       (item.atributos && parseInt(item.atributos.cura)) || 
                       parseInt(item.cura) || 
                       parseInt(item.pocaoCura) || 
                       parseInt(item.valor) || 
                       parseInt(item.efeito);

            if (isNaN(cura) || cura <= 0) {
                alert(`⚠️ A poção "${item.nome}" não tem um valor válido de cura! O Mestre precisa definir este valor ao criar a poção.`);
                return;
            }

            if (window.mapaRef) {
                window.mapaRef.child('tokens').once('value', snap => {
                    let curou = false;

                    snap.forEach(child => {
                        const tk = child.val();
                        if (tk.dono && tk.dono.toLowerCase() === nomeDono.toLowerCase()) {
                            let hpAtual = parseInt(tk.hpAtual) || 0;
                            let hpMax = parseInt(tk.hpMax) || 0;

                            if (hpAtual < hpMax) {
                                hpAtual += cura;
                                if (hpAtual > hpMax) hpAtual = hpMax; 

                                child.ref.update({ hpAtual: hpAtual });
                                curou = true;

                                if (typeof window.enviarMensagemChat === 'function') {
                                    const msgPoçao = `bebeu a <b>${item.nome}</b> e recuperou <b style="color:#ff4d4d;">+${cura} HP</b>! (${hpAtual}/${hpMax})`;
                                    window.enviarMensagemChat(nomeDono, msgPoçao, "#ff4d4d"); 
                                }
                            } else {
                                alert("Sua Vida já está cheia!");
                            }
                        }
                    });

                    if (curou) {
                        this.removerItemDoSlot(slot.dataset.slotIndex);
                    }
                });
            } else {
                alert("Você precisa estar com o seu token no mapa para beber a poção.");
            }
        }
        
        // 2. LÓGICA DE RUNAS
        else if (tipoStr.includes('runa') || item.nome.toLowerCase().includes('runa')) {
            const descricao = item.descricao || item.efeito || "A runa dissipa-se em energia mágica...";
            const rankRuna = item.rank || item.rankRuna || item.runaRank || item['reg-runa-rank'] || (item.atributos && item.atributos['reg-runa-rank']) || "?";
            
            if (typeof window.enviarMensagemChat === 'function') {
                const msgRuna = `ativou a <b>${item.nome}</b> <span style="color:#00f2ff; font-size:11px;">[Rank ${rankRuna}]</span>.<br><i style="color:#ccc;">"${descricao}"</i>`;
                window.enviarMensagemChat(nomeDono, msgRuna, "#00f2ff"); 
            }

            this.removerItemDoSlot(slot.dataset.slotIndex);
        }
    },

    // =======================================================
    // 🔥 MOTOR DE MAGIAS (LIGADO AO SPELL-ENGINE)
    // =======================================================
    usarMagia(slot) {
        if (!slot.dataset.itemFullData) return;

        const item = JSON.parse(slot.dataset.itemFullData);
        const tipoStr = (item.tipoItem || item.tipo || "").toLowerCase();
        
        if (tipoStr !== 'magia' && !(item.nome || "").toLowerCase().includes('magia')) return;

        const nomeJogador = window.usuarioLogadoNome || localStorage.getItem('rubi_username');
        if (!nomeJogador) return;

        // 1. Busca Inteligente: Procura o token no mapa pelo nome do dono
        if (window.mapaRef) {
            window.mapaRef.child('tokens').once('value', snap => {
                let meuTokenId = null;
                let meuTokenNome = null; 

                snap.forEach(child => {
                    const tk = child.val();
                    if (tk.dono && tk.dono.toLowerCase() === nomeJogador.toLowerCase()) {
                        meuTokenId = child.key;
                        meuTokenNome = tk.nome; 
                    }
                });

                if (!meuTokenId) {
                    alert("Você precisa colocar seu token no mapa primeiro!");
                    return;
                }

                // =======================================================
                // 2. VERIFICAÇÃO DE TURNO (ID + NOME DO PERSONAGEM)
                // =======================================================
                const turnoAtivoEl = document.querySelector('#turn-order-bar .turn-item.active');

                if (turnoAtivoEl) {
                    const tokenLimpo = String(meuTokenId).replace('turn-', '').replace('token-', '');
                    const htmlDoTurno = turnoAtivoEl.outerHTML;
                    const textoDoTurno = turnoAtivoEl.innerText || "";

                    const ehMeuTurno = htmlDoTurno.includes(tokenLimpo) || 
                                       textoDoTurno.includes(meuTokenNome) || 
                                       htmlDoTurno.includes(meuTokenNome) || 
                                       textoDoTurno.includes(nomeJogador);

                    if (!ehMeuTurno) {
                        console.warn("Bloqueado. O HTML do turno ativo era:", htmlDoTurno);
                        console.warn(`Procuramos por: ID [${tokenLimpo}] ou Nome [${meuTokenNome}]`);
                        alert("⏳ Calma, viajante! Aguarde o seu turno para conjurar magias.");
                        return; 
                    }
                }
                // =======================================================

                // 3. Pega o elemento HTML do token
                const meuTokenEl = document.getElementById(`token-${meuTokenId}`);
                if (!meuTokenEl) {
                    alert("Erro: Seu token não está renderizado visualmente no mapa.");
                    return;
                }

                // 4. PREPARAÇÃO DA MIRA MAGICA
                if (window.spellEngine) {
                    window.spellEngine.tokenControlado = { 
                        id: meuTokenId, 
                        nome: nomeJogador, 
                        el: meuTokenEl 
                    };
                    
                    console.log(`🪄 Preparando magia [${item.nome}]...`);
                    
                    if (item.matrizArea) {
                        window.spellEngine.magiaAtiva = item; 
                        window.spellEngine.ativarModoMira();  
                    } else {
                        const idDaMagia = item.idDb || item.key || item.id;
                        if (idDaMagia) {
                            window.spellEngine.prepararConjuracao(idDaMagia);
                        } else {
                            alert("❌ O Mestre criou esta magia sem desenhar a área de efeito (os quadradinhos) nela!");
                        }
                    }
                } else {
                    console.error("Motor de magias (spellEngine) não encontrado.");
                }
            });
        } else {
            alert("O mapa VTT não está carregado ou conectado no momento.");
        }
    },

    handleDragOverVisuais(e, slot) {
        e.preventDefault(); 
        const indexDestino = slot.dataset.slotIndex;
        let podeEquipar = true;
        const slotOcupado = slot.dataset.itemFullData ? true : false;
        
        const indexOrigem = window.itemSendoArrastadoIndex;
        const veioDoMapa = (indexOrigem === undefined || indexOrigem === null || indexOrigem === "undefined");

        if (slot.classList.contains('slot-bloqueado')) {
            podeEquipar = false;
        } 
        else if (window.itemSendoArrastadoData) {
            podeEquipar = this.verificarRegraDeSlot(window.itemSendoArrastadoData, indexDestino, true);
        }

        if (veioDoMapa && slotOcupado) {
            podeEquipar = false;
        }

        if (podeEquipar) {
            e.dataTransfer.dropEffect = "move"; 
            slot.style.borderColor = "#4CAF50"; 
            slot.style.backgroundColor = "rgba(76, 175, 80, 0.2)";
        } else {
            e.dataTransfer.dropEffect = "none"; 
            slot.style.borderColor = "#e74c3c"; 
            slot.style.backgroundColor = "rgba(231, 76, 60, 0.2)";
        }
    },

    verificarRegraDeSlot(item, indexDestino, silencioso = false) {
        const destino = parseInt(indexDestino);
        
        if (destino < 60) return true;

        const tipoDoItem = (item.tipoItem || item.tipo || "item").toLowerCase();

        const restricoes = {
            60: ['pocao', 'pot', 'poção'],                
            61: ['colar', 'artefato'],           
            62: ['runa'],                        
            63: ['arma', 'artefato'],            
            64: ['armadura'],                    
            65: ['arma', 'artefato', 'escudo'],  
            66: ['anel'],                        
            67: ['passiva'],                     
            68: ['anel'],                        
            69: ['magia'],                       
            70: ['magia'],                       
            71: ['magia'],                       
            72: ['magia']                        
        };

        const tiposAceitos = restricoes[destino];
        if (!tiposAceitos) return false;

        if (!tiposAceitos.includes(tipoDoItem)) return false;

        if (destino === 67) {
            let slotQueSeraBloqueado = null;
            const itemStr = JSON.stringify(item).toUpperCase();
            
            if (itemStr.includes("DRAKAR")) slotQueSeraBloqueado = 68;
            else if (itemStr.includes("ISOLDE")) slotQueSeraBloqueado = 61;
            else if (itemStr.includes("HORUZ")) slotQueSeraBloqueado = 66;

            if (slotQueSeraBloqueado) {
                const slotOcupado = document.querySelector(`[data-slot-index="${slotQueSeraBloqueado}"]`);
                if (slotOcupado && slotOcupado.dataset.itemFullData) {
                    if (!silencioso) alert("⚔️ Acesso Negado! Você precisa remover o item do slot afetado antes de equipar esta passiva.");
                    return false;
                }
            }
        }

        if (window.MotorArmas && typeof window.MotorArmas.checarSeEhDuasMaos === 'function') {
            const ehDuasMaos = window.MotorArmas.checarSeEhDuasMaos(JSON.stringify(item));

            if (destino === 65) {
                if (ehDuasMaos) {
                    if (!silencioso) alert("⚔️ Acesso Negado! Armas de Duas Mãos devem ser equipadas na Mão Principal (Direita).");
                    return false;
                }
                const slotDir = document.querySelector('[data-slot-index="63"]');
                if (slotDir && slotDir.dataset.itemFullData) {
                    if (window.MotorArmas.checarSeEhDuasMaos(slotDir.dataset.itemFullData)) {
                        if (!silencioso) alert("⚔️ Acesso Negado! Você está segurando uma arma de Duas Mãos. Solte-a primeiro.");
                        return false;
                    }
                }
            }
            
            if (destino === 63) {
                if (ehDuasMaos) {
                    const slotEsq = document.querySelector('[data-slot-index="65"]');
                    if (slotEsq && slotEsq.dataset.itemFullData) {
                        if (!silencioso) alert("⚔️ Acesso Negado! Você precisa esvaziar a Mão Esquerda antes de usar uma arma Pesada (2 Mãos).");
                        return false; 
                    }
                }
            }
        }
        return true;
    },

    rejeitarDrop(slotAlvo) {
        slotAlvo.style.borderColor = "red";
        slotAlvo.style.backgroundColor = "rgba(255, 0, 0, 0.2)";
        setTimeout(() => {
            slotAlvo.style.borderColor = "";
            slotAlvo.style.backgroundColor = "";
        }, 500);
    },

    handleDropInternal(e, slotAlvo) {
        e.preventDefault();
        e.stopPropagation();

        slotAlvo.style.borderColor = "";
        slotAlvo.style.backgroundColor = "";

        if (slotAlvo.classList.contains('slot-bloqueado')) {
            alert("🛡️ Este espaço está bloqueado!");
            this.rejeitarDrop(slotAlvo);
            return;
        }

        const dataRaw = e.dataTransfer.getData('application/json');
        const indexOrigem = e.dataTransfer.getData('indexOrigem');
        const indexDestino = slotAlvo.dataset.slotIndex;

        const veioDoMapa = !(indexOrigem !== "" && indexOrigem !== null && indexOrigem !== undefined && indexOrigem !== "undefined");
        const slotOcupado = slotAlvo.dataset.itemFullData ? true : false;

        if (!dataRaw) return;

        try {
            const fullItemData = JSON.parse(dataRaw);
            
            if (veioDoMapa && slotOcupado) {
                this.rejeitarDrop(slotAlvo);
                return;
            }

            if (!this.verificarRegraDeSlot(fullItemData, indexDestino, false)) {
                this.rejeitarDrop(slotAlvo);
                return;
            }

            if (!veioDoMapa) { 
                this.reorganizarSlots(parseInt(indexOrigem), parseInt(indexDestino), fullItemData);
            } else { 
                if (this.refInventario) {
                    this.refInventario.child(String(indexDestino)).set(fullItemData).then(() => {
                        // 1. Remove do Mapa
                        if (fullItemData.key && window.mapaRef) {
                            window.mapaRef.child('tokens').child(fullItemData.key).remove();
                        }

                        // 🔥 2. REVELA NO CÓDICE (Ataque Duplo Seguro - Anti-Fantasmas)
                        const idReal = fullItemData.idDb || fullItemData.id || fullItemData.key;
                        const nomeItem = fullItemData.nome;
                        const tipo = (fullItemData.tipoItem || fullItemData.tipo || "").toLowerCase();
                        const pastaGlobal = (tipo.includes('magia')) ? 'magias' : 'itens';
                        
                        // 1º Tiro: Checa se existe ANTES de atualizar
                        if (idReal) {
                            window.database.ref(`${pastaGlobal}/${idReal}`).once('value', snap => {
                                if (snap.exists()) {
                                    snap.ref.update({ descoberto: true });
                                }
                            });
                        }

                        // 2º Tiro: Varredura pelo Nome (Isso já é seguro por natureza)
                        if (nomeItem) {
                            window.database.ref(pastaGlobal).orderByChild('nome').equalTo(nomeItem).once('value', snap => {
                                if (snap.exists()) {
                                    snap.forEach(child => {
                                        child.ref.update({ descoberto: true });
                                    });
                                    console.log(`✅ [Códice] O item "${nomeItem}" foi destravado sem criar fantasmas!`);
                                }
                            });
                        }
                    });
                }
            }
        } catch (err) { console.error("Erro no drop:", err); }
    },

    async reorganizarSlots(origem, destino, dataOrigem) {
        if (origem === destino || !this.refInventario) return;
        const snapDestino = await this.refInventario.child(String(destino)).once('value');
        const dataDestino = snapDestino.val();
        
        if (dataDestino && !this.verificarRegraDeSlot(dataDestino, origem, true)) {
            alert("⛔ Troca inválida.");
            return;
        }

        const updates = {};
        updates[String(destino)] = dataOrigem;
        updates[String(origem)] = dataDestino ? dataDestino : null;
        
        this.refInventario.update(updates);
    },

    calcularBonusEquipamentos() {
        const bonusTotal = { for: 0, dex: 0, int: 0, def: 0, car: 0, con: 0 };
        let movimentoMaximo = 8;
        let temArmaDuasMaos = false; 

        for (let i = 60; i <= 72; i++) {
            const slot = document.querySelector(`[data-slot-index="${i}"]`);
            
            if (slot && slot.dataset.itemFullData) {
                try {
                    const item = JSON.parse(slot.dataset.itemFullData);
                    
                    if (item.atributos) {
                        bonusTotal.for += parseInt(item.atributos.for) || 0;
                        bonusTotal.dex += parseInt(item.atributos.dex) || 0;
                        bonusTotal.int += parseInt(item.atributos.int) || 0;
                        bonusTotal.def += parseInt(item.atributos.def) || 0;
                        bonusTotal.car += parseInt(item.atributos.car) || 0;
                        bonusTotal.con += parseInt(item.atributos.con) || 0;
                    }

                    if (i === 64) {
                        const itemString = slot.dataset.itemFullData.toLowerCase();
                        if (itemString.includes("pesada")) {
                            movimentoMaximo = 2; 
                        } else if (itemString.includes("media") || itemString.includes("média") || itemString.includes("medio")) {
                            movimentoMaximo = 4; 
                        } else if (itemString.includes("leve")) {
                            movimentoMaximo = 6; 
                        }
                    }

                    if (i === 63 && window.MotorArmas) {
                        const descOuNome = item.descricao || item.nome || "";
                        const armaEquipada = window.MotorArmas.identificarArma(descOuNome);
                        if (armaEquipada && armaEquipada.duasMaos) {
                            temArmaDuasMaos = true;
                        }
                    }
                } catch (e) { console.error("Erro ao ler item:", e); }
            }
        }

        const slotEsq = document.querySelector(`[data-slot-index="65"]`);
        if (slotEsq) {
            if (temArmaDuasMaos) {
                slotEsq.classList.add('slot-bloqueado');
                slotEsq.style.opacity = '0.3';
                slotEsq.style.filter = 'grayscale(100%)';
                slotEsq.style.cursor = 'not-allowed';
                slotEsq.style.pointerEvents = 'auto'; 
            } else {
                slotEsq.classList.remove('slot-bloqueado');
                slotEsq.style.opacity = '1';
                slotEsq.style.filter = 'none';
                slotEsq.style.cursor = 'pointer';
                slotEsq.style.pointerEvents = 'auto';
            }
        }
        
        if (typeof window.atualizarStatusDaFicha === 'function') {
            window.atualizarStatusDaFicha(bonusTotal, movimentoMaximo);
        }

        return bonusTotal;
    },

    // 🔥 1. FUNÇÕES DE REVELAÇÃO NO CÓDICE 🔥
    registrarDescobertaGlobal(itemData) {
        if (!itemData || !window.database) return;

        const nomeItem = itemData.nome;
        const idReal = itemData.idDb || itemData.id || itemData.key;
        const tipo = (itemData.tipoItem || itemData.tipo || "").toLowerCase();
        const pasta = (tipo.includes('magia')) ? 'magias' : 'itens';

        // 🛡️ ANTI-FANTASMAS: Só atualiza se o item já existir!
        if (idReal && idReal !== "undefined") {
            window.database.ref(`${pasta}/${idReal}`).once('value', snap => {
                if (snap.exists()) {
                    snap.ref.update({ descoberto: true }).catch(() => {});
                } else {
                    // Falhou pelo ID? Tenta pelo nome
                    this.revelarPorNomeFallback(pasta, nomeItem);
                }
            });
        } else if (nomeItem) {
            this.revelarPorNomeFallback(pasta, nomeItem);
        }
    },

    revelarPorNomeFallback(pasta, nomeItem) {
        if (!nomeItem) return;
        window.database.ref(pasta).orderByChild('nome').equalTo(nomeItem).once('value', snap => {
            if (snap.exists()) {
                snap.forEach(child => child.ref.update({ descoberto: true }));
            }
        });
    },

    sincronizarComFirebase() {
        if (!this.refInventario) return;
        this.refInventario.on('value', (snap) => {
            
            // --- LIMPEZA DOS SLOTS (Mantive o seu código original) ---
            document.querySelectorAll('.item-slot, .equip-slot').forEach(s => {
                s.style.opacity = "1";
                s.style.borderColor = "";
                s.style.backgroundColor = "";
                s.setAttribute('draggable', 'false');

                if (s.classList.contains('equip-slot')) {
                    const imgInSlot = s.querySelector('img');
                    if(imgInSlot) imgInSlot.remove();
                    const icon = s.querySelector('i');
                    if(icon) icon.style.display = 'block';
                } else {
                    s.innerHTML = '';
                }
                delete s.dataset.itemFullData;
                delete s.dataset.tooltip;
            });

            const itensNoBanco = snap.val();
            
            if (!itensNoBanco) {
                this.calcularBonusEquipamentos();
                return; 
            }

            // --- RENDERIZAÇÃO E DESBLOQUEIO SEGURO ---
            Object.entries(itensNoBanco).forEach(([index, itemData]) => {
                
                // 🛡️ TRAVA DE SEGURANÇA: Pula o "fantasma" do NaN e dados nulos
                if (index === "NaN" || !itemData) return;

                const slot = document.querySelector(`[data-slot-index="${index}"]`);
                if (slot) {
                    try {
                        // 1. Mostra o item na tela
                        slot.setAttribute('draggable', 'true');
                        this.renderizarItemNoSlot(slot, itemData);
                        
                        // 2. Avisa o Códice que você pegou esse item!
                        this.registrarDescobertaGlobal(itemData);

                    } catch (e) {
                        console.error(`Erro ao carregar o slot ${index}:`, e);
                    }
                }
            });

            this.calcularBonusEquipamentos();
        });
    },

    renderizarItemNoSlot(slot, itemData) {
        if (slot.classList.contains('equip-slot')) {
            const icon = slot.querySelector('i');
            if(icon) icon.style.display = 'none';
            const oldImg = slot.querySelector('img');
            if(oldImg) oldImg.remove();
        } else {
            slot.innerHTML = '';
        }
        
        slot.dataset.itemFullData = JSON.stringify(itemData);
        slot.dataset.tooltip = itemData.nome || "Item"; 
        slot.setAttribute('draggable', 'true'); 

        const img = document.createElement('img');
        img.src = itemData.url || itemData.img; 
        
        img.setAttribute('draggable', 'false'); 
        img.className = "inventory-item-icon";
        img.style.pointerEvents = "none"; 
        
        if (slot.classList.contains('equip-slot')) {
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.objectFit = "contain";
        }
        slot.appendChild(img);
    },

    ativarGerenciadorTooltip() {
        const body = document.body;
        let tooltip = document.getElementById('custom-tooltip-fix');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'custom-tooltip-fix';
            tooltip.style.cssText = `position: fixed; background: rgba(20, 20, 20, 0.95); color: white; padding: 6px 10px; border-radius: 10px; border: 1px solid gold; font-size: 11px; z-index: 9999999; pointer-events: none; display: none; box-shadow: 0 5px 15px rgba(0,0,0,0.7); white-space: nowrap; font-family: 'Segoe UI', sans-serif; font-weight: bold;`;
            document.body.appendChild(tooltip);
        }
        body.addEventListener('mouseover', (e) => {
            const slot = e.target.closest('.item-slot, .equip-slot');
            if (slot && slot.dataset.tooltip) { tooltip.textContent = slot.dataset.tooltip; tooltip.style.display = 'block'; }
        });
        body.addEventListener('mousemove', (e) => {
            if (tooltip.style.display === 'block') { tooltip.style.left = (e.clientX + 15) + 'px'; tooltip.style.top = (e.clientY - 30) + 'px'; }
        });
        body.addEventListener('mouseout', (e) => { if (e.target.closest('.item-slot, .equip-slot')) tooltip.style.display = 'none'; });
    },    

    devolverParaOMapa(slot, itemData, posicao) {
        const index = slot.dataset.slotIndex;
        if (index === undefined || index === null) return;
        const nomeFinal = window.usuarioLogadoNome || (window.app && window.app.usuario) || localStorage.getItem('rubi_username');
        if (!this.refInventario && nomeFinal) this.refInventario = window.database.ref('usuarios').child(nomeFinal).child('inventario');

        if (typeof window.spawnTokenGlobal === 'function' && this.refInventario) {
            const payload = { ...itemData, x: posicao.x, y: posicao.y };
            delete payload.key; delete payload.dbKey; delete payload.id;
            window.spawnTokenGlobal(payload);
            this.refInventario.child(String(index)).remove();
        }
    }
};

window.forcarSistemaDeArraste = function() {
    const todosOsSlots = document.querySelectorAll('.item-slot, .equip-slot');
    
    todosOsSlots.forEach(slot => {
        if (slot.dataset.itemFullData) {
            slot.setAttribute('draggable', 'true');
        } else {
            slot.setAttribute('draggable', 'false');
        }

        slot.ondragstart = (e) => {
            // 🔥 RESTRIÇÃO 1: TRAVA DE INICIATIVA 
            if (window.iniciativa && window.iniciativa.fila && window.iniciativa.fila.length > 0) {
                const isGM = localStorage.getItem('rubi_role') === 'gm';
                if (!isGM) {
                    alert("⚔️ TENSÃO DE COMBATE! Você não pode trocar equipamentos ou mexer na mochila agora.");
                    e.preventDefault();
                    return;
                }
            }
            
            const dadosRaw = slot.dataset.itemFullData;
            if (!dadosRaw) { e.preventDefault(); return; }
            
            const data = JSON.parse(dadosRaw);
            window.itemSendoArrastadoData = data;
            window.itemSendoArrastadoIndex = slot.dataset.slotIndex;
            
            e.dataTransfer.clearData();
            e.dataTransfer.setData('application/json', dadosRaw);
            e.dataTransfer.setData('indexOrigem', slot.dataset.slotIndex);
            e.dataTransfer.effectAllowed = "move";
            
            const imgInvisivel = new Image();
            imgInvisivel.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            e.dataTransfer.setDragImage(imgInvisivel, 0, 0);
            
            slot.style.opacity = "0.4";
        };
        
        slot.ondragend = () => { 
            document.querySelectorAll('.item-slot, .equip-slot').forEach(s => {
                s.style.opacity = "1";
                s.style.borderColor = "";
                s.style.backgroundColor = "";
            });
        };

        slot.ondragover = (e) => {
            if (window.Inventario.handleDragOverVisuais) {
                window.Inventario.handleDragOverVisuais(e, slot);
            }
        };

        slot.ondragleave = () => { 
            slot.style.border = ''; 
            slot.style.backgroundColor = ''; 
        };

        // 🔥 A GRANDE CORREÇÃO ESTÁ AQUI!
        // Em vez de repetir código, obriga a usar a nossa função consertada
        slot.ondrop = (e) => {
            if (window.Inventario && window.Inventario.handleDropInternal) {
                window.Inventario.handleDropInternal(e, slot);
            }
        };
        
        slot.ondblclick = () => {
            if (window.Inventario && window.Inventario.usarItemConsumivel) {
                window.Inventario.usarItemConsumivel(slot);
            }
        };

        slot.onclick = (e) => {
            const index = parseInt(slot.dataset.slotIndex);
            if (index >= 69 && index <= 72) {
                if (window.Inventario && window.Inventario.usarMagia) {
                    window.Inventario.usarMagia(slot);
                }
            }
        };
    });
};


setTimeout(window.forcarSistemaDeArraste, 1500);

window.atualizarStatusDaFicha = function(bonusEquipamento, movimentoMaximo = 8) {
    const nomeDono = window.usuarioLogadoNome || localStorage.getItem('rubi_username');
    if (!nomeDono || !window.database) return;

    const atributos = ['for', 'dex', 'con', 'int', 'def', 'car'];
    let valoresFinais = {};

    atributos.forEach(attr => {
        const spanBase = document.getElementById(`base-${attr}`);
        const spanBonus = document.getElementById(`bonus-${attr}`);
        const spanTotal = document.getElementById(`stat-${attr}`);

        let base = spanBase ? (parseInt(spanBase.innerText) || 0) : 0;
        let bonus = parseInt(bonusEquipamento[attr]) || 0;
        let total = base + bonus;

        if (spanBonus) {
            spanBonus.innerText = (bonus >= 0 ? "+" : "") + bonus;
            spanBonus.style.color = bonus > 0 ? '#2ecc71' : (bonus < 0 ? '#e74c3c' : '#555');
        }
        if (spanTotal) {
            spanTotal.innerText = total;
            spanTotal.style.color = bonus > 0 ? '#f1c40f' : '#fff';
        }
        valoresFinais[attr] = total;
    });

    // 🔥 Agora a Vida Máxima (hpM) é puramente igual à Constituição (1:1)
    const hpM = (valoresFinais['con'] || 0);

    window.database.ref(`usuarios/${nomeDono}/status_equipado`).set({
        totais: valoresFinais,
        bonus: bonusEquipamento,
        movimento: movimentoMaximo,
        hpMax: hpM,
        timestamp: Date.now()
    });

    const refTokens = window.mapaRef ? window.mapaRef.child('tokens') : window.database.ref('mapa/tokens');
    refTokens.once('value', snap => {
        snap.forEach(child => {
            const tk = child.val();
            if (tk.dono && tk.dono.toLowerCase() === nomeDono.toLowerCase()) {
                child.ref.update({ 
                    atributos: valoresFinais, 
                    hpMax: hpM, 
                    movimentoMaximo: movimentoMaximo 
                });
            }
        });
    });
};