// Componentes reutilizáveis de interface (sem dependências).
import { esc, dataBR } from "./util.js";
export { esc };

export const LOGO_SVG = `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M38 14 h24 a6 6 0 0 1 6 6 v14 h14 a6 6 0 0 1 6 6 v10 a6 6 0 0 1 -6 6 H68 v14 a6 6 0 0 1 -6 6 H38 a6 6 0 0 1 -6 -6 V56 H18 a6 6 0 0 1 -6 -6 V40 a6 6 0 0 1 6 -6 h14 V20 a6 6 0 0 1 6 -6 Z" stroke="currentColor" stroke-width="4.5" stroke-linejoin="round" fill="none"/><path class="heart" d="M58 30 c3.5-4 10-4 12.5 0.5 c2.5 4.5 -1 9 -12.5 17 c-11.5-8-15-12.5-12.5-17 c2.5-4.5 9-4.5 12.5-0.5Z"/></svg>`;
export const BACK_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>`;
export const SEND_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
export const ico = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
export const ICONES = {
  inicio: "M3 11l9-8 9 8v10H3z", consultas: "M3 5h18v16H3zM3 10h18M8 3v4M16 3v4", buscar: "M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-4.5-4.5",
  perfil: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c1.5-4 5-6 8-6s6.5 2 8 6", horarios: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2",
  agenda: "M4 4h16v16H4zM8 9h8M8 13h8M8 17h5",
};

// ---------- Mensagens ----------
export function toast(msg, tipo = "ok") {
  const wrap = document.getElementById("toasts");
  wrap.innerHTML = "";
  const el = document.createElement("div");
  el.className = `toast ${tipo}`;
  el.setAttribute("role", tipo === "erro" ? "alert" : "status");
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}
export const carregando = (el, txt = "Carregando...") => { el.innerHTML = `<p class="loading" role="status"><span class="spin" aria-hidden="true"></span>${esc(txt)}</p>`; };
export const erroBox = (e) => `<div class="erro-box" role="alert">${esc(e.message || "Algo deu errado.")}</div>`;
export const vazio = (txt) => `<p class="empty-state">${esc(txt)}</p>`;

// ---------- Diálogo acessível (usa <dialog>) ----------
export function abrirDialogo(titulo, conteudo) {
  const d = document.createElement("dialog");
  d.className = "dialogo";
  d.setAttribute("aria-labelledby", "dlg-titulo");
  d.innerHTML = `<div class="dlg-top"><h2 id="dlg-titulo">${esc(titulo)}</h2><button type="button" class="a11y-close" data-fechar aria-label="Fechar">✕</button></div><div class="dlg-corpo"></div>`;
  const corpo = d.querySelector(".dlg-corpo");
  if (typeof conteudo === "string") corpo.innerHTML = conteudo; else corpo.appendChild(conteudo);
  document.body.appendChild(d);
  const fechar = () => { d.close(); d.remove(); };
  d.addEventListener("click", (e) => { if (e.target === d || e.target.closest("[data-fechar]")) fechar(); });
  d.addEventListener("cancel", (e) => { e.preventDefault(); fechar(); });
  d.showModal();
  return { el: d, corpo, fechar };
}
export function confirmar(msg, { ok = "Confirmar", perigo = false } = {}) {
  return new Promise((resolve) => {
    const dlg = abrirDialogo("Confirmação", `<p>${esc(msg)}</p><div class="dlg-acoes"><button type="button" class="btn btn-outline" data-nao>Voltar</button><button type="button" class="btn ${perigo ? "btn-danger" : ""}" data-sim>${esc(ok)}</button></div>`);
    let resp = false;
    dlg.el.addEventListener("close", () => resolve(resp));
    dlg.el.querySelector("[data-nao]").onclick = () => dlg.fechar();
    dlg.el.querySelector("[data-sim]").onclick = () => { resp = true; dlg.fechar(); };
    dlg.el.querySelector("[data-nao]").focus();
  });
}

// ---------- Formulários ----------
export function opcoesHTML(lista, valor, vazioTxt) {
  return (vazioTxt ? `<option value="" ${valor ? "" : "selected"} disabled>${esc(vazioTxt)}</option>` : "") +
    lista.map((o) => `<option value="${esc(o.id ?? o.value)}" ${String(o.id ?? o.value) === String(valor) ? "selected" : ""}>${esc(o.nome ?? o.label)}</option>`).join("");
}
export function campo({ id, label, tipo = "text", valor = "", required = true, opcoes = null, vazioTxt = "Selecione", ajuda = "", extra = "" }) {
  const req = required ? "required" : "";
  let ctrl;
  if (opcoes) ctrl = `<select id="${id}" name="${id}" ${req} ${extra}>${opcoesHTML(opcoes, valor, vazioTxt)}</select>`;
  else ctrl = `<input id="${id}" name="${id}" type="${tipo}" value="${esc(valor)}" ${req} ${extra} ${ajuda ? `aria-describedby="${id}-aj"` : ""} />`;
  return `<div class="field"><label for="${id}">${esc(label)}${required ? "" : " <small>(opcional)</small>"}</label>${ctrl}${ajuda ? `<small id="${id}-aj" class="hint">${esc(ajuda)}</small>` : ""}</div>`;
}
export function grupoCheck({ nome, label, opcoes, marcados = [] }) {
  return `<fieldset class="field check-grid"><legend>${esc(label)}</legend>${opcoes.map((o) => `<label class="check"><input type="checkbox" name="${nome}" value="${esc(o.id)}" ${marcados.includes(o.id) ? "checked" : ""}/> ${esc(o.nome)}</label>`).join("")}</fieldset>`;
}
export const valores = (form) => Object.fromEntries(new FormData(form).entries());

// ---------- Abas acessíveis ----------
export function abas(container) {
  const botoes = [...container.querySelectorAll('[role="tab"]')];
  const ativar = (btn, foco) => {
    botoes.forEach((b) => { const on = b === btn; b.classList.toggle("active", on); b.setAttribute("aria-selected", on); b.tabIndex = on ? 0 : -1; document.getElementById(b.getAttribute("aria-controls")).classList.toggle("active", on); });
    if (foco) btn.focus();
    btn.dispatchEvent(new CustomEvent("aba", { bubbles: true }));
  };
  botoes.forEach((b, i) => {
    b.addEventListener("click", () => ativar(b));
    b.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") ativar(botoes[(i + 1) % botoes.length], true);
      if (e.key === "ArrowLeft") ativar(botoes[(i - 1 + botoes.length) % botoes.length], true);
    });
  });
  return ativar;
}
export const abasHTML = (id, lista, ativa = 0) => `<div class="tabs" id="${id}" role="tablist">${lista.map(([k, t], i) => `<button type="button" role="tab" id="tab-${k}" class="tab-btn ${i === ativa ? "active" : ""}" aria-selected="${i === ativa}" aria-controls="${k}" tabindex="${i === ativa ? 0 : -1}">${esc(t)}</button>`).join("")}</div>` +
  lista.map(([k], i) => `<div class="tab-panel list-grid ${i === ativa ? "active" : ""}" id="${k}" role="tabpanel" aria-labelledby="tab-${k}"></div>`).join("");

// ---------- Cartão de consulta ----------
const STATUS = { agendado: "agendada", concluido: "realizada", cancelado: "cancelada" };
export const badgeStatus = (s) => `<span class="consulta-status ${s === "cancelado" ? "cancelado" : s === "concluido" ? "realizada" : ""}">${STATUS[s] || s}</span>`;
export function cardConsulta(a, { paciente = false, acoes = "" } = {}) {
  return `<article class="consulta-card" data-id="${a.id}">
    <div class="consulta-top"><span class="consulta-especialidade">${esc(a.especialidadeNome)}</span>${badgeStatus(a.status)}</div>
    <div class="consulta-data">${dataBR(a.data)} às ${esc(a.horario)}</div>
    <div class="consulta-data">${paciente ? "Paciente: " + esc(a.pacienteNome) : esc(a.profissionalNome)} · ${esc(a.clinicaNome)}</div>${acoes}</article>`;
}

// ---------- Acessibilidade: tema claro/escuro ----------
const A11Y_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.5" r="1.8"/><path d="M5 8.5l7 1.5 7-1.5M12 10v4.5M12 14.5l-3.5 6M12 14.5l3.5 6"/></svg>`;
const TEMAS = [{ id: "claro", nome: "Claro", desc: "Fundo claro, como o app é por padrão" }, { id: "escuro", nome: "Escuro", desc: "Fundo escuro, mais confortável à noite" }];
const TAMANHOS = [{ id: "normal", nome: "Normal" }, { id: "grande", nome: "Grande" }, { id: "maior", nome: "Maior" }];
export function iniciarAcessibilidade() {
  const fonte = localStorage.getItem("fonte") || "normal";
  document.documentElement.setAttribute("data-fonte", fonte);
  const overlay = document.createElement("div");
  overlay.className = "a11y-overlay";
  overlay.innerHTML = `<div class="a11y-panel" role="dialog" aria-modal="true" aria-labelledby="a11y-titulo">
    <div class="a11y-top"><h2 id="a11y-titulo">Acessibilidade</h2><button type="button" class="a11y-close" aria-label="Fechar">✕</button></div>
    <p class="a11y-sub">Tema do app</p>
    ${TEMAS.map((t) => `<button type="button" class="a11y-opt" data-tema="${t.id}" aria-pressed="false"><span class="a11y-swatch sw-${t.id}"></span><span><b>${t.nome}</b><small>${t.desc}</small></span></button>`).join("")}
    <p class="a11y-sub">Tamanho do texto</p>
    <div class="tam-row">${TAMANHOS.map((t) => `<button type="button" class="a11y-opt tam" data-fonte="${t.id}" aria-pressed="false">${t.nome}</button>`).join("")}</div></div>`;
  document.body.appendChild(overlay);
  const marcar = () => {
    overlay.querySelectorAll("[data-tema]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tema === document.documentElement.getAttribute("data-tema"))));
    overlay.querySelectorAll("[data-fonte]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.fonte === document.documentElement.getAttribute("data-fonte"))));
  };
  const fechar = () => overlay.classList.remove("open");
  overlay.addEventListener("click", (e) => { if (e.target === overlay) fechar(); });
  overlay.querySelector(".a11y-close").addEventListener("click", fechar);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") fechar(); });
  overlay.querySelectorAll("[data-tema]").forEach((b) => b.addEventListener("click", () => { document.documentElement.setAttribute("data-tema", b.dataset.tema); localStorage.setItem("tema", b.dataset.tema); marcar(); }));
  overlay.querySelectorAll("[data-fonte]").forEach((b) => b.addEventListener("click", () => { document.documentElement.setAttribute("data-fonte", b.dataset.fonte); localStorage.setItem("fonte", b.dataset.fonte); marcar(); }));
  return { abrir: () => { marcar(); overlay.classList.add("open"); overlay.querySelector(".a11y-close").focus(); } };
}
export const botaoAcessibilidade = () => `<button type="button" class="a11y-btn" data-a11y aria-label="Acessibilidade" title="Acessibilidade">${A11Y_SVG}</button>`;
