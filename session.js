const K_TOKEN = "caismed.token";
const K_USER = "caismed.usuario";

export const getToken = () => localStorage.getItem(K_TOKEN);
export const getUsuario = () => { try { return JSON.parse(localStorage.getItem(K_USER) || "null"); } catch { return null; } };
export function salvarSessao({ token, usuario }) {
  localStorage.setItem(K_TOKEN, token);
  localStorage.setItem(K_USER, JSON.stringify(usuario));
}
export function sair() { localStorage.removeItem(K_TOKEN); localStorage.removeItem(K_USER); }
export const homeDoPerfil = (perfil) => ({ paciente: "#/home", profissional: "#/agenda", admin: "#/admin" }[perfil] || "#/login");
