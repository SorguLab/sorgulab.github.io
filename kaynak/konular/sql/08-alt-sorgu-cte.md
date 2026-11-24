---
baslik: Alt sorgular ve CTE
ozet: Sorgu içinde sorgu. WHERE'de alt sorgu, EXISTS / NOT EXISTS ve WITH ile adım adım sorgu kurmak.
alistirma: sql | Subquery / CTE
---
Bazen bir sorgunun cevabı başka bir sorgunun sonucuna bağlıdır: "ortalamanın üzerinde ücret ödeyenler" için önce ortalamayı bilmek gerekir. Alt sorgu (subquery) parantez içinde yazılan ve önce çalışan bir sorgudur.

## Tek değer döndüren alt sorgu

```sql titanic
SELECT Name, Fare
FROM titanic
WHERE Fare > (SELECT AVG(Fare) * 10 FROM titanic)
ORDER BY Fare DESC, PassengerId
LIMIT 5;
```

İç sorgu tek bir sayı (ortalamanın 10 katı) döner, dış sorgu onu bir sabit gibi kullanır.

## Liste döndüren alt sorgu: IN

```sql northwind
SELECT ProductName
FROM Products
WHERE ProductID IN (
  SELECT ProductID FROM OrderDetails WHERE Quantity >= 120
)
ORDER BY ProductName;
```

## EXISTS ve NOT EXISTS

`EXISTS` alt sorgu en az bir satır döndürüyorsa doğrudur. Alt sorgu dıştaki satıra bağlı olabilir (correlated subquery): her müşteri için ayrı ayrı "siparişi var mı?" diye bakılır.

```sql northwind
SELECT CompanyName
FROM Customers c
WHERE NOT EXISTS (
  SELECT 1 FROM Orders o WHERE o.CustomerID = c.CustomerID
)
ORDER BY CompanyName;
```

:::kural
"Hiç … olmayanlar" sorularında `NOT IN` yerine `NOT EXISTS` kullan. Alt sorgudan tek bir NULL gelirse `NOT IN` hiçbir satır döndürmez; `NOT EXISTS` bu tuzağa düşmez.
:::

## CTE: WITH ile adım adım

Alt sorgular iç içe geçtikçe okunması zorlaşır. `WITH` ile her adıma bir ad verip sırayla yazarsın; her adım bir önceki adımı tablo gibi kullanabilir. Bu yapıya CTE (Common Table Expression) denir.

Soru: Her müşterinin toplam harcamasını bul, sonra ortalamanın iki katından fazla harcayanları listele.

```sql northwind
WITH tutar AS (
  SELECT o.CustomerID,
         SUM(od.UnitPrice * od.Quantity * (1 - od.Discount)) AS harcama
  FROM Orders o
  JOIN OrderDetails od ON od.OrderID = o.OrderID
  GROUP BY o.CustomerID
),
esik AS (
  SELECT 2 * AVG(harcama) AS deger FROM tutar
)
SELECT c.CompanyName, ROUND(t.harcama, 2) AS harcama
FROM tutar t
JOIN Customers c ON c.CustomerID = t.CustomerID
WHERE t.harcama > (SELECT deger FROM esik)
ORDER BY t.harcama DESC;
```

Okurken yukarıdan aşağıya bir hikâye gibi ilerler: önce müşteri başına harcama, sonra eşik, sonra filtre.

:::ipucu
Karmaşık bir soruyu çözerken önce ilk CTE'yi yazıp tek başına çalıştır (`WITH tutar AS (...) SELECT * FROM tutar`), sonucunun doğru olduğunu gör, sonra bir sonraki adımı ekle. Hata ayıklamanın en kolay yolu bu.
:::

## FROM'da alt sorgu

CTE yerine alt sorguyu doğrudan `FROM`'a da yazabilirsin. Kısa durumlarda pratik:

```sql titanic
SELECT aile_buyuklugu, COUNT(*) AS yolcu
FROM (SELECT SibSp + Parch + 1 AS aile_buyuklugu FROM titanic) a
GROUP BY aile_buyuklugu
ORDER BY aile_buyuklugu
LIMIT 5;
```
