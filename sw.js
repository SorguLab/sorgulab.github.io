// SorguLab service worker: tüm dosyaları cihaza kaydeder, sonra internetsiz çalışır.
const SURUM = 'sa-722210e7c2';
const DOSYALAR = [
 "./",
 "index.html",
 "manifest.webmanifest",
 "apple-touch-icon.png",
 "bricolage-grotesque-latin-600-normal.woff2",
 "bricolage-grotesque-latin-700-normal.woff2",
 "bricolage-grotesque-latin-ext-600-normal.woff2",
 "bricolage-grotesque-latin-ext-700-normal.woff2",
 "fonts.css",
 "ibm-plex-sans-latin-400-normal.woff2",
 "ibm-plex-sans-latin-500-normal.woff2",
 "ibm-plex-sans-latin-600-normal.woff2",
 "ibm-plex-sans-latin-ext-400-normal.woff2",
 "ibm-plex-sans-latin-ext-500-normal.woff2",
 "ibm-plex-sans-latin-ext-600-normal.woff2",
 "icon-192.png",
 "icon-512.png",
 "icon-maskable-512.png",
 "jetbrains-mono-latin-400-normal.woff2",
 "jetbrains-mono-latin-500-normal.woff2",
 "jetbrains-mono-latin-ext-400-normal.woff2",
 "jetbrains-mono-latin-ext-500-normal.woff2",
 "konular.json",
 "paket-numpy.wasm",
 "paket-pandas.wasm",
 "paket-python_dateutil.wasm",
 "paket-pytz.wasm",
 "paket-six.wasm",
 "pyodide-lock.json",
 "pyodide.asm.js",
 "pyodide.asm.wasm",
 "pyodide.js",
 "python_stdlib.wasm",
 "sql-asm.js",
 "veri-flo.json",
 "veri-hr.json",
 "veri-northwind.json",
 "veri-ornek.json",
 "veri-titanic.json",
 "xlsx.full.min.js"
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(SURUM).then(c => c.addAll(DOSYALAR)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('sa-') && k !== SURUM).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Sayfanın kendisi (index.html): önce ağ (en güncel sürüm), 4 sn'de yanıt yoksa ya da çevrimdışıysa önbellek.
// Diğer dosyalar (Python motoru, fontlar...): önce önbellek.
const agdanSayfa = (req, c) => Promise.race([
  fetch(req, { cache: 'no-cache' }).then(r => { if (r.ok) c.put('./index.html', r.clone()); return r; }),
  new Promise((_, red) => setTimeout(() => red(new Error('zaman aşımı')), 4000))
]);
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  const sayfa = e.request.mode === 'navigate' || url.pathname.endsWith('/index.html');
  e.respondWith(caches.open(SURUM).then(c => {
    if (sayfa) return agdanSayfa(e.request, c).catch(() => c.match('./index.html'));
    return c.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request));
  }));
});
