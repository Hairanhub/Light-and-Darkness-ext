/* ================================================================
   L&D RPG - CÓDICE (V1.6 - FIX TOTAL DE INICIALIZAÇÃO)
   ================================================================ */

const codice = {
    registros: { monstros: {}, npcs: {}, itens: {}, magias: {} },
    filtroAtual: 'todos',
    termoBusca: '',

    init: function() {
        if (!window.database) return setTimeout(() => this.init(), 500);
        
        console.log("📜 Códice: Sincronizando com a Grande Biblioteca...");

        ['monstros', 'npcs', 'itens', 'magias'].forEach(cat => {
            window.database.ref(cat).on('value', snap => {
                this.registros[cat] = snap.val() || {};
                this.renderizar();
            });
        });
    },

    abrir: function() { 
        const el = document.getElementById('codice-overlay');
        if (el) {
            el.style.display = 'flex';
            
            // 🔥 TRAVA 1: Impede o scroll no corpo da página (Mapa)
            document.body.style.overflow = 'hidden';
            document.body.style.height = '100vh';

            // 🔥 TRAVA 2: Captura o evento de scroll e impede que ele saia do Códice
            el.onwheel = (e) => {
                e.stopPropagation();
            };
            
            this.renderizar();
        } else {
            console.error("❌ Erro: Elemento 'codice-overlay' não encontrado no HTML.");
            alert("Erro: O livro do Códice não foi encontrado na página. Verifique seu HTML.");
        }
    },

    fechar: function() { 
        const el = document.getElementById('codice-overlay');
        if (el) {
            el.style.display = 'none';
            // ✅ LIBERA: Devolve o scroll ao mapa
            document.body.style.overflow = '';
            document.body.style.height = '';
        }
    },

    setFiltro: function(f) { 
        this.filtroAtual = f; 
        document.querySelectorAll('.filter-btn').forEach(btn => {
            // Verifica se o texto do botão ou o atributo data bate com o filtro
            btn.classList.toggle('active', btn.innerText.toLowerCase().includes(f.toLowerCase()) || f === 'todos');
        });
        this.renderizar(); 
    },

    filtrar: function(valor) {
        this.termoBusca = valor.toLowerCase();
        this.renderizar();
    },

    renderizar: function() {
        const grid = document.getElementById('album-grid');
        if (!grid) return;

        const scrollSalvo = grid.scrollTop;
        grid.innerHTML = '';

        Object.entries(this.registros).forEach(([cat, dados]) => {
            if (this.filtroAtual !== 'todos' && cat !== this.filtroAtual) return;

            // 1. Transforma o objeto do Firebase num Array para podermos ordenar
            let arrayItens = Object.entries(dados).map(([key, item]) => {
                return { idFirebase: key, ...item };
            });

            // 2. Ordena usando a propriedade 'ordem' criada na aba do Mestre
            arrayItens.sort((a, b) => {
                // Se o item não tiver 'ordem' (itens antigos ou magias), vai para o final (999999)
                const ordemA = typeof a.ordem === 'number' ? a.ordem : 999999;
                const ordemB = typeof b.ordem === 'number' ? b.ordem : 999999;
                return ordemA - ordemB;
            });

            // 3. Renderiza os cards já na ordem certa
            arrayItens.forEach(item => {
                const key = item.idFirebase;
                if (!item) return;

                // Tenta pegar o nome
                const nome = item.nome || item.identidade?.nome || "";

                // 🔥 O FILTRO CAÇA-FANTASMAS
                if (!nome || nome.trim() === "" || nome === "Token" || nome === "???") return;

                if (this.termoBusca && !nome.toLowerCase().includes(this.termoBusca.toLowerCase())) return;

                const card = document.createElement('div');
                const estaDescoberto = item.descoberto || false;
                
                card.style.display = "block";
                card.style.position = "relative";

                if (window.isMestre || estaDescoberto) {
                    card.className = 'figurinha-card';
                    const imgSrc = item.url || item.identidade?.img || '';
                    card.innerHTML = `
                        <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #2c1e1a;">
                            <img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://via.placeholder.com/150?text=Erro'">
                        </div>
                    `;
                    
                    if (window.isMestre && !estaDescoberto) {
                        card.style.border = "2px dashed #ff4444";
                        card.style.opacity = "0.7";
                    }
                    card.onclick = () => this.exibirDetalhes(item, cat, key);
                } else {
                    card.className = 'figurinha-card locked';
                    card.innerHTML = `<div style="font-size: 50px; text-align: center; margin-top: 45%; color: #3e2723; font-family: 'Cinzel', serif;">?</div>`;
                    card.onclick = () => alert("Este registro ainda não foi descoberto na tua jornada.");
                }
                grid.appendChild(card);
            });
        });

        requestAnimationFrame(() => {
            grid.scrollTop = scrollSalvo;
        });
    },

    exibirDetalhes: function(item, cat, idDoFirebase) {
        if (!item) return;

        // 1. Renderização de Imagem e Título
        const imgEl = document.getElementById('codice-img');
        if (imgEl) imgEl.src = item.url || item.identidade?.img || '';
        
        const tituloEl = document.getElementById('codice-titulo');
        if (tituloEl) tituloEl.innerText = item.nome || item.identidade?.nome || "Desconhecido";
        
        const tipoEl = document.getElementById('codice-tipo');
        if (tipoEl) tipoEl.innerText = cat.toUpperCase();

        // 2. CONFIGURAÇÃO DA DESCRIÇÃO
        const campoDesc = document.getElementById('codice-descricao');
        const btnSalvarDesc = document.getElementById('btn-salvar-descricao-publica');

        if (campoDesc) {
            const texto = item.descricao || item.subtitulo || "Nenhum relato encontrado.";
            
            // TRAVA DE SEGURANÇA: Funciona independente de ser textarea ou div no HTML
            if (campoDesc.tagName === 'TEXTAREA') {
                campoDesc.value = texto;
            } else {
                campoDesc.innerText = texto;
            }

            // APLICA O VISUAL BEGE E MARROM
            campoDesc.style.color = "#3e2723"; // Letra marrom
            campoDesc.style.fontWeight = "bold"; // Negrito
            campoDesc.style.background = "transparent"; // Fundo bege (pega a cor natural da página)

            if (window.isMestre) {
                if (campoDesc.tagName === 'TEXTAREA') campoDesc.readOnly = false;
                campoDesc.style.border = "1px dashed #3e2723"; // Borda sutil marrom para mostrar onde clica
                
                if (btnSalvarDesc) {
                    btnSalvarDesc.style.display = 'block';
                    btnSalvarDesc.onclick = () => {
                        window.database.ref(`${cat}/${idDoFirebase}`).update({
                            descricao: campoDesc.value || campoDesc.innerText
                        }).then(() => {
                            alert("📜 Descrição oficial atualizada!");
                        });
                    };
                }
            } else {
                if (campoDesc.tagName === 'TEXTAREA') campoDesc.readOnly = true;
                campoDesc.style.border = "none"; // Tira a borda para o jogador, virando texto liso
                if (btnSalvarDesc) btnSalvarDesc.style.display = 'none';
            }
        }

        // 3. Mini Stats e Badges (Layout em lista ao lado da imagem)
        const rank = item.rank || item.identidade?.rank || "-";
        const elemento = item.elemento || item.identidade?.elemento || "Neutro";
        const tipoDano = item.tipoDano || item.stats?.tipoDano || "Físico";
        const badge = document.getElementById('codice-stats-badge');
        
        if (badge) {
            badge.style.display = 'flex';
            badge.style.flexDirection = 'column';
            badge.style.gap = '8px';
            // Aplicado a cor marrom escuro (#3e2723) em todos os spans
            badge.innerHTML = `
                <span style="color: #3e2723;"><i class="fa-solid fa-crown"></i> Rank: <b>${rank}</b></span>
                <span style="color: #3e2723;"><i class="fa-solid fa-burst"></i> Tipo: <b>${elemento}</b></span>
                <span style="color: #3e2723;"><i class="fa-solid fa-hand-fist"></i> Ataque: <b>${tipoDano.toUpperCase()}</b></span>
            `;
        }

        // 4. Atributos (Abaixo da Imagem) - AGORA COM OS 6 STATUS
        const miniStats = document.getElementById('codice-mini-stats');
        if (miniStats) {
            // Puxa os atributos dependendo de como foram salvos (item ou monstro)
            const attrBase = item.atributos || item.stats?.atributos || {};
            
            const vFor = attrBase.for || 0;
            const vDex = attrBase.dex || 0;
            const vInt = attrBase.int || 0;
            const vDef = attrBase.def || 0;
            const vCar = attrBase.car || 0;
            const vCon = attrBase.con || 0;
            
            miniStats.style.display = 'flex';
            miniStats.style.flexWrap = 'wrap';
            miniStats.style.justifyContent = 'center';
            miniStats.style.gap = '12px';
            miniStats.style.marginTop = '10px';
            miniStats.style.padding = '5px';
            miniStats.style.background = '#3e2723';
            miniStats.style.borderRadius = '8px';

            miniStats.innerHTML = `
                <span style="color:#ff4d4d; font-weight:bold;" title="Força">🗡️ FOR: ${vFor}</span>
                <span style="color:#2ecc71; font-weight:bold;" title="Destreza">🏹 DEX: ${vDex}</span>
                <span style="color:#00f2ff; font-weight:bold;" title="Inteligência">🔮 INT: ${vInt}</span>
                <span style="color:#f3e520; font-weight:bold;" title="Defesa">🛡️ DEF: ${vDef}</span>
                <span style="color:#e67e22; font-weight:bold;" title="Carisma">🗣️ CAR: ${vCar}</span>
                <span style="color:#9b59b6; font-weight:bold;" title="Constituição">❤️ CON: ${vCon}</span>
            `;
        }

        // 5. Lógica de Revelar/Ocultar (Mestre)
        const btnRevelar = document.getElementById('btn-revelar-codice');
        if (window.isMestre && btnRevelar) {
            btnRevelar.style.display = 'block';
            const estaDescoberto = item.descoberto || false;
            btnRevelar.innerHTML = estaDescoberto ? '<i class="fa-solid fa-eye-slash"></i> Ocultar' : '<i class="fa-solid fa-eye"></i> Revelar';
            btnRevelar.onclick = () => {
                window.database.ref(`${cat}/${idDoFirebase}`).update({ descoberto: !estaDescoberto });
            };
        }
    }
};

// ================================================================
// 🔥 INICIALIZAÇÃO SEGURA: Só carrega depois que o HTML estiver pronto
// ================================================================
window.addEventListener('load', () => {
    codice.init();
});