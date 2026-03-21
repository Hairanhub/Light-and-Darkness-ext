/* ============================================================
   === [ CRIADOR E GESTOR DA BIBLIOTECA - V6.4 ] ===
   === FIX: Memória de Ordem + ESTÚDIO DE TOKEN ===
   ============================================================ */

// Variável global temporária para não perder a ordem durante a edição
window.ordemTemporariaEdicao = null;

// --- ESTÚDIO DE TOKEN: PREVIEW E CONTROLES ---
document.addEventListener('DOMContentLoaded', () => {
    const inputUrl = document.getElementById('reg-url');
    if (inputUrl) {
        inputUrl.addEventListener('input', (e) => {
            const url = e.target.value;
            const studio = document.getElementById('token-studio-container');
            const img = document.getElementById('preview-token-img');
            if (url && studio && img) {
                studio.style.display = 'block';
                img.src = url;
                window.resetarPreviewToken(); // Reseta os sliders para a arte nova
            } else if (studio) {
                studio.style.display = 'none';
            }
        });
    }
});

window.atualizarPreviewToken = function() {
    const img = document.getElementById('preview-token-img');
    if (!img) return;
    const z = document.getElementById('token-zoom')?.value || 1;
    const x = document.getElementById('token-x')?.value || 0;
    const y = document.getElementById('token-y')?.value || 0;
    const r = document.getElementById('token-rot')?.value || 0;
    
    // 🔥 A NOVA MÁGICA: O calc(-50%) mantém a imagem centralizada, mas solta para arrastar!
    img.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${z}) rotate(${r}deg)`;
};

window.resetarPreviewToken = function() {
    if(document.getElementById('token-zoom')) document.getElementById('token-zoom').value = 1;
    if(document.getElementById('token-x')) document.getElementById('token-x').value = 0;
    if(document.getElementById('token-y')) document.getElementById('token-y').value = 0;
    if(document.getElementById('token-rot')) document.getElementById('token-rot').value = 0;
    window.atualizarPreviewToken();
};


// --- 1. FUNÇÕES DE UTILIDADE (DELETAR E CANCELAR) ---

window.deletarRegistro = function(tipo, id) {
    if (confirm("⚠️ Tem certeza que deseja excluir permanentemente?")) {
        window.database.ref(tipo).child(id).remove()
            .then(() => console.log(`${id} removido de ${tipo}`))
            .catch(err => alert("Erro ao deletar: " + err.message));
    }
};

window.cancelarEdicao = function() {
    const form = document.getElementById('main-creation-form');
    if (form) form.reset();
    
    document.getElementById('reg-id').value = "";
    document.getElementById('btn-save-main').innerHTML = "⚔️ Registrar na Biblioteca";
    document.getElementById('btn-cancel-edit').style.display = "none";
    
    const studio = document.getElementById('token-studio-container');
    if (studio) studio.style.display = 'none';

    window.ordemTemporariaEdicao = null; // Limpa a memória da ordem
    document.getElementById('create-type-selector').value = "monstros";
    
    // 🔥 BARREIRA 1: Zera os sliders de edição
    if (window.resetarPreviewToken) window.resetarPreviewToken(); 

    window.toggleCreateFields();
};

// --- 2. GERENCIADOR DE CAMPOS VISÍVEIS ---

window.toggleCreateFields = function() {
    const selector = document.getElementById('create-type-selector');
    if (!selector) return;

    const tipo = selector.value;
    document.querySelectorAll('.extra-fields').forEach(el => el.style.display = 'none');

    const target = document.getElementById(`fields-${tipo}`);
    if (target) {
        target.style.display = 'block';
        if (tipo === 'magias' && window.spellEditor) {
            setTimeout(() => {
                window.spellEditor.init();
                if(window.toggleAlcanceMagia) window.toggleAlcanceMagia();
            }, 10);
        }
    }

    if (tipo === 'itens') {
        const subTipoItem = document.getElementById('reg-item-tipo').value;
        const subGruposItens = ['grupo-armadura', 'grupo-arma', 'grupo-pocao', 'grupo-runa', 'grupo-passiva'];
        subGruposItens.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.display = 'none';
        });

        if (subTipoItem === 'armadura') document.getElementById('grupo-armadura').style.display = 'block';
        else if (subTipoItem === 'arma') document.getElementById('grupo-arma').style.display = 'block';
        else if (subTipoItem === 'pocao') document.getElementById('grupo-pocao').style.display = 'block';
        else if (subTipoItem === 'runa') document.getElementById('grupo-runa').style.display = 'block';
        else if (subTipoItem === 'passiva') {
            document.getElementById('grupo-passiva').style.display = 'block';
            window.togglePassivaFields();
        }
    }
};

window.togglePassivaFields = function() {
    const catPassiva = document.getElementById('reg-passiva-categoria')?.value;
    if (!catPassiva) return;
    document.getElementById('sub-passiva-elemental').style.display = 'none';
    document.getElementById('sub-passiva-lendario').style.display = 'none';
    document.getElementById('sub-passiva-divergente').style.display = 'none';

    if (catPassiva === 'elemental') document.getElementById('sub-passiva-elemental').style.display = 'block';
    else if (catPassiva === 'lendario') document.getElementById('sub-passiva-lendario').style.display = 'block';
    else if (catPassiva === 'divergente') document.getElementById('sub-passiva-divergente').style.display = 'block';
};

window.toggleAlcanceMagia = function() {
    const proj = document.getElementById('reg-magia-projecao').value;
    const campo = document.getElementById('campo-alcance-magia');
    if(campo) campo.style.display = (proj === 'solta') ? 'block' : 'none';
};

// --- 3. PREPARAR EDIÇÃO (PREENCHE O FORMULÁRIO) ---

window.prepararEdicao = function(tipo, id) {
    window.database.ref(tipo).child(id).once('value').then(snap => {
        const d = snap.val();
        if (!d) return;

        document.getElementById('reg-id').value = id;
        document.getElementById('create-type-selector').value = tipo;
        document.getElementById('reg-nome').value = d.nome || "";
        document.getElementById('reg-url').value = d.url || "";
        
        // 🔥 CARREGA O ESTÚDIO DE TOKEN SE EXISTIR 🔥
        const tv = d.tokenVisuais || { zoom: 1, x: 0, y: 0, rot: 0 };
        if (document.getElementById('token-zoom')) document.getElementById('token-zoom').value = tv.zoom;
        if (document.getElementById('token-x')) document.getElementById('token-x').value = tv.x;
        if (document.getElementById('token-y')) document.getElementById('token-y').value = tv.y;
        if (document.getElementById('token-rot')) document.getElementById('token-rot').value = tv.rot;
        
        const studio = document.getElementById('token-studio-container');
        const img = document.getElementById('preview-token-img');
        if (d.url && studio && img) {
            studio.style.display = 'block';
            img.src = d.url;
            window.atualizarPreviewToken();
        } else if (studio) {
            studio.style.display = 'none';
        }

        // 🔥 MEMÓRIA DE ORDEM: Salva a ordem atual para não perder no save
        window.ordemTemporariaEdicao = d.ordem || null;

        if (d.atributos_lista) {
            document.getElementById('reg-atributos').value = d.atributos_lista;
        } else if (d.atributos) {
            const a = d.atributos;
            document.getElementById('reg-atributos').value = `${a.for} / ${a.dex} / ${a.int} / ${a.def} / ${a.car} / ${a.con}`;
        }

        if (tipo === 'magias') {
            document.getElementById('reg-magia-dano').value = d.categoriaDano || "magico";
            document.getElementById('reg-magia-tipo').value = d.tipoMagia || "melee";
            document.getElementById('reg-magia-custo').value = d.custo || "";
            document.getElementById('reg-magia-desc').value = d.descricao || "";
            if(document.getElementById('reg-magia-projecao')) document.getElementById('reg-magia-projecao').value = d.modoProjecao || "presa";
            if(document.getElementById('reg-magia-alcance')) document.getElementById('reg-magia-alcance').value = d.alcanceMaximo || 5;
            if(document.getElementById('reg-magia-status-tipo')) document.getElementById('reg-magia-status-tipo').value = d.statusTipo || "";
            if(document.getElementById('reg-magia-status-valor')) document.getElementById('reg-magia-status-valor').value = d.statusValor || 0;
            window.spellEditor.init(); 
            if (d.matrizArea) window.spellEditor.carregarMatriz(d.matrizArea);
            window.toggleAlcanceMagia();
        }

        if (tipo === 'monstros') {
            document.getElementById('reg-monstro-rank').value = d.rank || "F";
            document.getElementById('reg-monstro-elemento').value = d.elemento || "fogo";
            if(document.getElementById('reg-monstro-tipo-dano')) {
                document.getElementById('reg-monstro-tipo-dano').value = d.tipoDano || "fisico";
            }
        } else if (tipo === 'npcs') {
            document.getElementById('reg-npc-sub').value = d.subtitulo || "";
        } else if (tipo === 'itens') {
            document.getElementById('reg-item-tipo').value = d.tipoItem || "arma";
            document.getElementById('reg-item-raridade').value = d.raridade || "comum";
            
            if (d.tipoItem === 'arma') {
                document.getElementById('reg-arma-texto').value = d.tipoEspecifico || "";
                document.getElementById('reg-arma-maos').value = d.maos || "1";
                document.getElementById('reg-arma-dano').value = d.categoriaDano || "fisico";
            } else if (d.tipoItem === 'armadura') {
                document.getElementById('reg-armadura-peso').value = d.pesoCorpo || "leve";
            } else if (d.tipoItem === 'pocao') {
                document.getElementById('reg-pocao-cura').value = d.valorCura || 0;
            } else if (d.tipoItem === 'runa') {
                document.getElementById('reg-runa-rank').value = d.rankRuna || "F";
            } else if (d.tipoItem === 'passiva') {
                document.getElementById('reg-passiva-categoria').value = d.categoriaPassiva || "elemental";
                document.getElementById('reg-passiva-elemento').value = d.elementoPassiva || "fogo";
                document.getElementById('reg-passiva-bloqueio').value = d.bloqueioSlot || "nenhum";
                document.getElementById('reg-passiva-efeito').value = d.efeitoLendario || "forca";
            }
        }
        
        window.toggleCreateFields();
        const abaCriar = document.querySelector('[data-tab="criar"]');
        if (abaCriar) abaCriar.click();
        
        document.getElementById('btn-save-main').innerHTML = "💾 Salvar Alterações";
        document.getElementById('btn-cancel-edit').style.display = "block";
    });
};

// --- 4. SALVAR NO FIREBASE ---

window.saveToFirebase = async function() {
    const tipoAba = document.getElementById('create-type-selector').value;
    const idExistente = document.getElementById('reg-id').value;
    const nome = document.getElementById('reg-nome').value;
    const url = document.getElementById('reg-url').value;
    const atributosRaw = document.getElementById('reg-atributos').value;

    if (!nome || !url) return alert("Preencha Nome e URL da Imagem!");

    let valores = atributosRaw.split('/').map(v => {
        let n = parseInt(v.trim());
        return isNaN(n) ? 0 : n;
    });
    while(valores.length < 6) valores.push(0);

    const dados = {
        nome: nome,
        url: url,
        tipo: tipoAba.replace('s', ''),
        atributos_lista: valores.join(' / '),
        atributos: {
            for: valores[0], dex: valores[1], int: valores[2],
            def: valores[3], car: valores[4], con: valores[5]
        },
        timestamp: Date.now(),
        hpAtual: valores[5],
        // 🔥 ESTÚDIO DE TOKEN SALVO AQUI 🔥
        tokenVisuais: {
            zoom: parseFloat(document.getElementById('token-zoom')?.value) || 1,
            x: parseInt(document.getElementById('token-x')?.value) || 0,
            y: parseInt(document.getElementById('token-y')?.value) || 0,
            rot: parseInt(document.getElementById('token-rot')?.value) || 0
        }
    };

    // 🔥 LÓGICA DE ORDENAÇÃO NO SAVE:
    if (idExistente && window.ordemTemporariaEdicao !== null) {
        dados.ordem = window.ordemTemporariaEdicao;
    } else {
        // Se for NOVO, busca a maior ordem atual para colocar no fim
        const snap = await window.database.ref(tipoAba).once('value');
        const lista = snap.val();
        let maiorOrdem = 0;
        if (lista) {
            Object.values(lista).forEach(i => {
                if (i.ordem > maiorOrdem) maiorOrdem = i.ordem;
            });
        }
        dados.ordem = maiorOrdem + 10;
    }

    // (Preenchimento dos campos específicos continua igual...)
    if (tipoAba === 'monstros') {
        dados.rank = document.getElementById('reg-monstro-rank')?.value || "F";
        dados.elemento = document.getElementById('reg-monstro-elemento')?.value || "fogo";
        dados.tipoDano = document.getElementById('reg-monstro-tipo-dano')?.value || "fisico";
    } else if (tipoAba === 'npcs') {
        dados.subtitulo = document.getElementById('reg-npc-sub')?.value || "";
    } else if (tipoAba === 'magias') {
        dados.categoriaDano = document.getElementById('reg-magia-dano')?.value || "magico";
        dados.tipoMagia = document.getElementById('reg-magia-tipo')?.value || "melee";
        dados.custo = document.getElementById('reg-magia-custo')?.value || "0";
        dados.descricao = document.getElementById('reg-magia-desc')?.value || "";
        dados.modoProjecao = document.getElementById('reg-magia-projecao')?.value || "presa";
        dados.alcanceMaximo = parseInt(document.getElementById('reg-magia-alcance')?.value) || 0;
        dados.statusTipo = document.getElementById('reg-magia-status-tipo')?.value || "";
        dados.statusValor = document.getElementById('reg-magia-status-valor')?.value || 0;
        dados.matrizArea = document.getElementById('reg-magia-matriz')?.value || "";
    } else if (tipoAba === 'itens') {
        dados.tipoItem = document.getElementById('reg-item-tipo')?.value || "item";
        dados.raridade = document.getElementById('reg-item-raridade')?.value || "comum";
        if (dados.tipoItem === 'arma') {
            dados.tipoEspecifico = document.getElementById('reg-arma-texto')?.value || "";
            dados.maos = document.getElementById('reg-arma-maos')?.value || "1";
            dados.categoriaDano = document.getElementById('reg-arma-dano')?.value || "fisico";
        } else if (dados.tipoItem === 'armadura') {
            dados.pesoCorpo = document.getElementById('reg-armadura-peso')?.value || "leve";
        } else if (dados.tipoItem === 'pocao') {
            dados.valorCura = parseInt(document.getElementById('reg-pocao-cura')?.value) || 0;
        } else if (dados.tipoItem === 'runa') {
            dados.rankRuna = document.getElementById('reg-runa-rank')?.value || "F";
        } else if (dados.tipoItem === 'passiva') {
            dados.categoriaPassiva = document.getElementById('reg-passiva-categoria')?.value || "elemental";
            if (dados.categoriaPassiva === 'elemental') {
                dados.elementoPassiva = document.getElementById('reg-passiva-elemento')?.value || "fogo";
            } else if (dados.categoriaPassiva === 'lendario') {
                dados.bloqueioSlot = document.getElementById('reg-passiva-bloqueio')?.value || "nenhum";
                dados.efeitoLendario = document.getElementById('reg-passiva-efeito')?.value || "forca";
            }
        }
    }

    let ref = idExistente ? window.database.ref(tipoAba).child(idExistente) : window.database.ref(tipoAba).push();

    ref.set(dados).then(() => {
        alert(idExistente ? "✅ Alterações salvas!" : "✅ " + nome + " criado com sucesso!");
        window.cancelarEdicao(); 
    }).catch(err => {
        console.error("Erro ao salvar no Firebase:", err);
        alert("Erro ao salvar: " + err.message);
    });
};

// --- 5. BUSCA E INICIALIZAÇÃO ---

window.filtrarBibliotecaUniversal = function() {
    const termo = document.getElementById('global-search').value.toLowerCase();
    const cards = document.querySelectorAll('.entity-card, .item-card, .npc-card, .magia-card');
    cards.forEach(card => {
        const conteudo = card.innerText.toLowerCase();
        card.style.display = conteudo.includes(termo) ? "" : "none";
    });
};

window.revelarNoCodice = function(categoria, id, estadoAtual) {
    const novoEstado = !estadoAtual;
    window.database.ref(`${categoria}/${id}`).update({ descoberto: novoEstado })
        .then(() => console.log(`Registro ${id} agora está ${novoEstado ? 'Visível' : 'Oculto'} para os jogadores.`));
};

document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('create-type-selector')) window.toggleCreateFields();
});

/* ============================================================
   === [ GESTÃO DE JOGADORES - LEVEL, ECONOMIA E TRIBUNAL ] ===
   ============================================================ */

window.initGestaoJogadores = function() {
    if (!window.database) {
        setTimeout(window.initGestaoJogadores, 500);
        return;
    }

    // Fica de olho na pasta "usuarios" do Firebase
    window.database.ref('usuarios').on('value', snap => {
        const painel = document.getElementById('lista-jogadores-gestao');
        if (!painel) return;
        
        const usuarios = snap.val();
        painel.innerHTML = ""; // Limpa a lista para atualizar

        if (!usuarios) {
            painel.innerHTML = "<p style='color:#aaa; text-align: center;'>Nenhum jogador encontrado no banco de dados.</p>";
            return;
        }

        // Transforma os usuários em cards
        Object.entries(usuarios).forEach(([idFirebase, dados]) => {
            // Proteção: O mestre não pode deletar a si mesmo por acidente
            if (idFirebase.toLowerCase() === 'mestre' || idFirebase.toLowerCase() === 'admin') return; 

            const nomeExibicao = dados.nomeExibicao || idFirebase;
            
            // Puxa o nível e o dinheiro atuais
            const nivelAtual = parseInt(dados.nivel) || 1;
            const cobreAtual = parseInt(dados.cobre) || 0;

            // Converte o Cobre para visualização do Mestre
            let g = Math.floor(cobreAtual / 1000);
            let s = Math.floor((cobreAtual % 1000) / 100);
            let b = Math.floor((cobreAtual % 100) / 10);
            let c = cobreAtual % 10;
            
            const card = document.createElement('div');
            card.style = "background: #2c1e1a; border: 1px solid #5d4037; padding: 12px; border-radius: 6px; display: flex; flex-direction: column; gap: 10px; transition: 0.2s; margin-bottom: 8px;";
            
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #442a22; padding-bottom: 8px;">
                    <span style="color: #f3e520; font-weight: bold; font-size: 16px;">${nomeExibicao.toUpperCase()}</span>
                    
                    <div style="display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.5); padding: 3px 8px; border-radius: 20px; border: 1px solid #664930;">
                        <span style="color: #ccc; font-size: 11px; font-weight: bold;">NÍVEL</span>
                        <button onclick="alterarNivel('${idFirebase}', ${nivelAtual}, -1)" style="background: #e74c3c; border: none; color: white; width: 22px; height: 22px; border-radius: 50%; cursor: pointer; font-weight: bold;">-</button>
                        <span style="color: #fff; font-size: 16px; font-weight: bold; min-width: 18px; text-align: center;">${nivelAtual}</span>
                        <button onclick="alterarNivel('${idFirebase}', ${nivelAtual}, 1)" style="background: #2ecc71; border: none; color: white; width: 22px; height: 22px; border-radius: 50%; cursor: pointer; font-weight: bold;">+</button>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 5px; background: #000; padding: 5px 10px; border-radius: 4px; border: 1px solid #444; flex: 1;">
                        <span style="color: #ffd700; font-weight: bold; font-size: 13px;">${g}g</span>
                        <span style="color: #c0c0c0; font-weight: bold; font-size: 13px;">${s}s</span>
                        <span style="color: #cd7f32; font-weight: bold; font-size: 13px;">${b}b</span>
                        <span style="color: #b87333; font-weight: bold; font-size: 13px;">${c}c</span>
                        <button onclick="alterarDinheiro('${idFirebase}', ${cobreAtual}, '${nomeExibicao}')" style="margin-left: auto; background: #d4af37; color: #000; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px; font-weight: bold;"><i class="fa-solid fa-coins"></i> GERIR</button>
                    </div>

                    <button onclick="deletarJogador('${idFirebase}')" title="Apagar Personagem" style="background: transparent; color: #ff4d4d; border: 1px solid #ff4d4d; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-left: 10px;">
                        <i class="fa-solid fa-skull"></i>
                    </button>
                </div>
            `;
            painel.appendChild(card);
        });
    });
};

