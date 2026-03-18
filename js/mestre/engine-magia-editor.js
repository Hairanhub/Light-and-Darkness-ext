/* ============================================================
   === [ ENGINE DE CRIAÇÃO DE MAGIAS E ÁREAS CUSTOM ] ===
   ============================================================ */

window.spellEditor = {
    colunas: 5,
    linhas: 8,
    matriz: [],

    init: function() {
        const grid = document.getElementById('spell-grid-editor');
        if (!grid) return;

        grid.innerHTML = '';
        
        // Verifica se já existe algo no input (para caso de edição)
        const inputMatriz = document.getElementById('reg-magia-matriz');
        if (inputMatriz && inputMatriz.value && inputMatriz.value !== "") {
            try {
                this.matriz = JSON.parse(inputMatriz.value);
            } catch(e) {
                this.matriz = new Array(this.colunas * this.linhas).fill(0);
            }
        } else {
            this.matriz = new Array(this.colunas * this.linhas).fill(0);
        }

        for (let i = 0; i < (this.colunas * this.linhas); i++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.index = i;
            
            // Ativa visualmente se a matriz já tiver o valor 1
            if (this.matriz[i] === 1) cell.classList.add('active');

            // Marcar o centro (ponto de origem do player: Coluna 2, Linha 7)
            // No index 0-39, o 37 é o centro inferior
            if (i === 37) cell.classList.add('origin-point'); 

            cell.onclick = () => {
                this.matriz[i] = this.matriz[i] === 0 ? 1 : 0;
                cell.classList.toggle('active');
                this.salvarMatrizNoInput();
            };
            grid.appendChild(cell);
        }
        
        // Garante que o input comece com a matriz atualizada
        this.salvarMatrizNoInput();
    },

    salvarMatrizNoInput: function() {
        const input = document.getElementById('reg-magia-matriz');
        if (input) {
            input.value = JSON.stringify(this.matriz);
            // Log para você conferir no console se está salvando no HTML
            console.log("📍 Matriz salva no input:", input.value);
        }
    },

    carregarMatriz: function(stringMatriz) {
        if(!stringMatriz) {
            this.init();
            return;
        }
        try {
            this.matriz = JSON.parse(stringMatriz);
            this.init(); // Reinicia o grid para refletir os dados carregados
        } catch(e) { 
            console.error("Erro ao carregar matriz:", e);
            this.init(); 
        }
    },

    atualizarUIEfeitos: function() {
        const tipo = document.getElementById('reg-magia-efeito-tipo').value;
        const campoRange = document.getElementById('campo-distancia-teleporte');
        const gridEditor = document.getElementById('spell-grid-editor');

        if (!gridEditor) return;

        if (tipo === 'teleporte') {
            if(campoRange) campoRange.style.display = 'block';
            gridEditor.style.opacity = '0.3';
            gridEditor.style.pointerEvents = 'none';
        } else {
            if(campoRange) campoRange.style.display = 'none';
            gridEditor.style.opacity = '1';
            gridEditor.style.pointerEvents = 'auto';
        }
    }
};

// CSS dinâmico para o Editor (Otimizado)
if (!document.getElementById('spell-editor-style')) {
    const style = document.createElement('style');
    style.id = 'spell-editor-style';
    style.innerHTML = `
        .spell-grid-editor {
            display: grid;
            grid-template-columns: repeat(5, 25px);
            gap: 2px;
            background: #111;
            padding: 5px;
            border: 2px solid #f3e520;
            width: fit-content;
            margin: 10px 0;
            border-radius: 4px;
        }
        .grid-cell {
            width: 25px;
            height: 25px;
            background: #222;
            cursor: pointer;
            border: 1px solid #333;
            transition: all 0.2s;
        }
        .grid-cell:hover { background: #444; border-color: #555; }
        .grid-cell.active { 
            background: #f3e520; 
            box-shadow: inset 0 0 10px #ffaa00, 0 0 5px rgba(243, 229, 32, 0.5);
            border-color: #fff;
        }
        .grid-cell.origin-point { 
            border: 2px solid #00ffcc !important;
            position: relative;
        }
        .grid-cell.origin-point::after {
            content: '👤';
            font-size: 10px;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
        }
    `;
    document.head.appendChild(style);
}