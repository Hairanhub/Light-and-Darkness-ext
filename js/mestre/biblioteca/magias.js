/**
 * js/mestre/biblioteca-magias.js
 * Versão: 6.3 - Design Compacto, Ordenação e Fix de Edição
 */

(function() {
    const containerLista = document.getElementById('content-magias');

    window.initBibliotecaMagias = function() {
        if (!window.database) {
            setTimeout(window.initBibliotecaMagias, 200);
            return;
        }
        window.database.ref('magias').on('value', (snapshot) => {
            renderizarListaMagias(snapshot.val());
        });
    };

    // Função Auxiliar de Normalização (Padronizada)
    function processarAtributos(rawAttr) {
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

    // 🔥 FUNÇÃO DE ORDENAÇÃO: Troca a posição de duas magias
    window.moverOrdemMagia = async function(idOrigem, idAlvo) {
        if (!idAlvo || !window.database) return;

        const refOrigem = window.database.ref(`magias/${idOrigem}`);
        const refAlvo = window.database.ref(`magias/${idAlvo}`);

        const snapO = await refOrigem.once('value');
        const snapA = await refAlvo.once('value');

        const magO = snapO.val();
        const magA = snapA.val();

        if (magO && magA) {
            let ordemO = magO.ordem;
            let ordemA = magA.ordem;

            if (ordemO === ordemA) {
                ordemA += 5;
            }

            await refOrigem.update({ ordem: ordemA });
            await refAlvo.update({ ordem: ordemO });
        }
    };

    function renderizarListaMagias(dados) {
        if (!containerLista) return;
        containerLista.innerHTML = dados ? "" : "<p style='color:#444; text-align:center; padding:20px;'>Nenhuma magia encontrada.</p>";
        if (!dados) return;

        // --- 1. LÓGICA DE ORDENAÇÃO SEGURA ---
        let arrayMagias = Object.entries(dados).map(([id, m]) => {
            return { idFirebase: id, ...m };
        });

        let maiorOrdem = 0;
        arrayMagias.forEach(m => {
            if (typeof m.ordem === 'number' && m.ordem > maiorOrdem) {
                maiorOrdem = m.ordem;
            }
        });

        arrayMagias.forEach((m) => {
            if (typeof m.ordem !== 'number') {
                maiorOrdem += 10;
                m.ordem = maiorOrdem;
                window.database.ref(`magias/${m.idFirebase}`).update({ ordem: m.ordem });
            }
        });

        arrayMagias.sort((a, b) => a.ordem - b.ordem);

        // --- 2. RENDERIZAÇÃO ---
        arrayMagias.forEach((m, indexAtual) => {
            const id = m.idFirebase;
            const nomeRaw = m.nome || m.identidade?.nome || "Poder";
            const nome = nomeRaw.charAt(0).toUpperCase() + nomeRaw.slice(1);
            const img = m.url || m.identidade?.img || "assets/icons/magic-default.png";
            
            const dCat = (m.categoriaDano || "magico").toLowerCase();
            const tMagia = (m.tipoMagia || "melee").toLowerCase();
            const custo = m.custo || "0";
            const descricao = m.descricao || "Sem descrição disponível.";
            const isDropActive = m.marcadoParaDrop === true;

            const attrsProcessados = processarAtributos(m.atributos || m.stats?.atributos);

            const card = document.createElement('div');
            card.className = `entity-card el-${tMagia} ${isDropActive ? 'card-drop-active' : ''}`;
            card.draggable = true;
            card.style.cursor = "grab";

            card.ondragstart = (e) => {
                card.style.opacity = "0.5";
                const pacoteMagia = {
                    ...m,
                    nome: nome,
                    url: img,
                    tipo: 'magia',
                    categoriaDano: dCat,
                    tipoMagia: tMagia,
                    custo: custo,
                    atributos: attrsProcessados,
                    marcadoParaDrop: isDropActive
                };
                e.dataTransfer.setData("application/json", JSON.stringify(pacoteMagia));
            };

            card.ondragend = () => card.style.opacity = "1";

            const idAnterior = indexAtual > 0 ? arrayMagias[indexAtual - 1].idFirebase : null;
            const idProximo = indexAtual < arrayMagias.length - 1 ? arrayMagias[indexAtual + 1].idFirebase : null;

            const btnOrdemStyle = "width: 24px; height: 24px; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; border-radius: 4px;";
            const btnAcaoStyle  = "width: 24px; height: 24px; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; border-radius: 4px;";

            card.innerHTML = `
                <div class="entity-header" style="display: flex; align-items: center; gap: 8px; padding-bottom: 6px;">
                    <div class="entity-avatar" style="background-image: url('${img}'); flex-shrink: 0;" onclick="spawnMagia('${id}')"></div>
                    
                    <div class="entity-info-text" style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center;" onclick="spawnMagia('${id}')">
                        <div class="entity-name" title="${nome}" style="font-size: 14px; font-weight: 900; line-height: 1.1; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${nome}</div>
                        <div class="element-label" style="font-size: 9px; text-transform: uppercase; color: #f3e520; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${dCat} | ${tMagia} | 💧 ${custo}</div>
                    </div>
                    
                    <div class="entity-actions-side" style="display: flex; flex-direction: column; gap: 4px; flex-shrink: 0;">
                        <div style="display: flex; gap: 4px; justify-content: flex-end;">
                            <button class="btn-icon-action" title="Subir" 
                                    style="${btnOrdemStyle} ${!idAnterior ? 'opacity:0.2; cursor:not-allowed;' : ''}"
                                    onclick="event.stopPropagation(); window.moverOrdemMagia('${id}', '${idAnterior}')" 
                                    ${!idAnterior ? 'disabled' : ''}>⬆️</button>
                            <button class="btn-icon-action" title="Descer" 
                                    style="${btnOrdemStyle} ${!idProximo ? 'opacity:0.2; cursor:not-allowed;' : ''}"
                                    onclick="event.stopPropagation(); window.moverOrdemMagia('${id}', '${idProximo}')" 
                                    ${!idProximo ? 'disabled' : ''}>⬇️</button>
                        </div>
                        <div style="display: flex; gap: 4px; justify-content: flex-end;">
                            <button class="btn-icon-action ${isDropActive ? 'active-drop' : ''}" 
                                    style="${btnAcaoStyle}" title="Drop"
                                    onclick="event.stopPropagation(); window.toggleDropMagia('${id}', ${isDropActive})">
                                ${isDropActive ? '🎁' : '📦'}
                            </button>
                            <button class="btn-icon-action" style="${btnAcaoStyle}" title="Conjurar"
                                    onclick="event.stopPropagation(); if(window.spellEngine) window.spellEngine.prepararConjuracao('${id}')">🪄</button>
                            <button class="btn-icon-action" style="${btnAcaoStyle}" title="Editar"
                                    onclick="event.stopPropagation(); prepararEdicao('magias', '${id}')">✏️</button>
                            <button class="btn-icon-action" style="${btnAcaoStyle}" title="Excluir"
                                    onclick="event.stopPropagation(); deletarRegistro('magias', '${id}')">🗑️</button>
                        </div>
                    </div>
                </div>
                <div style="color: #bbb; font-size: 10px; margin: 4px 0; font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${descricao}
                </div>
                <div class="attr-grid">
                    <div class="attr-item"><small>FOR</small><span>${attrsProcessados.for}</span></div>
                    <div class="attr-item"><small>DEX</small><span>${attrsProcessados.dex}</span></div>
                    <div class="attr-item"><small>INT</small><span>${attrsProcessados.int}</span></div>
                    <div class="attr-item"><small>DEF</small><span>${attrsProcessados.def}</span></div>
                    <div class="attr-item"><small>CAR</small><span>${attrsProcessados.car}</span></div>
                    <div class="attr-item"><small>CON</small><span>${attrsProcessados.con}</span></div>
                </div>`;
            containerLista.appendChild(card);
        });
    }

    window.toggleDropMagia = function(id, estadoAtual) {
        if (!window.database) return;
        window.database.ref('magias').child(id).update({ marcadoParaDrop: !estadoAtual });
    };

    window.spawnMagia = function(id) {
        window.database.ref('magias').child(id).once('value').then(snap => {
            const m = snap.val();
            if (m && window.spawnTokenGlobal) {
                const attrs = processarAtributos(m.atributos || m.stats?.atributos);
                window.spawnTokenGlobal({
                    ...m,
                    nome: m.nome || "Magia", 
                    url: m.url || "assets/icons/magic-default.png", 
                    tipo: 'magia', 
                    atributos: attrs,
                    x: 400,
                    y: 400
                });
            }
        });
    };

    window.initBibliotecaMagias();
})();