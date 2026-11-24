---
baslik: İstatistik temelleri
ozet: Ortalama ve medyan, dağılım ve çarpıklık, korelasyon ve nedensellik, karıştırıcı değişken ve seçim yanlılığı.
---
## Ortalama mı medyan mı?

Ortalama uç değerlere duyarlıdır, medyan değildir. Gelir, harcama, bilet ücreti gibi sağa çarpık verilerde ikisi arasındaki fark büyüktür.

```python titanic
import numpy as np
f = titanic["Fare"]
print(round(f.mean(), 2), f.median())
print(round(f[f < 500].mean(), 2), f[f < 500].median())
```

891 yolcudan sadece 3'ünü (512 ödeyenler) çıkarınca ortalama 32,2'den 30,6'ya indi, medyan hiç değişmedi. Ortalama, 14,45'lik medyanın iki katından fazla: birkaç pahalı bilet ortalamayı yukarı çekiyor. "Tipik yolcu ne ödedi?" sorusunun cevabı medyan.

:::kural
Bir ortalama raporlarken medyanla karşılaştır. Fark büyükse dağılım çarpıktır; medyanı (ve çeyrekleri) raporlamak daha dürüst olur.
:::

## Dağılım ve çeyrekler

Çeyrekler veriyi dört eşit parçaya böler. `Q3 - Q1` (çeyrekler arası açıklık, IQR) verinin ortadaki yarısının ne kadar yayıldığını gösterir; uç değer tespitinde kullanılır.

```python
q1, q3 = f.quantile([0.25, 0.75])
iqr = q3 - q1
print(round(q1, 2), round(q3, 2), round(iqr, 2))
print("uç değer sayısı:", (f > q3 + 1.5 * iqr).sum())
```

## Korelasyon ≠ nedensellik

İki değişkenin birlikte hareket etmesi, birinin diğerine yol açtığı anlamına gelmez.

```python
titanic["kadin"] = (titanic["Sex"] == "female").astype(int)
titanic[["Survived", "kadin", "Pclass", "Fare"]].corr()["Survived"].round(3)
```

Ücret ile hayatta kalma arasında pozitif korelasyon var. Ama pahalı bilet almak tek başına hayat kurtarmadı: pahalı biletler 1. sınıfta, 1. sınıf kabinleri filikalara yakındı. Burada **sınıf**, hem ücreti hem hayatta kalmayı etkileyen bir **karıştırıcı değişken** (confounder).

Kontrol etmenin yolu, karıştırıcıyı sabit tutup ilişkiye tekrar bakmak:

```python
titanic["ucret_yuksek"] = titanic["Fare"] > titanic.groupby("Pclass")["Fare"].transform("median")
pd.crosstab(titanic["Pclass"], titanic["ucret_yuksek"], values=titanic["Survived"], aggfunc="mean").round(3)
```

Sınıf sabitken de, sınıf medyanından pahalı bilet alanların hayatta kalma oranı daha yüksek: 1. ve 2. sınıfta yaklaşık 22 puan, 3. sınıfta 7 puan fark var. Yani ilişkinin bir kısmı sınıftan geliyor ama hepsi değil. Bu yine de "pahalı bilet hayat kurtardı" demek değil: aynı sınıf içinde pahalı biletler daha çok aileler ve kadınlar için alınmış olabilir, kabinin konumu farklı olabilir. Karıştırıcıları tek tek kontrol etmek, korelasyondan nedensellik çıkarmanın neden zor olduğunu gösteriyor.

:::dikkat
Pearson korelasyonu sadece **doğrusal** ilişkiyi ölçer. Aile büyüklüğü ile hayatta kalma arasında U şeklinde bir ilişki var (küçük aileler avantajlı, yalnızlar ve büyük aileler değil) ama korelasyonu sıfıra yakın çıkar. Düşük korelasyon "ilişki yok" demek değildir; grup tablosuna bak.
:::

## Seçim yanlılığı

Veri, sorduğun soruyu yanıtlamak için doğru kişilerden mi toplandı? FLO verisinde ilk alışveriş yılına göre müşteri sayısı 2019'da zirve yapıyor. Bu "2019'da müşteri kazanımı patladı" demek değil: veri sadece 2020-2021'de alışveriş yapmış müşterileri içeriyor. Eski müşterilerin çoğu, sonradan gelmeyi bıraktığı için veride yok.

```python flo
flo["first_order_date"].dt.year.value_counts().sort_index()
```

Veri setinin nasıl seçildiğini bilmeden yapılan yorum, verinin söylemediği bir şeyi söyletebilir.

## Örnek büyüklüğü

Küçük gruplardaki oranlar güvenilir değildir. Titanic'te 8 ve 11 kişilik ailelerde hayatta kalan yok (%0), ama bu gruplarda sadece 6 ve 7 kişi var. Oranları raporlarken yanına her zaman grup büyüklüğünü (n) yaz.
