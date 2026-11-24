"""KonuLab derleyicisi: kaynak/konular/<grup>/NN-ad.md dosyalarını okur, kod örneklerini gerçekten çalıştırır,
çıktılarıyla birlikte köke konular.json yazar. build.py çağırır; tek başına da çalışır:
    python3 kaynak/konu_derle.py

Konu dosyası biçimi
-------------------
---
baslik: Window function'lar
ozet: Bir cümlelik özet (aramada ve listede kullanılır)
alistirma: sql | Window Functions          (isteğe bağlı: SorguLab'deki dil | kategori)
---
Düz paragraf. **kalın**, `kod`, [bağlantı](#konu/sql-join).

## Alt başlık          (sağdaki "Bu sayfada" listesine girer)
### Küçük başlık

- madde
1. numaralı madde

| tablo | başlığı |
|---|---|
| hücre | hücre |

:::dikkat            (türler: dikkat, not, kural, ipucu)
Kutunun içi; paragraf, liste ve kod içerebilir.
:::

```sql titanic       (dil + veri seti: SQLite'ta çalışır, çıktı tablosu eklenir)
SELECT ...
```
```python           (saf Python: print çıktısı + son ifadenin değeri)
```
```python titanic   (pandas: veri setinin tabloları DataFrame olarak hazır)
```
Python blokları aynı konu içinde aynı ortamı paylaşır (defter gibi). Ek seçenekler:
  satir=N       çıktıda gösterilecek en fazla satır (varsayılan 8)
  calistirma    çalıştırma, sadece kodu göster (örn. SQL Server sözdizimi)
  hata          bu blok bilerek hata verir; hata mesajı çıktı olarak gösterilir
  yeni          Python ortamını sıfırla
Çalışması gereken bir blok hata verirse derleme durur.

Sürüm: çıktılar uygulamadaki Python ile aynı olsun diye Pyodide 0.26.4'ün sürümleriyle çalıştır
(Python 3.12, pandas 2.2.0, numpy 1.26.4). build.py bunun için KONU_PYTHON ortam değişkenine ya da
/home/claude/konu-venv'e bakar. Kurulum: uv venv -p 3.12 ~/konu-venv && uv pip install -p ~/konu-venv/bin/python pandas==2.2.0 numpy==1.26.4
"""
import ast, contextlib, glob, html, io, json, os, re, sqlite3, sys, warnings
warnings.filterwarnings('ignore', category=DeprecationWarning)

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KONU_DIZIN = os.path.join(KOK, 'kaynak', 'konular')
sys.path.insert(0, os.path.join(KOK, 'kaynak', 'src'))

GRUPLAR = [  # sıra = KonuLab'deki sıra; dil = üstteki SQL/Python geçişinde hangi tarafta görüneceği
    {'id': 'sql', 'ad': 'SQL', 'dil': 'sql'},
    {'id': 'temel', 'ad': 'Python Temelleri', 'dil': 'python'},
    {'id': 'pandas', 'ad': 'pandas', 'dil': 'python'},
    {'id': 'numpy', 'ad': 'NumPy', 'dil': 'python'},
    {'id': 'kavram', 'ad': 'Kavramlar', 'dil': 'genel'},
]
KUTU = {'dikkat': 'Sık hata', 'not': 'Not', 'kural': 'Kural', 'ipucu': 'İpucu'}

_veri = {}
def veri(key):
    if key not in _veri:
        _veri[key] = json.load(open(os.path.join(KOK, 'kaynak', 'veri', key + '.json'), encoding='utf-8'))
    return _veri[key]

_db = {}
def db(key):
    if key not in _db:
        c = sqlite3.connect(':memory:')
        for t, o in veri(key).items():
            c.execute(f'CREATE TABLE "{t}" ({", ".join(chr(34) + k + chr(34) + " " + o["types"][i] for i, k in enumerate(o["columns"]))})')
            c.executemany(f'INSERT INTO "{t}" VALUES ({",".join("?" * len(o["columns"]))})', o['rows'])
        _db[key] = c
    return _db[key]


class KonuHatasi(Exception):
    pass


