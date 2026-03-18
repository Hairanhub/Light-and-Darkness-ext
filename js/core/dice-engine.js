/* ============================================================
   === [ MOTOR DE ROLAGEM DE DADOS - RUBI IMPERIAL V1.2 ] ===
   ============================================================ */

// Inicializa a variável no objeto window para garantir sincronia global
window.isRolling = false;

/**
 * Função principal para rolar os dados
 * @param {number} sides - Lados do dado (4, 6, 8, 10, 12, 20)
 * @param {string} mode - "force" ignorar trava de segurança (opcional)
 */
function rollEngine(sides, mode = "") {
    if (window.isRolling && mode !== "force") return;

    window.isRolling = true;
    
    const resultDisplay = document.getElementById('result-val');
    const resultLog = document.getElementById('result-log');
    const diceSVG = document.getElementById(`svg-d${sides}`);
    const diceNum = document.getElementById(`num-d${sides}`);

    if (!diceSVG || !diceNum) {
        window.isRolling = false;
        return;
    }

    const diceWrapper = diceSVG.closest('.dice-wrapper');

    // 1. INÍCIO RÁPIDO
    diceWrapper.classList.add('dice-rolling'); 
    diceNum.classList.add('dice-blur');
    resultDisplay.textContent = "...";
    
    let iterations = 0;
    const maxIterations = 15; // Reduzi drasticamente (o dado gira pouco, mas gira rápido)
    
    const interval = setInterval(() => {
        let tempValue = Math.floor(Math.random() * sides) + 1;
        diceNum.textContent = (sides === 10 && tempValue === 10) ? 0 : tempValue;
        iterations++;

        if (iterations >= maxIterations) {
            clearInterval(interval);
            
            const finalResult = Math.floor(Math.random() * sides) + 1;
            diceNum.textContent = (sides === 10 && finalResult === 10) ? 0 : finalResult;
            
            // 2. PARAGEM IMEDIATA
            diceWrapper.classList.remove('dice-rolling');
            diceWrapper.classList.add('dice-impact');
            
            // Remove o efeito de impacto quase instantaneamente
            setTimeout(() => diceWrapper.classList.remove('dice-impact'), 200);
            
            diceNum.classList.remove('dice-blur');
            renderFinalScore(finalResult, sides);
            
            // 3. O TEMPO DE "DESCANSO" (Agora configurado para 1 segundo no total)
            // Isso controla quanto tempo a aba fica travada exibindo o número
            setTimeout(() => {
                window.isRolling = false; // Liberta para a próxima rolagem
                
                // Se o HUD demora a fechar, podes forçar o fecho aqui:
                // window.esconderConsoleDados();

                window.dispatchEvent(new CustomEvent('diceFinished', { detail: { result: finalResult } }));
            }, 1500); // 1 segundo de exibição é o ideal para leitura rápida
        }
    }, 60); // Giro ultra-veloz (40ms)
}
/**
 * Renderiza o valor final com cores e mensagens no visor
 */
function renderFinalScore(value, sides) {
    const resultDisplay = document.getElementById('result-val');
    const resultLog = document.getElementById('result-log');

    if (!resultDisplay || !resultLog) return;

    resultDisplay.textContent = value;

    if (value === sides) {
        resultDisplay.classList.add('crit-glow');
        resultLog.innerHTML = `<span style="color: #FFD700">SUCESSO CRÍTICO! (D${sides})</span>`;
    } else if (value === 1) {
        resultDisplay.style.color = "#ff4d4d";
        resultLog.innerHTML = `<span style="color: #ff4d4d">FALHA CRÍTICA! (D${sides})</span>`;
    } else {
        resultDisplay.style.color = "white";
        resultLog.textContent = `Resultado: ${value}`;
    }
}

/* ============================================================
   === [ FUNÇÕES DE CONTROLE DE VISIBILIDADE ] ===
   ============================================================ */

window.mostrarConsoleDados = function() {
    const hud = document.querySelector('.dice-console-hud');
    if (hud) {
        hud.classList.add('active');
        // Garante que o motor não está travado ao abrir
        window.isRolling = false; 
    }
};

window.esconderConsoleDados = function() {
    const hud = document.querySelector('.dice-console-hud');
    if (hud) {
        hud.classList.remove('active');
    }
};

function mudarSkinDado(tema) {
    const root = document.documentElement;
    
    const temas = {
        'rubi':   { corpo: '#4a0000', detalhe: '#FFD700' },
        'safira': { corpo: '#001a4a', detalhe: '#00d4ff' },
        'esmeralda': { corpo: '#003300', detalhe: '#00ff88' },
        'obsidiana': { corpo: '#111111', detalhe: '#ff0000' }
    };

    if (temas[tema]) {
        root.style.setProperty('--dice-color', temas[tema].corpo);
        root.style.setProperty('--dice-glow', temas[tema].detalhe);
        console.log(`🎲 Skin alterada para: ${tema}`);
    }
}