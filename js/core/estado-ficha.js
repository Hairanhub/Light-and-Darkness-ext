/* ============================================================
   === [ GERENCIADOR DE ESTADO DA FICHA - V1.5 (BOOSTER CLAMP HP/MANA) ] ===
   ============================================================ */

window.EstadoFicha = {
    base: { for: 0, dex: 0, int: 0, def: 0, car: 0, con: 0 },
    bonusEquipamento: { for: 0, dex: 0, int: 0, def: 0, car: 0, con: 0 },
    modificadoresVirtuais: { for: 0, dex: 0, int: 0, def: 0, car: 0, con: 0 },
    
    // 🔥 Armazena a transferência de atributos do Booster
    modificadoresBooster: { for: 0, dex: 0, int: 0, def: 0, car: 0, con: 0 },
    boosterLigado: false,

    armaEquipada: "",
    movimentoMaximo: 0,

    /**
     * Calcula a transferência de atributos do Booster em tempo real
     */
    recalcularBooster: function() {
        if (!this.boosterLigado) {
            this.modificadoresBooster = { for: 0, dex: 0, int: 0, def: 0, car: 0, con: 0 };
            return;
        }

        let temp = {};
        ['for', 'dex', 'int', 'def', 'car', 'con'].forEach(a => {
            temp[a] = (this.base[a] || 0) + (this.bonusEquipamento[a] || 0) + (this.modificadoresVirtuais[a] || 0);
        });

        // Isola as famílias e descobre qual é a mais forte
        let maxFisico = Math.max(temp.for, temp.dex, temp.def);
        let maxMagico = Math.max(temp.int, temp.car, temp.con);
        
        let grupo = maxMagico > maxFisico ? ['int', 'car', 'con'] : ['for', 'dex', 'def'];
        
        // Ordena do maior para o menor
        grupo.sort((a, b) => temp[b] - temp[a]);
        
        let primeiro = grupo[0];
        let segundo = grupo[1];

        // Corta a metade do segundo mais forte
        let valorTransferido = Math.floor(temp[segundo] / 2);

        this.modificadoresBooster = { for: 0, dex: 0, int: 0, def: 0, car: 0, con: 0 };
        this.modificadoresBooster[primeiro] = valorTransferido;  // BUFF!
        this.modificadoresBooster[segundo] = -valorTransferido;  // DEBUFF!
    },

    obterTotais: function() {
        this.recalcularBooster(); // Sempre garante que o Booster está com os cálculos atualizados

        const totais = {};
        const atributos = ['for', 'dex', 'int', 'def', 'car', 'con'];
        atributos.forEach(attr => {
            let totalCalculado = (this.base[attr] || 0) + 
                                 (this.bonusEquipamento[attr] || 0) + 
                                 (this.modificadoresVirtuais[attr] || 0) +
                                 (this.modificadoresBooster[attr] || 0);
            totais[attr] = Math.max(0, totalCalculado); 
        });
        return totais;
    },

    atualizarBase: function(novosAtributos) {
        this.base = { ...this.base, ...novosAtributos };
        this.renderizarEcra();
    },

    atualizarEquipamento: async function(novosBonus, nomeArma, movimento) {
        this.bonusEquipamento = { ...this.bonusEquipamento, ...novosBonus };
        this.armaEquipada = nomeArma;
        this.movimentoMaximo = movimento;
        this.renderizarEcra();
        await this.sincronizarComFirebase();
    },

    renderizarEcra: function() {
        const totais = this.obterTotais();
        const atributos = ['for', 'dex', 'int', 'def', 'car', 'con'];
        
        atributos.forEach(attr => {
            const spanBase = document.getElementById(`base-${attr}`);
            const spanBonus = document.getElementById(`bonus-${attr}`);
            const spanTotal = document.getElementById(`stat-${attr}`);
            
            let bonusReal = (this.bonusEquipamento[attr] || 0) + (this.modificadoresVirtuais[attr] || 0);
            let bonusBooster = this.modificadoresBooster[attr] || 0;

            if (spanBase) spanBase.innerText = this.base[attr] || 0;
            
            if (spanBonus) {
                let textoBonus = (bonusReal >= 0 ? "+" : "") + bonusReal;
                
                // Mostra o roubo de status na tela
                if (bonusBooster > 0) textoBonus += ` <span style="color:#ff4d4d; font-weight:bold;">(+${bonusBooster})</span>`;
                else if (bonusBooster < 0) textoBonus += ` <span style="color:#a83232;">(${bonusBooster})</span>`;
                
                spanBonus.innerHTML = textoBonus; 
                spanBonus.style.color = bonusReal > 0 ? '#2ecc71' : (bonusReal < 0 ? '#e74c3c' : '#555');
            }
            
            if (spanTotal) {
                spanTotal.innerText = totais[attr];
                if (bonusBooster > 0) spanTotal.style.color = '#ff4d4d'; // Brilha vermelho o atributo que recebeu o poder
                else if (bonusBooster < 0) spanTotal.style.color = '#a83232'; // Escurece o que foi drenado
                else spanTotal.style.color = bonusReal > 0 ? '#f1c40f' : (bonusReal < 0 ? '#e74c3c' : '#fff');
            }
        });
    },

    sincronizarComFirebase: async function() {
        const nomeDono = window.usuarioLogadoNome || localStorage.getItem('rubi_username');
        if (!nomeDono) return;

        const totais = this.obterTotais();
        
        // HP é diretamente ligado à Constituição
        const hpM = totais['con'] || 0;
        
        // Calcula a Mana Máxima incluindo os bônus de Inteligência
        const nivelAtual = window.nivelJogadorAtual || 1;
        const manaM = 10 + ((nivelAtual - 1) * 3) + (totais['int'] || 0);

        if (window.DatabaseManager) {
            await window.DatabaseManager.salvar(`usuarios/${nomeDono}/status_equipado`, {
                totais: totais,
                bonus: this.bonusEquipamento,
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
                        
                        // 🔥 PROTEÇÃO DA MANA 🔥
                        let manaAtualPersistente = tk.manaAtual !== undefined ? tk.manaAtual : manaM;
                        if (manaAtualPersistente > manaM) manaAtualPersistente = manaM;

                        // 🔥 PROTEÇÃO DA VIDA (HP) 🔥
                        // Força a vida atual a baixar se o limite máximo (CON) cair por causa do Booster!
                        let hpAtualPersistente = tk.hpAtual !== undefined ? tk.hpAtual : hpM;
                        if (hpAtualPersistente > hpM) hpAtualPersistente = hpM;

                        const updates = {
                            hpMax: hpM,
                            hpAtual: Math.max(0, hpAtualPersistente), // INJETA A VIDA CORTADA!
                            manaMax: manaM, 
                            manaAtual: Math.max(0, manaAtualPersistente), 
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