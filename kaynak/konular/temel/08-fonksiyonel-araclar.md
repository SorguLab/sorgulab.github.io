---
baslik: Fonksiyonel araçlar
ozet: lambda ile kullan-at fonksiyonlar, map, filter, reduce ve key ile özel sıralama.
---
## lambda: isimsiz, tek satırlık fonksiyon

`def` gibi fonksiyon yaratır, ama bir isme kaydedilmez; genelde başka bir fonksiyona argüman olarak bir kerelik verilir. Yapısı: `lambda parametreler: ifade`.

```python
kare = lambda x: x ** 2
kare(7)
```

Bir lambda'yı bir isme atamak mümkün ama alışkanlık değil; o durumda `def` daha okunaklı. Lambda'nın asıl yeri aşağıdaki fonksiyonlar.

## map: her elemana aynı işlemi uygula

`map(fonksiyon, liste)` fonksiyonu listedeki her elemana uygular. Sonuç bir "map nesnesi"dir, görmek için `list()` ile çevrilir.

```python
fiyatlar = [100, 250, 80]
list(map(lambda f: f * 1.2, fiyatlar))
```

## filter: koşula uyanları seç

`filter(fonksiyon, liste)` fonksiyonun `True` döndüğü elemanları tutar.

```python
satislar = [120, 340, 90, 410, 75]
list(filter(lambda s: s >= 100, satislar))
```

## reduce: listeyi tek değere indir

`reduce` ilk iki elemana işlemi uygular, sonucu üçüncüyle, o sonucu dördüncüyle… birleştirerek tek bir değer bırakır. `functools` modülünden gelir ve günlük işlerde çok az kullanılır; `sum`, `max` gibi hazır fonksiyonlar çoğu zaman yeterli.

```python
from functools import reduce
reduce(lambda a, b: a + b, [1, 2, 3, 4])
```

Adımlar: 1 + 2 = 3, 3 + 3 = 6, 6 + 4 = 10.

## key ile özel sıralama

`sorted`, `min` ve `max` bir `key` fonksiyonu alır: karşılaştırma, elemanın kendisine değil, bu fonksiyonun sonucuna göre yapılır.

```python
calisanlar = [("Ayşe", 8500), ("Mehmet", 12000), ("Zeynep", 9700)]
print(sorted(calisanlar, key=lambda c: c[1], reverse=True))
print(max(calisanlar, key=lambda c: c[1]))
print(sorted(["sql", "Python", "R"], key=str.lower))
```

:::not
`map` ve `filter` yerine çoğu zaman list comprehension daha okunaklıdır (sıradaki konu): `[f * 1.2 for f in fiyatlar]`. pandas'ta ise `Series.map` ve `Series.apply` aynı fikrin sütun versiyonudur.
:::
