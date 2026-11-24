---
baslik: Metin fonksiyonları
ozet: Metin parçalamak, aramak, değiştirmek ve birleştirmek. SUBSTR, INSTR, REPLACE, TRIM, UPPER ve ||.
alistirma: sql | Metin
---
Gerçek verideki metinler çoğu zaman birden fazla bilgiyi bir arada taşır: Titanic'teki isimler "Soyad, Unvan. Ad" biçiminde. Metin fonksiyonlarıyla bu parçaları ayırıp yeni sütunlar üretebilirsin.

## Temel fonksiyonlar

| Fonksiyon | Ne yapar | Örnek → sonuç |
|---|---|---|
| `LENGTH(s)` | Karakter sayısı | `LENGTH('SQL')` → 3 |
| `UPPER(s)` / `LOWER(s)` | Büyük / küçük harf | `UPPER('sql')` → SQL |
| `TRIM(s)` | Baştaki ve sondaki boşlukları siler | `TRIM('  a ')` → a |
| `SUBSTR(s, baş, uzunluk)` | Parça alır (1'den başlar) | `SUBSTR('SorguLab', 1, 5)` → Sorgu |
| `INSTR(s, aranan)` | İlk geçtiği konum (yoksa 0) | `INSTR('a,b', ',')` → 2 |
| `REPLACE(s, eski, yeni)` | Değiştirir | `REPLACE('a-b', '-', '/')` → a/b |
| `a \|\| b` | Birleştirir | `'Sorgu' \|\| 'Lab'` → SorguLab |

```sql titanic
SELECT Name,
       LENGTH(Name) AS uzunluk,
       UPPER(SUBSTR(Name, 1, INSTR(Name, ',') - 1)) AS soyad
FROM titanic
LIMIT 4;
```

## İsimden unvan çıkarmak

Unvan, virgül ile ilk nokta arasında. Uzunluğu = nokta konumu − virgül konumu − 1. Baştaki boşluğu `TRIM` siler.

```sql titanic
SELECT TRIM(SUBSTR(Name, INSTR(Name, ',') + 1, INSTR(Name, '.') - INSTR(Name, ',') - 1)) AS unvan,
       COUNT(*) AS yolcu
FROM titanic
GROUP BY unvan
ORDER BY yolcu DESC
LIMIT 5;
```

:::ipucu
Uzun bir ifadeyi tek seferde yazmaya çalışma. Önce `INSTR(Name, ',')` ve `INSTR(Name, '.')` değerlerini ayrı sütunlar olarak gör, sonra `SUBSTR`'u kur.
:::

## Bir karakter kaç kez geçiyor?

Metnin uzunluğundan, o karakter silinmiş halinin uzunluğunu çıkar. FLO'da her müşterinin ilgi listesindeki kategori sayısı (virgül sayısı + 1):

```sql flo
SELECT interested_in_categories_12 AS liste,
       LENGTH(interested_in_categories_12) - LENGTH(REPLACE(interested_in_categories_12, ',', '')) + 1 AS kategori_sayisi
FROM flo
WHERE interested_in_categories_12 <> '[]'
LIMIT 4;
```

## Metin birleştirmek

`||` ile sütunlar ve sabit metinler birleştirilir. NULL ile birleştirme sonucu NULL yapar; `COALESCE` ile önle.

```sql northwind
SELECT FirstName || ' ' || LastName AS ad_soyad,
       Title || ' (' || COALESCE(Region, 'bölge yok') || ')' AS unvan
FROM Employees
LIMIT 4;
```

:::not
Diğer veritabanlarında isimler farklı: SQL Server'da `SUBSTRING`, `CHARINDEX`, `LEN` ve `+` ile birleştirme; BigQuery'de `STRPOS`. Tam liste "Lehçe farkları" konusunda.
:::
