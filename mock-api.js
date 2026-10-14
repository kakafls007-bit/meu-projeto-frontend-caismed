// ============================================================
// API SIMULADA — implementa as MESMAS rotas REST que o back-end deve ter,
// guardando tudo no localStorage. Quando API_BASE_URL estiver preenchida
// em config.js, este arquivo deixa de ser usado.
// ============================================================
import { ApiError, cpfValido, diaSemana, hhmm, hojeISO, minutos, norm } from "./util.js";

const KEY = "caismed.db.v2";
const LATENCIA = 120;

// ---------- "Banco de dados" ----------
function semear() {
  const esp = ["Clínico geral", "Pediatria", "Cardiologia", "Dermatologia", "Ortopedia"].map((nome, i) => ({ id: i + 1, nome }));
  const clinicas = [
    { id: 1, nome: "CaisMed Boa Viagem", endereco: "Av. Boa Viagem, 1500", cidade: "Recife", telefone: "(81) 3333-1000" },
    { id: 2, nome: "CaisMed Olinda", endereco: "Rua do Amparo, 120", cidade: "Olinda", telefone: "(81) 3333-2000" },
  ];
  const prof = (id, nome, especialidadeId, clinicaIds) => ({ id, nome, registro: String(1000 + id), senha: "caismed123", email: `prof${id}@caismed.com`, especialidadeId, clinicaIds });
  const profissionais = [
    prof(1, "Dra. Helena Souza", 1, [1, 2]), prof(2, "Dr. Carlos Lima", 2, [1]), prof(3, "Dra. Marina Alves", 3, [2]),
    prof(4, "Dr. Rafael Costa", 4, [1, 2]), prof(5, "Dr. Paulo Mendes", 5, [1]),
  ];
  const disponibilidades = [];
  const add = (p, c, dias, inicio, fim) => dias.forEach((d) => disponibilidades.push({ id: disponibilidades.length + 1, profissionalId: p, clinicaId: c, diaSemana: d, inicio, fim }));
  add(1, 1, [1, 3], "08:00", "12:00"); add(1, 2, [2, 4], "13:00", "17:00"); add(2, 1, [1, 2, 3, 4, 5], "09:00", "12:00");
  add(3, 2, [2, 4], "08:00", "12:00"); add(4, 1, [3, 5], "13:00", "17:00"); add(4, 2, [1], "08:00", "11:00"); add(5, 1, [2, 4], "14:00", "18:00");
  return {
    seq: { esp: 6, cli: 3, prof: 6, disp: disponibilidades.length + 1, pac: 2, ag: 1 },
    admins: [{ id: 1, nome: "Administrador", login: "admin", senha: "admin123" }],
    especialidades: esp, clinicas, profissionais, disponibilidades,
    pacientes: [{ id: 1, nome: "Paciente Demo", cpf: "11144477735", nascimento: "1995-05-20", telefone: "(81) 99999-0000", email: "paciente@demo.com", cidade: "Recife", plano: "conforto", senha: "123456" }],
    agendamentos: [],
  };
}
const carregar = () => { try { const d = JSON.parse(localStorage.getItem(KEY)); if (d) return d; } catch {} const d = semear(); salvar(d); return d; };
const salvar = (db) => localStorage.setItem(KEY, JSON.stringify(db));

// ---------- Helpers ----------
const erro = (status, msg) => new ApiError(status, msg);
const exigir = (user, ...perfis) => { if (!user) throw erro(401, "Faça login para continuar."); if (!perfis.includes(user.perfil)) throw erro(403, "Você não tem permissão para essa ação."); };
const obrigatorios = (b, campos) => { for (const [k, rotulo] of campos) if (b[k] === undefined || b[k] === null || String(b[k]).trim() === "") throw erro(400, `Informe ${rotulo}.`); };
const semSenha = ({ senha, ...resto }) => resto;
const soDigitos = (s) => String(s || "").replace(/\D/g, "");

