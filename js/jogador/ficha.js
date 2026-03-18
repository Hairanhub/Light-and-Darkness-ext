/**
 * js/jogador/ficha.js
 * Gerenciamento de Identidade, Foto, Atributos e Inventário Persistente por Usuário
 * Versão: 7.2 - Sistema de Economia, Level, Mana e Correção da Defesa x4 🛡️🔮💰
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
        const stats = ['for', 'dex', 'con', 'int', 'def', 'car'];
        
        // Escuta APENAS a pasta 'atributos' para evitar loop com os equipamentos
        this.refUsuario.child('atributos').on('value', snap => {
            const at = snap.val() || {};
            console.log("📥 [FICHA] Atributos base carregados do Firebase:", at);
            
            stats.forEach(stat => {
                const base = parseInt(at[stat]) || 0;

                // Atualiza o Valor Base no HTML
                const elBase = document.getElementById(`base-${stat}`);
                if (elBase) elBase.innerText = base;
            });

            // 🔥 A MÁGICA: Agora que a BASE está garantida no HTML, 
            // pedimos para o inventário somar os bônus por cima.
            setTimeout(() => {
                if (window.Inventario && typeof window.Inventario.calcularBonusEquipamentos === 'function') {
                    console.log("⚔️ [FICHA] Solicitando recalculo de bônus ao Inventário...");
                    window.Inventario.calcularBonusEquipamentos();
                } else {
                    console.warn("⚠️ [FICHA] Inventário ainda não está pronto para calcular bônus.");
                }
            }, 50);
        });

        // ==========================================
        // 3. MONITOR DE LEVEL E MANA EM TEMPO REAL
        // ==========================================
        this.refUsuario.on('value', snap => {
            const dados = snap.val() || {};
            
            // 1. Atualiza o Nível na Ficha
            const nivelAtual = parseInt(dados.nivel) || 1;
            const elNivel = document.getElementById('txt-nivel');
            if (elNivel) elNivel.innerText = nivelAtual;

            // 2. Cálculo da Mana (10 base + 3 por nível + bônus de INT)
            const intTotal = parseInt(document.getElementById('stat-int')?.innerText) || 0;
            const novaManaMax = 10 + ((nivelAtual - 1) * 3) + Math.floor(intTotal / 3);

            // 3. Atualiza a variável global
            window.nivelJogadorAtual = nivelAtual; 

            // 4. ATUALIZAÇÃO DO TOKEN NO MAPA
            const meuNomeOriginal = window.usuarioLogadoNome || localStorage.getItem('rubi_username');
            
            if (window.database && meuNomeOriginal) {
                window.database.ref('mapa/tokens').once('value', snapTokens => {
                    snapTokens.forEach(child => {
                        const t = child.val();
                        if (t.dono && t.dono.toLowerCase() === meuNomeOriginal.toLowerCase()) {
                            
                            child.ref.update({
                                manaMax: novaManaMax,
                                manaAtual: novaManaMax
                            });
                        }
                    });
                });
            }

            // --- Parte do Dinheiro (Mantida igual) ---
            let totalCobre = parseInt(dados.cobre) || 0;
            let gold = Math.floor(totalCobre / 1000);
            let silver = Math.floor((totalCobre % 1000) / 100);
            let bronze = Math.floor((totalCobre % 100) / 10);
            let copper = totalCobre % 10;
            if (document.getElementById('txt-gold')) document.getElementById('txt-gold').innerText = gold;
            if (document.getElementById('txt-silver')) document.getElementById('txt-silver').innerText = silver;
            if (document.getElementById('txt-bronze')) document.getElementById('txt-bronze').innerText = bronze;
            if (document.getElementById('txt-copper')) document.getElementById('txt-copper').innerText = copper;
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
        
        // Captura os valores TOTAIS do HTML (Base + Equipamentos)
        const forTotal = parseInt(document.getElementById('stat-for')?.innerText) || 0;
        const dexTotal = parseInt(document.getElementById('stat-dex')?.innerText) || 0;
        const conTotal = parseInt(document.getElementById('stat-con')?.innerText) || 0;
        const intTotal = parseInt(document.getElementById('stat-int')?.innerText) || 0;
        const defTotal = parseInt(document.getElementById('stat-def')?.innerText) || 0;
        const carTotal = parseInt(document.getElementById('stat-car')?.innerText) || 0;

        const atributosProcessados = {
            for: forTotal, dex: dexTotal, con: conTotal, 
            int: intTotal, 
            def: defTotal * 4, // 🔥 MULTIPLICA POR 4 SOMENTE PARA O MAPA
            car: carTotal
        };

        // Calculamos a Vida Total
        const vidaCalculada = conTotal * 4; 

        // Calculamos a Mana (10 base + 3 por nível + bônus de INT)
        const nivel = window.nivelJogadorAtual || 1;
        const manaCalculada = 10 + ((nivel - 1) * 3) + Math.floor(intTotal / 3);

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
            atributos: atributosProcessados 
        };

        tokensRef.push(novoToken)
            .then(() => console.log("✅ Token invocado com Vida, Mana e Defesax4 cheios!"))
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
        def: parseInt(novosAtributosBase.def) || 0, // 🔥 SALVA PURO PARA NÃO DAR BOLA DE NEVE
        hpMax: (parseInt(novosAtributosBase.con) || 0) * 4
    };

    window.database.ref(`usuarios/${nome}/atributos`).set(atributosCalculados)
        .then(() => {
            console.log("✅ [SISTEMA] Ficha sincronizada no Modelo Y!");
            window.mapaRef.child('tokens').orderByChild('dono').equalTo(nome).once('value', snap => {
                snap.forEach(child => {
                    child.ref.update({ 
                        hpMax: atributosCalculados.hpMax,
                        hpAtual: atributosCalculados.hpMax,
                        'atributos/def': atributosCalculados.def * 4 // 🔥 ATUALIZA SÓ O MAPA COM O X4
                    });
                });
            });
        })
        .catch(err => console.error("❌ Erro ao salvar:", err));
};

window.atualizarStatusDaFicha = function(bonusEquipamento) {
    console.log("🧪 [DEBUG] atualizarStatusDaFicha foi chamada!"); 

    const atributos = ['for', 'dex', 'con', 'int', 'def', 'car'];
    let atributosFinaisParaOMapa = {};

    atributos.forEach(attr => {
        const spanBase = document.getElementById(`base-${attr}`);
        const spanBonus = document.getElementById(`bonus-${attr}`);
        const spanTotal = document.getElementById(`stat-${attr}`);

        if (spanBase && spanBonus && spanTotal) {
            let valorBase = parseInt(spanBase.innerText) || 0;
            let bonus = parseInt(bonusEquipamento[attr]) || 0;
            let total = valorBase + bonus;

            spanBonus.innerText = (bonus >= 0 ? "+" : "") + bonus;
            spanBonus.style.color = bonus > 0 ? '#2ecc71' : (bonus < 0 ? '#e74c3c' : '#555');
            spanTotal.innerText = total;
            spanTotal.style.color = bonus > 0 ? '#f1c40f' : '#fff';

            atributosFinaisParaOMapa[attr] = total;
        }
    });

    // 🔥 GARANTE QUE A DEFESA VÁ MULTIPLICADA PARA O MAPA
    atributosFinaisParaOMapa['def'] = (atributosFinaisParaOMapa['def'] || 0) * 4;

    // Calcula novo HP
    // 🔥 Calcula novo HP (Puro 1:1)
    let conTotal = atributosFinaisParaOMapa['con'] || 0;
    let novoHpMax = conTotal;

    // Calcula nova Mana (10 base + 3 por nível + bônus de INT)
    let intTotal = atributosFinaisParaOMapa['int'] || 0;
    let nivel = window.nivelJogadorAtual || 1;
    let novoManaMax = 10 + ((nivel - 1) * 3) + Math.floor(intTotal / 3);

    const nomeDono = window.usuarioLogadoNome || localStorage.getItem('rubi_username');
    
    const refParaTokens = window.mapaRef ? window.mapaRef.child('tokens') : window.database.ref('mapa/tokens');

    if (nomeDono) {
        refParaTokens.once('value', snap => {
            let encontrou = false;
            snap.forEach(child => {
                const token = child.val();
                if (token.dono && token.dono.toLowerCase() === nomeDono.toLowerCase()) {
                    encontrou = true;
                    child.ref.update({ 
                        hpMax: novoHpMax,
                        manaMax: novoManaMax, // Atualiza a mana se mudar o equipamento!
                        atributos: atributosFinaisParaOMapa 
                    }).then(() => {
                        console.log(`✅ [SISTEMA] Token "${token.nome}" atualizado com sucesso! (Vida, Mana e Defesa x4)`);
                    });
                }
            });
            if (!encontrou) console.warn(`⚠️ [SISTEMA] Token não encontrado no mapa para: ${nomeDono}`);
        });
    } else {
        console.error("❌ [ERRO] Nome do dono não encontrado!");
    }
};