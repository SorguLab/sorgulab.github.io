# Yapılacaklar

Esra'nın sonraya bıraktığı istekler. Bir madde bitince buradan sil ve commit mesajında belirt.

- [x] **Miuul soruları İK havuzuna birleştirildi (2026-11-26).** m01→h07, m04→h11, m06→h08 tekrar olduğu için çıkarıldı (çözüldü işaretleri ESKI_SORU ile taşınır); kalan 30 soru ödev çerçevesi olmadan, kategorileri eşlenmiş olarak listede. Filtre yerine SQL/Python ilerleme sayacı geldi.
  - Not: açıklamalarda ve KonuLab'de hâlâ "Miuul'deki ..." ifadeleri var (FLO, Titanic, birkaç konu). Esra isterse nötrleştirilecek.

- [ ] **Para kazanma / abonelik** — *Esra "beklesin" dedi; LinkedIn duyurusundan sonra GoatCounter verilerine (sorgulab.goatcounter.com) bakıp birlikte karar verilecek.*
  - Konuşulan sıra: (1) ilgi ölçümü: "Pro yakında, haberdar ol" kutusu + kısa anket (Web3Forms ile), (2) talep varsa hafif başlangıç: tek seferlik ürün (mülakat paketi / 1 yıllık Pro) Shopier/Gumroad gibi bir hizmetle, (3) ödeme yapan varsa tam abonelik: hesap (Supabase vb.), Pro içeriği sunucuda, ödeme sağlayıcı (iyzico/PayTR ya da Paddle/Lemon Squeezy, Türkiye'den satıcı kabulü kontrol edilecek) + webhook.
  - Pro adayları: anahtarsız yapay zekâ (maliyet hesaba katılmalı), cihazlar arası senkron, ek içerik paketleri, ilerleme raporu, sertifika. Ücretsiz kısım olduğu gibi kalır.
  - Ücretli ürüne geçmeden önce: Miuul soruları ve FLO verisi için Miuul'den izin (ya da ücretsiz kısımda tut), IBM HR verisinin lisansı, vergi kaydı (mali müşavir), mesafeli satış sözleşmesi, KVKK metni.


## Ayarlar menüsü — YAPILDI (2026-11-25)
Üst barda ⚙: Tema (Sistem/Açık/Koyu), İlerleme kaydı (yedek indir / yedekten yükle, birleştirerek), İletişim. Yeni ayarlar buraya eklenir; üst barı kalabalıklaştırma.

## Konuşulan, bekleyen fikirler
- İlerlemeyi kaydetme: e-posta ile giriş + bulutta kayıt (soru olarak konuşuldu, karar verilmedi). Ara çözüm yapıldı: ⚙ → İlerleme kaydı (dosyayla yedek).
- Yanlış cevapta farklı satırları gösterme (şimdilik kalsın).
- Aynı sorunun diğer dildeki çözümü (şimdilik kalsın).

## Teknik kontrol (2026-11-25) — TAMAMLANDI (2026-11-26)
Yapıldı: büyük CSV hatası + 100.000 satır sınırı (Excel ve CSV), SQL sonucunda 50.000 satır bellek sınırı (toplam yine tam sayılır), çift tırnaklı metin hatası, input() mesajı, Lehçe farkları konusuna Türkçe harfler ve tek tırnak notu, KonuLab araması sadece SQL/Python.
Dokunulmayacak: 6 (ilk ziyarette ~29,5 MB indirme), 12, 15, 18.