def sql_calistir(key, kod, satir):
    c = db(key)
    try:
        cur = c.execute(kod) if ';' not in kod.strip().rstrip(';') else None
        if cur is None:  # birden çok ifade: sonuncusunun sonucunu göster
            parcalar = [p for p in kod.split(';') if p.strip()]
            for p in parcalar[:-1]:
                c.execute(p)
            cur = c.execute(parcalar[-1])
        if cur.description is None:
            return {'metin': 'Sorgu çalıştı (sonuç tablosu yok).'}
        rows = cur.fetchall()
        return {'tablo': {'columns': [d[0] for d in cur.description], 'rows': [list(r) for r in rows[:satir]], 'total': len(rows)}}
    except sqlite3.Error as e:
        return {'hata': f'{type(e).__name__}: {e}'}


def py_ortam():
    import pandas as pd, numpy as np
    return {'pd': pd, 'np': np, '__name__': '__konu__'}


def py_veri_yukle(ns, key):
    import helper
    helper._yukle(json.dumps(veri(key)))
    for t, df in helper._BASE.items():
        ns.setdefault(t, df.copy())


def py_calistir(ns, kod, satir):
    import pandas as pd, numpy as np, helper
    buf = io.StringIO()
    sonuc = {}
    try:
        with contextlib.redirect_stdout(buf):
            agac = ast.parse(kod)
            son = None
            if agac.body and isinstance(agac.body[-1], ast.Expr):
                ifade = ast.Expression(agac.body.pop().value)
                exec(compile(agac, '<örnek>', 'exec'), ns)
                son = eval(compile(ifade, '<örnek>', 'eval'), ns)
            else:
                exec(compile(agac, '<örnek>', 'exec'), ns)
        if son is not None:
            if isinstance(son, (pd.DataFrame, pd.Series)) or (isinstance(son, np.ndarray) and son.ndim == 2 and son.shape[0] > 3):
                t = helper._tablo(son, limit=satir)
                sonuc['tablo'] = {'columns': t['columns'], 'rows': t['rows'], 'total': t['total']}
            else:
                with pd.option_context('display.width', 100):
                    sonuc['metin'] = repr(son)
    except Exception as e:
        sonuc['hata'] = f'{type(e).__name__}: {e}'
    out = buf.getvalue()
    if out:
        sonuc['stdout'] = out[-5000:]
    return sonuc


# ─── Satır içi biçim ───
def satir_ici(s):
    parcalar = re.split(r'(`[^`]+`)', s)
    out = []
    for p in parcalar:
        if p.startswith('`') and p.endswith('`') and len(p) > 1:
            out.append('<code>' + html.escape(p[1:-1]) + '</code>')
            continue
        h = html.escape(p, quote=False)
        h = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', h)
        h = re.sub(r'(?<![\w*])\*([^*\n]+?)\*(?![\w*])', r'<i>\1</i>', h)
        h = re.sub(r'\[([^\]]+)\]\(([^)\s]+)\)', lambda m: f'<a href="{html.escape(m.group(2))}"' + ('' if m.group(2).startswith('#') else ' target="_blank" rel="noopener"') + f'>{m.group(1)}</a>', h)
        out.append(h)
    return ''.join(out)


def baslik_id(s):
    tr = str.maketrans('çğıöşüÇĞİÖŞÜ', 'cgiosuCGIOSU')
    return re.sub(r'[^a-z0-9]+', '-', s.translate(tr).lower()).strip('-')


