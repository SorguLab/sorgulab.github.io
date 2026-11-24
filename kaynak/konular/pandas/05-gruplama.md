---
baslik: Gruplama
ozet: groupby ile grup bazlı özet, agg ile birden fazla metrik, named aggregation ve transform.
alistirma: python | Gruplama
---
`groupby` SQL'deki `GROUP BY`'ın karşılığı: satırları bir sütunun değerlerine göre gruplara ayırır, her gruba bir hesap uygular.

```python titanic
titanic.groupby("Pclass")["Survived"].mean().round(3)
```

Okunuşu: "Pclass'a göre grupla, Survived sütununu al, her grubun ortalamasını hesapla."

## Birden fazla sütunla

Sonuç çok seviyeli bir index'tir. `unstack()` iç seviyeyi sütunlara çevirir; iki boyutlu bir tablo okumak için idealdir.

```python
titanic.groupby(["Pclass", "Sex"])["Survived"].mean().round(3)
```

```python
titanic.groupby(["Pclass", "Sex"])["Survived"].mean().unstack().round(3)
```

## agg: birden fazla metrik

```python
titanic.groupby("Pclass")["Fare"].agg(["count", "mean", "median", "max"]).round(2)
```

## Named aggregation

Farklı sütunlara farklı fonksiyonlar uygulayıp sonuç sütunlarına isim vermenin en okunaklı yolu. `yeni_ad=("sütun", "fonksiyon")` biçiminde:

```python hr
hr.groupby("Department").agg(
    calisan=("EmployeeNumber", "count"),
    ort_maas=("MonthlyIncome", "mean"),
    ort_yas=("Age", "mean"),
    ayrilan=("Attrition", lambda s: (s == "Yes").sum()),
).round(1)
```

Son satırdaki `lambda`, hazır bir fonksiyonu olmayan hesaplar için: her grubun Attrition sütununda "Yes" olanları sayıyor.

## as_index=False ve reset_index

`groupby` sonucunda grup sütunu index olur. Normal bir sütun olarak kalmasını istiyorsan `as_index=False` ya da sonradan `reset_index()`:

```python
titanic.groupby("Embarked", as_index=False)["Fare"].mean().round(2)
```

## transform: grubu satıra yaymak

`agg` her grubu tek satıra indirir. `transform` ise sonucu her satıra geri yazar, satır sayısı değişmez. SQL'deki window function'ın (`AVG(...) OVER (PARTITION BY ...)`) karşılığı:

```python satir=5
titanic["sinif_ort"] = titanic.groupby("Pclass")["Fare"].transform("mean").round(2)
titanic["fark"] = (titanic["Fare"] - titanic["sinif_ort"]).round(2)
titanic[["Name", "Pclass", "Fare", "sinif_ort", "fark"]].head(5)
```

:::kural
Sonucu grup başına bir satır olarak istiyorsan `agg`, her satıra grup bilgisi eklemek istiyorsan `transform`.
:::

## SQL karşılıkları

| SQL | pandas |
|---|---|
| `GROUP BY a` + `COUNT(*)` | `df.groupby("a").size()` |
| `GROUP BY a` + `AVG(b)` | `df.groupby("a")["b"].mean()` |
| `HAVING COUNT(*) > 50` | `.filter(lambda g: len(g) > 50)` ya da sonuçta koşullu seçim |
| `AVG(b) OVER (PARTITION BY a)` | `df.groupby("a")["b"].transform("mean")` |
