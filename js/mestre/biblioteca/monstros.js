/**
 * js/mestre/biblioteca-monstros.js
 * Versão: 6.3 - Design Compacto, Ordenação e Fix de Edição
 */

(function() {
    const containerLista = document.getElementById('content-monstros');

    window.initBibliotecaMonstros = function() {
        if (!window.database) {
            setTimeout(window.initBibliotecaMonstros, 200);
            return;
        }

        window.database.ref('monstros').on('value', (snapshot) => {
            renderizarListaMonstros(snapshot.val());
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

    // 🔥 FUNÇÃO DE ORDENAÇÃO: Troca a posição de dois monstros
    window.moverOrdemMonstro = async function(idOrigem, idAlvo) {
        if (!idAlvo || !window.database) return;

        const refOrigem = window.database.ref(`monstros/${idOrigem}`);
        const refAlvo = window.database.ref(`monstros/${idAlvo}`);

        const snapO = await refOrigem.once('value');
        const snapA = await refAlvo.once('value');

        const mO = snapO.val();
        const mA = snapA.val();

        if (mO && mA) {
            let ordemO = mO.ordem;
            let ordemA = mA.ordem;

            if (ordemO === ordemA) {
                ordemA += 5;
            }

            await refOrigem.update({ ordem: ordemA });
            await refAlvo.update({ ordem: ordemO });
        }
    };

    function renderizarListaMonstros(dados) {
        if (!containerLista) return;
        containerLista.innerHTML = dados ? "" : "<p style='color:#444; text-align:center; padding:20px;'>Nenhum monstro encontrado.</p>";
        if (!dados) return;

        // --- 1. LÓGICA DE ORDENAÇÃO SEGURA ---
        let arrayMonstros = Object.entries(dados).map(([id, m]) => {
            return { idFirebase: id, ...m };
        });

        let maiorOrdem = 0;
        arrayMonstros.forEach(m => {
            if (typeof m.ordem === 'number' && m.ordem > maiorOrdem) {
                maiorOrdem = m.ordem;
            }
        });

        arrayMonstros.forEach((m) => {
            if (typeof m.ordem !== 'number') {
                maiorOrdem += 10;
                m.ordem = maiorOrdem;
                window.database.ref(`monstros/${m.idFirebase}`).update({ ordem: m.ordem });
            }
        });

        arrayMonstros.sort((a, b) => a.ordem - b.ordem);

        // --- 2. RENDERIZAÇÃO ---
        arrayMonstros.forEach((m, indexAtual) => {
            const id = m.idFirebase;
            const nomeRaw = m.identidade?.nome || m.nome || "Monstro";
            const nome = nomeRaw.charAt(0).toUpperCase() + nomeRaw.slice(1);
            const img = m.identidade?.img || m.url || m.img || "assets/icons/default.png";
            const elemento = (m.identidade?.elemento || m.elemento || "comum").toLowerCase();
            const rank = m.identidade?.rank || m.rank || "F";
            
            const attrsProcessados = processarAtributos(m.stats?.atributos || m.atributos);

            const card = document.createElement('div');
            card.className = `entity-card el-${elemento}`;
            card.style.cursor = "grab";
            card.draggable = true;

            card.ondragstart = (e) => {
                card.style.opacity = "0.5";
                const pacote = {
                    nome: nome,
                    url: img,
                    tipo: 'monstro',
                    elemento: elemento,
                    rank: rank,
                    atributos: attrsProcessados,
                    hpMax: (attrsProcessados.con * 1) || 100, 
                    hpAtual: (attrsProcessados.con * 1) || 100
                };
                e.dataTransfer.setData("application/json", JSON.stringify(pacote));
            };

            card.ondragend = () => card.style.opacity = "1";

            const idAnterior = indexAtual > 0 ? arrayMonstros[indexAtual - 1].idFirebase : null;
            const idProximo = indexAtual < arrayMonstros.length - 1 ? arrayMonstros[indexAtual + 1].idFirebase : null;

            const btnOrdemStyle = "width: 24px; height: 24px; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; border-radius: 4px;";
            const btnAcaoStyle  = "width: 24px; height: 24px; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; border-radius: 4px;";

            card.innerHTML = `
                <div class="entity-header" style="display: flex; align-items: center; gap: 8px; padding-bottom: 6px;">
                    <div class="entity-avatar" style="background-image: url('${img}'); flex-shrink: 0;" onclick="spawnMonstro('${id}')"></div>
                    
                    <div class="entity-info-text" style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center;" onclick="spawnMonstro('${id}')">
                        <div class="entity-name" title="${nome}" style="font-size: 14px; font-weight: 900; line-height: 1.1; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${nome}</div>
                        <div class="element-label" style="font-size: 9px; text-transform: uppercase; color: var(--cor-el, #00ff88); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${elemento.toUpperCase()} | RANK ${rank}</div>
                    </div>
                    
                    <div class="entity-actions-side" style="display: flex; flex-direction: column; gap: 4px; flex-shrink: 0;">
                        <div style="display: flex; gap: 4px; justify-content: flex-end;">
                            <button class="btn-icon-action" title="Subir" 
                                    style="${btnOrdemStyle} ${!idAnterior ? 'opacity:0.2; cursor:not-allowed;' : ''}"
                                    onclick="event.stopPropagation(); window.moverOrdemMonstro('${id}', '${idAnterior}')" 
                                    ${!idAnterior ? 'disabled' : ''}>⬆️</button>
                            <button class="btn-icon-action" title="Descer" 
                                    style="${btnOrdemStyle} ${!idProximo ? 'opacity:0.2; cursor:not-allowed;' : ''}"
                                    onclick="event.stopPropagation(); window.moverOrdemMonstro('${id}', '${idProximo}')" 
                                    ${!idProximo ? 'disabled' : ''}>⬇️</button>
                        </div>
                        <div style="display: flex; gap: 4px; justify-content: flex-end;">
                            <button class="btn-icon-action" style="${btnAcaoStyle}" title="Editar"
                                    onclick="event.stopPropagation(); prepararEdicao('monstros', '${id}')">✏️</button>
                            <button class="btn-icon-action" style="${btnAcaoStyle}" title="Excluir"
                                    onclick="event.stopPropagation(); deletarRegistro('monstros', '${id}')">🗑️</button>
                        </div>
                    </div>
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

    window.spawnMonstro = function(id) {
        window.database.ref('monstros').child(id).once('value').then(snap => {
            const m = snap.val();
            if (m && window.spawnTokenGlobal) {
                const attrs = processarAtributos(m.stats?.atributos || m.atributos);
                window.spawnTokenGlobal({
                    ...m,
                    nome: m.nome || m.identidade?.nome,
                    url: m.url || m.identidade?.img,
                    tipo: 'monstro',
                    elemento: m.elemento || m.identidade?.elemento,
                    rank: m.rank || m.identidade?.rank,
                    atributos: attrs,
                    x: 400,
                    y: 400
                });
            }
        });
    };

    window.initBibliotecaMonstros();
})();