# ─── Blok ayrıştırıcı ───
def ayristir(satirlar, baglam):
    """satirlar -> blok listesi. Ardışık HTML parçaları tek 'html' bloğunda birleşir."""
    bloklar = []
    def html_ekle(h):
        if bloklar and bloklar[-1]['t'] == 'html':
            bloklar[-1]['h'] += h
        else:
            bloklar.append({'t': 'html', 'h': h})
    i = 0
    while i < len(satirlar):
        s = satirlar[i]
        if not s.strip():
            i += 1; continue
        if s.startswith('```'):
            ust = s[3:].split()
            dil = ust[0] if ust else ''
            secenek = ust[1:]
            j = i + 1
            while j < len(satirlar) and not satirlar[j].startswith('```'):
                j += 1
            if j >= len(satirlar):
                raise KonuHatasi(f'{baglam["dosya"]}: kapanmamış kod bloğu (satır {i + 1})')
            kod = '\n'.join(satirlar[i + 1:j]).rstrip()
            bloklar.append(kod_blogu(dil, secenek, kod, baglam, i + 1))
            i = j + 1; continue
        if s.startswith(':::'):
            tur = s[3:].strip()
            if tur not in KUTU:
                raise KonuHatasi(f'{baglam["dosya"]}: bilinmeyen kutu türü "{tur}" (satır {i + 1})')
            j = i + 1; derinlik = 0
            while j < len(satirlar) and not (satirlar[j].strip() == ':::' and derinlik == 0):
                j += 1
            ic = ayristir(satirlar[i + 1:j], baglam)
            bloklar.append({'t': 'kutu', 'tur': tur, 'ad': KUTU[tur], 'bloklar': ic})
            i = j + 1; continue
        m = re.match(r'^(#{2,3}) (.+)$', s)
        if m:
            seviye, ad = len(m.group(1)), m.group(2).strip()
            bid = baslik_id(ad)
            if seviye == 2:
                baglam['basliklar'].append({'id': bid, 'ad': re.sub(r'`', '', ad)})
            html_ekle(f'<h{seviye} id="b-{bid}">{satir_ici(ad)}</h{seviye}>')
            i += 1; continue
        if s.startswith('|'):
            j = i
            while j < len(satirlar) and satirlar[j].startswith('|'):
                j += 1
            hucreler = [[h.strip() for h in r.strip().strip('|').split('|')] for r in satirlar[i:j]]
            bas, govde = hucreler[0], [r for r in hucreler[1:] if not all(re.fullmatch(r':?-+:?', h) for h in r)]
            html_ekle('<div class="konu-tablo"><table><thead><tr>' + ''.join(f'<th>{satir_ici(h)}</th>' for h in bas) + '</tr></thead><tbody>'
                      + ''.join('<tr>' + ''.join(f'<td>{satir_ici(h)}</td>' for h in r) + '</tr>' for r in govde) + '</tbody></table></div>')
            i = j; continue
        m = re.match(r'^(\s*)([-*]|\d+\.) ', s)
        if m:
            numarali = m.group(2)[0].isdigit()
            maddeler = []
            while i < len(satirlar) and re.match(r'^\s*([-*]|\d+\.) ', satirlar[i]):
                madde = re.sub(r'^\s*([-*]|\d+\.) ', '', satirlar[i]); i += 1
                while i < len(satirlar) and satirlar[i].startswith('  ') and satirlar[i].strip() and not re.match(r'^\s*([-*]|\d+\.) ', satirlar[i]):
                    madde += ' ' + satirlar[i].strip(); i += 1
                maddeler.append(madde)
            etiket = 'ol' if numarali else 'ul'
            html_ekle(f'<{etiket}>' + ''.join(f'<li>{satir_ici(x)}</li>' for x in maddeler) + f'</{etiket}>')
            continue
        paragraf = [s.strip()]; i += 1
        while i < len(satirlar) and satirlar[i].strip() and not re.match(r'^(```|:::|#{2,3} |\||\s*([-*]|\d+\.) )', satirlar[i]):
            paragraf.append(satirlar[i].strip()); i += 1
        html_ekle('<p>' + satir_ici(' '.join(paragraf)) + '</p>')
    return bloklar


