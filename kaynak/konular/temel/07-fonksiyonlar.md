---
baslik: Fonksiyonlar
ozet: def ile fonksiyon tanımlamak, parametreler ve varsayılan değerler, return, yerel ve global değişkenler, docstring.
---
Fonksiyon, tekrar tekrar kullanacağın bir işi bir isim altında toplar. `def` ile tanımlanır, `return` ile sonuç döndürür.

```python
def kdv_ekle(fiyat):
    return fiyat * 1.20

print(kdv_ekle(100))
print(kdv_ekle(50))
```

## Parametreler ve varsayılan değerler

Parametreye varsayılan değer verirsen, çağırırken yazmak isteğe bağlı olur. Parametreleri isimleriyle de verebilirsin; o zaman sıra önemli değil.

```python
def kdv_ekle(fiyat, oran=0.20, yuvarla=2):
    return round(fiyat * (1 + oran), yuvarla)

print(kdv_ekle(100))
print(kdv_ekle(100, 0.10))
print(kdv_ekle(fiyat=33.3, yuvarla=0))
```

## return ile print farkı

`print` ekrana yazar ama değeri geri vermez; `return` değeri geri verir, böylece başka bir hesapta kullanılabilir.

```python
def yazan(x):
    print(x * 2)

def donduren(x):
    return x * 2

a = yazan(5)
b = donduren(5)
print(a, b)
```

`yazan` 10'u ekrana yazdı ama `a`'ya bir şey dönmedi (`None`). `return` olmayan her fonksiyon `None` döner.

## Birden fazla değer döndürmek

`return` arkasına virgülle birden fazla değer yazılırsa tuple döner; çağıran taraf onları açabilir:

```python
def ozet(liste):
    return min(liste), max(liste), sum(liste) / len(liste)

en_az, en_cok, ort = ozet([72, 95, 88, 61])
print(en_az, en_cok, ort)
```

## Yerel ve global değişkenler

Fonksiyon içinde oluşturulan değişken sadece o fonksiyonun içinde yaşar (yerel). Dışarıdakini okuyabilir, ama aynı isme atama yaparsan yeni bir yerel değişken oluşur:

```python
oran = 0.18

def hesapla(x):
    oran = 0.20
    return x * oran

print(hesapla(100), oran)
```

Fonksiyon içindeki `oran = 0.20` dışarıdaki `oran`'ı değiştirmedi.

:::kural
Fonksiyonun ihtiyaç duyduğu her şeyi parametre olarak ver, sonucu `return` ile al. Dışarıdaki değişkenlere bağımlı fonksiyonlar test edilmesi zor ve hataya açık kod üretir.
:::

## Docstring

Fonksiyonun ilk satırına üç tırnak içinde yazılan açıklama. Ne yaptığını, parametrelerini ve ne döndürdüğünü anlatır; `help()` ile görünür.

```python
def oran_hesapla(pay, payda):
    """pay / payda oranını yüzde olarak, 2 ondalıkla döner."""
    return round(100 * pay / payda, 2)

print(oran_hesapla(342, 891))
print(oran_hesapla.__doc__)
```

:::ipucu
Miuul projelerindeki `grab_col_names`, `outlier_thresholds` gibi fonksiyonlar tam olarak bu fikirle yazılmış: her veri setinde tekrar eden adımları bir kez yazıp her yerde kullanmak.
:::
