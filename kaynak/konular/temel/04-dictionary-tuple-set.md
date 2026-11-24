---
baslik: Dictionary, tuple ve set
ozet: Anahtar-değer çiftleri (dict), değiştirilemeyen liste (tuple) ve tekrarsız küme (set).
---
## Dictionary: anahtar → değer

Dictionary (sözlük) her değeri bir anahtarla saklar. Değere sırayla değil, anahtarıyla ulaşırsın. Bir müşteri kaydı, bir ayar listesi, kod → açıklama tablosu için idealdir.

```python
musteri = {"ad": "Ayşe", "sehir": "İzmir", "siparis": 12}
musteri["ad"], musteri["siparis"]
```

Ekleme, değiştirme ve silme:

```python
musteri["uyelik"] = "Gold"
musteri["siparis"] = 13
del musteri["sehir"]
musteri
```

## keys, values, items

```python
print(list(musteri.keys()))
print(list(musteri.values()))
for anahtar, deger in musteri.items():
    print(anahtar, "→", deger)
```

## update ve get

`update` başka bir sözlükteki çiftleri ekler (aynı anahtar varsa üzerine yazar). `get` anahtar yoksa hata vermek yerine varsayılan bir değer döner.

```python
musteri.update({"siparis": 20, "sehir": "Ankara"})
print(musteri)
print(musteri.get("telefon", "kayıtlı değil"))
```

```python hata
musteri["telefon"]
```

:::ipucu
Kod tablolarını (HR'deki `Education` 1-5 gibi) sözlükle eşlemek çok yaygın. pandas'ta `df["Education"].map(egitim)` bir sütunu tek satırda çevirir.
:::

```python
egitim = {1: "Below College", 2: "College", 3: "Bachelor", 4: "Master", 5: "Doctor"}
[egitim[k] for k in [3, 1, 4]]
```

## Tuple: değiştirilemeyen liste

Parantezle yazılır. Bir kez oluşturulduktan sonra elemanları değişmez. Fonksiyondan birden fazla değer döndürmek, koordinat gibi sabit gruplar için kullanılır.

```python
nokta = (41.01, 28.97)
enlem, boylam = nokta
print(enlem, boylam)
```

```python hata
nokta[0] = 40
```

## Set: tekrarsız küme

Süslü parantezle yazılır ama anahtar-değer değil, sadece değer tutar. Tekrar edenleri atar, sırası yoktur. Kesişim (`&`), birleşim (`|`) ve fark (`-`) için çok pratik.

```python
ocak = {"Ayşe", "Mehmet", "Zeynep", "Ali"}
subat = {"Zeynep", "Ali", "Can"}
print(ocak & subat)
print(subat - ocak)
print(len(ocak | subat))
print(set([3, 1, 3, 2, 1]))
```

İki ayda da alışveriş yapanlar, Şubat'ta yeni gelenler ve toplam tekil müşteri sayısı: SQL'deki `INTERSECT`, `EXCEPT` ve `UNION`'ın karşılığı. (Set sırasız olduğu için çıktıdaki sıra değişebilir.)
