// Cadastro e consulta da disponibilidade (dias e horários). Usado pelo profissional e pelo administrador.
import { api } from "../api.js";
import { campo, carregando, confirmar, erroBox, toast, vazio, esc } from "../ui.js";
import { DIAS } from "../util.js";

export async function montarDisponibilidade(container, profissionalId) {
  carregando(container);
  const prof = await api.get(`/profissionais/${profissionalId}`);
  async function desenhar() {
    const lista = await api.get(`/profissionais/${profissionalId}/disponibilidades`);
    container.innerHTML = `
      <form id="fd" class="form-grid">
        ${campo({ id: "clinicaId", label: "Clínica", opcoes: prof.clinicas, vazioTxt: "Selecione" })}
        ${campo({ id: "diaSemana", label: "Dia da semana", opcoes: DIAS.map((n, i) => ({ id: i, nome: n })), vazioTxt: "Selecione" })}
        ${campo({ id: "inicio", label: "Início", tipo: "time", extra: 'step="1800"' })}
        ${campo({ id: "fim", label: "Fim", tipo: "time", extra: 'step="1800"' })}
        <div class="bottom-area span-2"><button class="btn" type="submit">Adicionar horário</button></div>
      </form>
      <p class="sec-title">Horários cadastrados</p>
      <div class="list-grid" id="lista-disp">${lista.length ? lista.map((d) => `<div class="consulta-card"><div class="consulta-top"><span class="consulta-especialidade">${DIAS[d.diaSemana]} · ${esc(d.inicio)} às ${esc(d.fim)}</span></div>
        <div class="consulta-data">${esc((prof.clinicas.find((c) => c.id === d.clinicaId) || {}).nome || "")} · consultas de 30 min</div>
        <button type="button" class="consulta-action cancelar" data-del="${d.id}">Remover</button></div>`).join("") : vazio("Nenhum horário cadastrado ainda.")}</div>`;
    const f = container.querySelector("#fd");
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      try { await api.post(`/profissionais/${profissionalId}/disponibilidades`, { clinicaId: +f.clinicaId.value, diaSemana: +f.diaSemana.value, inicio: f.inicio.value, fim: f.fim.value }); toast("Horário adicionado."); await desenhar(); }
      catch (err) { toast(err.message, "erro"); }
    });
    container.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
      if (!(await confirmar("Remover este horário de atendimento?", { ok: "Remover", perigo: true }))) return;
      try { await api.delete(`/disponibilidades/${b.dataset.del}`); toast("Horário removido."); await desenhar(); } catch (err) { toast(err.message, "erro"); }
    }));
  }
  try { await desenhar(); } catch (e) { container.innerHTML = erroBox(e); }
}

export default async function (root, { sessao }) {
  root.innerHTML = `<p class="intro-text left">Meus horários de atendimento</p><div id="disp"></div>`;
  await montarDisponibilidade(root.querySelector("#disp"), sessao.id);
}
