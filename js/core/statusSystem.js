/**
 * STATUS SYSTEM - O CÉREBRO DE REGRAS V4.7 (FIX: TRAVA DE ESQUIVA)
 * Inclui: Dano por Turno, Loop Tempo Real, Debuffs de Probabilidade e Restrições de Movimento/Turno
 */
window.StatusSystem = {
    // 1. Definições Mestres
    definitions: {
        "VENENO": { nome: "Veneno", icone: "🤢", dano: 3, turnos: 6, tipoDano: "passivo" },
        "SANGRAMENTO": { nome: "Sangramento", icone: "🩸", dano: 4, turnos: 3, tipoDano: "passivo" },
        "NECROSE": { nome: "Necrose", icone: "💀", dano: 6, turnos: 2, tipoDano: "passivo" },
        "RAIO": { nome: "Raio", icone: "⚡", dano: 3, turnos: 2, tipoDano: "reacao" },
        "FOGO": { nome: "Fogo", icone: "🔥", dano: 8, turnos: 2, tipoDano: "passivo" },
        
        "AR": { nome: "Ar", icone: "🌬️", turnos: 3, tipoDano: "debuff" },
        "AGUA": { nome: "Água", icone: "💧", turnos: 100, tipoDano: "debuff" },
        "NATUREZA": { nome: "Natureza", icone: "🌿", turnos: 2, tipoDano: "debuff", travaMovimento: true },
        "SONO": { nome: "Sono", icone: "💤", turnos: 3, tipoDano: "controle", travaMovimento: true, travaTurno: true },
        "TERRA": { nome: "Terra", icone: "⛰️", turnos: 2, tipoDano: "controle" },
        "GELO": { nome: "Gelo", icone: "❄️", turnos: 3, tipoDano: "controle" },
        "CEGUEIRA": { nome: "Cegueira", icone: "🕶️", turnos: 3, tipoDano: "debuff" },
        "CONFUSAO": { nome: "Confusão", icone: "🌀", turnos: 3, tipoDano: "debuff" },
        "MALDICAO": { nome: "Maldição", icone: "📉", turnos: 4, tipoDano: "debuff" },
        "MEDO": { nome: "Medo", icone: "😨", turnos: 3, tipoDano: "debuff" },
        "SUSPENSO": { nome: "Suspenso", icone: "🌪️", dano: 0, turnos: 1, tipoDano: "controle", travaMovimento: true, travaTurno: true }
    },

    // 2. FUNÇÃO MESTRA DE HP
    modificarHP: async function(tokenId, delta) {
        if (!window.mapaRef) return;
        const ref = window.mapaRef.child('tokens').child(tokenId);
        const snap = await ref.once('value');
        const token = snap.val();
        if (!token) return;

        let hpAtual = parseInt(token.hpAtual);
        if (isNaN(hpAtual)) hpAtual = parseInt(token.atributos?.hp);
        if (isNaN(hpAtual)) hpAtual = parseInt(token.atributos?.con) || 20;

        if (delta < 0 && this.temStatus(token, "GELO")) {
            if (Math.random() <= 0.3) {
                delta = Math.floor(delta * 1.5);
                if (window.combate) window.combate.notificarCombate(token.nome, "❄️ FRAQUEZA: O gelo quebrou! (+50% Dano)", "#00ffff");
            }
        }

        const novoHP = Math.max(0, hpAtual + delta);

        if (novoHP <= 0) {
            console.warn(`🚨 [MORTE DETECTADA] O token "${token.nome}" chegou a 0 de vida!`);
            console.log(`🚨 [TIPO DO TOKEN] Identificado como: "${token.tipo}"`);

            if (window.combate) {
                window.combate.notificarCombate(token.nome.toUpperCase(), "💀 DERROTADO EM COMBATE!", "#ff0000");
            }
            if (window.iniciativa && typeof window.iniciativa.removerToken === 'function') {
                window.iniciativa.removerToken(tokenId);
            }
            
            // Verifica se é monstro e chama a engine de loot
            if (token.tipo === 'monstro' || token.tipo === 'monstros') {
                console.warn(`🚨 [LOOT] É um monstro! A janela lootEngine existe? ->`, !!window.lootEngine);
                if (window.lootEngine) {
                    window.lootEngine.processarMorte(tokenId, token);
                } else {
                    console.error("🚨 [ERRO] window.lootEngine NÃO FOI ENCONTRADO! O script de loot não carregou.");
                    await ref.remove(); 
                }
            } else {
                console.log(`🚨 [LIMPEZA] Não é monstro. Removendo do mapa direto.`);
                await ref.remove(); 
            }
            
            return 0;
        } else {
            const updates = {};
            updates[`hpAtual`] = novoHP;
            if (token.atributos && token.atributos.hp !== undefined) {
                updates[`atributos/hp`] = novoHP;
            }
            await ref.update(updates);
            if (delta < 0) this.animarDano(tokenId);
            return novoHP;
        }
    },

    // 3. MOTOR DE PROBABILIDADE (SABOTAGEM DE ESQUIVA)
    checarProbabilidade: function(token, tipoStatus) {
        if (!token || !token.statusAtivos) return { ativou: false };
        const status = Object.values(token.statusAtivos).find(s => s.tipo.toUpperCase() === tipoStatus.toUpperCase());
        if (!status) return { ativou: false };

        const d10 = Math.floor(Math.random() * 10) + 1; 
        const tipo = tipoStatus.toUpperCase();
        
        // --- NOVA LÓGICA PARA ÁGUA E NATUREZA ---
        // Se o debuff "pegar", retornamos FALSE para o motor de combate NÃO esquivar.
        if (tipo === "AGUA" || tipo === "NATUREZA") {
            const chance = (tipo === "AGUA") ? 3 : 2; // 30% ou 20%
            if (d10 <= chance) {
                if (window.combate) {
                    const msg = tipo === "AGUA" ? "💧 Água: O inimigo está pesado e NÃO conseguiu esquivar!" : "🌿 Natureza: Enraizado! Esquiva bloqueada!";
                    window.combate.notificarCombate(token.nome.toUpperCase(), msg, "#ff4444");
                }
                return { ativou: false, forcarAcerto: true }; // Retorna false para evitar a esquiva no motor principal
            }
            return { ativou: false }; 
        }

        // TABELA DE CHANCES PADRÃO
        const tabela = {
            "AR":       { ativou: d10 <= 2, msg: "🌬️ Ar: O ataque falhou (20%)!" },
            "CEGUEIRA": { ativou: d10 <= 3, msg: "🕶️ Cegueira: O ataque errou (30%)!" },
            "CONFUSAO": { ativou: d10 <= 3, msg: "🌀 Confusão: Perdeu o turno (30%)!" },
            "TERRA":    { ativou: d10 <= 3, msg: "⛰️ Terra: Petrificado, perdeu o turno (30%)!" },
            "GELO":     { ativou: d10 <= 3, msg: "❄️ Gelo: Congelado, perdeu o turno (30%)!" }
        };

        if (tipo === "MEDO") {
            if (d10 === 1) return { ativou: true, efeito: "fuga", msg: "😨 MEDO: Fugiu da batalha (10%)!" };
            if (d10 <= 3) return { ativou: true, efeito: "perdeu", msg: "😨 MEDO: Perdeu o ataque (20%)!" };
            if (d10 <= 5) return { ativou: true, efeito: "enfraquecido", msg: "😨 MEDO: Dano Reduzido -30% (20%)" };
        }

        return tabela[tipo] || { ativou: false };
    },

    temStatus: function(token, tipoStatus) {
        if (!token || !token.statusAtivos) return false;
        return Object.values(token.statusAtivos).some(s => s.tipo.toUpperCase() === tipoStatus.toUpperCase());
    },

    // 4. CÁLCULO DE REDUÇÃO DE DANO
    aplicarReducoesDeDano: function(tokenAtacante, danoOriginal) {
        if (!tokenAtacante || !tokenAtacante.statusAtivos) return danoOriginal;
        let danoFinal = danoOriginal;
        const status = Object.values(tokenAtacante.statusAtivos);
        
        if (status.some(s => s.tipo.toUpperCase() === "MALDICAO")) {
            danoFinal = Math.floor(danoFinal * 0.7);
        }
        const checkMedo = this.checarProbabilidade(tokenAtacante, "MEDO");
        if (checkMedo.efeito === "enfraquecido") {
            danoFinal = Math.floor(danoFinal * 0.7);
        }
        return danoFinal;
    },

    // 5. APLICAR STATUS
    aplicarStatus: async function(tokenId, tipoStatus) {
        const nomeChave = tipoStatus.toUpperCase();
        const config = this.definitions[nomeChave];
        if (!config) return;

        const refToken = window.mapaRef.child('tokens').child(tokenId);
        const snap = await refToken.once('value');
        const token = snap.val();
        if (!token) return;

        const statusData = {
            tipo: nomeChave.toLowerCase(),
            valor: config.dano || 0,
            duracao: config.turnos,
            timestamp: Date.now()
        };

        await refToken.child('statusAtivos').push(statusData);
        if (window.combate) {
            window.combate.notificarCombate(token.nome.toUpperCase(), `✨ Sofreu <b>${config.nome}</b>! (${config.icone})`, "#ffaa00");
        }
    },

    // 6. PROCESSAR TURNO
    processarTurno: async function(tokenId) {
        const snap = await window.mapaRef.child('tokens').child(tokenId).once('value');
        const token = snap.val();
        if (!token || !token.statusAtivos) return;

        let statusAtuais = { ...token.statusAtivos };
        let houveAlteracao = false;
        let totalDanoTurno = 0;
        let logsDano = [];

        for (let idUnico in statusAtuais) {
            let s = statusAtuais[idUnico];
            const tipoChave = s.tipo.toUpperCase();
            const config = this.definitions[tipoChave];

            if (!config) continue;

            if (config.tipoDano === "passivo") {
                const valorDano = (parseInt(s.valor) > 0) ? parseInt(s.valor) : config.dano;
                totalDanoTurno += valorDano;
                logsDano.push(`${config.icone} ${config.nome}: -${valorDano} HP`);
                houveAlteracao = true;
            }

            s.duracao = (parseInt(s.duracao) || 1) - 1;
            houveAlteracao = true;
            if (s.duracao <= 0) delete statusAtuais[idUnico];
        }

        if (houveAlteracao) {
            if (totalDanoTurno > 0) await this.modificarHP(tokenId, -totalDanoTurno);
            const tokenAindaExiste = await window.mapaRef.child('tokens').child(tokenId).once('value');
            if (tokenAindaExiste.exists()) {
                if (logsDano.length > 0 && window.combate) {
                    window.combate.notificarCombate(token.nome.toUpperCase(), logsDano.join('<br>'), "#ff5500");
                }
                await window.mapaRef.child('tokens').child(tokenId).child('statusAtivos').set(statusAtuais);
            }
        }
    },

    // 7. REAÇÕES
    aplicarDanoReacao: async function(tokenId) {
        const snap = await window.mapaRef.child('tokens').child(tokenId).once('value');
        const token = snap.val();
        if (!token || !token.statusAtivos) return;

        for (let idUnico in token.statusAtivos) {
            let s = token.statusAtivos[idUnico];
            if (s.tipo.toUpperCase() === "RAIO") {
                const dano = 3; 
                await this.modificarHP(tokenId, -dano);
                if (window.combate) window.combate.notificarCombate(token.nome.toUpperCase(), `⚡ RAIO REAGIU: -${dano} HP!`, "#ffff00");
                break; 
            }
        }
    },

    // 8. LOOP DE TEMPO REAL
    iniciarLoopTempoReal: function() {
        setInterval(async () => {
            if (!window.mapaRef) return;
            const snapIniciativa = await window.mapaRef.child('turnoAtivo').once('value');
            if (snapIniciativa.val() !== null) return; 

            const snapTokens = await window.mapaRef.child('tokens').once('value');
            const tokens = snapTokens.val();
            if (!tokens) return;

            const agora = Date.now();
            for (let id in tokens) {
                const t = tokens[id];
                if (t.statusAtivos) {
                    let houveLimpeza = false;
                    let statusRestantes = { ...t.statusAtivos };
                    for (let idStatus in statusRestantes) {
                        const s = statusRestantes[idStatus];
                        const tempoCriado = s.timestamp || (agora - 40000);
                        if (agora - tempoCriado >= 30000) {
                            delete statusRestantes[idStatus];
                            houveLimpeza = true;
                        }
                    }
                    if (houveLimpeza) {
                        await window.mapaRef.child('tokens').child(id).child('statusAtivos').set(statusRestantes);
                    }
                }
            }
        }, 10000);
    },

    animarDano: function(tokenId) {
        const el = document.getElementById(`token-${tokenId}`);
        if (el) {
            el.classList.add('token-damaged');
            setTimeout(() => el.classList.remove('token-damaged'), 600);
        }
    }
};

window.StatusSystem.iniciarLoopTempoReal();