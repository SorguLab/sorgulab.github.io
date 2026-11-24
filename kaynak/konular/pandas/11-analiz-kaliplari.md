---
baslik: Analiz kalıpları
ozet: Gerçek projelerde tekrar eden adımlar. RFM segmentasyonu, uç değer baskılama, nadir kategorileri birleştirme ve one-hot encoding.
alistirma: python | Segmentasyon
---
Bu konu, önceki konulardaki araçların birlikte kullanıldığı ve Miuul projelerinde (FLO RFM, Titanic, diyabet) tekrar eden kalıpları topluyor.

## RFM segmentasyonu

Müşterileri üç metriğe göre puanlar:

- **Recency:** Son alışverişten bu yana kaç gün geçti? (az = iyi)
- **Frequency:** Kaç kez alışveriş yaptı? (çok = iyi)
- **Monetary:** Toplam ne kadar harcadı? (çok = iyi)

```python flo
analiz = pd.Timestamp("2021-06-01")
rfm = pd.DataFrame({
    "recency": (analiz - flo["last_order_date"]).dt.days,
    "frequency": flo["order_num_total_ever_online"] + flo["order_num_total_ever_offline"],
    "monetary": flo["customer_value_total_ever_online"] + flo["customer_value_total_ever_offline"],
})
rfm.describe().round(1)
```

Skorlar `qcut` ile 1-5 arası. Recency'de etiketler ters, çünkü küçük recency iyidir. Frequency'de çok tekrar eden değer olduğu için `rank(method="first")` üzerinden bölüyoruz:

```python satir=5
rfm["R"] = pd.qcut(rfm["recency"], 5, labels=[5, 4, 3, 2, 1])
rfm["F"] = pd.qcut(rfm["frequency"].rank(method="first"), 5, labels=[1, 2, 3, 4, 5])
rfm["RF"] = rfm["R"].astype(str) + rfm["F"].astype(str)
rfm.head(5)
```

R ve F skorları regex sözlüğüyle segmentlere çevrilir:

```python
seg_map = {
    r"[1-2][1-2]": "hibernating", r"[1-2][3-4]": "at_risk", r"[1-2]5": "cant_loose",
    r"3[1-2]": "about_to_sleep", r"33": "need_attention", r"[3-4][4-5]": "loyal_customers",
    r"41": "promising", r"51": "new_customers", r"[4-5][2-3]": "potential_loyalists", r"5[4-5]": "champions",
}
rfm["segment"] = rfm["RF"].replace(seg_map, regex=True)
rfm.groupby("segment").agg(musteri=("recency", "size"), recency=("recency", "mean"),
                           frequency=("frequency", "mean"), monetary=("monetary", "mean")).round(1).sort_values("musteri", ascending=False)
```

## Uç değer baskılama

Birkaç aşırı değer ortalamaları çarpıtır. IQR yöntemiyle sınır hesaplanır, sınırı aşan değerler sınıra çekilir (satır silinmez):

```python
def esikler(s, q1=0.01, q3=0.99):
    a, b = s.quantile(q1), s.quantile(q3)
    iqr = b - a
    return a - 1.5 * iqr, b + 1.5 * iqr

alt, ust = esikler(rfm["monetary"])
print(round(ust, 2), (rfm["monetary"] > ust).sum())
rfm["monetary_bas"] = rfm["monetary"].clip(upper=ust)
rfm[["monetary", "monetary_bas"]].max().round(2)
```

Klasik IQR %25-%75 çeyreklerini kullanır. Müşteri verisinde "çok harcayan" hata değil önemli bir müşteri olduğu için Miuul'deki FLO vakasında %1-%99 ile çok daha gevşek bir sınır kullanılıyor.

## Nadir kategorileri birleştirmek (rare encoding)

Çok az gözlemi olan kategoriler modele güvenilir bir şey öğretmez. Belli bir eşiğin altındakileri tek bir "Rare" grubunda toplarız:

```python titanic yeni
titanic["unvan"] = titanic["Name"].str.extract(r",\s*([^\.]+)\.")[0]
sayi = titanic["unvan"].value_counts()
nadir = sayi[sayi < 10].index
titanic["unvan"] = titanic["unvan"].where(~titanic["unvan"].isin(nadir), "Rare")
titanic["unvan"].value_counts()
```

## One-hot encoding

Modeller metin kategorileri doğrudan işleyemez. `get_dummies` her kategori için ayrı bir 0/1 sütun üretir:

```python satir=4
pd.get_dummies(titanic[["Sex", "Embarked"]], dtype=int).head(4)
```

`drop_first=True` her değişkenin ilk kategorisini atar. Doğrusal modellerde gerekli: `Sex_female` ve `Sex_male` birbirinden türetilebildiği için ikisi birden mükemmel çoklu doğrusallık yaratır.

```python satir=4
pd.get_dummies(titanic[["Sex", "Embarked"]], drop_first=True, dtype=int).head(4)
```
