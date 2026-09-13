// ============================================================
// === [ MOTOR DE RENDERIZAÇÃO E CÂMERA - V2.5 (DUAL IMAGE LIVRE) ] ===
// ============================================================

window.podeMoverToken = function(tokenData) {
    const usuarioLogado = localStorage.getItem('rubi_username');
    const roleLogada = localStorage.getItem('rubi_role');
    if (roleLogada === 'gm') return true;
    if (tokenData.tipo === 'item' || tokenData.tipo === 'magia') return true;
    if (tokenData.dono && usuarioLogado && tokenData.dono.toLowerCase() === usuarioLogado.toLowerCase()) return true;
    return false;
};

(function() {
    const frame = document.getElementById('outer-frame');
    const container = document.getElementById('map-container-vtt');
    const gridSize = 35; 

    // 🔥 O SEGREDO DO MESTRE: TIRA O FANTASMA GIGANTE DOS CARDS 🔥
    // Garante que o mestre mire com a ponta do mouse e não com o card fantasma
    document.addEventListener('dragstart', (e) => {
        if (e.target.closest('.entity-card, .item-card, .npc-card, .magia-card, .biblioteca-card')) {
            const imgInvisivel = new Image();
            imgInvisivel.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            e.dataTransfer.setDragImage(imgInvisivel, 0, 0);
        }
    }, true);
    
    // --- ZOOM ORGÂNICO ---
    let scale = 1.0;
    const minScale = 0.1;
    const maxScale = 5.0;
    const zoomIntensity = 0.1; // 10% por scroll
    
    let posX = 0, posY = 0;
    const speed = 15;
    const keys = {};

    // --- CONTROLES DE MOUSE ---
    let isPanning = false;
    let startPanX = 0, startPanY = 0;

    function init() {
        window.currentScale = scale;
        
        // Teclado
        window.addEventListener('keydown', e => {
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            keys[e.key.toLowerCase()] = true; 
            if (e.code === 'Space') container.style.cursor = 'grab';
        });
        
        window.addEventListener('keyup', e => {
            keys[e.key.toLowerCase()] = false; 
            if (e.code === 'Space') {
                container.style.cursor = 'default';
                isPanning = false;
            }
        });

        // Mouse Listeners
        container.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('wheel', onWheel, { passive: false });

        // Drop da Mochila/Biblioteca
        container.ondragover = (e) => { e.preventDefault(); return false; };
        container.ondrop = onNativeDrop; 

        // Renderiza Grid
        if (typeof window.renderGrid === 'function') window.renderGrid();
        
        requestAnimationFrame(loop);
    }

    // --- EVENTOS DE MOUSE ---
    function onMouseDown(e) {
        if (keys[' ']) {
            isPanning = true;
            startPanX = e.clientX - posX;
            startPanY = e.clientY - posY;
            container.style.cursor = 'grabbing';
            return;
        }
    }

    function onMouseMove(e) {
        if (isPanning) {
            posX = e.clientX - startPanX;
            posY = e.clientY - startPanY;
            return;
        }
    }

    function onMouseUp(e) {
        if (isPanning) {
            isPanning = false;
            container.style.cursor = 'grab';
        }
    }

    // --- DROP DA MOCHILA E DO MAPA ---
    function onNativeDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const rawJSON = e.dataTransfer.getData('application/json');
        let itemData = window.itemSendoArrastadoData;
        let indexOrigem = window.itemSendoArrastadoIndex;

        if (!itemData && rawJSON) {
            try { itemData = JSON.parse(rawJSON); } catch(err) { return; }
        }
        if (!itemData) return;

        // Cálculo matemático robusto de posição
        const mapRect = frame.getBoundingClientRect();
        const rawX = (e.clientX - mapRect.left) / scale;
        const rawY = (e.clientY - mapRect.top) / scale;

        const snappedX = Math.floor(rawX / gridSize) * gridSize;
        const snappedY = Math.floor(rawY / gridSize) * gridSize;

        // CASO 1: Veio da Mochila/Inventário
        if (indexOrigem !== null && indexOrigem !== undefined && window.Inventario) {
            const purosDados = { ...itemData };
            delete purosDados.key; delete purosDados.dbKey; delete purosDados.id;

            window.Inventario.devolverParaOMapa(
                { dataset: { slotIndex: indexOrigem } }, 
                purosDados, 
                { x: snappedX, y: snappedY }
            );
        } 
        // CASO 2: Token já estava no mapa (Arrastado sem CTRL)
        else if (itemData.key) {
            window.itemSendoArrastadoIndex = null;
            window.itemSendoArrastadoData = null;
            return;
        }
        // CASO 3: Biblioteca (Invocado pelo mestre)
        else if (window.spawnTokenGlobal) {
            window.spawnTokenGlobal({ ...itemData, x: snappedX, y: snappedY });
        }
        
        window.itemSendoArrastadoIndex = null;
        window.itemSendoArrastadoData = null;
    }

    // --- ZOOM ORGÂNICO ---
    function onWheel(e) {
        if (e.target.closest('.sidebar-right') || e.target.closest('.sidebar-left')) return; 

        e.preventDefault();
        
        const delta = Math.sign(e.deltaY) * -1;
        const factor = delta > 0 ? (1 + zoomIntensity) : (1 / (1 + zoomIntensity));
        
        let newScale = scale * factor;
        if (newScale < minScale) newScale = minScale;
        if (newScale > maxScale) newScale = maxScale;
        
        // Zoom focado no mouse
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const worldX = (mouseX - posX) / scale;
        const worldY = (mouseY - posY) / scale;
        
        posX = mouseX - worldX * newScale;
        posY = mouseY - worldY * newScale;
        scale = newScale;
        window.currentScale = scale;
    }

    // --- LOOP ---
    function loop() {
        let moved = false;
        if (keys['w'] || keys['arrowup']) { posY += speed; moved = true; }
        if (keys['s'] || keys['arrowdown']) { posY -= speed; moved = true; }
        if (keys['a'] || keys['arrowleft']) { posX += speed; moved = true; }
        if (keys['d'] || keys['arrowright']) { posX -= speed; moved = true; }

        if (frame) {
            frame.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
        }
        requestAnimationFrame(loop);
    }

    // Renderizador do Grid (CORRIGIDO: BOTÕES EXCLUSIVOS DO MESTRE E SEM TRAVA DE MODO)
    window.renderGrid = function() {
        if (!container) return;
        document.querySelectorAll('.map-block').forEach(el => el.remove());
        
        const isGM = localStorage.getItem('rubi_role') === 'gm';
        
        for (let i = 0; i < 16; i++) {
            const block = document.createElement('div');
            block.className = 'map-block';
            block.dataset.index = i; 
            block.dataset.rotation = "0";
            
            // 🔥 Botão Dupla Imagem (🎭)
            const swapBtn = document.createElement('button');
            swapBtn.className = 'swap-btn';
            swapBtn.innerHTML = '🎭';
            swapBtn.title = "Botão Direito: Definir Imagem 2 | Botão Esquerdo: Alternar entre Imagens";
            swapBtn.style.position = 'absolute';
            swapBtn.style.top = '5px';
            swapBtn.style.left = '5px';
            swapBtn.style.background = 'rgba(0,0,0,0.8)';
            swapBtn.style.color = '#fff';
            swapBtn.style.border = '1px solid #fff';
            swapBtn.style.borderRadius = '3px';
            swapBtn.style.cursor = 'pointer';
            swapBtn.style.zIndex = '50';
            swapBtn.style.fontSize = '14px';
            swapBtn.style.padding = '2px 5px';
            
            // Esconde a máscara dos jogadores comuns
            if (!isGM) swapBtn.style.display = 'none';

            swapBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isGM) return;
                
                window.refs?.mapa.child('blocks').child(i).once('value', snap => {
                    const b = snap.val() || {};
                    
                    // Se o Mestre tentar virar a imagem sem ter colocado uma URL2 antes:
                    if ((b.activeImg === 1 || !b.activeImg) && !b.img2) {
                        alert("⚠️ Você precisa definir uma Imagem Secundária primeiro! (Clique com o botão DIREITO na máscara)");
                        return;
                    }
                    
                    const nextImg = b.activeImg === 2 ? 1 : 2;
                    window.refs.mapa.child('blocks').child(i).update({ activeImg: nextImg });
                });
            };
            
            swapBtn.oncontextmenu = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isGM) return;
                
                const url2 = prompt(`URL da Imagem SECUNDÁRIA (Bloco ${i+1}):`);
                if (url2 !== null && window.refs?.mapa) {
                    // Salva e já exibe a imagem 2 na mesma hora para confirmar
                    window.refs.mapa.child('blocks').child(i).update({ img2: url2, activeImg: 2 });
                }
            };
            
            block.appendChild(swapBtn);

            // Botão Rotação Original
            const rotBtn = document.createElement('button');
            rotBtn.className = 'rotate-btn';
            rotBtn.innerHTML = '🔄';
            
            // Esconde botão de girar dos jogadores também
            if (!isGM) rotBtn.style.display = 'none';

            rotBtn.onclick = (e) => {
                e.stopPropagation();
                if (!isGM) return; // Segurança
                let currentRot = (parseInt(block.dataset.rotation) || 0) + 90;
                if (currentRot >= 360) currentRot = 0;
                block.dataset.rotation = currentRot;
                block.style.transform = `rotate(${currentRot}deg) translateZ(0)`;
                if (window.refs?.mapa) window.refs.mapa.child('blocks').child(i).update({ rot: currentRot });
            };
            block.appendChild(rotBtn);

            for (let j = 0; j < 64; j++) {
                const unit = document.createElement('div');
                unit.className = 'grid-unit';
                block.appendChild(unit);
            }

            block.onclick = (e) => {
                e.stopPropagation();
                if (!document.body.classList.contains('modo-edicao')) return;
                
                if (e.ctrlKey || e.metaKey) {
                    const novoEstado = !block.classList.contains('fog'); 
                    if (window.refs?.mapa) window.refs.mapa.child('blocks').child(i).update({ fog: novoEstado });
                } else {
                    const url = prompt(`URL do Bloco ${i+1}:`);
                    if (url !== null && window.refs?.mapa) {
                        window.refs.mapa.child('blocks').child(i).update({ img: url, activeImg: 1 });
                    }
                }       
            };
            
            container.appendChild(block);
        }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();