// --- FUNÇÃO DE LEVEL (COM BÔNUS DE INTELIGÊNCIA) ---
window.alterarNivel = function(idFirebase, nivelAtual, delta) {
    const novoNivel = Math.max(1, nivelAtual + delta); 
    
    // 1. Salva o nível na ficha do jogador
    window.database.ref(`usuarios/${idFirebase}`).update({ nivel: novoNivel });

    // 2. Busca a Inteligência (INT) atual do jogador para calcular a Mana
    window.database.ref(`usuarios/${idFirebase}`).once('value', snapUser => {
        const dadosJogador = snapUser.val() || {};
        
        // Pega a INT total (seja da base ou dos equipamentos)
        const equipado = dadosJogador.status_equipado || {};
        const atributosBase = dadosJogador.atributos || {};
        const totais = equipado.totais || atributosBase;
        const intTotal = parseInt(totais.int) || 0;

        // MATEMÁTICA: 10 + (3 por nível) + (1 para cada 3 de INT)
        const novaManaMax = 10 + ((novoNivel - 1) * 3) + Math.floor(intTotal / 3);

        // 3. O Mestre avisa o Mapa IMEDIATAMENTE
        if (window.mapaRef) {
            window.mapaRef.child('tokens').once('value', snapTokens => {
                snapTokens.forEach(child => {
                    const t = child.val();
                    if (t.dono && t.dono.toLowerCase() === idFirebase.toLowerCase()) {
                        child.ref.update({
                            manaMax: novaManaMax,
                            manaAtual: novaManaMax // Enche a mana pro jogador ver!
                        });
                        console.log(`✅ FIREBASE AVISADO: Nivel ${novoNivel} | INT ${intTotal} | Mana ${novaManaMax}`);
                    }
                });
            });
        }
    });
};

