/**
 * js/mestre/biblioteca-npcs.js
 * Versão: 6.3 - Design Compacto, Ordenação e Fix de Edição
 */

(function() {
    const containerLista = document.getElementById('content-npcs');

    window.initBibliotecaNPCs = function() {
        if (!window.database) {
            setTimeout(window.initBibliotecaNPCs, 200);
            return;
        }

        window.database.ref('npcs').on('value', (snapshot) => {
            renderizarListaNPCs(snapshot.val());
        });
    };

    // Função auxiliar para normalizar atributos (Padronizada)
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

    // 🔥 FUNÇÃO DE ORDENAÇÃO: Troca a posição de dois NPCs
    window.moverOrdemNPC = async function(idOrigem, idAlvo) {
        if (!idAlvo || !window.database) return;

        const refOrigem = window.database.ref(`npcs/${idOrigem}`);
        const refAlvo = window.database.ref(`npcs/${idAlvo}`);

        const snapO = await refOrigem.once('value');
        const snapA = await refAlvo.once('value');

        const nO = snapO.val();
        const nA = snapA.val();

        if (nO && nA) {
            let ordemO = nO.ordem;
            let ordemA = nA.ordem;

            if (ordemO === ordemA) {
                ordemA += 5;
            }

            await refOrigem.update({ ordem: ordemA });
            await refAlvo.update({ ordem: ordemO });
        }
    };

    function renderizarListaNPCs(dados) {
        if (!containerLista) return;
        containerLista.innerHTML = dados ? "" : "<p style='color:#444; text-align:center; padding:20px;'>Nenhum NPC encontrado.</p>";
        if (!dados) return;

        // --- 1. LÓGICA DE ORDENAÇÃO SEGURA ---
        let arrayNPCs = Object.entries(dados).map(([id, n]) => {
            return { idFirebase: id, ...n };
        });

        let maiorOrdem = 0;
        arrayNPCs.forEach(n => {
            if (typeof n.ordem === 'number' && n.ordem > maiorOrdem) {
                maiorOrdem = n.ordem;
            }
        });

        arrayNPCs.forEach((n) => {
            if (typeof n.ordem !== 'number') {
                maiorOrdem += 10;
                n.ordem = maiorOrdem;
                window.database.ref(`npcs/${n.idFirebase}`).update({ ordem: n.ordem });
            }
        });

        arrayNPCs.sort((a, b) => a.ordem - b.ordem);

        // --- 2. RENDERIZAÇÃO ---
        arrayNPCs.forEach((n, indexAtual) => {
            const id = n.idFirebase;
            const nomeRaw = n.nome || n.identidade?.nome || "NPC";
            const nome = nomeRaw.charAt(0).toUpperCase() + nomeRaw.slice(1);
            const img = n.url || n.identidade?.img || "assets/icons/default.png";
            const subtitulo = n.subtitulo || n.descricao || "Personagem";
            
            const attrsProcessados = processarAtributos(n.atributos || n.stats?.atributos);

            const card = document.createElement('div');
            card.className = `entity-card el-npc`;
            card.style.cursor = "grab";
            card.draggable = true;

            card.ondragstart = (e) => {
                card.style.opacity = "0.5";
                const pacote = {
                    ...n, // 🔥 A MÁGICA AQUI: Leva os dados de zoom do NPC!
                    nome: nome,
                    url: img,
                    tipo: 'npc',
                    subtitulo: subtitulo,
                    atributos: attrsProcessados,
                    hpMax: attrsProcessados.con || 100,
                    hpAtual: attrsProcessados.con || 100
                };
                e.dataTransfer.setData("application/json", JSON.stringify(pacote));
            };

            card.ondragend = () => card.style.opacity = "1";

            const idAnterior = indexAtual > 0 ? arrayNPCs[indexAtual - 1].idFirebase : null;
            const idProximo = indexAtual < arrayNPCs.length - 1 ? arrayNPCs[indexAtual + 1].idFirebase : null;

            const btnOrdemStyle = "width: 24px; height: 24px; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; border-radius: 4px;";
            const btnAcaoStyle  = "width: 24px; height: 24px; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; border-radius: 4px;";

            card.innerHTML = `
                <div class="entity-header" style="display: flex; align-items: center; gap: 8px; padding-bottom: 6px;">
                    <div class="entity-avatar" style="flex-shrink: 0; position: relative; overflow: hidden;" onclick="spawnNPC('${id}')">
                        <img src="${img}" loading="lazy" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; pointer-events: none; border-radius: inherit;">
                    </div>
                    
                    <div class="entity-info-text" style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center;" onclick="spawnNPC('${id}')">
                        <div class="entity-name" title="${nome}" style="font-size: 14px; font-weight: 900; line-height: 1.1; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${nome}</div>
                        <div class="element-label" style="font-size: 9px; text-transform: uppercase; color: #48a0db; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${subtitulo}</div>
                    </div>
                    
                    <div class="entity-actions-side" style="display: flex; flex-direction: column; gap: 4px; flex-shrink: 0;">
                        <div style="display: flex; gap: 4px; justify-content: flex-end;">
                            <button class="btn-icon-action" title="Subir" 
                                    style="${btnOrdemStyle} ${!idAnterior ? 'opacity:0.2; cursor:not-allowed;' : ''}"
                                    onclick="event.stopPropagation(); window.moverOrdemNPC('${id}', '${idAnterior}')" 
                                    ${!idAnterior ? 'disabled' : ''}>⬆️</button>
                            <button class="btn-icon-action" title="Descer" 
                                    style="${btnOrdemStyle} ${!idProximo ? 'opacity:0.2; cursor:not-allowed;' : ''}"
                                    onclick="event.stopPropagation(); window.moverOrdemNPC('${id}', '${idProximo}')" 
                                    ${!idProximo ? 'disabled' : ''}>⬇️</button>
                        </div>
                        <div style="display: flex; gap: 4px; justify-content: flex-end;">
                            <button class="btn-icon-action" style="${btnAcaoStyle}" title="Editar"
                                    onclick="event.stopPropagation(); prepararEdicao('npcs', '${id}')">✏️</button>
                            <button class="btn-icon-action" style="${btnAcaoStyle}" title="Excluir"
                                    onclick="event.stopPropagation(); deletarRegistro('npcs', '${id}')">🗑️</button>
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

    window.spawnNPC = function(id) {
        window.database.ref('npcs').child(id).once('value').then(snap => {
            const n = snap.val();
            if (n && window.spawnTokenGlobal) {
                const attrs = processarAtributos(n.atributos || n.stats?.atributos);
                window.spawnTokenGlobal({
                    ...n,
                    nome: n.nome || n.identidade?.nome, 
                    url: n.url || n.identidade?.img, 
                    tipo: 'npc', 
                    subtitulo: n.subtitulo || n.descricao || "Personagem",
                    atributos: attrs,
                    hpMax: attrs.con || 100,
                    hpAtual: attrs.con || 100,
                    x: 400,
                    y: 400
                });
            }
        });
    };

    window.initBibliotecaNPCs();
})();