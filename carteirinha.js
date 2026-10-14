import { api } from "../api.js";
import { PLANOS, esc } from "../util.js";

export default async function (root, { sessao }) {
  const p = await api.get(`/pacientes/${sessao.id}`);
  const num = ("0000" + p.cpf.slice(-9)).replace(/(\d{4})(\d{4})(\d{5})/, "$1 $2 $3");
  root.innerHTML = `<p class="intro-text left">Minha Carteirinha</p>
    <div class="cart" role="img" aria-label="Carteirinha de ${esc(p.nome)}, ${esc((PLANOS[p.plano] || {}).nome || "sem plano")}">
      <div class="cart-top"><b>CaisMed</b><span>${esc((PLANOS[p.plano] || {}).nome || "Sem Plano")}</span></div>
      <div class="cart-num">${num}</div><div class="cart-nome">${esc(p.nome)}</div></div>
    <p class="aviso">Apresente este cartão na recepção da clínica.</p>`;
}
