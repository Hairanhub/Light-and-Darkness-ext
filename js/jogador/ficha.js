/**
 * js/jogador/ficha.js
 * Gerenciamento de Identidade, Foto, Atributos e Inventário Persistente por Usuário
 * Versão: 7.6 - Central de Memória (EstadoFicha) Conectada + Mana 1:1 🧠
 */

const FichaJogador = {
    nomeUsuario: null,
    refUsuario: null,

    init() {
        console.log("Ficha: Sincronizando com o Grande Salão...");
        
        // 1. Identificação do Jogador
        this.nomeUsuario = localStorage.getItem('rubi_username');
        if (!this.nomeUsuario) {
            window.location.href = 'index.html'; 
            return;
        }

        // Define globalmente para o engine-mapa.js e outros scripts
        window.usuarioLogadoNome = this.nomeUsuario;

        // 2. Define a referência exclusiva deste jogador no Firebase
        this.refUsuario = window.database.ref('usuarios').child(this.nomeUsuario);

        this.sincronizarLobby();
        this.carregarDadosFirebase(); 
        this.configurarInteracoes();
        
        // 3. Inicializa o Inventário (Chama o arquivo inventario.js oficial)
        if (window.Inventario && typeof window.Inventario.init === 'function') {
            window.Inventario.init(this.nomeUsuario);
        } else {
            console.error("❌ ERRO: inventario.js não foi carregado corretamente!");
        }
    },

    sincronizarLobby() {
        const roleSalva = localStorage.getItem('rubi_role');
        const corSalva = localStorage.getItem('rubi_color');
        const displayNome = document.getElementById('player-name-display');
        if (displayNome) displayNome.innerText = this.nomeUsuario.toUpperCase();

        const displayTitulo = document.getElementById('player-title-display');
        const fotoFrame = document.querySelector('.player-profile-header div'); 

        if (displayTitulo) {
            if (roleSalva === 'gm') {
                displayTitulo.innerText = 'O NARRADOR';
                displayTitulo.style.color = '#e74c3c';
                if(fotoFrame) fotoFrame.style.borderColor = '#e74c3c';
            } else {
                displayTitulo.innerText = 'VIAJANTE';
                displayTitulo.style.color = corSalva || '#2ecc71';
                if(fotoFrame) fotoFrame.style.borderColor = corSalva || '#2ecc71';
            }
        }
    },

    carregarDadosFirebase() {
        // 1. Sincroniza a Foto
        this.refUsuario.child('foto').on('value', snap => {
            const fotoUrl = snap.val();
            const imgElement = document.getElementById('player-photo-display');
            if (fotoUrl && imgElement) imgElement.src = fotoUrl;
        });

        // 2. Sincroniza Atributos (Apenas Base)
        this.refUsuario.child('atributos').on('value', snap => {
            const at = snap.val() || {};
            console.log("📥 [FICHA] Atributos base carregados do Firebase:", at);
            
            if (window.EstadoFicha) {
                window.EstadoFicha.atualizarBase({
                    for: parseInt(at.for) || 0, dex: parseInt(at.dex) || 0,
                    con: parseInt(at.con) || 0, int: parseInt(at.int) || 0,
                    def: parseInt(at.def) || 0, car: parseInt(at.car) || 0
                });
                
                // Obriga a Ficha a recalcular TUDO (Base + Itens) e atualizar o Token e o Mestre!
                if(typeof window.EstadoFicha.sincronizarComFirebase === 'function') {
                    window.EstadoFicha.sincronizarComFirebase();
                }
            }
        });

        // ==========================================
        // 3. MONITOR DE LEVEL E MANA EM TEMPO REAL
        // ==========================================
        this.refUsuario.on('value', snap => {
            const dados = snap.val() || {};
            
            const nivelAtual = parseInt(dados.nivel) || 1;
            const elNivel = document.getElementById('txt-nivel');
            if (elNivel) elNivel.innerText = nivelAtual;

            let intTotal = 0;
            if (window.EstadoFicha) intTotal = window.EstadoFicha.obterTotais().int || 0;
            
            // 🔥 NOVA FÓRMULA DE MANA: 1 de Inteligência = 1 de Mana extra
            const novaManaMax = 10 + ((nivelAtual - 1) * 3) + intTotal;

            window.nivelJogadorAtual = nivelAtual; 

            const meuNomeOriginal = window.usuarioLogadoNome || localStorage.getItem('rubi_username');
            
            if (window.database && meuNomeOriginal) {
                window.database.ref('mapa/tokens').once('value', snapTokens => {
                    snapTokens.forEach(child => {
                        const t = child.val();
                        if (t.dono && t.dono.toLowerCase() === meuNomeOriginal.toLowerCase()) {
                            
                            // 🔥 CORREÇÃO DO BUG DE CURA: 
                            // Mantém a mana atual como está, a menos que seja maior que o novo máximo.
                            // Assim o Booster não é anulado por uma atualização da ficha!
                            let manaAtualPersistente = t.manaAtual !== undefined ? t.manaAtual : novaManaMax;
                            if (manaAtualPersistente > novaManaMax) manaAtualPersistente = novaManaMax;

                            child.ref.update({
                                manaMax: novaManaMax,
                                manaAtual: Math.max(0, manaAtualPersistente)
                            });
                        }
                    });
                });
            }

            // --- Parte do Dinheiro ---
            let totalCobre = parseInt(dados.cobre) || 0;
            if (document.getElementById('txt-gold')) document.getElementById('txt-gold').innerText = Math.floor(totalCobre / 1000);
            if (document.getElementById('txt-silver')) document.getElementById('txt-silver').innerText = Math.floor((totalCobre % 1000) / 100);
            if (document.getElementById('txt-bronze')) document.getElementById('txt-bronze').innerText = Math.floor((totalCobre % 100) / 10);
            if (document.getElementById('txt-copper')) document.getElementById('txt-copper').innerText = totalCobre % 10;
        });
    },

    // --- FUNÇÃO DE INVOCAR O TOKEN ---
    async invocarMeuToken() {
        const nome = this.nomeUsuario;
        
        if (!window.mapaRef) {
            console.error("❌ Erro: O mapa ainda não carregou.");
            return;
        }
        const tokensRef = window.mapaRef.child('tokens');

        const snapshot = await tokensRef.orderByChild('dono').equalTo(nome).once('value');
        if (snapshot.exists()) {
            alert("Seu personagem já está no mapa!");
            return;
        }

        const foto = document.getElementById('player-photo-display')?.src || 'https://via.placeholder.com/60';
        
        // 🌟 NOVA LÓGICA: Captura os valores TOTAIS diretamente da Memória Pura
        let atributosProcessados = { for: 0, dex: 0, con: 0, int: 0, def: 0, car: 0 };
        let vidaCalculada = 20;
        let manaCalculada = 10;
        let nomeArmaEquipada = "";

        if (window.EstadoFicha) {
            const totais = window.EstadoFicha.obterTotais();
            atributosProcessados = {
                for: totais.for, dex: totais.dex, con: totais.con, 
                int: totais.int, def: totais.def, car: totais.car
            };
            vidaCalculada = totais.con || 20;
            const nivel = window.nivelJogadorAtual || 1;
            
            // 🔥 NOVA FÓRMULA DE MANA AO INVOCAR TOKEN: 1 de INT = 1 de MANA
            manaCalculada = 10 + ((nivel - 1) * 3) + totais.int;
            
            nomeArmaEquipada = window.EstadoFicha.armaEquipada || "";
        }

        const novoToken = {
            nome: nome,
            url: foto,
            dono: nome,
            tipo: 'jogador',
            x: 400,
            y: 400,
            hpMax: vidaCalculada,
            hpAtual: vidaCalculada,
            manaMax: manaCalculada,
            manaAtual: manaCalculada,
            atributos: atributosProcessados,
            armaEquipada: nomeArmaEquipada // 🔥 Puxa direto da Memória!
        };

        tokensRef.push(novoToken)
            .then(() => console.log("✅ Token invocado com valores e Arma salvos no Banco!"))
            .catch(err => console.error("❌ Erro ao invocar:", err));
    },

    alterarFoto() {
        const novoUrl = prompt("Cole o URL da imagem do seu personagem:");
        if (novoUrl && novoUrl.trim() !== "") {
            this.refUsuario.update({ foto: novoUrl.trim() });
        }
    },

    configurarInteracoes() {
        const nomeBtn = document.getElementById('player-name-display');
        if (nomeBtn) {
            nomeBtn.addEventListener('click', () => {
                if(confirm("Deseja voltar ao menu?")) window.location.href = 'index.html';
            });
        }
    },

    conectarTokenAFicha() {
        const tokensRef = window.database.ref('mapa/tokens');
        
        tokensRef.orderByChild('dono').equalTo(this.nomeUsuario).on('value', snapshot => {
            if (!snapshot.exists()) return;

            snapshot.forEach(child => {
                const dadosToken = child.val();
                
                const hpText = document.getElementById('player-hp-display'); 
                if (hpText) {
                    hpText.innerText = `${dadosToken.hpAtual} / ${dadosToken.hpMax}`;
                }

                if (dadosToken.hpAtual <= 0) {
                    document.querySelector('.avatar-wrapper').style.filter = 'grayscale(1) opacity(0.5)';
                } else {
                    document.querySelector('.avatar-wrapper').style.filter = 'none';
                }
            });
        });
    }
};

