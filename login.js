import { api } from "../api.js";
import { API_BASE_URL } from "../config.js";
import { homeDoPerfil, salvarSessao } from "../session.js";
import { campo, esc } from "../ui.js";

export default function (root, { ir }) {
  root.innerHTML = `
    <p class="intro-text">Acesse Sua Conta</p>
    <form id="f">
      ${campo({ id: "login", label: "CPF ou matrícula", extra: 'autocomplete="username" autocapitalize="none"' })}
      ${campo({ id: "senha", label: "Senha", tipo: "password", extra: 'autocomplete="current-password"' })}
      <a class="forgot-link" href="#/recuperar-senha">Esqueceu a senha?</a>
      <p id="erro" class="erro-box" role="alert" hidden></p>
      <div class="bottom-area">
        <button type="submit" class="btn">Entrar</button>
        <a class="secondary-link" href="#/cadastro">Criar conta de paciente</a>
      </div>
    </form>
    ${API_BASE_URL ? "" : `<details class="demo"><summary>Acessos de demonstração</summary>
      <p><b>Paciente:</b> CPF 11144477735 · senha 123456</p>
      <p><b>Profissional:</b> matrícula 1001 · senha caismed123</p>
      <p><b>Administrador:</b> admin · senha admin123</p></details>`}`;

  const f = root.querySelector("#f"), erro = root.querySelector("#erro"), btn = f.querySelector(".btn");
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    erro.hidden = true; btn.disabled = true; btn.textContent = "Entrando...";
    try {
      const r = await api.post("/auth/login", { login: f.login.value.trim(), senha: f.senha.value });
      salvarSessao(r);
      ir(homeDoPerfil(r.usuario.perfil));
    } catch (err) {
      erro.textContent = err.message; erro.hidden = false;
      btn.disabled = false; btn.textContent = "Entrar";
    }
  });
}
