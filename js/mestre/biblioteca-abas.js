// ============================================================
// === [ MESTRE: GERENCIADOR DE ABAS E GRUPO DE JOGADORES ] ===
// === V7.1 - LÓGICA 1:1 Base + Multiplicador Visual        ===
// ============================================================

const normalizar = (txt) => String(txt || "").trim().toLowerCase();

window.initLibraryTabs = function() {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    setTimeout(() => { if(window.sincronizarAbaJogadores) window.sincronizarAbaJogadores(); }, 1000);

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const targetContent = document.getElementById(`content-${target}`);
            if(targetContent) targetContent.classList.add('active');
            
            if (target === 'jogadores') window.sincronizarAbaJogadores();
        });
    });
};

/**
 * LÓGICA DE GESTÃO E EDIÇÃO DE JOGADORES (SINCRONIZADO COM 1:1 + MÁSCARA MULTIPLICADORA)
 */
window.sincronizarAbaJogadores = function() {
    const container = document.getElementById('content-jogadores');
    if (!container || !window.database) return;

    window.database.ref('usuarios').on('value', (snapUsers) => {
        const usuarios = snapUsers.val();
        if (!usuarios) return;

        window.mapaRef.child('tokens').on('value', (snapTokens) => {
            const tokensNoMapa = snapTokens.val() || {};
            container.innerHTML = ""; 
            
            // 🔥 PUXA OS MULTIPLICADORES DA TELA DO MESTRE 🔥
            const mult = window.multiplicadoresGlobais || { for: 1, dex: 1, con: 4, int: 1, def: 4, car: 1 };

            Object.entries(usuarios).forEach(([nome, dados]) => {
                // Ignora o mestre na lista
                if (nome.toLowerCase() === 'mestre' || dados.role === 'gm') return;

                const at = dados.atributos || {};
                const equipado = dados.status_equipado || {}; 
                
                const finais = equipado.totais || at; 
                const bonus = equipado.bonus || {};
                
                const movMaximo = equipado.movimento !== undefined ? equipado.movimento : (dados.movimentoMaximo || 8);
                
                const tokenNoMapa = Object.values(tokensNoMapa).find(t => 
                    normalizar(t.dono) === normalizar(nome)
                );
                
                // 🔥 LÓGICA 1:1 (BASE) + MULTIPLICAÇÃO VISUAL 🔥
                const hpMaxBase = finais.con || parseInt(at.con) || 0;
                const hpAtualBase = (tokenNoMapa && tokenNoMapa.hpAtual !== undefined) ? tokenNoMapa.hpAtual : hpMaxBase;
                
                const hpMaxVisual = hpMaxBase * (mult.con || 1);
                const hpAtualVisual = hpAtualBase * (mult.con || 1);
                const porcentagem = hpMaxVisual > 0 ? (hpAtualVisual / hpMaxVisual) * 100 : 0;
                const estaNoMapa = !!tokenNoMapa;

                const nomeDisplay = nome.charAt(0).toUpperCase() + nome.slice(1);

                const card = document.createElement('div');
                card.style.cssText = "margin-bottom: 15px; background: #0a0a0a; border: 1px solid #222; border-radius: 10px; overflow: hidden; font-family: 'Segoe UI', Roboto, sans-serif;";

                card.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: rgba(255,255,255,0.02);">
                         <img src="${dados.foto || 'https://via.placeholder.com/40'}" style="width: 40px; height: 40px; border-radius: 6px; border: 2px solid ${estaNoMapa ? '#2ecc71' : '#333'}; object-fit: cover;">
                         <div style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                                <strong style="color: #eee; font-size: 13px; letter-spacing: 0.5px;">${nomeDisplay}</strong>
                                <div>
                                    <span style="color: #f3e520; font-size: 10px; font-weight: bold; font-family: monospace; margin-right: 8px;" title="Movimento Máximo">👟 ${movMaximo}</span>
                                    <span style="color: #2ecc71; font-size: 10px; font-weight: bold; font-family: monospace;" title="HP Atual / Máx (Visual)">❤️ ${hpAtualVisual}/${hpMaxVisual}</span>
                                </div>
                            </div>
                            <div style="width: 100%; height: 5px; background: #000; border-radius: 10px; border: 1px solid #1a1a1a; overflow: hidden;">
                                <div style="width: ${Math.max(0, Math.min(100, porcentagem))}%; height: 100%; background: #2ecc71; transition: width 0.5s ease;"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; padding: 8px;">
                        <style>
                            .attr-card { background: #121212; border: 1px solid #1f1f1f; border-radius: 6px; padding: 5px; display: flex; flex-direction: column; }
                            .attr-row-top { width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
                            .input-base-mestre { width: 15px !important; min-width: 15px !important; padding: 0 !important; background: #1a1a1a; border: none; color: #777; font-size: 9px; text-align: center; border-radius: 2px; outline: none; line-height: 1; }
                            .input-base-mestre::-webkit-outer-spin-button, .input-base-mestre::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                            .bonus-label { font-size: 10px; font-weight: bold; opacity: 0.8; }
                            .attr-bottom { display: flex; align-items: baseline; justify-content: center; gap: 4px; margin-top: -2px; }
                            .attr-name { font-size: 9px; color: #444; font-weight: bold; }
                            .total-val { font-size: 18px; font-weight: 900; color: #fff; }
                        </style>

                        ${['for', 'dex', 'con', 'int', 'def', 'car'].map(attr => {
                            const isSpecial = (attr === 'def' || attr === 'con');
                            
                            const base = parseInt(at[attr]) || 0;
                            const adicional = parseInt(bonus[attr]) || 0;
                            const totalBase = finais[attr] !== undefined ? parseInt(finais[attr]) : (base + adicional);
                            
                            // 🔥 O VALOR FINAL MULTIPLICADO APENAS PARA EXIBIÇÃO 🔥
                            const totalVisual = totalBase * (mult[attr] || 1);

                            let colorBonus = '#555'; 
                            let textBonus = '+0';
                            if (adicional > 0) { colorBonus = '#2ecc71'; textBonus = '+' + adicional; }
                            else if (adicional < 0) { colorBonus = '#e74c3c'; textBonus = adicional; }

                            return `
                                <div class="attr-card">
                                    <div class="attr-row-top">
                                        <input type="number" class="input-base-mestre" value="${base}" title="Alterar Atributo Base Real (1:1)"
                                            onchange="window.mestreAlterarAtributo('${nome}', '${attr}', this.value)">
                                        <span class="bonus-label" style="color: ${colorBonus};" title="Bônus do Equipamento">${textBonus}</span>
                                    </div>

                                    <div class="attr-bottom">
                                        <span class="attr-name" style="${isSpecial ? 'color: #2ecc71; opacity: 0.6;' : ''}">${attr.toUpperCase()}</span>
                                        <span class="total-val" style="${adicional > 0 ? 'color: #f1c40f;' : (adicional < 0 ? 'color: #e74c3c;' : '')}" title="Valor Final Visual">${totalVisual}</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>

                    <button onclick="window.focarNoPlayer('${nome}')" style="width: 100%; padding: 6px; background: transparent; border: none; border-top: 1px solid #1a1a1a; color: #333; font-size: 9px; cursor: pointer;">
                        🔍 LOCALIZAR NO MAPA
                    </button>
                `;
                container.appendChild(card);
            });
        });
    });
};

/**
 * FUNÇÃO PARA O MESTRE EDITAR ATRIBUTOS EM TEMPO REAL (PURA 1:1)
 * O Banco de dados recebe apenas o valor real.
 */
window.mestreAlterarAtributo = function(nomePlayer, atributo, valorNovo) {
    const val = parseInt(valorNovo) || 0;
    
    // Salva EXATAMENTE o número digitado na base de dados (1:1)
    window.database.ref(`usuarios/${nomePlayer}/atributos/${atributo}`).set(val)
        .then(() => {
            console.log(`✅ [MESTRE] Atributo BASE ${atributo.toUpperCase()} de ${nomePlayer} alterado para ${val}.`);
            
            // Força o Token a atualizar a Vida máxima base na mesma hora
            if (atributo === 'con') {
                window.mapaRef.child('tokens').orderByChild('dono').equalTo(nomePlayer).once('value', snapT => {
                    snapT.forEach(child => {
                        // Manda a nova vida base 1:1 (o engine-tokens fará o vezes na tela depois)
                        child.ref.update({ 
                            hpMax: val,
                            // hpAtual: val // Descomente para curar o jogador ao aumentar a CON
                        });
                    });
                });
            }
        })
        .catch(err => console.error("❌ Erro ao editar pelo painel:", err));
};

window.focarNoPlayer = function(nome) {
    window.mapaRef.child('tokens').orderByChild('dono').equalTo(nome).once('value', snap => {
        if (snap.exists()) {
            snap.forEach(c => {
                const p = c.val();
                if (window.camera) {
                    window.camera.posX = -(p.x - (window.innerWidth / 2));
                    window.camera.posY = -(p.y - (window.innerHeight / 2));
                }
            });
        }
    });
};

document.addEventListener('DOMContentLoaded', window.initLibraryTabs);