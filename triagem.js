// Triagem via chatbot (regras simples; a IA real entra em escolherEspecialidade()).
import { SEND_SVG, esc } from "../ui.js";

const PERGUNTAS = [
  { id: "motivo", tipo: "texto", pergunta: "Oi! Antes da sua consulta, vou te fazer algumas perguntas rápidas. Qual o motivo que te trouxe até aqui?", placeholder: "Ex.: dor de cabeça, retorno, exame..." },
  { id: "sintomas", tipo: "multipla", pergunta: "Você está sentindo algum desses sintomas? Pode marcar mais de um.", opcoes: [["febre", "Febre"], ["tosse", "Tosse"], ["dor_cabeca", "Dor de cabeça"], ["dor_corpo", "Dor no corpo"], ["falta_ar", "Falta de ar"], ["nausea", "Náusea"]] },
  { id: "urgencia", tipo: "unica", pergunta: "Como você classificaria a urgência disso?", opcoes: [["baixa", "Baixa"], ["media", "Média"], ["alta", "Alta"]] },
  { id: "observacoes", tipo: "texto-opcional", pergunta: "Quer contar mais algum detalhe? Se não tiver nada, é só pular.", placeholder: "Observações (opcional)" },
];
const ESPECIALIDADES = { clinico_geral: "Clínico geral", pediatria: "Pediatria", cardiologia: "Cardiologia", dermatologia: "Dermatologia" };

// TODO (IA): trocar por uma chamada ao serviço de IA, ex.: `return await api.post("/triagem", respostas)`.
function escolherEspecialidade(r) {
  const t = (r.motivo || "").toLowerCase();
  if (/crianc|filho|filha|beb/.test(t)) return "pediatria";
  if (/pele|mancha|alergia|coceira/.test(t)) return "dermatologia";
  if ((r.sintomas || []).includes("falta_ar")) return "cardiologia";
  return "clinico_geral";
}

export default function (root, { ir }) {
  root.classList.add("chat-body");
  root.innerHTML = `<p class="intro-text left">Triagem</p><div class="chat-messages" id="msgs" role="log" aria-live="polite"></div><div class="chat-input-area" id="entrada"></div><p class="aviso">A triagem não substitui uma consulta médica.</p>`;
  const msgs = root.querySelector("#msgs"), entrada = root.querySelector("#entrada");
  const respostas = {}; let passo = 0;

  const add = (txt, autor) => { const d = document.createElement("div"); d.className = `msg msg-${autor}`; d.textContent = txt; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; };
  const addAudio = (url) => { const d = document.createElement("div"); d.className = "msg msg-user"; d.innerHTML = `<audio controls src="${url}"></audio>`; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; };
  const avancar = () => { passo++; render(); };

  function criarMic(onAudio) {
    const b = document.createElement("button"); b.type = "button"; b.className = "chat-mic"; b.title = "Enviar áudio"; b.setAttribute("aria-label", "Gravar áudio");
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
    let rec, chunks = [], t0, timer;
    b.onclick = async () => {
      if (rec && rec.state === "recording") return rec.stop();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        rec = new MediaRecorder(stream); chunks = [];
        rec.ondataavailable = (e) => chunks.push(e.data);
        rec.onstop = () => { clearInterval(timer); stream.getTracks().forEach((t) => t.stop()); b.classList.remove("rec"); b.innerHTML = ""; onAudio(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType }))); };
        rec.start(); t0 = Date.now(); b.classList.add("rec");
        timer = setInterval(() => { b.textContent = Math.floor((Date.now() - t0) / 1000) + "s"; }, 500);
      } catch { alert("Não foi possível acessar o microfone. Libere a permissão no navegador."); }
    };
    return b;
  }

  function render() {
    entrada.innerHTML = "";
    if (passo >= PERGUNTAS.length) {
      const esp = escolherEspecialidade(respostas);
      add(`Com base no que você me contou, o mais indicado é uma consulta de ${ESPECIALIDADES[esp]}. Toque no botão abaixo para escolher clínica, profissional, dia e horário.`, "bot");
      sessionStorage.setItem("caismed.triagem", JSON.stringify({ ...respostas, especialidadeSugerida: ESPECIALIDADES[esp] }));
      const a = document.createElement("a"); a.className = "btn"; a.href = `#/agendar?especialidade=${esp}`; a.textContent = `Agendar ${ESPECIALIDADES[esp]}`;
      entrada.appendChild(a); return;
    }
    const p = PERGUNTAS[passo];
    add(p.pergunta, "bot");
    if (p.tipo === "texto" || p.tipo === "texto-opcional") {
      const row = document.createElement("div"); row.className = "chat-send-row";
      const input = document.createElement("input"); input.type = "text"; input.className = "chat-text-input"; input.placeholder = p.placeholder || ""; input.setAttribute("aria-label", p.pergunta);
      const enviar = () => { const v = input.value.trim(); if (!v && p.tipo === "texto") return; respostas[p.id] = v; add(v || "Pular", "user"); avancar(); };
      input.onkeydown = (e) => { if (e.key === "Enter") enviar(); };
      const send = document.createElement("button"); send.type = "button"; send.className = "chat-send-btn"; send.setAttribute("aria-label", "Enviar"); send.innerHTML = SEND_SVG; send.onclick = enviar;
      row.append(input, criarMic((url) => { respostas[p.id] = "[Áudio enviado]"; addAudio(url); avancar(); }), send);
      entrada.appendChild(row);
      if (p.tipo === "texto-opcional") {
        const pular = document.createElement("button"); pular.type = "button"; pular.className = "secondary-link"; pular.textContent = "Pular";
        pular.onclick = () => { respostas[p.id] = ""; add("Pular", "user"); avancar(); }; entrada.appendChild(pular);
      }
      input.focus();
    }
    if (p.tipo === "multipla") {
      const sel = new Set(), chips = document.createElement("div"); chips.className = "chat-chips";
      p.opcoes.forEach(([v, l]) => { const c = document.createElement("button"); c.type = "button"; c.className = "chat-chip"; c.textContent = l; c.setAttribute("aria-pressed", "false");
        c.onclick = () => { sel.has(v) ? sel.delete(v) : sel.add(v); c.classList.toggle("selected", sel.has(v)); c.setAttribute("aria-pressed", sel.has(v)); }; chips.appendChild(c); });
      const ok = document.createElement("button"); ok.type = "button"; ok.className = "btn"; ok.textContent = "Confirmar";
      ok.onclick = () => { respostas[p.id] = [...sel]; add(sel.size ? p.opcoes.filter(([v]) => sel.has(v)).map(([, l]) => l).join(", ") : "Nenhum sintoma informado", "user"); avancar(); };
      entrada.append(chips, ok);
    }
    if (p.tipo === "unica") {
      const chips = document.createElement("div"); chips.className = "chat-chips";
      p.opcoes.forEach(([v, l]) => { const c = document.createElement("button"); c.type = "button"; c.className = "chat-chip"; c.textContent = l; c.onclick = () => { respostas[p.id] = v; add(l, "user"); avancar(); }; chips.appendChild(c); });
      entrada.appendChild(chips);
    }
  }
  render();
}
