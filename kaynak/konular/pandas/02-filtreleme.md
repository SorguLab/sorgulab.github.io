---
baslik: Filtreleme ve seçme
ozet: Koşulla satır seçmek, birden fazla koşulu & ve | ile birleştirmek, loc ve iloc, isin, between ve query.
alistirma: python | Filtreleme
---
## Boolean maske

Bir sütunu bir değerle karşılaştırınca her satır için `True`/`False` içeren bir Series elde edersin. Bu "maske"yi köşeli parantez içine verince sadece `True` olan satırlar kalır.

```python titanic satir=4
maske = titanic["Fare"] > 200
print(maske.head(3).tolist())
titanic[maske][["Name", "Fare"]].head(4)
```

## Birden fazla koşul

`and` / `or` yerine `&` (ve) ile `|` (veya) kullanılır; `not` yerine `~`. Her koşul **parantez** içinde olmalı.

```python
kadin_3 = titanic[(titanic["Sex"] == "female") & (titanic["Pclass"] == 3)]
len(kadin_3)
```

```python hata
titanic[titanic["Sex"] == "female" and titanic["Pclass"] == 3]
```

:::dikkat
`and` ile yazınca pandas "bir Series'in doğru mu yanlış mı olduğu belirsiz" hatası verir. Parantezleri unutursan da `&` operatörü `==`'den önce işlendiği için yanlış sonuç ya da hata alırsın.
:::

## loc: koşul + sütun seçimi

`df.loc[satır_koşulu, sütun_listesi]` satırları ve sütunları tek adımda seçer. Filtreleyip belli sütunları görmek için en temiz yol:

```python satir=4
titanic.loc[(titanic["Pclass"] == 1) & (titanic["Age"] < 18), ["Name", "Age", "Survived"]].head(4)
```

`iloc` ise konuma göre seçer (0'dan başlayan satır ve sütun numaraları):

```python
titanic.iloc[0:3, 3:6]
```

## isin ve between

SQL'deki `IN` ve `BETWEEN`:

```python
print(titanic["Embarked"].isin(["C", "Q"]).sum())
print(titanic["Age"].between(20, 30).sum())
```

`.sum()` bir maskede `True`'ları sayar: kaç satırın koşula uyduğunu öğrenmenin kısa yolu.

## query: SQL'e benzer yazım

Koşulu metin olarak yazmanı sağlar; uzun filtrelerde daha okunaklı olabilir. Sütun adlarını tırnaksız yazarsın.

```python hr satir=4
hr.query("Department == 'Sales' and OverTime == 'Yes' and MonthlyIncome > 15000")[["EmployeeNumber", "JobRole", "MonthlyIncome"]]
```

## NaN ile karşılaştırma

Yaşı `NaN` olan biri için `Age < 18` de `Age >= 18` de `False` döner. SQL'deki NULL mantığıyla aynı sonuç: eksik değerli satırlar iki filtrede de görünmez.

```python
cocuk = (titanic["Age"] < 18).sum()
yetiskin = (titanic["Age"] >= 18).sum()
cocuk, yetiskin, cocuk + yetiskin, len(titanic)
```
