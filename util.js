export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const norm = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
export const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const p2 = (n) => String(n).padStart(2, "0");
export const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
export const dataBR = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");
export const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const diaSemana = (iso) => new Date(iso + "T00:00:00").getDay();
export const minutos = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
export const hhmm = (min) => `${p2(Math.floor(min / 60))}:${p2(min % 60)}`;

export const PLANOS = {
  essencial: { nome: "Plano Essencial", valor: 89.9, desc: "Consultas básicas e telemedicina" },
  conforto: { nome: "Plano Conforto", valor: 149.9, desc: "Essencial + exames simples e especialistas" },
  premium: { nome: "Plano Premium", valor: 249.9, desc: "Conforto + exames de imagem e check-up anual" },
  familia: { nome: "Plano Família", valor: 399.9, desc: "Cobertura Premium para até 4 pessoas" },
};

export function cpfValido(c) {
  c = (c || "").replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  const dv = (n) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += +c[i] * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === +c[9] && dv(10) === +c[10];
}
export const fmtCPF = (c) => String(c || "").replace(/\D/g, "").replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
export const mascaraTel = (v) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d;
};
export const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const qs = (obj) => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => { if (v !== "" && v != null) p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : "";
};
