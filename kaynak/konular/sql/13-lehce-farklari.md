---
baslik: Lehçe farkları
ozet: SQLite, SQL Server ve BigQuery arasında aynı işin farklı yazılışları. İş yerinde başka bir veritabanına geçerken başvuru tablosu.
---
SQL bir standart, ama her veritabanı kendi "lehçesini" konuşur. SorguLab SQLite kullanıyor; iş yerinde muhtemelen SQL Server, BigQuery, PostgreSQL ya da Oracle ile çalışacaksın. Mantık aynı kalır, değişen çoğunlukla fonksiyon adlarıdır.

## İlk N satır

| SQLite / PostgreSQL / BigQuery | SQL Server | Oracle |
|---|---|---|
| `SELECT … LIMIT 10` | `SELECT TOP 10 …` | `FETCH FIRST 10 ROWS ONLY` |

```sql calistirma
-- SQL Server
SELECT TOP 10 ProductName, UnitPrice
FROM Products
ORDER BY UnitPrice DESC;
```

## Tarih fonksiyonları

| İş | SQLite | SQL Server | BigQuery |
|---|---|---|---|
| Yıl | `strftime('%Y', d)` | `YEAR(d)` | `EXTRACT(YEAR FROM d)` |
| Gün farkı | `julianday(b) - julianday(a)` | `DATEDIFF(DAY, a, b)` | `DATE_DIFF(b, a, DAY)` |
| Gün ekle | `date(d, '+7 days')` | `DATEADD(DAY, 7, d)` | `DATE_ADD(d, INTERVAL 7 DAY)` |
| Ay başı | `date(d, 'start of month')` | `DATEFROMPARTS(YEAR(d), MONTH(d), 1)` | `DATE_TRUNC(d, MONTH)` |
| Bugün | `date('now')` | `GETDATE()` | `CURRENT_DATE()` |

## Metin fonksiyonları

| İş | SQLite | SQL Server | BigQuery |
|---|---|---|---|
| Parça | `SUBSTR(s, 1, 3)` | `SUBSTRING(s, 1, 3)` | `SUBSTR(s, 1, 3)` |
| Konum | `INSTR(s, ',')` | `CHARINDEX(',', s)` | `STRPOS(s, ',')` |
| Uzunluk | `LENGTH(s)` | `LEN(s)` | `LENGTH(s)` |
| Birleştir | `a \|\| b` | `a + b` veya `CONCAT(a, b)` | `CONCAT(a, b)` |
| Listeyi böl | yok | `STRING_SPLIT(s, ',')` | `SPLIT(s, ',')` + `UNNEST` |

:::dikkat
SQL Server'daki `CHARINDEX`'te argümanların sırası terstir: önce aranan, sonra metin. `INSTR(Name, ',')` → `CHARINDEX(',', Name)`.
:::

## Tablo ve sütun adlarında boşluk

| SQLite / PostgreSQL | SQL Server | BigQuery / MySQL |
|---|---|---|
| `"Order Details"` | `[Order Details]` | `` `Order Details` `` |

SorguLab'deki Northwind'de bu tablo `OrderDetails` olarak boşluksuz.

## Window function sonucunu filtrelemek

BigQuery ve Snowflake'te `QUALIFY` ile CTE'ye gerek kalmaz:

```sql calistirma
-- BigQuery
SELECT Pclass, Name, Age
FROM titanic
WHERE Age IS NOT NULL
QUALIFY ROW_NUMBER() OVER (PARTITION BY Pclass ORDER BY Age DESC) = 1;
```

SQLite ve SQL Server'da `QUALIFY` yok; "Window function'lar" konusundaki CTE kalıbı kullanılır.

## Tam sayı bölmesi

| İfade | SQLite / SQL Server / PostgreSQL | BigQuery / MySQL |
|---|---|---|
| `7 / 2` | 3 (tam sayı) | 3.5 |

Oran hesaplarında her veritabanında güvenli yol `100.0 * a / b` yazmaktır.

## Koşullu sayma kısayolları

```sql calistirma
-- BigQuery
SELECT COUNTIF(Survived = 1) AS kurtulan FROM titanic;
-- PostgreSQL
SELECT COUNT(*) FILTER (WHERE Survived = 1) AS kurtulan FROM titanic;
-- Her yerde çalışan
SELECT SUM(CASE WHEN Survived = 1 THEN 1 ELSE 0 END) AS kurtulan FROM titanic;
```
