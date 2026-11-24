"""SorguLab derleme betiği.

Kullanım (repo kökünden):
    python3 kaynak/build.py
Üretir:
    index.html, sw.js, manifest.webmanifest   -> repo kökü (iPad / GitHub Pages sürümü)
    veri-<key>.json                           -> repo kökü, her hazır veri seti ayrı dosya (kaynak/veri/<key>.json'dan)
    kaynak/cikti/claude-ai.html               -> claude.ai artifact sürümü (git'e girmez)

Python motoru, kütüphaneler, fontlar ve ikonlar repo kökünde düz (klasörsüz) durur.
"""
import json, re, os, glob, hashlib, shutil, sys
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
  // Normalde görünür bir rozet yok; sadece yeni sürüm indiğinde kısa bir uyarı çıkar.
  var uyar = function (t) {
    var hap = document.createElement('span'); hap.className = 'hap'; hap.id = 'cevrimdisi';
    hap.textContent = t; hap.style.color = 'var(--uyari)'; document.querySelector('.ust-sag').appendChild(hap);
  };
  navigator.serviceWorker.register('./sw.js').then(function (reg) {
    reg.addEventListener('updatefound', function () {
      var yeni = reg.installing;
      if (!yeni || !navigator.serviceWorker.controller) return;
      yeni.addEventListener('statechange', function () { if (yeni.state === 'activated') uyar('Yeni sürüm indi · uygulamayı kapatıp aç'); });
    });
    return navigator.serviceWorker.ready;
  }).then(function () {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
  }).catch(function (e) { console.warn('Çevrimdışı kurulamadı', e); });
})();
</script>
'''

SW = """// SorguLab service worker: tüm dosyaları cihaza kaydeder, sonra internetsiz çalışır.
const SURUM = '__SURUM__';
const DOSYALAR = __DOSYALAR__;
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
    assert 'fonts.googleapis' not in t and 'cdnjs' not in t
    return t


def main():
    katalog = katalog_oku()
    metalar = veri_dosyalari_yaz(katalog)
    try:
        konu = konu_derle.derle()
    except konu_derle.KonuHatasi as e:
        sys.exit('KONU HATASI: ' + str(e))
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
    haric = ('sw.js', 'index.html', 'manifest.webmanifest', '.md', '.nojekyll', '.gitignore')
    varlik = sorted(os.path.basename(f) for f in glob.glob(os.path.join(KOK, '*'))
                    if os.path.isfile(f) and not f.endswith(haric))
    dosyalar = ['./', 'index.html', 'manifest.webmanifest'] + varlik
    h = hashlib.sha256()
    for f in dosyalar[1:]:
        h.update(open(os.path.join(KOK, f), 'rb').read())
    surum = 'sa-' + h.hexdigest()[:10]
    sw = SW.replace('__SURUM__', surum).replace('__DOSYALAR__', json.dumps(dosyalar, indent=1))
    open(os.path.join(KOK, 'sw.js'), 'w', encoding='utf-8').write(sw)
    print('Derlendi:', surum, '-', len(dosyalar), 'dosya önbellekte ·', konu['adet'], 'konu')


if __name__ == '__main__':
    main()
