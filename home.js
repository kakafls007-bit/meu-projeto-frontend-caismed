import { api } from "../api.js";
import { ICONES, cardConsulta, ico, esc } from "../ui.js";

const tile = (href, cls, d, peq, titulo) => `<a class="tile ${cls}" href="${href}"><span class="tile-ico">${ico(d)}</span><span class="tile-small">${peq}</span><span class="tile-title">${titulo}</span></a>`;

export default async function (root, { sessao }) {
  const [proximas, esps] = await Promise.all([api.get("/agendamentos?status=agendado"), api.get("/especialidades")]);
  const prox = proximas.find((a) => `${a.data} ${a.horario}` >= new Date().toISOString().slice(0, 10));
  root.innerHTML = `
    <p class="saudacao">Olá, <b>${esc(sessao.nome.split(" ")[0])}</b>!</p>
    <p class="intro-text left">Como Podemos Ajudar Hoje?</p>
    <div class="tile-grid">
      ${tile("#/agendar", "t-main", ICONES.consultas, "Marcar", "Agendar Consulta")}
      ${tile("#/explorar", "t-pale", ICONES.buscar, "Encontrar", "Profissionais e Clínicas")}
      ${tile("#/consultas", "t-pale", ICONES.horarios, "Acompanhar", "Minhas Consultas")}
      ${tile("#/triagem", "t-ice", "M4 5h16v11H9l-5 4zM8 10h8", "Conversar", "Triagem")}
    </div>
    ${prox ? `<p class="sec-title">Sua próxima consulta</p>${cardConsulta(prox)}` : ""}
    <p class="sec-title">Agendar por especialidade</p>
    <div class="mini-row">${esps.slice(0, 4).map((e) => `<a class="mini" href="#/agendar?especialidadeId=${e.id}"><span aria-hidden="true">${esc(e.nome[0])}</span>${esc(e.nome)}</a>`).join("")}</div>
    <div class="banner-row">
      <a class="banner" href="#/carteirinha"><span><b>Sua Carteirinha Digital</b><small>Tenha seu cartão do plano sempre à mão.</small></span><span class="banner-btn">Ver Cartão</span></a>
      <a class="banner banner-alt" href="#/pagamento"><span><b>Pagamentos</b><small>Fatura do plano e histórico.</small></span><span class="banner-btn">Abrir</span></a>
    </div>`;
}
