---
baslik: Yeni sütun türetme
ozet: Aritmetik, np.where, np.select, map, apply, pd.cut ve pd.qcut ile yeni değişkenler üretmek.
alistirma: python | Dönüşüm
---
Analizlerde ve modellerde mevcut sütunlardan yeni değişkenler türetmek (feature engineering) çok sık yapılır. pandas'ta işlemler tüm sütuna aynı anda uygulanır; döngüye gerek yok.

## Aritmetik

```python titanic satir=4
titanic["aile"] = titanic["SibSp"] + titanic["Parch"] + 1
titanic["kisi_basi_ucret"] = (titanic["Fare"] / titanic["aile"]).round(2)
titanic[["Name", "Fare", "aile", "kisi_basi_ucret"]].head(4)
```

## np.where: iki seçenekli koşul

`np.where(koşul, doğruysa, yanlışsa)` Excel'deki `EĞER`'in karşılığı.

```python satir=4
titanic["yalniz"] = np.where(titanic["aile"] == 1, "Yalnız", "Ailesiyle")
titanic["yalniz"].value_counts()
```

## np.select: çok seçenekli koşul

SQL'deki `CASE WHEN`'in karşılığı. Koşullar sırayla denenir, ilk doğru olanın değeri alınır.

```python
kosullar = [titanic["aile"] == 1, titanic["aile"] <= 4]
degerler = ["Yalnız", "Küçük aile"]
titanic["aile_grubu"] = np.select(kosullar, degerler, default="Büyük aile")
titanic.groupby("aile_grubu")["Survived"].agg(["count", "mean"]).round(3)
```

## map: değerleri eşlemek

Bir sözlükle kodları etiketlere çevirir. Sözlükte olmayan değer `NaN` olur.

```python
titanic["liman"] = titanic["Embarked"].map({"S": "Southampton", "C": "Cherbourg", "Q": "Queenstown"})
titanic["liman"].value_counts(dropna=False)
```

## apply: her satıra / değere fonksiyon

Hazır bir işlem yoksa kendi fonksiyonunu uygulayabilirsin. Esnek ama yavaştır; büyük veride önce vektörel bir yol ara.

```python satir=4
def unvan_bul(isim):
    return isim.split(", ")[1].split(".")[0]

titanic["unvan"] = titanic["Name"].apply(unvan_bul)
titanic[["Name", "unvan"]].head(4)
```

## pd.cut: aralıklara bölmek

Sayısal bir sütunu kendi belirlediğin sınırlarla gruplara ayırır.

```python
titanic["yas_grubu"] = pd.cut(titanic["Age"], bins=[0, 13, 18, 60, 120], right=False,
                              labels=["Çocuk", "Genç", "Yetişkin", "Yaşlı"])
titanic["yas_grubu"].value_counts().sort_index()
```

:::dikkat
`pd.cut` aralıkları varsayılan olarak **sağdan kapalı** kurar: `(13, 18]`. Yani 13 yaşındaki biri "Çocuk" olur. SQL'deki `Age < 13` mantığına uymak için `right=False` verdik: `[13, 18)`. Sınır değerlerin hangi gruba düştüğünü her zaman kontrol et.
:::

## pd.qcut: eşit frekanslı gruplar

Sınırları sen değil, veri belirler: her grupta yaklaşık aynı sayıda satır olur. Çeyrekler, RFM skorları için kullanılır.

```python
titanic["ucret_ceyrek"] = pd.qcut(titanic["Fare"], 4, labels=["Q1", "Q2", "Q3", "Q4"])
titanic.groupby("ucret_ceyrek", observed=True)["Survived"].agg(["count", "mean"]).round(3)
```

Gruplardaki sayılar tam eşit değil: aynı ücreti ödeyen çok yolcu var ve aynı değer iki farklı gruba bölünemiyor. Tam eşit gruplar gerekiyorsa `pd.qcut(titanic["Fare"].rank(method="first"), 4)`.
