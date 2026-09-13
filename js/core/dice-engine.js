/* ============================================================
   === [ MOTOR DE ROLAGEM DE DADOS - RUBI IMPERIAL V1.2 ] ===
   ============================================================ */

window.isRolling = false;

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

    diceWrapper.classList.add('dice-rolling'); 
    diceNum.classList.add('dice-blur');
    resultDisplay.textContent = "...";
    
    let iterations = 0;
    const maxIterations = 15; 
    
    const interval = setInterval(() => {
        let tempValue = Math.floor(Math.random() * sides) + 1;
        diceNum.textContent = (sides === 10 && tempValue === 10) ? 0 : tempValue;
        iterations++;

        if (iterations >= maxIterations) {
            clearInterval(interval);
            
            const finalResult = Math.floor(Math.random() * sides) + 1;
            diceNum.textContent = (sides === 10 && finalResult === 10) ? 0 : finalResult;
            
            diceWrapper.classList.remove('dice-rolling');
            diceWrapper.classList.add('dice-impact');
            
            setTimeout(() => diceWrapper.classList.remove('dice-impact'), 200);
            
            diceNum.classList.remove('dice-blur');
            renderFinalScore(finalResult, sides);
            
            setTimeout(() => {
                window.isRolling = false; 
                
                // 🔥 FIX: Adicionado "sides: sides" no evento para o motor de combate saber o lado do dado!
                window.dispatchEvent(new CustomEvent('diceFinished', { detail: { result: finalResult, sides: sides } }));
            }, 1500); 
        }
    }, 60); 
}

function renderFinalScore(value, sides) {
    const resultDisplay = document.getElementById('result-val');
    const resultLog = document.getElementById('result-log');

    if (!resultDisplay || !resultLog) return;

    resultDisplay.textContent = value;

    // Nota da Sara: Mantive o visual do HUD brilhando só no 20 natural, 
    // mas o dano letal vai ser processado no chat pelo motor matemático!
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

window.mostrarConsoleDados = function() {
    const hud = document.querySelector('.dice-console-hud');
    if (hud) {
        hud.classList.add('active');
        window.isRolling = false; 
    }
};

window.esconderConsoleDados = function() {
    const hud = document.querySelector('.dice-console-hud');
    if (hud) hud.classList.remove('active');
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