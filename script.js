let atributoSelecionado = 0;
let nomeAtributoAtual = "FOR";

function abrirDados(valorAtributo, tipoAtributo) {
  atributoSelecionado = valorAtributo;
  nomeAtributoAtual = tipoAtributo;
  document.getElementById("atributoSelecionado").innerText = valorAtributo;
  document.getElementById("nomeAtributo").innerText = tipoAtributo;
  document.getElementById("mod").value = 0; 
  document.getElementById("usarAtributo").checked = true; 
  document.getElementById("resultado").innerText = "";

  const janela = document.getElementById("janelaDados");
  janela.className = 'container ' + tipoAtributo;

  document.getElementById("modalDados").style.display = "flex";
}

function fecharDados() {
  document.getElementById("modalDados").style.display = "none";
}

document.getElementById("rolar").onclick = () => {
  const qtd = Number(document.getElementById("qtd").value);
  const faces = Number(document.getElementById("faces").value);
  const mod = Number(document.getElementById("mod").value);
  const usarAtr = document.getElementById("usarAtributo").checked;

  let total = 0;
  let rolls = [];

  for (let i = 0; i < qtd; i++) {
    const r = Math.floor(Math.random() * faces) + 1;
    rolls.push(r);
    total += r;
  }

  const totalFinal = total + (usarAtr ? atributoSelecionado : 0) + mod;

  document.getElementById("resultado").innerText =
    `${qtd}d${faces} + ATR: ${usarAtr ? atributoSelecionado : 0} + MOD: ${mod} → Total: ${totalFinal}`;
};
