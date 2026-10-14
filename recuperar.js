import { api } from "../api.js";
import { campo, toast } from "../ui.js";

export default function (root) {
  root.innerHTML = `<p class="intro-text">Recuperar Senha</p>
    <p class="message-text">Informe seu CPF. Se ele estiver cadastrado, enviaremos as instruções para o e-mail da conta.</p>
    <form id="f">${campo({ id: "cpf", label: "CPF (só números)", extra: 'inputmode="numeric" maxlength="11"' })}
      <div class="bottom-area"><button class="btn" type="submit">Enviar instruções</button></div></form>`;
  const f = root.querySelector("#f");
  f.cpf.addEventListener("input", () => { f.cpf.value = f.cpf.value.replace(/\D/g, "").slice(0, 11); });
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api.post("/auth/recuperar-senha", { cpf: f.cpf.value });
      root.innerHTML = `<p class="intro-text">Pedido enviado</p><p class="message-text" role="status">Se o CPF estiver cadastrado, você receberá as instruções por e-mail em instantes.</p><div class="bottom-area"><a class="btn" href="#/login">Voltar para o login</a></div>`;
    } catch (err) { toast(err.message, "erro"); }
  });
}
