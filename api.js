// Cliente REST único do front. Todas as telas falam com a API só por aqui.
import { API_BASE_URL } from "./config.js";
import { mockRequest } from "./mock-api.js";
import { getToken, sair } from "./session.js";
import { ApiError } from "./util.js";

async function request(method, path, body) {
  const token = getToken();
  if (!API_BASE_URL) return mockRequest(method, path, body, token);

  let res;
  try {
    res = await fetch(API_BASE_URL.replace(/\/$/, "") + path, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Sem conexão com o servidor. Verifique sua internet e tente de novo.");
  }
  const dados = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) { sair(); window.dispatchEvent(new Event("sessao-expirada")); }
    throw new ApiError(res.status, (dados && (dados.message || dados.mensagem || dados.erro)) || "Não foi possível concluir a operação.");
  }
  return dados;
}

export const api = {
  get: (p) => request("GET", p),
  post: (p, b) => request("POST", p, b),
  put: (p, b) => request("PUT", p, b),
  patch: (p, b) => request("PATCH", p, b),
  delete: (p) => request("DELETE", p),
};
