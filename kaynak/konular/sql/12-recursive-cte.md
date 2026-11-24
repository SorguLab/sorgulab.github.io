---
baslik: Recursive CTE
ozet: Kendini çağıran sorgu. Hiyerarşiler (çalışan → yönetici zinciri) ve sayı/tarih dizileri üretmek.
---
Bazı sorular "kaç adım sürecek bilmiyorum" türündendir: bir çalışanın yöneticisinin yöneticisinin… en tepeye kadar zinciri. Self-join tek bir adımı çözer; kaç adım olacağı belli değilse recursive CTE gerekir.

## Yapısı

Recursive CTE iki parçadan oluşur, `UNION ALL` ile birleşir:

1. **Başlangıç (anchor):** İlk satırlar. Örneğin yöneticisi olmayan genel müdür.
2. **Tekrar eden kısım:** CTE'nin kendisini kullanarak bir sonraki seviyeyi bulur. Yeni satır gelmeyince durur.

## Basit örnek: 1'den 5'e sayılar

```sql titanic
WITH RECURSIVE sayi(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM sayi WHERE n < 5
)
SELECT n FROM sayi;
```

`WHERE n < 5` durma koşulu. Unutursan sorgu sonsuza kadar çalışır.

## Organizasyon şeması

Northwind'de en tepedeki çalışandan başlayıp her çalışanın seviyesini ve yönetim zincirini çıkaralım:

```sql northwind
WITH RECURSIVE hiyerarsi AS (
  SELECT EmployeeID, FirstName || ' ' || LastName AS ad, 1 AS seviye,
         FirstName AS zincir
  FROM Employees
  WHERE ReportsTo IS NULL
  UNION ALL
  SELECT e.EmployeeID, e.FirstName || ' ' || e.LastName, h.seviye + 1,
         h.zincir || ' → ' || e.FirstName
  FROM Employees e
  JOIN hiyerarsi h ON e.ReportsTo = h.EmployeeID
)
SELECT seviye, ad, zincir
FROM hiyerarsi
ORDER BY zincir;
```

Her turda bir önceki seviyenin çalışanlarına bağlı olanlar eklenir. `zincir` sütunu yolu biriktirir.

## Eksik ayları doldurmak

Aylık raporda hiç satış olmayan ay tabloda görünmez. Recursive CTE ile tüm ayların listesini üretip `LEFT JOIN` yaparsan boş aylar 0 ile görünür:

```sql northwind
WITH RECURSIVE aylar(ay) AS (
  SELECT '1998-01-01'
  UNION ALL
  SELECT date(ay, '+1 month') FROM aylar WHERE ay < '1998-06-01'
)
SELECT strftime('%Y-%m', a.ay) AS ay, COUNT(o.OrderID) AS siparis
FROM aylar a
LEFT JOIN Orders o ON strftime('%Y-%m', o.OrderDate) = strftime('%Y-%m', a.ay)
GROUP BY a.ay
ORDER BY a.ay;
```

Northwind verisi 6 Mayıs 1998'de bittiği için Haziran'da sipariş yok; tarih listesi sayesinde yine de 0 ile görünüyor.

:::not
SQL Server'da `RECURSIVE` kelimesi yazılmaz, sadece `WITH` yeterli. Varsayılan en fazla 100 tur çalışır (`OPTION (MAXRECURSION n)` ile değişir).
:::