def kod_blogu(dil, secenek, kod, baglam, satir_no):
    veri_key = next((x for x in secenek if '=' not in x and x not in ('calistirma', 'hata', 'yeni')), None)
    satir = int(next((x.split('=')[1] for x in secenek if x.startswith('satir=')), 8))
    blok = {'t': 'kod', 'dil': 'python' if dil in ('python', 'py') else dil, 'kod': kod}
    if veri_key:
        blok['veri'] = veri_key
    if 'calistirma' in secenek:
        return blok
    if dil == 'sql':
        if not veri_key:
            raise KonuHatasi(f'{baglam["dosya"]}: SQL bloğunda veri seti yok (satır {satir_no})')
        cikti = sql_calistir(veri_key, kod, satir)
    elif dil in ('python', 'py'):
        if 'yeni' in secenek or baglam.get('ns') is None:
            baglam['ns'] = py_ortam()
        if veri_key:
            py_veri_yukle(baglam['ns'], veri_key)
        cikti = py_calistir(baglam['ns'], kod, satir)
    else:
        return blok
    if 'hata' in cikti and 'hata' not in secenek:
        raise KonuHatasi(f'{baglam["dosya"]} (satır {satir_no}): örnek hata verdi:\n{kod}\n→ {cikti["hata"]}')
    if 'hata' in secenek and 'hata' not in cikti:
        raise KonuHatasi(f'{baglam["dosya"]} (satır {satir_no}): bu örneğin hata vermesi bekleniyordu ama çalıştı')
    blok['cikti'] = cikti
    return blok


def konu_oku(yol, grup):
    metin = open(yol, encoding='utf-8').read()
    m = re.match(r'^---\n(.*?)\n---\n', metin, re.S)
    if not m:
        raise KonuHatasi(f'{yol}: üst bilgi (--- ... ---) yok')
    ust = dict(re.match(r'^(\w+):\s*(.*)$', l).groups() for l in m.group(1).splitlines() if l.strip())
    ad = os.path.basename(yol)[:-3]
    no, slug = ad.split('-', 1)
    baglam = {'dosya': os.path.relpath(yol, KOK), 'basliklar': [], 'ns': None}
    bloklar = ayristir(metin[m.end():].splitlines(), baglam)
    konu = {'id': f'{grup}-{slug}', 'grup': grup, 'sira': int(no), 'baslik': ust['baslik'], 'ozet': ust.get('ozet', ''),
            'basliklar': baglam['basliklar'], 'bloklar': bloklar}
    if ust.get('alistirma'):
        d, k = [x.strip() for x in ust['alistirma'].split('|', 1)]
        konu['alistirma'] = {'dil': d, 'kategori': k}
    def duz(bl):
        return ' '.join(re.sub(r'<[^>]+>', ' ', b['h']) if b['t'] == 'html' else b['kod'] if b['t'] == 'kod' else duz(b['bloklar']) for b in bl)
    konu['ara'] = re.sub(r'\s+', ' ', html.unescape(' '.join([ust['baslik'], konu['ozet'], duz(bloklar)])))[:4000]
    return konu


def derle():
    konular = []
    for g in GRUPLAR:
        for yol in sorted(glob.glob(os.path.join(KONU_DIZIN, g['id'], '*.md'))):
            konular.append(konu_oku(yol, g['id']))
    ids = [k['id'] for k in konular]
    assert len(ids) == len(set(ids)), 'tekrar eden konu id'
    sozluk_yol = os.path.join(KONU_DIZIN, 'sozluk.json')
    sozluk = json.load(open(sozluk_yol, encoding='utf-8')) if os.path.exists(sozluk_yol) else []
    out = {'gruplar': GRUPLAR, 'konular': konular, 'sozluk': sozluk}
    with open(os.path.join(KOK, 'konular.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'), default=str)
    return {'adet': len(konular), 'ozet': [{k: x[k] for k in ('id', 'grup', 'baslik')} | ({'alistirma': x['alistirma']} if 'alistirma' in x else {}) for x in konular]}


if __name__ == '__main__':
    import pandas, numpy
    if (pandas.__version__, numpy.__version__) != ('2.2.0', '1.26.4'):
        print(f'UYARI: pandas {pandas.__version__} / numpy {numpy.__version__} ile derleniyor; uygulama pandas 2.2.0 / numpy 1.26.4 kullanıyor, çıktılar farklı olabilir.')
    try:
        r = derle()
    except KonuHatasi as e:
        print('KONU HATASI:', e); sys.exit(1)
    print(r['adet'], 'konu derlendi → konular.json')
