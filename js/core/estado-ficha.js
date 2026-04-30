/* ============================================================
   === [ GERENCIADOR DE ESTADO DA FICHA - V2.0 (INJEÇÃO VITAL) ] ===
   === FEAT: Buffs de CON/INT injetam HP/Mana diretamente no Token
   === FIX: Ignora a trava de clamp apenas para magias!
   === FIX: Trava de Titânio e Resgate mantidos.
   ============================================================ */

window.EstadoFicha = {
    base: { for: 0, dex: 0, int: 0, def: 0, car: 0, con: 0 },
    bonusEquipamento: { for: 0, dex: 0, int: 0, def: 0, car: 0, con: 0 },
    modificadoresVirtuais: { for: 0, dex: 0, int: 0, def: 0, car: 0, con: 0 },
    modificadoresStatus: { for: 0, dex: 0, int: 0, def: 0, car: 0, con: 0 },
    hpTemp: 0, 

    modificadoresBooster: { for: 0, dex: 0, int: 0, def: 0, car: 0, con: 0 },
    boosterLigado: false,

    armaEquipada: "",
    movimentoMaximo: 0,

    // 🛡️ CONTROLES DE SEGURANÇA
    foiInicializada: false, 
    resgateFeito: false, 

    // 💉 VARIÁVEIS DO MOTOR DE INJEÇÃO VITAL
    primeiraLeituraRadar: true,
    _ultimoConBuff: 0,
    _ultimoIntBuff: 0,
    pendenteInjecaoCon: 0,
    pendenteInjecaoInt: 0,

    iniciarRadarDeStatus: function() {
        if (!window.mapaRef) {
            setTimeout(() => this.iniciarRadarDeStatus(), 2000);
            return;
        }

        const nomeDono = window.usuarioLogadoNome || localStorage.getItem('rubi_username');
        if (!nomeDono) return;

        window.mapaRef.child('tokens').on('value', snap => {
            if (!this.foiInicializada) return; // Só ativa o radar se a ficha estiver pronta

            const tokensObj = snap.val();
            if (!tokensObj) return;

            Object.keys(tokensObj).forEach(key => {
                const tk = tokensObj[key];
                const ehDono = tk.dono && tk.dono.toLowerCase() === nomeDono.toLowerCase();
                const heJogador = (tk.tipo === "jogador" || tk.tipo === "personagem");

                if (ehDono && heJogador) {
                    let novosBuffs = { for: 0, dex: 0, int: 0, def: 0, car: 0, con: 0 };
                    let novoEscudo = 0;

                    if (tk.statusAtivos) {
                        for (let id in tk.statusAtivos) {
                            let s = tk.statusAtivos[id];
                            if (s.tipo.toUpperCase() === "ESCUDO") {
                                novoEscudo = Math.max(novoEscudo, parseInt(s.valor) || 0);
                            }
                            if ((s.tipo.toUpperCase() === "VELOCIDADE" || s.tipo.toUpperCase() === "INSPIRACAO") && s.atributoAlvo) {
                                novosBuffs[s.atributoAlvo] = (novosBuffs[s.atributoAlvo] || 0) + (parseInt(s.valor) || 0);
                            }
                        }
                    }

                    // 🧠 MOTOR DE INJEÇÃO: Calcula a diferença e aplica na veia!
                    if (this.primeiraLeituraRadar) {
                        this._ultimoConBuff = novosBuffs.con;
                        this._ultimoIntBuff = novosBuffs.int;
                        this.primeiraLeituraRadar = false; // Evita curar o jogador de graça ao dar F5 na página
                    } else {
                        let deltaCon = novosBuffs.con - this._ultimoConBuff;
                        let deltaInt = novosBuffs.int - this._ultimoIntBuff;
                        
                        this._ultimoConBuff = novosBuffs.con;
                        this._ultimoIntBuff = novosBuffs.int;

                        if (deltaCon !== 0) this.pendenteInjecaoCon += deltaCon;
                        if (deltaInt !== 0) this.pendenteInjecaoInt += deltaInt;
                    }

                    let precisaAtualizar = false;
                    for (let a in novosBuffs) {
                        if (this.modificadoresStatus[a] !== novosBuffs[a]) precisaAtualizar = true;
                    }
                    if (this.hpTemp !== novoEscudo) precisaAtualizar = true;
                    if (this.pendenteInjecaoCon !== 0 || this.pendenteInjecaoInt !== 0) precisaAtualizar = true;

                    if (precisaAtualizar) {
                        this.modificadoresStatus = novosBuffs;
                        this.hpTemp = novoEscudo;
                        this.renderizarEcra();
                        
                        if (this.foiInicializada) {
                            this.sincronizarComFirebase(); 
                        }
                    }
                }
            });
        });
    },

    recalcularBooster: function() {
        if (!this.boosterLigado) {
            this.modificadoresBooster = { for: 0, dex: 0, int: 0, def: 0, car: 0, con: 0 };
            return;
        }

        let temp = {};
        ['for', 'dex', 'int', 'def', 'car', 'con'].forEach(a => {
            temp[a] = (this.base[a] || 0) + (this.bonusEquipamento[a] || 0) + (this.modificadoresStatus[a] || 0) + (this.modificadoresVirtuais[a] || 0);
        });

        let maxFisico = Math.max(temp.for, temp.dex, temp.def);
        let maxMagico = Math.max(temp.int, temp.car, temp.con);
        let grupo = maxMagico > maxFisico ? ['int', 'car', 'con'] : ['for', 'dex', 'def'];
        
        grupo.sort((a, b) => temp[b] - temp[a]);
        
        let primeiro = grupo[0];
        let segundo = grupo[1];
        let valorTransferido = Math.floor(temp[segundo] / 2);

        this.modificadoresBooster = { for: 0, dex: 0, int: 0, def: 0, car: 0, con: 0 };
        this.modificadoresBooster[primeiro] = valorTransferido;
        this.modificadoresBooster[segundo] = -valorTransferido;
    },

    obterTotais: function() {
        this.recalcularBooster();
        const totais = {};
        const atributos = ['for', 'dex', 'int', 'def', 'car', 'con'];
        atributos.forEach(attr => {
            let totalCalculado = (this.base[attr] || 0) + 
                                 (this.bonusEquipamento[attr] || 0) + 
                                 (this.modificadoresStatus[attr] || 0) + 
                                 (this.modificadoresVirtuais[attr] || 0) +
                                 (this.modificadoresBooster[attr] || 0);
            totais[attr] = Math.max(0, totalCalculado); 
        });
        return totais;
    },

    atualizarBuffsMagicos: function(novosModificadores, valorEscudo = null) {
        this.modificadoresStatus = { ...this.modificadoresStatus, ...novosModificadores };
        if (valorEscudo !== null) this.hpTemp = valorEscudo;
        this.renderizarEcra();
        if (this.foiInicializada) this.sincronizarComFirebase();
    },

    atualizarBase: function(novosAtributos) {
        this.base = { ...this.base, ...novosAtributos };
        this.foiInicializada = true; // DESTRAVOU!
        this.renderizarEcra();
        this.sincronizarComFirebase();
    },

    atualizarEquipamento: async function(novosBonus, nomeArma, movimento) {
        this.bonusEquipamento = { ...this.bonusEquipamento, ...novosBonus };
        this.armaEquipada = nomeArma;
        this.movimentoMaximo = movimento;
        this.renderizarEcra();
        if (this.foiInicializada) await this.sincronizarComFirebase();
    },

    renderizarEcra: function() {
        const totais = this.obterTotais();
        const atributos = ['for', 'dex', 'int', 'def', 'car', 'con'];
        
        atributos.forEach(attr => {
            const spanBase = document.getElementById(`base-${attr}`);
            const spanBonus = document.getElementById(`bonus-${attr}`);
            const spanTotal = document.getElementById(`stat-${attr}`);
            
            let bonusReal = (this.bonusEquipamento[attr] || 0) + (this.modificadoresStatus[attr] || 0) + (this.modificadoresVirtuais[attr] || 0);
            let bonusBooster = this.modificadoresBooster[attr] || 0;

            if (spanBase) spanBase.innerText = this.base[attr] || 0;
            
            if (spanBonus) {
                let textoBonus = (bonusReal >= 0 ? "+" : "") + bonusReal;
                if (bonusBooster > 0) textoBonus += ` <span style="color:#ff4d4d; font-weight:bold;">(+${bonusBooster})</span>`;
                else if (bonusBooster < 0) textoBonus += ` <span style="color:#a83232;">(${bonusBooster})</span>`;
                
                spanBonus.innerHTML = textoBonus; 
                spanBonus.style.color = (this.modificadoresStatus[attr] > 0) ? '#00f2ff' : (bonusReal > 0 ? '#2ecc71' : (bonusReal < 0 ? '#e74c3c' : '#555'));
            }
            
            if (spanTotal) {
                spanTotal.innerText = totais[attr];
                if (bonusBooster > 0) spanTotal.style.color = '#ff4d4d';
                else if (bonusBooster < 0) spanTotal.style.color = '#a83232';
                else spanTotal.style.color = (this.modificadoresStatus[attr] > 0) ? '#00f2ff' : (bonusReal > 0 ? '#f1c40f' : (bonusReal < 0 ? '#e74c3c' : '#fff'));
            }
        });
    },

    sincronizarComFirebase: async function() {
        if (!this.foiInicializada) return;

        const nomeDono = window.usuarioLogadoNome || localStorage.getItem('rubi_username');
        if (!nomeDono) return;

        const totais = this.obterTotais();
        const hpM = totais['con'] || 0;
        const nivelAtual = window.nivelJogadorAtual || 1;
        const manaM = 10 + ((nivelAtual - 1) * 3) + (totais['int'] || 0);

        if (window.DatabaseManager) {
            await window.DatabaseManager.salvar(`usuarios/${nomeDono}/status_equipado`, {
                totais: totais,
                bonus: this.bonusEquipamento,
                buffs: this.modificadoresStatus,
                hpTemp: this.hpTemp,
                movimento: this.movimentoMaximo,
                armaEquipada: this.armaEquipada,
                hpMax: hpM,
                manaMax: manaM, 
                timestamp: Date.now()
            });

            let tokensObj = null;
            if (window.mapaRef) {
                const snap = await window.mapaRef.child('tokens').once('value');
                tokensObj = snap.val();
            } else {
                tokensObj = await window.DatabaseManager.lerUmaVez('mapa/tokens');
            }
            
            if (tokensObj) {
                Object.keys(tokensObj).forEach(key => {
                    const tk = tokensObj[key];
                    const ehDono = tk.dono && tk.dono.toLowerCase() === nomeDono.toLowerCase();
                    const ehMesmoNome = tk.nome && tk.nome.toLowerCase() === nomeDono.toLowerCase();
                    const heJogador = (tk.tipo === "jogador" || tk.tipo === "personagem");

                    if ((ehDono || ehMesmoNome) && heJogador) {
                        
                        let manaAtualPersistente = tk.manaAtual !== undefined ? tk.manaAtual : manaM;
                        let hpAtualPersistente = tk.hpAtual !== undefined ? tk.hpAtual : hpM;
                        let estavaVivo = hpAtualPersistente > 0;

                        // 🚑 SISTEMA DE RESGATE (Opcional, em caso de bugar novamente)
                        if (hpAtualPersistente === 0 && hpM >= 10 && !this.resgateFeito) {
                            hpAtualPersistente = hpM;
                            manaAtualPersistente = manaM;
                            this.resgateFeito = true;
                            estavaVivo = true;
                        }

                        // 💉 INJEÇÃO VITAL (Só acontece se ganhou/perdeu Buff Mágico)
                        if (this.pendenteInjecaoCon !== 0) {
                            hpAtualPersistente += this.pendenteInjecaoCon;
                            
                            // Regra de Ouro RPG: Você não morre ao perder um buff de Vida! Fica com no mínimo 1.
                            if (this.pendenteInjecaoCon < 0 && estavaVivo && hpAtualPersistente <= 0) {
                                hpAtualPersistente = 1;
                            }
                            this.pendenteInjecaoCon = 0; // Zera a injeção depois de aplicar
                        }

                        if (this.pendenteInjecaoInt !== 0) {
                            manaAtualPersistente += this.pendenteInjecaoInt;
                            if (manaAtualPersistente < 0) manaAtualPersistente = 0;
                            this.pendenteInjecaoInt = 0; 
                        }

                        // 🛑 CLAMP DE SEGURANÇA NORMAL (Impede cura por Equipamentos)
                        if (manaAtualPersistente > manaM) manaAtualPersistente = manaM;
                        if (hpAtualPersistente > hpM) hpAtualPersistente = hpM;

                        const updates = {
                            hpMax: hpM,
                            hpAtual: Math.max(0, hpAtualPersistente),
                            manaMax: manaM, 
                            manaAtual: Math.max(0, manaAtualPersistente), 
                            hpTemp: this.hpTemp,
                            atributos: totais,
                            armaEquipada: this.armaEquipada,
                            dono: nomeDono 
                        };
                        
                        if (window.mapaRef) window.mapaRef.child(`tokens/${key}`).update(updates);
                        else window.DatabaseManager.atualizar(`mapa/tokens/${key}`, updates);
                    }
                });
            }
        }
    }
};

setTimeout(() => {
    if (window.EstadoFicha && typeof window.EstadoFicha.iniciarRadarDeStatus === 'function') {
        window.EstadoFicha.iniciarRadarDeStatus();
    }
}, 3000);