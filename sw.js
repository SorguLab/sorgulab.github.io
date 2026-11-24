// SorguLab service worker: dosyaları cihaza kaydeder, sonra internetsiz çalışır.
// Her dosya içeriğinin özetiyle (hash) saklanır: yeni sürümde sadece DEĞİŞEN dosyalar iner (Python motoru tekrar inmez).
const SURUM = 'sa-57c98ac21f';
const DOSYALAR = {
 "index.html": "3faeee9533",
 "manifest.webmanifest": "2eb9d20212",
 "apple-touch-icon.png": "a597da367f",
 "bricolage-grotesque-latin-600-normal.woff2": "b34fc8c1ef",
 "bricolage-grotesque-latin-700-normal.woff2": "4c373ce3c1",
 "bricolage-grotesque-latin-ext-600-normal.woff2": "9903537bd1",
 "bricolage-grotesque-latin-ext-700-normal.woff2": "25d714d702",
 "fonts.css": "e4ba14eba9",
 "ibm-plex-sans-latin-400-normal.woff2": "3b646991d3",
 "ibm-plex-sans-latin-500-normal.woff2": "0717336fb3",
 "ibm-plex-sans-latin-600-normal.woff2": "8960851d69",
 "ibm-plex-sans-latin-ext-400-normal.woff2": "c93d2a12aa",
 "ibm-plex-sans-latin-ext-500-normal.woff2": "2846035d85",
 "ibm-plex-sans-latin-ext-600-normal.woff2": "b25dfd4f97",
 "icon-192.png": "084898eef7",
 "icon-512.png": "2206bd6e7f",
 "icon-maskable-512.png": "dbe7b6e7d5",
 "jetbrains-mono-latin-400-normal.woff2": "14425ba9c6",
 "jetbrains-mono-latin-500-normal.woff2": "cb182feeed",
 "jetbrains-mono-latin-ext-400-normal.woff2": "505dfba8ec",
 "jetbrains-mono-latin-ext-500-normal.woff2": "879df9319f",
 "konular.json": "c68463d8bb",
 "paket-numpy.wasm": "41c1f62e8b",
 "paket-pandas.wasm": "8705e2e378",
 "paket-python_dateutil.wasm": "cd2f76132e",
 "paket-pytz.wasm": "0a56642bb5",
 "paket-six.wasm": "132e601473",
 "pyodide-lock.json": "832bef56fd",
 "pyodide.asm.js": "919560652e",
 "pyodide.asm.wasm": "b7e66a1942",
 "pyodide.js": "c006910762",
 "python_stdlib.wasm": "72894522b7",
 "sql-asm.js": "be591a3c6b",
 "veri-flo.json": "def3e023c4",
 "veri-hr.json": "e7bd21d63f",
 "veri-northwind.json": "14c4818147",
 "veri-ornek.json": "81be6babc3",
 "veri-titanic.json": "6265debcc7",
 "xlsx.full.min.js": "c9506197ca"
};   // { yol: hash }
const DEPO = 'sorgulab-v2';
const anahtar = yol => new URL(yol + '?h=' + DOSYALAR[yol], self.registration.scope).href;
self.addEventListener('install', e => {
  e.waitUntil(caches.open(DEPO).then(async c => {
    const eksik = [];
    for (const yol of Object.keys(DOSYALAR)) if (!(await c.match(anahtar(yol)))) eksik.push(yol);
    for (let i = 0; i < eksik.length; i += 6) {
      await Promise.all(eksik.slice(i, i + 6).map(yol => fetch(new URL(yol, self.registration.scope).href, { cache: 'no-cache' }).then(r => {
        if (!r.ok) throw new Error(yol + ' indirilemedi (' + r.status + ')');
        return c.put(anahtar(yol), r);
      })));
    }
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('sa-')) await caches.delete(k);  // eski biçim
    const c = await caches.open(DEPO), gecerli = new Set(Object.keys(DOSYALAR).map(anahtar));
    for (const r of await c.keys()) if (!gecerli.has(r.url)) await c.delete(r);
    await self.clients.claim();
  })());
});
function yolBul(url) {
  let yol = url.pathname.slice(new URL(self.registration.scope).pathname.length);
  if (yol === '') yol = 'index.html';
  return DOSYALAR[yol] ? yol : null;
}
// Sayfanın kendisi: önce ağ (en güncel sürüm), 6 sn'de yanıt yoksa ya da çevrimdışıysa önbellek. Diğer dosyalar: önce önbellek.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  const sayfa = e.request.mode === 'navigate';
  const yol = sayfa ? 'index.html' : yolBul(url);
  if (!yol) return;
  e.respondWith(caches.open(DEPO).then(c => {
    const yedek = () => c.match(anahtar(yol)).then(r => r || fetch(e.request));
    if (!sayfa) return yedek();
    return Promise.race([
      fetch(url.href, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(r.status); return r; }),
      new Promise((_, red) => setTimeout(() => red(new Error('zaman aşımı')), 6000))
    ]).catch(yedek);
  }));
});
