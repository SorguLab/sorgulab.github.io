# Yapılacaklar

Esra'nın sonraya bıraktığı istekler. Bir madde bitince buradan sil ve commit mesajında belirt.

- [ ] **Miuul Bitirme sorularını genel soru havuzuyla birleştir** — *Esra soruları çözdüğünü söyleyince yap, öncesinde değil.*
  Amaç: uygulamayı kullanacak herkes için daha geniş bir soru havuzu.
  - `kaynak/src/miuul_bank.js` (m01–m33) sorularını İK Attrition SQL sorularıyla (`hr_bank.js`, h01–h19) birleştir.
  - **Tekrarları çıkar:** aynı soruyu soran çiftlerden daha iyi olanı tut. Olası örtüşmeler (karar verirken çıktıları karşılaştır):
    m01 ↔ h07 (genel attrition), m06 ↔ h08 (departman), m12 ↔ h13 (JobSatisfaction), m04 ↔ h11 (yaş grupları, farklı aralıklar),
    m19/m13/m16 (h bankasında karşılığı yok, kalır), m15/m33 vb. Karar verilen her çifti commit mesajında yaz.
  - Kalanlardan `kaynak: 'miuul'` ve `sira` alanlarını kaldır; kategorileri mevcut kategorilere eşle (Aggregation, CASE WHEN, JOIN, Window Functions, Subquery / CTE...).
  - Soru metninden "Ödevdeki soru" çerçevesini ve ödeve özgü ifadeleri kaldır; soruyu kendi başına anlaşılır bir alıştırma olarak yaz. SQL Server notları genel bilgi olarak kalabilir.
  - **Esra'nın ilerlemesi kaybolmasın:** tutulan soruların `id`'lerini değiştirme (çözüldü işaretleri `id` ile saklanıyor).
  - Seviyeleri (1-3) gözden geçir; liste seviyeye göre sıralanıyor.
  - Hiç `kaynak` sorusu kalmayınca "Uygulama soruları / Miuul Bitirme" seçimi kendiliğinden kaybolur; kod tarafında başka değişiklik gerekmez. Mülakat havuzu da bu soruları otomatik içerir.
  - `dogrula.py` → `build.py` → push → claude.ai sürümünü yayınla.

- [ ] **Yeni veri setleri ekle** — *Esra veri setlerini gönderecek; diğer isteklerle birlikte tek seferde yapılacak.*
  - Her veri seti uygulamaya gömülü hazır veri seti olarak eklenecek (herkes erişebilsin). Eklemeden önce lisansın herkese açık paylaşıma uygun olduğunu kontrol et; kurumun kendi hazırladığı veriler (örn. Miuul FLO) için Esra'ya sor.
  - Her veri seti için **30-40 soru** (SQL + pandas/NumPy). Sayıyı doldurmak için soru üretme: her soru farklı bir beceri ya da gerçek bir iş sorusu olmalı, tekrar eden kalıplar olmamalı. Kolaydan zora dağıt.
  - Mevcut kurallar geçerli: her çözüm veride doğrulanır, açıklamalardaki sayısal yorumlar gerçek sonuçla karşılaştırılır.
  - Veri setinin içeriğine göre, veride olmayan bir ilişki için JOIN sorusu uydurma; gerekirse resmi veri sözlüğünden kod tablosu ekle (HR'deki egitim_kod gibi).
  - **Northwind** listede: Esra özel bir sürüm göndermezse resmi sürümü Claude kendisi indirecek (Microsoft `sql-server-samples` reposu, MIT lisansı; `instnwnd.sql`). Çok tablolu JOIN, self-join (Employees.ReportsTo), tarih analizi soruları için ideal.
    - Eğitimden gelen **24 Northwind sorusu** `kaynak/ham/northwind_sorular.md` içinde (Late Shipment Rate odaklı). Bunlar ayrı kategori olmayacak, doğrudan Northwind'in genel soru havuzuna girecek.
    - Bunlara Claude'un kendi sorularını ekle (toplam 30-40): Late Shipment dışındaki konular — çok tablolu JOIN, self-join / recursive CTE (ReportsTo hiyerarşisi), tedarikçi-ürün-kategori, stok/yeniden sipariş, aylık satış trendi, müşteri sıralaması, pandas tarafında merge/pivot. Tekrar yok, kolay-orta-zor dağılımı.
    - Tanımlar (soru metninde açıkça yaz): geç gönderim = `ShippedDate > RequiredDate`; gönderilmemiş siparişler (ShippedDate NULL) oran paydasına girmez; sipariş tutarı = `SUM(UnitPrice * Quantity * (1 - Discount))` (Order Details). Açık uçlu sorularda ("anlamlı gruplar", "inceleyin") HR/Miuul'daki gibi kontrol edilebilir beklenen çıktı tanımla.
    - Tablo adlarında boşluk var (`Order Details`): SQLite'ta tablo adını `order_details` gibi sadeleştirmek mi, köşeli parantez/çift tırnak ile bırakmak mı? Ödev SQL Server'da yazıldığı için açıklamalarda `[Order Details]` notunu düş.
  - **Titanic** listede: Claude kendisi indirecek — `mwaskom/seaborn-data` reposundaki `raw/titanic.csv` (Kaggle train ile aynı 891 yolcu; name, ticket, cabin dahil). `PassengerId` sıra numarası olarak eklenecek. Metin işleme (isimden unvan çıkarma), eksik veri (age, cabin, embarked) ve CASE soruları için uygun.
  - Esra veri setlerini tek Excel'de her tablo ayrı sayfa olarak (ya da zip içinde CSV) gönderecek.
  - **FLO** listede: ham veri `kaynak/ham/flo.csv` (Esra'nın gönderdiği flo_dataset.xlsx; 19.945 müşteri, 13 sütun, eksik değer yok; Esra herkese açık bir veri seti olduğunu belirtti). Uygun konular: RFM, segmentasyon, online/offline kanal karşılaştırması, tarih farkları (recency, müşteri yaşı), `interested_in_categories_12` liste metni üzerinde LIKE / pandas `str` ve `explode`. Tek tablo: JOIN sorusu uydurma.

- [ ] **Veri setlerini ayrı dosyalara taşı, ihtiyaç olunca yükle** — *yeni veri setleriyle birlikte yap.*
  - Şu an veri setleri `index.html` içine gömülü. Sayıları artınca ilk açılış yavaşlar.
  - Her veri setini kökte ayrı bir dosya yap (örn. `veri-hr.json`), uygulama sadece seçilen veri setini yüklesin.
  - Service worker önbellek listesine eklensin ki iPad'de çevrimdışı çalışma bozulmasın. claude.ai sürümünde de dosyalar artifact'e ayrı dosya olarak yüklenmeli (izin verilen uzantıyı kontrol et; .json çalışıyor).
