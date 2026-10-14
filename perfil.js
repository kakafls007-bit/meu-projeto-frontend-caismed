import { api } from "../api.js";
import { getUsuario, salvarSessao, sair, getToken } from "../session.js";
import { confirmar, toast, valores } from "../ui.js";
import { camposPaciente, ligarFormPaciente, validarPaciente } from "./cadastro.js";

export default async function (root, { sessao, ir }) {
  const p = await api.get(`/pacientes/${sessao.id}`);
  root.innerHTML = `<p class="intro-text left">Seus Dados</p>
    <form id="f" class="form-grid">${camposPaciente(p)}
      <div class="bottom-area span-2">
        <button type="submit" class="btn">Salvar alterações</button>
        <button type="button" class="btn btn-outline" id="sair">Sair da conta</button>
        <button type="button" class="danger-link" id="excluir">Excluir minha conta</button>
      </div></form>`;
  const f = root.querySelector("#f");
  ligarFormPaciente(f);
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validarPaciente(f)) return;
    const dados = valores(f); if (!dados.senha) delete dados.senha;
    try {
      const novo = await api.put(`/pacientes/${p.id}`, dados);
      salvarSessao({ token: getToken(), usuario: { ...getUsuario(), nome: novo.nome } });
      toast("Dados atualizados com sucesso!");
    } catch (err) { toast(err.message, "erro"); }
  });
  root.querySelector("#sair").onclick = () => { sair(); ir("#/login"); };
  root.querySelector("#excluir").onclick = async () => {
    if (!(await confirmar("Tem certeza que deseja excluir sua conta? Suas consultas também serão removidas e essa ação não pode ser desfeita.", { ok: "Excluir conta", perigo: true }))) return;
    try { await api.delete(`/pacientes/${p.id}`); sair(); toast("Conta excluída."); ir("#/login"); } catch (err) { toast(err.message, "erro"); }
  };
}
