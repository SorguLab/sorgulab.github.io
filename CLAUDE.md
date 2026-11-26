# SorguLab — çalışma talimatları

Esra'nın SQL / pandas / NumPy alıştırma uygulaması. Kullanıcıyla Türkçe konuş.

Repo: `sorgulab/sorgulab.github.io` (GitHub organizasyonu SorguLab). Site: https://sorgulab.com (özel alan adı, Wix'ten alındı; DNS: A kayıtları 185.199.108-111.153, www → CNAME sorgulab.github.io). Kökteki `CNAME` dosyası bunu GitHub Pages'e söyler, silme. Eski adres https://sorgulab.github.io yeni adrese yönlenir. Eski adres `eesrassoner/sorgu-atolyesi` artık kullanılmıyor.

## Yapı
- Repo kökü = GitHub Pages ile yayınlanan iPad (PWA, çevrimdışı) sürümü. Tüm varlıklar kökte **düz** durur (klasör yok): Pyodide (`pyodide.js`, `pyodide.asm.*`, `python_stdlib.wasm`, `paket-*.wasm` = yeniden sıkıştırılmış wheel'ler), `sql-wasm.js` + `sql-wasm.wasm` (sql.js 1.10.3; eski `sql-asm.js` 16 MB bellekte takılıyordu), `xlsx.full.min.js`, fontlar, ikonlar. Bunları elle düzenleme.
- **Motor** (`kaynak/src/motor.js`): SQL ve Python'u Web Worker'da çalıştırır (süre sınırı SQL 20 sn / Python 30 sn, Durdur düğmesi). Worker açılamazsa blob worker, o da olmazsa sayfanın içinde çalışır. Build onu köke `motor.js` olarak kopyalar ve index.html'e de gömer.
- `kaynak/src/` = tek doğruluk kaynağı:
  - `bank.js` — Örnek Mağaza soruları (`SORULAR`), Tahmin Et (`TAHMINLER`), teorik mülakat (`TEORIK_TEST`, `TEORIK_ACIK`)
  - `hr_bank.js` — İK Attrition SQL/pandas soruları, `np_bank.js` — NumPy soruları
  - `nw_bank.js` (Northwind), `tt_bank.js` (Titanic), `flo_bank.js` (FLO), `tc_bank.js` (Telco Churn; veri bilerek temizlenmedi, TotalCharges metin), `miuul_bank.js` (Miuul Bitirme, İK)
- `kaynak/veri_setleri.json` = veri seti kataloğu (anahtar, ad, açıklama, banka dosyaları/değişkenleri, ilk soru, varsayılan kod, örnekler). Yeni veri seti = buraya kayıt + `kaynak/veri/<anahtar>.json` + banka dosyası.
- `kaynak/veri/<anahtar>.json` = veri setleri (`{tablo: {columns, types, rows}}`). Build bunları köke `veri-<anahtar>.json` olarak kopyalar; uygulama sadece seçilen veri setini indirir (lazy). Ham veriler `kaynak/ham/`, dönüştürücüler `kaynak/araclar/`.
  - `app.js` (arayüz), `helper.py` (Pyodide içinde çalışan çıktı dönüştürücü), `template.html` (CSS + iskelet)
- **KonuLab** (konu anlatımı, üst bardaki "SorguLab ⇄ KonuLab" geçişi): içerik `kaynak/konular/<grup>/NN-ad.md` (gruplar: sql, temel, pandas, numpy, kavram; sözlük `kaynak/konular/sozluk.json`). Biçim `kaynak/konu_derle.py` başındaki açıklamada. Kod örnekleri derlemede gerçekten çalıştırılır, çıktılar köke `konular.json` olarak yazılır (uygulama KonuLab açılınca indirir). Örnek hata verirse derleme durur. `alistirma: dil | Kategori` üst bilgisi konuyu SorguLab kategorisine bağlar (her dil+kategori tek konuya). Tek başına derlemek: `python3 kaynak/konu_derle.py`.
- `index.html`, `sw.js`, `manifest.webmanifest` **üretilir** — elle düzenleme, `kaynak/build.py` çalıştır.

## Yapılacaklar
Bekleyen istekler `YAPILACAKLAR.md` dosyasında. Kullanıcı "yapılacaklar listesindekileri yap" derse oradan başla.

## Soru ekleme akışı
1. İlgili bankaya soru ekle. Alanlar: `id` (benzersiz), `dil` (`sql`|`python`), `seviye` (1-3), `kategori`, `baslik`, `soru` (HTML), `ipucu`, `cozum`, `aciklama` (HTML, öğretici), isteğe bağlı `sirali: true`.
   - SQL çözümleri SQLite lehçesinde. Python çözümleri sonucu `sonuc` değişkenine atar; tablolar aynı isimli DataFrame olarak hazırdır.
   - Sıralı sorularda eşitliği bozan ikinci kriter ekle. Açıklamadaki her sayısal yorumu gerçek sonuçla karşılaştır.
   - Python sorularında **sadece pandas ve NumPy** (bir de Python'un yerleşik özellikleri). scipy, sklearn vb. yok; arka planda scipy isteyen pandas yöntemleri de yok (ör. `corr(method="spearman")` yerine `a.rank().corr(b.rank())`). Aynı kural yapay zekânın ürettiği sorular için `soruPrompt`'ta yazılı.
2. `python3 kaynak/test/dogrula.py [anahtar]` → "SONUÇ: tamam" olmalı.
3. `python3 kaynak/build.py` → kök dosyaları + `kaynak/cikti/claude-ai.html` üretilir. Sonra `python3 kaynak/test/tarayici_dogrula.py [anahtar]` → tüm çözümleri gerçek tarayıcı motorlarıyla (Pyodide pandas 2.2, sql.js) çalıştırır, "SONUÇ: tamam" olmalı.
4. Commit + push (GitHub Pages ~1-2 dk'da güncellenir; iPad uygulaması internete bağlıyken açılınca yeni sürümü indirir).
5. claude.ai sürümünü de güncelle: `kaynak/cikti/claude-ai.html` dosyasını artifact'e `index.html` olarak yayınla (publish_files, mode "patch"). Artifact: "SorguLab" (eski adı Sorgu Atölyesi), slug `5720ef7e-3add-4b1b-b28e-96b536e1eab0`. Artifact'in Pyodide dosyaları `pyodide/` alt yolunda zaten yüklü. `index.html` ile birlikte kökteki `motor.js` (değiştiyse), `sql-wasm.js` + `sql-wasm.wasm` (zaten yüklü), `konular.json` (konu değiştiyse) ve tüm `veri-*.json` dosyalarını da aynı adlarla yükle (veri değiştiyse ya da yeni veri seti eklendiyse). `sample` (Claude ile soru üretme/değerlendirme) ve `downloads` (Excel'e indir, ilerleme yedeği; `dosyaKaydet()` claude.ai'de bunu kullanır, düz `<a download>` orada çalışmaz) yetenekleri tanımlı.
