// Fatura do plano (demonstração: o histórico fica salvo no navegador).
import { api } from "../api.js";
import { toast, vazio, esc } from "../ui.js";
import { PLANOS, brl } from "../util.js";

export default async function (root, { sessao }) {
  const p = await api.get(`/pacientes/${sessao.id}`);
  const pl = PLANOS[p.plano];
  const chave = `caismed.pagamentos.${sessao.id}`;
  const hist = () => JSON.parse(localStorage.getItem(chave) || "[]");
  const mes = new Date().toISOString().slice(0, 7);
  const venc = new Date(); venc.setDate(venc.getDate() + 7);
  const pago = () => hist().some((h) => h.mes === mes);

  root.innerHTML = `<p class="intro-text left">Pagamentos</p><div class="summary-box" id="fatura"></div>
    <div class="field" style="margin-top:16px"><label for="metodo">Forma de pagamento</label><select id="metodo"><option>Pix</option><option>Cartão de Crédito</option><option>Boleto</option></select></div>
    <div class="pix-box" id="pix"><svg viewBox="0 0 21 21" width="160" height="160" role="img" aria-label="QR Code Pix ilustrativo">${qr()}</svg><p class="aviso">QR Code ilustrativo. A cobrança real virá do back-end.</p><code>00020126CAISMED-PIX-SIMULADO</code></div>
    <button type="button" class="btn" id="pagar">Pagar Fatura</button>
    <p class="intro-text left" style="margin-top:24px;font-size:18px">Histórico de Pagamentos</p><div class="list-grid" id="hist"></div>`;
  const $ = (id) => root.querySelector("#" + id);

  function desenhar() {
    $("fatura").innerHTML = pl ? `<div class="summary-row"><span class="label">Plano</span><span class="value">${pl.nome}</span></div>
      <div class="summary-row"><span class="label">Valor</span><span class="value">${brl(pl.valor)}</span></div>
      <div class="summary-row"><span class="label">Vencimento</span><span class="value">${venc.toLocaleDateString("pt-BR")}</span></div>
      <div class="summary-row"><span class="label">Status</span><span class="consulta-status ${pago() ? "realizada" : "pendente"}">${pago() ? "Pago" : "Pendente"}</span></div>` : vazio("Você ainda não tem um plano. Escolha um em Perfil.");
    $("hist").innerHTML = hist().length ? hist().map((h) => `<div class="consulta-card"><div class="consulta-top"><span class="consulta-especialidade">${esc(h.plano)}</span><span class="consulta-status realizada">Pago</span></div><div class="consulta-data">${esc(h.data)} · ${esc(h.valor)} · ${esc(h.metodo)}</div></div>`).join("") : vazio("Nenhum pagamento realizado.");
  }
  const atualizarPix = () => { $("pix").style.display = $("metodo").value === "Pix" ? "block" : "none"; };
  $("metodo").onchange = atualizarPix; atualizarPix(); desenhar();
  $("pagar").onclick = () => {
    if (!pl) return toast("Nenhum plano contratado.", "erro");
    if (pago()) return toast("A fatura deste mês já está paga.");
    localStorage.setItem(chave, JSON.stringify([...hist(), { mes, plano: pl.nome, valor: brl(pl.valor), metodo: $("metodo").value, data: new Date().toLocaleDateString("pt-BR") }]));
    toast("Pagamento confirmado! Obrigado."); desenhar();
  };
}

function qr() {
  let x = 7, r = "";
  const canto = (i, j) => (i < 7 && j < 7) || (i < 7 && j > 13) || (i > 13 && j < 7);
  const marca = (a, b) => a === 0 || a === 6 || b === 0 || b === 6 || (a >= 2 && a <= 4 && b >= 2 && b <= 4);
  for (let i = 0; i < 21; i++) for (let j = 0; j < 21; j++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    if (canto(i, j) ? marca(i % 14 % 7 === i ? i : i - 14, j % 14 % 7 === j ? j : j - 14) : x % 3 === 0) r += `<rect x="${j}" y="${i}" width="1" height="1"/>`;
  }
  return r;
}
