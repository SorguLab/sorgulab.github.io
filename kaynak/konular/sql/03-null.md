---
baslik: NULL ile çalışmak
ozet: Eksik değer NULL'dır ve hiçbir şeye eşit değildir. IS NULL, COALESCE ve COUNT farkları.
alistirma: sql | Eksik Veri
---
`NULL` "bilinmiyor" demek: 0 değil, boş metin değil. Titanic'te 177 yolcunun yaşı, 687 yolcunun kabini bilinmiyor.

## NULL hiçbir şeye eşit değildir

`NULL = NULL` bile doğru değildir; sonucu yine `NULL`'dır. Bu yüzden `WHERE Age = NULL` hiçbir satır döndürmez. Doğru yazım `IS NULL` / `IS NOT NULL`.

```sql titanic
SELECT
  (SELECT COUNT(*) FROM titanic WHERE Age = NULL) AS esittir_null,
  (SELECT COUNT(*) FROM titanic WHERE Age IS NULL) AS is_null;
```

## COUNT(*) ile COUNT(sütun)

`COUNT(*)` satırları sayar, `COUNT(sütun)` o sütunda NULL **olmayan** değerleri. Farkları eksik değer sayısını verir.

```sql titanic
SELECT COUNT(*) AS yolcu,
       COUNT(Age) AS yasi_bilinen,
       COUNT(*) - COUNT(Age) AS yasi_eksik,
       COUNT(Cabin) AS kabini_bilinen
FROM titanic;
```

:::dikkat
`AVG`, `SUM`, `MIN`, `MAX` de NULL'ları atlar. `AVG(Age)` 891 yolcunun değil, yaşı bilinen 714 yolcunun ortalamasıdır. Çoğu zaman istenen budur, ama raporda bunu bilmek gerekir.
:::

## COALESCE: NULL yerine değer koymak

`COALESCE(a, b, ...)` listedeki ilk NULL olmayan değeri döner. Eksik değeri bir etiketle ya da varsayılan değerle göstermek için kullanılır.

```sql titanic
SELECT Name,
       COALESCE(Cabin, 'Bilinmiyor') AS kabin,
       COALESCE(Age, -1) AS yas
FROM titanic
LIMIT 4;
```

## Üç değerli mantık

SQL'de bir koşul `TRUE`, `FALSE` ya da `NULL` (bilinmiyor) olabilir. `WHERE` sadece `TRUE` olan satırları tutar. Yaşı bilinmeyen biri için `Age < 18` de `Age >= 18` de NULL döner; bu yolcu iki filtrede de görünmez:

```sql titanic
SELECT
  (SELECT COUNT(*) FROM titanic WHERE Age < 18) AS cocuk,
  (SELECT COUNT(*) FROM titanic WHERE Age >= 18) AS yetiskin,
  (SELECT COUNT(*) FROM titanic) AS toplam;
```

113 + 601 = 714. Kalan 177 yolcu iki gruba da girmedi.

:::kural
`NOT IN` ile NULL birlikte tehlikelidir: alt sorgudan tek bir NULL gelirse `x NOT IN (...)` hiçbir satır döndürmez. Bu durumda `NOT EXISTS` kullan ("Alt sorgular ve CTE" konusu).
:::
