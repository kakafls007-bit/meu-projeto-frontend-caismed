// Service worker do CaisMed: deixa o app instalável e abrindo mesmo sem internet.
// Troque o número da versão sempre que publicar mudanças, para o navegador baixar os arquivos novos.
const VERSAO = "caismed-v3";
const ARQUIVOS = [
  "./", "./index.html", "./offline.html", "./style.css", "./manifest.webmanifest",
  "./icons/icon.svg", "./icons/icon-192.png", "./icons/icon-512.png",
  "./js/app.js", "./js/api.js", "./js/config.js", "./js/mock-api.js", "./js/session.js", "./js/ui.js", "./js/util.js",
  ...["login", "cadastro", "recuperar", "home", "explorar", "agendar", "consultas", "perfil", "triagem", "carteirinha", "pagamento", "agenda", "horarios", "admin", "_triagem-rotulos"].map((v) => `./js/views/${v}.js`),
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  // Só mexe em arquivos do próprio app. Chamadas à API (outra origem ou outros métodos) passam direto.
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("./index.html").then((r) => r || caches.match("./offline.html"))));
    return;
  }
  // Demais arquivos: responde do cache e atualiza em segundo plano
  e.respondWith(caches.match(req).then((cache) => {
    const rede = fetch(req).then((res) => { if (res.ok) caches.open(VERSAO).then((c) => c.put(req, res.clone())); return res; }).catch(() => cache);
    return cache || rede;
  }));
});