const vProf = (db, p) => ({
  ...semSenha(p),
  especialidadeNome: (db.especialidades.find((e) => e.id === p.especialidadeId) || {}).nome || "",
  clinicas: p.clinicaIds.map((id) => db.clinicas.find((c) => c.id === id)).filter(Boolean).map((c) => ({ id: c.id, nome: c.nome })),
});
const vAg = (db, a) => {
  const p = db.profissionais.find((x) => x.id === a.profissionalId) || {};
  return {
    ...a,
    pacienteNome: (db.pacientes.find((x) => x.id === a.pacienteId) || {}).nome || "Paciente removido",
    profissionalNome: p.nome || "", especialidadeId: p.especialidadeId,
    especialidadeNome: (db.especialidades.find((e) => e.id === p.especialidadeId) || {}).nome || "",
    clinicaNome: (db.clinicas.find((c) => c.id === a.clinicaId) || {}).nome || "",
  };
};

function horariosLivres(db, profId, clinicaId, data) {
  if (!data || data < hojeISO()) return [];
  const dia = diaSemana(data);
  const ocupados = new Set(db.agendamentos.filter((a) => a.profissionalId === profId && a.data === data && a.status === "agendado").map((a) => a.horario));
  const todos = new Set();
  db.disponibilidades.filter((d) => d.profissionalId === profId && d.clinicaId === clinicaId && d.diaSemana === dia)
    .forEach((d) => { for (let m = minutos(d.inicio); m + 30 <= minutos(d.fim); m += 30) todos.add(hhmm(m)); });
  const agora = data === hojeISO() ? new Date().getHours() * 60 + new Date().getMinutes() : -1;
  return [...todos].filter((h) => !ocupados.has(h) && minutos(h) > agora).sort();
}

// ---------- Rotas ----------
const rotas = [];
const rota = (metodo, padrao, fn) => rotas.push([metodo, new RegExp("^" + padrao.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "$"), fn]);

// Autenticação
rota("POST", "/auth/login", ({ db, body }) => {
  obrigatorios(body, [["login", "o CPF ou a matrícula"], ["senha", "a senha"]]);
  const login = String(body.login).trim(), dig = soDigitos(login);
  const admin = db.admins.find((a) => a.login === login.toLowerCase());
  const prof = db.profissionais.find((p) => p.registro === login);
  const pac = db.pacientes.find((p) => p.cpf === dig);
  const [u, perfil] = admin ? [admin, "admin"] : prof ? [prof, "profissional"] : pac ? [pac, "paciente"] : [null];
  if (!u || u.senha !== body.senha) throw erro(401, "Login ou senha incorretos.");
  return { token: "mock." + btoa(JSON.stringify({ id: u.id, perfil })), usuario: { id: u.id, nome: u.nome, perfil } };
});
function criarPaciente(db, b) {
  obrigatorios(b, [["nome", "o nome"], ["cpf", "o CPF"], ["nascimento", "a data de nascimento"], ["telefone", "o telefone"], ["email", "o e-mail"], ["cidade", "a cidade"]]);
  const cpf = soDigitos(b.cpf);
  if (!cpfValido(cpf)) throw erro(400, "CPF inválido.");
  if (db.pacientes.some((p) => p.cpf === cpf)) throw erro(409, "Já existe um paciente com este CPF.");
  if (!b.senha || String(b.senha).length < 6) throw erro(400, "A senha precisa ter pelo menos 6 caracteres.");
  const p = { id: db.seq.pac++, nome: b.nome.trim(), cpf, nascimento: b.nascimento, telefone: b.telefone, email: b.email, cidade: b.cidade, plano: b.plano || "", senha: b.senha };
  db.pacientes.push(p);
  return p;
}
rota("POST", "/auth/register", ({ db, body }) => {
  const p = criarPaciente(db, body); salvar(db);
  return { token: "mock." + btoa(JSON.stringify({ id: p.id, perfil: "paciente" })), usuario: { id: p.id, nome: p.nome, perfil: "paciente" } };
});
rota("POST", "/auth/recuperar-senha", ({ body }) => { obrigatorios(body, [["cpf", "o CPF"]]); return null; });

