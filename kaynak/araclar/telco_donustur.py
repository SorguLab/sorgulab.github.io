"""Telco Customer Churn (IBM örnek verisi, Kaggle'da blastchar/telco-customer-churn) SorguLab veri dosyasına çevirir.

Kullanım: python3 kaynak/araclar/telco_donustur.py kaynak/ham/telco.csv kaynak/veri/telco.json
- Veri BİLEREK temizlenmedi (veri temizleme pratiği için). Ham dosyadaki gibi:
  - TotalCharges metin (TEXT): tenure = 0 olan 11 müşteride değer tek boşluk (' '). pandas'ta object türünde gelir,
    SQL'de sayısal işlem için CAST gerekir.
  - SeniorCitizen 0/1, diğer evet/hayır sütunları 'Yes'/'No'.
  - 'No internet service' / 'No phone service' ayrı kategori olarak duruyor.
- Tek değişiklik yok: sütun adları ve değerler olduğu gibi.
"""
import csv, json, sys
kaynak, hedef = sys.argv[1], sys.argv[2]
satirlar = list(csv.reader(open(kaynak, encoding='utf-8', newline='')))
kol = satirlar[0]
SAYI = {'SeniorCitizen': 'INTEGER', 'tenure': 'INTEGER', 'MonthlyCharges': 'REAL'}
tip = [SAYI.get(c, 'TEXT') for c in kol]
def d(v, t):
    if t == 'INTEGER': return int(v)
    if t == 'REAL': return float(v)
    return v
rows = [[d(v, t) for v, t in zip(r, tip)] for r in satirlar[1:]]
json.dump({'telco': {'columns': kol, 'types': tip, 'rows': rows}}, open(hedef, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(rows), 'müşteri,', len(kol), 'sütun')
