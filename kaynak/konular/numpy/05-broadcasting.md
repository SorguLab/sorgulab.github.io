---
baslik: Broadcasting
ozet: Farklı boyutlu dizilerle işlem yapmak. Sütun bazında normalizasyon ve standartlaştırma örneği.
---
Broadcasting, farklı şekildeki diziler arasında işlem yaparken NumPy'ın küçük diziyi büyüğe "yayması"dır. En basit hali zaten tanıdık: bir diziyi bir sayıyla çarpmak.

```python
import numpy as np
a = np.array([1, 2, 3])
a * 10
```

Sayı (tek değer) dizinin her elemanına yayıldı.

## Dizi ile dizi

Bir tablonun her satırından aynı vektörü çıkarmak:

```python
m = np.array([[10, 200, 3000],
              [20, 400, 6000],
              [30, 600, 9000]])
ortalama = m.mean(axis=0)
print(ortalama, ortalama.shape)
m - ortalama
```

`m` 3×3, `ortalama` 3 elemanlı. NumPy `ortalama`'yı her satıra uyguladı: her sütundan kendi ortalaması çıktı.

## Normalizasyon ve standartlaştırma

Ölçekleri çok farklı sütunlar (yaş: 18-60, gelir: 1000-20000) birçok modelde karşılaştırılabilir olmalı.

- **Min-max:** `(x - min) / (max - min)`, sonuç 0-1 arası.
- **Standart (z-skoru):** `(x - ortalama) / std`, sonuç ortalama 0, std 1.

```python hr
X = hr[["Age", "MonthlyIncome", "TotalWorkingYears"]].to_numpy(dtype=float)
minmax = (X - X.min(axis=0)) / (X.max(axis=0) - X.min(axis=0))
z = (X - X.mean(axis=0)) / X.std(axis=0)
print(minmax.min(axis=0), minmax.max(axis=0))
print(z.mean(axis=0).round(6), z.std(axis=0))
```

Tek satırlık ifadeler, 1470 satır × 3 sütunun her biri için ayrı ayrı çalıştı; döngü yok.

## Kural: şekiller uyumlu olmalı

NumPy şekilleri sağdan sola karşılaştırır; her boyutta ya eşit olmalılar ya da biri 1 olmalı. Uyumsuzsa hata verir:

```python hata
np.ones((3, 3)) + np.array([1, 2])
```

Satır bazında işlem (her satırdan kendi ortalamasını çıkarmak) için ortalamayı sütun vektörüne çevirmek gerekir:

```python
satir_ort = m.mean(axis=1, keepdims=True)
print(satir_ort.shape)
m - satir_ort
```

`keepdims=True` sonucu (3, 1) şeklinde tutar; böylece her satıra yayılabilir.

:::ipucu
scikit-learn'deki `StandardScaler` ve `MinMaxScaler` tam olarak bu hesapları yapar. Elle yazmak, ne yaptıklarını anlamanın en iyi yolu.
:::