// Especialidades
rota("GET", "/especialidades", ({ db, user, query }) => {
  exigir(user, "paciente", "profissional", "admin");
  const b = norm(query.get("busca"));
  return db.especialidades.filter((e) => !b || norm(e.nome).includes(b)).sort((a, c) => a.nome.localeCompare(c.nome));
});
rota("POST", "/especialidades", ({ db, user, body }) => {
  exigir(user, "admin"); obrigatorios(body, [["nome", "o nome"]]);
  if (db.especialidades.some((e) => norm(e.nome) === norm(body.nome))) throw erro(409, "Essa especialidade já existe.");
  const e = { id: db.seq.esp++, nome: body.nome.trim() }; db.especialidades.push(e); salvar(db); return e;
});
rota("PUT", "/especialidades/:id", ({ db, user, body, params }) => {
  exigir(user, "admin"); obrigatorios(body, [["nome", "o nome"]]);
  const e = db.especialidades.find((x) => x.id === +params.id); if (!e) throw erro(404, "Especialidade não encontrada.");
  e.nome = body.nome.trim(); salvar(db); return e;
});
rota("DELETE", "/especialidades/:id", ({ db, user, params }) => {
  exigir(user, "admin");
  if (db.profissionais.some((p) => p.especialidadeId === +params.id)) throw erro(409, "Há profissionais usando esta especialidade.");
  db.especialidades = db.especialidades.filter((e) => e.id !== +params.id); salvar(db); return null;
});

// Clínicas
rota("GET", "/clinicas", ({ db, user, query }) => {
  exigir(user, "paciente", "profissional", "admin");
  const b = norm(query.get("busca"));
  return db.clinicas.filter((c) => !b || norm(`${c.nome} ${c.cidade} ${c.endereco}`).includes(b)).sort((a, c) => a.nome.localeCompare(c.nome));
});
const lerClinica = (b) => { obrigatorios(b, [["nome", "o nome"], ["endereco", "o endereço"], ["cidade", "a cidade"], ["telefone", "o telefone"]]); return { nome: b.nome.trim(), endereco: b.endereco, cidade: b.cidade, telefone: b.telefone }; };
rota("POST", "/clinicas", ({ db, user, body }) => { exigir(user, "admin"); const c = { id: db.seq.cli++, ...lerClinica(body) }; db.clinicas.push(c); salvar(db); return c; });
rota("PUT", "/clinicas/:id", ({ db, user, body, params }) => {
  exigir(user, "admin"); const c = db.clinicas.find((x) => x.id === +params.id); if (!c) throw erro(404, "Clínica não encontrada.");
  Object.assign(c, lerClinica(body)); salvar(db); return c;
});
rota("DELETE", "/clinicas/:id", ({ db, user, params }) => {
  exigir(user, "admin");
  if (db.profissionais.some((p) => p.clinicaIds.includes(+params.id))) throw erro(409, "Há profissionais associados a esta clínica.");
  db.clinicas = db.clinicas.filter((c) => c.id !== +params.id); salvar(db); return null;
});

