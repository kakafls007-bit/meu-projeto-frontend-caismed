// Área administrativa: CRUD de clínicas, profissionais, especialidades e pacientes + visão de todos os agendamentos.
import { api } from "../api.js";
import { abas, abasHTML, abrirDialogo, campo, carregando, cardConsulta, confirmar, erroBox, grupoCheck, toast, vazio, esc, valores } from "../ui.js";
import { PLANOS, debounce, fmtCPF, qs } from "../util.js";
import { camposPaciente, ligarFormPaciente, validarPaciente } from "./cadastro.js";
import { montarDisponibilidade } from "./horarios.js";

const RECURSOS = {
  clinicas: {
    rotulo: "Clínicas", rota: "/clinicas", novo: "Nova clínica",
    titulo: (c) => c.nome, sub: (c) => `${c.endereco} · ${c.cidade} · ${c.telefone}`,
    form: async (c = {}) => [campo({ id: "nome", label: "Nome", valor: c.nome }), campo({ id: "endereco", label: "Endereço", valor: c.endereco }), campo({ id: "cidade", label: "Cidade", valor: c.cidade }), campo({ id: "telefone", label: "Telefone", tipo: "tel", valor: c.telefone })].join(""),
  },
  profissionais: {
    rotulo: "Profissionais", rota: "/profissionais", novo: "Novo profissional",
    titulo: (p) => p.nome, sub: (p) => `${p.especialidadeNome} · matrícula ${p.registro} · ${p.clinicas.map((c) => c.nome).join(", ")}`,
    extra: (p) => `<button type="button" class="consulta-action" data-horarios="${p.id}">Horários de atendimento</button>`,
    form: async (p = {}) => {
      const [esps, clis] = await Promise.all([api.get("/especialidades"), api.get("/clinicas")]);
      return [campo({ id: "nome", label: "Nome", valor: p.nome }), campo({ id: "registro", label: "Matrícula (usada no login)", valor: p.registro }),
        campo({ id: "email", label: "E-mail", tipo: "email", valor: p.email }), campo({ id: "especialidadeId", label: "Especialidade", valor: p.especialidadeId, opcoes: esps }),
        grupoCheck({ nome: "clinicaIds", label: "Clínicas em que atende", opcoes: clis, marcados: p.clinicaIds || [] }),
        campo({ id: "senha", label: "Senha", tipo: "password", required: !p.id, ajuda: p.id ? "Deixe em branco para manter a atual." : "Mínimo de 6 caracteres.", extra: 'minlength="6" autocomplete="new-password"' })].join("");
    },
    ler: (f, v) => ({ ...v, clinicaIds: [...f.querySelectorAll('[name="clinicaIds"]:checked')].map((c) => +c.value), especialidadeId: +v.especialidadeId }),
  },
  especialidades: {
    rotulo: "Especialidades", rota: "/especialidades", novo: "Nova especialidade",
    titulo: (e) => e.nome, sub: () => "",
    form: async (e = {}) => campo({ id: "nome", label: "Nome da especialidade", valor: e.nome }),
  },
  pacientes: {
    rotulo: "Pacientes", rota: "/pacientes", novo: "Novo paciente",
    titulo: (p) => p.nome, sub: (p) => `CPF ${fmtCPF(p.cpf)} · ${p.telefone} · ${(PLANOS[p.plano] || {}).nome || "Sem plano"}`,
    form: async (p = {}) => camposPaciente(p), pos: ligarFormPaciente, validar: validarPaciente,
    ler: (f, v) => { if (!v.senha) delete v.senha; return v; },
  },
};

