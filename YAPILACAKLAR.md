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
  - Kaynak filtresi ("Uygulama soruları / Miuul Bitirme") kalkınca **yerine soru sayacı** koy: SQL ve Python için ayrı ayrı çözülen/toplam (örn. "SQL 12/52", "Python 3/26"). Esra üstteki sayaç rozetini kaldırttı; `ilerlemeMetni()` fonksiyonu duruyor, oradan yararlan.
  - `dogrula.py` → `build.py` → push → claude.ai sürümünü yayınla.
