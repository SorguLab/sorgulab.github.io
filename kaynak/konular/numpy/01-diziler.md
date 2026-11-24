---
baslik: Diziler
ozet: NumPy dizisi (ndarray) nedir, nasıl oluşturulur, shape ve dtype. Döngüsüz (vektörel) hesap.
alistirma: python | NumPy
---
NumPy, Python'da sayısal hesabın temeli. pandas da arka planda NumPy dizilerini kullanır: bir DataFrame sütunu, aslında etiketli bir NumPy dizisidir.

## Dizi oluşturmak

```python
import numpy as np
a = np.array([3, 7, 1, 9])
print(a, type(a))
print(np.arange(0, 10, 2))
print(np.linspace(0, 1, 5))
print(np.zeros(3), np.ones(3))
```

`np.arange` Python'daki `range` gibi çalışır, `np.linspace` iki değer arasını eşit aralıklarla böler.

## shape ve dtype

Liste her tipte eleman tutabilir; NumPy dizisinin bütün elemanları **aynı tipte** olur. Bu sayede hızlıdır.

```python
m = np.array([[1, 2, 3], [4, 5, 6]])
print(m.shape, m.ndim, m.dtype, m.size)
np.array([1, 2.5, 3]).dtype
```

Tam sayılarla ondalık karışınca hepsi `float64` oldu.

## Vektörel hesap: döngü yok

Listeyle her elemana işlem yapmak için döngü gerekir. NumPy'da işlem tüm diziye aynı anda uygulanır:

```python
fiyat = np.array([100, 250, 80])
adet = np.array([3, 1, 5])
print(fiyat * adet)
print(fiyat * 1.2)
print((fiyat * adet).sum())
```

```python
[100, 250, 80] * 2
```

Listeyle aynı işlem bambaşka bir şey yapar: listeyi iki kez yan yana koyar. Sayısal hesapta liste değil dizi kullanmanın sebebi bu.

## DataFrame'den diziye

```python hr
gelir = hr["MonthlyIncome"].to_numpy()
print(type(gelir), gelir.shape, gelir[:5])
round(gelir.mean(), 2)
```

:::ipucu
Ne zaman NumPy, ne zaman pandas? Etiketli tablo (sütun adları, karışık tipler, gruplama, birleştirme) için pandas; saf sayısal hesap, matris işlemleri ve hızlı koşullu atama için NumPy. Pratikte ikisi birlikte kullanılır: `np.where`, `np.select`, `np.log` pandas sütunlarına doğrudan uygulanır.
:::
