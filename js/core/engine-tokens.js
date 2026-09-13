/* ============================================================
   === [ ENGINE DE TOKENS V8.1 ] ===
   === Feat: O Peso do Gelo + Renderização Dinâmica de Mana 🔮
   ============================================================ */
(function() {
    const gridSize = 35; 

    const normalizar = (txt) => String(txt || "").trim().toLowerCase();
    const getScale = () => window.currentScale || 1; 

    // --- NOVA FUNÇÃO GLOBAL DE SEGURANÇA (BLINDADA) ---
    window.isDonoOuMestre = function(data, tipo) {
        const meuNome = localStorage.getItem('rubi_username');
        const minhaRole = localStorage.getItem('rubi_role'); 
        
        if (minhaRole === 'gm') return true;
        // 🔥 FIX: A palavra exata para não confundir singular com plural
        if (tipo === 'itens' || tipo === 'item' || tipo === 'magia') return true; 
        if (data.dono && meuNome && data.dono.toLowerCase() === meuNome.toLowerCase()) return true;
        
        return false;
    };

    // 🔥 LÊ OS MULTIPLICADORES DO MESTRE EM TEMPO REAL E FORÇA ATUALIZAÇÃO 🔥
    window.multiplicadoresGlobais = { for: 1, dex: 1, int: 1, def: 4, car: 1, con: 4 }; 
    setTimeout(() => {
        if (window.database) {
            window.database.ref('configuracoes/multiplicadores').on('value', snap => {
                if (snap.exists()) {
                    window.multiplicadoresGlobais = snap.val();
                    document.querySelectorAll('.token-vtt').forEach(tk => {
                        const id = tk.id.replace('token-', '');
                        window.mapaRef.child('tokens').child(id).once('value', s => {
                            if(s.exists()) window.updateTokenDOM(id, s.val());
                        });
                    });
                }
            });
        }
    }, 2000);

    window.initEngineTokens = function() {
        if (!window.mapaRef) {
            setTimeout(window.initEngineTokens, 500);
            return;
        }
        const tokensRef = window.mapaRef.child('tokens');
        
        tokensRef.on('child_added', snap => {
            renderToken(snap.key, snap.val());
        });

        tokensRef.on('child_changed', snap => {
            window.updateTokenDOM(snap.key, snap.val());
        });

        tokensRef.on('child_removed', snap => {
            const el = document.getElementById(`token-${snap.key}`);
            if (el) el.remove();
        });
    };

    function gerarMetaHTML(data, key) {
        let tipoRaw = normalizar(data.tipo);
        let tipo = tipoRaw;
        if (tipoRaw === "item" || tipoRaw === "itens" || data.raridade || data.tipoItem) tipo = "itens";
        else if (data.custo && tipoRaw !== "item" && tipoRaw !== "itens") tipo = "magia";
        else if (!tipo && data.rank) tipo = "monstros";

        const sStatusLinha = 'display: flex; gap: 2px; align-items: center; color: #fff;';
        const sSubtituloLong = 'font-size: 4px; opacity: 0.8; font-weight: normal; color: #cccccc; margin-top: 2px; display: block; text-align: left;';

        let statusHTML = '<div class="token-status-container" style="position: absolute; top: -15px; right: -5px; display: flex; gap: 2px; z-index: 20;">';
        if (data.statusAtivos) {
            Object.entries(data.statusAtivos).forEach(([idUnico, s]) => {
                const tipoStatus = s.tipo ? s.tipo.toUpperCase() : "DESCONHECIDO";
                const def = window.StatusSystem && window.StatusSystem.definitions ? window.StatusSystem.definitions[tipoStatus] : null;
                statusHTML += `<div class="status-badge" title="${s.tipo}" oncontextmenu="window.mapaRef.child('tokens').child('${key}').child('statusAtivos').child('${idUnico}').remove(); return false;" style="font-size: 14px; background: rgba(0,0,0,0.8); border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border: 1px solid gold; box-shadow: 0 0 5px black; cursor: pointer;">${def?.icone || '⚠️'}</div>`;
            });
        }
        statusHTML += '</div>';

        let iconesHTML = '';
        let subInline = ''; 
        let subBlock = '';  

        if (tipo === 'monstros') {
            const icones = { fogo:'🔥', agua:'💧', terra:'🧱', vento:'🌪️', natureza:'🌱', gelo:'❄️', raio:'⚡', unico:'🎇', lendario:'🎆' };
            iconesHTML = `<span>${icones[normalizar(data.elemento)] || '👾'}</span> <span>👑${data.rank || 'F'}</span>`;
        } else if (tipo === 'magia') {
            const iconesTipo = { 'melee': '⚔️', 'ranged': '🎯', 'suporte': '🔰', 'reacao': '⏳', 'mobilidade': '💨' };
            iconesHTML = `<span>🔮</span> <span>${iconesTipo[normalizar(data.tipoMagia)] || '✨'}</span> <span>🔷${data.custo || '0'}</span>`;
            if (data.descricao) subBlock = `<span style="${sSubtituloLong}">${data.descricao}</span>`;
        } else if (tipo === 'itens') {
            const sub = normalizar(data.tipoItem || data.subTipo || "item");
            const qIcon = { comum: '⚪', raro: '🔵', lendario: '🟡', unico: '🟣' }[normalizar(data.raridade || "comum")] || '⚪';
            iconesHTML = `<span>${sub === 'arma' ? '🗡️' : sub === 'armadura' ? '🛡️' : '📦'}</span><span>${qIcon}</span>`;
            if (sub === 'arma') subInline = `<span style="font-size: 0.8em; opacity: 0.7; margin-left: 5px;">(${data.tipoEspecifico || 'Arma'})</span>`;
        }

        return { status: statusHTML, icones: `<div style="${sStatusLinha}">${iconesHTML}</div>`, inline: subInline, bloco: subBlock };
    }

    function renderToken(key, data) {
        const mapContainer = document.getElementById('map-container-vtt');
        if (!mapContainer) return;

        if (document.getElementById(`token-${key}`)) return;
        
        const token = document.createElement('div');
        token.id = `token-${key}`;
        
        // 🔥 FIX: Lógica de tipos consertada!
        let t = normalizar(data.tipo);
        if (data.raridade || data.tipoItem || t === "item" || t === "itens") t = "itens";
        else if (data.custo || t === "magia") t = "magia";
        else if (t === "jogador") t = "jogador";
        else if (!t) t = "monstros";
        
        token.className = `token type-${t} token-vtt`;
        token.dataset.dono = (data.dono || "").toLowerCase(); 
        
        // 🔹 INJEÇÃO DOS STATUS PARA O DRAG-AND-DROP LER EM TEMPO REAL 🔹
        token.dataset.statusAtivos = JSON.stringify(data.statusAtivos || {});

        const movMax = parseInt(data.movimentoMaximo) || 8;
        const movRest = parseInt(data.movimentoRestante) || movMax;
        token.dataset.movimentoMaximo = movMax;
        token.dataset.movimentoRestante = movRest;
        
        const startX = data.x !== undefined && !isNaN(data.x) ? Number(data.x) : 200;
        const startY = data.y !== undefined && !isNaN(data.y) ? Number(data.y) : 200;
        
        token.style.position = 'absolute';
        token.style.left = `${startX}px`;
        token.style.top = `${startY}px`;

        const tokenImage = document.createElement('div');
        tokenImage.className = 'token-image-body';
        tokenImage.style.position = 'relative';
        tokenImage.style.overflow = 'hidden'; 
        tokenImage.style.setProperty('background-image', 'none', 'important'); 
        tokenImage.style.backgroundColor = 'transparent'; 
        
        const formatoToken = (t === 'itens' || t === 'magia') ? '8px' : '50%';
        tokenImage.style.borderRadius = formatoToken; 

        const tv = data.tokenVisuais || { zoom: 1, x: 0, y: 0, rot: 0 };
        const imgSrc = data.url || data.img || "https://placehold.co/150/2c3e50/ffffff?text=Token";
        
        const z = Number(tv.zoom) || 1;
        const rx = Number(tv.x) || 0;
        const ry = Number(tv.y) || 0;
        const rrot = Number(tv.rot) || 0;
        
        const ratio = 35 / 120; 

        const tokenArt = document.createElement('img');
        tokenArt.className = 'token-art-vtt';
        tokenArt.src = imgSrc;
        
        tokenArt.style.position = 'absolute';
        tokenArt.style.top = '50%';
        tokenArt.style.left = '50%';
        tokenArt.style.maxWidth = '100%';
        tokenArt.style.maxHeight = '100%';
        tokenArt.style.width = 'auto';
        tokenArt.style.height = 'auto';
        tokenArt.style.objectFit = 'unset'; 
        
        tokenArt.style.transformOrigin = 'center center';
        tokenArt.style.transform = `translate(calc(-50% + ${rx * ratio}px), calc(-50% + ${ry * ratio}px)) scale(${z}) rotate(${rrot}deg)`;
        tokenArt.style.pointerEvents = 'none'; 

        tokenImage.appendChild(tokenArt);
        token.appendChild(tokenImage);

        const stats = data.atributos || {};
        const isJogador = (t === 'jogador');
        const multPadrao = { for: 1, dex: 1, int: 1, def: 1, car: 1, con: 1 };
        const mult = isJogador ? (window.multiplicadoresGlobais || multPadrao) : multPadrao;
        
        const hpMaxReal = parseFloat(data.hpMax) || 20;
        const hpAtualReal = (data.hpAtual !== undefined) ? parseFloat(data.hpAtual) : hpMaxReal;
        
        const hpMaxBaseVisual = hpMaxReal * (mult.con || 1);
        const hpAtualBaseVisual = hpAtualReal * (mult.con || 1);
        
        const hpMaxText = Math.ceil(hpMaxBaseVisual);
        const hpAtualText = Math.ceil(hpAtualBaseVisual);
        
        const porcentagemVida = hpMaxBaseVisual > 0 ? (hpAtualBaseVisual / hpMaxBaseVisual) * 100 : 0;

        // 🔥 FIX DA MANA: Correção Dinâmica para Tokens Antigos
        let manaMax = parseInt(data.manaMax);
        if (isNaN(manaMax)) manaMax = 10;
        
        let intVisual = (stats.int || 0) * (mult.int || 1);
        
        // Se a mana gravada estiver engessada em 10, a engine força a soma da INT
        if (manaMax <= 10 && intVisual > 0) {
            manaMax = 10 + intVisual;
        }

        let manaAtual = (data.manaAtual !== undefined) ? parseInt(data.manaAtual) : manaMax;
        if (manaAtual > manaMax) manaAtual = manaMax; // Trava o visual caso tenha perdido mana (Ex: Booster)

        const porcentagemMana = manaMax > 0 ? (manaAtual / manaMax) * 100 : 0;

        const meta = gerarMetaHTML(data, key);

        let nomeFormatado = data.nome || 'Sem Nome';
        nomeFormatado = nomeFormatado.charAt(0).toUpperCase() + nomeFormatado.slice(1);

        const overlay = document.createElement('div');
        overlay.className = 'token-info-overlay';
        overlay.innerHTML = `
            ${meta.status || ""} 
            <div class="hp-section">
                <div class="hp-bar-fill" style="width: ${Math.max(0, Math.min(100, porcentagemVida))}%"></div>
                <span class="hp-text">${hpAtualText}/${hpMaxText}</span>
            </div>
            
            <div class="mana-section" style="width: 100%; background: rgba(0,0,0,0.8); border: 1px solid #0055ff; border-radius: 4px; height: 10px; position: relative; overflow: hidden; margin-top: 1px;">
                <div class="mana-bar-fill" style="width: ${Math.max(0, Math.min(100, porcentagemMana))}%; height: 100%; background: linear-gradient(90deg, #0033cc, #0099ff); transition: width 0.3s;"></div>
                <span class="mana-text" style="position: absolute; top: 0; left: 0; width: 100%; text-align: center; font-size: 8px; font-weight: bold; color: white; line-height: 10px;">${manaAtual}/${manaMax}</span>
            </div>  
            <div class="info-principal" style="display: flex; flex-direction: column; width: 100%; padding: 2px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%; gap: 8px;">
                    <div class="nome-linha" style="margin:0; text-align: left; font-size: 11px; text-transform: capitalize;">${nomeFormatado}</div>
                    <div style="margin-top: -2px;"> ${meta.icones || ""}</div>
                </div>
                <div class="legenda-linha" style="margin-top: 2px; font-size: 9px; color: #ccc; text-align: left;">${meta.inline || ""}</div>
                <div class="meta-linha">${meta.bloco || ""}</div>
            </div>
            
            <div class="atributos-grid">
                <div class="atrib-box"><label>FOR</label><span>${(stats.for || 0) * (mult.for || 1)}</span></div>
                <div class="atrib-box"><label>DEX</label><span>${(stats.dex || 0) * (mult.dex || 1)}</span></div>
                <div class="atrib-box"><label>INT</label><span>${(stats.int || 0) * (mult.int || 1)}</span></div>
                <div class="atrib-box"><label>DEF</label><span>${(stats.def || 0) * (mult.def || 1)}</span></div>
                <div class="atrib-box"><label>CAR</label><span>${(stats.car || 0) * (mult.car || 1)}</span></div>
                <div class="atrib-box"><label>VIDA</label><span>${hpMaxText}</span></div> 
            </div>`;
        
        token.appendChild(overlay);
        
        token.addEventListener('click', (e) => {
            if (token.classList.contains('prevent-click')) return;
            e.stopPropagation();
            if (window.iniciativa?.modoSelecao) { window.iniciativa.adicionarOuRemover(key); return; }
            if (window.combate?.modoDelecao) {
                if(confirm(`Deletar ${data.nome}?`)) window.mapaRef.child('tokens').child(key).remove();
                return;
            }
            if (e.ctrlKey && window.combate && t !== 'itens' && t !== 'item' && t !== 'magia') { 
                window.combate.tratarCliqueCombate(e, key); 
            }
        });

        if (window.isDonoOuMestre(data, t)) {
            enableDrag(token, key, data, t, mapContainer);
            token.style.cursor = 'grab';
        } else {
            token.setAttribute('draggable', 'false');
            token.style.cursor = 'not-allowed';
            token.addEventListener('mousedown', (e) => e.preventDefault());
        }
        
        mapContainer.appendChild(token);
        
        if (window.checkTokenFogVisibility) window.checkTokenFogVisibility(); 
    }

    function enableDrag(token, key, data, tipoToken, mapContainer) {
        token.setAttribute('draggable', 'true');

        token.addEventListener('dragstart', (e) => {
            const isDropable = (tipoToken === 'itens' || tipoToken === 'item' || tipoToken === 'magia');
            if (isDropable && !e.ctrlKey) {
                const itemDataParaInventario = { ...data, key: key };
                e.dataTransfer.setData('application/json', JSON.stringify(itemDataParaInventario));
                e.dataTransfer.effectAllowed = "move";
                window.itemSendoArrastadoData = itemDataParaInventario;
                window.itemSendoArrastadoIndex = null; 
            } else {
                e.preventDefault();
            }
        });

        let isMoving = false;
        let startX, startY, startTokenX, startTokenY;
        let blocosPermitidos = 999;
        let emCombate = false;
        let limitZoneDiv = null; 

        const onMouseDown = (e) => {
            if (e.button !== 0 || e.target.closest('.status-badge')) return;

            const isDropable = (tipoToken === 'itens' || tipoToken === 'item' || tipoToken === 'magia');
            if (isDropable && !e.ctrlKey) return; 

            const donoAtual = token.dataset.dono;
            if (!window.isDonoOuMestre({ dono: donoAtual }, tipoToken)) return;

            let statusAtualizados = {};
            try {
                statusAtualizados = JSON.parse(token.dataset.statusAtivos || "{}");
            } catch(e) {}

            if (window.StatusSystem && Object.keys(statusAtualizados).length > 0 && !isDropable) {
                let statusBloqueador = null;
                
                for (let id in statusAtualizados) {
                    let s = statusAtualizados[id];
                    if (!s || !s.tipo) continue;
                    let def = window.StatusSystem.definitions[s.tipo.toUpperCase()];
                    
                    if (def && def.travaMovimento) {
                        statusBloqueador = def.nome;
                        break;
                    }
                }

                if (statusBloqueador) {
                    token.classList.add('error-shake');
                    setTimeout(() => token.classList.remove('error-shake'), 300);
                    
                    if (window.combate && window.combate.notificarCombate) {
                        const charName = token.querySelector('.nome-linha')?.textContent || "Personagem";
                        window.combate.notificarCombate(charName.toUpperCase(), `🛑 <b>TENTOU ANDAR, MAS ESTÁ PRESO!</b><br>Motivo: ${statusBloqueador}`, "#ff3333");
                    }
                    return; 
                }
            }

            emCombate = window.iniciativa && window.iniciativa.fila && window.iniciativa.fila.length > 0;
            const isMestre = localStorage.getItem('rubi_role') === 'gm';
            
            let idTurnoAtual = null;
            if (emCombate && window.iniciativa.fila[window.iniciativa.turnoAtual]) {
                idTurnoAtual = window.iniciativa.fila[window.iniciativa.turnoAtual].id;
            }
            let isMeuTurno = (idTurnoAtual === key);

            if (emCombate && tipoToken !== 'itens' && tipoToken !== 'item' && tipoToken !== 'magia') {
                if (!isMeuTurno && !isMestre) {
                    blocosPermitidos = 0; 
                } else {
                    blocosPermitidos = parseInt(token.dataset.movimentoRestante);
                    if (isNaN(blocosPermitidos)) {
                        blocosPermitidos = parseInt(token.dataset.movimentoMaximo) || 8;
                    }
                }
            } else {
                blocosPermitidos = 999;
            }

            // ❄️ O PESO DO GELO: Reduz a mobilidade baseado na armadura se estiver congelado
            let temGelo = false;
            for (let id in statusAtualizados) {
                if (statusAtualizados[id].tipo && statusAtualizados[id].tipo.toUpperCase() === "GELO") {
                    temGelo = true;
                    break;
                }
            }

            if (temGelo && emCombate && blocosPermitidos > 0) {
                let armadura = (data.tipoArmadura || data.categoriaArmadura || "nenhuma").toLowerCase();
                
                let limiteGelo = 4; // Base sem armadura
                if (armadura.includes("leve")) limiteGelo = 3;
                else if (armadura.includes("media") || armadura.includes("média")) limiteGelo = 2;
                else if (armadura.includes("pesada")) limiteGelo = 1;

                blocosPermitidos = Math.min(blocosPermitidos, limiteGelo);
            }

            if (blocosPermitidos <= 0 && !isDropable) {
                token.classList.add('error-shake');
                setTimeout(() => token.classList.remove('error-shake'), 300);
                return; 
            }

            isMoving = false;
            startX = e.clientX;
            startY = e.clientY;
            startTokenX = parseInt(token.style.left) || 0;
            startTokenY = parseInt(token.style.top) || 0;

            if (emCombate && blocosPermitidos > 0 && tipoToken !== 'itens' && tipoToken !== 'item' && tipoToken !== 'magia') {
                limitZoneDiv = document.createElement('div');
                const tamanhoZom = (blocosPermitidos * 2 + 1) * 35; 
                
                limitZoneDiv.style.position = 'absolute';
                limitZoneDiv.style.width = `${tamanhoZom}px`;
                limitZoneDiv.style.height = `${tamanhoZom}px`;
                limitZoneDiv.style.left = `${startTokenX - (blocosPermitidos * 35)}px`;
                limitZoneDiv.style.top = `${startTokenY - (blocosPermitidos * 35)}px`;
                limitZoneDiv.style.backgroundColor = 'rgba(0, 255, 204, 0.1)'; 
                limitZoneDiv.style.border = '2px dashed #00ffcc';
                limitZoneDiv.style.borderRadius = '5px';
                limitZoneDiv.style.pointerEvents = 'none'; 
                limitZoneDiv.style.zIndex = '5'; 
                
                mapContainer.appendChild(limitZoneDiv);
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e) => {
            const deltaX = (e.clientX - startX) / (window.currentScale || 1);
            const deltaY = (e.clientY - startY) / (window.currentScale || 1);
            const dist = Math.hypot(deltaX, deltaY);

            if (!isMoving && dist > 5) {
                isMoving = true;
                token.classList.add('is-moving-grid');
                token.style.zIndex = "9999";
            }

            if (isMoving) {
                let squaresX = Math.round(deltaX / 35);
                let squaresY = Math.round(deltaY / 35);

                if (emCombate) {
                    squaresX = Math.max(-blocosPermitidos, Math.min(blocosPermitidos, squaresX));
                    squaresY = Math.max(-blocosPermitidos, Math.min(blocosPermitidos, squaresY));
                }

                if (isNaN(squaresX)) squaresX = 0;
                if (isNaN(squaresY)) squaresY = 0;

                let nextX = startTokenX + (squaresX * 35);
                let nextY = startTokenY + (squaresY * 35);
                
                token.style.left = nextX + 'px';
                token.style.top = nextY + 'px';
            }
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            if (limitZoneDiv) {
                limitZoneDiv.remove();
                limitZoneDiv = null;
            }

            if (isMoving) {
                token.classList.remove('is-moving-grid');
                
                let rawX = parseInt(token.style.left);
                let rawY = parseInt(token.style.top);

                if (isNaN(rawX) || isNaN(rawY)) return;

                let finalX = Math.floor(rawX / 35) * 35;
                let finalY = Math.floor(rawY / 35) * 35;

                let updates = {};

                if (emCombate && tipoToken !== 'itens' && tipoToken !== 'item' && tipoToken !== 'magia') {
                    let andouX = Math.abs(finalX - startTokenX) / 35;
                    let andouY = Math.abs(finalY - startTokenY) / 35;
                    let distAndada = Math.max(andouX, andouY); 
                    
                    if (distAndada > 0) {
                        updates.movimentoRestante = Math.max(0, blocosPermitidos - distAndada);
                    }
                }

                if (finalX !== startTokenX || finalY !== startTokenY || updates.movimentoRestante !== undefined) {
                    updates.x = finalX;
                    updates.y = finalY;
                    window.mapaRef.child('tokens').child(key).update(updates);

                    // ⚡ O CHOQUE DE REAÇÃO ESCALONADO (1 Grid = 1 Dano)
                    let blocosAndadosX = Math.abs(finalX - startTokenX) / 35;
                    let blocosAndadosY = Math.abs(finalY - startTokenY) / 35;
                    let blocosTotais = Math.max(blocosAndadosX, blocosAndadosY); 

                    if (blocosTotais > 0 && window.StatusSystem && typeof window.StatusSystem.aplicarDanoReacao === 'function') {
                        setTimeout(() => {
                            window.StatusSystem.aplicarDanoReacao(key, blocosTotais);
                        }, 200);
                    }
                }
                
                token.style.left = finalX + 'px';
                token.style.top = finalY + 'px';
            }
        };

        token.addEventListener('mousedown', onMouseDown);
    }

    window.updateTokenDOM = function(key, data) {
        const token = document.getElementById(`token-${key}`);
        if (!token || token.classList.contains('is-moving-grid')) return;
        
        token.dataset.dono = (data.dono || "").toLowerCase();
        
        // 🔹 ATUALIZA OS STATUS NO DOM SEMPRE QUE O FIREBASE MUDAR 🔹
        token.dataset.statusAtivos = JSON.stringify(data.statusAtivos || {});

        if (data.x !== undefined && !isNaN(data.x)) token.style.left = `${data.x}px`;
        if (data.y !== undefined && !isNaN(data.y)) token.style.top = `${data.y}px`;

        const movMax = data.movimentoMaximo !== undefined ? data.movimentoMaximo : 8;
        const movRest = data.movimentoRestante !== undefined ? data.movimentoRestante : movMax;
        token.dataset.movimentoMaximo = movMax;
        token.dataset.movimentoRestante = movRest;

        let artElement = token.querySelector('.token-art-vtt');
        const tv = data.tokenVisuais || { zoom: 1, x: 0, y: 0, rot: 0 };
        const imgSrc = data.url || data.img || "https://placehold.co/150/2c3e50/ffffff?text=Token";
        
        const ratio = 35 / 120;
        const z = Number(tv.zoom) || 1;
        const rx = Number(tv.x) || 0;
        const ry = Number(tv.y) || 0;
        const rrot = Number(tv.rot) || 0;

        if (artElement) {
            artElement.src = imgSrc;
            artElement.style.transform = `translate(calc(-50% + ${rx * ratio}px), calc(-50% + ${ry * ratio}px)) scale(${z}) rotate(${rrot}deg)`;
        } else {
            const tokenImage = token.querySelector('.token-image-body');
            if (tokenImage) {
                tokenImage.style.position = 'relative';
                tokenImage.style.overflow = 'hidden';
                tokenImage.style.setProperty('background-image', 'none', 'important');
                tokenImage.style.backgroundColor = 'transparent';
                
                const isSquare = token.classList.contains('type-itens') || token.classList.contains('type-item') || token.classList.contains('type-magia');
                tokenImage.style.borderRadius = isSquare ? '8px' : '50%';

                artElement = document.createElement('img');
                artElement.className = 'token-art-vtt';
                artElement.src = imgSrc;
                artElement.style.position = 'absolute';
                artElement.style.top = '50%';
                artElement.style.left = '50%';
                artElement.style.maxWidth = '100%';
                artElement.style.maxHeight = '100%';
                artElement.style.width = 'auto';
                artElement.style.height = 'auto';
                artElement.style.objectFit = 'unset';
                
                artElement.style.transformOrigin = 'center center';
                artElement.style.transform = `translate(calc(-50% + ${rx * ratio}px), calc(-50% + ${ry * ratio}px)) scale(${z}) rotate(${rrot}deg)`;
                artElement.style.pointerEvents = 'none';
                
                tokenImage.appendChild(artElement);
            }
        }

        const stats = data.atributos || {};
        const isJogador = token.classList.contains('type-jogador');
        const multPadrao = { for: 1, dex: 1, int: 1, def: 1, car: 1, con: 1 };
        const mult = isJogador ? (window.multiplicadoresGlobais || multPadrao) : multPadrao;
        
        const hpMaxReal = parseFloat(data.hpMax) || 20;
        const hpAtualReal = (data.hpAtual !== undefined) ? parseFloat(data.hpAtual) : hpMaxReal;
        
        const hpMaxBaseVisual = hpMaxReal * (mult.con || 1);
        const hpAtualBaseVisual = hpAtualReal * (mult.con || 1);
        
        const hpMaxText = Math.ceil(hpMaxBaseVisual);
        const hpAtualText = Math.ceil(hpAtualBaseVisual);

        const bar = token.querySelector('.hp-bar-fill');
        const hpText = token.querySelector('.hp-text');
        
        if (bar) {
            const perc = hpMaxBaseVisual > 0 ? (hpAtualBaseVisual / hpMaxBaseVisual) * 100 : 0;
            bar.style.width = `${Math.max(0, Math.min(100, perc))}%`;
        }
        if (hpText) hpText.textContent = `${hpAtualText}/${hpMaxText}`;

        // 🔥 FIX DA MANA NO UPDATE: Mesma inteligência visual sendo injetada na marra!
        let manaMax = parseInt(data.manaMax);
        if (isNaN(manaMax)) manaMax = 10;
        
        let intVisual = (stats.int || 0) * (mult.int || 1);
        if (manaMax <= 10 && intVisual > 0) {
            manaMax = 10 + intVisual;
        }

        let manaAtual = (data.manaAtual !== undefined) ? parseInt(data.manaAtual) : manaMax;
        if (manaAtual > manaMax) manaAtual = manaMax; // Trava para não bugar a barra

        const manaBar = token.querySelector('.mana-bar-fill');
        const manaText = token.querySelector('.mana-text');
        
        if (manaBar) {
            const percMana = manaMax > 0 ? (manaAtual / manaMax) * 100 : 0;
            manaBar.style.width = `${Math.max(0, Math.min(100, percMana))}%`;
        }
        if (manaText) manaText.textContent = `${manaAtual}/${manaMax}`;

        const boxes = token.querySelectorAll('.atrib-box span');
        if (boxes.length >= 6) {
            boxes[0].textContent = (stats.for || 0) * (mult.for || 1);
            boxes[1].textContent = (stats.dex || 0) * (mult.dex || 1);
            boxes[2].textContent = (stats.int || 0) * (mult.int || 1);
            boxes[3].textContent = (stats.def || 0) * (mult.def || 1); 
            boxes[4].textContent = (stats.car || 0) * (mult.car || 1);
            boxes[5].textContent = hpMaxText; 
        }

        const meta = gerarMetaHTML(data, key);
        let statusContainer = token.querySelector('.token-status-container');
        if (statusContainer) {
            statusContainer.outerHTML = meta.status;
        } else {
            const overlay = token.querySelector('.token-info-overlay');
            if(overlay) overlay.insertAdjacentHTML('afterbegin', meta.status);
        }
        
        if (window.checkTokenFogVisibility) window.checkTokenFogVisibility();
    };

    window.spawnTokenGlobal = function(data) {
        if (!window.mapaRef) {
            console.error("❌ [SPAWN] Erro: window.mapaRef não inicializada.");
            return;
        }

        const posX = (data.x !== undefined) ? Number(data.x) : 200;
        const posY = (data.y !== undefined) ? Number(data.y) : 200;

        const finalData = { ...data, x: posX, y: posY };

        let t = (data.tipo || "").toString().toLowerCase();

        if (data.raridade || data.tipoItem || t === "item" || t === "itens") {
            t = "itens"; 
        } else if (data.custo || t === "magia") {
            t = "magia"; 
        } else if (!t || t === "undefined" || t === "desconhecido") {
            t = (data.categoria === "NPC") ? "npcs" : "monstros";
        }
        
        finalData.tipo = t;
        if (!finalData.nome) finalData.nome = data.identidade?.nome || data.nome || "Token";

        if (finalData.nome) {
            finalData.nome = finalData.nome.charAt(0).toUpperCase() + finalData.nome.slice(1);
        }

        if (typeof data.atributos === 'string') {
            const v = data.atributos.split('/').map(val => parseInt(val.trim()) || 0);
            finalData.atributos = { for:v[0], dex:v[1], int:v[2], def:v[3], car:v[4], con:v[5] };
        }
        
        if (finalData.hpAtual === undefined) {
            finalData.hpAtual = parseInt(finalData.atributos?.con) || 10;
        }

        // 🔥 NOVO: Já crava a mana e a Inteligência para qualquer Token que for invocado (Monstros/Inimigos)
        if (finalData.manaMax === undefined) {
            finalData.manaMax = 10 + (parseInt(finalData.atributos?.int) || 0);
            finalData.manaAtual = finalData.manaMax;
        }

        window.mapaRef.child('tokens').push(finalData);
    };

    window.checkTokenFogVisibility = function() {
        const role = localStorage.getItem('rubi_role');
        if (role === 'gm') return; 

        const meuNome = (localStorage.getItem('rubi_username') || "").toLowerCase();
        const blocks = document.querySelectorAll('.map-block');
        const tokens = document.querySelectorAll('.token-vtt');

        tokens.forEach(token => {
            if (token.dataset.dono === meuNome && meuNome !== "") {
                token.style.display = '';
                return;
            }

            const x = parseInt(token.style.left) || 0;
            const y = parseInt(token.style.top) || 0;
            
            const col = Math.floor(x / 280);
            const row = Math.floor(y / 280);
            const blockIndex = (row * 4) + col;

            let isFogged = false;
            if (col >= 0 && col <= 3 && row >= 0 && row <= 3) {
                const block = blocks[blockIndex];
                if (block && block.classList.contains('fog')) isFogged = true;
            }

            if (isFogged) {
                token.style.display = 'none'; 
            } else {
                token.style.display = ''; 
            }
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.initEngineTokens);
    } else {
        window.initEngineTokens();
    }
})();