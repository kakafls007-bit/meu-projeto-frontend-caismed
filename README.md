# CaisMed - Front-end (PWA)

Sistema de agendamento de consultas em clínicas. Aplicação de página única (HTML + CSS + JavaScript puro, sem build), instalável como PWA e pronta para consumir uma API REST.

## Como rodar

O app usa módulos ES, então precisa de um servidor (não abre por `file://`). Use a extensão **Live Server** do VS Code (porta 5502, já em `settings.json`) ou `python3 -m http.server`. Abra `index.html`.

Para publicar (Netlify, Vercel, GitHub Pages), basta enviar a pasta inteira. Sempre que publicar mudanças, aumente o número de `VERSAO` em `sw.js`.

## Ligando ao back-end

Tudo passa por `js/api.js`. Em `js/config.js`:

```js
export const API_BASE_URL = "";                      // vazio = API SIMULADA (localStorage, para demonstração)
export const API_BASE_URL = "https://sua-api.com";   // back-end real
```

A API simulada (`js/mock-api.js`) implementa as mesmas rotas abaixo, com as mesmas regras e códigos de erro. **Para o requisito de persistência em banco, o back-end precisa implementar este contrato** (ou ajuste `js/api.js` e as telas ao contrato do seu back-end). Autenticação: `Authorization: Bearer <token>`. Erros: JSON com `{ "message": "texto em português" }` e o status HTTP adequado (400, 401, 403, 404, 409).

| Recurso | Rotas | Quem pode |
|---|---|---|
| Login | `POST /auth/login` `{login, senha}` → `{token, usuario:{id,nome,perfil}}` (login = CPF, matrícula ou usuário admin; `perfil` = `paciente`, `profissional` ou `admin`) | público |
| Cadastro do paciente | `POST /auth/register` → `{token, usuario}` | público |
| Recuperar senha | `POST /auth/recuperar-senha` `{cpf}` → 204 | público |
| Especialidades | `GET /especialidades?busca=` · `POST` · `PUT /:id` · `DELETE /:id` | leitura: logado · escrita: admin |
| Clínicas | `GET /clinicas?busca=` · `POST` · `PUT /:id` · `DELETE /:id` | leitura: logado · escrita: admin |
| Profissionais | `GET /profissionais?busca=&clinicaId=&especialidadeId=` · `GET /:id` · `POST` · `PUT /:id` · `DELETE /:id` | leitura: logado · escrita: admin |
| Disponibilidade | `GET /profissionais/:id/disponibilidades` · `POST /profissionais/:id/disponibilidades` `{clinicaId, diaSemana(0-6), inicio, fim}` · `DELETE /disponibilidades/:id` | escrita: admin ou o próprio profissional |
| Horários livres | `GET /profissionais/:id/horarios?clinicaId=&data=YYYY-MM-DD` → `{horarios:["08:00",...]}` (blocos de 30 min, sem os já agendados) | logado |
| Pacientes | `GET /pacientes?busca=` (admin) · `GET/PUT/DELETE /pacientes/:id` (admin ou o próprio) · `POST /pacientes` (admin) | |
| Agendamentos | `GET /agendamentos?status=` (paciente vê os seus, profissional os dele, admin todos) · `POST` `{clinicaId, profissionalId, data, horario, triagem?}` · `PATCH /:id` `{status:"cancelado"\|"concluido"}` | |

Formato dos objetos (campos que o front usa):

- `profissional`: `id, nome, registro, email, especialidadeId, especialidadeNome, clinicaIds[], clinicas[{id,nome}]`
- `agendamento`: `id, data, horario, status("agendado"|"concluido"|"cancelado"), pacienteId, pacienteNome, profissionalId, profissionalNome, clinicaId, clinicaNome, especialidadeNome, triagem`
- `paciente`: `id, nome, cpf, nascimento, telefone, email, cidade, plano`

Regras que o back-end deve garantir (a simulada já faz): CPF válido e único, matrícula única, horário só dentro da disponibilidade, 409 se o horário já foi ocupado, conflito de horários na mesma agenda, só o dono (ou admin) altera/cancela, só o profissional conclui.

## Telas por perfil

- **Paciente**: cadastro, login, início, buscar profissionais (nome, clínica, especialidade) e clínicas, agendar (clínica → especialidade → profissional → data → horário), minhas consultas com cancelamento, perfil (editar e excluir conta), triagem por chatbot, carteirinha e pagamentos.
- **Profissional**: agenda (concluir ou cancelar atendimentos, ver triagem) e cadastro dos próprios dias e horários.
- **Administrador**: CRUD com pesquisa de clínicas, profissionais (com clínicas associadas e horários), especialidades e pacientes, e todos os agendamentos.

## Acessos de demonstração (API simulada)

| Perfil | Login | Senha |
|---|---|---|
| Paciente | CPF `11144477735` | `123456` |
| Profissional | matrícula `1001` | `caismed123` |
| Administrador | `admin` | `admin123` |

## Estrutura

```
index.html · style.css · manifest.webmanifest · sw.js · offline.html · icons/
js/app.js        roteador por hash (#/rota), guarda de perfis, layout
js/api.js        cliente REST único
js/mock-api.js   API simulada (mesmas rotas)
js/session.js    token e usuário logado
js/ui.js         componentes: toast, diálogo, formulários, abas, acessibilidade
js/views/*.js    uma tela por arquivo
```

## Acessibilidade e PWA

Navegação por teclado, link "ir para o conteúdo", rótulos em todos os campos, abas e diálogos com ARIA, mensagens anunciadas por leitor de tela, tema claro/escuro e tamanho do texto ajustáveis (ícone de acessibilidade no topo), respeito a `prefers-reduced-motion`. PWA com manifesto, ícones, service worker (funciona offline para as telas já carregadas) e instalável.
