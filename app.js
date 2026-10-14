// Shell da aplicação: roteador por hash (#/rota), guarda de perfis e layout (cabeçalho + navegação).
import { getUsuario, sair, homeDoPerfil } from "./session.js";
import { BACK_SVG, LOGO_SVG, ICONES, botaoAcessibilidade, carregando, erroBox, ico, iniciarAcessibilidade } from "./ui.js";

const TODOS = ["paciente", "profissional", "admin"];
const ROTAS = {
  "/login": { view: "login", layout: "auth", publica: true, titulo: "Entrar" },
  "/cadastro": { view: "cadastro", layout: "auth", publica: true, titulo: "Criar conta", voltar: "#/login" },
  "/recuperar-senha": { view: "recuperar", layout: "auth", publica: true, titulo: "Recuperar senha", voltar: "#/login" },
  "/home": { view: "home", perfis: ["paciente"], titulo: "Início" },
  "/explorar": { view: "explorar", perfis: ["paciente"], titulo: "Buscar", voltar: "#/home" },
  "/agendar": { view: "agendar", perfis: ["paciente"], titulo: "Agendar consulta", voltar: "#/home" },
  "/consultas": { view: "consultas", perfis: ["paciente"], titulo: "Minhas consultas", voltar: "#/home" },
  "/perfil": { view: "perfil", perfis: ["paciente"], titulo: "Meu perfil", voltar: "#/home" },
  "/triagem": { view: "triagem", perfis: ["paciente"], titulo: "Triagem", voltar: "#/home", chat: true },
  "/carteirinha": { view: "carteirinha", perfis: ["paciente"], titulo: "Carteirinha", voltar: "#/home" },
  "/pagamento": { view: "pagamento", perfis: ["paciente"], titulo: "Pagamentos", voltar: "#/home" },
  "/agenda": { view: "agenda", perfis: ["profissional"], titulo: "Agenda" },
  "/horarios": { view: "horarios", perfis: ["profissional"], titulo: "Meus horários" },
  "/admin": { view: "admin", perfis: ["admin"], titulo: "Administração" },
};
const NAV = {
  paciente: [["#/home", "Início", ICONES.inicio], ["#/explorar", "Buscar", ICONES.buscar], ["#/consultas", "Consultas", ICONES.consultas], ["#/perfil", "Perfil", ICONES.perfil]],
  profissional: [["#/agenda", "Agenda", ICONES.agenda], ["#/horarios", "Horários", ICONES.horarios]],
  admin: [],
};

const app = document.getElementById("app");
const a11y = iniciarAcessibilidade();
let token = 0;

function lerHash() {
  const [caminho, q = ""] = (location.hash.slice(1) || "/").split("?");
  return { caminho, query: new URLSearchParams(q) };
}
const ir = (hash) => { if (location.hash !== hash) location.hash = hash; else render(); };

async function render() {
  const eu = ++token;
  const { caminho, query } = lerHash();
  const usuario = getUsuario();
  const rota = ROTAS[caminho];

  if (!rota) return ir(usuario ? homeDoPerfil(usuario.perfil) : "#/login");
  if (!rota.publica && !usuario) return ir("#/login");
  if (rota.publica && usuario) return ir(homeDoPerfil(usuario.perfil));
  if (rota.perfis && !rota.perfis.includes(usuario.perfil)) return ir(homeDoPerfil(usuario.perfil));

  document.title = `CaisMed | ${rota.titulo}`;
  app.className = "app" + (rota.chat ? " app-chat" : "");
  const logo = (inline) => `<div class="logo ${inline ? "logo-inline" : ""}"><span class="logo-icon">${LOGO_SVG}</span><span>CaisMed</span></div>`;
  const nav = usuario ? NAV[usuario.perfil] : [];
  const sairBtn = usuario && usuario.perfil !== "paciente" ? `<button type="button" class="hdr-btn" data-sair>Sair</button>` : "";

  app.innerHTML = rota.layout === "auth"
    ? `<header class="app-header ${rota.voltar ? "center-header" : ""}">${rota.voltar ? `<a href="${rota.voltar}" class="back-btn" aria-label="Voltar">${BACK_SVG}</a>` : ""}${logo(false)}${botaoAcessibilidade()}</header><main id="view" class="app-body center" tabindex="-1"></main>`
    : `<header class="app-header header-compact">${rota.voltar ? `<a href="${rota.voltar}" class="back-btn" aria-label="Voltar">${BACK_SVG}</a>` : ""}${logo(true)}${sairBtn}${botaoAcessibilidade()}</header>
       <main id="view" class="app-body" tabindex="-1"></main>
       ${nav.length ? `<nav class="bottom-nav" aria-label="Navegação principal" style="grid-template-columns:repeat(${nav.length},1fr)">${nav.map(([h, t, d]) => `<a href="${h}" class="${caminho === h.slice(1) ? "on" : ""}" ${caminho === h.slice(1) ? 'aria-current="page"' : ""}><span>${ico(d)}</span>${t}</a>`).join("")}</nav>` : ""}`;

  app.querySelector("[data-a11y]").addEventListener("click", a11y.abrir);
  const btnSair = app.querySelector("[data-sair]");
  if (btnSair) btnSair.addEventListener("click", () => { sair(); ir("#/login"); });

  const main = document.getElementById("view");
  carregando(main);
  try {
    const mod = await import(`./views/${rota.view}.js`);
    if (eu !== token) return; // usuário já navegou para outra tela
    main.innerHTML = "";
    await mod.default(main, { query, sessao: usuario, ir });
    if (eu === token) main.focus({ preventScroll: true });
  } catch (e) {
    if (eu === token) main.innerHTML = erroBox(e) + `<button type="button" class="btn" id="tentar">Tentar novamente</button>`;
    const t = document.getElementById("tentar"); if (t) t.onclick = render;
  }
}

window.addEventListener("hashchange", render);
window.addEventListener("sessao-expirada", () => ir("#/login"));
render();

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
