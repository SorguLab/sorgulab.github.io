---
baslik: Döngüler
ozet: for ile bir koleksiyonun üzerinden geçmek, while ile koşul doğru olduğu sürece tekrarlamak. break, continue, range, enumerate ve zip.
---
## for döngüsü

`for` bir listenin (ya da metnin, sözlüğün…) her elemanı için bloğu bir kez çalıştırır.

```python
satislar = [120, 340, 90, 410]
toplam = 0
for s in satislar:
    toplam += s
print(toplam)
```

`toplam += s`, `toplam = toplam + s` yazmanın kısa yolu.

## range

Belli sayıda tekrar için `range(n)` 0'dan n-1'e kadar sayı üretir. `range(baş, bitiş, adım)` şeklinde de kullanılır.

```python
print(list(range(5)))
print(list(range(2, 11, 2)))
```

## enumerate ve zip

`enumerate` elemanla birlikte sırasını da verir; `zip` iki listeyi yan yana dolaşır.

```python
aylar = ["Ocak", "Şubat", "Mart"]
for i, ay in enumerate(aylar, start=1):
    print(i, ay)
for ay, s in zip(aylar, satislar):
    print(f"{ay}: {s}")
```

## break: koşul sağlanınca döngüyü durdur

```python
for s in satislar:
    if s > 300:
        print("İlk 300 üstü satış:", s)
        break
```

340 bulununca döngü bitti; 410'a hiç bakılmadı.

## continue: o adımı atla, devam et

```python
for s in satislar:
    if s < 100:
        continue
    print(s)
```

## while: koşul doğru olduğu sürece

Kaç tur süreceği baştan belli değilse `while` kullanılır. Koşul `False` olunca durur.

```python
bakiye = 1000
ay = 0
while bakiye < 1500:
    bakiye *= 1.05
    ay += 1
print(ay, "ayda", round(bakiye, 2))
```

:::dikkat
`while` içinde koşulu değiştiren bir satır yoksa döngü sonsuza kadar çalışır. Yukarıda `bakiye` her turda arttığı için koşul bir noktada `False` oluyor.
:::

## Sözlükte döngü

```python
stok = {"elma": 12, "armut": 0, "kiraz": 5}
for urun, adet in stok.items():
    if adet == 0:
        print(urun, "tükendi")
```

:::kural
pandas'ta satır satır `for` döngüsüyle hesap yapmak (örneğin `for i in range(len(df))`) çok yavaştır. pandas ve NumPy işlemleri tüm sütun üzerinde aynı anda çalışır: `df["toplam"] = df["a"] + df["b"]`. Döngüyü saf Python'da öğren, pandas'ta mümkün olduğunca kaçın.
:::
