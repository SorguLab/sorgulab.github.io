---
baslik: Koşullu işlemler
ozet: np.where ile iki seçenekli, np.select ile çok seçenekli koşullu değer atama ve np.clip ile sınırlama.
---
## np.where

`np.where(koşul, doğruysa, yanlışsa)` her eleman için koşula göre iki değerden birini seçer. pandas sütunlarına doğrudan uygulanır.

```python hr satir=5
import numpy as np
hr["yuksek_maas"] = np.where(hr["MonthlyIncome"] > 10000, "Evet", "Hayır")
hr["yuksek_maas"].value_counts()
```

İç içe yazarak üç seçenek de yapılabilir, ama okunması zorlaşır:

```python
np.where(hr["Age"] < 30, "Genç", np.where(hr["Age"] < 45, "Orta", "Kıdemli"))[:6]
```

## np.select: çok seçenekli

Koşulların ve değerlerin listesini alır; ilk doğru koşulun değeri seçilir. SQL'deki `CASE WHEN`'in tam karşılığı.

```python
kosullar = [
    hr["Age"] < 30,
    hr["Age"] < 45,
]
degerler = ["Genç", "Orta"]
hr["yas_grubu"] = np.select(kosullar, degerler, default="Kıdemli")
hr.groupby("yas_grubu")["Attrition"].apply(lambda s: round((s == "Yes").mean() * 100, 1))
```

Gençlerde ayrılma oranı belirgin şekilde yüksek.

:::dikkat
`np.select`'te koşulların sırası önemli. `hr["Age"] < 45` koşulunu başa koysaydın 30 yaş altındakiler de "Orta" olurdu, çünkü ilk doğru koşul kazanır.
:::

## np.clip: sınır içine almak

Değerleri bir alt ve üst sınırın içine çeker. Uç değer baskılamanın tek satırlık yolu:

```python
gelir = hr["MonthlyIncome"].to_numpy()
ust = round(np.percentile(gelir, 95), 2)
print(ust, gelir.max())
np.clip(gelir, None, ust).max()
```

## Koşulu sayma ve kontrol

```python
print(np.count_nonzero(gelir > 15000))
print(np.any(gelir < 1000), np.all(gelir > 1000))
```