// Profissionais
rota("GET", "/profissionais", ({ db, user, query }) => {
  exigir(user, "paciente", "profissional", "admin");
  const b = norm(query.get("busca")), cli = +query.get("clinicaId") || 0, esp = +query.get("especialidadeId") || 0;
  return db.profissionais.map((p) => vProf(db, p))
    .filter((p) => (!cli || p.clinicaIds.includes(cli)) && (!esp || p.especialidadeId === esp) && (!b || norm(`${p.nome} ${p.especialidadeNome} ${p.clinicas.map((c) => c.nome).join(" ")}`).includes(b)))
    .sort((a, c) => a.nome.localeCompare(c.nome));
});
rota("GET", "/profissionais/:id", ({ db, user, params }) => {
  exigir(user, "paciente", "profissional", "admin");
  const p = db.profissionais.find((x) => x.id === +params.id); if (!p) throw erro(404, "Profissional não encontrado."); return vProf(db, p);
});
function lerProf(db, b, atual) {
  obrigatorios(b, [["nome", "o nome"], ["registro", "a matrícula"], ["email", "o e-mail"], ["especialidadeId", "a especialidade"]]);
  if (!Array.isArray(b.clinicaIds) || !b.clinicaIds.length) throw erro(400, "Associe o profissional a pelo menos uma clínica.");
  if (!db.especialidades.some((e) => e.id === +b.especialidadeId)) throw erro(400, "Especialidade inválida.");
  if (b.clinicaIds.some((id) => !db.clinicas.some((c) => c.id === +id))) throw erro(400, "Clínica inválida.");
  if (db.profissionais.some((p) => p.registro === String(b.registro).trim() && (!atual || p.id !== atual.id))) throw erro(409, "Já existe um profissional com esta matrícula.");
  if (!atual && (!b.senha || b.senha.length < 6)) throw erro(400, "A senha precisa ter pelo menos 6 caracteres.");
  const dados = { nome: b.nome.trim(), registro: String(b.registro).trim(), email: b.email, especialidadeId: +b.especialidadeId, clinicaIds: b.clinicaIds.map(Number) };
  if (b.senha) dados.senha = b.senha;
  return dados;
}
rota("POST", "/profissionais", ({ db, user, body }) => { exigir(user, "admin"); const p = { id: db.seq.prof++, ...lerProf(db, body) }; db.profissionais.push(p); salvar(db); return vProf(db, p); });
rota("PUT", "/profissionais/:id", ({ db, user, body, params }) => {
  exigir(user, "admin"); const p = db.profissionais.find((x) => x.id === +params.id); if (!p) throw erro(404, "Profissional não encontrado.");
  Object.assign(p, lerProf(db, body, p));
  db.disponibilidades = db.disponibilidades.filter((d) => d.profissionalId !== p.id || p.clinicaIds.includes(d.clinicaId));
  salvar(db); return vProf(db, p);
});
rota("DELETE", "/profissionais/:id", ({ db, user, params }) => {
  exigir(user, "admin");
  if (db.agendamentos.some((a) => a.profissionalId === +params.id && a.status === "agendado")) throw erro(409, "O profissional tem consultas agendadas. Cancele-as antes.");
  db.profissionais = db.profissionais.filter((p) => p.id !== +params.id);
  db.disponibilidades = db.disponibilidades.filter((d) => d.profissionalId !== +params.id); salvar(db); return null;
});

