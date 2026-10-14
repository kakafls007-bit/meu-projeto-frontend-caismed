import { api } from "../api.js";
import { homeDoPerfil, salvarSessao } from "../session.js";
import { campo, toast, valores } from "../ui.js";
import { PLANOS, brl, cpfValido, mascaraTel } from "../util.js";

export const camposPaciente = (v = {}, { senha = true } = {}) => `
  ${campo({ id: "nome", label: "Nome completo", valor: v.nome, extra: 'autocomplete="name"' })}
  ${campo({ id: "cpf", label: "CPF (só números)", valor: v.cpf, extra: 'inputmode="numeric" maxlength="11" pattern="[0-9]{11}"' })}
  ${campo({ id: "nascimento", label: "Data de nascimento", tipo: "date", valor: v.nascimento, extra: 'autocomplete="bday"' })}
  ${campo({ id: "telefone", label: "Telefone", tipo: "tel", valor: v.telefone, extra: 'autocomplete="tel" placeholder="(81) 99999-9999"' })}
  ${campo({ id: "email", label: "E-mail", tipo: "email", valor: v.email, extra: 'autocomplete="email"' })}
  ${campo({ id: "cidade", label: "Cidade", valor: v.cidade })}
  ${campo({ id: "plano", label: "Plano", required: false, valor: v.plano, vazioTxt: "Sem plano", opcoes: Object.entries(PLANOS).map(([k, p]) => ({ id: k, nome: `${p.nome} - ${brl(p.valor)}/mês` })) })}
  ${senha ? campo({ id: "senha", label: "Senha", tipo: "password", required: v.id == null, ajuda: v.id == null ? "Mínimo de 6 caracteres." : "Deixe em branco para manter a senha atual.", extra: 'minlength="6" autocomplete="new-password"' }) : ""}`;

export function ligarFormPaciente(f) {
  f.cpf.addEventListener("input", () => { f.cpf.value = f.cpf.value.replace(/\D/g, "").slice(0, 11); });
  f.telefone.addEventListener("input", () => { f.telefone.value = mascaraTel(f.telefone.value); });
}
export function validarPaciente(f) {
  if (!cpfValido(f.cpf.value)) { toast("CPF inválido. Confira os 11 números.", "erro"); f.cpf.focus(); return false; }
  return true;
}

export default function (root, { ir }) {
  root.innerHTML = `<p class="intro-text">Criar Conta</p>
    <form id="f" class="form-grid">${camposPaciente()}
      ${campo({ id: "senha2", label: "Repita a senha", tipo: "password", extra: 'minlength="6" autocomplete="new-password"' })}
      <div class="bottom-area span-2"><button class="btn" type="submit">Cadastrar</button></div></form>`;
  const f = root.querySelector("#f");
  ligarFormPaciente(f);
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validarPaciente(f)) return;
    if (f.senha.value !== f.senha2.value) { toast("As senhas não são iguais.", "erro"); return f.senha2.focus(); }
    const btn = f.querySelector(".btn"); btn.disabled = true;
    try {
      const { senha2, ...dados } = valores(f);
      const r = await api.post("/auth/register", dados);
      salvarSessao(r); toast("Conta criada! Bem-vindo(a) ao CaisMed.");
      ir(homeDoPerfil(r.usuario.perfil));
    } catch (err) { toast(err.message, "erro"); btn.disabled = false; }
  });
}
