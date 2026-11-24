---
baslik: CASE WHEN
ozet: Koşula göre değer üretmek. Gruplara ayırma, koşullu sayma ve satırları sütunlara çevirme.
alistirma: sql | CASE WHEN
---
`CASE WHEN`, SQL'in if-else'idir. Koşulları yukarıdan aşağı dener, ilk doğru olanın değerini döner. Hiçbiri doğru değilse `ELSE`'in değerini (`ELSE` yoksa NULL).

```sql titanic
SELECT Name, Age,
       CASE
         WHEN Age < 13 THEN 'Çocuk'
         WHEN Age < 18 THEN 'Genç'
         WHEN Age < 60 THEN 'Yetişkin'
         ELSE 'Yaşlı'
       END AS yas_grubu
FROM titanic
LIMIT 5;
```

İkinci koşulda `Age >= 13 AND Age < 18` yazmaya gerek yok: 13'ten küçükler zaten ilk satırda yakalandı.

:::dikkat
Yukarıdaki sorguda yaşı bilinmeyen biri hiçbir `WHEN`'e uymaz ve `ELSE`'e düşüp **'Yaşlı'** olur. NULL kontrolünü her zaman en başa koy: `WHEN Age IS NULL THEN 'Bilinmiyor'`.
:::

## Gruplama ile birlikte

`CASE` ile ürettiğin sütuna göre gruplayabilirsin:

```sql titanic
SELECT CASE
         WHEN Age IS NULL THEN 'Bilinmiyor'
         WHEN Age < 13 THEN 'Çocuk'
         WHEN Age < 18 THEN 'Genç'
         WHEN Age < 60 THEN 'Yetişkin'
         ELSE 'Yaşlı'
       END AS yas_grubu,
       COUNT(*) AS yolcu,
       ROUND(100.0 * AVG(Survived), 2) AS oran
FROM titanic
GROUP BY yas_grubu
ORDER BY oran DESC;
```

## Koşullu sayma

`SUM(CASE WHEN koşul THEN 1 ELSE 0 END)` koşulu sağlayan satırları sayar. Bir grubun içinde birden fazla şeyi aynı anda saymak için çok kullanılır:

```sql hr
SELECT Department,
       COUNT(*) AS calisan,
       SUM(CASE WHEN Attrition = 'Yes' THEN 1 ELSE 0 END) AS ayrilan,
       SUM(CASE WHEN OverTime = 'Yes' THEN 1 ELSE 0 END) AS fazla_mesai
FROM hr
GROUP BY Department;
```

## Satırları sütunlara çevirmek (pivot)

Aynı kalıpla uzun bir tabloyu geniş bir tabloya çevirebilirsin. Sınıf satırlarda, cinsiyet sütunlarda:

```sql titanic
SELECT Pclass,
       ROUND(100.0 * AVG(CASE WHEN Sex = 'female' THEN Survived END), 2) AS kadin,
       ROUND(100.0 * AVG(CASE WHEN Sex = 'male' THEN Survived END), 2) AS erkek
FROM titanic
GROUP BY Pclass
ORDER BY Pclass;
```

`ELSE` yazmadığımız için koşula uymayan satırlar NULL olur ve `AVG` onları atlar. Böylece `kadin` sütunu sadece kadınların ortalamasını verir.

:::ipucu
Excel'deki pivot tablonun SQL hali bu. SQL Server'da `PIVOT` diye ayrı bir sözdizimi de var, ama `CASE` her veritabanında çalışır.
:::
