(function() {
    const container = document.getElementById('content-itens');

    window.initBibliotecaItens = function() {
        if (!window.database) {
            setTimeout(window.initBibliotecaItens, 200);
            return;
        }
        window.database.ref('itens').on('value', (snapshot) => {
            renderizarListaItens(snapshot.val());
        });
    };

    // Função de normalização padrão para manter a compatibilidade
    function processarAtributos(itemAttrs) {
        let finalAttr = { for:0, dex:0, int:0, def:0, car:0, con:0 };
        if (itemAttrs && typeof itemAttrs === 'object') {
            finalAttr = {
                for: itemAttrs.for || 0,
                dex: itemAttrs.dex || 0,
                int: itemAttrs.int || 0,
                def: itemAttrs.def || 0,
                car: itemAttrs.car || 0,
                con: itemAttrs.con || 0
            };
        }
        return finalAttr;
    }

    // 🔥 NOVA FUNÇÃO: Troca a posição de dois itens no banco de dados
    window.moverOrdemItem = async function(idOrigem, idAlvo) {
        if (!idAlvo || !window.database) return;

        const refOrigem = window.database.ref(`itens/${idOrigem}`);
        const refAlvo = window.database.ref(`itens/${idAlvo}`);

        const snapO = await refOrigem.once('value');
        const snapA = await refAlvo.once('value');

        const itemO = snapO.val();
        const itemA = snapA.val();

        if (itemO && itemA) {
            let ordemO = itemO.ordem;
            let ordemA = itemA.ordem;

            // 🛠️ FIX: Se por causa do bug antigo os dois tiverem a mesma ordem, a gente força um desempate na marra!
            if (ordemO === ordemA) {
                ordemA += 5;
            }

            // Troca os valores de ordem entre os dois itens
            await refOrigem.update({ ordem: ordemA });
            await refAlvo.update({ ordem: ordemO });
        }
    };

    function renderizarListaItens(dados) {
        if (!container) return;
        container.innerHTML = dados ? "" : "<p class='vazio' style='color:#444; text-align:center; padding:20px;'>Nenhum item na mochila.</p>";
        if (!dados) return;

    // --- 1. LÓGICA DE ORDENAÇÃO SEGURA ---
        let arrayItens = Object.entries(dados).map(([id, item]) => {
            return { idFirebase: id, ...item };
        });

        // 🛠️ FIX: Descobre qual é a MAIOR ordem que já existe na sua biblioteca
        let maiorOrdem = 0;
        arrayItens.forEach(item => {
            if (typeof item.ordem === 'number' && item.ordem > maiorOrdem) {
                maiorOrdem = item.ordem;
            }
        });

        // Garante que todos os itens novos ganhem um número sempre MAIOR que os antigos
        arrayItens.forEach((item) => {
            if (typeof item.ordem !== 'number') {
                maiorOrdem += 10;
                item.ordem = maiorOrdem;
                // Salva essa ordem no banco silenciosamente
                window.database.ref(`itens/${item.idFirebase}`).update({ ordem: item.ordem });
            }
        });

        // Ordena a lista baseada no número de ordem
        arrayItens.sort((a, b) => a.ordem - b.ordem);

        // --- 2. RENDERIZAÇÃO DA LISTA ORDENADA ---
        arrayItens.forEach((item, indexAtual) => {
            const id = item.idFirebase; // Agora usamos o ID do mapeamento
            const nome = (item.nome || "Item").charAt(0).toUpperCase() + (item.nome || "Item").slice(1);
            const img = item.url || "assets/icons/item-default.png";
            const raridade = (item.raridade || "comum").toLowerCase();
            const subTipo = (item.subTipo || item.tipoItem || "item").toLowerCase();
            const isDropActive = item.marcadoParaDrop === true;

            // Lógica de ícones para o subtítulo
            let labelExtra = subTipo.toUpperCase();
            if (subTipo === 'armadura') {
                const pesos = { pesada: '3️⃣ Pesada', media: '5️⃣ Média', leve: '7️⃣ Leve' };
                labelExtra = pesos[item.pesoCorpo] || '🛡️ Armadura';
            } else if (subTipo === 'arma') {
                const maoIcon = item.maos === '2' ? '🤲' : '✋';
                labelExtra = `${item.tipoEspecifico || 'Arma'} ${maoIcon}`;
            } else if (subTipo === 'artefato') {
                labelExtra = '💠 ARTEFATO';
            }

            const attrsProcessados = processarAtributos(item.atributos);

            const card = document.createElement('div');
            card.className = `entity-card el-item ${isDropActive ? 'card-drop-active' : ''}`;
            card.draggable = true; 
            card.style.cursor = "grab";

            // --- DRAG AND DROP CONFIGURADO (JSON) ---
            card.ondragstart = (e) => {
                card.style.opacity = "0.5";
                const pacote = {
                    ...item,
                    nome: nome,
                    url: img,
                    tipo: 'item',
                    subTipo: subTipo,
                    atributos: attrsProcessados
                };
                // Mudança Crítica para funcionar com o novo drop do mapa/inventário
                e.dataTransfer.setData("application/json", JSON.stringify(pacote));
            };

            card.ondragend = () => card.style.opacity = "1";

            // Descobre quem é o vizinho de cima e de baixo para os botões de subir/descer
            const idAnterior = indexAtual > 0 ? arrayItens[indexAtual - 1].idFirebase : null;
            const idProximo = indexAtual < arrayItens.length - 1 ? arrayItens[indexAtual + 1].idFirebase : null;

            // Variáveis de estilo para deixar os botões quadradinhos e padronizados
            const btnOrdemStyle = "width: 24px; height: 24px; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; border-radius: 4px;";
            const btnAcaoStyle  = "width: 24px; height: 24px; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; border-radius: 4px;";

            card.innerHTML = `
                <div class="entity-header" style="display: flex; align-items: center; gap: 8px; padding-bottom: 6px;">
                    
                    <div class="entity-avatar" style="background-image: url('${img}'); flex-shrink: 0;" onclick="spawnItem('${id}')"></div>
                    
                    <div class="entity-info-text" style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center;" onclick="spawnItem('${id}')">
                        <div class="entity-name" title="${nome}" style="font-size: 14px; font-weight: 900; line-height: 1.1; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${nome}</div>
                        <div class="element-label" style="font-size: 9px; text-transform: uppercase; color: #f3e520; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${labelExtra} | ${raridade}</div>
                    </div>
                    
                    <div class="entity-actions-side" style="display: flex; flex-direction: column; gap: 4px; flex-shrink: 0;">
                        
                        <div style="display: flex; gap: 4px; justify-content: flex-end;">
                            <button class="btn-icon-action" title="Subir Item" 
                                    style="${btnOrdemStyle} ${!idAnterior ? 'opacity:0.2; cursor:not-allowed;' : ''}"
                                    onclick="event.stopPropagation(); window.moverOrdemItem('${id}', '${idAnterior}')" 
                                    ${!idAnterior ? 'disabled' : ''}>⬆️</button>
                            
                            <button class="btn-icon-action" title="Descer Item" 
                                    style="${btnOrdemStyle} ${!idProximo ? 'opacity:0.2; cursor:not-allowed;' : ''}"
                                    onclick="event.stopPropagation(); window.moverOrdemItem('${id}', '${idProximo}')" 
                                    ${!idProximo ? 'disabled' : ''}>⬇️</button>
                        </div>

                        <div style="display: flex; gap: 4px; justify-content: flex-end;">
                            <button class="btn-icon-action ${isDropActive ? 'active-drop' : ''}" 
                                    style="${btnAcaoStyle}"
                                    title="${isDropActive ? 'Item pode Dropar' : 'Marcar para Drop'}"
                                    onclick="event.stopPropagation(); window.toggleDropItem('${id}', ${isDropActive})">
                                ${isDropActive ? '🎁' : '📦'}
                            </button>
                            <button class="btn-icon-action" title="Editar"
                                    style="${btnAcaoStyle}"
                                    onclick="event.stopPropagation(); prepararEdicao('itens', '${id}')">✏️</button>
                            <button class="btn-icon-action" title="Excluir"
                                    style="${btnAcaoStyle}"
                                    onclick="event.stopPropagation(); deletarRegistro('itens', '${id}')">🗑️</button>
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
            container.appendChild(card);
        });
    }

    window.toggleDropItem = function(id, estadoAtual) {
        if (!window.database) return;
        window.database.ref('itens').child(id).update({
            marcadoParaDrop: !estadoAtual
        });
    };

    window.spawnItem = function(id) {
        if (!window.database) return;
        window.database.ref('itens').child(id).once('value').then(snap => {
            const item = snap.val();
            if (item && window.spawnTokenGlobal) {
                window.spawnTokenGlobal({
                    ...item,
                    tipo: "item", 
                    subTipo: item.subTipo || item.tipoItem || "item", 
                    atributos: processarAtributos(item.atributos),
                    x: 400,
                    y: 400
                });
            }
        });
    };

    window.initBibliotecaItens();
})();