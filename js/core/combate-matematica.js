/* ============================================================
   === [ NÚCLEO DE MATEMÁTICA DE COMBATE - V1.8 ] ===
   === Fix: Ordem de Operação + Dano 50% (Tomo)
   ============================================================ */

window.CombateMatematica = {
    
    calcularGolpe: function(atacante, alvo, armaAtacante, armaAlvo, rolagem, configPassivas = null) {
        
        const faceDado = rolagem.lados;
        const valorDado = rolagem.resultado;
        const totalDados = valorDado * (rolagem.quantidade || 1);

        let logAcontecimentos = []; 
        
        // 1. BLINDAGEM DO ALVO
        let esquivaAlvo = atacante.alvoDefesa === "INT" 
            ? (parseInt(alvo.atributos?.int || 0) * (alvo.multiplicadores?.int || 1))
            : (parseInt(alvo.atributos?.dex || 0) * (alvo.multiplicadores?.dex || 1));

        if (armaAlvo) {
            let ehArmaPesada = armaAlvo.penalizaEsquivaPorForca || (armaAlvo.somaAtributoSecundario === "for");
            
            if (ehArmaPesada) {
                let forTotalAlvo = (parseInt(alvo.atributos?.for || 0) * (alvo.multiplicadores?.for || 1));
                esquivaAlvo = Math.max(esquivaAlvo, forTotalAlvo);
            }
        }

        let bloqueioAlvo = parseInt(alvo.atributos?.def || 0) * (alvo.multiplicadores?.def || 1);
        let defesaPassiva = esquivaAlvo + bloqueioAlvo;

        // 2. ATAQUE TOTAL
        let totalAtaque = totalDados + atacante.valorAtributoUsado + atacante.modificadorExtra;
        let falhaCritica = (valorDado === 1);

        // 3. IDENTIFICAR MARGEM DE CRÍTICO EXPANDIDA
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

        if (falhaCritica) {
            return {
                acertou: false, dano: 0,
                status: `<b style="color: #ff0000;">❌ FALHA CRÍTICA!</b><br>O ataque foi desastroso.`,
                acordouAlvo: false, quebrouGelo: false
            };
        }

        if (totalAtaque < defesaPassiva && !isCritico && !atacante.isFurtivo) {
            return {
                acertou: false, dano: 0,
                status: `<b style="color: #aaaaaa;">🛡️ BLOQUEADO / ESQUIVA</b><br>O alvo se defendeu com maestria.`,
                acordouAlvo: false, quebrouGelo: false
            };
        }

        // 4. CÁLCULO DE DANO CAUSADO
        let danoBase = Math.max(0, totalAtaque - defesaPassiva);

        // 🔥 NOVO: PENALIDADE DE DANO DA INVOCAÇÃO DE TOMO
        if (atacante.danoMultiplicador && atacante.danoMultiplicador < 1) {
            danoBase = Math.floor(danoBase * atacante.danoMultiplicador);
            logAcontecimentos.push(`<b style="color: #ffaa00;">📉 Poder do Tomo (Dano Reduzido a 50%)</b>`);
        }

        let statusFinal = `💥 Dano: <b>${danoBase}</b>`;

        // 5. APLICAÇÃO DO CRÍTICO
        if (isCritico || atacante.isFurtivo) {
            danoBase *= 2; 
            
            if (alvo.statusAtuais?.dormindo) {
                statusFinal = `<b style="color: #ff4d4d;">🛌 GOLPE CRUEL (CRÍTICO NO SONO): ${danoBase}!</b><br>🔔 O alvo ACORDOU!`;
            } else if (atacante.isFurtivo) {
                statusFinal = `<b style="color: #8a2be2;">🗡️ ASSASSINATO: ${danoBase}</b>`;
            } else if (configPassivas?.maldicaoAtivou) {
                statusFinal = `<b style="color: #9b59b6;">🔮 CRÍTICO AMALDIÇOADO: ${danoBase}!</b>`;
            } else if (rolouCriticoNoDado && valorDado < faceDado) {
                statusFinal = `<b style="color: #ff9900;">🎯 TIRO LETAL (CRÍTICO NO ${valorDado}): ${danoBase}!</b>`;
            } else {
                statusFinal = `<b style="color: #ff4d4d;">🔥 CRÍTICO: ${danoBase}!</b>`;
            }
        }

        // 6. APLICAÇÃO DE PASSIVAS
        if (configPassivas && configPassivas.danoExtra > 0) {
            danoBase += configPassivas.danoExtra;
            if (configPassivas.log) logAcontecimentos.push(configPassivas.log);
        }

        if (configPassivas && configPassivas.multiplicadorDrakar) {
            danoBase *= configPassivas.multiplicadorDrakar;
        }

        if (alvo.statusAtuais?.congelado) {
            danoBase = Math.floor(danoBase * 1.3);
            logAcontecimentos.push(`<b style="color: #00ffff;">❄️ ESTILHAÇADO! (+30% Dano Bônus)</b>`);
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