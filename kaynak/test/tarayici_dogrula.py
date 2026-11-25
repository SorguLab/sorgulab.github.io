"""Tüm soru çözümlerini GERÇEK tarayıcıdaki motorlarla (sql.js + Pyodide: pandas 2.2, NumPy 1.26, scipy yok) çalıştırır.

dogrula.py bilgisayardaki Python/SQLite ile çalışır; tarayıcıda olmayan bir kütüphane (scipy) ya da
tarayıcıda bellek yetmeyen bir sorgu orada fark edilmez. Bu test onları yakalar.

Kullanım (repo kökünden, önce build):
    python3 kaynak/build.py
    python3 kaynak/test/tarayici_dogrula.py            # tüm hazır veri setleri
    python3 kaynak/test/tarayici_dogrula.py flo hr     # sadece bunlar
Gerekenler: playwright (pip) ve bir Chromium (PLAYWRIGHT_BROWSERS_PATH ya da google-chrome).
"""
import functools, http.server, os, shutil, sys, threading, time

KOK = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def sunucu():
    class Sessiz(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    h = functools.partial(Sessiz, directory=KOK)
    s = http.server.ThreadingHTTPServer(('127.0.0.1', 0), h)
    threading.Thread(target=s.serve_forever, daemon=True).start()
    return s


JS = r"""
async (anahtarlar) => {
  const sonuc = [];
  const hedef = anahtarlar.length ? anahtarlar : HAZIR;
  for (const key of hedef) {
    S.veriSeti = key;
    for (const q of VS[key].sorular) {
      const t0 = performance.now();
      let r;
      try { r = await calistir(q.dil, q.cozum, true); } catch (e) { r = { ok: false, error: String(e.message || e) }; }
      const ms = Math.round(performance.now() - t0);
      if (!r.ok) sonuc.push([key, q.id, 'HATA: ' + r.error]);
      else if (!r.table || !r.table.rows.length) sonuc.push([key, q.id, 'boş sonuç']);
      else if (ms > 8000) sonuc.push([key, q.id, 'yavaş: ' + ms + ' ms']);
    }
  }
  return { hatalar: sonuc, sayi: hedef.map(k => [k, VS[k].sorular.length]), kip: motorKip };
}
"""


def main():
    from playwright.sync_api import sync_playwright
    s = sunucu()
    url = f'http://127.0.0.1:{s.server_port}/index.html'
    yol = shutil.which('google-chrome') if not os.environ.get('PLAYWRIGHT_BROWSERS_PATH') and not os.path.isdir('/opt/pw-browsers') else None
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=yol) if yol else p.chromium.launch()
        sayfa = b.new_page()
        konsol = []
        sayfa.on('pageerror', lambda e: konsol.append(str(e)))
        sayfa.goto(url)
        sayfa.wait_for_function('typeof calistir === "function"')
        t0 = time.time()
        r = sayfa.evaluate(JS, sys.argv[1:])
        b.close()
    print('Motor:', r['kip'], '·', ', '.join(f'{k}: {n} soru' for k, n in r['sayi']), f'· {time.time() - t0:.0f} sn')
    for h in r['hatalar']:
        print(' ✗', *h)
    for k in konsol:
        print(' sayfa hatası:', k)
    print('SONUÇ:', 'tamam' if not r['hatalar'] and not konsol else 'HATA VAR')
    sys.exit(1 if r['hatalar'] or konsol else 0)


if __name__ == '__main__':
    main()
