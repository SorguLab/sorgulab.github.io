---
baslik: Analitik dünya
ozet: OLTP ve OLAP farkı, veri ambarı, star schema, fact ve dimension tabloları, ETL ve ELT.
---
## OLTP ve OLAP

| | OLTP (işlem) | OLAP (analiz) |
|---|---|---|
| Amaç | Günlük işlemleri kaydetmek | Geçmiş veriyi analiz etmek |
| Örnek | Sipariş girişi, banka havalesi | Aylık satış raporu, dashboard |
| Sorgu | Kısa, çok sayıda, tek kayıt | Uzun, az sayıda, milyonlarca satır |
| Tasarım | Normalize (çok tablo) | Denormalize (star schema) |
| Sistem | PostgreSQL, SQL Server, Oracle | BigQuery, Snowflake, Redshift, Synapse |

Northwind bir OLTP veritabanı örneği: sipariş, müşteri, ürün ayrı tablolarda, tekrar yok. Analist olarak raporlarını genellikle bu verinin ambara taşınmış bir kopyası üzerinde yaparsın.

## Star schema

Veri ambarlarında en yaygın tasarım. Ortada bir **fact** tablosu, etrafında **dimension** tabloları; çizince yıldıza benzer.

- **Fact tablosu:** Ölçülebilir olaylar ve sayılar. Her satır bir satış kalemi: tarih anahtarı, ürün anahtarı, müşteri anahtarı, adet, tutar. Çok satırlı, dar.
- **Dimension tabloları:** Olayı tanımlayan bağlam. Ürün (ad, kategori, marka), müşteri (şehir, segment), tarih (yıl, ay, çeyrek, tatil mi?). Az satırlı, geniş.

Analiz sorguları neredeyse hep aynı kalıptadır: fact'i dimension'larla JOIN'le, dimension sütunlarına göre grupla, fact sütunlarını topla.

```sql northwind
SELECT cat.CategoryName, strftime('%Y', o.OrderDate) AS yil,
       ROUND(SUM(od.UnitPrice * od.Quantity * (1 - od.Discount)), 0) AS ciro
FROM OrderDetails od
JOIN Orders o ON o.OrderID = od.OrderID
JOIN Products p ON p.ProductID = od.ProductID
JOIN Categories cat ON cat.CategoryID = p.CategoryID
WHERE cat.CategoryName IN ('Beverages', 'Seafood')
GROUP BY cat.CategoryName, yil
ORDER BY cat.CategoryName, yil;
```

Burada `OrderDetails` fact rolünde, `Products`, `Categories` ve tarih dimension rolünde.

:::not
**Snowflake schema:** Dimension'ların da normalize edilip alt tablolara bölündüğü hali (ürün → kategori ayrı tablo). Yerden kazandırır, sorguyu biraz karmaşıklaştırır. Power BI gibi araçlar star schema ile en iyi çalışır.
:::

## Slowly changing dimension

Müşterinin şehri değişince ne olacak? Eski satışlar eski şehirde mi görünsün, yeni şehirde mi?

- **Tip 1:** Üzerine yaz. Geçmiş kaybolur, basit.
- **Tip 2:** Yeni satır ekle, geçerlilik tarihleriyle (`gecerli_baslangic`, `gecerli_bitis`). Geçmiş korunur.

## ETL ve ELT

- **ETL (Extract → Transform → Load):** Veri kaynaktan çekilir, ara bir sunucuda dönüştürülür, sonra ambara yüklenir. Klasik yaklaşım.
- **ELT (Extract → Load → Transform):** Ham veri önce ambara yüklenir, dönüşüm ambarın içinde SQL ile yapılır (dbt gibi araçlarla). BigQuery ve Snowflake'in hesaplama gücü sayesinde bugün daha yaygın.
