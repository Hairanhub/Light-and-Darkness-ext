/**
 * STATUS SYSTEM - O CÉREBRO DE REGRAS V9.4
 * FIX: Barreiras físicas agora só protegem aliados/jogadores. Inimigos apanham normalmente!
 */
window.StatusSystem = {
    definitions: {
        "ESCUDO": { nome: "Escudo Mágico", icone: "🛡️", turnos: 3, tipoDano: "defesa" },
        "REGENERACAO": { nome: "Regeneração", icone: "💚", turnos: 1, tipoDano: "cura_passiva" },
        "INSPIRACAO": { nome: "Inspiração", icone: "🌟", turnos: 2, tipoDano: "buff" },
        "VELOCIDADE": { nome: "Velocidade", icone: "⚡", turnos: 2, tipoDano: "buff" },

        "VENENO": { nome: "Veneno", icone: "🤢", dano: 2, turnos: 6, tipoDano: "passivo" },
        "SANGRAMENTO": { nome: "Sangramento", icone: "🩸", dano: 4, turnos: 3, tipoDano: "passivo" },
        "NECROSE": { nome: "Necrose", icone: "💀", dano: 6, turnos: 2, tipoDano: "passivo" },
        "RAIO": { nome: "Raio", icone: "⚡", dano: 3, turnos: 2, tipoDano: "reacao" },
        "FOGO": { nome: "Fogo", icone: "🔥", dano: 8, turnos: 2, tipoDano: "passivo" },
        
        "BARREIRA": { nome: "Barreira Ativa", icone: "🧱", turnos: 3, tipoDano: "utilidade" },
        "REACAO_SUSPENSAO": { nome: "Eco da Ventania", icone: "🌪️💥", turnos: 3, tipoDano: "reacao_automatica" },
        "REACAO_SANGRAMENTO": { nome: "Vampirismo Místico", icone: "🩸💚", turnos: 3, tipoDano: "reacao_automatica" },

        "AR": { nome: "Ar", icone: "🌬️", turnos: 3, tipoDano: "debuff" }, 
        "AGUA": { nome: "Água", icone: "💧", turnos: 3, tipoDano: "debuff" },
        "NATUREZA": { nome: "Natureza", icone: "🌿", turnos: 2, tipoDano: "debuff", travaMovimento: true },
        "SONO": { nome: "Sono", icone: "💤", turnos: 3, tipoDano: "controle", travaMovimento: true, travaTurno: true },
        "TERRA": { nome: "Terra", icone: "⛰️", turnos: 2, tipoDano: "controle", travaMovimento: true, travaTurno: true },
        "GELO": { nome: "Gelo", icone: "❄️", turnos: 3, tipoDano: "controle", travaMovimento: false, travaTurno: false },
        "CEGUEIRA": { nome: "Cegueira", icone: "🕶️", turnos: 3, tipoDano: "debuff" },
        "CONFUSAO": { nome: "Confusão", icone: "🌀", turnos: 3, tipoDano: "debuff" },
        "MALDICAO": { nome: "Maldição", icone: "📉", turnos: 3, tipoDano: "debuff" },
        "MEDO": { nome: "Medo", icone: "😨", turnos: 3, tipoDano: "debuff" },
        "SUSPENSO": { nome: "Suspenso", icone: "🌪️", dano: 0, turnos: 2, tipoDano: "controle", travaMovimento: true, travaTurno: true }
    },

    reduzirDanoNoEscudo: async function(tokenId, danoBruto) {
        if (danoBruto <= 0 || !window.mapaRef) return danoBruto;
        const ref = window.mapaRef.child('tokens').child(tokenId);
        const snap = await ref.once('value');
        const token = snap.val();
        if (!token || !token.statusAtivos) return danoBruto;
        let chaveEscudo = Object.keys(token.statusAtivos).find(k => token.statusAtivos[k].tipo.toUpperCase() === "ESCUDO");
        if (chaveEscudo) {
            let escudoAtual = parseFloat(token.statusAtivos[chaveEscudo].valor);
            let danoAbsorvido = Math.min(escudoAtual, danoBruto);
            escudoAtual -= danoAbsorvido;
            let danoRestante = danoBruto - danoAbsorvido;
            window.StatusSystem.ultimoEscudo = { absorvido: Math.round(danoAbsorvido), restante: Math.round(escudoAtual), estilhacou: (escudoAtual <= 0) };
            if (escudoAtual <= 0) {
                await ref.child('statusAtivos').child(chaveEscudo).remove();
                if (window.combate) window.combate.notificarCombate(token.nome.toUpperCase(), `🛡️💥 <b>ESCUDO ESTILHAÇADO!</b> (Absorveu ${Math.round(danoAbsorvido)} de dano)`, "#00f2ff");
            } else {
                await ref.child('statusAtivos').child(chaveEscudo).update({ valor: escudoAtual });
                if (window.combate) window.combate.notificarCombate(token.nome.toUpperCase(), `🛡️ <b>ESCUDO ATIVO:</b> Absorveu ${Math.round(danoAbsorvido)} de dano. <span style="font-size:11px; color:#00f2ff;">[Restam ${Math.round(escudoAtual)} HP no Escudo]</span>`, "#00f2ff");
            }
            return danoRestante; 
        }
        return danoBruto;
    },

    modificarHP: async function(tokenId, delta) {
        if (!window.mapaRef) return;
        const ref = window.mapaRef.child('tokens').child(tokenId);
        const snap = await ref.once('value');
        const token = snap.val();
        if (!token) return;

        let hpAtual = parseFloat(token.hpAtual !== undefined ? token.hpAtual : (token.atributos?.hp || 20));
        let conMult = window.combate?.obterMultiplicadores(token).con || 1;
        let deltaConvertido = delta / conMult;

        if (deltaConvertido < 0) {
            // ✨ SISTEMA DE INTERCEPTAÇÃO: Só ativa se o alvo não for um monstro
            if (token.tipo !== 'monstro' && token.tipo !== 'monstros') {
                const snapTodos = await window.mapaRef.child('tokens').once('value');
                const todosTokens = snapTodos.val() || {};
                let barreiraInterceptoraId = null;

                for (let tid in todosTokens) {
                    let t = todosTokens[tid];
                    if (t.isBarreiraFisica && tid !== tokenId) { 
                        // Checa se a barreira está adjacente (distância máxima de um quadrado do grid: 105px ~ 110px de tolerância)
                        let distX = Math.abs((parseInt(t.x) || 0) - (parseInt(token.x) || 0));
                        let distY = Math.abs((parseInt(t.y) || 0) - (parseInt(token.y) || 0));
                        
                        if (distX <= 110 && distY <= 110) {
                            barreiraInterceptoraId = tid;
                            break; 
                        }
                    }
                }

                if (barreiraInterceptoraId) {
                    // A Barreira aliada toma o dano e é destruída
                    await window.mapaRef.child('tokens').child(barreiraInterceptoraId).remove();
                    if (window.combate) {
                        window.combate.notificarCombate(token.nome.toUpperCase(), `🧱 <b>INTERCEPTADO!</b> Uma Barreira aliada adjacente bloqueou o golpe e foi destruída!`, "#aaaaaa");
                    }
                    return hpAtual; // O alvo original sai ileso
                }
            }

            let danoVisualBruto = Math.abs(delta);
            let danoVisualRestante = await this.reduzirDanoNoEscudo(tokenId, danoVisualBruto);
            if (danoVisualRestante <= 0) return hpAtual; 
            deltaConvertido = -(danoVisualRestante / conMult);
        }

        if (deltaConvertido < 0 && this.temStatus(token, "GELO")) {
            if (Math.random() <= 0.3) {
                deltaConvertido = Math.floor(deltaConvertido * 1.3);
                if (window.combate) window.combate.notificarCombate(token.nome, "❄️ FRAQUEZA: O gelo quebrou! (+30% Dano)", "#00ffff");
            }
        }

        const novoHP = Math.max(0, hpAtual + deltaConvertido);

        if (novoHP <= 0) {
            if (window.combate) window.combate.notificarCombate(token.nome.toUpperCase(), "💀 DERROTADO EM COMBATE!", "#ff0000");
            if (window.iniciativa && typeof window.iniciativa.removerToken === 'function') window.iniciativa.removerToken(tokenId);
            if (token.tipo === 'monstro' || token.tipo === 'monstros') {
                if (window.lootEngine) window.lootEngine.processarMorte(tokenId, token);
                else await ref.remove(); 
            } else await ref.remove(); 
            return 0;
        } else {
            const updates = { hpAtual: novoHP };
            if (token.atributos && token.atributos.hp !== undefined) updates[`atributos/hp`] = novoHP;
            await ref.update(updates);
            if (delta < 0) this.animarDano(tokenId);
            return novoHP;
        }
    },

    checarProbabilidade: function(token, tipoStatus) {
        if (!token || !token.statusAtivos) return { ativou: false };
        const status = Object.values(token.statusAtivos).find(s => s.tipo.toUpperCase() === tipoStatus.toUpperCase());
        if (!status) return { ativou: false };
        const d10 = Math.floor(Math.random() * 10) + 1; 
        const tipo = tipoStatus.toUpperCase();
        const dadoRoladoHTML = `<span style="font-size: 11px; color: #a29bfe; float: right;">[Rolou: d10 = ${d10}]</span>`;
        const ativou = d10 <= 3; 

        if (tipo === "AGUA" || tipo === "NATUREZA") {
            if (ativou) {
                if (window.combate) {
                    const msg = tipo === "AGUA" ? `💧 Água: Pesado demais para esquivar! ${dadoRoladoHTML}` : `🌿 Natureza: Enraizado! Esquiva bloqueada! ${dadoRoladoHTML}`;
                    window.combate.notificarCombate(token.nome.toUpperCase(), msg, "#ff4444");
                }
                return { ativou: false, forcarAcerto: true }; 
            }
            if (window.combate) setTimeout(() => window.combate.notificarCombate(token.nome.toUpperCase(), tipo === "AGUA" ? `💧 Água: Conseguiu se mover! ${dadoRoladoHTML}` : `🌿 Natureza: Quebrou as raízes! ${dadoRoladoHTML}`, "#aaaaaa"), 100);
            return { ativou: false }; 
        }

        if (tipo === "MEDO") {
            if (d10 === 1) { 
                this.executarFuga(token);
                return { ativou: true, efeito: "fuga", msg: `😨 MEDO: ${(token.tipo === 'jogador') ? "Em pânico! Fugiu descontroladamente!" : "Correu de medo e abandonou a batalha!"} ${dadoRoladoHTML}` };
            }
            if (d10 === 2) return { ativou: true, efeito: "perdeu", msg: `😨 MEDO: Tremendo! Perdeu a ação! ${dadoRoladoHTML}` };
            if (d10 === 3) return { ativou: true, efeito: "enfraquecido", msg: `😨 MEDO: Dano Reduzido -30%! ${dadoRoladoHTML}` };
            if (window.combate) setTimeout(() => window.combate.notificarCombate(token.nome.toUpperCase(), `😨 MEDO: Engoliu o pavor e focou no ataque. ${dadoRoladoHTML}`, "#aaaaaa"), 100);
            return { ativou: false };
        }

        const tabelaSucesso = { "AR": `🌬️ Ar (Sufocando): Faltou ar! A ação falhou e o golpe foi repelido! ${dadoRoladoHTML}`, "CEGUEIRA": `🕶️ Cegueira: O ataque errou brutalmente! ${dadoRoladoHTML}`, "CONFUSAO": `🌀 Confusão: Perdeu completamente o turno! ${dadoRoladoHTML}` };
        const tabelaFalha = { "AR": `🌬️ Ar (Sufocando): Conseguiu fôlego para agir. ${dadoRoladoHTML}`, "CEGUEIRA": `🕶️ Cegueira: O instinto guiou o golpe! ${dadoRoladoHTML}`, "CONFUSAO": `🌀 Confusão: Manteve o foco e partiu para cima. ${dadoRoladoHTML}` };

        if (tabelaSucesso[tipo]) {
            if (ativou) return { ativou: true, msg: tabelaSucesso[tipo] };
            if (window.combate) setTimeout(() => window.combate.notificarCombate(token.nome.toUpperCase(), tabelaFalha[tipo], "#aaaaaa"), 100);
            return { ativou: false, msg: tabelaFalha[tipo] }; 
        }
        return { ativou: false };
    },

    executarFuga: async function(tokenData) {
        if (!window.mapaRef || !tokenData) return;
        let tokenId = null;
        const snap = await window.mapaRef.child('tokens').once('value');
        snap.forEach(child => {
            const td = child.val();
            if (td.x === tokenData.x && td.y === tokenData.y && td.nome === tokenData.nome) tokenId = child.key;
        });
        if (!tokenId) return;

        if (tokenData.tipo !== 'jogador') {
            await window.mapaRef.child('tokens').child(tokenId).remove();
            if (window.iniciativa && typeof window.iniciativa.removerToken === 'function') window.iniciativa.removerToken(tokenId);
            return;
        }

        const dirs = [{ x: 105, y: 0 }, { x: -105, y: 0 }, { x: 0, y: 105 }, { x: 0, y: -105 }, { x: 105, y: 105 }, { x: -105, y: -105 }, { x: 105, y: -105 }, { x: -105, y: 105 }];
        const dirAleatoria = dirs[Math.floor(Math.random() * dirs.length)];
        await window.mapaRef.child('tokens').child(tokenId).update({ x: parseInt(tokenData.x) + dirAleatoria.x, y: parseInt(tokenData.y) + dirAleatoria.y, "tokenVisuais/rot": 90 });
    },

    temStatus: function(token, tipoStatus) {
        if (!token || !token.statusAtivos) return false;
        return Object.values(token.statusAtivos).some(s => s.tipo.toUpperCase() === tipoStatus.toUpperCase());
    },

    aplicarReducoesDeDano: function(tokenAtacante, danoOriginal) {
        if (!tokenAtacante || !tokenAtacante.statusAtivos) return danoOriginal;
        let danoFinal = danoOriginal;
        if (Object.values(tokenAtacante.statusAtivos).some(s => s.tipo.toUpperCase() === "MALDICAO")) {
            danoFinal = Math.floor(danoFinal * 0.7);
        }
        return danoFinal;
    },

    aplicarStatus: async function(tokenId, tipoStatus, danoCausado = null, potenciaRaw = "0") {
        const nomeChave = tipoStatus.toUpperCase();
        const config = this.definitions[nomeChave];
        if (!config) return;

        if (danoCausado !== null && danoCausado <= 0) {
            const exigeContato = ["VENENO", "SANGRAMENTO", "FOGO", "NATUREZA"];
            if (exigeContato.includes(nomeChave)) return; 
        }

        const refToken = window.mapaRef.child('tokens').child(tokenId);
        const snap = await refToken.once('value');
        const token = snap.val();
        if (!token) return;

        const snapTodos = await window.mapaRef.child('tokens').once('value');
        const todos = snapTodos.val() || {};

        if (nomeChave === "SUSPENSO" || nomeChave === "SANGRAMENTO") {
            for (let id in todos) {
                let currToken = todos[id];
                if (id === tokenId) continue; 
                
                let temReacaoEquipada = false;

                let strTokenCompleta = JSON.stringify(currToken).toUpperCase();
                let temPalavraReacao = strTokenCompleta.includes("REACAO") || strTokenCompleta.includes("REAÇÃO") || strTokenCompleta.includes("REACÃO");
                
                if (temPalavraReacao) {
                    if (nomeChave === "SUSPENSO" && (strTokenCompleta.includes("VENTANIA") || strTokenCompleta.includes("REACAO_SUSPENSAO"))) temReacaoEquipada = true;
                    if (nomeChave === "SANGRAMENTO" && (strTokenCompleta.includes("VAMPIRISMO") || strTokenCompleta.includes("REACAO_SANGRAMENTO") || strTokenCompleta.includes("SANGRA"))) temReacaoEquipada = true;
                }

                if (!temReacaoEquipada && currToken.dono && String(currToken.dono).trim() !== "") {
                    const donoForm = String(currToken.dono).trim();
                    try {
                        const invSnap = await window.database.ref('usuarios').child(donoForm).child('inventario').once('value');
                        const inv = invSnap.val() || {};
                        
                        const magiasEquipadas = [inv["69"], inv["70"], inv["71"], inv["72"]].filter(m => m !== undefined && m !== null);
                        let strMagias = JSON.stringify(magiasEquipadas).toUpperCase();
                        
                        let magiasTemReacao = strMagias.includes("REACAO") || strMagias.includes("REAÇÃO") || strMagias.includes("REACÃO");
                        if (magiasTemReacao) {
                            if (nomeChave === "SUSPENSO" && (strMagias.includes("VENTANIA") || strMagias.includes("REACAO_SUSPENSAO"))) temReacaoEquipada = true;
                            if (nomeChave === "SANGRAMENTO" && (strMagias.includes("VAMPIRISMO") || strMagias.includes("REACAO_SANGRAMENTO") || strMagias.includes("SANGRA"))) temReacaoEquipada = true;
                        }
                    } catch(err) {
                        console.warn("Erro ao ler slots de magia para reações: ", err);
                    }
                }

                if (temReacaoEquipada) {
                    if (nomeChave === "SUSPENSO") {
                        const d8 = Math.floor(Math.random() * 8) + 1;
                        await this.modificarHP(tokenId, -d8); 
                        if (window.combate) window.combate.notificarCombate(currToken.nome.toUpperCase(), `🌪️💥 <b>MAGIA DE REAÇÃO: ECO DA VENTANIA!</b> -${d8} HP pela suspensão do alvo.`, "#ffaa00");
                    } else {
                        await this.modificarHP(id, 4); 
                        if (window.combate) window.combate.notificarCombate(currToken.nome.toUpperCase(), `🩸💚 <b>MAGIA DE REAÇÃO: VAMPIRISMO MÍSTICO!</b> Curou +4 HP com o sangramento do inimigo.`, "#32ff32");
                    }
                }
            }
        }

        let valorCalculado = config.dano || 0; 
        let atributoAlvo = null; 
        
        if (nomeChave === "VELOCIDADE") atributoAlvo = "dex";
        else if (nomeChave === "INSPIRACAO") {
            let attrs = token.atributos || {}; let maxAttr = 'for'; let maxVal = -1;
            ['for', 'dex', 'int', 'def', 'car', 'con'].forEach(a => { if ((parseInt(attrs[a]) || 0) > maxVal) { maxVal = parseInt(attrs[a]) || 0; maxAttr = a; }});
            atributoAlvo = maxAttr;
        }

        if (potenciaRaw && potenciaRaw !== "0") {
            let pStr = String(potenciaRaw).trim();
            if (pStr.includes('%')) {
                let porcentagem = parseFloat(pStr.replace('%', '')) / 100;
                if (["ESCUDO", "REGENERACAO"].includes(nomeChave)) {
                    let baseHp = parseFloat(token.hpMax || token.atributos?.hpMax || token.atributos?.hp || 20);
                    let conMult = 1;
                    if (window.combate && window.combate.obterMultiplicadores) conMult = window.combate.obterMultiplicadores(token).con || 1;
                    valorCalculado = Math.max(1, Math.floor(baseHp * conMult * porcentagem));
                } else if (nomeChave === "VELOCIDADE") {
                    valorCalculado = Math.max(1, Math.floor(parseFloat(token.atributos?.dex || 10) * porcentagem));
                } else if (nomeChave === "INSPIRACAO") {
                    let valAttr = parseFloat(token.atributos?.[atributoAlvo] || 10);
                    valorCalculado = Math.max(1, Math.floor(valAttr * porcentagem));
                }
            } else {
                if (config.dano && (config.tipoDano === "passivo" || config.tipoDano === "reacao")) {
                    valorCalculado = config.dano;
                } else {
                    valorCalculado = parseFloat(pStr) || 0;
                }
            }
        }

        if (nomeChave === "REGENERACAO" || config.tipoDano === "cura_passiva") {
            await this.modificarHP(tokenId, Math.abs(valorCalculado));
            if (window.combate) window.combate.notificarCombate(token.nome.toUpperCase(), `✨ Curou +${valorCalculado} HP instantaneamente!`, "#32ff32");
            if (config.turnos <= 1) return;
        }

        let statusAtivos = token.statusAtivos || {};
        let chaveExistente = Object.keys(statusAtivos).find(k => statusAtivos[k].tipo.toUpperCase() === nomeChave);

        const statusData = { tipo: nomeChave.toLowerCase(), valor: valorCalculado, duracao: config.turnos, timestamp: Date.now() };
        if (atributoAlvo) statusData.atributoAlvo = atributoAlvo;

        let dbUpdates = {};

        if (chaveExistente) {
            let objExistente = statusAtivos[chaveExistente];
            if (nomeChave === "VENENO") {
                let novoDano = (parseInt(objExistente.valor) || config.dano) + config.dano; 
                statusData.valor = novoDano; 
                await refToken.child('statusAtivos').child(chaveExistente).update(statusData);
                if (window.combate) window.combate.notificarCombate(token.nome.toUpperCase(), `🤢 <b>VENENO ACUMULADO!</b> (${novoDano / config.dano} Stacks ➔ -${novoDano} HP/turno)`, "#32ff32");
            } else if (nomeChave === "ESCUDO") {
                if (valorCalculado > (parseInt(objExistente.valor) || 0)) {
                    await refToken.child('statusAtivos').child(chaveExistente).update(statusData);
                    if (window.combate) window.combate.notificarCombate(token.nome.toUpperCase(), `🛡️ Escudo Mágico Sobreposto! <span style="font-size:11px; color:#00f2ff;">[Novo: ${valorCalculado} HP]</span>`, "#00f2ff");
                } else {
                    await refToken.child('statusAtivos').child(chaveExistente).update({ duracao: config.turnos, timestamp: Date.now() });
                    if (window.combate) window.combate.notificarCombate(token.nome.toUpperCase(), `🔄 Duração do Escudo Mágico renovada!`, "#00f2ff");
                }
            } else if (nomeChave === "VELOCIDADE" || nomeChave === "INSPIRACAO") {
                await refToken.child('statusAtivos').child(chaveExistente).update({ duracao: config.turnos, timestamp: Date.now() });
                if (window.combate) window.combate.notificarCombate(token.nome.toUpperCase(), `🔄 <b>${config.nome}</b> renovado!`, "#00ffcc");
            } else {
                await refToken.child('statusAtivos').child(chaveExistente).update(statusData);
                if (window.combate) window.combate.notificarCombate(token.nome.toUpperCase(), `🔄 <b>${config.nome}</b> renovado!`, "#ffaa00");
            }
        } else {
            dbUpdates[`statusAtivos/${nomeChave.toLowerCase()}`] = statusData;
            let notificacaoExtra = "";
            if (atributoAlvo && valorCalculado > 0) {
                dbUpdates[`atributos/${atributoAlvo}`] = (parseInt(token.atributos?.[atributoAlvo]) || 0) + valorCalculado;
                notificacaoExtra = ` <br><span style="font-size:11px;">[+${valorCalculado} ${atributoAlvo.toUpperCase()}]</span>`;
            }
            await refToken.update(dbUpdates);
            
            if (window.combate && !["REGENERACAO"].includes(nomeChave)) {
                let corNotificacao = "#ffaa00"; 
                if (nomeChave === "NECROSE") corNotificacao = "#800080"; 
                if (nomeChave === "VENENO") corNotificacao = "#32ff32"; 
                if (nomeChave === "SANGRAMENTO") corNotificacao = "#ff3333"; 
                if (nomeChave === "ESCUDO" || nomeChave === "VELOCIDADE") corNotificacao = "#00f2ff"; 
                if (nomeChave === "INSPIRACAO" || nomeChave === "REACAO_SUSPENSAO" || nomeChave === "REACAO_SANGRAMENTO") corNotificacao = "#f3e520";

                let msgExtra = notificacaoExtra;
                if (nomeChave === "ESCUDO") msgExtra = ` <br><span style="font-size:11px; color:#00f2ff;">[🛡️ Absorve: ${valorCalculado} HP]</span>`;
                else if (valorCalculado > 0 && !atributoAlvo && !["VENENO", "SANGRAMENTO", "FOGO", "NECROSE", "VELOCIDADE", "INSPIRACAO", "REACAO_SUSPENSAO", "REACAO_SANGRAMENTO"].includes(nomeChave)) {
                    msgExtra = ` <br><span style="font-size:11px;">[Potência: ${valorCalculado}]</span>`;
                }

                window.combate.notificarCombate(token.nome.toUpperCase(), `✨ Ganhou <b>${config.nome}</b>! ${msgExtra}`, corNotificacao);
            }
        }
    },

    processarTurno: async function(tokenId) {
        if (!window.mapaRef) return;
        const lockRef = window.mapaRef.child('tokens').child(tokenId).child('travaTurnoStatus');
        try {
            const lockResult = await lockRef.transaction((atual) => {
                const agora = Date.now();
                if (atual && (agora - atual < 2500)) return undefined; 
                return agora; 
            });
            if (!lockResult.committed) return;
        } catch (e) { console.error("Erro na transação de status:", e); }

        const snap = await window.mapaRef.child('tokens').child(tokenId).once('value');
        const token = snap.val();
        if (!token || !token.statusAtivos) return;

        let statusAtuais = { ...token.statusAtivos };
        let houveAlteracao = false;
        let statusLimpos = {};

        for (let idUnico in statusAtuais) {
            let s = statusAtuais[idUnico];
            const tipoChave = s.tipo.toUpperCase();
            if (statusLimpos[tipoChave]) {
                if (tipoChave === "VENENO") statusLimpos[tipoChave].valor = (parseInt(statusLimpos[tipoChave].valor) || 0) + (parseInt(s.valor) || 0);
                statusLimpos[tipoChave].duracao = Math.max(statusLimpos[tipoChave].duracao, s.duracao);
                houveAlteracao = true; 
            } else {
                statusLimpos[tipoChave] = s; 
            }
        }
        
        statusAtuais = {};
        for (let tipo in statusLimpos) statusAtuais[tipo.toLowerCase()] = statusLimpos[tipo]; 

        let totalDanoTurno = 0;
        let totalCuraTurno = 0;
        let logsAtivos = [];
        let reversoesAtributo = {}; 

        for (let idUnico in statusAtuais) {
            let s = statusAtuais[idUnico];
            const tipoChave = s.tipo.toUpperCase();
            const config = this.definitions[tipoChave];
            if (!config) continue;

            if (config.tipoDano === "passivo") {
                const valorDano = (parseInt(s.valor) > 0) ? parseInt(s.valor) : config.dano;
                totalDanoTurno += valorDano;
                logsAtivos.push(`${config.icone} ${config.nome}: -${valorDano} HP`);
                houveAlteracao = true;
            } else if (config.tipoDano === "cura_passiva") {
                const valorCura = parseInt(s.valor) || 0;
                totalCuraTurno += valorCura;
                logsAtivos.push(`${config.icone} ${config.nome}: +${valorCura} HP`);
                houveAlteracao = true;
            }

            s.duracao = (parseInt(s.duracao) || 1) - 1;
            houveAlteracao = true;
            
            if (s.duracao <= 0) {
                if (tipoChave === "BARREIRA") {
                    const snapT = await window.mapaRef.child('tokens').once('value');
                    const tokensNoMapa = snapT.val() || {};
                    for(let tid in tokensNoMapa) {
                        if (tokensNoMapa[tid].dono === tokenId && tokensNoMapa[tid].isBarreiraFisica) {
                            await window.mapaRef.child('tokens').child(tid).remove();
                        }
                    }
                    logsAtivos.push(`🧱 A <b>Barreira Mágica</b> se desintegrou.`);
                }
                
                if (s.atributoAlvo && s.valor > 0) {
                    reversoesAtributo[`atributos/${s.atributoAlvo}`] = Math.max(0, (parseInt(token.atributos?.[s.atributoAlvo]) || 0) - s.valor);
                    logsAtivos.push(`📉 O efeito <b>${config.nome}</b> passou. Atributos normais.`);
                } else if (tipoChave === "ESCUDO") {
                    logsAtivos.push(`🛡️💨 A energia do <b>Escudo Mágico</b> se dissipou.`);
                } else if (!["REGENERACAO", "VENENO", "SANGRAMENTO", "FOGO", "NECROSE", "BARREIRA"].includes(tipoChave)) {
                    logsAtivos.push(`💨 O efeito <b>${config.nome}</b> passou.`);
                }
                delete statusAtuais[idUnico];
            }
        }

        if (houveAlteracao) {
            let variacaoFinal = totalCuraTurno - totalDanoTurno; 
            if (variacaoFinal !== 0) {
                let conMultStatus = window.combate?.obterMultiplicadores(token).con || 1;
                let hpVisualAntes = Math.round(parseFloat(token.hpAtual !== undefined ? token.hpAtual : token.atributos?.hp) * conMultStatus);
                await this.modificarHP(tokenId, variacaoFinal * conMultStatus); 
                let hpVisualDepois = Math.max(0, hpVisualAntes + Math.round(variacaoFinal * conMultStatus));
                logsAtivos.push(`<span style="font-size: 11px; color: #cccccc;">[❤️ ${hpVisualAntes} ➔ ${hpVisualDepois}]</span>`);
            }
            const tokenAindaExiste = await window.mapaRef.child('tokens').child(tokenId).once('value');
            if (tokenAindaExiste.exists()) {
                if (logsAtivos.length > 0 && window.combate) window.combate.notificarCombate(token.nome.toUpperCase(), logsAtivos.join('<br>'), (variacaoFinal >= 0 ? "#32ff32" : "#ff5500"));
                await window.mapaRef.child('tokens').child(tokenId).update({ statusAtivos: statusAtuais, ...reversoesAtributo });
            }
        }
    },

    aplicarDanoReacao: async function(tokenId, danoEspecifico = null) {
        const snap = await window.mapaRef.child('tokens').child(tokenId).once('value');
        const token = snap.val();
        if (!token || !token.statusAtivos) return;

        for (let idUnico in token.statusAtivos) {
            if (token.statusAtivos[idUnico].tipo.toUpperCase() === "RAIO") {
                const dano = danoEspecifico !== null ? danoEspecifico : 3; 
                if (dano > 0) {
                    await this.modificarHP(tokenId, -dano);
                    if (window.combate) window.combate.notificarCombate(token.nome.toUpperCase(), `⚡ RAIO REAGIU: -${dano} HP!`, "#ffff00");
                }
                break; 
            }
        }
    },

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
                    let reversoes = {};

                    for (let idStatus in statusRestantes) {
                        const s = statusRestantes[idStatus];
                        if (agora - (s.timestamp || (agora - 40000)) >= 30000) {
                            const tipoChave = s.tipo.toUpperCase();
                            if (s.atributoAlvo && s.valor > 0) {
                                reversoes[`atributos/${s.atributoAlvo}`] = Math.max(0, (parseInt(t.atributos?.[s.atributoAlvo]) || 0) - s.valor);
                                if (window.combate) window.combate.notificarCombate(t.nome.toUpperCase(), `📉 O efeito <b>${tipoChave}</b> esgotou. Atributos normais.`, "#aaaaaa");
                            } else if (tipoChave === "ESCUDO") {
                                if (window.combate) window.combate.notificarCombate(t.nome.toUpperCase(), `🛡️💨 A energia do <b>Escudo Mágico</b> se dissipou pelo tempo.`, "#aaaaaa");
                            } else if (tipoChave === "BARREIRA") {
                                for(let tid in tokens) {
                                    if (tokens[tid].dono === id && tokens[tid].isBarreiraFisica) await window.mapaRef.child('tokens').child(tid).remove();
                                }
                                if (window.combate) window.combate.notificarCombate(t.nome.toUpperCase(), `🧱 A <b>Barreira Mágica</b> se desintegrou pelo tempo.`, "#aaaaaa");
                            } else if (!["REGENERACAO", "VENENO", "SANGRAMENTO", "FOGO", "NECROSE"].includes(tipoChave)) {
                                if (window.combate) window.combate.notificarCombate(t.nome.toUpperCase(), `💨 O efeito <b>${tipoChave}</b> passou.`, "#aaaaaa");
                            }
                            delete statusRestantes[idStatus];
                            houveLimpeza = true;
                        }
                    }
                    if (houveLimpeza) await window.mapaRef.child('tokens').child(id).update({ statusAtivos: statusRestantes, ...reversoes });
                }
            }
        }, 10000); 
    },

    removerStatus: async function(tokenId, tipoStatus) {
        const refToken = window.mapaRef.child('tokens').child(tokenId);
        const snap = await refToken.once('value');
        const token = snap.val();
        if (!token || !token.statusAtivos) return;

        const nomeChave = tipoStatus.toUpperCase();
        for (let idUnico in token.statusAtivos) {
            if (token.statusAtivos[idUnico].tipo.toUpperCase() === nomeChave) {
                let s = token.statusAtivos[idUnico];
                if (s.atributoAlvo && s.valor > 0) {
                    await refToken.child('atributos').child(s.atributoAlvo).set(Math.max(0, (parseInt(token.atributos?.[s.atributoAlvo]) || 0) - s.valor));
                }
                await refToken.child('statusAtivos').child(idUnico).remove();
                break;
            }
        }
    },

    animarDano: function(tokenId) {
        const el = document.getElementById(`token-${tokenId}`);
        if (el) { el.classList.add('token-damaged'); setTimeout(() => el.classList.remove('token-damaged'), 600); }
    }
};

window.StatusSystem.iniciarLoopTempoReal();