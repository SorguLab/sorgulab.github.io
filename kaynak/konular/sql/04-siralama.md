---
baslik: Sıralama
ozet: ORDER BY ile sıralama, birden fazla kriter, eşitliği bozan ikinci kriter ve LIMIT.
---
`ORDER BY` sonucun hangi sırayla geleceğini belirler. Varsayılan küçükten büyüğe (`ASC`), tersi için `DESC`.

```sql northwind
SELECT ProductName, UnitPrice
FROM Products
ORDER BY UnitPrice DESC
LIMIT 5;
```

## Birden fazla kriter

Virgülle ayrılan kriterler soldan sağa uygulanır: önce birincisine göre sıralanır, birincide eşit olanlar ikinciye göre.

```sql titanic
SELECT Pclass, Name, Fare
FROM titanic
ORDER BY Pclass, Fare DESC
LIMIT 5;
```

## Eşitliği bozan ikinci kriter

Aynı değere sahip satırların sırası garanti değildir. Bir gün A önce gelir, başka bir gün B. `LIMIT` ile birlikte bu, "ilk 10"un kimlerden oluştuğunu belirsiz yapar.

```sql titanic
SELECT PassengerId, Name, Fare
FROM titanic
ORDER BY Fare DESC, PassengerId
LIMIT 5;
```

En yüksek ücret 512,33 ve bunu 3 kişi ödemiş; 263'ü ise 4 kişi. `PassengerId` eklenmeseydi "en pahalı 5 bilet" listesinin son satırı her çalıştırmada farklı olabilirdi.

:::kural
`ORDER BY` + `LIMIT` kullandığın her sorguda kendine sor: "Sıraladığım sütunda eşit değerler olabilir mi?" Olabiliyorsa benzersiz bir sütunu (ID) son kriter olarak ekle.
:::

## Hesaplanan değere ve takma ada göre sıralama

`ORDER BY`, `SELECT`'ten sonra çalıştığı için takma adı tanır. Sütun numarası da yazılabilir (`ORDER BY 2`), ama sütunların yeri değişince sorgu sessizce bozulduğu için önerilmez.

```sql northwind
SELECT ProductName, UnitPrice * UnitsInStock AS stok_degeri
FROM Products
ORDER BY stok_degeri DESC
LIMIT 4;
```

## NULL'lar nereye gider?

SQLite'ta NULL en küçük değer sayılır: artan sıralamada başa, azalanda sona gelir. Bu davranış veritabanına göre değişir (Oracle ve PostgreSQL'de tersidir). Taşınabilir yol, NULL'ları açıkça ayırmak:

```sql titanic
SELECT Name, Age
FROM titanic
ORDER BY Age IS NULL, Age
LIMIT 4;
```

`Age IS NULL` yaşı bilinenler için 0, bilinmeyenler için 1 üretir; böylece bilinmeyenler her zaman sona gider.
