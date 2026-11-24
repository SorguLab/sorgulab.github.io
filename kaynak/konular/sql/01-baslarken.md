---
baslik: Başlarken
ozet: Tablo, satır, sütun ve ilk SELECT sorgusu. Sorgunun yazılış sırası ile çalışma sırası neden farklı?
alistirma: sql | Temel SELECT
---
Bir veritabanı tablolardan oluşur. Her **tablo** bir konuyu anlatır (yolcular, siparişler, çalışanlar), her **satır** bir kaydı (bir yolcu), her **sütun** o kaydın bir özelliğini (yaş, bilet ücreti) tutar. Excel'deki bir sayfayı düşün: fark, sütunların tipinin sabit olması ve tabloların birbirine anahtarlarla bağlanması.

## İlk sorgu

`SELECT` hangi sütunları istediğini, `FROM` hangi tablodan okuyacağını söyler. `LIMIT` ilk kaç satırı göreceğini sınırlar; büyük tablolarda keşif yaparken hep kullan.

```sql titanic
SELECT Name, Sex, Age, Pclass
FROM titanic
LIMIT 5;
```

Tüm sütunlar için `*` kullanılır. Keşif için pratik, ama gerçek raporlarda sütunları tek tek yazmak daha iyi: hem okunur, hem tabloya sütun eklenince sorgu değişmez.

```sql titanic satir=3
SELECT *
FROM titanic
LIMIT 3;
```

## Sütunu yeniden adlandırmak ve hesaplamak

`AS` ile sütuna takma ad verilir. Sütunlarla aritmetik işlem de yapılabilir; sonuç yeni bir sütun gibi görünür ama tabloya yazılmaz.

```sql titanic
SELECT Name AS yolcu,
       Fare AS ucret,
       ROUND(Fare * 1.2, 2) AS zamli_ucret,
       SibSp + Parch + 1 AS aile
FROM titanic
LIMIT 4;
```

## Tekrarsız değerler

`DISTINCT` aynı satırları bir kez gösterir. Bir sütunda hangi değerler olduğunu görmenin en hızlı yolu.

```sql titanic
SELECT DISTINCT Embarked
FROM titanic;
```

## Tablonun yapısı

SQLite'ta hangi tabloların olduğunu `sqlite_master` tablosundan görebilirsin. SorguLab'de sağdaki şema paneli de aynı bilgiyi gösterir.

```sql northwind satir=12
SELECT name
FROM sqlite_master
WHERE type = 'table';
```

## Yazılış sırası ≠ çalışma sırası

Sorguyu şu sırayla yazarız: `SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT`. Ama veritabanı şu sırayla çalıştırır:

1. `FROM` (ve `JOIN`): hangi tablolar?
2. `WHERE`: hangi satırlar?
3. `GROUP BY`: nasıl gruplanacak?
4. `HAVING`: hangi gruplar kalacak?
5. `SELECT`: hangi sütunlar, hangi hesaplar?
6. `ORDER BY`: hangi sırayla?
7. `LIMIT`: kaç satır?

:::kural
Bu sıra birçok "neden çalışmıyor?" sorusunun cevabı. Örneğin `SELECT`'te verdiğin takma ad `WHERE`'de kullanılamaz, çünkü `WHERE` daha önce çalışır. `ORDER BY` ise `SELECT`'ten sonra çalıştığı için takma adı tanır.
:::

:::not
Anahtar kelimeleri büyük harfle yazmak (`SELECT`, `FROM`) zorunlu değil, ama okumayı kolaylaştıran yaygın bir alışkanlık. Sorgunun sonundaki `;` SQLite'ta tek sorgu için isteğe bağlı.
:::
