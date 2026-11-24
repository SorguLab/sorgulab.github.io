---
baslik: List comprehension
ozet: Sonucu liste olan bir döngüyü tek satırda yazmak. Tek if ile if-else'in yazılış farkı ve dictionary comprehension.
---
Bir listenin her elemanından yeni bir liste üretmek çok sık yapılan bir iş. Normal döngüyle:

```python
sayilar = [1, 2, 3, 4, 5, 6]
iki_kati = []
for x in sayilar:
    iki_kati.append(x * 2)
iki_kati
```

Aynı iş list comprehension ile tek satırda:

```python
[x * 2 for x in sayilar]
```

Okunuşu: "`sayilar`'daki her `x` için `x * 2`".

## Filtreleme: tek if

```python
[x * 2 for x in sayilar if x % 2 == 0]
```

## if-else ile değer seçmek

```python
["çift" if x % 2 == 0 else "tek" for x in sayilar]
```

:::kural
Tek bir `if` (filtre) varsa **en sağa**, `for`'dan sonra yazılır: `[x for x in liste if koşul]`.
`if-else` (her eleman için iki değerden birini seçmek) varsa **sola**, `for`'dan önce yazılır: `[a if koşul else b for x in liste]`.
:::

İkisi farklı iş yapar: sağdaki `if` elemanları **eler** (sonuç kısalır), soldaki `if-else` her elemana bir değer **atar** (sonuç aynı uzunlukta kalır).

```python hata
[x for x in sayilar if x > 3 else 0]
```

## Metinlerle

```python
sutunlar = ["Age", "MonthlyIncome", "Attrition", "OverTime"]
print([s.upper() for s in sutunlar])
print([s for s in sutunlar if s.startswith("A")])
print(["NUM_" + s if s in ["Age", "MonthlyIncome"] else s for s in sutunlar])
```

Son satır Miuul'deki gibi sütun adlarını kurala göre yeniden adlandırma örneği.

## Dictionary comprehension

Aynı yazım süslü parantez ve `anahtar: değer` ile sözlük üretir:

```python
urunler = ["elma", "armut", "kiraz"]
fiyat = [12, 18, 45]
print({u: f for u, f in zip(urunler, fiyat)})
print({u: len(u) for u in urunler if len(u) > 4})
```

:::ipucu
Comprehension okunaksız hale geliyorsa (iç içe döngüler, uzun koşullar) normal `for` döngüsüne dön. Tek satıra sığdırmak amaç değil; amaç okunaklı kod.
:::
