---
baslik: Tarih işlemleri
ozet: Tarihten yıl ve ay çıkarmak, iki tarih arasındaki gün farkı, aylık gruplama ve güvenli tarih aralığı.
alistirma: sql | Tarih
---
SQLite'ta ayrı bir tarih tipi yok; tarihler `YYYY-MM-DD` biçiminde metin olarak saklanır. Bu biçimin güzel yanı, alfabetik sıralamanın tarih sıralamasıyla aynı olması: `'1997-03-01' < '1997-12-31'` doğru çalışır.

## strftime: parça çıkarmak

`strftime(biçim, tarih)` tarihten istediğin parçayı metin olarak döner.

| Biçim | Anlamı | Örnek |
|---|---|---|
| `%Y` | Yıl | 1997 |
| `%m` | Ay (01-12) | 03 |
| `%d` | Gün | 15 |
| `%Y-%m` | Yıl-ay | 1997-03 |
| `%w` | Haftanın günü (0 = Pazar) | 6 |

```sql northwind
SELECT strftime('%Y', OrderDate) AS yil, COUNT(*) AS siparis
FROM Orders
GROUP BY yil
ORDER BY yil;
```

## İki tarih arasındaki fark

`julianday` bir tarihi gün sayısına çevirir; iki tarihin farkı gün cinsinden süre olur.

```sql northwind
SELECT OrderID, OrderDate, ShippedDate,
       julianday(ShippedDate) - julianday(OrderDate) AS kargo_gunu
FROM Orders
WHERE ShippedDate IS NOT NULL
ORDER BY kargo_gunu DESC, OrderID
LIMIT 4;
```

## Sabit bir analiz tarihine göre (recency)

Müşteri analizlerinde "son alışverişten bu yana kaç gün geçti?" sorusu, bugünün tarihine göre değil, verinin çekildiği tarihe göre sorulur. Yoksa 2021 verisindeki herkes "yıllardır gelmiyor" görünür. FLO verisinde son tarih 2021-05-30, analiz tarihi olarak 2021-06-01 kullanıyoruz:

```sql flo
SELECT CASE
         WHEN julianday('2021-06-01') - julianday(last_order_date) <= 30 THEN '0-30 gün'
         WHEN julianday('2021-06-01') - julianday(last_order_date) <= 90 THEN '31-90 gün'
         ELSE '90+ gün'
       END AS son_alisveris,
       COUNT(*) AS musteri
FROM flo
GROUP BY son_alisveris
ORDER BY MIN(last_order_date) DESC;
```

## Tarihe gün eklemek

`date(tarih, '+N days')`, `'+1 month'`, `'start of month'` gibi değiştiricilerle tarih hesaplanır:

```sql northwind
SELECT OrderDate,
       date(OrderDate, '+30 days') AS otuz_gun_sonra,
       date(OrderDate, 'start of month') AS ay_basi
FROM Orders
LIMIT 3;
```

## Güvenli tarih aralığı

"1997 yılı" için `BETWEEN '1997-01-01' AND '1997-12-31'` yazmak yaygın ama riskli: tarih-saat sütunlarında `'1997-12-31 14:30'` değeri `'1997-12-31'`'den büyük olduğu için dışarıda kalır.

:::kural
Tarih aralıklarını yarı açık yaz: başlangıç dahil, bitiş hariç. `WHERE OrderDate >= '1997-01-01' AND OrderDate < '1998-01-01'`. Sütun sadece tarih de olsa, tarih-saat de olsa doğru çalışır.
:::

```sql northwind
SELECT COUNT(*) AS siparis_1997
FROM Orders
WHERE OrderDate >= '1997-01-01' AND OrderDate < '1998-01-01';
```

:::dikkat
`WHERE strftime('%Y', OrderDate) = '1997'` de doğru sonuç verir, ama sütunu bir fonksiyona sardığın için büyük tablolarda indeks kullanılamaz ve sorgu yavaşlar. Aralık karşılaştırması hem doğru hem hızlıdır.
:::
