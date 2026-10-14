// Agenda do profissional: consultas aguardando e histórico; concluir ou cancelar atendimento.
import { api } from "../api.js";
import { SINTOMAS } from "./_triagem-rotulos.js";
import { abas, abasHTML, abrirDialogo, cardConsulta, confirmar, toast, vazio, esc } from "../ui.js";
import { dataBR } from "../util.js";

export default async function (root, { sessao }) {
  root.innerHTML = `<p class="intro-text left">Olá, ${esc(sessao.nome)}</p><div class="stats" id="resumo"></div>${abasHTML("abas-agenda", [["lista-aguardando", "Aguardando"], ["lista-historico", "Histórico"]])}`;
  abas(root);
  let todas = [];

  async function carregar() {
    todas = await api.get("/agendamentos");
    const ag = todas.filter((a) => a.status === "agendado"), hist = todas.filter((a) => a.status !== "agendado").reverse();
    root.querySelector("#resumo").innerHTML = [["Aguardando", ag.length], ["Concluídas", todas.filter((a) => a.status === "concluido").length], ["Canceladas", todas.filter((a) => a.status === "cancelado").length]].map(([t, v]) => `<div class="stat"><b>${v}</b>${t}</div>`).join("");
    const card = (a) => cardConsulta(a, { paciente: true, acoes: `<button type="button" class="consulta-action" data-ver="${a.id}">Ver detalhes</button>` });
    root.querySelector("#lista-aguardando").innerHTML = ag.length ? ag.map(card).join("") : vazio("Nenhuma consulta aguardando atendimento.");
    root.querySelector("#lista-historico").innerHTML = hist.length ? hist.map(card).join("") : vazio("Nenhum atendimento no histórico.");
  }

  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ver]"); if (!b) return;
    const a = todas.find((x) => String(x.id) === b.dataset.ver), t = a.triagem;
    const linha = (l, v) => `<div class="summary-row"><span class="label">${l}</span><span class="value">${esc(v || "—")}</span></div>`;
    const dlg = abrirDialogo("Detalhes da consulta", `<div class="summary-box">${linha("Paciente", a.pacienteNome)}${linha("Especialidade", a.especialidadeNome)}${linha("Clínica", a.clinicaNome)}${linha("Data", dataBR(a.data))}${linha("Horário", a.horario)}</div>
      ${t ? `<p class="sec-title">Triagem do paciente</p><div class="summary-box">${linha("Motivo", t.motivo)}${linha("Sintomas", (t.sintomas || []).map((s) => SINTOMAS[s] || s).join(", ") || "Nenhum informado")}${linha("Urgência", t.urgencia)}${linha("Observações", t.observacoes)}</div>` : `<p class="empty-state">Esta consulta não veio da triagem pelo chatbot.</p>`}
      ${a.status === "agendado" ? `<div class="dlg-acoes"><button type="button" class="btn btn-outline" data-cancelar>Cancelar consulta</button><button type="button" class="btn" data-concluir>Concluir atendimento</button></div>` : ""}`);
    const mudar = async (status, msg) => { try { await api.patch(`/agendamentos/${a.id}`, { status }); dlg.fechar(); toast(msg); await carregar(); } catch (err) { toast(err.message, "erro"); } };
    const c = dlg.el.querySelector("[data-concluir]"), x = dlg.el.querySelector("[data-cancelar]");
    if (c) c.onclick = () => mudar("concluido", "Atendimento concluído.");
    if (x) x.onclick = async () => { if (await confirmar("Cancelar esta consulta? O paciente verá o cancelamento.", { ok: "Cancelar consulta", perigo: true })) mudar("cancelado", "Consulta cancelada."); };
  });
  await carregar();
}
