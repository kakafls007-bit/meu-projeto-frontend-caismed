// Agendamento: clínica -> especialidade -> profissional -> data -> horário.
import { api } from "../api.js";
import { opcoesHTML, toast, esc } from "../ui.js";
import { DIAS, diaSemana, hojeISO, norm } from "../util.js";

export default async function (root, { query, ir }) {
  const [clinicas, profs, esps] = await Promise.all([api.get("/clinicas"), api.get("/profissionais"), api.get("/especialidades")]);
  const triagem = JSON.parse(sessionStorage.getItem("caismed.triagem") || "null");
  const st = { clinicaId: "", especialidadeId: "", profissionalId: "", data: "", horario: "" };

  // Pré-preenchimento vindo de outras telas (busca, home ou triagem)
  const pre = profs.find((p) => String(p.id) === query.get("profissionalId"));
  if (pre) { st.profissionalId = String(pre.id); st.especialidadeId = String(pre.especialidadeId); if (pre.clinicaIds.length === 1) st.clinicaId = String(pre.clinicaIds[0]); }
  if (query.get("clinicaId")) st.clinicaId = query.get("clinicaId");
  if (query.get("especialidadeId")) st.especialidadeId = query.get("especialidadeId");
  const slug = query.get("especialidade");
  if (slug) { const e = esps.find((x) => norm(x.nome).replace(/\s+/g, "_") === slug); if (e) st.especialidadeId = String(e.id); }

  root.innerHTML = `<p class="intro-text left">Marque Sua Consulta</p>
    ${triagem ? `<p class="aviso-box">Sua triagem será enviada ao profissional junto com o agendamento.</p>` : ""}
    <form id="f" class="form-grid" novalidate>
      <div class="field"><label for="clinica">1. Clínica</label><select id="clinica" required></select></div>
      <div class="field"><label for="esp">2. Especialidade</label><select id="esp" required></select></div>
      <div class="field"><label for="prof">3. Profissional</label><select id="prof" required></select></div>
      <div class="field"><label for="data">4. Data</label><input id="data" type="date" min="${hojeISO()}" required /><small class="hint" id="atende"></small></div>
      <div class="field span-2"><span class="label" id="lbl-h">5. Horário</span><div class="slots" id="slots" role="radiogroup" aria-labelledby="lbl-h" aria-live="polite"><p class="hint">Escolha profissional e data para ver os horários.</p></div></div>
      <div class="bottom-area span-2"><button type="submit" class="btn">Confirmar Agendamento</button></div>
    </form>`;
  const $ = (id) => root.querySelector("#" + id);
  const slots = $("slots");

  const profsDaClinica = () => profs.filter((p) => !st.clinicaId || p.clinicaIds.includes(+st.clinicaId));
  const espsDisponiveis = () => { const ids = new Set(profsDaClinica().map((p) => p.especialidadeId)); return esps.filter((e) => ids.has(e.id)); };
  const profsFiltrados = () => profsDaClinica().filter((p) => !st.especialidadeId || p.especialidadeId === +st.especialidadeId);

  function desenhar() {
    if (st.especialidadeId && !espsDisponiveis().some((e) => String(e.id) === st.especialidadeId)) st.especialidadeId = "";
    if (st.profissionalId && !profsFiltrados().some((p) => String(p.id) === st.profissionalId)) st.profissionalId = "";
    $("clinica").innerHTML = opcoesHTML(clinicas, st.clinicaId, "Selecione a clínica");
    $("esp").innerHTML = opcoesHTML(espsDisponiveis(), st.especialidadeId, "Selecione a especialidade");
    $("prof").innerHTML = opcoesHTML(profsFiltrados(), st.profissionalId, "Selecione o profissional");
    atualizarHorarios();
  }

  async function atualizarHorarios() {
    st.horario = "";
    $("atende").textContent = "";
    if (!(st.profissionalId && st.clinicaId)) { slots.innerHTML = `<p class="hint">Escolha clínica e profissional para ver os horários.</p>`; return; }
    try {
      const disp = (await api.get(`/profissionais/${st.profissionalId}/disponibilidades`)).filter((d) => String(d.clinicaId) === st.clinicaId);
      const dias = [...new Set(disp.map((d) => d.diaSemana))].sort();
      $("atende").textContent = dias.length ? "Atende nesta clínica: " + dias.map((d) => DIAS[d]).join(", ") : "Este profissional ainda não cadastrou horários nesta clínica.";
      if (!st.data) { slots.innerHTML = `<p class="hint">Escolha a data.</p>`; return; }
      if (!dias.includes(diaSemana(st.data))) { slots.innerHTML = `<p class="hint">Sem atendimento neste dia da semana. Escolha outra data.</p>`; return; }
      slots.innerHTML = `<p class="hint">Buscando horários...</p>`;
      const { horarios } = await api.get(`/profissionais/${st.profissionalId}/horarios?clinicaId=${st.clinicaId}&data=${st.data}`);
      slots.innerHTML = horarios.length ? horarios.map((h) => `<button type="button" role="radio" aria-checked="false" class="slot-btn">${h}</button>`).join("") : `<p class="hint">Todos os horários deste dia já foram ocupados.</p>`;
    } catch (e) { slots.innerHTML = `<p class="erro-box" role="alert">${esc(e.message)}</p>`; }
  }

  $("clinica").onchange = (e) => { st.clinicaId = e.target.value; desenhar(); };
  $("esp").onchange = (e) => { st.especialidadeId = e.target.value; desenhar(); };
  $("prof").onchange = (e) => { st.profissionalId = e.target.value; atualizarHorarios(); };
  $("data").onchange = (e) => { st.data = e.target.value; atualizarHorarios(); };
  slots.addEventListener("click", (e) => {
    const b = e.target.closest(".slot-btn"); if (!b) return;
    slots.querySelectorAll(".slot-btn").forEach((x) => { x.classList.remove("selected"); x.setAttribute("aria-checked", "false"); });
    b.classList.add("selected"); b.setAttribute("aria-checked", "true"); st.horario = b.textContent.trim();
  });

  $("f").addEventListener("submit", async (e) => {
    e.preventDefault();
    const falta = !st.clinicaId ? "a clínica" : !st.especialidadeId ? "a especialidade" : !st.profissionalId ? "o profissional" : !st.data ? "a data" : !st.horario ? "um horário" : "";
    if (falta) return toast(`Escolha ${falta}.`, "erro");
    const btn = e.submitter || $("f").querySelector(".btn"); btn.disabled = true;
    try {
      const ag = await api.post("/agendamentos", { clinicaId: +st.clinicaId, profissionalId: +st.profissionalId, data: st.data, horario: st.horario, triagem });
      sessionStorage.removeItem("caismed.triagem");
      sessionStorage.setItem("caismed.ultimoAgendamento", JSON.stringify(ag));
      toast("Consulta agendada com sucesso!");
      ir("#/consultas");
    } catch (err) { toast(err.message, "erro"); btn.disabled = false; atualizarHorarios(); }
  });
  desenhar();
}
