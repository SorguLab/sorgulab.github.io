---
baslik: DataFrame'e giriş
ozet: pandas'ın temel yapıları DataFrame ve Series. Veriye ilk bakış: head, shape, info, dtypes, describe ve sütun seçme.
alistirma: python | pandas Temelleri
---
pandas, Python'da tablo verisiyle çalışmanın standart kütüphanesi. İki temel yapısı var:

- **DataFrame:** Satır ve sütunlardan oluşan tablo. SQL'deki tablonun, Excel'deki sayfanın karşılığı.
- **Series:** Tek bir sütun. Bir DataFrame'den sütun seçince Series elde edersin.

SorguLab'de veri setinin tabloları aynı isimle DataFrame olarak hazır gelir (`titanic`, `hr`, `flo`…). Kendi bilgisayarında ise genelde `pd.read_csv("dosya.csv")` ya da `pd.read_excel("dosya.xlsx")` ile okursun.

## İlk bakış

`head()` ilk 5 satırı, `tail()` son satırları gösterir. Parantez içine sayı yazılabilir.

```python titanic satir=5
titanic.head()
```

`shape` satır ve sütun sayısını verir (parantezsiz, çünkü bir özellik, fonksiyon değil):

```python
titanic.shape
```

## Sütun tipleri

`dtypes` her sütunun tipini, `info()` tipleri ve eksik olmayan değer sayılarını birlikte gösterir.

```python satir=12
titanic.dtypes
```

| pandas tipi | Anlamı |
|---|---|
| `int64` | Tam sayı |
| `float64` | Ondalıklı sayı (eksik değer içeren tam sayı sütunları da float olur) |
| `object` | Metin (ya da karışık) |
| `bool` | True / False |
| `datetime64` | Tarih |

:::not
`Age` sütunu yaş gibi tam sayı görünse de `float64`: eksik değerler (`NaN`) float olduğu için pandas bütün sütunu float yapar.
:::

## Betimsel istatistik

`describe()` sayısal sütunların sayı, ortalama, standart sapma, en küçük, çeyrekler ve en büyük değerlerini tek tabloda verir.

```python
titanic[["Age", "Fare", "SibSp"]].describe().round(2)
```

`count` satırına dikkat: `Age`'de 714. `describe` eksik değerleri atlar, eksikliği buradan hemen fark edersin.

## Sütun seçme

Tek sütun için köşeli parantez içinde adı yazılır; sonuç Series'tir. Birden fazla sütun için içte bir liste verilir (çift köşeli parantez); sonuç DataFrame'dir.

```python satir=3
titanic["Name"].head(3)
```

```python satir=3
titanic[["Name", "Age"]].head(3)
```

:::dikkat
`titanic.Age` yazımı da çalışır ama sütun adında boşluk varsa ya da adı bir metotla çakışıyorsa (`count`, `size`…) çalışmaz. Köşeli parantez her zaman güvenli.
:::

## Benzersiz değerler

```python
print(titanic["Embarked"].unique())
print(titanic["Embarked"].nunique())
```

`unique()` değerleri (eksik değer dahil), `nunique()` eksik değer hariç kaç farklı değer olduğunu verir.

## SQL karşılıkları

| SQL | pandas |
|---|---|
| `SELECT * FROM t LIMIT 5` | `t.head()` |
| `SELECT a, b FROM t` | `t[["a", "b"]]` |
| `SELECT DISTINCT a FROM t` | `t["a"].unique()` |
| `SELECT COUNT(*) FROM t` | `len(t)` ya da `t.shape[0]` |
