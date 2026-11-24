---
baslik: İstatistik fonksiyonları
ozet: mean, median, std, percentile, argmax gibi özet fonksiyonları ve axis parametresinin mantığı.
---
```python hr
import numpy as np
gelir = hr["MonthlyIncome"].to_numpy()
yas = hr["Age"].to_numpy()
print("ortalama:", round(np.mean(gelir), 2))
print("medyan:", np.median(gelir))
print("std:", round(np.std(gelir), 2))
print("en az / en çok:", gelir.min(), gelir.max())
print("çeyrekler:", np.percentile(gelir, [25, 50, 75]))
```

Ortalama (6.502) medyandan (4.919) belirgin şekilde büyük: gelir sağa çarpık, birkaç yüksek maaş ortalamayı yukarı çekiyor. Çarpık verilerde "tipik" değeri medyan daha iyi anlatır.

## argmax ve argmin

En büyük / en küçük değerin kendisini değil **konumunu** verir; o konumla başka bir diziden bilgi çekebilirsin.

```python
i = np.argmax(gelir)
print(i, gelir[i], yas[i], hr["JobRole"].iloc[i])
```

## axis: hangi yönde?

İki boyutlu dizide `axis=0` sütun boyunca (her sütun için bir sonuç), `axis=1` satır boyunca (her satır için bir sonuç) hesaplar.

```python
puan = np.array([[70, 85, 90],
                 [60, 75, 80]])
print(puan.mean())
print(puan.mean(axis=0))
print(puan.mean(axis=1))
```

:::kural
`axis=0` → aşağı doğru git, satırları birleştir: sonuç sütun başına. `axis=1` → sağa doğru git, sütunları birleştir: sonuç satır başına. pandas'taki `df.sum(axis=1)` de aynı mantık.
:::

## NaN ile çalışmak

Bir dizide `NaN` varsa `mean`, `sum` gibi fonksiyonlar `nan` döner. `np.nanmean`, `np.nansum` gibi sürümler eksikleri atlar:

```python
olcum = np.array([12.0, np.nan, 15.0, 9.0])
np.mean(olcum), np.nanmean(olcum), np.isnan(olcum).sum()
```

:::not
pandas'ın `.mean()` metodu eksikleri varsayılan olarak atlar, NumPy'ınki atlamaz. Aynı veride farklı sonuç görürsen ilk bakılacak yer burası.
:::

## Korelasyon

```python
round(np.corrcoef(yas, gelir)[0, 1], 3)
```

Yaş ile aylık gelir arasında orta güçte pozitif bir ilişki var: kıdem arttıkça maaş artıyor.
