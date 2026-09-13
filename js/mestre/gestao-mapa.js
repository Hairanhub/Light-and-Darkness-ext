// ============================================================
// === [ GESTÃO DE MAPA, MODO EDIÇÃO E FIREBASE (FIX ROTAÇÃO & FOG) ] ===
// ============================================================
(function() {
    // Seleção de Elementos da Interface
    const btnEdit = document.getElementById('btn-toggle-edit');
    const btnReset = document.getElementById('btn-reset-camera');
    const opacitySlider = document.getElementById('gridOpacity');
    const saveBtn = document.getElementById('btn-save-map');
    const clearBtn = document.getElementById('btn-clear-map');
    const mapListContainer = document.getElementById('map-list-container');
    
    // Estado do Modo de Edição
    let editMode = false;

    /**
     * 1. LÓGICA DO MODO EDIÇÃO
     */
    if (btnEdit) {
        btnEdit.onclick = () => {
            editMode = !editMode;
            
            if (editMode) {
                document.body.classList.add('modo-edicao');
                btnEdit.innerHTML = "🛠️ Modo Edição: ON";
                btnEdit.style.backgroundColor = "#004433"; 
                btnEdit.style.color = "#fff";
            } else {
                document.body.classList.remove('modo-edicao');
                btnEdit.innerHTML = "🎮 Ativar Modo Edição";
                btnEdit.style.backgroundColor = ""; 
                btnEdit.style.color = "";
            }
        };
    }

    /**
     * 1.1. LÓGICA DE RESET DA CÂMERA (CENTRALIZAR)
     */
    if (btnReset) {
        btnReset.onclick = () => {
            if (window.resetCamera) {
                window.resetCamera();
            } else {
                console.warn("Função resetCamera não encontrada no engine-mapa.js");
            }
        };
    }

    /**
     * 2. CONTROLE DE OPACIDADE DO GRID
     */
    if (opacitySlider) {
        opacitySlider.oninput = (e) => {
            document.documentElement.style.setProperty('--grid-alpha', e.target.value);
        };
    }

    /**
     * 2.5. LÓGICA DA MOLDURA (OUTER-FRAME)
     */
    const outerFrame = document.getElementById('outer-frame');
    if (outerFrame) {
        outerFrame.onclick = (e) => {
            if (e.target === outerFrame && editMode) {
                const url = prompt("URL da Imagem para a MOLDURA (Fundo 34x34):");
                if (url !== null) {
                    outerFrame.style.backgroundImage = url ? `url('${url}')` : 'none';
                    
                    if (window.refs && window.refs.mapa) {
                        window.refs.mapa.update({ frameImg: url });
                    }
                }
            }
        };
    }

    /**
     * 3. SINCRONIZAÇÃO EM TEMPO REAL OTIMIZADA
     */
    window.initMapSync = function() {
        if (!window.database || !window.refs || !window.refs.mapa) {
            console.warn("⏳ Aguardando Firebase inicializar...");
            return;
        }

        // Pega a role para saber se é mestre ou jogador (Usado no Anti-Cheat)
        const isGM = localStorage.getItem('rubi_role') === 'gm';

        // Sincroniza a Moldura (Fundo 34x34) - Corrigido Efeito "url" e "none"
        window.refs.mapa.child('frameImg').on('value', (snapshot) => {
            const url = snapshot.val();
            const frame = document.getElementById('outer-frame');
            if (frame) {
                const cleanUrl = (url && url !== "none") ? url : "";
                frame.style.backgroundImage = cleanUrl ? (cleanUrl.startsWith('url(') ? cleanUrl : `url('${cleanUrl}')`) : 'none';
            }
        });

        // Sincronização Inteligente de Blocos - Suporte a Dual Image e Anti-Cheat
        window.refs.mapa.child('blocks').on('child_changed', (snapshot) => {
            const i = snapshot.key;
            const item = snapshot.val();
            const blocks = document.querySelectorAll('.map-block');
            const targetBlock = blocks[i];

            if (targetBlock && item) {
                // Lógica de decidir qual imagem exibir
                const currentImg = (item.activeImg === 2 && item.img2) ? item.img2 : item.img;
                const cleanImg = (currentImg && currentImg !== "none") ? currentImg : "";
                let newImg = cleanImg ? (cleanImg.startsWith('url(') ? cleanImg : `url('${cleanImg}')`) : 'none';
                
                // 🔥 PROTEÇÃO ANTI-CHEAT DA NÉVOA 🔥
                if (item.fog && !isGM) {
                    newImg = 'none'; // Tira a imagem
                    targetBlock.style.backgroundColor = '#000000'; // Pinta de preto absoluto
                } else {
                    targetBlock.style.backgroundColor = ''; // Limpa a cor para o mestre
                }

                if (targetBlock.style.backgroundImage !== newImg) {
                    targetBlock.style.backgroundImage = newImg;
                }
                
                targetBlock.style.transform = `rotate(${item.rot || 0}deg)`;
                targetBlock.dataset.rotation = item.rot || 0;
                targetBlock.classList.toggle('fog', !!item.fog);
            }
            
            // Revalida a invisibilidade dos tokens se a névoa mudou
            if (window.checkTokenFogVisibility) window.checkTokenFogVisibility();
        });

        // Carga inicial dos blocos
        window.refs.mapa.child('blocks').on('value', (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            const blocks = document.querySelectorAll('.map-block');

            for (let i = 0; i < 16; i++) {
                const item = data[i];
                if (blocks[i]) {
                    const currentImg = (item && item.activeImg === 2 && item.img2) ? item.img2 : (item ? item.img : "");
                    const cleanImg = (currentImg && currentImg !== "none") ? currentImg : "";
                    let newImg = cleanImg ? (cleanImg.startsWith('url(') ? cleanImg : `url('${cleanImg}')`) : 'none';
        
                    // 🔥 PROTEÇÃO ANTI-CHEAT DA NÉVOA 🔥
                    if (item && item.fog === true && !isGM) {
                        newImg = 'none';
                        blocks[i].style.backgroundColor = '#000000';
                    } else {
                        blocks[i].style.backgroundColor = '';
                    }

                    blocks[i].style.backgroundImage = newImg;
                    
                    // 🔥 CORREÇÃO DA ROTAÇÃO: Lendo do banco de dados ao iniciar 🔥
                    const savedRot = (item && item.rot) ? item.rot : 0;
                    blocks[i].style.transform = `rotate(${savedRot}deg)`;
                    blocks[i].dataset.rotation = savedRot;
        
                    if (item && item.fog === true) {
                        blocks[i].classList.add('fog');
                    } else {
                        blocks[i].classList.remove('fog');
                    }
                }
            }
            // Revalida a invisibilidade dos tokens após montar o mapa
            if (window.checkTokenFogVisibility) window.checkTokenFogVisibility();
        });
    };

    /**
     * 4. SALVAR CONFIGURAÇÃO NA BIBLIOTECA
     * (Modificado: Puxa direto do Firebase para não perder os dados de img2)
     */
    if (saveBtn) {
        saveBtn.onclick = () => {
            if (!editMode) {
                alert("Ative o Modo Edição para salvar.");
                return;
            }

            const name = prompt("Nome para salvar este mapa:");
            if (!name) return;

            // Busca o estado perfeito e completo direto do banco
            window.refs.mapa.once('value', snap => {
                const mapaAtual = snap.val() || {};
                const frameImgLimpo = (mapaAtual.frameImg && mapaAtual.frameImg !== "none") ? mapaAtual.frameImg : "";
                
                window.database.ref('mapas_salvos').push({
                    name: name,
                    frameImg: frameImgLimpo,
                    blocks: mapaAtual.blocks || Array(16).fill({ img: "", rot: 0, fog: false }),
                    timestamp: Date.now()
                }).then(() => alert("Mapa salvo com sucesso!"));
            });
        };
    }

    /**
     * 5. CARREGAR BIBLIOTECA
     */
    function loadLibrary() {
        if (!window.database || !mapListContainer) return;

        window.database.ref('mapas_salvos').on('value', (snapshot) => {
            mapListContainer.innerHTML = '';
            snapshot.forEach((child) => {
                const map = child.val();
                const key = child.key;
                
                const div = document.createElement('div');
                div.className = 'map-item';
                div.style = "padding: 10px; border-bottom: 1px dotted #444; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); margin-bottom: 2px;";
                div.innerHTML = `
                    <span style="color: #eee; font-family: Oswald;">${map.name}</span>
                    <button class="delete-map-btn" style="background:none; border:none; color:#ff4444; cursor:pointer;">✕</button>
                `;
                
                div.onclick = (e) => {
                    if (e.target.classList.contains('delete-map-btn')) {
                        if(confirm("Excluir permanentemente?")) {
                            window.database.ref('mapas_salvos').child(key).remove();
                        }
                        return;
                    }

                    if(confirm(`Carregar mapa "${map.name}"?`)) {
                        window.refs.mapa.update({
                            frameImg: map.frameImg || "",
                            blocks: map.blocks
                        });
                    }
                };
                mapListContainer.appendChild(div);
            });
        });
    }

    /**
     * 6. LIMPAR MAPA
     */
    if (clearBtn) {
        clearBtn.onclick = () => {
            if (!editMode) return;
            if (confirm("Resetar o tabuleiro?")) {
                const emptyBlocks = Array(16).fill({ img: "", rot: 0, fog: false });
                window.refs.mapa.update({
                    frameImg: "",
                    blocks: emptyBlocks
                });
            }
        };
    }

    /**
     * 7. INICIALIZAÇÃO INTELIGENTE
     */
    function checkAndInit() {
        if (window.database && window.refs && window.refs.mapa) {
            window.initMapSync();
            loadLibrary();
        } else {
            setTimeout(checkAndInit, 200);
        }
    }

    document.addEventListener('DOMContentLoaded', checkAndInit);

})();