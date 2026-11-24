---
baslik: Toplama ve gruplama
ozet: COUNT, SUM, AVG, MIN, MAX ile özet çıkarmak. GROUP BY, HAVING ve WHERE ile HAVING farkı.
alistirma: sql | Aggregation
---
Toplama (aggregate) fonksiyonları birçok satırı tek bir değere indirir: kaç tane, toplam ne kadar, ortalama ne?

```sql titanic
SELECT COUNT(*) AS yolcu,
       SUM(Survived) AS kurtulan,
       ROUND(AVG(Age), 2) AS ort_yas,
       MIN(Fare) AS en_ucuz,
       MAX(Fare) AS en_pahali
FROM titanic;
```

:::ipucu
`Survived` 1/0 olduğu için `SUM` kurtulan sayısını, `AVG` kurtulma oranını verir. 1/0 kodlu her sütunda (churn, attrition, tıklama) bu hileyi kullanabilirsin.
:::

## GROUP BY: her grup için ayrı özet

`GROUP BY` satırları seçtiğin sütunun değerlerine göre gruplara ayırır, toplama fonksiyonu her grup için ayrı çalışır.

```sql titanic
SELECT Pclass,
       COUNT(*) AS yolcu,
       ROUND(100.0 * AVG(Survived), 2) AS oran
FROM titanic
GROUP BY Pclass
ORDER BY Pclass;
```

Birden fazla sütunla gruplanırsa her kombinasyon ayrı bir grup olur:

```sql titanic
SELECT Pclass, Sex, COUNT(*) AS yolcu
FROM titanic
GROUP BY Pclass, Sex
ORDER BY Pclass, Sex;
```

:::kural
`SELECT`'te ya `GROUP BY`'daki sütunlar ya da toplama fonksiyonları olabilir. `SELECT Pclass, Name, COUNT(*) ... GROUP BY Pclass` yazarsan, her sınıfta yüzlerce isim varken hangisi gösterilecek? SQL Server ve PostgreSQL bu sorguda hata verir. SQLite hata vermez, rastgele bir isim gösterir; bu da fark edilmesi zor yanlış sonuçlara yol açar.
:::

## HAVING: grupları filtrelemek

`WHERE` gruplamadan **önce** satırları, `HAVING` gruplamadan **sonra** grupları filtreler. Toplama fonksiyonuyla yazılan koşul (`COUNT(*) > 50`) sadece `HAVING`'de olabilir.

```sql hr
SELECT JobRole,
       COUNT(*) AS calisan,
       ROUND(AVG(MonthlyIncome), 0) AS ort_maas
FROM hr
WHERE Department = 'Research & Development'
GROUP BY JobRole
HAVING COUNT(*) > 50
ORDER BY ort_maas DESC;
```

Sırayla: önce Ar-Ge çalışanları seçildi (`WHERE`), sonra role göre gruplandı (`GROUP BY`), sonra 50'den az çalışanı olan roller atıldı (`HAVING`).

## COUNT(DISTINCT ...)

Tekrar edenleri bir kez saymak için:

```sql northwind
SELECT COUNT(*) AS siparis,
       COUNT(DISTINCT CustomerID) AS musteri,
       COUNT(DISTINCT ShipCountry) AS ulke
FROM Orders;
```

## Oranların ortalaması ≠ toplamların oranı

Bir kanalın "ortalama sepet tutarı" nedir? Her müşterinin sepetinin ortalaması mı (`AVG(harcama / siparis)`), yoksa kanalın toplam harcaması bölü toplam siparişi mi (`SUM / SUM`)? İkisi farklı sonuç verir:

```sql flo
SELECT order_channel,
       ROUND(AVG((customer_value_total_ever_online + customer_value_total_ever_offline)
                 / (order_num_total_ever_online + order_num_total_ever_offline)), 2) AS oranlarin_ort,
       ROUND(SUM(customer_value_total_ever_online + customer_value_total_ever_offline)
             / SUM(order_num_total_ever_online + order_num_total_ever_offline), 2) AS toplamlarin_orani
FROM flo
GROUP BY order_channel
ORDER BY order_channel;
```

İlki her müşteriye, ikincisi her siparişe eşit ağırlık verir. Hangisinin doğru olduğu soruya bağlı; raporda hangisini kullandığını belirtmek önemli.

:::dikkat
SQLite'ta iki tam sayının bölümü tam sayıdır: `SUM(Survived) / COUNT(*)` sonucu 0 çıkar. Oran hesaplarken `100.0 *` ya da `1.0 *` ile başla ya da `AVG` kullan.
:::