// --- FUNÇÃO DE ECONOMIA INTELIGENTE ---
window.alterarDinheiro = function(idFirebase, cobreAtual, nomeDono) {
    const comando = prompt(`💰 GERIR FUNDOS DE ${nomeDono.toUpperCase()}\n\nDigite o valor. Você pode usar letras (g, s, b, c) ou apenas números.\nExemplos:\n  124 (Dá 124 cobres = 1s 2b 4c)\n  -50 (Tira 50 cobres)\n  2g (Dá 2 moedas de ouro)`);
    
    if (!comando) return;

    // Regex atualizada: agora a letra ([gsbc]) tem um "?" no final, o que a torna opcional!
    const match = comando.toLowerCase().trim().match(/^(-?\d+)\s*([gsbc])?$/);
    
    if (!match) {
        alert("❌ Comando inválido! Digite apenas números (ex: 124) ou o número com a letra (ex: 2g, -5s).");
        return;
    }

    const valor = parseInt(match[1]);
    const tipo = match[2] || 'c'; // Se a pessoa não digitar a letra, o sistema assume 'c' (cobre)
    let valorEmCobre = 0;

    if (tipo === 'g') valorEmCobre = valor * 1000;
    if (tipo === 's') valorEmCobre = valor * 100;
    if (tipo === 'b') valorEmCobre = valor * 10;
    if (tipo === 'c') valorEmCobre = valor;

    let novoCobre = cobreAtual + valorEmCobre;
    if (novoCobre < 0) novoCobre = 0; // Evita que a carteira fique devendo

    window.database.ref(`usuarios/${idFirebase}`).update({ cobre: novoCobre })
        .then(() => console.log(`🪙 Transação concluída para ${idFirebase}.`))
        .catch(err => alert("Erro na transação: " + err.message));
};

// A Função da Guilhotina
window.deletarJogador = function(idFirebase) {
    if (confirm(`⚠️ TRIBUNAL INQUISIDOR: Tem certeza que deseja apagar a existência de "${idFirebase}"? Esta ação não tem volta.`)) {
        window.database.ref(`usuarios/${idFirebase}`).remove()
            .then(() => console.log(`💀 A alma de ${idFirebase} foi ceifada.`))
            .catch(err => alert("Erro ao apagar jogador: " + err.message));
    }
};

// Dá a partida no motor assim que a página carregar
document.addEventListener('DOMContentLoaded', () => {
    window.initGestaoJogadores();
});