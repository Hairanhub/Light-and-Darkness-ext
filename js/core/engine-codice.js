/* ================================================================
   L&D RPG - CÓDICE (V3.1 - LIVRO DE REGRAS COM IMAGENS E LAYOUT)
   ================================================================ */

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
    registros: { monstros: {}, npcs: {}, itens: {}, magias: {}, regras: {} },
    filtroAtual: 'todos',
    termoBusca: '',

    init: function() {
        if (!window.database) return setTimeout(() => this.init(), 500);
        
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
                .card-regra-add {
                    background: rgba(44, 30, 26, 0.8) !important;
                    border: 2px dashed #f3e520 !important;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    cursor: pointer; transition: 0.2s; color: #f3e520;
                }
                .card-regra-add:hover { background: rgba(44, 30, 26, 1) !important; transform: scale(1.05); }
            `;
            document.head.appendChild(style);
        }

        console.log("📜 Códice: Sincronizando com a Grande Biblioteca...");

        ['monstros', 'npcs', 'itens', 'magias', 'regras'].forEach(cat => {
            window.database.ref(cat).on('value', snap => {
                this.registros[cat] = snap.val() || {};
                this.renderizar();
            });
        });
    },

    darZoomImagem: function(url) {
        if (!url || url.includes('placeholder')) return;
        
        const overlayZoom = document.createElement('div');
        overlayZoom.id = 'codice-zoom-overlay';
        overlayZoom.style = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            z-index: 10000; display: flex; align-items: center; justify-content: center;
            cursor: zoom-out; animation: codiceFadeBG 0.3s forwards;
        `;
        
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
        this.filtroAtual = f.toLowerCase(); 
        document.querySelectorAll('.filter-btn').forEach(btn => {
            const btnFiltroText = btn.innerText.toLowerCase();
            const btnDataFiltro = btn.getAttribute('onclick') || "";
            
            if (f === 'todos' && btnFiltroText.includes('todos')) {
                btn.classList.add('active');
            } else if (f !== 'todos' && btnDataFiltro.includes(`'${f}'`)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
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

        const categoriasBaseFirebase = ['monstros', 'npcs', 'magias', 'regras'];

        Object.entries(this.registros).forEach(([cat, dados]) => {
            let arrayItens = Object.entries(dados).map(([key, item]) => ({ idFirebase: key, ...item }));

            if (this.filtroAtual !== 'todos') {
                if (categoriasBaseFirebase.includes(this.filtroAtual)) {
                    if (cat !== this.filtroAtual) return;
                } else {
                    if (cat !== 'itens') return; 
                    arrayItens = arrayItens.filter(item => {
                        const sub = (item.tipoItem || item.subTipo || item.tipo || "").toLowerCase().trim();
                        if (this.filtroAtual === 'poção' || this.filtroAtual === 'pocao') return sub === 'poção' || sub === 'pocao' || sub === 'consumivel';
                        if (this.filtroAtual === 'passiva' || this.filtroAtual === 'passivas') return sub === 'passiva' || sub === 'passivas';
                        return sub === this.filtroAtual;
                    });
                }
            }

            arrayItens.sort((a, b) => (a.ordem || 999999) - (b.ordem || 999999));

            arrayItens.forEach(item => {
                const key = item.idFirebase;
                if (!item) return;

                let nomeDisplay = item.nome || item.titulo || item.identidade?.nome || "";
                if (!nomeDisplay || nomeDisplay.trim() === "" || nomeDisplay === "Token" || nomeDisplay === "???") return;
                if (this.termoBusca && !nomeDisplay.toLowerCase().includes(this.termoBusca)) return;

                const card = document.createElement('div');
                let estaDescoberto = item.descoberto || false;
                
                if (cat === 'regras') estaDescoberto = true;

                card.style.display = "block";
                card.style.position = "relative";

                if (window.isMestre || estaDescoberto) {
                    card.className = 'figurinha-card';
                    
                    let imgSrc = item.url || item.identidade?.img || '';
                    let isDefaultRegra = false;
                    
                    if (cat === 'regras' && !imgSrc) {
                        imgSrc = 'https://i.imgur.com/k2e45N3.png'; // Fallback
                        isDefaultRegra = true;
                    }

                    // 🔥 CORREÇÃO: Título "flutuando" preso no rodapé do card
                    card.innerHTML = `
                        <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; background: #2c1e1a; position: relative;">
                            
                            <img src="${imgSrc}" loading="lazy" style="${isDefaultRegra ? 'width: 60%; margin-top: -15px;' : 'width: 100%; height: 100%; object-fit: cover; object-position: top;'}" onerror="this.src='https://via.placeholder.com/150?text=Erro'">
                            
                            ${cat === 'regras' ? `
                                <div style="position: absolute; bottom: 0; left: 0; width: 100%; background: rgba(44, 30, 26, 0.9); padding: 5px 0; display: flex; justify-content: center; align-items: center; border-top: 1px solid #f3e520;">
                                    <span style="color: #f3e520; font-family: 'Cinzel'; font-size: 11px; font-weight: bold; text-align: center; padding: 0 5px; line-height: 1;">${nomeDisplay}</span>
                                </div>
                            ` : ''}

                        </div>
                    `;
                    
                    if (window.isMestre && !estaDescoberto && cat !== 'regras') {
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

        if (window.isMestre && this.filtroAtual === 'regras') {
            const cardAdd = document.createElement('div');
            cardAdd.className = 'figurinha-card card-regra-add';
            cardAdd.innerHTML = `<i class="fa-solid fa-plus" style="font-size: 30px; margin-bottom: 5px;"></i><span style="font-family:'Cinzel'; font-size: 12px; font-weight:bold;">NOVA REGRA</span>`;
            cardAdd.onclick = () => this.criarNovaRegra();
            grid.appendChild(cardAdd);
        }

        requestAnimationFrame(() => { grid.scrollTop = scrollSalvo; });
    },

    criarNovaRegra: function() {
        const novoId = firebase.database().ref().child('regras').push().key;
        const itemVazio = { titulo: "Nova Regra", descricao: "Escreva as regras aqui...", url: "" };
        this.exibirDetalhes(itemVazio, 'regras', novoId, true);
    },

    exibirDetalhes: function(item, cat, idDoFirebase, isNovaRegra = false) {
        if (!item) return;

        const isRegra = (cat === 'regras');

        const imgMoldura = document.querySelector('.figura-moldura-vertical');
        const imgEl = document.getElementById('codice-img');
        
        // Agora a moldura de imagem aparece nas regras também!
        if (imgMoldura) imgMoldura.style.display = 'block';

        if (imgEl) {
            let urlFinal = item.url || item.identidade?.img || '';
            if (isRegra && !urlFinal) urlFinal = 'https://i.imgur.com/k2e45N3.png'; // Fallback
            
            imgEl.src = urlFinal;
            imgEl.style.cursor = "zoom-in";
            imgEl.title = "Clique para ampliar a arte";
            imgEl.onclick = () => this.darZoomImagem(urlFinal);
        }
        
        const tituloEl = document.getElementById('codice-titulo');
        if (tituloEl) {
            if (isRegra && window.isMestre) {
                // Mestre agora tem input de Título E input de URL da imagem
                tituloEl.innerHTML = `
                    <input type="text" id="edit-regra-titulo" value="${item.titulo || ''}" placeholder="Título da Regra" style="background: transparent; border-bottom: 2px dashed #3e2723; border-top: none; border-left: none; border-right: none; color: #3e2723; font-size: 26px; font-family: 'Cinzel'; width: 100%; font-weight: bold; outline: none; margin-bottom: 8px;">
                    <input type="text" id="edit-regra-url" value="${item.url || ''}" placeholder="Cole a URL da Imagem aqui..." style="background: rgba(0,0,0,0.05); border: 1px dashed #3e2723; color: #3e2723; font-size: 11px; width: 100%; padding: 4px; outline: none;">
                `;
            } else {
                tituloEl.innerText = item.nome || item.titulo || item.identidade?.nome || "Desconhecido";
            }
        }
        
        const tipoEl = document.getElementById('codice-tipo');
        if (tipoEl) {
            let label = cat.toUpperCase();
            if (cat === 'itens') label = (item.tipoItem || item.subTipo || item.tipo || 'ITEM').toUpperCase();
            if (isRegra) label = "LIVRO DE REGRAS";
            tipoEl.innerText = label;
        }

        const campoDesc = document.getElementById('codice-descricao');
        const btnSalvarDesc = document.getElementById('btn-salvar-descricao-publica');
        const btnDeletarRegra = document.getElementById('btn-deletar-regra');

        if (campoDesc) {
            const texto = item.descricao || item.subtitulo || "";
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
                        const payload = { descricao: campoDesc.value || campoDesc.innerText };
                        
                        // Salva o título e a URL se for regra
                        if (isRegra) {
                            const inputTitulo = document.getElementById('edit-regra-titulo');
                            const inputUrl = document.getElementById('edit-regra-url');
                            if (inputTitulo) payload.titulo = inputTitulo.value;
                            if (inputUrl) payload.url = inputUrl.value;
                        }
                        
                        window.database.ref(`${cat}/${idDoFirebase}`).update(payload).then(() => {
                            alert(isRegra ? "📚 Regra Salva no Códice!" : "📜 Descrição oficial atualizada!");
                            if(isRegra && payload.url) imgEl.src = payload.url; // Atualiza a foto na hora
                        });
                    };
                }

                if (btnDeletarRegra) {
                    btnDeletarRegra.style.display = isRegra ? 'block' : 'none';
                    btnDeletarRegra.onclick = () => {
                        if (confirm("🔥 Tem certeza que deseja queimar esta página de regra?")) {
                            window.database.ref(`regras/${idDoFirebase}`).remove().then(() => {
                                campoDesc.value = "";
                                if(tituloEl) tituloEl.innerHTML = "Regra Excluída";
                                btnSalvarDesc.style.display = 'none';
                                btnDeletarRegra.style.display = 'none';
                            });
                        }
                    }
                }
            } else {
                if (campoDesc.tagName === 'TEXTAREA') campoDesc.readOnly = true;
                campoDesc.style.border = "none"; 
                if (btnSalvarDesc) btnSalvarDesc.style.display = 'none';
                if (btnDeletarRegra) btnDeletarRegra.style.display = 'none';
            }
        }

        const badge = document.getElementById('codice-stats-badge');
        if (badge) {
            if (isRegra) {
                badge.style.display = 'none';
            } else {
                badge.style.display = 'block';
                const rank = (item.rank || item.identidade?.rank || item.raridade || "-").toUpperCase();
                const elemento = (item.elemento || item.identidade?.elemento || item.tipoItem || item.tipoMagia || "Neutro").toUpperCase();
                badge.innerHTML = `
                    <span style="color: #3e2723;"><i class="fa-solid fa-crown"></i> Info: <b>${rank}</b></span>
                    <span style="color: #3e2723;"><i class="fa-solid fa-burst"></i> Tipo: <b>${elemento}</b></span>
                `;
            }
        }

        const miniStats = document.getElementById('codice-mini-stats');
        if (miniStats) {
            if (isRegra || !item.atributos) {
                miniStats.style.display = 'none';
            } else {
                miniStats.style.display = 'flex';
                const attrBase = processarAtributosCodice(item.atributos || item.stats?.atributos);
                miniStats.innerHTML = `
                    <span style="color:#ff4d4d; font-weight:bold;">🗡️ FOR: ${attrBase.for}</span>
                    <span style="color:#2ecc71; font-weight:bold;">🏹 DEX: ${attrBase.dex}</span>
                    <span style="color:#00f2ff; font-weight:bold;">🔮 INT: ${attrBase.int}</span>
                    <span style="color:#f3e520; font-weight:bold;">🛡️ DEF: ${attrBase.def}</span>
                `;
            }
        }

        const btnRevelar = document.getElementById('btn-revelar-codice');
        if (window.isMestre && btnRevelar) {
            if (isRegra) {
                btnRevelar.style.display = 'none';
            } else {
                btnRevelar.style.display = 'block';
                const estaDescoberto = item.descoberto || false;
                btnRevelar.innerHTML = estaDescoberto ? '<i class="fa-solid fa-eye-slash"></i> Ocultar' : '<i class="fa-solid fa-eye"></i> Revelar';
                btnRevelar.onclick = () => window.database.ref(`${cat}/${idDoFirebase}`).update({ descoberto: !estaDescoberto });
            }
        }
    }
};

window.addEventListener('load', () => codice.init());