// Pesquisa de profissionais (por nome, clínica ou especialidade) e de clínicas.
import { api } from "../api.js";
import { abas, abasHTML, carregando, erroBox, opcoesHTML, vazio, esc } from "../ui.js";
import { debounce, qs } from "../util.js";

export default async function (root, { query }) {
  const [clinicas, esps] = await Promise.all([api.get("/clinicas"), api.get("/especialidades")]);
  root.innerHTML = `<p class="intro-text left">Buscar</p>${abasHTML("abas-busca", [["painel-prof", "Profissionais"], ["painel-cli", "Clínicas"]])}`;
  const pProf = root.querySelector("#painel-prof"), pCli = root.querySelector("#painel-cli");

  pProf.classList.remove("list-grid");
  pProf.innerHTML = `<form class="filtros" role="search" onsubmit="return false">
      <div class="field"><label for="b-prof">Nome, clínica ou especialidade</label><input id="b-prof" type="search" placeholder="Ex.: cardio, Helena, Olinda" /></div>
      <div class="field"><label for="f-cli">Clínica</label><select id="f-cli">${opcoesHTML([{ id: "", nome: "Todas" }, ...clinicas], query.get("clinicaId") || "")}</select></div>
      <div class="field"><label for="f-esp">Especialidade</label><select id="f-esp">${opcoesHTML([{ id: "", nome: "Todas" }, ...esps], query.get("especialidadeId") || "")}</select></div></form>
    <div id="res-prof" class="list-grid" aria-live="polite"></div>`;
  const resProf = pProf.querySelector("#res-prof");

  async function buscarProf() {
    carregando(resProf, "Buscando...");
    try {
      const lista = await api.get("/profissionais" + qs({ busca: pProf.querySelector("#b-prof").value.trim(), clinicaId: pProf.querySelector("#f-cli").value, especialidadeId: pProf.querySelector("#f-esp").value }));
      resProf.innerHTML = lista.length ? lista.map((p) => `<article class="consulta-card">
        <div class="consulta-top"><span class="consulta-especialidade">${esc(p.nome)}</span><span class="consulta-status">${esc(p.especialidadeNome)}</span></div>
        <div class="consulta-data">${p.clinicas.map((c) => esc(c.nome)).join(" · ")}</div>
        <a class="consulta-action" href="#/agendar?profissionalId=${p.id}">Agendar com ${esc(p.nome.split(" ").slice(0, 2).join(" "))}</a></article>`).join("") : vazio("Nenhum profissional encontrado com esses filtros.");
    } catch (e) { resProf.innerHTML = erroBox(e); }
  }
  pProf.querySelector("#b-prof").addEventListener("input", debounce(buscarProf));
  pProf.querySelectorAll("select").forEach((s) => s.addEventListener("change", buscarProf));

  pCli.classList.remove("list-grid");
  pCli.innerHTML = `<form class="filtros" role="search" onsubmit="return false"><div class="field"><label for="b-cli">Nome, cidade ou endereço</label><input id="b-cli" type="search" /></div></form><div id="res-cli" class="list-grid" aria-live="polite"></div>`;
  const resCli = pCli.querySelector("#res-cli");
  async function buscarCli() {
    carregando(resCli, "Buscando...");
    try {
      const lista = await api.get("/clinicas" + qs({ busca: pCli.querySelector("#b-cli").value.trim() }));
      resCli.innerHTML = lista.length ? lista.map((c) => `<article class="consulta-card">
        <div class="consulta-top"><span class="consulta-especialidade">${esc(c.nome)}</span></div>
        <div class="consulta-data">${esc(c.endereco)} · ${esc(c.cidade)}</div><div class="consulta-data">${esc(c.telefone)}</div>
        <a class="consulta-action" href="#/explorar?clinicaId=${c.id}">Ver profissionais</a></article>`).join("") : vazio("Nenhuma clínica encontrada.");
    } catch (e) { resCli.innerHTML = erroBox(e); }
  }
  pCli.querySelector("#b-cli").addEventListener("input", debounce(buscarCli));
  abas(root);
  buscarProf(); buscarCli();
}
