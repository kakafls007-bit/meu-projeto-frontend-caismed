import { api } from "../api.js";
import { abas, abasHTML, cardConsulta, confirmar, toast, vazio } from "../ui.js";
import { hojeISO } from "../util.js";

export default async function (root) {
  root.innerHTML = `<p class="intro-text left">Minhas consultas</p>${abasHTML("abas-cons", [["lista-proximas", "Próximas"], ["lista-historico", "Histórico"]])}
    <div class="bottom-area"><a href="#/agendar" class="btn">Marcar Nova Consulta</a></div>`;
  abas(root);
  const pProx = root.querySelector("#lista-proximas"), pHist = root.querySelector("#lista-historico");

  async function carregar() {
    const todas = await api.get("/agendamentos");
    const agora = `${hojeISO()} 00:00`;
    const prox = todas.filter((a) => a.status === "agendado" && `${a.data} ${a.horario}` >= agora);
    const hist = todas.filter((a) => !prox.includes(a)).reverse();
    pProx.innerHTML = prox.length ? prox.map((a) => cardConsulta(a, { acoes: `<button type="button" class="consulta-action cancelar" data-cancelar="${a.id}">Cancelar consulta</button>` })).join("") : vazio("Você não tem consultas marcadas.");
    pHist.innerHTML = hist.length ? hist.map((a) => cardConsulta(a)).join("") : vazio("Ainda não há consultas no histórico.");
  }
  root.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-cancelar]"); if (!b) return;
    if (!(await confirmar("Deseja cancelar esta consulta? O horário será liberado para outros pacientes.", { ok: "Cancelar consulta", perigo: true }))) return;
    try { await api.patch(`/agendamentos/${b.dataset.cancelar}`, { status: "cancelado" }); toast("Consulta cancelada."); await carregar(); }
    catch (err) { toast(err.message, "erro"); }
  });
  await carregar();
}