// Disponibilidade (dias e horários)
const podeEditarDisp = (user, profId) => { exigir(user, "profissional", "admin"); if (user.perfil === "profissional" && user.id !== profId) throw erro(403, "Você só pode alterar a sua própria disponibilidade."); };
rota("GET", "/profissionais/:id/disponibilidades", ({ db, user, params }) => {
  exigir(user, "paciente", "profissional", "admin");
  return db.disponibilidades.filter((d) => d.profissionalId === +params.id).sort((a, b) => a.diaSemana - b.diaSemana || a.inicio.localeCompare(b.inicio));
});
rota("POST", "/profissionais/:id/disponibilidades", ({ db, user, body, params }) => {
  const profId = +params.id; podeEditarDisp(user, profId);
  const p = db.profissionais.find((x) => x.id === profId); if (!p) throw erro(404, "Profissional não encontrado.");
  obrigatorios(body, [["clinicaId", "a clínica"], ["diaSemana", "o dia da semana"], ["inicio", "o horário inicial"], ["fim", "o horário final"]]);
  const d = { clinicaId: +body.clinicaId, diaSemana: +body.diaSemana, inicio: body.inicio, fim: body.fim };
  if (!p.clinicaIds.includes(d.clinicaId)) throw erro(400, "O profissional não atende nesta clínica.");
  if (minutos(d.fim) - minutos(d.inicio) < 30) throw erro(400, "O horário final precisa ser pelo menos 30 minutos depois do inicial.");
  if (db.disponibilidades.some((x) => x.profissionalId === profId && x.diaSemana === d.diaSemana && minutos(x.inicio) < minutos(d.fim) && minutos(d.inicio) < minutos(x.fim))) throw erro(409, "Esse horário conflita com outro já cadastrado no mesmo dia.");
  const nova = { id: db.seq.disp++, profissionalId: profId, ...d }; db.disponibilidades.push(nova); salvar(db); return nova;
});
rota("DELETE", "/disponibilidades/:id", ({ db, user, params }) => {
  const d = db.disponibilidades.find((x) => x.id === +params.id); if (!d) throw erro(404, "Horário não encontrado.");
  podeEditarDisp(user, d.profissionalId);
  db.disponibilidades = db.disponibilidades.filter((x) => x.id !== d.id); salvar(db); return null;
});
rota("GET", "/profissionais/:id/horarios", ({ db, user, params, query }) => {
  exigir(user, "paciente", "profissional", "admin");
  return { horarios: horariosLivres(db, +params.id, +query.get("clinicaId"), query.get("data")) };
});

// Pacientes
rota("GET", "/pacientes", ({ db, user, query }) => {
  exigir(user, "admin"); const b = norm(query.get("busca")), dig = soDigitos(query.get("busca"));
  return db.pacientes.filter((p) => !b || norm(p.nome).includes(b) || (dig && p.cpf.includes(dig))).map(semSenha).sort((a, c) => a.nome.localeCompare(c.nome));
});
const meuOuAdmin = (user, id) => { exigir(user, "paciente", "admin"); if (user.perfil === "paciente" && user.id !== id) throw erro(403, "Você só pode acessar os seus próprios dados."); };
rota("GET", "/pacientes/:id", ({ db, user, params }) => {
  meuOuAdmin(user, +params.id); const p = db.pacientes.find((x) => x.id === +params.id); if (!p) throw erro(404, "Paciente não encontrado."); return semSenha(p);
});
rota("POST", "/pacientes", ({ db, user, body }) => { exigir(user, "admin"); const p = criarPaciente(db, body); salvar(db); return semSenha(p); });
rota("PUT", "/pacientes/:id", ({ db, user, body, params }) => {
  meuOuAdmin(user, +params.id); const p = db.pacientes.find((x) => x.id === +params.id); if (!p) throw erro(404, "Paciente não encontrado.");
  obrigatorios(body, [["nome", "o nome"], ["cpf", "o CPF"], ["telefone", "o telefone"], ["email", "o e-mail"], ["cidade", "a cidade"]]);
  const cpf = soDigitos(body.cpf);
  if (!cpfValido(cpf)) throw erro(400, "CPF inválido.");
  if (db.pacientes.some((x) => x.cpf === cpf && x.id !== p.id)) throw erro(409, "Já existe um paciente com este CPF.");
  Object.assign(p, { nome: body.nome.trim(), cpf, nascimento: body.nascimento || p.nascimento, telefone: body.telefone, email: body.email, cidade: body.cidade, plano: body.plano ?? p.plano });
  if (body.senha) { if (body.senha.length < 6) throw erro(400, "A senha precisa ter pelo menos 6 caracteres."); p.senha = body.senha; }
  salvar(db); return semSenha(p);
});
rota("DELETE", "/pacientes/:id", ({ db, user, params }) => {
  meuOuAdmin(user, +params.id);
  db.pacientes = db.pacientes.filter((p) => p.id !== +params.id);
  db.agendamentos = db.agendamentos.filter((a) => a.pacienteId !== +params.id); salvar(db); return null;
});

