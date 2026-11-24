"""SorguLab derleme betiği.

Kullanım (repo kökünden):
    python3 kaynak/build.py
Üretir:
    index.html, sw.js, manifest.webmanifest   -> repo kökü (iPad / GitHub Pages sürümü)
    veri-<key>.json                           -> repo kökü, her hazır veri seti ayrı dosya (kaynak/veri/<key>.json'dan)
    kaynak/cikti/claude-ai.html               -> claude.ai artifact sürümü (git'e girmez)

Python motoru, kütüphaneler, fontlar ve ikonlar repo kökünde düz (klasörsüz) durur.
"""
import json, re, os, glob, hashlib, shutil, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import konu_derle

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(KOK, 'kaynak', 'src')
CIKTI = os.path.join(KOK, 'kaynak', 'cikti')


def katalog_oku():
    return json.load(open(os.path.join(KOK, 'kaynak', 'veri_setleri.json'), encoding='utf-8'))


def veri_dosyalari_yaz(katalog):
    """Her hazır veri setini köke ayrı bir dosya olarak yazar (veri-<key>.json) ve küçük bir özet (meta) döner."""
    metalar = {}
    for v in katalog:
        veri = json.load(open(os.path.join(KOK, 'kaynak', 'veri', v['key'] + '.json'), encoding='utf-8'))
        with open(os.path.join(KOK, 'veri-' + v['key'] + '.json'), 'w', encoding='utf-8') as f:
            json.dump(veri, f, ensure_ascii=False, separators=(',', ':'))
        metalar[v['key']] = {t: {'columns': o['columns'], 'types': o['types'], 'n': len(o['rows'])} for t, o in veri.items()}
    return metalar


def birlestir(katalog, metalar, konu_ozet):
    t = open(os.path.join(SRC, 'template.html'), encoding='utf-8').read()
    dosyalar = ['bank.js'] + [d for v in katalog for d in v['dosyalar']]
    parcalar = []
    for f in dosyalar:
        s = open(os.path.join(SRC, f), encoding='utf-8').read()
        s = re.sub(r"\nif \(typeof module !== 'undefined'\).*\n?", "\n", s)
        assert '</script' not in s, f
        parcalar.append(s)
    ogeler = []
    for v in katalog:
        alan = {k: v[k] for k in ('key', 'ad', 'etiket', 'aciklama', 'varsayilan', 'ornekler', 'ilk_soru')}
        alan['dosya'] = 'veri-' + v['key'] + '.json'
        alan['meta'] = metalar[v['key']]
        js = json.dumps(alan, ensure_ascii=False)
        ogeler.append(js[:-1] + ', "sorular": [].concat(' + ', '.join(v['bankalar']) + ')}')
    kat = 'const VERI_KATALOG = [\n' + ',\n'.join(ogeler) + '\n];\nconst KONU_OZET = ' + json.dumps([dict(k, dil=next(g['dil'] for g in konu_derle.GRUPLAR if g['id'] == k['grup'])) for k in konu_ozet], ensure_ascii=False) + ';'
    app = open(os.path.join(SRC, 'app.js'), encoding='utf-8').read()
    assert '</script' not in app
    t = t.replace('/*BANKALAR*/', '\n'.join(parcalar)).replace('/*KATALOG*/', kat).replace('/*APP*/', app)
    return t.replace('/*HELPER*/', json.dumps(open(os.path.join(SRC, 'helper.py'), encoding='utf-8').read()))


PWA_BAS = '''<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#2453c8">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="SorguLab">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="icon" type="image/png" href="icon-192.png">
'''

PWA_KAYIT = '''<script>
(function () {
  if (!('serviceWorker' in navigator)) return;
  // Normalde görünür bir rozet yok. Yeni sürüm hazır olunca (sadece değişen dosyalar iner, birkaç saniye) "Yenile" düğmesi çıkar.
  var vardi = !!navigator.serviceWorker.controller, gosterildi = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (!vardi || gosterildi) { vardi = true; return; }
    gosterildi = true;
    var b = document.createElement('button'); b.className = 'hap'; b.id = 'cevrimdisi'; b.type = 'button';
    b.textContent = 'Yeni sürüm hazır · Yenile'; b.style.cssText = 'color:var(--uyari);cursor:pointer;font:inherit;font-size:12.5px';
    b.onclick = function () { location.reload(); };
    document.querySelector('.ust-sag').appendChild(b);
  });
  navigator.serviceWorker.register('./sw.js').then(function (reg) {
    document.addEventListener('visibilitychange', function () { if (!document.hidden) reg.update().catch(function () {}); });
    return navigator.serviceWorker.ready;
  }).then(function () {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
  }).catch(function (e) { console.warn('Çevrimdışı kurulamadı', e); });
})();
</script>
'''

