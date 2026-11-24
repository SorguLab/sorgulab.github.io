"""FLO müşteri verisini (Miuul FLO vakası, 19.945 müşteri) SorguLab veri dosyasına çevirir.

Kullanım: python3 kaynak/araclar/flo_donustur.py kaynak/ham/flo.csv kaynak/veri/flo.json
- ID sütunu (Excel satır numarası) atılır.
- Tarihler ISO metin (YYYY-MM-DD).
- interested_in_categories_12 içindeki çift boşluklar tek boşluğa indirilir: "[ERKEK, KADIN]".
"""
import csv, json, re, sys
kaynak, hedef = sys.argv[1], sys.argv[2]
kol = ['master_id', 'order_channel', 'last_order_channel', 'first_order_date', 'last_order_date',
       'last_order_date_online', 'last_order_date_offline', 'order_num_total_ever_online',
       'order_num_total_ever_offline', 'customer_value_total_ever_offline',
       'customer_value_total_ever_online', 'interested_in_categories_12']
tip = ['TEXT'] * 7 + ['INTEGER', 'INTEGER', 'REAL', 'REAL', 'TEXT']
rows = []
for r in csv.DictReader(open(kaynak, encoding='utf-8')):
    s = []
    for c, t in zip(kol, tip):
        v = r[c]
        if t == 'INTEGER': v = int(float(v))
        elif t == 'REAL': v = round(float(v), 2)
        elif c == 'interested_in_categories_12': v = re.sub(r',\s+', ', ', v)
        s.append(v)
    rows.append(s)
json.dump({'flo': {'columns': kol, 'types': tip, 'rows': rows}}, open(hedef, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(rows), 'müşteri')