// Agendamentos
rota("GET", "/agendamentos", ({ db, user, query }) => {
  exigir(user, "paciente", "profissional", "admin");
  const st = query.get("status");
  return db.agendamentos
    .filter((a) => (user.perfil === "admin") || (user.perfil === "paciente" ? a.pacienteId === user.id : a.profissionalId === user.id))
    .filter((a) => !st || a.status === st)
    .sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario)).map((a) => vAg(db, a));
});
rota("GET", "/agendamentos/:id", ({ db, user, params }) => {
  exigir(user, "paciente", "profissional", "admin");
  const a = db.agendamentos.find((x) => x.id === +params.id); if (!a) throw erro(404, "Agendamento não encontrado.");
  if ((user.perfil === "paciente" && a.pacienteId !== user.id) || (user.perfil === "profissional" && a.profissionalId !== user.id)) throw erro(403, "Você não tem acesso a este agendamento.");
  return vAg(db, a);
});
rota("POST", "/agendamentos", ({ db, user, body }) => {
  exigir(user, "paciente", "admin");
  obrigatorios(body, [["clinicaId", "a clínica"], ["profissionalId", "o profissional"], ["data", "a data"], ["horario", "o horário"]]);
  const pacienteId = user.perfil === "paciente" ? user.id : +body.pacienteId;
  if (!db.pacientes.some((p) => p.id === pacienteId)) throw erro(400, "Paciente inválido.");
  const prof = db.profissionais.find((p) => p.id === +body.profissionalId);
  if (!prof || !prof.clinicaIds.includes(+body.clinicaId)) throw erro(400, "Este profissional não atende na clínica escolhida.");
  if (!horariosLivres(db, prof.id, +body.clinicaId, body.data).includes(body.horario)) throw erro(409, "Esse horário não está mais disponível. Escolha outro.");
  const a = { id: db.seq.ag++, pacienteId, profissionalId: prof.id, clinicaId: +body.clinicaId, data: body.data, horario: body.horario, status: "agendado", triagem: body.triagem || null, criadoEm: new Date().toISOString() };
  db.agendamentos.push(a); salvar(db); return vAg(db, a);
});
rota("PATCH", "/agendamentos/:id", ({ db, user, body, params }) => {
  exigir(user, "paciente", "profissional", "admin");
  const a = db.agendamentos.find((x) => x.id === +params.id); if (!a) throw erro(404, "Agendamento não encontrado.");
  if ((user.perfil === "paciente" && a.pacienteId !== user.id) || (user.perfil === "profissional" && a.profissionalId !== user.id)) throw erro(403, "Você não tem acesso a este agendamento.");
  if (a.status !== "agendado") throw erro(409, "Este agendamento já foi finalizado.");
  if (!["cancelado", "concluido"].includes(body.status)) throw erro(400, "Status inválido.");
  if (body.status === "concluido" && user.perfil === "paciente") throw erro(403, "Só o profissional pode concluir o atendimento.");
  a.status = body.status; salvar(db); return vAg(db, a);
});

// ---------- Despachante ----------
export async function mockRequest(metodo, caminho, body, token) {
  await new Promise((r) => setTimeout(r, LATENCIA));
  const url = new URL(caminho, "http://mock");
  let user = null;
  if (token && token.startsWith("mock.")) { try { user = JSON.parse(atob(token.slice(5))); } catch {} }
  const db = carregar();
  for (const [m, re, fn] of rotas) {
    const achou = m === metodo && re.exec(url.pathname);
    if (!achou) continue;
    if (!user && !url.pathname.startsWith("/auth/")) throw erro(401, "Sessão expirada. Entre novamente.");
    const r = fn({ db, user, body: body || {}, params: achou.groups || {}, query: url.searchParams });
    return r === undefined ? null : JSON.parse(JSON.stringify(r));
  }
  throw erro(404, "Rota não encontrada.");
}
