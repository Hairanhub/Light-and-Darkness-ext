/* ============================================================
   === [ NÚCLEO DE MATEMÁTICA DE COMBATE - V2.3 ] ===
   === Fix: Perfuração 30% da Lança implementada corretamente
   ============================================================ */

window.CombateMatematica = {
    
    calcularGolpe: function(atacante, alvo, armaAtacante, armaAlvo, rolagem, configPassivas = null) {
        
        const faceDado = rolagem.lados;
        const valorDado = rolagem.resultado;
        const totalDados = valorDado * (rolagem.quantidade || 1);

        let logAcontecimentos = []; 
        
        // 1. ESQUIVA DO ALVO (Separada da Defesa)
        let alvoUsandoInt = atacante.alvoDefesa === "INT";
        let esquivaAlvo = alvoUsandoInt 
            ? (parseInt(alvo.atributos?.int || 0) * (alvo.multiplicadores?.int || 1))
            : (parseInt(alvo.atributos?.dex || 0) * (alvo.multiplicadores?.dex || 1));

        if (armaAlvo) {
            let ehArmaPesada = armaAlvo.penalizaEsquivaPorForca || (armaAlvo.somaAtributoSecundario === "for");
            if (ehArmaPesada) {
                let forTotalAlvo = (parseInt(alvo.atributos?.for || 0) * (alvo.multiplicadores?.for || 1));
                esquivaAlvo = Math.max(esquivaAlvo, forTotalAlvo);
            }
        }

        // 2. BLOQUEIO DO ALVO (Separado da Esquiva)
        let bloqueioAlvo = parseInt(alvo.atributos?.def || 0) * (alvo.multiplicadores?.def || 1);

        // --- [ PASSO 6: A Lança Perfurante (30%) ] ---
        if (configPassivas && configPassivas.ignoraDefesa) {
            bloqueioAlvo = 0; // Zera a armadura do inimigo
            logAcontecimentos.push(`<small style="color: #ffaa00;">🔱 PERFURAÇÃO TOTAL! Armadura ignorada (30% ativou).</small>`);
        }

        // 3. ATAQUE TOTAL DO ATACANTE 
        let totalAtaque = totalDados + atacante.valorAtributoUsado + atacante.modificadorExtra;
        let falhaCritica = (valorDado === 1);

        // 🔍 AUDITORIA NO CONSOLE
        console.log(`%c🛡️ [AUDITORIA] Atributo Usado: ${atacante.valorAtributoUsado} | Total Ataque: ${totalAtaque}`, 'color: #ffaa00;');

        // 4. IDENTIFICAR MARGEM DE CRÍTICO
        let margemCritico = faceDado; 
        let isArcoOuBesta = false;

        if (armaAtacante && armaAtacante.tipo === 'ranged' && armaAtacante.atributoBase === 'dex') {
            isArcoOuBesta = true;
        } else if (atacante.armaEquipada && (atacante.armaEquipada.toLowerCase().includes('arco') || atacante.armaEquipada.toLowerCase().includes('besta'))) {
            isArcoOuBesta = true; 
        }

        if (faceDado === 20 && isArcoOuBesta) {
            margemCritico = 16; 
        }

        let rolouCriticoNoDado = (faceDado === 20 && valorDado >= margemCritico) || (faceDado !== 20 && valorDado === faceDado);
        let isCritico = rolouCriticoNoDado || alvo.statusAtuais?.dormindo || (configPassivas && configPassivas.maldicaoAtivou);

        // --- RESOLUÇÃO DE ACERTO / ERRO ---

        if (falhaCritica) {
            return {
                acertou: false, dano: 0,
                status: `<b style="color: #ff0000;">❌ FALHA CRÍTICA!</b><br>O ataque foi desastroso.`,
                acordouAlvo: false, quebrouGelo: false
            };
        }

        if (!isCritico && !atacante.isFurtivo) {
            if (totalAtaque <= esquivaAlvo) {
                return {
                    acertou: false, dano: 0,
                    status: `<b style="color: #3498db;">💨 ESQUIVA PERFEITA</b><br>O alvo desviou do ataque.`,
                    acordouAlvo: false, quebrouGelo: false
                };
            }
            else if (totalAtaque <= bloqueioAlvo) {
                return {
                    acertou: false, dano: 0,
                    status: `<b style="color: #aaaaaa;">🛡️ BLOQUEADO</b><br>Não perfurou a armadura.`,
                    acordouAlvo: false, quebrouGelo: false
                };
            }
        }

        // 5. CÁLCULO DE DANO CAUSADO
        let danoBase = Math.max(0, totalAtaque - bloqueioAlvo);

        if (atacante.danoMultiplicador && atacante.danoMultiplicador < 1) {
            danoBase = Math.floor(danoBase * atacante.danoMultiplicador);
            logAcontecimentos.push(`<b style="color: #ffaa00;">📉 Poder Reduzido (Invocação)</b>`);
        }

        let statusFinal = `💥 Dano: <b>${danoBase}</b>`;

        // 6. APLICAÇÃO DO CRÍTICO
        if (isCritico || atacante.isFurtivo) {
            danoBase *= 2; 
            if (alvo.statusAtuais?.dormindo) {
                statusFinal = `<b style="color: #ff4d4d;">🛌 GOLPE CRUEL (NO SONO): ${danoBase}!</b><br>🔔 O alvo ACORDOU!`;
            } else if (atacante.isFurtivo) {
                statusFinal = `<b style="color: #8a2be2;">🗡️ ASSASSINATO: ${danoBase}</b>`;
            } else if (configPassivas?.maldicaoAtivou) {
                statusFinal = `<b style="color: #9b59b6;">🔮 CRÍTICO AMALDIÇOADO: ${danoBase}!</b>`;
            } else if (rolouCriticoNoDado && valorDado < faceDado) {
                statusFinal = `<b style="color: #ff9900;">🎯 TIRO LETAL: ${danoBase}!</b>`;
            } else {
                statusFinal = `<b style="color: #ff4d4d;">🔥 CRÍTICO: ${danoBase}!</b>`;
            }
        }

        // 7. APLICAÇÃO DE PASSIVAS
        if (configPassivas && configPassivas.danoExtra > 0) {
            danoBase += configPassivas.danoExtra;
        }
        if (configPassivas && configPassivas.log) {
            logAcontecimentos.push(configPassivas.log);
        }

        if (configPassivas && configPassivas.multiplicadorDrakar) {
            danoBase *= configPassivas.multiplicadorDrakar;
        }

        if (alvo.statusAtuais?.congelado) {
            danoBase = Math.floor(danoBase * 1.3);
            logAcontecimentos.push(`<b style="color: #00ffff;">❄️ ESTILHAÇADO! (+30% Dano)</b>`);
        }
        
        if (logAcontecimentos.length > 0) {
            statusFinal += `<br>` + logAcontecimentos.join(`<br>`);
        }

        return {
            acertou: true,
            dano: danoBase,
            status: statusFinal,
            acordouAlvo: alvo.statusAtuais?.dormindo,
            quebrouGelo: alvo.statusAtuais?.congelado
        };
    }
};