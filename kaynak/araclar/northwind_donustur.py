"""Microsoft'un resmi Northwind betiğini (instnwnd.sql, MIT lisansı) SorguLab veri dosyasına çevirir.

Kaynak: https://github.com/microsoft/sql-server-samples/tree/master/samples/databases/northwind-pubs
Kullanım: python3 kaynak/araclar/northwind_donustur.py /yol/instnwnd.sql kaynak/veri/northwind.json

Değişiklikler:
- "Order Details" tablosunun adı OrderDetails oldu (Python'da değişken adı boşluk içeremez).
- Resim sütunları (Categories.Picture, Employees.Photo) ve Employees.PhotoPath çıkarıldı.
- Boş tablolar (CustomerCustomerDemo, CustomerDemographics) alınmadı.
- Tarihler 'YYYY-MM-DD' metnine çevrildi (SQLite'ta tarih fonksiyonları ve pandas datetime ile çalışır).
- nchar alanlarındaki sağ boşluklar kırpıldı (TerritoryDescription vb.).
"""
import json, re, sys
from datetime import datetime

kaynak, hedef = sys.argv[1], sys.argv[2]
t = open(kaynak, encoding='utf-8-sig').read()
AD = {'Order Details': 'OrderDetails'}
ATLA_SUTUN = {'Categories': {'Picture'}, 'Employees': {'Photo', 'PhotoPath'}}
ATLA_TABLO = {'CustomerCustomerDemo', 'CustomerDemographics'}

# 1) CREATE TABLE: sütun sırası ve tipleri
sema = {}
for m in re.finditer(r'CREATE TABLE\s+(?:\[dbo\]\.)?["\[]([\w ]+)["\]]\s*\((.*?)\n\)', t, re.S):
    ad, govde = m.group(1), m.group(2)
    cols = []
    for satir in govde.split('\n'):
        mm = re.match(r'\s*\(?\s*["\[](\w+)["\]]\s+["\[]?(\w+)', satir)
        if mm and not satir.strip().upper().startswith('CONSTRAINT'):
            cols.append((mm.group(1), mm.group(2).lower()))
    sema[ad] = cols

# 2) Değer ayrıştırıcı
def degerler(s, i):
    out = []
    while True:
        while s[i] in ' \t\r\n,': i += 1
        if s[i] == ')': return out, i + 1
        if s[i] in 'Nn' and s[i + 1] == "'": i += 1
        if s[i] == "'":
            j, buf = i + 1, []
            while True:
                if s[j] == "'" and s[j + 1] == "'": buf.append("'"); j += 2; continue
                if s[j] == "'": break
                buf.append(s[j]); j += 1
            out.append(''.join(buf)); i = j + 1
        else:
            m = re.match(r'(NULL|0x[0-9A-Fa-f]*|-?\d+(?:\.\d+)?)', s[i:], re.I)
            tok = m.group(1); i += len(tok)
            out.append(None if tok.upper() == 'NULL' else ('<bin>' if tok.lower().startswith('0x') else (float(tok) if '.' in tok else int(tok))))

veri = {}
for m in re.finditer(r'INSERT\s+(?:INTO\s+)?(?:\[dbo\]\.)?["\[]?([\w ]+?)["\]]?\s*(\([^)]*\))?\s*VALUES\s*\(', t, re.I):
    ad = m.group(1).strip()
    if ad in ATLA_TABLO: continue
    kolon = [c.strip().strip('"[]') for c in m.group(2)[1:-1].split(',')] if m.group(2) else [c for c, _ in sema[ad]]
    vals, _ = degerler(t, m.end())
    assert len(vals) == len(kolon), (ad, kolon, vals)
    veri.setdefault(ad, []).append(dict(zip(kolon, vals)))

def tarih(v):
    return datetime.strptime(v, '%m/%d/%Y').strftime('%Y-%m-%d') if isinstance(v, str) and re.match(r'\d+/\d+/\d{4}$', v) else v

TIP = {'int': 'INTEGER', 'smallint': 'INTEGER', 'bit': 'INTEGER', 'money': 'REAL', 'real': 'REAL', 'float': 'REAL'}
sonuc = {}
sira = ['Customers', 'Employees', 'Orders', 'Order Details', 'Products', 'Categories', 'Suppliers', 'Shippers', 'Region', 'Territories', 'EmployeeTerritories']
for ad in sira:
    kol = [(c, tp) for c, tp in sema[ad] if c not in ATLA_SUTUN.get(ad, set())]
    satirlar = []
    for r in veri[ad]:
        satir = []
        for c, tp in kol:
            v = r.get(c)
            if tp == 'datetime': v = tarih(v)
            if isinstance(v, str): v = v.rstrip()
            if tp in ('money', 'real', 'float') and isinstance(v, int): v = float(v)
            satir.append(v)
        satirlar.append(satir)
    sonuc[AD.get(ad, ad)] = {'columns': [c for c, _ in kol], 'types': [TIP.get(tp, 'TEXT') for _, tp in kol], 'rows': satirlar}
json.dump(sonuc, open(hedef, 'w', encoding='utf-8'), ensure_ascii=False)
for ad, o in sonuc.items(): print(f'{ad:20s} {len(o["rows"]):5d} satır  {o["columns"]}')
