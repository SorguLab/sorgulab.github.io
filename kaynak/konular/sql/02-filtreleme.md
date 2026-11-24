---
baslik: Filtreleme
ozet: WHERE ile satır seçmek. Karşılaştırma, AND/OR, IN, BETWEEN ve LIKE.
alistirma: sql | Filtreleme
---
`WHERE` hangi satırların sonuca gireceğini belirler. Koşul her satır için ayrı ayrı değerlendirilir; doğru olan satırlar kalır.

## Karşılaştırma operatörleri

`=`, `<>` (veya `!=`), `<`, `<=`, `>`, `>=`. Metinler tek tırnak içinde yazılır.

```sql titanic
SELECT Name, Age, Fare
FROM titanic
WHERE Fare > 200
LIMIT 5;
```

## AND, OR ve parantez

`AND` iki koşulun da doğru olmasını, `OR` en az birinin doğru olmasını ister.

```sql titanic
SELECT COUNT(*) AS yolcu
FROM titanic
WHERE Sex = 'female' AND Pclass = 3;
```

:::dikkat
`AND`, `OR`'dan önce değerlendirilir. "1. ya da 2. sınıftaki kadınlar" için parantez şart:
`WHERE Sex = 'female' AND (Pclass = 1 OR Pclass = 2)`. Parantezsiz yazarsan, 2. sınıftaki **herkes** (erkekler dahil) sonuca girer.
:::

```sql titanic
SELECT
  (SELECT COUNT(*) FROM titanic WHERE Sex = 'female' AND (Pclass = 1 OR Pclass = 2)) AS parantezli,
  (SELECT COUNT(*) FROM titanic WHERE Sex = 'female' AND Pclass = 1 OR Pclass = 2) AS parantezsiz;
```

## IN ve BETWEEN

`IN` bir listeden herhangi biriyle eşleşmeyi, `BETWEEN` bir aralığı (iki uç dahil) kısaca yazar.

```sql northwind
SELECT ProductName, UnitPrice
FROM Products
WHERE CategoryID IN (1, 2)
  AND UnitPrice BETWEEN 20 AND 25;
```

## LIKE ile metin arama

`%` herhangi sayıda karakter, `_` tek bir karakter demek.

| Desen | Anlamı |
|---|---|
| `'A%'` | A ile başlayan |
| `'%son'` | son ile biten |
| `'%Mrs.%'` | içinde Mrs. geçen |
| `'_a%'` | ikinci harfi a olan |

```sql titanic
SELECT Name
FROM titanic
WHERE Name LIKE '%Master.%'
LIMIT 4;
```

:::dikkat
`LIKE` içinde arama yapar, kelime sınırını bilmez. FLO verisinde `LIKE '%COCUK%'`, `AKTIFCOCUK` kategorisini de yakalar:
:::

```sql flo
SELECT SUM(interested_in_categories_12 LIKE '%COCUK%') AS like_ile,
       SUM(interested_in_categories_12 LIKE '%[COCUK%'
           OR interested_in_categories_12 LIKE '%, COCUK%') AS sadece_cocuk
FROM flo;
```

Burada liste `[COCUK, KADIN]` şeklinde saklandığı için "COCUK" ya `[` ya da `, ` ile başlıyorsa tam kelimedir. Tam eşleşme gerektiğinde metnin yapısına bakıp sınır karakterlerini desene eklemek gerekir.

:::not
SQLite'ta `LIKE` İngilizce harflerde büyük/küçük harfe duyarlı değildir (`'a%'` "Allen"ı da bulur). PostgreSQL'de duyarlıdır, orada `ILIKE` kullanılır.
:::
