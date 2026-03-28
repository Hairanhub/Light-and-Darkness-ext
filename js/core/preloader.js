window.addEventListener('load', function() {
    const loader = document.getElementById('loading-overlay');
    if (!loader) return; 

    const status = document.getElementById('loading-status');
    const barFill = document.getElementById('loading-bar-fill');
    const percentageText = document.getElementById('loading-percentage');
    const quoteText = document.getElementById('loading-quote');
    const spinner = document.getElementById('loading-spinner');

    const isMestre = localStorage.getItem('rubi_role') === 'gm';

    // 1. FUNDOS DINÂMICOS
    const totalImagens = 7;
    const sorteio = Math.floor(Math.random() * totalImagens) + 1;
    const urlImagem = `assets/backgrounds/bg${sorteio}.png`;
    
    const imgPreload = new Image();
    imgPreload.src = urlImagem;
    imgPreload.onload = () => {
        if (loader) loader.style.backgroundImage = `url('${urlImagem}')`;
    };

    // 2. CONFIGURAÇÃO VISUAL AUTOMÁTICA
    const frasesJogador = [
        "Afiando as lâminas...",
        "Canalizando a mana...",
        "Evocando criaturas...",
        "Consultando o Códice...",
        "Preparando o mapa...",
        "Sincronizando os ventos da magia..."
    ];

    const frasesMestre = [
        "Escondendo as armadilhas...",
        "Afiando as garras dos monstros...",
        "Preparando reviravoltas dramáticas...",
        "Consultando o Códice Proibido...",
        "Espalhando a névoa de guerra...",
        "Rolando dados atrás do escudo..."
    ];

    const frases = isMestre ? frasesMestre : frasesJogador;

    if (isMestre) {
        if (barFill) barFill.style.background = "linear-gradient(90deg, #8e44ad, #e74c3c)";
        if (percentageText) percentageText.style.color = "#e74c3c";
        if (spinner) spinner.style.borderLeftColor = "#e74c3c";
        if (quoteText) quoteText.innerText = "O Olho que Tudo Vê Desperta...";
    } else {
        if (barFill) barFill.style.background = "linear-gradient(90deg, #2ecc71, #f3e520)";
        if (percentageText) percentageText.style.color = "#f3e520";
        if (spinner) spinner.style.borderLeftColor = "#f3e520";
        if (quoteText) quoteText.innerText = "Acessando o Tabuleiro...";
    }

    // 3. ANIMAÇÃO DAS FRASES
    let fraseInterval = setInterval(() => {
        if (!quoteText) return;
        quoteText.style.opacity = 0;
        setTimeout(() => {
            quoteText.innerText = frases[Math.floor(Math.random() * frases.length)];
            quoteText.style.opacity = 1;
        }, 300); 
    }, 2500); 

    if (quoteText) quoteText.style.transition = "opacity 0.3s ease";

    // =========================================================
    // 🔥 4. LÓGICA DE SINCRONIZAÇÃO COM O FIREBASE 🔥
    // =========================================================
    let preloaderEncerrado = false;

    // Trava de segurança global: Se o Firebase cair ou a internet travar, libera a tela em 10 segundos
    const timeoutSeguranca = setTimeout(() => {
        if (!preloaderEncerrado) finalizarCarregamento();
    }, 10000);

    // Fica vigiando até o banco de dados estar conectado
    function aguardarFirebase() {
        if (window.mapaRef) {
            if (status) status.innerText = "Conectando ao banco de dados...";
            
            // O '.once('value')' faz o sistema ESPERAR baixar todos os tokens e blocos do mapa
            window.mapaRef.once('value').then(() => {
                if (status) status.innerText = "Dados recebidos, renderizando mapa...";
                
                // Dá 500ms pro HTML transformar os dados em <img> na tela, e então conta as imagens
                setTimeout(verificarImagens, 500);
            }).catch(() => {
                verificarImagens(); // Libera em caso de erro no banco
            });
        } else {
            setTimeout(aguardarFirebase, 100); // Tenta de novo em 0.1 segundo
        }
    }

    aguardarFirebase(); // Inicia a vigia do Firebase

    function atualizarProgresso(carregadas, total) {
        if (total === 0) total = 1; 
        let porcentagem = Math.floor((carregadas / total) * 100);
        porcentagem = Math.max(0, Math.min(100, porcentagem));
        
        if (barFill) barFill.style.width = porcentagem + '%';
        if (percentageText) percentageText.innerText = porcentagem + '%';
        
        if (status && porcentagem < 100) {
            status.innerText = isMestre ? `Desenhando elementos (${carregadas}/${total})...` : `Baixando texturas (${carregadas}/${total})...`;
        }
    }

    function verificarImagens() {
        if (preloaderEncerrado) return;

        const imagens = document.querySelectorAll('img, .token-image-body');
        let carregadas = 0;
        const total = imagens.length;

        if (total === 0) {
            atualizarProgresso(1, 1);
            finalizarCarregamento();
            return;
        }

        atualizarProgresso(0, total);

        imagens.forEach(img => {
            if (img.classList.contains('token-image-body')) {
                const url = img.style.backgroundImage.slice(5, -2);
                if (!url || url === '\"') {
                    carregadas++;
                    atualizarProgresso(carregadas, total);
                    if (carregadas >= total) finalizarCarregamento();
                    return;
                }
                const tempImg = new Image();
                tempImg.src = url;
                tempImg.onload = tempImg.onerror = () => {
                    carregadas++;
                    atualizarProgresso(carregadas, total);
                    if (carregadas >= total) finalizarCarregamento();
                };
            } else {
                if (img.complete) {
                    carregadas++;
                    atualizarProgresso(carregadas, total);
                } else {
                    img.addEventListener('load', () => {
                        carregadas++;
                        atualizarProgresso(carregadas, total);
                        if (carregadas >= total) finalizarCarregamento();
                    });
                    img.addEventListener('error', () => {
                        carregadas++;
                        atualizarProgresso(carregadas, total);
                        if (carregadas >= total) finalizarCarregamento();
                    });
                }
            }
        });

        // Caso todas já estivessem no cache e carregassem instantaneamente
        if (carregadas >= total) finalizarCarregamento();
    }

    function finalizarCarregamento() {
        if (preloaderEncerrado) return;
        preloaderEncerrado = true;
        
        clearTimeout(timeoutSeguranca);
        clearInterval(fraseInterval);
        
        if (barFill) barFill.style.width = '100%';
        if (percentageText) percentageText.innerText = '100%';
        
        if (status) status.innerText = isMestre ? "Mesa Pronta!" : "Mundo Gerado!";
        if (quoteText) quoteText.innerText = isMestre ? "Que a sessão comece." : "Bem-vindo ao L&D!";
        
        setTimeout(() => {
            if (loader) loader.classList.add('fade-out');
            console.log(`✅ [PRELOADER] Mundo carregado como: ${isMestre ? 'MESTRE' : 'JOGADOR'}`);
        }, 600); 
    }
});