window.toggleBottomPanel = function() {
    const panel = document.getElementById('aba-inventario-scroll');
    if (panel) {
        panel.classList.toggle('active');
        const icon = panel.querySelector('.panel-trigger i');
        if (icon) {
            icon.className = panel.classList.contains('active') 
                ? 'fa-solid fa-chevron-down' 
                : 'fa-solid fa-bag-shopping';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => FichaJogador.init());

// --- CÉREBRO CENTRAL DE ATRIBUTOS (MODELO Y) ---
window.salvarDadosFicha = function(novosAtributosBase) {
    const nome = window.usuarioLogadoNome || localStorage.getItem('rubi_username');
    if (!nome) {
        console.error("❌ Erro: Usuário não identificado para salvar.");
        return;
    }

    const atributosCalculados = {
        for: parseInt(novosAtributosBase.for) || 0,
        dex: parseInt(novosAtributosBase.dex) || 0,
        int: parseInt(novosAtributosBase.int) || 0,
        car: parseInt(novosAtributosBase.car) || 0,
        con: parseInt(novosAtributosBase.con) || 0, 
        def: parseInt(novosAtributosBase.def) || 0, 
        hpMax: parseInt(novosAtributosBase.con) || 0 
    };

    window.database.ref(`usuarios/${nome}/atributos`).set(atributosCalculados)
        .then(() => {
            console.log("✅ [SISTEMA] Ficha sincronizada no Modelo Y!");
            window.mapaRef.child('tokens').orderByChild('dono').equalTo(nome).once('value', snap => {
                snap.forEach(child => {
                    child.ref.update({ 
                        hpMax: atributosCalculados.hpMax,
                        hpAtual: atributosCalculados.hpMax,
                        'atributos/def': atributosCalculados.def 
                    });
                });
            });
        })
        .catch(err => console.error("❌ Erro ao salvar:", err));
};