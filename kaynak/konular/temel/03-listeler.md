---
baslik: Listeler
ozet: Sıralı ve değiştirilebilir koleksiyon. append, insert, pop, remove, indeksleme, sort ile sorted farkı ve kopyalama tuzağı.
---
Liste köşeli parantezle yazılır, içinde farklı tiplerde değerler olabilir. Sıralıdır (her elemanın bir indeksi var) ve değiştirilebilir.

```python
notlar = [85, 92, 78]
karisik = ["SQL", 3, True, None]
len(notlar), notlar[0], notlar[-1]
```

Dilimleme metinlerdeki gibi çalışır:

```python
sayilar = [10, 20, 30, 40, 50]
sayilar[1:3], sayilar[:2], sayilar[-2:]
```

## Eleman eklemek ve çıkarmak

| Metot | Ne yapar |
|---|---|
| `append(x)` | Sona ekler |
| `insert(i, x)` | `i` konumuna ekler |
| `pop()` | Sondakini çıkarır ve döner |
| `pop(i)` | `i` konumundakini çıkarır ve döner |
| `remove(x)` | Değeri `x` olan **ilk** elemanı siler |
| `extend(liste)` | Başka bir listenin elemanlarını ekler |

```python
diller = ["SQL", "Python"]
diller.append("R")
diller.insert(1, "DAX")
print(diller)
cikan = diller.pop()
print(cikan, diller)
diller.remove("DAX")
print(diller)
```

Bu metotlar listenin **kendisini** değiştirir ve geriye bir şey döndürmez (`pop` hariç).

## sort ile sorted farkı

```python
puanlar = [72, 95, 88, 61]
yeni = sorted(puanlar)
print(yeni, puanlar)
puanlar.sort(reverse=True)
print(puanlar)
```

`sorted()` yeni bir sıralı liste döner, orijinale dokunmaz. `.sort()` listenin kendisini sıralar.

:::dikkat
`puanlar = puanlar.sort()` yazarsan listeyi kaybedersin: `.sort()` bir şey döndürmediği için `puanlar` artık `None` olur.
:::

## Sayısal işlemler

```python
sum(puanlar), min(puanlar), max(puanlar), sum(puanlar) / len(puanlar)
```

## Kopyalama tuzağı

`b = a` yazmak listeyi kopyalamaz; aynı listeye ikinci bir isim verir. Birinde yaptığın değişiklik ötekinde de görünür:

```python
a = [1, 2, 3]
b = a
b.append(4)
print(a)
c = a.copy()
c.append(5)
print(a, c)
```

:::kural
Bir listeyi değiştirmeden önce orijinali korumak istiyorsan `.copy()` (ya da `list(a)`, `a[:]`) kullan. pandas'ta da aynı durum var: `df2 = df` kopya değildir, `df2 = df.copy()` kopyadır.
:::
