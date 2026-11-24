---
baslik: Window function'lar
ozet: Satır sayısını değiştirmeden her satıra grup bazlı bir hesap ekler. GROUP BY satırları gruba indirir, window function her satırı korur.
alistirma: sql | Window Functions
---
`GROUP BY` ile "her sınıfın ortalama ücreti"ni bulursun ama yolcuları kaybedersin: sonuçta 3 satır kalır. Window function aynı hesabı yapar, ama sonucu **her yolcunun satırına** ekler. Böylece "bu yolcu, sınıf ortalamasının ne kadar üstünde ödemiş?" gibi sorular tek sorguda çözülür.

## Temel fikir: OVER

Bir fonksiyonun yanına `OVER (...)` yazınca window function olur. `PARTITION BY` pencereyi (grubu), `ORDER BY` pencerenin içindeki sırayı belirler.

```sql titanic satir=6
SELECT Name, Pclass, Fare,
       ROUND(AVG(Fare) OVER (PARTITION BY Pclass), 2) AS sinif_ort,
       ROUND(Fare - AVG(Fare) OVER (PARTITION BY Pclass), 2) AS fark
FROM titanic
ORDER BY PassengerId
LIMIT 6;
```

891 satırın hepsi duruyor, her satırda kendi sınıfının ortalaması var.

## Sıralama fonksiyonları

| Fonksiyon | Eşit değerlerde | Örnek sıra |
|---|---|---|
| `ROW_NUMBER()` | Her satıra farklı numara | 1, 2, 3, 4 |
| `RANK()` | Aynı numara, sonra atlar | 1, 2, 2, 4 |
| `DENSE_RANK()` | Aynı numara, atlamaz | 1, 2, 2, 3 |

```sql northwind
SELECT ProductName, CategoryID, UnitPrice,
       ROW_NUMBER() OVER (ORDER BY UnitPrice DESC) AS row_number,
       RANK() OVER (ORDER BY UnitPrice DESC) AS rank,
       DENSE_RANK() OVER (ORDER BY UnitPrice DESC) AS dense_rank
FROM Products
ORDER BY UnitPrice DESC, ProductName
LIMIT 7 OFFSET 9;
```

İki çift ürün aynı fiyatta (43,90 ve 38,00). `RANK` eşitlere aynı sırayı verip sonrakini atlıyor (11, 11, 13), `DENSE_RANK` atlamıyor (11, 11, 12). `ROW_NUMBER` ise eşitliği keyfi bozuyor: 38,00'deki iki üründe numaralar alfabetik sırayla bile uyuşmuyor. Kimin önce geleceği önemliyse `OVER (ORDER BY UnitPrice DESC, ProductName)` gibi ikinci bir kriter ekle.

## "Her grubun en …" kalıbı

Her yolcu sınıfındaki en yaşlı yolcu: önce her sınıfın içinde yaşa göre sıra numarası ver, sonra 1 numaraları al.

```sql titanic
WITH s AS (
  SELECT Pclass, Name, Age,
         ROW_NUMBER() OVER (PARTITION BY Pclass ORDER BY Age DESC, PassengerId) AS rn
  FROM titanic
  WHERE Age IS NOT NULL
)
SELECT Pclass, Name, Age
FROM s
WHERE rn = 1
ORDER BY Pclass;
```

:::dikkat
Window function `WHERE` içinde kullanılamaz: `WHERE ROW_NUMBER() OVER (...) = 1` hata verir, çünkü `WHERE`, window function'lardan önce çalışır. Önce CTE'de hesapla, filtreyi dışarıda uygula.
:::

```sql titanic hata
SELECT Name
FROM titanic
WHERE ROW_NUMBER() OVER (ORDER BY Age DESC) = 1;
```

## NTILE: eşit gruplara bölmek

`NTILE(n)` satırları sıraya göre n eşit gruba böler. Çeyrek (4), beşli (5) dilimler, RFM skorları için kullanılır.

```sql titanic
WITH c AS (
  SELECT Survived, NTILE(4) OVER (ORDER BY Fare, PassengerId) AS ceyrek
  FROM titanic
)
SELECT ceyrek, COUNT(*) AS yolcu, ROUND(100.0 * AVG(Survived), 2) AS oran
FROM c
GROUP BY ceyrek
ORDER BY ceyrek;
```

## LAG ve LEAD: önceki ve sonraki satır

`LAG(sütun)` bir önceki satırın, `LEAD(sütun)` bir sonraki satırın değerini getirir. Aydan aya değişim hesaplarının temeli:

```sql northwind
WITH aylik AS (
  SELECT strftime('%Y-%m', o.OrderDate) AS ay,
         ROUND(SUM(od.UnitPrice * od.Quantity * (1 - od.Discount)), 0) AS ciro
  FROM Orders o
  JOIN OrderDetails od ON od.OrderID = o.OrderID
  WHERE o.OrderDate >= '1997-01-01' AND o.OrderDate < '1997-07-01'
  GROUP BY ay
)
SELECT ay, ciro,
       LAG(ciro) OVER (ORDER BY ay) AS onceki_ay,
       ciro - LAG(ciro) OVER (ORDER BY ay) AS degisim
FROM aylik
ORDER BY ay;
```

İlk ayın önceki ayı olmadığı için `LAG` NULL döner.

## Kümülatif toplam

`ORDER BY` olan bir `SUM() OVER`, baştan o satıra kadarki toplamı verir:

```sql northwind
SELECT strftime('%Y-%m', OrderDate) AS ay,
       COUNT(*) AS siparis,
       SUM(COUNT(*)) OVER (ORDER BY strftime('%Y-%m', OrderDate)) AS kumulatif
FROM Orders
WHERE OrderDate < '1996-12-01'
GROUP BY ay
ORDER BY ay;
```

Burada `COUNT(*)` önce `GROUP BY` ile hesaplanıyor, dıştaki `SUM(...) OVER` ise o sonuçlar üzerinde çalışıyor.

## pandas karşılığı

| SQL | pandas |
|---|---|
| `AVG(x) OVER (PARTITION BY g)` | `df.groupby("g")["x"].transform("mean")` |
| `ROW_NUMBER() OVER (PARTITION BY g ORDER BY x DESC)` | `df.groupby("g")["x"].rank(method="first", ascending=False)` |
| `LAG(x) OVER (ORDER BY t)` | `df.sort_values("t")["x"].shift(1)` |
| `SUM(x) OVER (ORDER BY t)` | `df.sort_values("t")["x"].cumsum()` |