SW = """// SorguLab service worker: dosyaları cihaza kaydeder, sonra internetsiz çalışır.
// Her dosya içeriğinin özetiyle (hash) saklanır: yeni sürümde sadece DEĞİŞEN dosyalar iner (Python motoru tekrar inmez).
const SURUM = '__SURUM__';
const DOSYALAR = __DOSYALAR__;   // { yol: hash }
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
"""


def pwa(t):
    t = re.sub(r'<link rel="preconnect"[^>]*>\n', '', t)
    t = re.sub(r'<link href="https://fonts.googleapis.com[^>]*>', '<link rel="stylesheet" href="fonts.css">', t)
    t = t.replace('https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-asm.js', 'sql-asm.js')
    t = t.replace('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'xlsx.full.min.js')
    a = "const PY_KAYNAKLAR = [new URL('pyodide/', location.href).href, 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'];"
    assert a in t, 'PY_KAYNAKLAR satırı bulunamadı'
    t = t.replace(a, "const PY_KAYNAKLAR = [new URL('./', location.href).href];")
    t = t.replace('<title>SorguLab</title>\n', '<title>SorguLab</title>\n' + PWA_BAS, 1)
    t = t.replace('</body>', PWA_KAYIT + '</body>')
    # Ziyaretçi sayacı (GoatCounter: çerezsiz, kişisel veri yok) — sadece sorgulab.com sürümünde. Sayfa adlarını app.js sayfaSay() gönderir.
    t = t.replace('</body>', '<script data-goatcounter="https://sorgulab.goatcounter.com/count" data-goatcounter-settings=\'{"no_onload": true}\' async src="https://gc.zgo.at/count.js" onload="window.sayfaSay && window.sayfaSay()"></script>\n</body>')
    assert 'fonts.googleapis' not in t and 'cdnjs' not in t
    return t


def main():
    katalog = katalog_oku()
    metalar = veri_dosyalari_yaz(katalog)
    # Konular, uygulamadaki Pyodide ile aynı pandas/numpy sürümüyle derlenir (bkz. konu_derle.py başı)
    py = os.environ.get('KONU_PYTHON') or next((p for p in [os.path.expanduser('~/konu-venv/bin/python'), '/home/claude/konu-venv/bin/python'] if os.path.exists(p)), sys.executable)
    r = subprocess.run([py, os.path.join(KOK, 'kaynak', 'konu_derle.py')], capture_output=True, text=True)
    print(r.stdout.strip())
    if r.returncode != 0:
        sys.exit(r.stdout + r.stderr)
    kj = json.load(open(os.path.join(KOK, 'konular.json'), encoding='utf-8'))
    konu = {'adet': len(kj['konular']), 'ozet': [{k: x[k] for k in ('id', 'grup', 'baslik')} | ({'alistirma': x['alistirma']} if 'alistirma' in x else {}) for x in kj['konular']]}
    t = birlestir(katalog, metalar, konu['ozet'])
    os.makedirs(CIKTI, exist_ok=True)
    open(os.path.join(CIKTI, 'claude-ai.html'), 'w', encoding='utf-8').write(t)
    open(os.path.join(KOK, 'index.html'), 'w', encoding='utf-8').write(pwa(t))
    for f in glob.glob(os.path.join(SRC, 'ikon', '*.png')):
        shutil.copy(f, os.path.join(KOK, os.path.basename(f)))
    m = {"name": "SorguLab", "short_name": "SorguLab", "description": "SQL, pandas ve NumPy alıştırma uygulaması",
         "start_url": "./", "scope": "./", "display": "standalone", "background_color": "#f2f4f7", "theme_color": "#2453c8", "lang": "tr",
         "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
                   {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
                   {"src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}
    json.dump(m, open(os.path.join(KOK, 'manifest.webmanifest'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    haric = ('sw.js', 'index.html', 'manifest.webmanifest', '.md', '.nojekyll', '.gitignore', 'CNAME')
    varlik = sorted(os.path.basename(f) for f in glob.glob(os.path.join(KOK, '*'))
                    if os.path.isfile(f) and not f.endswith(haric))
    dosyalar = ['index.html', 'manifest.webmanifest'] + varlik
    ozet = {f: hashlib.sha256(open(os.path.join(KOK, f), 'rb').read()).hexdigest()[:10] for f in dosyalar}
    surum = 'sa-' + hashlib.sha256(json.dumps(ozet, sort_keys=True).encode()).hexdigest()[:10]
    sw = SW.replace('__SURUM__', surum).replace('__DOSYALAR__', json.dumps(ozet, indent=1))
    open(os.path.join(KOK, 'sw.js'), 'w', encoding='utf-8').write(sw)
    print('Derlendi:', surum, '-', len(dosyalar), 'dosya önbellekte ·', konu['adet'], 'konu')


if __name__ == '__main__':
    main()
