/* ================================================================
   L&D RPG - CÓDICE (V1.9 - ZOOM COM ANIMAÇÃO FLUIDA)
   ================================================================ */

// 🔥 FIX: Tradutor universal para ler atributos antigos (texto) e novos (objeto)
function processarAtributosCodice(rawAttr) {
    let a = [0,0,0,0,0,0];
    if (typeof rawAttr === 'string') {
        a = rawAttr.split('/').map(v => parseInt(v.trim()) || 0);
    } else if (typeof rawAttr === 'object' && rawAttr !== null) {
        a = [rawAttr.for||0, rawAttr.dex||0, rawAttr.int||0, rawAttr.def||0, rawAttr.car||0, rawAttr.con||0];
    }
    return {
        for: a[0], dex: a[1], int: a[2], 
        def: a[3], car: a[4], con: a[5]
    };
}

const codice = {
    registros: { monstros: {}, npcs: {}, itens: {}, magias: {} },
    filtroAtual: 'todos',
    termoBusca: '',

    init: function() {
        if (!window.database) return setTimeout(() => this.init(), 500);
        
        // 🔥 INJETA O CSS DA ANIMAÇÃO (Resolve o problema da imagem vindo da esquerda)
        if (!document.getElementById('codice-animation-style')) {
            const style = document.createElement('style');
            style.id = 'codice-animation-style';
            style.innerHTML = `
                @keyframes codiceZoomIn {
                    0% { opacity: 0; transform: scale(0.85); filter: blur(10px); }
                    100% { opacity: 1; transform: scale(1); filter: blur(0); }
                }
                @keyframes codiceFadeBG {
                    from { background: rgba(0,0,0,0); }
                    to { background: rgba(0,0,0,0.9); }
                }
            `;
            document.head.appendChild(style);
        }

        console.log("📜 Códice: Sincronizando com a Grande Biblioteca...");

        ['monstros', 'npcs', 'itens', 'magias'].forEach(cat => {
            window.database.ref(cat).on('value', snap => {
                this.registros[cat] = snap.val() || {};
                this.renderizar();
            });
        });
    },

    // 🔥 FUNÇÃO DE ZOOM REFORMULADA (SEM TRAVAMENTOS)
    darZoomImagem: function(url) {
        if (!url) return;
        
        const overlayZoom = document.createElement('div');
        overlayZoom.id = 'codice-zoom-overlay';
        overlayZoom.style = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            z-index: 10000; display: flex; align-items: center; justify-content: center;
            cursor: zoom-out; animation: codiceFadeBG 0.3s forwards;
        `;
        
        // A animação agora é aplicada diretamente e o transform-origin é o centro
        overlayZoom.innerHTML = `
            <img src="${url}" style="
                max-width: 90%; max-height: 90%; 
                object-fit: contain; border: 3px solid #f3e520; 
                box-shadow: 0 0 60px #000;
                animation: codiceZoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            ">
            <div style="position: absolute; top: 30px; right: 30px; color: white; font-size: 40px; font-family: 'Cinzel'; opacity: 0.6;">✕</div>
        `;
        
        overlayZoom.onclick = () => {
            overlayZoom.style.opacity = '0';
            overlayZoom.style.transition = '0.2s';
            setTimeout(() => overlayZoom.remove(), 200);
        };
        document.body.appendChild(overlayZoom);
    },

    abrir: function() { 
        const el = document.getElementById('codice-overlay');
        if (el) {
            el.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            document.body.style.height = '100vh';
            el.onwheel = (e) => e.stopPropagation();
            this.renderizar();
        }
    },

    fechar: function() { 
        const el = document.getElementById('codice-overlay');
        if (el) {
            el.style.display = 'none';
            document.body.style.overflow = '';
            document.body.style.height = '';
        }
    },

    setFiltro: function(f) { 
        this.filtroAtual = f; 
        document.querySelectorAll('.filter-btn').forEach(btn => {
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

            let arrayItens = Object.entries(dados).map(([key, item]) => ({ idFirebase: key, ...item }));

            arrayItens.sort((a, b) => (a.ordem || 999999) - (b.ordem || 999999));

            arrayItens.forEach(item => {
                const key = item.idFirebase;
                if (!item) return;

                const nome = item.nome || item.identidade?.nome || "";
                if (!nome || nome.trim() === "" || nome === "Token" || nome === "???") return;
                if (this.termoBusca && !nome.toLowerCase().includes(this.termoBusca)) return;

                const card = document.createElement('div');
                const estaDescoberto = item.descoberto || false;
                
                card.style.display = "block";
                card.style.position = "relative";

                if (window.isMestre || estaDescoberto) {
                    card.className = 'figurinha-card';
                    const imgSrc = item.url || item.identidade?.img || '';
                    
                    card.innerHTML = `
                        <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #2c1e1a;">
                            <img src="${imgSrc}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; object-position: top;" onerror="this.src='https://via.placeholder.com/150?text=Erro'">
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
                }
                grid.appendChild(card);
            });
        });

        requestAnimationFrame(() => { grid.scrollTop = scrollSalvo; });
    },

    exibirDetalhes: function(item, cat, idDoFirebase) {
        if (!item) return;

        const imgEl = document.getElementById('codice-img');
        const urlFinal = item.url || item.identidade?.img || '';
        
        if (imgEl) {
            imgEl.src = urlFinal;
            imgEl.style.cursor = "zoom-in";
            imgEl.title = "Clique para ampliar a arte";
            imgEl.onclick = () => this.darZoomImagem(urlFinal);
        }
        
        const tituloEl = document.getElementById('codice-titulo');
        if (tituloEl) tituloEl.innerText = item.nome || item.identidade?.nome || "Desconhecido";
        
        const tipoEl = document.getElementById('codice-tipo');
        if (tipoEl) tipoEl.innerText = cat.toUpperCase();

        const campoDesc = document.getElementById('codice-descricao');
        const btnSalvarDesc = document.getElementById('btn-salvar-descricao-publica');

        if (campoDesc) {
            const texto = item.descricao || item.subtitulo || "Nenhum relato encontrado.";
            if (campoDesc.tagName === 'TEXTAREA') campoDesc.value = texto;
            else campoDesc.innerText = texto;

            campoDesc.style.color = "#3e2723"; 
            campoDesc.style.fontWeight = "bold"; 

            if (window.isMestre) {
                if (campoDesc.tagName === 'TEXTAREA') campoDesc.readOnly = false;
                campoDesc.style.border = "1px dashed #3e2723"; 
                if (btnSalvarDesc) {
                    btnSalvarDesc.style.display = 'block';
                    btnSalvarDesc.onclick = () => {
                        window.database.ref(`${cat}/${idDoFirebase}`).update({
                            descricao: campoDesc.value || campoDesc.innerText
                        }).then(() => alert("📜 Descrição oficial atualizada!"));
                    };
                }
            } else {
                if (campoDesc.tagName === 'TEXTAREA') campoDesc.readOnly = true;
                campoDesc.style.border = "none"; 
                if (btnSalvarDesc) btnSalvarDesc.style.display = 'none';
            }
        }

        const badge = document.getElementById('codice-stats-badge');
        if (badge) {
            const rank = (item.rank || item.identidade?.rank || item.raridade || "-").toUpperCase();
            const elemento = (item.elemento || item.identidade?.elemento || item.tipoItem || item.tipoMagia || "Neutro").toUpperCase();
            badge.innerHTML = `
                <span style="color: #3e2723;"><i class="fa-solid fa-crown"></i> Info: <b>${rank}</b></span>
                <span style="color: #3e2723;"><i class="fa-solid fa-burst"></i> Tipo: <b>${elemento}</b></span>
            `;
        }

        const miniStats = document.getElementById('codice-mini-stats');
        if (miniStats) {
            const attrBase = processarAtributosCodice(item.atributos || item.stats?.atributos);
            miniStats.innerHTML = `
                <span style="color:#ff4d4d; font-weight:bold;">🗡️ FOR: ${attrBase.for}</span>
                <span style="color:#2ecc71; font-weight:bold;">🏹 DEX: ${attrBase.dex}</span>
                <span style="color:#00f2ff; font-weight:bold;">🔮 INT: ${attrBase.int}</span>
                <span style="color:#f3e520; font-weight:bold;">🛡️ DEF: ${attrBase.def}</span>
            `;
        }

        const btnRevelar = document.getElementById('btn-revelar-codice');
        if (window.isMestre && btnRevelar) {
            btnRevelar.style.display = 'block';
            const estaDescoberto = item.descoberto || false;
            btnRevelar.innerHTML = estaDescoberto ? '<i class="fa-solid fa-eye-slash"></i> Ocultar' : '<i class="fa-solid fa-eye"></i> Revelar';
            btnRevelar.onclick = () => window.database.ref(`${cat}/${idDoFirebase}`).update({ descoberto: !estaDescoberto });
        }
    }
};

window.addEventListener('load', () => codice.init());