---
baslik: İndeksleme
ozet: Dilimleme, iki boyutlu dizilerde satır/sütun seçimi, boolean maske ve fancy indexing.
---
## Tek boyutta

Listedeki gibi: indeks 0'dan başlar, dilimde bitiş hariç.

```python
import numpy as np
a = np.array([10, 20, 30, 40, 50, 60])
print(a[0], a[-1])
print(a[1:4])
print(a[::2])
```

## İki boyutta

`dizi[satır, sütun]`. `:` "hepsi" demek.

```python
m = np.array([[1, 2, 3],
              [4, 5, 6],
              [7, 8, 9]])
print(m[1, 2])
print(m[0])
print(m[:, 1])
print(m[:2, 1:])
```

## Boolean maske

Diziyi bir koşulla karşılaştırınca True/False dizisi elde edersin; bunu indeks olarak verince koşula uyan elemanlar seçilir. pandas'taki filtrelemenin temeli bu.

```python
maas = np.array([4200, 8800, 3100, 15000, 6700])
print(maas > 5000)
print(maas[maas > 5000])
print((maas > 5000).sum(), (maas > 5000).mean())
```

Birden fazla koşul pandas'taki gibi `&`, `|` ve parantezle:

```python
maas[(maas > 4000) & (maas < 10000)]
```

## Fancy indexing: konum listesiyle seçmek

```python
print(a[[0, 2, 5]])
sira = np.argsort(maas)[::-1]
print(sira)
maas[sira]
```

`np.argsort` diziyi sıralayacak **konumları** verir; `[::-1]` ile ters çevirince büyükten küçüğe sıra olur.

## Maskeyle değer atamak

```python
duzeltilmis = maas.copy()
duzeltilmis[duzeltilmis > 10000] = 10000
duzeltilmis
```

:::dikkat
NumPy'da dilim (`a[1:4]`) bir kopya değil, orijinal dizinin bir **görünümüdür**: dilimde yaptığın değişiklik orijinali de değiştirir. Orijinali korumak için `.copy()` kullan.
:::

```python
b = a[1:3]
b[0] = 999
a
```
