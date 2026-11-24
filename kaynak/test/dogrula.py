"""Tüm soru bankasını doğrular: her SQL çözümü SQLite'ta, her Python çözümü pandas ile çalışmalı ve boş olmayan sonuç vermeli.

Kullanım (repo kökünden):  python3 kaynak/test/dogrula.py [veri_seti_anahtari ...]
Gerekenler: node, python3, pandas, numpy
"""
import json, os, sqlite3, subprocess, sys

KOK = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(KOK, 'kaynak', 'src')
sys.path.insert(0, SRC)
import helper  # noqa: E402

katalog = json.load(open(os.path.join(KOK, 'kaynak', 'veri_setleri.json'), encoding='utf-8'))
secili = set(sys.argv[1:])
dosyalar = ['bank.js'] + sorted({d for v in katalog for d in v['dosyalar']})
js = "const b = {};\n" + "".join(f"Object.assign(b, require('./{d}'));\n" for d in dosyalar) + "process.stdout.write(JSON.stringify(b));"
bankalar = json.loads(subprocess.run(['node', '-e', js], cwd=SRC, capture_output=True, text=True, check=True).stdout)

hata = 0
idler = {}
for v in katalog:
    sorular = [q for ad in v['bankalar'] for q in bankalar[ad]]
    for q in sorular:
        if q['id'] in idler:
            print('TEKRAR EDEN ID', q['id'], v['key'], idler[q['id']]); hata += 1
        idler[q['id']] = v['key']
    if secili and v['key'] not in secili:
        continue
    veri = json.load(open(os.path.join(KOK, 'kaynak', 'veri', v['key'] + '.json'), encoding='utf-8'))
    db = sqlite3.connect(':memory:')
    for t, o in veri.items():
        db.execute(f'CREATE TABLE "{t}" ({", ".join(f"{chr(34)}{c}{chr(34)} {o[chr(116)+chr(121)+chr(112)+chr(101)+chr(115)][i]}" for i, c in enumerate(o["columns"]))})')
        db.executemany(f'INSERT INTO "{t}" VALUES ({",".join("?" * len(o["columns"]))})', o['rows'])
    helper._yukle(json.dumps(veri))
    for q in sorular:
        try:
            if q['dil'] == 'sql':
                n = len(db.execute(q['cozum']).fetchall())
            else:
                r = json.loads(helper._calistir(q['cozum']))
                if not r['ok']:
                    raise RuntimeError(r['error'])
                n = r['table']['total'] if r['table'] else 0
            if n == 0:
                raise RuntimeError('boş sonuç')
        except Exception as e:
            print(f'HATA {v["key"]}/{q["id"]} {q["baslik"]}: {e}'); hata += 1
    print(f'{v["key"]}: {len(sorular)} soru kontrol edildi')
if not secili:
    for t in bankalar['TAHMINLER']:
        if t['dil'] == 'python':
            r = json.loads(helper._calistir(t['kod']))
            if not r['ok']:
                print('HATA tahmin', t['id'], r['error']); hata += 1
print('SONUÇ:', 'tamam' if hata == 0 else f'{hata} hata')
sys.exit(1 if hata else 0)