export default async function (root) {
  const abasDef = [["tab-ag", "Agendamentos"], ...Object.entries(RECURSOS).map(([k, r]) => ["tab-" + k, r.rotulo])];
  root.innerHTML = `<p class="intro-text left">Administração</p>${abasHTML("abas-admin", abasDef)}`;
  const ativar = abas(root);
  const iniciados = new Set();

  // ----- Agendamentos (todas as consultas; admin pode cancelar) -----
  async function montarAgendamentos() {
    const p = root.querySelector("#tab-ag"); carregando(p);
    try {
      const todas = (await api.get("/agendamentos")).reverse();
      p.innerHTML = todas.length ? todas.map((a) => cardConsulta(a, { paciente: true, acoes: a.status === "agendado" ? `<button type="button" class="consulta-action cancelar" data-cancelar="${a.id}">Cancelar consulta</button>` : "" })).join("") : vazio("Nenhum agendamento ainda.");
    } catch (e) { p.innerHTML = erroBox(e); }
  }
  root.querySelector("#tab-ag").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-cancelar]"); if (!b) return;
    if (!(await confirmar("Cancelar este agendamento?", { ok: "Cancelar", perigo: true }))) return;
    try { await api.patch(`/agendamentos/${b.dataset.cancelar}`, { status: "cancelado" }); toast("Agendamento cancelado."); montarAgendamentos(); } catch (err) { toast(err.message, "erro"); }
  });

  // ----- CRUD genérico -----
  function montarCrud(chave) {
    const r = RECURSOS[chave], painel = root.querySelector("#tab-" + chave);
    painel.classList.remove("list-grid");
    painel.innerHTML = `<div class="crud-topo"><div class="field"><label for="b-${chave}">Pesquisar ${r.rotulo.toLowerCase()}</label><input id="b-${chave}" type="search" /></div><button type="button" class="btn" data-novo>${r.novo}</button></div><div class="list-grid" id="l-${chave}" aria-live="polite"></div>`;
    const lista = painel.querySelector(".list-grid");
    let itens = [];

    async function carregar() {
      carregando(lista);
      try {
        itens = await api.get(r.rota + qs({ busca: painel.querySelector("input").value.trim() }));
        lista.innerHTML = itens.length ? itens.map((i) => `<article class="consulta-card"><div class="consulta-top"><span class="consulta-especialidade">${esc(r.titulo(i))}</span></div>
          ${r.sub(i) ? `<div class="consulta-data">${esc(r.sub(i))}</div>` : ""}
          <div class="linha-acoes"><button type="button" class="consulta-action" data-edit="${i.id}">Editar</button>${r.extra ? r.extra(i) : ""}<button type="button" class="consulta-action cancelar" data-del="${i.id}">Excluir</button></div></article>`).join("") : vazio(`Nenhum registro encontrado.`);
      } catch (e) { lista.innerHTML = erroBox(e); }
    }

    async function abrirForm(item) {
      const html = await r.form(item || {});
      const dlg = abrirDialogo(item ? `Editar — ${r.titulo(item)}` : r.novo, `<form id="fc" class="form-grid">${html}<div class="bottom-area span-2"><button class="btn" type="submit">Salvar</button></div></form>`);
      const f = dlg.el.querySelector("#fc");
      if (r.pos) r.pos(f);
      f.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (r.validar && !r.validar(f)) return;
        let dados = valores(f); if (r.ler) dados = r.ler(f, dados);
        try {
          item ? await api.put(`${r.rota}/${item.id}`, dados) : await api.post(r.rota, dados);
          dlg.fechar(); toast(item ? "Alterações salvas." : "Cadastro realizado."); carregar();
        } catch (err) { toast(err.message, "erro"); }
      });
    }

    painel.addEventListener("click", async (e) => {
      const t = e.target.closest("button"); if (!t) return;
      if (t.dataset.novo !== undefined) return abrirForm(null);
      if (t.dataset.edit) return abrirForm(itens.find((i) => String(i.id) === t.dataset.edit));
      if (t.dataset.horarios) { const p = itens.find((i) => String(i.id) === t.dataset.horarios); const d = abrirDialogo(`Horários — ${p.nome}`, '<div id="disp"></div>'); return montarDisponibilidade(d.el.querySelector("#disp"), p.id); }
      if (t.dataset.del) {
        if (!(await confirmar("Excluir este registro? Essa ação não pode ser desfeita.", { ok: "Excluir", perigo: true }))) return;
        try { await api.delete(`${r.rota}/${t.dataset.del}`); toast("Registro excluído."); carregar(); } catch (err) { toast(err.message, "erro"); }
      }
    });
    painel.querySelector("input").addEventListener("input", debounce(carregar));
    carregar();
  }

  const aoAbrir = () => {
    const ativa = root.querySelector('[role="tab"].active').getAttribute("aria-controls");
    if (iniciados.has(ativa)) return;
    iniciados.add(ativa);
    ativa === "tab-ag" ? montarAgendamentos() : montarCrud(ativa.replace("tab-", ""));
  };
  root.addEventListener("aba", aoAbrir);
  aoAbrir();
}
