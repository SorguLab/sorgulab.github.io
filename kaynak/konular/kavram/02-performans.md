---
baslik: Performans
ozet: İndeks nedir, sorgu planı nasıl okunur, yavaş bir sorgu nasıl hızlandırılır?
---
Küçük tablolarda her sorgu hızlıdır. Milyonlarca satırda ise aynı sonucu veren iki sorgudan biri saniyeler, diğeri dakikalar sürebilir.

## İndeks

İndeks, bir kitabın sonundaki dizin gibidir: "Python" kelimesini bulmak için kitabın tamamını okumazsın, dizine bakıp sayfaya gidersin. Veritabanı da indeksli bir sütunda aramayı tüm tabloyu taramadan yapar.

- Primary key'ler otomatik olarak indekslidir.
- `WHERE`, `JOIN ... ON` ve `ORDER BY`'da sık kullanılan sütunlar indeks için iyi adaylardır.
- İndeks okumayı hızlandırır ama yazmayı (INSERT/UPDATE) yavaşlatır ve yer kaplar. Her sütuna indeks koymak çözüm değildir.

## Sorgu planı

`EXPLAIN QUERY PLAN` (SQLite), `EXPLAIN` (PostgreSQL, MySQL), "Display Estimated Execution Plan" (SQL Server) veritabanının sorguyu nasıl çalıştıracağını gösterir.

```sql northwind
EXPLAIN QUERY PLAN
SELECT * FROM Orders WHERE CustomerID = 'ALFKI';
```

`SCAN` tüm tablonun satır satır okunduğu anlamına gelir. İndeks olsaydı `SEARCH ... USING INDEX` görürdük:

```sql northwind
CREATE INDEX ix_orders_customer ON Orders(CustomerID);
EXPLAIN QUERY PLAN
SELECT * FROM Orders WHERE CustomerID = 'ALFKI';
```

## Sorguyu hızlandırmanın yolları

1. **Planı oku:** Darboğaz nerede? Tam tablo taraması mı, büyük bir JOIN mi, sıralama mı?
2. **Sadece gereken sütunları seç:** `SELECT *` yerine sütun adları. BigQuery gibi sütun bazlı sistemlerde okunan veri ve **maliyet** doğrudan azalır.
3. **Filtreyi erken uygula:** Veriyi JOIN'den önce küçült.
4. **Sütunu fonksiyona sarma:** `WHERE YEAR(tarih) = 2024` indeksi kullanamaz; `WHERE tarih >= '2024-01-01' AND tarih < '2025-01-01'` kullanabilir.
5. **Gereksiz `DISTINCT` ve `ORDER BY`'dan kaçın:** İkisi de pahalı sıralama işlemi gerektirir.
6. **Fan-out'u kontrol et:** JOIN sonrası satır sayısı patlıyorsa önce özetle, sonra birleştir.
7. **Partition ve clustering:** BigQuery'de tabloyu tarihe göre bölmek (partition), sadece ilgili günlerin okunmasını sağlar.

:::dikkat
`WHERE tarih LIKE '2024%'` ya da `WHERE CAST(tarih AS TEXT) ...` gibi ifadeler de sütunu dönüştürdüğü için indeksi devre dışı bırakır. Kural: indeksli sütun karşılaştırmanın bir tarafında **çıplak** durmalı.
:::
