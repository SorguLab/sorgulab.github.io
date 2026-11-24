"""Titanic ham verisini (seaborn-data/raw/titanic.csv = Kaggle train, 891 yolcu) SorguLab veri dosyasına çevirir.

Kaynak: https://github.com/mwaskom/seaborn-data (raw/titanic.csv)
Kullanım: python3 kaynak/araclar/titanic_donustur.py kaynak/ham/titanic.csv kaynak/veri/titanic.json
- Sütun adları Kaggle'daki gibi (PassengerId, Survived, Pclass, ...). PassengerId sıra numarasıdır (Kaggle ile aynı sıra).
- liman: Embarked kodlarının resmi açıklaması (C/Q/S).
"""
import csv, json, sys
kaynak, hedef = sys.argv[1], sys.argv[2]
satirlar = list(csv.DictReader(open(kaynak, encoding='utf-8')))
kol = ['PassengerId', 'Survived', 'Pclass', 'Name', 'Sex', 'Age', 'SibSp', 'Parch', 'Ticket', 'Fare', 'Cabin', 'Embarked']
tip = ['INTEGER', 'INTEGER', 'INTEGER', 'TEXT', 'TEXT', 'REAL', 'INTEGER', 'INTEGER', 'TEXT', 'REAL', 'TEXT', 'TEXT']
def d(v, t):
    if v is None or v == '': return None
    return int(v) if t == 'INTEGER' else float(v) if t == 'REAL' else v
rows = []
for i, r in enumerate(satirlar, 1):
    ham = [i, r['survived'], r['pclass'], r['name'], r['sex'], r['age'], r['sibsp'], r['parch'], r['ticket'], r['fare'], r['cabin'], r['embarked']]
    rows.append([d(v, t) if not isinstance(v, int) else v for v, t in zip(ham, tip)])
veri = {'titanic': {'columns': kol, 'types': tip, 'rows': rows},
        'liman': {'columns': ['Embarked', 'liman_adi'], 'types': ['TEXT', 'TEXT'], 'rows': [['C', 'Cherbourg'], ['Q', 'Queenstown'], ['S', 'Southampton']]}}
json.dump(veri, open(hedef, 'w', encoding='utf-8'), ensure_ascii=False)
print(len(rows), 'yolcu')
