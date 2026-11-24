---
baslik: JOIN'ler
ozet: Tabloları ortak anahtarla birleştirmek. INNER, LEFT, self-join, çoklu JOIN, fan-out ve anti-join.
alistirma: sql | JOIN
---
Gerçek veritabanlarında bilgi birçok tabloya dağılır. Northwind'de sipariş `Orders`'ta, müşterinin adı `Customers`'ta, ürünler `OrderDetails` ve `Products`'ta. `JOIN` bunları ortak bir sütun (anahtar) üzerinden birleştirir.

## INNER JOIN

İki tabloda da eşleşen satırları getirir. `ON` hangi sütunların eşleşeceğini söyler. Tablolara kısa takma ad (`o`, `c`) vermek yazımı kolaylaştırır.

```sql northwind satir=5
SELECT o.OrderID, c.CompanyName, o.OrderDate
FROM Orders o
JOIN Customers c ON c.CustomerID = o.CustomerID
ORDER BY o.OrderID
LIMIT 5;
```

`JOIN` yazmak `INNER JOIN` ile aynıdır.

## LEFT JOIN

Soldaki tablonun **tüm** satırlarını getirir; sağda eşleşme yoksa sağın sütunları NULL olur. "Hiç sipariş vermemiş müşteriler de görünsün" gibi durumlar için:

```sql northwind
SELECT c.CompanyName, COUNT(o.OrderID) AS siparis
FROM Customers c
LEFT JOIN Orders o ON o.CustomerID = c.CustomerID
GROUP BY c.CustomerID
ORDER BY siparis, c.CompanyName
LIMIT 4;
```

`COUNT(*)` değil `COUNT(o.OrderID)` kullandık: siparişi olmayan müşteride `o.OrderID` NULL olduğu için 0 sayılır. `COUNT(*)` o satırı da sayıp 1 derdi.

:::dikkat
`LEFT JOIN`'den sonra sağ tablonun bir sütununa `WHERE` ile koşul koyarsan (`WHERE o.ShipCountry = 'Germany'`), NULL satırlar elenir ve sorgu sessizce `INNER JOIN`'e dönüşür. Sağ tabloya koşulu `ON` içine yaz: `LEFT JOIN Orders o ON o.CustomerID = c.CustomerID AND o.ShipCountry = 'Germany'`.
:::

## Birden fazla JOIN

Zincirleme birleştirme: sipariş → kalem → ürün → kategori.

```sql northwind
SELECT cat.CategoryName,
       ROUND(SUM(od.UnitPrice * od.Quantity * (1 - od.Discount)), 2) AS ciro
FROM OrderDetails od
JOIN Products p ON p.ProductID = od.ProductID
JOIN Categories cat ON cat.CategoryID = p.CategoryID
GROUP BY cat.CategoryName
ORDER BY ciro DESC
LIMIT 4;
```

## Kod tablosuyla JOIN

Sayısal kodları anlamlı etiketlere çevirmek için küçük "sözlük" tabloları kullanılır. İK verisinde `Education` 1-5 arası bir kod; adı `egitim_kod` tablosunda:

```sql hr
SELECT e.egitim_adi, COUNT(*) AS calisan
FROM hr h
JOIN egitim_kod e ON e.Education = h.Education
GROUP BY e.Education
ORDER BY e.Education;
```

## Self-join: tablonun kendisiyle birleşmesi

Northwind'de her çalışanın yöneticisi `ReportsTo` sütununda, yine `Employees` tablosundan bir ID. Tabloyu iki farklı takma adla iki kez kullanırız:

```sql northwind
SELECT e.FirstName || ' ' || e.LastName AS calisan,
       m.FirstName || ' ' || m.LastName AS yonetici
FROM Employees e
LEFT JOIN Employees m ON m.EmployeeID = e.ReportsTo
ORDER BY e.EmployeeID;
```

Genel müdürün yöneticisi olmadığı için `LEFT JOIN` kullandık; `INNER` olsaydı listeden düşerdi.

## Fan-out: satırların çoğalması

Bir siparişin birden çok kalemi var. `Orders`'ı `OrderDetails` ile birleştirince her sipariş, kalem sayısı kadar tekrar eder. O satırlar üzerinde `SUM(Freight)` alırsan navlun ücreti kalem sayısı kadar katlanır:

```sql northwind
SELECT
  (SELECT ROUND(SUM(Freight), 2) FROM Orders) AS dogru_navlun,
  (SELECT ROUND(SUM(o.Freight), 2) FROM Orders o JOIN OrderDetails od ON od.OrderID = o.OrderID) AS sisirilmis_navlun;
```

:::kural
JOIN'den önce ve sonra satır sayısını kontrol et. Beklemediğin bir artış varsa "bire çok" bir ilişkiyi birleştirmişsindir. Özeti ya JOIN'den önce (alt sorguda) al ya da doğru seviyede grupla.
:::

## Anti-join: eşleşmeyenleri bulmak

"Hiç satılmamış ürünler", "hiç sipariş vermemiş müşteriler" gibi sorular için `LEFT JOIN` + `IS NULL`:

```sql northwind
SELECT c.CompanyName
FROM Customers c
LEFT JOIN Orders o ON o.CustomerID = c.CustomerID
WHERE o.OrderID IS NULL
ORDER BY c.CompanyName;
```

Aynı soru `NOT EXISTS` ile de yazılır ("Alt sorgular ve CTE" konusu).
