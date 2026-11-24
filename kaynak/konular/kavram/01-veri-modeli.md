---
baslik: Veri modeli
ozet: Primary key, foreign key, ilişki türleri (bire bir, bire çok, çoka çok) ve normalizasyon.
---
Bir veritabanı tasarlanırken bilgi tekrar etmeyecek şekilde tablolara bölünür ve tablolar anahtarlarla birbirine bağlanır. JOIN'lerin neden ve nasıl çalıştığını anlamanın yolu bu yapıyı tanımaktan geçer.

## Primary key (birincil anahtar)

Bir tablodaki her satırı **benzersiz** şekilde tanımlayan sütun. Boş olamaz, tekrar edemez. Northwind'de `Orders.OrderID`, `Customers.CustomerID`.

```sql northwind
SELECT COUNT(*) AS satir, COUNT(DISTINCT OrderID) AS benzersiz
FROM Orders;
```

İkisi eşitse `OrderID` gerçekten benzersizdir.

## Foreign key (yabancı anahtar)

Başka bir tablonun primary key'ine işaret eden sütun. `Orders.CustomerID`, `Customers` tablosundaki bir müşteriyi gösterir. JOIN'ler genellikle foreign key = primary key eşleşmesiyle yapılır.

## İlişki türleri

| Tür | Örnek | Nasıl kurulur |
|---|---|---|
| Bire bir | Çalışan ↔ çalışanın özlük dosyası | Aynı primary key iki tabloda |
| Bire çok | Müşteri → siparişleri | Çok tarafında foreign key (`Orders.CustomerID`) |
| Çoka çok | Sipariş ↔ ürün | Ara tablo (`OrderDetails`: OrderID + ProductID) |

Bir siparişte birden çok ürün, bir üründe birden çok sipariş olabilir. Bu ilişki doğrudan iki tabloyla kurulamaz; `OrderDetails` gibi bir **ara tablo** gerekir. Ara tablonun primary key'i iki sütunun birleşimidir (composite key).

```sql northwind
SELECT COUNT(*) AS kalem, COUNT(DISTINCT OrderID || '-' || ProductID) AS benzersiz_cift
FROM OrderDetails;
```

:::kural
Bire çok bir ilişkiyi JOIN'lerken "bir" tarafındaki satırlar "çok" tarafındaki satır sayısı kadar çoğalır (fan-out). Toplamları hangi seviyede aldığına dikkat et ("JOIN'ler" konusu).
:::

## Normalizasyon

Aynı bilginin birden fazla yerde tekrar etmemesi için tabloları bölme süreci. Amaç tutarsızlığı önlemek: müşterinin adresi her siparişte ayrı yazılsaydı, adres değişince yüzlerce satırı güncellemek gerekirdi.

- **1NF:** Her hücrede tek bir değer olur, liste olmaz. FLO'daki `[ERKEK, KADIN]` sütunu 1NF'i bozar; bu yüzden SQL'de `LIKE` ile uğraşıyoruz.
- **2NF:** Composite key'li tablolarda her sütun anahtarın tamamına bağlıdır, sadece bir parçasına değil. `OrderDetails`'te ürün adı tutulmaz (sadece ProductID'ye bağlı), `Products`'ta tutulur.
- **3NF:** Anahtar olmayan sütunlar başka anahtar olmayan sütunlara bağlı olmaz. Siparişte müşterinin ülkesi değil, sadece CustomerID tutulur.

:::not
Analitik veri ambarlarında (star schema) okuma hızı için bilerek biraz normalizasyondan vazgeçilir (denormalizasyon). "Analitik dünya" konusunda.
:::
