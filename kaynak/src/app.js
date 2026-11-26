// ═══════════════ SorguLab ═══════════════
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const metin = h => { const d = document.createElement('div'); d.innerHTML = h; return d.textContent; };
const SEVIYE = { 1: 'Kolay', 2: 'Orta', 3: 'Zor' };
const KAYNAK_AD = { miuul: 'Miuul Bitirme' };
const DIL = { sql: 'SQL', python: 'Python' };
const karistir = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
function scriptYukle(src) { return new Promise((ok, red) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => red(new Error('Kütüphane indirilemedi: ' + src)); document.head.appendChild(s); }); }
const bekle = ms => new Promise(r => setTimeout(r, ms));

// ─── Kalıcı ilerleme (bu tarayıcıda) ───
const DEPO_KEY = 'sorgu-atolyesi-v1';
let depo = { cozuldu: {}, bakarak: {}, tahmin: {}, tahminSonra: {}, taslak: {} };
try { const d = JSON.parse(localStorage.getItem(DEPO_KEY)); if (d) depo = Object.assign(depo, d); } catch (e) { }
// Tekrar ettiği için çıkarılan sorular (eski Miuul m01, m04, m06): çözülmüş işareti aynı konudaki İK sorusuna geçer.
const ESKI_SORU = { m01: 'h07', m04: 'h11', m06: 'h08' };
for (const [eski, yeni] of Object.entries(ESKI_SORU)) {
  if (depo.cozuldu[eski]) {
    const normal = (depo.cozuldu[yeni] && !depo.bakarak[yeni]) || !depo.bakarak[eski];
    depo.cozuldu[yeni] = true;
    if (normal) delete depo.bakarak[yeni]; else depo.bakarak[yeni] = true;
  }
  if (depo.taslak && depo.taslak[eski] && !(depo.taslak[yeni] || '').trim()) depo.taslak[yeni] = depo.taslak[eski];
  delete depo.cozuldu[eski]; delete depo.bakarak[eski]; if (depo.taslak) delete depo.taslak[eski];
}
// Çözülen soru işareti: kendi çözdüysen ✓, cevaba bakıp çözdüysen – (üzerine gelince açıklama).
const bakildi = {};   // bu oturumda cevabına bakılan sorular
const tikHTML = id => depo.bakarak[id] ? '<span class="tik bakarak" title="Cevaba bakarak çözüldü" aria-label="cevaba bakarak çözüldü">–</span>' : '<span class="tik" aria-label="çözüldü">✓</span>';
function kaydet() { try { localStorage.setItem(DEPO_KEY, JSON.stringify(depo)); } catch (e) { } }

// ─── Veri setleri ───
// Hazır veri setleri VERI_KATALOG'dan gelir (kaynak/veri_setleri.json → build.py). Satırlar ayrı dosyada
// (veri-<key>.json) durur ve sadece veri seti kullanılınca yüklenir; şema ve kartlar için `meta` yeterli.
const VS = { yuklenen: null };
// ─── Yüklenen veriyi bu tarayıcıda sakla (IndexedDB): yenileyince/kapatıp açınca geri gelir, hiçbir yere gönderilmez ───
const IDB_AD = 'sorgulab', IDB_DEPO = 'veri';
function idbAc() {
  return new Promise((ok, red) => {
    if (!window.indexedDB) return red(new Error('IndexedDB yok'));
    const r = indexedDB.open(IDB_AD, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(IDB_DEPO);
    r.onsuccess = () => ok(r.result); r.onerror = () => red(r.error);
  });
}
async function idbIslem(mod, fn) {
  const db = await idbAc();
  return new Promise((ok, red) => {
    const tx = db.transaction(IDB_DEPO, mod); const istek = fn(tx.objectStore(IDB_DEPO));
    tx.oncomplete = () => { db.close(); ok(istek && istek.result); }; tx.onerror = tx.onabort = () => { db.close(); red(tx.error); };
  });
}
function yukleneniKaydet() {
  const Y = VS.yuklenen;
  if (!Y) return idbIslem('readwrite', d => d.delete('yuklenen')).catch(() => { });
  return idbIslem('readwrite', d => d.put({ ad: Y.ad, tablolar: Y.tablolar, sorular: Y.sorular, kayit: Date.now() }, 'yuklenen'))
    .then(() => { Y.kayitli = true; }).catch(e => { Y.kayitli = false; console.warn('Veri kaydedilemedi', e); });
}
function yukleneniGeriYukle() {
  return idbIslem('readonly', d => d.get('yuklenen')).then(k => {
    if (!k || !k.tablolar || VS.yuklenen) return;
    VS.yuklenen = { ad: k.ad, tablolar: k.tablolar, sorular: k.sorular || [], meta: metaHesapla(k.tablolar), kayitli: true };
    yenidenCiz();
  }).catch(() => { });
}
function yukleneniSil() {
  VS.yuklenen = null; delete gonderilen.yuklenen;
  Object.keys(beklenenCache).filter(k => k.startsWith('yuklenen:')).forEach(k => delete beklenenCache[k]);
  if (typeof pyYukluVS !== 'undefined' && pyYukluVS === 'yuklenen') pyYukluVS = null;
  S.gecmis = S.gecmis.filter(g => g.vs !== 'yuklenen');
  if (S.veriSeti === 'yuklenen') { S.veriSeti = HAZIR[0]; S.serbestKod = varsayilanKod(HAZIR[0]); veriHazirla(HAZIR[0]).catch(() => { }); }
  yukleneniKaydet(); yenidenCiz();
}
for (const k of VERI_KATALOG) VS[k.key] = { ...k, tablolar: null, hazir: true };
const HAZIR = VERI_KATALOG.map(k => k.key);
function metaHesapla(tablolar) {
  const m = {};
  for (const [ad, t] of Object.entries(tablolar)) m[ad] = { columns: t.columns, types: t.types, n: t.rows.length };
  return m;
}
const metaAl = key => VS[key].meta || metaHesapla(VS[key].tablolar);
const veriYukleniyor = {};
function veriHazirla(key) {
  const v = VS[key];
  if (!v || v.tablolar) return Promise.resolve();
  if (!veriYukleniyor[key]) {
    veriYukleniyor[key] = fetch(v.dosya)
      .then(r => { if (!r.ok) throw new Error(`${v.ad} verisi indirilemedi (${r.status})`); return r.json(); })
      .then(j => { v.tablolar = j; })
      .catch(e => { delete veriYukleniyor[key]; throw new Error((e && e.message) || `${v.ad} verisi yüklenemedi`); });
  }
  return veriYukleniyor[key];
}
function varsayilanKod(key) {
  if (VS[key].varsayilan) return { ...VS[key].varsayilan };
  const t = Object.keys(metaAl(key))[0];
  return { sql: `SELECT *\nFROM "${t}"\nLIMIT 20;`, python: `${t}.head(10)` };
}
const S = {
  view: 'alistirma', veriSeti: 'hr',
  filtre: { dil: 'sql', seviye: 0, kategori: '', kaynak: '' },
  aktifId: Object.fromEntries([...VERI_KATALOG.map(k => [k.key, k.ilk_soru]), ['yuklenen', null]]),
  tahminId: 't01', tahminDil: 'sql',
  serbestDil: 'sql', serbestKod: null,
  gecmis: [], mulakat: null, teorik: null, claude: null, uretiliyor: false,
  lab: 'sorgu', konuId: null, konuDil: 'sql', konuAra: ''
};

// ─── Yapay zekâ: claude.ai içinde Claude, başka yerde kullanıcının kendi Gemini anahtarı ───
(async () => {
  try {
    if (window.claude && typeof window.claude.use === 'function') {
      const s = await window.claude.use('sample');
      if (s) { S.claude = s; yenidenCiz(); }
    }
  } catch (e) { }
})();
const GEMINI_KEY = 'sorgulab-gemini-anahtar';
// Sırayla denenir; ilk çalışan oturum boyunca kullanılır. Yoğunluk (5xx), modele özel kota (429) ya da model yok (404) olursa sıradakine geçilir.
const GEMINI_MODELLER = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'];
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';
let geminiModel = null;
function geminiAnahtar() { try { return localStorage.getItem(GEMINI_KEY) || ''; } catch (e) { return ''; } }
function geminiAnahtarYaz(k) { try { if (k) localStorage.setItem(GEMINI_KEY, k); else localStorage.removeItem(GEMINI_KEY); } catch (e) { } geminiModel = null; }
function aiTur() { return S.claude ? 'claude' : geminiAnahtar() ? 'gemini' : null; }
function aiAd() { return { claude: 'Claude', gemini: 'Gemini' }[aiTur()] || 'Yapay zekâ'; }
function aiIyelik() { return { claude: 'Claude\'un', gemini: 'Gemini\'nin' }[aiTur()] || 'Yapay zekânın'; }
function geminiMetin(d) {
  const c = d && d.candidates && d.candidates[0];
  return c && c.content && c.content.parts ? c.content.parts.filter(p => !p.thought).map(p => p.text || '').join('') : '';
}
async function geminiHata(r) {
  let e = {}; try { e = (await r.json()).error || {}; } catch (x) { }
  const m = String(e.message || ''), neden = JSON.stringify(e.details || '');
  const detay = `${r.status}${e.status ? ' ' + e.status : ''}${m ? ': ' + m.slice(0, 200) : ''}`;
  if (r.status === 429) return { code: 'kota', detay };
  if (r.status >= 500) return { code: 'yogun', detay };
  if (/API_KEY_INVALID|API key not valid|API key expired/i.test(neden + m)) return { code: 'anahtar_gecersiz' };
  if (/location is not supported/i.test(m)) return { code: 'bolge' };
  if (r.status === 403 || r.status === 401) return { code: 'yetki', detay };
  return { code: 'gemini', message: `Gemini hata verdi (${r.status}): ${m || r.statusText}` };
}
// Cevap gelmezse sonsuza kadar beklememek için süre sınırı (soru üretme uzun sürebildiği için JSON isteklerinde daha uzun)
async function geminiFetch(url, ayar, ms) {
  const kontrol = new AbortController();
  const t = setTimeout(() => kontrol.abort(), ms);
  try { return await fetch(url, { ...ayar, signal: kontrol.signal }); }
  catch (e) { throw kontrol.signal.aborted ? { code: 'zaman' } : { code: 'internet' }; }
  finally { clearTimeout(t); }
}
async function geminiIstek(prompt, { json = false, onText } = {}) {
  const key = geminiAnahtar(); if (!key) throw { code: 'yok' };
  if (navigator.onLine === false) throw { code: 'internet' };
  const govde = JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: json ? { responseMimeType: 'application/json' } : {} });
  const akis = !!onText && !json && !!(window.ReadableStream && window.TextDecoder);
  let sonHata = { code: 'model_yok' };
  for (const m of geminiModel ? [geminiModel] : GEMINI_MODELLER) {
    let r;
    const sure = json ? 120000 : 45000;
    const ayar = { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: govde };
    r = await geminiFetch(GEMINI_URL + m + (akis ? ':streamGenerateContent?alt=sse' : ':generateContent'), ayar, sure);
    if (r.status === 404) { sonHata = { code: 'model_yok' }; continue; }
    if (r.status >= 500) { await bekle(1500); r = await geminiFetch(r.url, ayar, sure); }
    if (!r.ok) {
      const h = await geminiHata(r);
      if ((h.code === 'yogun' || h.code === 'kota') && !geminiModel) { sonHata = h; continue; }
      if (h.code === 'yogun' || h.code === 'kota') { geminiModel = null; }
      throw h;
    }
    geminiModel = m;
    let text = '';
    if (akis) {
      const okuyucu = r.body.getReader(), dec = new TextDecoder(); let tampon = '';
      for (;;) {
        const { done, value } = await okuyucu.read(); if (done) break;
        tampon += dec.decode(value, { stream: true });
        let i;
        while ((i = tampon.indexOf('\n')) >= 0) {
          const satir = tampon.slice(0, i).trim(); tampon = tampon.slice(i + 1);
          if (!satir.startsWith('data:')) continue;
          try { const parca = geminiMetin(JSON.parse(satir.slice(5))); if (parca) { text += parca; onText({ text }); } } catch (e) { }
        }
      }
    } else text = geminiMetin(await r.json());
    if (!text.trim()) throw { code: 'bos' };
    return { text };
  }
  throw sonHata;
}
function jsonCoz(t) {
  const s = String(t).trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try { return JSON.parse(s); } catch (e) { }
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { } }
  throw { code: 'bos', message: 'Yapay zekânın cevabı okunamadı. Tekrar dene.' };
}
async function aiSor(input, opts = {}) {
  if (S.claude) {
    try { return await S.claude(input, { modelTier: 'default', cache: false, ...opts }); }
    catch (e) { if (e && e.code === 'not_granted') { S.claude = null; } throw e; }
  }
  if (geminiAnahtar()) return geminiIstek(input, { onText: opts.onText });
  throw { code: 'yok' };
}
async function aiJson(input, opts = {}) {
  if (S.claude) {
    try { return await S.claude.json(input, { modelTier: 'default', ...opts }); }
    catch (e) { if (e && e.code === 'not_granted') { S.claude = null; } throw e; }
  }
  if (geminiAnahtar()) return jsonCoz((await geminiIstek(input, { json: true })).text);
  throw { code: 'yok' };
}
function aiHata(e) {
  if (!e) return 'Bilinmeyen bir hata oluştu.';
  const m = {
    yok: 'Bu özellik için yapay zekâ bağlantısı gerekiyor. Üstteki "Yapay zekâ" düğmesinden ücretsiz Gemini anahtarını ekleyebilirsin.',
    rate_limited: 'Claude şu an çok yoğun. Birkaç dakika sonra tekrar dene.',
    not_granted: 'Claude\'a erişim izni verilmedi. Bu özelliği kullanmak için izin istendiğinde onay vermen gerekiyor.',
    anahtar_gecersiz: 'Gemini anahtarı geçersiz. AI Studio\'dan anahtarı tekrar kopyalayıp "Yapay zekâ" ayarına yapıştır.',
    yetki: 'Bu anahtarın Gemini API\'ye erişim izni yok. AI Studio\'dan yeni bir anahtar oluşturmayı dene.',
    kota: 'Gemini\'nin ücretsiz kotası şimdilik doldu (denenen tüm modellerde). Bir dakika sonra tekrar dene. Günlük kota dolduysa ertesi gün Türkiye saatiyle 10-11 civarında yenilenir.',
    yogun: 'Google\'ın Gemini sunucuları şu an cevap veremedi (geçici bir sorun, anahtarınla ilgili değil). Birkaç dakika sonra tekrar dene.',
    internet: 'Google\'a ulaşılamadı. İnternet bağlantını kontrol et. Bağlantın varsa bir tarayıcı eklentisi (reklam engelleyici, gizlilik eklentisi, VPN) isteği engelliyor olabilir; gizli sekmede çalışıyorsa sebep büyük ihtimalle budur. Uygulamanın geri kalanı internetsiz de çalışır.',
    zaman: 'Gemini belirlenen sürede cevap vermedi. Biraz sonra tekrar dene. Gizli sekmede çalışıp burada takılıyorsa bir tarayıcı eklentisi (reklam engelleyici, gizlilik eklentisi, VPN) isteği bekletiyor olabilir; sorgulab.com için eklentiyi kapatmayı dene.',
    bolge: 'Gemini API bulunduğun bölgede kullanılamıyor.',
    model_yok: 'Uygun bir Gemini modeli bulunamadı. Uygulamanın güncellenmesi gerekebilir.',
    bos: 'Yapay zekâ boş ya da okunamayan bir cevap döndürdü. Tekrar dene.'
  };
  const ana = e.message && !['rate_limited', 'not_granted'].includes(e.code) && e.code !== 'yok' ? e.message : (m[e.code] || e.message || String(e));
  return e.detay ? `${ana} (Google: ${e.detay})` : ana;
}
function aiYokHTML(metinStr) {
  return `<div class="bilgi">${metinStr || aiHata({ code: 'yok' })} <button class="btn kucuk-btn" data-ai-ac>Anahtar ekle</button></div>`;
}
document.addEventListener('click', e => { if (e.target.closest('[data-ai-ac]')) aiPanelAc(); });

// ─── İletişim formu (Web3Forms: mesaj SorguLab'in e-postasına gider, adres sayfada görünmez) ───
const ILETISIM_ANAHTAR = 'daa2aa56-c531-4782-aff6-135fa24c0142';
const ILETISIM_POSTA = 'sorgulab@hotmail.com';
function iletisimAc() {
  let d = $('#iletisimDialog');
  if (!d) { d = document.createElement('dialog'); d.id = 'iletisimDialog'; d.className = 'ai-dialog'; document.body.appendChild(d); d.addEventListener('click', e => { if (e.target === d) d.close(); }); }
  iletisimCiz(d);
  if (d.showModal) d.showModal(); else d.setAttribute('open', '');
  setTimeout(() => { const t = $('#iltMesaj', d); if (t) t.focus(); }, 50);
}
function iletisimBaglam() {
  const parca = [S.lab === 'konu' ? `KonuLab · ${S.konuId || '-'}` : `SorguLab · ${S.view}`];
  if (S.lab !== 'konu') {
    parca.push(`veri: ${VS[S.veriSeti] ? VS[S.veriSeti].ad : S.veriSeti}`);
    if (S.view === 'alistirma' && S.aktifId[S.veriSeti]) parca.push(`soru: ${S.aktifId[S.veriSeti]}`);
  }
  return parca.join(' · ');
}
// Form sadece kendi sitemizde çalışır (claude.ai gibi başka adreslerde dış isteklere izin verilmiyor): orada siteye ve e-postaya yönlendir.
const formCalisir = () => /(^|\.)sorgulab\.com$|\.github\.io$|^localhost$|^127\.0\.0\.1$/.test(location.hostname);
function iletisimCiz(d) {
  if (!formCalisir()) {
    d.innerHTML = `<div class="ai-panel">
      <div class="ai-ust"><h2>Bize yaz</h2><button class="btn kucuk-btn" type="button" id="iltKapat" aria-label="Kapat">✕</button></div>
      <p>Öneri, hata bildirimi ya da şikâyet: mesajın doğrudan SorguLab ekibine ulaşır.</p>
      <div class="ai-satir"><a class="btn birincil" href="https://sorgulab.com/#iletisim" target="_blank" rel="noopener">sorgulab.com'da formu aç</a>
      <a class="btn" href="mailto:${ILETISIM_POSTA}?subject=${encodeURIComponent('SorguLab · Öneri')}&body=${encodeURIComponent('\n\n---\nSayfa: ' + iletisimBaglam())}">E-posta ile yaz</a></div>
      <p class="kucuk">İletişim formu sadece sorgulab.com'da çalışıyor. E-posta adresimiz: <b>${ILETISIM_POSTA}</b></p></div>`;
    $('#iltKapat', d).onclick = () => d.close();
    return;
  }
  d.innerHTML = `<form class="ai-panel ilt-form" id="iltForm" novalidate>
    <div class="ai-ust"><h2>Bize yaz</h2><button class="btn kucuk-btn" type="button" id="iltKapat" aria-label="Kapat">✕</button></div>
    <p>Öneri, hata bildirimi ya da şikâyet: mesajın doğrudan SorguLab ekibine ulaşır.</p>
    <label>Konu<select id="iltKonu"><option>Öneri</option><option>Hata bildirimi</option><option>Şikâyet</option><option>Diğer</option></select></label>
    <label>Mesajın<textarea id="iltMesaj" maxlength="5000" placeholder="Ne düşündüğünü, neyin işe yaramadığını ya da ne eklenmesini istediğini yaz."></textarea><span class="ilt-hata" id="iltMesajHata"></span></label>
    <label>E-postan <span class="kucuk" style="font-weight:400;color:var(--soluk)">(isteğe bağlı, sana dönmemizi istersen)</span><input type="email" id="iltPosta" autocomplete="email" placeholder="ad@ornek.com"><span class="ilt-hata" id="iltPostaHata"></span></label>
    <label class="gizli" aria-hidden="true">Boş bırak<input type="checkbox" id="iltBot" tabindex="-1" autocomplete="off"></label>
    <div class="ai-satir"><button class="btn birincil" type="submit" id="iltGonder">Gönder</button></div>
    <div id="iltSonuc"></div>
    <p class="kucuk">Hata bildirimlerinde hangi sayfada olduğun (${esc(iletisimBaglam())}) mesaja otomatik eklenir. Form çalışmazsa <a href="mailto:${ILETISIM_POSTA}">${ILETISIM_POSTA}</a> adresine de yazabilirsin.</p>
  </form>`;
  $('#iltKapat', d).onclick = () => d.close();
  const mesaj = $('#iltMesaj', d), posta = $('#iltPosta', d);
  mesaj.oninput = () => { $('#iltMesajHata', d).textContent = ''; };
  posta.oninput = () => { $('#iltPostaHata', d).textContent = ''; };
  $('#iltForm', d).onsubmit = async e => {
    e.preventDefault();
    const m = mesaj.value.trim(), p = posta.value.trim();
    let tamam = true;
    if (m.length < 5) { $('#iltMesajHata', d).textContent = 'Önce mesajını yaz.'; tamam = false; }
    if (p && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p)) { $('#iltPostaHata', d).textContent = 'E-posta adresi geçerli görünmüyor.'; tamam = false; }
    if (!tamam) return;
    if ($('#iltBot', d).checked) return;
    const btn = $('#iltGonder', d), sonuc = $('#iltSonuc', d);
    btn.disabled = true; btn.textContent = 'Gönderiliyor…'; sonuc.innerHTML = '';
    const konu = $('#iltKonu', d).value;
    const f = new FormData();
    f.append('access_key', ILETISIM_ANAHTAR);
    f.append('subject', `SorguLab · ${konu}`);
    f.append('from_name', 'SorguLab iletişim formu');
    f.append('Konu', konu);
    f.append('Mesaj', m);
    if (p) f.append('email', p);
    f.append('Sayfa', iletisimBaglam());
    f.append('Adres', location.href);
    const kontrol = new AbortController(), t = setTimeout(() => kontrol.abort(), 20000);
    try {
      const r = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: f, signal: kontrol.signal });
      let j = {}; try { j = await r.json(); } catch (x) { }
      if (!r.ok || !j.success) throw new Error((j.body && j.body.message) || j.message || ('HTTP ' + r.status));
      $('#iltForm', d).innerHTML = `<div class="ai-ust"><h2>Teşekkürler</h2><button class="btn kucuk-btn" type="button" id="iltKapat2" aria-label="Kapat">✕</button></div>
        <div class="karar dogru"><span class="karar-ikon">✓</span><div>Mesajın ulaştı.${p ? ' Gerekirse sana yazdığın adresten döneceğiz.' : ''}</div></div>`;
      $('#iltKapat2', d).onclick = () => d.close();
    } catch (x) {
      btn.disabled = false; btn.textContent = 'Gönder';
      sonuc.innerHTML = `<div class="hata-kutu">Mesaj gönderilemedi${kontrol.signal.aborted ? ' (yanıt gelmedi)' : navigator.onLine === false ? ' (internet bağlantısı yok)' : ''}. Biraz sonra tekrar dene ya da <a href="mailto:${ILETISIM_POSTA}?subject=${encodeURIComponent('SorguLab · ' + konu)}">${ILETISIM_POSTA}</a> adresine yaz.</div>`;
    } finally { clearTimeout(t); }
  };
}

// Ayar penceresi
// Anahtar değişince sayfayı baştan çizme (kontrol sonucu, yazılan cevap kaybolmasın): sadece etiketleri güncelle
function aiGuncelle() {
  ustCiz();
  const h = $('#btnHata'); if (h) h.textContent = aiAd() + ' hatamı açıklasın';
  const d = $('#degerlendir'); if (d) d.textContent = aiAd() + ' değerlendirsin';
  if (S.view === 'veri') veriCiz();
}
function aiDurumMetni() { return aiTur() ? aiAd() : 'kapalı'; }
function aiPanelAc() {
  let d = $('#aiDialog');
  if (!d) { d = document.createElement('dialog'); d.id = 'aiDialog'; d.className = 'ai-dialog'; document.body.appendChild(d); d.addEventListener('click', e => { if (e.target === d) d.close(); }); }
  aiPanelCiz(d);
  if (d.showModal) d.showModal(); else d.setAttribute('open', '');
}
function aiPanelCiz(d) {
  const k = geminiAnahtar();
  d.innerHTML = `<form method="dialog" class="ai-panel">
    <div class="ai-ust"><h2>Yapay zekâ desteği</h2><button class="btn kucuk-btn" value="kapat" aria-label="Kapat">✕</button></div>
    <p>Soru üretme, yanlış cevaba yorum ve mülakatta açık uçlu cevap değerlendirme yapay zekâ ile çalışır. Uygulamanın geri kalanı bunlar olmadan da tamamen çalışır.</p>
    ${S.claude ? '<div class="bilgi">Bu sayfayı claude.ai üzerinden açtığın için <b>Claude</b> kullanılıyor. Ek ayar gerekmez.</div>' : `
    <ol class="ai-adim">
      <li>Google hesabınla <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> adresini aç.</li>
      <li><b>Create API key</b> (API anahtarı oluştur) düğmesine bas. Kart bilgisi istenmez.</li>
      <li>Çıkan <code>AIza…</code> ile başlayan anahtarı kopyalayıp aşağıya yapıştır.</li>
    </ol>
    <label class="ai-etiket" for="aiAnahtar">Gemini API anahtarı</label>
    <div class="ai-satir"><input id="aiAnahtar" type="password" autocomplete="off" spellcheck="false" placeholder="AIza…" value="${esc(k)}">
      <button class="btn kucuk-btn" type="button" id="aiGoster">Göster</button></div>
    <div class="ai-satir"><button class="btn birincil" type="button" id="aiKaydet">Kaydet ve dene</button>${k ? '<button class="btn" type="button" id="aiSil">Anahtarı sil</button>' : ''}</div>
    <div id="aiSonuc">${k ? '<div class="bilgi">Anahtar kayıtlı. Yapay zekâ özellikleri <b>Gemini</b> ile çalışıyor.</div>' : ''}</div>
    <p class="kucuk">Anahtar sadece bu cihazdaki tarayıcıda saklanır, başka bir yere gönderilmez (sadece Google\'a, isteklerle birlikte). iPad ve bilgisayarda ayrı ayrı girmen gerekir. Anahtarı şifre gibi sakla. Paylaştıysan AI Studio\'dan silip yenisini oluştur.</p>
    <p class="kucuk">Ücretsiz katmanda Google, gönderilen içeriği ürünlerini geliştirmek için kullanabilir. Gönderilen içerik: soru, kodun ve tabloların yapısı ile ilk birkaç satırı. Kendi yüklediğin veride gizli bilgi varsa bu özellikleri o veriyle kullanma.</p>`}
  </form>`;
  const inp = $('#aiAnahtar', d); if (!inp) return;
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#aiKaydet', d).click(); } });
  $('#aiGoster', d).onclick = e => { const g = inp.type === 'password'; inp.type = g ? 'text' : 'password'; e.target.textContent = g ? 'Gizle' : 'Göster'; };
  const sil = $('#aiSil', d); if (sil) sil.onclick = () => { geminiAnahtarYaz(''); aiPanelCiz(d); aiGuncelle(); };
  $('#aiKaydet', d).onclick = async e => {
    const deger = inp.value.trim().replace(/\s+/g, '');
    const sonuc = $('#aiSonuc', d);
    if (!deger) { sonuc.innerHTML = '<div class="bilgi">Önce anahtarı yapıştır.</div>'; return; }
    e.target.disabled = true; sonuc.innerHTML = '<div class="yukleniyor">Anahtar deneniyor…</div>';
    const eski = geminiAnahtar(); geminiAnahtarYaz(deger);
    try {
      await geminiIstek('Sadece "tamam" yaz.');
      sonuc.innerHTML = '<div class="karar dogru"><span class="karar-ikon">✓</span><div>Bağlantı çalışıyor. Yapay zekâ özellikleri artık <b>Gemini</b> ile çalışacak.</div></div>';
      aiGuncelle(); aiPanelCiz(d); $('#aiSonuc', d).innerHTML = sonuc.innerHTML;
    } catch (x) {
      if (['anahtar_gecersiz', 'yetki', 'bolge'].includes(x && x.code)) geminiAnahtarYaz(eski);
      sonuc.innerHTML = `<div class="hata-kutu">${esc(aiHata(x))}${['anahtar_gecersiz', 'yetki', 'bolge'].includes(x && x.code) ? '' : ' Anahtar kaydedildi.'}</div>`;
      aiGuncelle();
    }
    e.target.disabled = false;
  };
}

// ═══════════════ Ayarlar menüsü: tema, ilerleme kaydı, iletişim ═══════════════
const TEMA_KEY = 'sorgulab-tema';
function temaAl() { try { const t = localStorage.getItem(TEMA_KEY); return t === 'light' || t === 'dark' ? t : 'sistem'; } catch (e) { return 'sistem'; } }
function temaAyarla(t) {
  try { if (t === 'sistem') localStorage.removeItem(TEMA_KEY); else localStorage.setItem(TEMA_KEY, t); } catch (e) { }
  if (t === 'sistem') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  $$('[data-tema]').forEach(b => { const a = b.dataset.tema === t; b.classList.toggle('aktif', a); b.setAttribute('aria-checked', a); });
}
function ayarMenuAc(ac) {
  const m = $('#ayarMenu'), b = $('#ayarBtn');
  m.hidden = !ac; b.setAttribute('aria-expanded', ac);
  if (ac) {
    temaAyarla(temaAl());
    // Dar ekranda menü sola taşmasın
    m.style.right = ''; const r = m.getBoundingClientRect(); if (r.left < 8) m.style.right = (r.left - 8) + 'px';
  }
}
$('#ayarBtn').addEventListener('click', e => { e.stopPropagation(); ayarMenuAc($('#ayarMenu').hidden); });
document.addEventListener('click', e => { if (!$('#ayarMenu').hidden && !e.target.closest('.ayar-kap')) ayarMenuAc(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#ayarMenu').hidden) { ayarMenuAc(false); $('#ayarBtn').focus(); } });
$$('[data-tema]').forEach(b => b.addEventListener('click', () => temaAyarla(b.dataset.tema)));
$('#ayarIletisim').addEventListener('click', () => { ayarMenuAc(false); iletisimAc(); });
$('#ayarYedek').addEventListener('click', () => { ayarMenuAc(false); yedekAc(); });
$('#ayarGizlilik').addEventListener('click', () => { ayarMenuAc(false); gizlilikAc(); });
function gizlilikAc() {
  let d = $('#gizlilikDialog');
  if (!d) { d = document.createElement('dialog'); d.id = 'gizlilikDialog'; d.className = 'ai-dialog'; document.body.appendChild(d); d.addEventListener('click', e => { if (e.target === d) d.close(); }); }
  d.innerHTML = `<div class="gizlilik-ic">
    <div class="tg-ust"><span class="tg-adim">Ayarlar</span><button class="btn hafif kucuk-btn" data-kapat type="button">Kapat</button></div>
    <h2>Gizlilik ve veri kaynakları</h2>
    <p>SorguLab'de hesap ya da üyelik yok; senden kişisel bilgi istemiyoruz.</p>
    <section><h3>Senin cihazında kalanlar</h3>
      <p>Çözdüğün sorular, yarım kalan kodların, tahminlerin, tema seçimin ve yüklediğin Excel/CSV dosyaları sadece bu cihazdaki tarayıcıda saklanır. Hiçbiri bir sunucuya gönderilmez ve başkası tarafından görülemez. Tarayıcı verilerini silersen bunlar da silinir; korumak için ⚙ → <b>İlerleme kaydı</b> ile yedek alabilirsin.</p></section>
    <section><h3>Ziyaretçi sayısı</h3>
      <p>Sitenin kaç kez ve hangi bölümlerinin açıldığını görmek için GoatCounter kullanılıyor. Çerez kullanmaz, seni tanımlayacak bir bilgi toplamaz; sadece sayfa açılış sayıları tutulur.</p></section>
    <section><h3>İletişim formu</h3>
      <p>Formdan gönderdiğin mesaj ve yazarsan e-posta adresin, Web3Forms hizmeti aracılığıyla SorguLab'in e-posta kutusuna iletilir. Sadece sana cevap vermek için kullanılır, başka bir amaçla kullanılmaz ve kimseyle paylaşılmaz.</p></section>
    <section><h3>Yapay zekâ (isteğe bağlı)</h3>
      <p>Yapay zekâ özelliklerini kullanırsan; soru, yazdığın kod ve gerekiyorsa tablolarının yapısıyla birkaç örnek satır, cevabı hazırlaması için yapay zekâ hizmetine gönderilir: kendi anahtarınla Google Gemini'ye, claude.ai içinde Claude'a (Anthropic). Bu gönderim ilgili hizmetin kendi koşullarına tabidir. Gemini anahtarın sadece bu cihazda saklanır. Kişisel ya da gizli veri içeren bir dosya yüklediysen yapay zekâ özelliklerini kullanmadan önce bunu göz önünde bulundur.</p></section>
    <section><h3>Veri kaynakları</h3>
      <p>Hazır veri setleri eğitim amaçlı, herkese açık kaynaklardan alındı:</p>
      <ul>
        <li><b>İK Attrition</b> ve <b>Telco Müşteri Kaybı:</b> IBM'in örnek veri setleri (Kaggle'da herkese açık).</li>
        <li><b>Titanic:</b> Kaggle'ın "Titanic" yarışmasının eğitim verisi.</li>
        <li><b>Northwind:</b> Microsoft'un örnek veritabanı.</li>
        <li><b>FLO Müşteri:</b> veri bilimi eğitimlerinde kullanılan, herkese açık FLO müşteri veri seti.</li>
        <li><b>Örnek Mağaza:</b> SorguLab için üretilmiş sentetik (gerçek olmayan) veri.</li>
      </ul></section>
  </div>`;
  $('[data-kapat]', d).onclick = () => d.close();
  if (!d.open) { if (d.showModal) d.showModal(); else d.setAttribute('open', ''); }
}

// ─── İlerleme kaydı (yedek dosyası) ───
const SON_YEDEK_KEY = 'sorgulab-son-yedek';
function yedekAc(mesaj) {
  let d = $('#yedekDialog');
  if (!d) { d = document.createElement('dialog'); d.id = 'yedekDialog'; d.className = 'ai-dialog'; document.body.appendChild(d); d.addEventListener('click', e => { if (e.target === d) d.close(); }); }
  let son = null; try { son = localStorage.getItem(SON_YEDEK_KEY); } catch (e) { }
  const cozulen = Object.keys(depo.cozuldu).length, Y = VS.yuklenen;
  d.innerHTML = `<div class="yedek-ic">
    <div class="tg-ust"><span class="tg-adim">Ayarlar</span><button class="btn hafif kucuk-btn" data-kapat type="button">Kapat</button></div>
    <h2>İlerleme kaydı</h2>
    <p class="tg-metin">SorguLab'de hesap yok; çözdüğün sorular ve yarım kalan kodların sadece bu tarayıcıda saklanır. Tarayıcı verisi silinirse ya da başka bir cihaza geçersen kaybolur. İlerleme kaydı bunları küçük bir dosyaya alır, istediğin yerde geri yüklersin.</p>
    <ol class="yedek-adimlar">
      <li><span><b>İlerlememi indir</b>'e bas. Cihazına <code>sorgulab-yedek-….json</code> dosyası iner.</span></li>
      <li><span>Dosyayı sakla ya da diğer cihazına gönder (AirDrop, iCloud, mail…).</span></li>
      <li><span>Diğer cihazda SorguLab'i aç, ⚙ → İlerleme kaydı → <b>Yedekten yükle</b> ile dosyayı seç. Mevcut ilerlemenle birleştirilir, hiçbir şey silinmez.</span></li>
    </ol>
    <div class="yedek-kutu">
      <h3>Yedek al</h3>
      <p class="yedek-not">Bu cihazda <b>${cozulen}</b> çözülmüş soru, <b>${Object.keys(depo.tahmin).length}</b> tahmin, <b>${Object.values(depo.taslak).filter(v => v && v.trim()).length}</b> taslak var.${son ? ` Son yedek: ${esc(new Date(+son).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }))}.` : ' Henüz yedek almadın.'}</p>
      ${Y ? `<label class="yedek-tik"><input type="checkbox" id="yedekVeri"> Yüklediğim veriyi (${esc(Y.ad)}) ve ona özel soruları da ekle</label>` : ''}
      <div class="yedek-dugmeler"><button class="btn birincil" id="yedekIndir" type="button">İlerlememi indir</button></div>
    </div>
    <div class="yedek-kutu">
      <h3>Yedekten yükle</h3>
      <div class="yedek-dugmeler"><label class="btn" tabindex="0">Yedek dosyası seç<input type="file" id="yedekDosya" accept=".json,application/json" hidden></label></div>
      <div id="yedekDurum">${mesaj || ''}</div>
    </div>
    <p class="yedek-not">Yapay zekâ anahtarın yedeğe eklenmez; dosyayı biriyle paylaşsan bile anahtarın gitmez.</p>
  </div>`;
  $('[data-kapat]', d).onclick = () => d.close();
  $('#yedekIndir', d).onclick = () => yedekIndir(!!($('#yedekVeri', d) || {}).checked);
  const inp = $('#yedekDosya', d);
  inp.onchange = () => inp.files[0] && yedekOku(inp.files[0]);
  const lbl = inp.closest('label'); lbl.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } };
  if (!d.open) { if (d.showModal) d.showModal(); else d.setAttribute('open', ''); }
}
async function yedekIndir(veriDahil) {
  const Y = VS.yuklenen;
  const yedek = { uygulama: 'SorguLab', surum: 1, tarih: new Date().toISOString(), depo: { cozuldu: depo.cozuldu, bakarak: depo.bakarak, tahmin: depo.tahmin, tahminSonra: depo.tahminSonra, taslak: depo.taslak } };
  if (veriDahil && Y) yedek.yuklenen = { ad: Y.ad, tablolar: Y.tablolar, sorular: Y.sorular };
  const p = n => String(n).padStart(2, '0'), z = new Date();
  let ok;
  try { ok = await dosyaKaydet(`sorgulab-yedek-${z.getFullYear()}-${p(z.getMonth() + 1)}-${p(z.getDate())}.json`, new Blob([JSON.stringify(yedek)], { type: 'application/json' })); }
  catch (e) { yedekAc(`<div class="hata-kutu">Yedek kaydedilemedi: ${esc(e.message || e)}</div>`); return; }
  if (!ok) return;
  try { localStorage.setItem(SON_YEDEK_KEY, String(Date.now())); } catch (e) { }
  yedekAc('<div class="bilgi">Yedek dosyası indirildi. Güvenli bir yerde sakla.</div>');
}
async function yedekOku(f) {
  const durum = $('#yedekDurum');
  let y;
  try { y = JSON.parse(await f.text()); } catch (e) { durum.innerHTML = '<div class="hata-kutu">Bu dosya okunamadı. SorguLab\'den indirilen bir <code>.json</code> yedek dosyası seçmelisin.</div>'; return; }
  if (!y || y.uygulama !== 'SorguLab' || !y.depo) { durum.innerHTML = '<div class="hata-kutu">Bu bir SorguLab yedek dosyası değil.</div>'; return; }
  const yd = { cozuldu: {}, bakarak: {}, tahmin: {}, taslak: {}, ...y.depo };
  const yeniCoz = Object.keys(yd.cozuldu).filter(id => !depo.cozuldu[id]).length;
  const yukseltme = Object.keys(yd.cozuldu).filter(id => depo.cozuldu[id] && depo.bakarak[id] && !yd.bakarak[id]).length;
  const yeniTahmin = Object.keys(yd.tahmin).filter(id => depo.tahmin[id] === undefined).length;
  const yeniTaslak = Object.entries(yd.taslak).filter(([id, v]) => v && v.trim() && !(depo.taslak[id] || '').trim()).length;
  const ortakTaslak = Object.entries(yd.taslak).filter(([id, v]) => v && v.trim() && (depo.taslak[id] || '').trim() && depo.taslak[id] !== v).length;
  const veri = y.yuklenen && y.yuklenen.tablolar;
  const tarih = y.tarih ? new Date(y.tarih).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  durum.innerHTML = `<div class="bilgi"><b>${esc(tarih)}</b> tarihli yedek. Yüklenirse:<ul>
      <li>${yeniCoz} yeni çözülmüş soru eklenir${yukseltme ? `, ${yukseltme} soru soluk ✓'den normal ✓'ye geçer` : ''}</li>
      <li>${yeniTahmin} tahmin, ${yeniTaslak} taslak eklenir${ortakTaslak ? ` (${ortakTaslak} soruda sende de taslak olduğu için seninki korunur)` : ''}</li>
      ${veri ? `<li>Yedekte yüklenmiş bir veri var: <b>${esc(y.yuklenen.ad)}</b>${VS.yuklenen ? ` <label class="yedek-tik"><input type="checkbox" id="yedekVeriAl"> Şu anki verimin (${esc(VS.yuklenen.ad)}) yerine bunu koy</label>` : ' (eklenecek)'}</li>` : ''}
    </ul>Hiçbir ilerleme silinmez.<div class="yedek-dugmeler" style="margin-top:8px"><button class="btn birincil" id="yedekUygula" type="button">Birleştir ve yükle</button><button class="btn hafif" id="yedekVazgec" type="button">Vazgeç</button></div></div>`;
  $('#yedekVazgec').onclick = () => { durum.innerHTML = ''; };
  $('#yedekUygula').onclick = async () => {
    for (const id of Object.keys(yd.cozuldu)) {
      if (!yd.cozuldu[id]) continue;
      const normal = (depo.cozuldu[id] && !depo.bakarak[id]) || !yd.bakarak[id];
      depo.cozuldu[id] = true;
      if (normal) delete depo.bakarak[id]; else depo.bakarak[id] = true;
    }
    for (const [id, v] of Object.entries(yd.tahmin)) if (depo.tahmin[id] === undefined) { depo.tahmin[id] = v; if (yd.tahminSonra && yd.tahminSonra[id]) depo.tahminSonra[id] = true; }
    for (const [id, v] of Object.entries(yd.taslak)) if (v && v.trim() && !(depo.taslak[id] || '').trim()) depo.taslak[id] = v;
    kaydet();
    if (veri && (!VS.yuklenen || ($('#yedekVeriAl') || {}).checked)) {
      VS.yuklenen = { ad: y.yuklenen.ad, tablolar: y.yuklenen.tablolar, sorular: y.yuklenen.sorular || [], meta: metaHesapla(y.yuklenen.tablolar) };
      delete gonderilen.yuklenen; Object.keys(beklenenCache).filter(k => k.startsWith('yuklenen:')).forEach(k => delete beklenenCache[k]);
      if (pyYukluVS === 'yuklenen') pyYukluVS = null;
      await yukleneniKaydet();
    }
    ustCiz(); yenidenCiz();
    yedekAc('<div class="karar dogru"><span class="karar-ikon">✓</span><div>Yedek yüklendi ve ilerlemenle birleştirildi.</div></div>');
  };
}
// ═══════════════ İlk açılış tanıtımı ═══════════════
const TANITIM_KEY = 'sorgulab-tanitim-gizle';
const TANITIM = [
  { ust: 'Hoş geldin', baslik: 'SorguLab\'e hoş geldin 👋', metin: 'SQL ve Python\'u gerçek veri setleri üzerinde, yazarak öğrenmek için bir alıştırma alanı. Kurulum yok, üyelik yok: her şey tarayıcında çalışır.',
    gorsel: `<div class="tg-kartlar"><div class="tg-kart"><b>300+</b><span>soru</span></div><div class="tg-kart"><b>6</b><span>hazır veri seti</span></div><div class="tg-kart"><b>40+</b><span>konu anlatımı</span></div></div>` },
  { ust: 'Alıştırmalar', baslik: 'Yaz, çalıştır, kontrol et', metin: 'Soldan bir soru seç, kodunu yaz. <b>Çalıştır</b> ile çıktını gör, emin olunca <b>Kontrol et</b>. Beklenen çıktıyla karşılaştırılır. Takılırsan İpucu, Cevabı göster ve Neden böyle? düğmeleri seni bekliyor.',
    gorsel: `<div class="tg-editor"><div class="tg-kod"><span class="kw">SELECT</span> Department, <span class="fn">COUNT</span>(*)<br><span class="kw">FROM</span> hr<br><span class="kw">GROUP BY</span> Department;</div><div class="tg-dugmeler"><span class="tg-btn birincil">Çalıştır</span><span class="tg-btn vurgu">Kontrol et</span><span class="tg-btn">İpucu</span></div><div class="tg-karar">✓ Doğru! Çıktın beklenenle aynı.</div></div>` },
  { ust: 'Veri setleri', baslik: 'Hangi veriyle çalışacağını sen seç', metin: 'Sağ üstteki <b>Veri seti</b> menüsünden İK, Örnek Mağaza, Northwind, Titanic, FLO ya da Telco\'ya geç. <b>Veri</b> sekmesinden kendi Excel ya da CSV dosyanı da yükleyebilirsin. Dosyan sadece senin cihazında kalır.',
    gorsel: `<div class="tg-veri"><span class="tg-hap secili">İK Attrition</span><span class="tg-hap">Örnek Mağaza</span><span class="tg-hap">Northwind</span><span class="tg-hap">Titanic</span><span class="tg-hap">FLO Müşteri</span><span class="tg-hap">Telco</span><span class="tg-hap kesik">+ Kendi verin</span></div>` },
  { ust: 'Diğer modlar', baslik: 'Sadece soru çözmek değil', metin: '',
    gorsel: `<ul class="tg-modlar"><li><b>Tahmin Et</b><span>Kodu çalıştırmadan çıktısını tahmin et.</span></li><li><b>Mülakat</b><span>Süreli, ipucusuz kod soruları ya da teorik sorularla prova.</span></li><li><b>Serbest Alan</b><span>Veriyle istediğin gibi oyna.</span></li><li><b>KonuLab</b><span>Üstteki SorguLab ⇄ KonuLab geçişiyle konu anlatımları.</span></li></ul>` },
  { ust: 'Yapay zekâ', baslik: 'İstersen yanında bir yardımcı', metin: 'Üstteki <b>Yapay zekâ</b> düğmesinden ücretsiz bir Gemini anahtarı ekleyerek hatalarını açıklatabilir, kendi verine özel sorular ürettirebilirsin. Zorunlu değil, her şey onsuz da çalışır.<br><br>Bir önerin ya da bulduğun bir hata olursa sağ üstteki <b>⚙ Ayarlar</b> menüsündeki <b>İletişim</b>\'ten yazabilirsin. Tema seçimi ve ilerleme kaydı da orada. Kolay gelsin!',
    gorsel: `<div class="tg-veri"><span class="tg-hap ai">Yapay zekâ: kapalı</span><span class="tg-hap ai">⚙ Ayarlar</span></div>` },
];
function tanitimAc(zorla) {
  if (!zorla) { try { if (localStorage.getItem(TANITIM_KEY)) return; } catch (e) { return; } }
  let d = $('#tanitimDialog');
  if (!d) { d = document.createElement('dialog'); d.id = 'tanitimDialog'; d.className = 'ai-dialog tanitim'; document.body.appendChild(d); }
  let i = 0;
  // Tik atılırsa ya da tanıtım sonuna kadar izlenirse (Başlayalım) bir daha kendiliğinden açılmaz. Üst bardaki ? ile her zaman açılır.
  const kapat = bitti => { const t = $('#tgGizle', d); if (bitti === true || (t && t.checked)) { try { localStorage.setItem(TANITIM_KEY, '1'); } catch (e) { } } d.close(); };
  const ciz = () => {
    const a = TANITIM[i], son = i === TANITIM.length - 1, isaretli = $('#tgGizle', d) ? $('#tgGizle', d).checked : false;
    d.innerHTML = `<div class="tg-ic">
      <div class="tg-ust"><span class="tg-adim">${a.ust}</span><span class="tg-sayac">${i + 1} / ${TANITIM.length}</span></div>
      <h2>${a.baslik}</h2>
      ${a.metin ? `<p class="tg-metin">${a.metin}</p>` : ''}
      <div class="tg-gorsel">${a.gorsel}</div>
      <div class="tg-noktalar" aria-hidden="true">${TANITIM.map((_, k) => `<span class="${k === i ? 'aktif' : ''}"></span>`).join('')}</div>
      <div class="tg-alt">
        <label class="tg-gizle"><input type="checkbox" id="tgGizle" ${isaretli ? 'checked' : ''}> Bir daha gösterme</label>
        <div class="tg-dugmeler-alt">
          ${son ? '' : '<button class="btn hafif" id="tgAtla" type="button">Atla</button>'}
          ${i > 0 ? '<button class="btn" id="tgGeri" type="button">Geri</button>' : ''}
          <button class="btn birincil" id="tgIleri" type="button">${son ? 'Başlayalım' : 'Devam'}</button>
        </div>
      </div></div>`;
    $('#tgIleri', d).onclick = () => { if (son) kapat(true); else { i++; ciz(); } };
    const g = $('#tgGeri', d); if (g) g.onclick = () => { i--; ciz(); };
    const at = $('#tgAtla', d); if (at) at.onclick = () => kapat();
  };
  d.onclose = null; d.oncancel = e => { e.preventDefault(); kapat(); };
  const eskiYer = $('#tgGizle', d); if (eskiYer) eskiYer.checked = false;
  ciz();
  if (d.showModal) d.showModal(); else d.setAttribute('open', '');
  setTimeout(() => { const b = $('#tgIleri', d); if (b) b.focus(); }, 30);
}

// ═══════════════ Motor (SQL + Python) ═══════════════
// Kod motor.js'te; mümkünse arka plan iş parçacığında (Web Worker) çalışır. Böylece sonsuz döngü sayfayı dondurmaz,
// süre sınırı ve Durdur düğmesi çalışır. Worker kurulamazsa ya da içinde motor yüklenemezse sayfanın içinde çalışır.
const SQL_KAYNAKLAR = [
  { js: new URL('sql-wasm.js', location.href).href, wasm: new URL('sql-wasm.wasm', location.href).href },
  { js: 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.js', wasm: 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.wasm' },
  { js: 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-asm-memory-growth.js' }
];
const PY_KAYNAKLAR = [new URL('pyodide/', location.href).href, 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'];
const PY_PAKETLER = ['six', 'python_dateutil', 'pytz', 'numpy', 'pandas'];
const SURE = { sql: 20000, python: 30000 };
let motorKip = null;          // 'isci' | 'sayfa'
let isci = null, isciP = null, isNo = 0, isciKalici = false;
const isBekleyen = new Map();
let gonderilen = {};          // motora gönderilen veri (anahtar -> tablolar)
let sqlDurum = 'yok', sqlHazirP = null;
function isciDene(url) {
  return new Promise((ok, red) => {
    let w;
    try { w = new Worker(url); } catch (e) { return red(e); }
    const t = setTimeout(() => { w.terminate(); red(new Error('yanıt yok')); }, 8000);
    w.onerror = e => { e.preventDefault && e.preventDefault(); clearTimeout(t); w.terminate(); red(new Error('worker açılamadı')); };
    w.onmessage = e => { if (e.data && e.data.merhaba) { clearTimeout(t); ok(w); } };
  });
}
function isciMesaj(e) {
  const m = e.data;
  if (m.asama) { pyAsamaAyarla(m.asama); return; }
  const b = isBekleyen.get(m.id); if (!b) return;
  if (m.basladi) { b.basla && b.basla(); return; }
  isBekleyen.delete(m.id); clearTimeout(b.zaman);
  if (m.ok) b.ok(m.r); else b.red(new Error(m.hata));
}
async function motorHazir() {
  if (motorKip === 'sayfa' || isci) return;
  if (!isciP) isciP = (async () => {
    if (!isciKalici && typeof Worker !== 'undefined') {
      const denemeler = [() => new URL('motor.js', location.href).href];
      if (typeof MOTOR_KOD === 'string') denemeler.push(() => URL.createObjectURL(new Blob([MOTOR_KOD], { type: 'text/javascript' })));
      for (const d of denemeler) {
        try { isci = await isciDene(d()); isci.onmessage = isciMesaj; isci.onerror = null; motorKip = 'isci'; return; }
        catch (e) { console.warn('Motor iş parçacığı kurulamadı:', e); }
      }
    }
    motorKip = 'sayfa';
  })().finally(() => { isciP = null; });
  return isciP;
}
function sayfayaGec() {
  // Worker içinde motor yüklenemedi (örn. çevrimdışı iPad'de worker önbelleğe ulaşamadı): bundan sonra sayfada çalış.
  if (isci) { isci.terminate(); isci = null; }
  isciKalici = true; motorKip = 'sayfa'; gonderilen = {};
  for (const [, b] of isBekleyen) b.red(new Error('motor değişti')); isBekleyen.clear();
}
// sure: iş başladıktan sonra en fazla bu kadar beklenir; aşılırsa motor durdurulur.
function motor(fn, args, sure) {
  if (motorKip === 'sayfa') {
    Motor.ilerlemeAyarla(pyAsamaAyarla);
    return Promise.resolve().then(() => Motor[fn](...args));
  }
  return new Promise((ok, red) => {
    const id = ++isNo, b = { ok, red };
    if (sure) b.basla = () => { b.zaman = setTimeout(() => motorDurdur('sure', sure), sure); };
    b.calisma = !!sure;
    isBekleyen.set(id, b);
    isci.postMessage({ id, fn, args });
  });
}
function calisiyorVar() { for (const [, b] of isBekleyen) if (b.calisma) return true; return false; }
function motorDurdur(neden, sure) {
  if (motorKip !== 'isci' || !isci) return;
  isci.terminate(); isci = null; motorKip = null; gonderilen = {};
  const m = neden === 'sure'
    ? `Kod ${Math.round(sure / 1000)} saniyede bitmedi ve durduruldu. Sonsuz döngü ya da çok ağır bir işlem olabilir mi? (Serbest Alan'daki Python değişkenlerin de sıfırlandı.)`
    : 'Çalıştırma durduruldu. (Serbest Alan\'daki Python değişkenlerin de sıfırlandı.)';
  for (const [, b] of isBekleyen) { clearTimeout(b.zaman); const e = new Error(m); e.durduruldu = true; b.red(e); }
  isBekleyen.clear();
  // Motor yeniden kurulacak: SQL hızlı açılır, Python ortamı bir sonraki çalıştırmada yeniden hazırlanır.
  sqlHazirP = null; sqlDurum = 'yok';
  pyHazirP = null; pyYukluVS = null; pyAsama = '';
  if (pyDurum !== 'yok') pyDurumAyarla('yok');
}
document.addEventListener('click', e => { if (e.target.closest('[data-durdur]')) motorDurdur('kullanici'); });
const calisiyorHTML = (metin = 'Çalışıyor…') => `<div class="yukleniyor calisiyor"><span>${metin}</span>${typeof Worker !== 'undefined' && motorKip !== 'sayfa' ? '<button class="btn kucuk-btn durdur-btn" data-durdur>Durdur</button>' : ''}</div>`;
async function veriGonder(key) {
  await veriHazirla(key);
  const t = VS[key].tablolar;
  if (gonderilen[key] !== t) { await motor('veriVer', [key, t]); gonderilen[key] = t; }
}
function sqlHazirla() {
  if (!sqlHazirP) sqlHazirP = (async () => {
    sqlDurum = 'yukleniyor';
    await motorHazir();
    try { await motor('sqlBaslat', [SQL_KAYNAKLAR]); }
    catch (e) {
      if (motorKip !== 'isci') throw e;
      console.warn('SQL motoru iş parçacığında açılamadı, sayfada deneniyor:', e);
      sayfayaGec(); await motor('sqlBaslat', [SQL_KAYNAKLAR]);
    }
    sqlDurum = 'hazir';
  })().catch(e => { sqlDurum = 'hata'; sqlHazirP = null; throw new Error('SQL motoru yüklenemedi: ' + ((e && e.message) || e) + '. Sayfayı yenilemeyi dene.'); });
  return sqlHazirP;
}

let pyAsama = '';
function pyAsamaAyarla(t) { pyAsama = t; $$('.py-asama').forEach(el => el.textContent = t); }
const pyBekleHTML = () => `<div class="yukleniyor"><span class="py-asama">${esc(pyAsama || 'Python ortamı hazırlanıyor…')}</span></div>`;
function hataHTML(e) {
  const m = (e && e.message) || String(e);
  const py = m.startsWith('Python ortamı yüklenemedi');
  return `<div class="hata-kutu${e && e.durduruldu ? ' durduruldu' : ''}">${esc(m)}${py ? '<div><button class="btn kucuk-btn" data-py-tekrar>Tekrar dene</button></div>' : ''}</div>`;
}
document.addEventListener('click', e => { if (e.target.closest('[data-py-tekrar]') || (e.target.closest('#pyDurum') && pyDurum === 'hata')) { pyAsama = ''; pyHazirla().catch(() => { }); yenidenCiz(); } });
let pyHazirP = null, pyYukluVS = null, pyDurum = 'yok', pyTipler = {};
function pyDurumAyarla(d) { pyDurum = d; const el = $('#pyDurum'); if (el) { el.dataset.durum = d; el.textContent = { yok: 'Python: kapalı', yukleniyor: 'Python hazırlanıyor…', hazir: 'Python hazır', hata: 'Python yüklenemedi · tekrar dene' }[d]; el.style.cursor = d === 'hata' ? 'pointer' : ''; } }
function pyHazirla() {
  if (!pyHazirP) {
    pyHazirP = (async () => {
      pyDurumAyarla('yukleniyor');
      await motorHazir();
      try { await motor('pyBaslat', [PY_KAYNAKLAR, PY_PAKETLER, HELPER_PY]); }
      catch (e) {
        if (motorKip !== 'isci') throw e;
        console.warn('Python iş parçacığında açılamadı, sayfada deneniyor:', e);
        sayfayaGec(); sqlHazirP = null; await motor('pyBaslat', [PY_KAYNAKLAR, PY_PAKETLER, HELPER_PY]);
      }
      pyAsamaAyarla('Python hazır');
      pyDurumAyarla('hazir');
    })().catch(e => { pyDurumAyarla('hata'); pyAsama = ''; pyHazirP = null; throw new Error('Python ortamı yüklenemedi: ' + ((e && e.message) || e) + '. Sayfayı yenileyip tekrar deneyebilirsin.'); });
  }
  return pyHazirP;
}
async function pyVeriHazirla(key) {
  await pyHazirla(); await veriGonder(key);
  pyTipler = await motor('pyVeri', [key]); pyYukluVS = key;
}

// Ortak çalıştırıcı. temiz=true: soru kontrolünde, oyun alanındaki değişikliklerden etkilenmeyen taze veri.
async function calistir(dil, kod, temiz = false) {
  const key = S.veriSeti;
  if (dil === 'sql') {
    await sqlHazirla(); await veriGonder(key);
    const r = await motor('sql', [key, kod, temiz], SURE.sql);
    if (!r.ok && !r.ciftTirnak) r.ipucu = lehceIpucu(kod, r.error);
    return r;
  }
  await pyHazirla(); await veriGonder(key);
  // temiz=false sadece Serbest Alan'da: değişkenler çalıştırmalar arasında saklanır
  const out = await motor('py', [key, kod, !temiz], SURE.python);
  pyTipler = out.tipler || pyTipler; pyYukluVS = key; delete out.tipler;
  if (out.ok && !out.table && !out.stdout) out.mesaj = 'Kod çalıştı ama gösterilecek bir sonuç yok. Sonucu sonuc değişkenine ata ya da son satıra ifadeyi yaz.';
  return out;
}
const beklenenCache = {};
async function beklenenAl(q) {
  const k = S.veriSeti + ':' + q.id;
  if (!beklenenCache[k]) beklenenCache[k] = await calistir(q.dil, q.cozum, true);
  return beklenenCache[k];
}

// ═══════════════ Çıktı karşılaştırma ═══════════════
function nk(v) {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'boolean') return v ? '1.00' : '0.00';
  if (typeof v === 'number') { if (!isFinite(v)) return '∅'; return (Math.round(v * 100 + (v >= 0 ? 1e-7 : -1e-7)) / 100).toFixed(2); }
  let s = String(v).trim();
  if (/^-?\d+(\.\d+)?$/.test(s)) return nk(parseFloat(s));
  return s.replace(/^(\d{4}-\d{2}-\d{2})[T ]00:00:00(\.0+)?$/, '$1');
}
function karsilastir(bek, gel, sirali) {
  if (!gel || !gel.columns) return { dogru: false, mesaj: 'Çıktı yok. SQL\'de sorgunun bir SELECT ile bitmesi, Python\'da sonucun <code>sonuc</code> değişkeninde olması gerekiyor.' };
  const nBek = bek.total ?? bek.rows.length, nGel = gel.total ?? gel.rows.length;
  if (nBek !== nGel || bek.rows.length !== gel.rows.length) return { dogru: false, mesaj: `Satır sayısı tutmuyor: beklenen <b>${nBek}</b>, senin çıktında <b>${nGel}</b>.` };
  if (bek.columns.length !== gel.columns.length) return { dogru: false, mesaj: `Sütun sayısı tutmuyor: beklenen <b>${bek.columns.length}</b> (${bek.columns.map(c => `<code>${esc(c)}</code>`).join(', ')}), senin çıktında <b>${gel.columns.length}</b>.` };
  const sutunAnahtar = (t, j) => t.rows.map(r => nk(r[j])).sort().join('\u0001');
  const bA = bek.columns.map((_, j) => sutunAnahtar(bek, j));
  const gA = gel.columns.map((_, j) => sutunAnahtar(gel, j));
  const aday = bA.map(a => gA.map((g, j) => g === a ? j : -1).filter(j => j >= 0));
  const eksik = aday.findIndex(a => a.length === 0);
  if (eksik >= 0) return { dogru: false, mesaj: `<code>${esc(bek.columns[eksik])}</code> sütununun değerleri beklenenle eşleşmiyor.` };
  const satirlar = (t, harita) => t.rows.map(r => harita.map(j => nk(r[j])).join('\u0001'));
  const bS = satirlar(bek, bek.columns.map((_, j) => j));
  let sirasiYanlis = false, deneme = 0, bulunan = null;
  const kullanildi = new Set(), harita = [];
  (function ara(i) {
    if (bulunan || deneme > 4000) return;
    if (i === aday.length) {
      deneme++;
      const gS = satirlar(gel, harita);
      if (sirali) { if (gS.every((s, k) => s === bS[k])) bulunan = [...harita]; else if ([...gS].sort().join('\n') === [...bS].sort().join('\n')) sirasiYanlis = true; }
      else if ([...gS].sort().join('\n') === [...bS].sort().join('\n')) bulunan = [...harita];
      return;
    }
    for (const j of aday[i]) { if (kullanildi.has(j)) continue; kullanildi.add(j); harita.push(j); ara(i + 1); harita.pop(); kullanildi.delete(j); }
  })(0);
  if (!bulunan) return { dogru: false, mesaj: sirasiYanlis ? 'Değerler doğru ama <b>sıralama</b> farklı. Bu soruda sıralama önemli.' : 'Sütunlar tek tek doğru görünüyor ama satırlar birbiriyle eşleşmiyor. Değerler yanlış satırlarda olabilir.' };
  const farkli = bek.columns.filter((c, i) => String(c).toLowerCase() !== String(gel.columns[bulunan[i]]).toLowerCase());
  return { dogru: true, mesaj: 'Doğru! Çıktın beklenenle aynı.' + (farkli.length ? ` <span class="kucuk">Sütun adların farklı (${farkli.map(c => `<code>${esc(c)}</code>`).join(', ')} bekleniyordu), değerler doğru.</span>` : '') };
}

// ═══════════════ Görsel yardımcılar ═══════════════
const SQL_KW = new Set('SELECT FROM WHERE AND OR NOT IN IS NULL AS ON JOIN LEFT RIGHT INNER OUTER FULL CROSS GROUP BY ORDER HAVING LIMIT OFFSET DISTINCT CASE WHEN THEN ELSE END WITH UNION ALL EXISTS BETWEEN LIKE DESC ASC OVER PARTITION VALUES CAST INTEGER REAL TEXT INSERT INTO UPDATE SET DELETE CREATE TABLE DROP ROWS RANGE PRECEDING FOLLOWING UNBOUNDED CURRENT ROW'.split(' '));
const SQL_FN = new Set('COUNT SUM AVG MIN MAX ROUND COALESCE NULLIF IFNULL ROW_NUMBER RANK DENSE_RANK NTILE LAG LEAD FIRST_VALUE LAST_VALUE STRFTIME JULIANDAY DATE LOWER UPPER SUBSTR LENGTH TRIM ABS'.split(' '));
const PY_KW = new Set('import from as def return if elif else for in while not and or is None True False lambda with try except class pass break continue print len range'.split(' '));
function renklendir(kod, dil) {
  const re = dil === 'sql' ? /(--[^\n]*)|('(?:[^']|'')*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][\w]*)|([\s\S])/g : /(#[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][\w]*)|([\s\S])/g;
  let out = '', m;
  while ((m = re.exec(kod))) {
    if (m[1]) out += `<span class="h-yorum">${esc(m[1])}</span>`;
    else if (m[2]) out += `<span class="h-metin">${esc(m[2])}</span>`;
    else if (m[3]) out += `<span class="h-sayi">${m[3]}</span>`;
    else if (m[4]) {
      const w = m[4];
      if (dil === 'sql' && SQL_KW.has(w.toUpperCase())) out += `<span class="h-kw">${w}</span>`;
      else if (dil === 'sql' && SQL_FN.has(w.toUpperCase())) out += `<span class="h-fn">${w}</span>`;
      else if (dil !== 'sql' && PY_KW.has(w)) out += `<span class="h-kw">${w}</span>`;
      else out += esc(w);
    } else out += esc(m[5]);
  }
  return out;
}
const kodBlok = (kod, dil) => `<pre class="kod-blok"><code>${renklendir(kod, dil)}</code></pre>`;
// tur: Python sonuçlarında sütunun pandas türü (f, i, b, M, O…). Verilirse boş değerler ve ondalıklar pandas'taki gibi yazılır.
function hucre(v, tur) {
  if (v === null || v === undefined) {
    if (!tur) return '<td class="null">NULL</td>';
    return `<td class="null">${tur === 'f' || tur === 'c' ? 'NaN' : tur === 'M' || tur === 'm' ? 'NaT' : 'None'}</td>`;
  }
  if (typeof v === 'number') {
    let s = Number.isInteger(v) ? String(v) : String(+v.toFixed(4));
    if (tur === 'f' && Number.isInteger(v) && Math.abs(v) < 1e16) s += '.0';
    return `<td class="say">${s}</td>`;
  }
  if (typeof v === 'boolean') return `<td>${v ? 'True' : 'False'}</td>`;
  if (v === '') return '<td class="null">(boş)</td>';
  return `<td>${esc(v)}</td>`;
}
function tabloHTML(t, max = 200) {
  if (!t || !t.columns) return '';
  const satir = t.rows.slice(0, max);
  return `<div class="tablo-kap"><table class="sonuc"><thead><tr>${t.columns.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${satir.map(r => `<tr>${r.map((v, j) => hucre(v, t.turler && t.turler[j])).join('')}</tr>`).join('')}</tbody></table></div>
  <div class="tablo-alt">${t.total ?? t.rows.length} satır × ${t.columns.length} sütun${(t.total ?? t.rows.length) > max ? ` · ilk ${max} satır gösteriliyor` : ''}</div>`;
}
// Dosya indirme: claude.ai içinde 'downloads' yeteneğiyle (izleyiciye onay sorulur), başka yerde normal indirme.
// true: kaydedildi · false: kullanıcı vazgeçti
async function dosyaKaydet(ad, blob) {
  if (window.claude && typeof window.claude.use === 'function') {
    let dl = null; try { dl = await window.claude.use('downloads'); } catch (e) { }
    if (dl) {
      try { await dl.save({ filename: ad, data: blob }); return true; }
      catch (e) { if (e && e.code === 'declined') return false; throw new Error((e && e.message) || 'Dosya kaydedilemedi'); }
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = ad;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  return true;
}
// ═══════════════ Sonuç araçları: grafik ve Excel'e indirme ═══════════════
const CIKTILAR = new Map(); let ciktiNo = 0;
const sayiSutun = (t, j) => { let n = 0; for (const r of t.rows) { const v = r[j]; if (v === null || v === undefined) continue; if (typeof v !== 'number' || !isFinite(v)) return false; n++; } return n > 0; };
const tarihGibi = v => typeof v === 'string' && /^\d{4}(-\d{2}(-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?)?)?$/.test(v);
function ciktiAracHTML(t, ctx) {
  const id = ++ciktiNo;
  CIKTILAR.set(id, { t, ctx, veri: S.veriSeti });
  if (CIKTILAR.size > 40) CIKTILAR.delete(CIKTILAR.keys().next().value);
  const grafikOlur = t.columns.some((_, j) => sayiSutun(t, j)) && t.rows.length > 1;
  return `<div class="cikti-arac" data-cikti="${id}">
    ${grafikOlur ? '<button class="btn kucuk-btn" data-grafik type="button">Grafik</button>' : ''}
    <button class="btn kucuk-btn" data-indir type="button">Excel'e indir</button>
    <span class="kucuk">${grafikOlur ? '' : 'Grafik için en az iki satır ve bir sayısal sütun gerekiyor. '}Excel dosyasında sonuç ve kodun ayrı sayfalarda.</span>
  </div><div class="grafik-alan" hidden></div>`;
}
document.addEventListener('click', e => {
  const kap = e.target.closest('.cikti-arac'); if (!kap) return;
  const c = CIKTILAR.get(+kap.dataset.cikti); if (!c) return;
  if (e.target.closest('[data-indir]')) excelIndir(c, e.target.closest('[data-indir]'));
  else if (e.target.closest('[data-grafik]')) {
    const alan = kap.nextElementSibling, b = e.target.closest('[data-grafik]');
    if (!alan.hidden) { alan.hidden = true; b.classList.remove('secili'); return; }
    alan.hidden = false; b.classList.add('secili');
    if (!alan.dataset.kuruldu) { alan.dataset.kuruldu = '1'; grafikKur(alan, c.t); }
  }
});
async function excelIndir(c, btn) {
  const eski = btn.textContent; btn.disabled = true; btn.textContent = 'Hazırlanıyor…';
  try {
    if (!window.XLSX) await scriptYukle('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
    const { t, ctx, veri } = c, wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([t.columns, ...t.rows]), 'Sonuç');
    const simdi = new Date(), p = n => String(n).padStart(2, '0');
    const zaman = `${simdi.getFullYear()}-${p(simdi.getMonth() + 1)}-${p(simdi.getDate())} ${p(simdi.getHours())}:${p(simdi.getMinutes())}`;
    const toplam = t.total ?? t.rows.length;
    const bilgi = [['SorguLab'], ['Veri seti', VS[veri] ? VS[veri].ad : veri], ['Dil', DIL[ctx.dil] || ctx.dil], ...(ctx.baslik ? [['Soru', ctx.baslik]] : []), ['Tarih', zaman], ['Satır', toplam]];
    if (toplam > t.rows.length) bilgi.push(['Not', `Sonuç ${toplam} satır; dosyada ilk ${t.rows.length} satır var.`]);
    const ks = XLSX.utils.aoa_to_sheet([...bilgi, [], ['Kod'], ...ctx.kod.split('\n').map(l => [l])]);
    ks['!cols'] = [{ wch: 14 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, ks, 'Kod');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const ok = await dosyaKaydet(`sorgulab-${adTemizle(veri, 'veri')}-${zaman.replace(/[: ]/g, '-')}.xlsx`, new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    btn.textContent = ok ? 'İndirildi ✓' : eski; setTimeout(() => { btn.textContent = eski; btn.disabled = false; }, ok ? 1800 : 0);
  } catch (e) { btn.textContent = eski; btn.disabled = false; alert('Dosya hazırlanamadı: ' + ((e && e.message) || e)); }
}
function grafikKur(alan, t) {
  const sayisal = t.columns.map((_, j) => sayiSutun(t, j));
  const yAday = t.columns.map((c, j) => j).filter(j => sayisal[j]);
  let x = t.columns.findIndex((_, j) => !sayisal[j]); if (x < 0) x = 0;
  let y = yAday.find(j => j !== x); if (y === undefined) y = yAday[0];
  const xDegerleri = t.rows.map(r => r[x]);
  let tur = (sayisal[x] || xDegerleri.every(v => v == null || tarihGibi(v))) ? 'cizgi' : 'cubuk';
  const sec = (ad, secenekler, deger) => `<label>${ad}<select data-ayar="${ad}">${secenekler.map(([v, l]) => `<option value="${v}" ${v == deger ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  const ciz = () => {
    alan.innerHTML = `<div class="grafik-ayar">
      ${sec('Tür', [['cubuk', 'Çubuk'], ['cizgi', 'Çizgi']], tur)}
      ${sec('Kategori / X', t.columns.map((c, j) => [j, c]), x)}
      ${sec('Değer / Y', yAday.map(j => [j, t.columns[j]]), y)}
    </div><div class="grafik-kap"></div>`;
    $$('[data-ayar]', alan).forEach(s => s.onchange = () => { const v = s.value; if (s.dataset.ayar === 'Tür') tur = v; else if (s.dataset.ayar === 'Değer / Y') y = +v; else x = +v; ciz(); });
    const kap = $('.grafik-kap', alan);
    (tur === 'cubuk' ? cubukCiz : cizgiCiz)(kap, t, x, y);
  };
  ciz();
}
function guzelAdimlar(min, max, n = 5) {
  if (min === max) { const d = Math.abs(min) || 1; min -= d / 2; max += d / 2; }
  const ham = (max - min) / n, us = Math.pow(10, Math.floor(Math.log10(ham))), k = ham / us;
  const adim = (k <= 1 ? 1 : k <= 2 ? 2 : k <= 2.5 ? 2.5 : k <= 5 ? 5 : 10) * us;
  const bas = Math.floor(min / adim) * adim, son = Math.ceil(max / adim) * adim, out = [];
  for (let v = bas; v <= son + adim / 2; v += adim) out.push(+v.toFixed(10));
  return out;
}
// Eksen etiketleri: aynı eksendeki tüm etiketler aynı birimle (Mn / B / düz) yazılır.
const eksenYazici = adimlar => {
  const m = Math.max(...adimlar.map(Math.abs));
  const [bol, ek] = m >= 1e6 ? [1e6, ' Mn'] : m >= 1e4 ? [1e3, ' B'] : [1, ''];
  return v => (v / bol).toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + (v === 0 ? '' : ek);
};
const tamSayiYaz = v => v == null ? '∅' : v.toLocaleString('tr-TR', { maximumFractionDigits: 4 });
const svgEsc = s => esc(String(s ?? '∅'));
function ipucuKur(kap) {
  let ip = $('.grafik-ipucu', kap);
  if (!ip) { ip = document.createElement('div'); ip.className = 'grafik-ipucu'; ip.hidden = true; kap.appendChild(ip); }
  return {
    goster(html, px, py) {
      ip.innerHTML = html; ip.hidden = false;
      const w = kap.clientWidth, iw = ip.offsetWidth;
      ip.style.left = Math.min(Math.max(px - iw / 2, 4), w - iw - 4) + 'px'; ip.style.top = Math.max(py - ip.offsetHeight - 10, 4) + 'px';
    }, gizle() { ip.hidden = true; }
  };
}
function cubukCiz(kap, t, x, y) {
  const SINIR = 30;
  const satir = t.rows.filter(r => r[y] != null).slice(0, SINIR);
  const W = Math.max(kap.clientWidth || 640, 320);
  const etiket = r => String(r[x] ?? '∅');
  const etiketW = Math.min(Math.max(...satir.map(r => etiket(r).length)) * 7 + 12, W * 0.38);
  const sol = etiketW, sag = 24, ust = 8, satirH = 26, cubukH = 16, altH = 26;
  const H = ust + satir.length * satirH + altH;
  const degerler = satir.map(r => r[y]);
  const adim = guzelAdimlar(Math.min(0, ...degerler), Math.max(0, ...degerler));
  const sayiYaz = eksenYazici(adim), lo = adim[0], hi = adim[adim.length - 1], sx = v => sol + (v - lo) / (hi - lo) * (W - sol - sag);
  const kes = s => s.length * 7 > etiketW - 10 ? s.slice(0, Math.max(3, Math.floor((etiketW - 10) / 7) - 1)) + '…' : s;
  let g = adim.map(v => `<line class="g-izgara${v === 0 ? ' sifir' : ''}" x1="${sx(v)}" x2="${sx(v)}" y1="${ust}" y2="${H - altH}"/><text class="g-eksen" x="${sx(v)}" y="${H - 8}" text-anchor="middle">${sayiYaz(v)}</text>`).join('');
  g += satir.map((r, i) => {
    const v = r[y], y0 = ust + i * satirH + (satirH - cubukH) / 2, x0 = sx(Math.min(0, v)), x1 = sx(Math.max(0, v));
    const w = Math.max(x1 - x0, 1), rr = Math.min(4, w / 2), neg = v < 0;
    const yol = neg
      ? `M${x1},${y0} H${x0 + rr} Q${x0},${y0} ${x0},${y0 + rr} V${y0 + cubukH - rr} Q${x0},${y0 + cubukH} ${x0 + rr},${y0 + cubukH} H${x1} Z`
      : `M${x0},${y0} H${x1 - rr} Q${x1},${y0} ${x1},${y0 + rr} V${y0 + cubukH - rr} Q${x1},${y0 + cubukH} ${x1 - rr},${y0 + cubukH} H${x0} Z`;
    return `<g class="g-satir" data-i="${i}"><rect class="g-hedef" x="0" y="${ust + i * satirH}" width="${W}" height="${satirH}"/><text class="g-etiket" x="${sol - 8}" y="${y0 + cubukH / 2 + 4}" text-anchor="end">${svgEsc(kes(etiket(r)))}</text><path class="g-cubuk" d="${yol}"/></g>`;
  }).join('');
  kap.innerHTML = `<svg class="grafik" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${svgEsc(t.columns[y])} çubuk grafiği">${g}</svg>` +
    (t.rows.length > satir.length ? `<div class="kucuk">İlk ${satir.length} satır çiziliyor (toplam ${t.total ?? t.rows.length}). Sorguna sıralama ve LIMIT ekleyerek seçebilirsin.</div>` : '');
  const ip = ipucuKur(kap);
  $$('.g-satir', kap).forEach(el => {
    el.onmouseenter = () => { const r = satir[+el.dataset.i], b = el.querySelector('.g-cubuk').getBBox(); el.classList.add('aktif'); ip.goster(`<b>${svgEsc(etiket(r))}</b><br>${esc(t.columns[y])}: ${tamSayiYaz(r[y])}`, b.x + b.width, b.y); };
    el.onmouseleave = () => { el.classList.remove('aktif'); ip.gizle(); };
  });
}
function cizgiCiz(kap, t, x, y) {
  const sayisalX = sayiSutun(t, x), tarihX = !sayisalX && t.rows.every(r => r[x] == null || tarihGibi(r[x]));
  const xDeger = r => sayisalX ? r[x] : tarihX ? Date.parse(String(r[x]).length === 4 ? r[x] + '-01-01' : String(r[x]).length === 7 ? r[x] + '-01' : String(r[x]).replace(' ', 'T')) : null;
  let nokta = t.rows.map((r, i) => ({ r, xv: sayisalX || tarihX ? xDeger(r) : i, yv: r[y] })).filter(p => p.yv != null && p.xv != null && isFinite(p.xv));
  if (sayisalX || tarihX) nokta.sort((a, b) => a.xv - b.xv);
  const SINIR = 2000, kesildi = nokta.length > SINIR; nokta = nokta.slice(0, SINIR);
  if (nokta.length < 2) { kap.innerHTML = '<div class="bilgi">Çizgi için en az iki nokta gerekiyor.</div>'; return; }
  const W = Math.max(kap.clientWidth || 640, 320), H = 300, sol = 56, sag = 20, ust = 14, alt = 34;
  const ys = guzelAdimlar(Math.min(...nokta.map(p => p.yv)), Math.max(...nokta.map(p => p.yv)));
  const ylo = ys[0], yhi = ys[ys.length - 1], sayiYaz = eksenYazici(ys);
  const xlo = nokta[0].xv, xhi = nokta[nokta.length - 1].xv;
  const xmin = sayisalX || tarihX ? Math.min(...nokta.map(p => p.xv)) : 0, xmax = sayisalX || tarihX ? Math.max(...nokta.map(p => p.xv)) : nokta.length - 1;
  const sx = v => sol + (xmax === xmin ? 0.5 : (v - xmin) / (xmax - xmin)) * (W - sol - sag), sy = v => ust + (1 - (v - ylo) / (yhi - ylo)) * (H - ust - alt);
  const xEtiket = p => sayisalX ? tamSayiYaz(p.r[x]) : String(p.r[x] ?? '∅');
  // X ekseninde en fazla ~6 etiket
  const adet = Math.min(6, nokta.length), xi = [...new Set(Array.from({ length: adet }, (_, k) => Math.round(k * (nokta.length - 1) / (adet - 1 || 1))))];
  let g = ys.map(v => `<line class="g-izgara${v === 0 ? ' sifir' : ''}" x1="${sol}" x2="${W - sag}" y1="${sy(v)}" y2="${sy(v)}"/><text class="g-eksen" x="${sol - 8}" y="${sy(v) + 4}" text-anchor="end">${sayiYaz(v)}</text>`).join('');
  g += xi.map((k, n) => { const p = nokta[k]; return `<text class="g-eksen" x="${sx(p.xv)}" y="${H - 10}" text-anchor="${n === 0 ? 'start' : n === xi.length - 1 ? 'end' : 'middle'}">${svgEsc(xEtiket(p).slice(0, 16))}</text>`; }).join('');
  g += `<path class="g-cizgi" d="${nokta.map((p, i) => (i ? 'L' : 'M') + sx(p.xv).toFixed(1) + ',' + sy(p.yv).toFixed(1)).join(' ')}"/>`;
  if (nokta.length <= 40) g += nokta.map(p => `<circle class="g-nokta-kucuk" cx="${sx(p.xv)}" cy="${sy(p.yv)}" r="2.5"/>`).join('');
  g += `<line class="g-imlec" y1="${ust}" y2="${H - alt}" x1="0" x2="0" visibility="hidden"/><circle class="g-nokta" r="5" visibility="hidden"/><rect class="g-hedef-alan" x="${sol}" y="${ust}" width="${W - sol - sag}" height="${H - ust - alt}"/>`;
  kap.innerHTML = `<svg class="grafik" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${svgEsc(t.columns[y])} çizgi grafiği">${g}</svg>` +
    (kesildi ? `<div class="kucuk">İlk ${SINIR} nokta çiziliyor.</div>` : '');
  const svg = $('svg', kap), imlec = $('.g-imlec', svg), nk = $('.g-nokta', svg), ip = ipucuKur(kap);
  $('.g-hedef-alan', svg).onmousemove = e => {
    const kutu = svg.getBoundingClientRect(), mx = (e.clientX - kutu.left) * W / kutu.width;
    let en = 0, ed = Infinity; nokta.forEach((p, i) => { const d = Math.abs(sx(p.xv) - mx); if (d < ed) { ed = d; en = i; } });
    const p = nokta[en], px = sx(p.xv), py = sy(p.yv);
    imlec.setAttribute('x1', px); imlec.setAttribute('x2', px); imlec.setAttribute('visibility', 'visible');
    nk.setAttribute('cx', px); nk.setAttribute('cy', py); nk.setAttribute('visibility', 'visible');
    ip.goster(`<b>${svgEsc(xEtiket(p))}</b><br>${esc(t.columns[y])}: ${tamSayiYaz(p.yv)}`, px * kutu.width / W, py * kutu.width / W);
  };
  $('.g-hedef-alan', svg).onmouseleave = () => { imlec.setAttribute('visibility', 'hidden'); nk.setAttribute('visibility', 'hidden'); ip.gizle(); };
}
// Başka veritabanlarından (SQL Server, Oracle, PostgreSQL, BigQuery, MySQL) gelen alışkanlıklar için SQLite karşılığı.
// Sadece sorgu hata verdiğinde ve kodda ilgili kalıp varsa gösterilir.
const LEHCE_KURALLARI = [
  [/\bSELECT\s+(DISTINCT\s+)?TOP\b/i, '<code>TOP</code> SQL Server\'a özgü. SQLite\'ta satır sınırı sorgunun <b>sonuna</b> yazılır: <code>SELECT … ORDER BY … LIMIT 10</code>'],
  [/\bFETCH\s+(FIRST|NEXT)\b|\bROWNUM\b/i, 'SQLite\'ta ilk N satır için <code>LIMIT 10</code>, atlamak için <code>LIMIT 10 OFFSET 20</code> kullanılır.'],
  [/\b(GETDATE|NOW|SYSDATE|CURDATE)\s*\(|\bSYSDATE\b/i, 'Bugünün tarihi SQLite\'ta <code>date(\'now\')</code>, saatle birlikte <code>datetime(\'now\')</code>.'],
  [/\bDATE_?DIFF\s*\(/i, 'SQLite\'ta <code>DATEDIFF</code> yok. Gün farkı: <code>julianday(bitis) - julianday(baslangic)</code>'],
  [/\b(DATEADD|DATE_ADD|DATE_SUB|ADD_MONTHS)\s*\(|\bINTERVAL\s+'?\d/i, 'SQLite\'ta tarih eklemek için: <code>date(tarih, \'+7 days\')</code>, <code>date(tarih, \'-1 month\')</code>'],
  [/\b(YEAR|MONTH|DAY|DAYOFWEEK|WEEKDAY|QUARTER)\s*\(|\bEXTRACT\s*\(|\bDATEPART\s*\(/i, 'SQLite\'ta tarih parçası <code>strftime</code> ile alınır: yıl <code>strftime(\'%Y\', tarih)</code>, ay <code>strftime(\'%m\', tarih)</code> (sonuç metindir; sayı gerekiyorsa <code>CAST(… AS INTEGER)</code>).'],
  [/\b(DATE_TRUNC|TRUNC|DATEFROMPARTS|EOMONTH)\s*\(/i, 'Ay başı SQLite\'ta <code>date(tarih, \'start of month\')</code>, yıl başı <code>date(tarih, \'start of year\')</code>.'],
  [/\b(ISNULL|NVL|NVL2)\s*\(/i, 'Boş değer yerine başka değer: SQLite\'ta <code>COALESCE(sutun, 0)</code> ya da <code>IFNULL(sutun, 0)</code>.'],
  [/\bLEN\s*\(/i, 'SQLite\'ta metin uzunluğu <code>LENGTH(metin)</code>.'],
  [/\b(CHARINDEX|LOCATE|STRPOS)\s*\(|\bPOSITION\s*\(/i, 'Metin içinde arama SQLite\'ta <code>INSTR(metin, \'aranan\')</code> (bulamazsa 0 döner).'],
  [/\b(LEFT|RIGHT)\s*\(/i, 'SQLite\'ta <code>LEFT</code>/<code>RIGHT</code> fonksiyonu yok: baştan <code>SUBSTR(metin, 1, 3)</code>, sondan <code>SUBSTR(metin, -3)</code>.'],
  [/\bILIKE\b/i, 'SQLite\'ta <code>ILIKE</code> yok; <code>LIKE</code> zaten büyük/küçük harfe duyarsız (Türkçe İ/ı hariç).'],
  [/\bQUALIFY\b/i, 'SQLite\'ta <code>QUALIFY</code> yok. Window function\'ı bir CTE ya da alt sorguda hesapla, dışarıda <code>WHERE</code> ile filtrele.'],
  [/\bCONVERT\s*\(|::\s*\w+/i, 'Tür dönüştürme SQLite\'ta <code>CAST(sutun AS INTEGER)</code>, <code>CAST(sutun AS REAL)</code>, <code>CAST(sutun AS TEXT)</code>.'],
  [/\b(LISTAGG|ARRAY_AGG)\s*\(/i, 'Değerleri birleştirmek SQLite\'ta <code>GROUP_CONCAT(sutun, \', \')</code>.'],
];
function lehceIpucu(kod, hata) {
  const temiz = String(kod || '').replace(/--[^\n]*/g, ' ').replace(/'(?:[^']|'')*'/g, "''");
  const bulunan = LEHCE_KURALLARI.filter(([re]) => re.test(temiz)).map(([, m]) => m);
  if (/no such column/i.test(hata || '') && /"[^"]*"\s*=|=\s*"[^"]*"/.test(kod || '')) bulunan.push('Metin değerleri SQLite\'ta tek tırnakla yazılır: <code>WHERE sehir = \'İzmir\'</code>. Çift tırnak sütun adı demektir.');
  return bulunan.length ? bulunan : null;
}
const lehceHTML = r => r.ipucu ? `<div class="lehce-ipucu"><b>SQLite'ta farklı yazılıyor olabilir</b><ul>${r.ipucu.map(m => `<li>${m}</li>`).join('')}</ul><a href="#konu/sql-lehce-farklari">Lehçe farkları konusunu aç →</a></div>` : '';
// ctx = { kod, dil }: verilirse tablonun altında Grafik ve Excel'e indir düğmeleri çıkar.
function ciktiHTML(r, ctx) {
  if (!r) return '';
  let h = '';
  if (r.stdout) h += `<div class="konsol"><div class="konsol-baslik">print çıktısı</div><pre>${esc(r.stdout)}</pre></div>`;
  if (!r.ok) h += `<div class="hata-kutu"><b>Hata</b><pre>${esc(r.error)}</pre></div>` + lehceHTML(r);
  else if (r.table) h += tabloHTML(r.table) + (ctx && r.table.rows.length ? ciktiAracHTML(r.table, ctx) : '');
  else if (r.mesaj) h += `<div class="bilgi">${esc(r.mesaj)}</div>`;
  if (r.ms !== undefined && r.ok) h += `<div class="sure">${r.ms} ms</div>`;
  return h;
}
function mdLite(s) {
  let h = esc(s);
  h = h.replace(/```(?:\w+)?\n?([\s\S]*?)```/g, (_, c) => `<pre class="kod-blok"><code>${c}</code></pre>`);
  h = h.replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  h = h.split(/\n{2,}/).map(p => /^\s*[-•*] /m.test(p) && !p.includes('<pre') ? '<ul>' + p.split('\n').filter(Boolean).map(l => `<li>${l.replace(/^\s*[-•*] /, '')}</li>`).join('') + '</ul>' : p.includes('<pre') ? p : `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  return h;
}

// ═══════════════ Editör ═══════════════
let aktifEditor = null;
function editorKur(host, { deger = '', dil = 'sql', calistir: onRun, degisti, yukseklik = 200, yerTutucu = '' }) {
  host.innerHTML = `<div class="editor" style="--h:${yukseklik}px"><pre class="gutter" aria-hidden="true"></pre><textarea spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-label="${dil === 'sql' ? 'SQL sorgusu' : 'Python kodu'}"></textarea></div>`;
  const ta = $('textarea', host), gut = $('.gutter', host);
  const guncelle = () => { const n = ta.value.split('\n').length; gut.textContent = Array.from({ length: n }, (_, i) => i + 1).join('\n'); gut.scrollTop = ta.scrollTop; };
  const ekle = t => { ta.focus(); if (!document.execCommand('insertText', false, t)) { ta.setRangeText(t, ta.selectionStart, ta.selectionEnd, 'end'); } guncelle(); degisti && degisti(ta.value); };
  ta.value = deger; ta.placeholder = yerTutucu; guncelle();
  ta.addEventListener('input', () => { guncelle(); degisti && degisti(ta.value); });
  ta.addEventListener('scroll', () => { gut.scrollTop = ta.scrollTop; });
  ta.addEventListener('focus', () => { aktifEditor = api; });
  ta.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onRun && onRun(); return; }
    if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); ekle('    '); return; }
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault(); const bas = ta.value.lastIndexOf('\n', ta.selectionStart - 1) + 1;
      const bosluk = (ta.value.slice(bas).match(/^ {1,4}/) || [''])[0].length;
      if (bosluk) { const s = ta.selectionStart; ta.setSelectionRange(bas, bas + bosluk); document.execCommand('delete') || ta.setRangeText('', bas, bas + bosluk); ta.setSelectionRange(Math.max(bas, s - bosluk), Math.max(bas, s - bosluk)); guncelle(); }
      return;
    }
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
      const bas = ta.value.lastIndexOf('\n', ta.selectionStart - 1) + 1;
      const satir = ta.value.slice(bas, ta.selectionStart);
      let girinti = (satir.match(/^\s*/) || [''])[0];
      if (dil === 'python' && /:\s*$/.test(satir)) girinti += '    ';
      if (girinti) { e.preventDefault(); ekle('\n' + girinti); }
    }
  });
  const api = { get: () => ta.value, set: v => { ta.value = v; guncelle(); degisti && degisti(v); }, ekle, odak: () => ta.focus(), dil };
  aktifEditor = api;
  return api;
}

// ═══════════════ Şema paneli ═══════════════
function semaHTML(dil) {
  const vs = VS[S.veriSeti];
  const pyTip = dil === 'python' && pyYukluVS === S.veriSeti;
  return `<div class="sema-baslik"><span>Tablolar</span><span class="kucuk">${dil === 'python' ? 'DataFrame olarak hazır' : 'SQLite'}</span></div>` +
    Object.entries(metaAl(S.veriSeti)).map(([ad, t]) => `<details class="sema-tablo" open><summary><button class="ekle-btn tablo-ad" data-ekle="${esc(ad)}" title="Editöre ekle">${esc(ad)}</button><span class="kucuk">${t.n} satır</span></summary><ul>${t.columns.map((c, i) => {
      const tip = pyTip ? ((pyTipler[ad] || []).find(x => x[0] === c) || [, ''])[1] : t.types[i];
      return `<li><button class="ekle-btn" data-ekle="${esc(c)}" title="Editöre ekle">${esc(c)}</button><span class="tip">${esc(String(tip || '').toLowerCase())}</span></li>`;
    }).join('')}</ul></details>`).join('') + `<p class="kucuk sema-not">İsme tıklayınca imlecin olduğu yere eklenir.${dil === 'python' ? ' Tarih sütunları datetime tipinde gelir.' : ''}</p>`;
}
document.addEventListener('click', e => { const b = e.target.closest('.ekle-btn'); if (b && aktifEditor) { e.preventDefault(); aktifEditor.ekle(b.dataset.ekle); } });

// ═══════════════ Üst bar ═══════════════
// Alıştırmalar listesinin üstündeki ilerleme: seçili veri setinde SQL ve Python için ayrı ayrı çözülen / toplam.
function ilerlemeHTML(vs) {
  const satir = d => {
    const l = vs.sorular.filter(q => q.dil === d);
    if (!l.length) return '';
    const coz = l.filter(q => depo.cozuldu[q.id]), bak = coz.filter(q => depo.bakarak[q.id]).length;
    const yuzde = Math.round(100 * coz.length / l.length);
    return `<div class="ilerleme-satir" title="${bak ? `${bak} tanesi cevaba bakarak çözüldü` : ''}"><span class="ilerleme-ad dil-${d}">${DIL[d]}</span><span class="ilerleme-cubuk" aria-hidden="true"><span style="width:${yuzde}%"></span></span><span class="ilerleme-sayi"><b>${coz.length}</b>/${l.length}</span></div>`;
  };
  return `<div class="ilerleme" aria-label="Bu veri setinde çözdüğün sorular">${satir('sql')}${satir('python')}</div>`;
}
function ilerlemeMetni() {
  const qs = VS[S.veriSeti] ? VS[S.veriSeti].sorular : [];
  const say = d => { const l = qs.filter(q => q.dil === d); return `${l.filter(q => depo.cozuldu[q.id]).length}/${l.length}`; };
  return `SQL ${say('sql')} · Python ${say('python')}`;
}
function ustCiz() {
  document.body.dataset.lab = S.lab;
  const konu = S.lab === 'konu';
  $('#marka').innerHTML = `<span class="marka-aktif">${konu ? 'KonuLab' : 'SorguLab'}</span><button class="marka-gec" id="labGec" type="button" aria-label="${konu ? 'SorguLab' : 'KonuLab'} bölümüne geç"><span class="ok" aria-hidden="true">⇄</span><span class="diger">${konu ? 'SorguLab' : 'KonuLab'}</span></button>`;
  $('#labGec').onclick = () => konu ? git(S.view) : konuGit(S.konuId);
  $$('#konuDil .seg-btn').forEach(b => b.setAttribute('aria-selected', String(b.dataset.kdil === S.konuDil)));
  $$('.nav-btn').forEach(b => b.setAttribute('aria-current', b.dataset.view === S.view ? 'page' : 'false'));
  const sel = $('#vsSec');
  sel.innerHTML = HAZIR.map(k => `<option value="${k}">${esc(VS[k].ad)}</option>`).join('') + (VS.yuklenen ? `<option value="yuklenen">${esc(VS.yuklenen.ad)}</option>` : '');
  sel.value = S.veriSeti;
  pyDurumAyarla(pyDurum);
  const ai = $('#aiBtn'); if (ai) { ai.textContent = 'Yapay zekâ: ' + aiDurumMetni(); ai.dataset.durum = aiTur() ? 'hazir' : 'yok'; }
}
$('#vsSec').addEventListener('change', e => { veriSetiDegistir(e.target.value); });
// ─── Onay penceresi (tarayıcının confirm'ü bazı ortamlarda engellenir) ───
function onayIste(baslik, metin, evet = 'Evet', hayir = 'Vazgeç') {
  return new Promise(ok => {
    let d = $('#onayDialog');
    if (!d) { d = document.createElement('dialog'); d.id = 'onayDialog'; d.className = 'ai-dialog onay'; document.body.appendChild(d); }
    d.innerHTML = `<div class="yedek-ic"><h2>${esc(baslik)}</h2><p class="tg-metin">${metin}</p>
      <div class="yedek-dugmeler" style="justify-content:flex-end"><button class="btn" id="onayHayir" type="button">${esc(hayir)}</button><button class="btn birincil" id="onayEvet" type="button">${esc(evet)}</button></div></div>`;
    let sonuc = false;
    $('#onayEvet', d).onclick = () => { sonuc = true; d.close(); };
    $('#onayHayir', d).onclick = () => d.close();
    d.onclose = () => ok(sonuc);
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    setTimeout(() => $('#onayHayir', d).focus(), 20);
  });
}
// Devam eden kod mülakatı varken veri seti değişecekse önce sor. true: geçilebilir.
async function mulakatBirakilsinMi(k) {
  if (k === S.veriSeti || !S.mulakat || S.mulakat.durum !== 'devam') return true;
  const M = S.mulakat, kalan = Math.max(0, M.bitis - Date.now());
  const ok = await onayIste('Mülakat devam ediyor', `<b>${esc(VS[S.veriSeti].ad)}</b> verisiyle başladığın kod mülakatı sürüyor (${M.sorular.length} soru, kalan süre ${sureYaz(kalan)}). Veri setini değiştirirsen mülakat yarıda biter ve kaydedilmez.`, 'Mülakatı bırak, veri setini değiştir', 'Mülakata devam et');
  if (ok) { S.mulakat = null; clearInterval(sayacInterval); sayacInterval = null; }
  return ok;
}
async function veriSetiDegistir(k) {
  if (!(await mulakatBirakilsinMi(k))) { const sel = $('#vsSec'); if (sel) sel.value = S.veriSeti; return false; }
  S.veriSeti = k; S.mulakat = null; S.filtre.kategori = ''; S.filtre.kaynak = ''; S.serbestKod = varsayilanKod(k); veriHazirla(k).catch(() => { }); yenidenCiz();
  return true;
}
// ─── Mülakat kaydı: sayfa yenilense ya da kapanıp açılsa da yarım mülakat kaybolmasın ───
const MULAKAT_KEY = 'sorgulab-mulakat';
function mulakatKaydet() {
  try {
    const M = S.mulakat, T = S.teorik;
    if (!M && !T) { localStorage.removeItem(MULAKAT_KEY); return; }
    localStorage.setItem(MULAKAT_KEY, JSON.stringify({ veriSeti: M ? M.veriSeti : null, mulakat: M ? { ...M, sorular: M.sorular.map(q => q.id) } : null, teorik: T || null }));
  } catch (e) { }
}
setInterval(mulakatKaydet, 2000);
window.addEventListener('pagehide', mulakatKaydet);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') mulakatKaydet(); });
function mulakatGeriYukle(sadeceYuklenen) {
  let k; try { k = JSON.parse(localStorage.getItem(MULAKAT_KEY) || 'null'); } catch (e) { return; }
  if (!k) return;
  if (k.teorik && !sadeceYuklenen && !S.teorik) S.teorik = k.teorik;
  const m = k.mulakat;
  if (!m || S.mulakat || !VS[k.veriSeti] || (k.veriSeti === 'yuklenen') !== !!sadeceYuklenen) return;
  const sorular = m.sorular.map(id => VS[k.veriSeti].sorular.find(q => q.id === id));
  if (sorular.some(q => !q)) return;
  S.veriSeti = k.veriSeti; S.serbestKod = varsayilanKod(k.veriSeti); veriHazirla(k.veriSeti).catch(() => { });
  S.mulakat = { ...m, sorular };
}
$$('.nav-btn').forEach(b => b.addEventListener('click', () => git(b.dataset.view)));
$('#aiBtn').addEventListener('click', aiPanelAc);

$('#tanitimBtn').addEventListener('click', () => tanitimAc(true));
$$('#konuDil .seg-btn').forEach(b => b.addEventListener('click', () => { S.konuDil = b.dataset.kdil; const k = KONU_OZET.find(x => x.dil === S.konuDil); konuGit(k ? k.id : 'yakinda'); }));
const VIEWLER = ['alistirma', 'tahmin', 'mulakat', 'serbest', 'veri'];
function git(v) { if (location.hash !== '#' + v) location.hash = v; else { S.lab = 'sorgu'; S.view = v; yenidenCiz(); } }
function hashOku() {
  const v = location.hash.slice(1);
  if (v === 'konu' || v.startsWith('konu/')) { S.lab = 'konu'; const id = decodeURIComponent(v.slice(5)); if (id) S.konuId = id; return true; }
  if (VIEWLER.includes(v)) { S.lab = 'sorgu'; S.view = v; return true; }
  return false;
}
window.addEventListener('hashchange', () => { if (hashOku()) { yenidenCiz(); if (S.lab === 'konu') window.scrollTo(0, 0); } });
let sayacInterval = null;
// Ziyaretçi sayacı: sadece sorgulab.com sürümünde yüklenir. Sayfa adı olarak bölüm, veri seti ve KonuLab konusu gönderilir (soru içeriği ya da kişisel bilgi değil).
let sonSayilan = null;
window.sayfaSay = function () {
  if (S.lab === 'konu' && (typeof KONULAR === 'undefined' || !KONULAR)) return;
  const yol = S.lab === 'konu' ? '/konulab/' + (S.konuId || 'giris') : '/sorgulab/' + S.view + (['alistirma', 'serbest', 'mulakat'].includes(S.view) ? '/' + (S.veriSeti === 'yuklenen' ? 'kendi-verisi' : S.veriSeti) : '');
  if (yol === sonSayilan || !window.goatcounter || !window.goatcounter.count) return;
  sonSayilan = yol;
  try { window.goatcounter.count({ path: yol, title: document.title }); } catch (e) { }
};
function yenidenCiz() {
  if (sayacInterval && !(S.view === 'mulakat' && S.mulakat && S.mulakat.durum === 'devam')) { clearInterval(sayacInterval); sayacInterval = null; }
  ustCiz();
  const ana = $('#ana');
  ana.dataset.view = S.lab === 'konu' ? 'konu' : S.view;
  setTimeout(window.sayfaSay, 0);
  if (S.lab === 'konu') return konuCiz();
  ({ alistirma: alistirmaCiz, tahmin: tahminCiz, mulakat: mulakatCiz, serbest: serbestCiz, veri: veriCiz })[S.view]();
}

// ═══════════════ ALIŞTIRMALAR ═══════════════
function filtreliSorular() {
  const vs = VS[S.veriSeti]; const f = S.filtre;
  return vs.sorular.filter(q => q.dil === f.dil && (q.kaynak || '') === (f.kaynak || '') && (!f.seviye || q.seviye === f.seviye) && (!f.kategori || q.kategori === f.kategori))
    .sort((a, b) => f.kaynak ? (a.sira || 0) - (b.sira || 0) : a.seviye - b.seviye);
}
function alistirmaCiz() {
  const vs = VS[S.veriSeti];
  const ana = $('#ana');
  if (!vs.sorular.length) { ana.innerHTML = bosSoruHTML(); bosSoruBagla(); return; }
  if (!vs.sorular.some(q => q.dil === S.filtre.dil)) S.filtre.dil = vs.sorular[0].dil;
  const kaynaklar = [...new Set(vs.sorular.filter(q => q.dil === S.filtre.dil && q.kaynak).map(q => q.kaynak))];
  if (S.filtre.kaynak && !kaynaklar.includes(S.filtre.kaynak)) { S.filtre.kaynak = ''; S.filtre.kategori = ''; }
  const liste = filtreliSorular();
  const kategoriler = [...new Set(vs.sorular.filter(q => q.dil === S.filtre.dil && (q.kaynak || '') === (S.filtre.kaynak || '')).map(q => q.kategori))];
  if (S.filtre.kategori && !kategoriler.includes(S.filtre.kategori)) S.filtre.kategori = '';
  let aktif = liste.find(q => q.id === S.aktifId[S.veriSeti]) || liste[0];
  if (aktif) S.aktifId[S.veriSeti] = aktif.id;
  ana.innerHTML = `
  <div class="uc-kolon">
    <aside class="soru-liste" aria-label="Soru listesi">
      <div class="seg" role="tablist">${['sql', 'python'].map(d => `<button role="tab" class="seg-btn dil-${d}" aria-selected="${S.filtre.dil === d}" data-dil="${d}">${DIL[d]}</button>`).join('')}</div>
      ${ilerlemeHTML(vs)}
      <div class="filtreler">
        <div class="chipler">${[0, 1, 2, 3].map(l => `<button class="chip ${S.filtre.seviye === l ? 'secili' : ''}" data-seviye="${l}">${l ? SEVIYE[l] : 'Tümü'}</button>`).join('')}</div>
        <label class="gizli" for="katSec">Kategori</label>
        <select id="katSec"><option value="">Tüm kategoriler</option>${kategoriler.map(k => `<option ${S.filtre.kategori === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select>
      </div>
      <ol class="sorular">${liste.map((q, i) => `<li><button class="soru-satir ${aktif && q.id === aktif.id ? 'aktif' : ''}" data-id="${q.id}">
        <span class="no">${depo.cozuldu[q.id] ? tikHTML(q.id) : i + 1}</span>
        <span class="ad">${esc(q.baslik)}<span class="kat">${esc(q.kategori)}</span></span>
        <span class="sev sev-${q.seviye}">${SEVIYE[q.seviye]}</span></button></li>`).join('') || '<li class="kucuk bos-not">Bu filtreye uyan soru yok.</li>'}</ol>
    </aside>
    <section class="calisma" id="calisma"></section>
    <aside class="sema" id="sema">${semaHTML(S.filtre.dil)}</aside>
  </div>`;
  $$('.seg-btn', ana).forEach(b => b.onclick = () => { S.filtre.dil = b.dataset.dil; S.filtre.kategori = ''; if (b.dataset.dil === 'python') pyVeriHazirla(S.veriSeti).then(() => { const s = $('#sema'); if (s && S.view === 'alistirma') s.innerHTML = semaHTML('python'); }).catch(() => { }); alistirmaCiz(); });
  $$('.chip[data-seviye]', ana).forEach(b => b.onclick = () => { S.filtre.seviye = +b.dataset.seviye; alistirmaCiz(); });
  $('#katSec').onchange = e => { S.filtre.kategori = e.target.value; alistirmaCiz(); };
  $$('.soru-satir', ana).forEach(b => b.onclick = () => soruSec(b.dataset.id));
  if (aktif) soruCalismaCiz($('#calisma'), aktif, { mod: 'alistirma', liste });
}
// Soru seçimi: sayfanın tamamını yeniden çizmeden sadece çalışma alanını günceller,
// böylece listenin ve sayfanın kaydırma konumu korunur.
const azHareket = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function listedeGoster(kap, el) {
  if (!kap || !el) return;
  const k = kap.getBoundingClientRect(), r = el.getBoundingClientRect();
  if (r.top < k.top) kap.scrollTop -= (k.top - r.top) + 8;
  else if (r.bottom > k.bottom) kap.scrollTop += (r.bottom - k.bottom) + 8;
}
function calismaAlaninaGit(c) {
  if (!c) return;
  const dar = window.matchMedia('(max-width: 820px)').matches;
  const top = c.getBoundingClientRect().top;
  if (dar || top < 0) window.scrollTo({ top: Math.max(0, window.scrollY + top - 80), behavior: azHareket() ? 'auto' : 'smooth' });
}
function soruSec(id) {
  const liste = filtreliSorular();
  const q = liste.find(x => x.id === id);
  const c = $('#calisma');
  if (!q || !c) { S.aktifId[S.veriSeti] = id; return alistirmaCiz(); }
  S.aktifId[S.veriSeti] = id;
  $$('.soru-satir').forEach(b => b.classList.toggle('aktif', b.dataset.id === id));
  soruCalismaCiz(c, q, { mod: 'alistirma', liste });
  listedeGoster($('.soru-liste'), $(`.soru-satir[data-id="${id}"]`));
  calismaAlaninaGit(c);
}

// Tek bir sorunun çalışma alanı (alıştırma + mülakat ortak)
function soruCalismaCiz(host, q, { mod, liste, onKontrol }) {
  const mulakat = mod === 'mulakat';
  const idx = liste ? liste.findIndex(x => x.id === q.id) : -1;
  const yerTutucu = q.dil === 'sql' ? '-- Sorgunu buraya yaz' : '# Cevabını sonuc değişkenine ata\nsonuc = ...';
  // Eski sürümde başlangıç yazısı editöre gerçek metin olarak konuyordu; değiştirilmemiş eski taslaklar boş sayılır.
  const ESKI_BASLANGIC = ['-- Sorgunu buraya yaz\n', '# Cevabını sonuc değişkenine ata\nsonuc = '];
  let ilkKod = (mulakat ? S.mulakat.kod[q.id] : depo.taslak[q.id]) ?? '';
  if (ESKI_BASLANGIC.includes(ilkKod)) ilkKod = '';
  host.innerHTML = `
    <div class="soru-kart">
      <div class="rozetler"><span class="rozet dil-${q.dil}">${DIL[q.dil]}</span><span class="rozet sev-${q.seviye}">${SEVIYE[q.seviye]}</span><span class="rozet">${esc(q.kategori)}</span>${q.sirali ? '<span class="rozet uyari">Sıralama önemli</span>' : ''}${konuBul(q) ? `<a class="konu-oku" href="#konu/${konuBul(q).id}">Konuyu oku →</a>` : ''}</div>
      <h2>${esc(q.baslik)}</h2>
      <div class="soru-metni">${q.soru}</div>
      <details class="beklenen"${mulakat || q.seviye === 3 ? '' : ' open'}><summary>Beklenen çıktı${mulakat || q.seviye === 3 ? ' <span class="kucuk soluk-not">(bakmadan denemek için kapalı)</span>' : ''}</summary><div id="beklenen" class="beklenen-ic">${q.dil === 'python' && pyDurum !== 'hazir' ? pyBekleHTML() : '<div class="yukleniyor">Hesaplanıyor…</div>'}</div></details>
    </div>
    <div class="editor-alan">
      <div id="ed"></div>
      <div class="arac-cubugu">
        <button class="btn birincil" id="btnCalistir">Çalıştır <kbd>Ctrl</kbd><kbd>Enter</kbd></button>
        <button class="btn vurgu" id="btnKontrol">Kontrol et</button>
        ${mulakat ? '' : `<span class="ayrac"></span>
        <button class="btn hafif" id="btnIpucu">İpucu</button>
        <button class="btn hafif" id="btnCevap">Cevabı göster</button>
        <button class="btn hafif" id="btnNeden">Neden böyle?</button>`}
      </div>
    </div>
    <div id="karar"></div>
    <div id="ekKutular"></div>
    <div class="cikti" id="cikti"><div class="cikti-bos">Çıktın burada görünecek. Önce <b>Çalıştır</b> ile sonucu gör, emin olunca <b>Kontrol et</b>.</div></div>
    ${!mulakat && liste ? `<div class="gezinme">
      <button class="btn hafif" id="onceki" ${idx <= 0 ? 'disabled' : ''}>← Önceki soru</button>
      <button class="btn hafif" id="sonraki" ${idx < 0 || idx >= liste.length - 1 ? 'disabled' : ''}>Sonraki soru →</button></div>` : ''}`;
  const taslakKey = (mulakat ? 'm_' : '') + q.id;
  const ed = editorKur($('#ed', host), {
    deger: ilkKod, yerTutucu, dil: q.dil, calistir: () => calistirTik(),
    degisti: v => { if (mulakat) S.mulakat.kod[q.id] = v; else { depo.taslak[q.id] = v; kaydetGecikmeli(); } }
  });
  let sonCikti = null;
  beklenenAl(q).then(r => {
    const b = $('#beklenen', host); if (!b) return;
    if (!r.ok) b.innerHTML = `<div class="hata-kutu">Beklenen çıktı hesaplanamadı: ${esc(r.error)}</div>`;
    else b.innerHTML = tabloHTML(r.table, 8);
  }).catch(e => { const b = $('#beklenen', host); if (b) b.innerHTML = hataHTML(e); });

  async function calistirTik() {
    const c = $('#cikti', host);
    if (!ed.get().trim()) { c.innerHTML = `<div class="bilgi">Editör boş. Önce ${q.dil === 'sql' ? 'sorgunu' : 'kodunu'} yaz.</div>`; return null; }
    c.innerHTML = q.dil === 'python' && pyDurum !== 'hazir' ? pyBekleHTML() : calisiyorHTML();
    await bekle(16);
    try { const kod = ed.get(); sonCikti = await calistir(q.dil, kod, true); c.innerHTML = ciktiHTML(sonCikti, { kod, dil: q.dil, baslik: q.baslik }); }
    catch (e) { c.innerHTML = hataHTML(e); }
    return sonCikti;
  }
  async function kontrolTik() {
    const k = $('#karar', host);
    if (!ed.get().trim()) { k.innerHTML = `<div class="bilgi">Editör boş. Önce ${q.dil === 'sql' ? 'sorgunu' : 'kodunu'} yaz, sonra kontrol et.</div>`; return; }
    k.innerHTML = '<div class="yukleniyor">Kontrol ediliyor…</div>';
    const [bek, gel] = await Promise.all([beklenenAl(q), calistirTik()]);
    let sonuc;
    if (!gel || !gel.ok) sonuc = { dogru: false, mesaj: 'Kodun hata verdi. Aşağıdaki hata mesajına bak.' };
    else if (!bek.ok) sonuc = { dogru: false, mesaj: 'Beklenen çıktı hesaplanamadığı için kontrol yapılamadı.' };
    else sonuc = karsilastir(bek.table, gel.table, q.sirali);
    if (sonuc.dogru && !mulakat) {
      // Cevaba bakarak çözülen soru soluk işaretlenir; daha önce kendi çözdüğün bir soru bu yüzden geri düşmez.
      if (!bakildi[q.id]) delete depo.bakarak[q.id];
      else if (!depo.cozuldu[q.id] || depo.bakarak[q.id]) depo.bakarak[q.id] = true;
      depo.cozuldu[q.id] = true; kaydet(); ustCiz();
      const li = $(`.soru-satir[data-id="${q.id}"] .no`); if (li) li.innerHTML = tikHTML(q.id);
      const il = $('.ilerleme'); if (il && VS[S.veriSeti]) il.outerHTML = ilerlemeHTML(VS[S.veriSeti]);
    }
    k.innerHTML = `<div class="karar ${sonuc.dogru ? 'dogru' : 'yanlis'}" role="status"><span class="karar-ikon" aria-hidden="true">${sonuc.dogru ? '✓' : '✕'}</span><div>${sonuc.mesaj}
      ${!sonuc.dogru && !mulakat ? `<div><button class="btn kucuk-btn" id="btnHata">${aiAd()} hatamı açıklasın</button></div>` : ''}</div></div>`;
    const hb = $('#btnHata', host); if (hb) hb.onclick = () => hataAcikla(q, ed.get(), gel, bek, sonuc);
    onKontrol && onKontrol(sonuc.dogru);
  }
  function kutu(id, baslik, ic) {
    const ek = $('#ekKutular', host);
    let el = $('#' + id, ek);
    if (!el) { el = document.createElement('div'); el.id = id; el.className = 'ek-kutu ' + id; ek.appendChild(el); }
    el.innerHTML = `<div class="ek-baslik">${baslik}</div>${ic}`;
    return el;
  }
  function cevapGoster() {
    bakildi[q.id] = true;
    const el = kutu('kCevap', 'Örnek çözüm', kodBlok(q.cozum, q.dil) + '<button class="btn kucuk-btn" data-kopyala>Editöre aktar</button>');
    $('[data-kopyala]', el).onclick = () => { ed.set(q.cozum); ed.odak(); };
  }
  $('#btnCalistir', host).onclick = calistirTik;
  $('#btnKontrol', host).onclick = kontrolTik;
  if (!mulakat) {
    $('#btnIpucu', host).onclick = () => kutu('kIpucu', 'İpucu', `<p>${q.ipucu || 'Bu soru için ipucu yok.'}</p>`);
    $('#btnCevap', host).onclick = cevapGoster;
    $('#btnNeden', host).onclick = () => { cevapGoster(); kutu('kNeden', 'Neden böyle yazıldı?', `<div class="aciklama">${q.aciklama || '<p>Açıklama yok.</p>'}</div>`); };
    const o = $('#onceki', host), s = $('#sonraki', host);
    if (o) o.onclick = () => soruSec(liste[idx - 1].id);
    if (s) s.onclick = () => soruSec(liste[idx + 1].id);
  }
  return { ed };
}
let kaydetT = null;
function kaydetGecikmeli() { clearTimeout(kaydetT); kaydetT = setTimeout(kaydet, 600); }

function tabloOzet(t, n = 8) {
  if (!t || !t.columns) return '(tablo yok)';
  return [t.columns.join(' | '), ...t.rows.slice(0, n).map(r => r.map(v => v === null ? 'NULL' : typeof v === 'number' && !Number.isInteger(v) ? +v.toFixed(4) : v).join(' | '))].join('\n') + `\n(${t.total ?? t.rows.length} satır × ${t.columns.length} sütun)`;
}
function semaOzet() {
  return Object.entries(metaAl(S.veriSeti)).map(([ad, t]) => `${ad}(${t.columns.map((c, i) => `${c} ${t.types[i]}`).join(', ')}) — ${t.n} satır`).join('\n');
}
async function hataAcikla(q, kod, gel, bek, sonuc) {
  const el = document.createElement('div');
  el.className = 'ek-kutu kClaude';
  if (!aiTur()) { aiPanelAc(); return; }
  el.innerHTML = '<div class="ek-baslik">' + aiIyelik() + ' yorumu</div><div class="claude-metin"><div class="yukleniyor">Kodun inceleniyor…</div></div>';
  const ek = $('#ekKutular'); const eski = $('.kClaude', ek); if (eski) eski.remove(); ek.prepend(el);
  const hedef = $('.claude-metin', el);
  const prompt = `Sen sabırlı bir veri analizi eğitmenisin. Öğrencin bir ${q.dil === 'sql' ? 'SQL (SQLite)' : 'Python (pandas)'} alıştırmasında yanlış cevap verdi. Türkçe, kısa ve öğretici bir geri bildirim ver:
- Kodundaki asıl hatayı ya da eksik düşünceyi açıkça söyle (neden yanlış sonuç ürettiğini).
- Doğru yöne götüren 1-2 somut ipucu ver.
- Tam çözümü YAZMA. En fazla tek satırlık küçük bir parça gösterebilirsin.
- En fazla 150 kelime. Markdown olarak sadece **kalın**, \`kod\` ve - madde kullan.

Tablolar:
${semaOzet()}
${q.dil === 'python' ? 'Python\'da her tablo aynı isimle bir DataFrame; sonuç `sonuc` değişkeninden okunur.' : ''}

Soru: ${metin(q.soru)}
${q.sirali ? '(Bu soruda satır sırası önemli.)' : ''}

Beklenen çıktı (ilk satırlar):
${bek && bek.ok ? tabloOzet(bek.table) : '-'}

Öğrencinin kodu:
${kod}

Öğrencinin çıktısı:
${gel && gel.ok ? tabloOzet(gel.table) : 'HATA: ' + (gel ? gel.error : '-')}

Otomatik kontrolün mesajı: ${metin(sonuc.mesaj)}`;
  try { const r = await aiSor(prompt, { onText: ({ text }) => { hedef.innerHTML = mdLite(text); } }); hedef.innerHTML = mdLite(r.text); }
  catch (e) { hedef.innerHTML = `<div class="hata-kutu">${esc(aiHata(e))}</div>`; }
}

// ═══════════════ TAHMİN ET ═══════════════
function tahminCiz() {
  const ana = $('#ana');
  const liste = TAHMINLER.filter(t => t.dil === S.tahminDil);
  let t = liste.find(x => x.id === S.tahminId) || liste[0];
  S.tahminId = t.id;
  const dogruSay = TAHMINLER.filter(x => depo.tahmin[x.id] === true).length;
  // İlk tahmin sayaçta kalır; ilk tahmini yanlış olup sonra doğru bilinen soru listede gri – ile gösterilir.
  const tahminIsaret = id => depo.tahmin[id] === true ? '<span class="tik">✓</span>'
    : depo.tahmin[id] === false ? (depo.tahminSonra[id] ? '<span class="tik bakarak" title="İlk tahmin yanlış, sonra doğru bildin" aria-label="ilk tahmin yanlış, sonra doğru bilindi">–</span>' : '<span class="carpi">✕</span>') : null;
  const cevaplanan = Object.keys(depo.tahmin).length;
  ana.innerHTML = `
  <div class="iki-kolon">
    <aside class="soru-liste">
      <div class="seg" role="tablist">${['sql', 'python'].map(d => `<button role="tab" class="seg-btn dil-${d}" aria-selected="${S.tahminDil === d}" data-dil="${d}">${DIL[d]}</button>`).join('')}</div>
      <p class="kucuk liste-not">Kodu çalıştırmadan, sonucunu tahmin et. Küçük, kendi içinde verisi olan örnekler. Doğru tahmin: <b>${dogruSay}/${TAHMINLER.length}</b>${cevaplanan ? '<button class="sifirla-btn" id="tSifirla" type="button" title="Baştan başla" aria-label="Tahminleri sıfırla, baştan başla"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M20 12a8 8 0 1 1-2.34-5.66"/><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M20 4v5h-5"/></svg></button>' : ''}</p>
      <ol class="sorular">${liste.map((x, i) => `<li><button class="soru-satir ${x.id === t.id ? 'aktif' : ''}" data-id="${x.id}">
        <span class="no">${tahminIsaret(x.id) || i + 1}</span>
        <span class="ad">${esc(x.konu)}</span></button></li>`).join('')}</ol>
    </aside>
    <section class="calisma">
      <div class="soru-kart">
        <div class="rozetler"><span class="rozet dil-${t.dil}">${DIL[t.dil]}</span><span class="rozet">${esc(t.konu)}</span></div>
        <h2>Bu kod ne döndürür?</h2>
        ${kodBlok(t.kod, t.dil)}
        <div class="soru-metni">${t.soru}</div>
        <div class="secenekler" role="group" aria-label="Seçenekler">${t.secenekler.map((s, i) => `<button class="secenek" data-i="${i}"><span class="harf">${'ABCD'[i]}</span>${esc(s)}</button>`).join('')}</div>
      </div>
      <div id="tahminSonuc"></div>
      <div class="gezinme"><button class="btn hafif" id="tOnceki" ${liste.indexOf(t) <= 0 ? 'disabled' : ''}>← Önceki</button><button class="btn hafif" id="tSonraki" ${liste.indexOf(t) >= liste.length - 1 ? 'disabled' : ''}>Sonraki →</button></div>
    </section>
  </div>`;
  $$('.seg-btn', ana).forEach(b => b.onclick = () => { S.tahminDil = b.dataset.dil; S.tahminId = null; tahminCiz(); });
  const tahminSec = id => {
    const ls = $('.soru-liste'), y = ls ? ls.scrollTop : 0, sy = window.scrollY;
    S.tahminId = id; tahminCiz();
    const ls2 = $('.soru-liste'); if (ls2) ls2.scrollTop = y;
    window.scrollTo(0, sy);
    listedeGoster(ls2, $(`.soru-satir[data-id="${id}"]`));
    calismaAlaninaGit($('#ana .calisma'));
  };
  $$('.soru-satir', ana).forEach(b => b.onclick = () => tahminSec(b.dataset.id));
  const sf = $('#tSifirla');
  if (sf) sf.onclick = async () => {
    if (!(await onayIste('Baştan başla', `Tahmin Et'teki ${cevaplanan} cevabın ve sayaç sıfırlanacak; bütün sorular cevaplanmamış hale gelecek.`, 'Sıfırla', 'Vazgeç'))) return;
    depo.tahmin = {}; depo.tahminSonra = {}; kaydet(); tahminCiz();
  };
  const i = liste.indexOf(t);
  $('#tOnceki').onclick = () => tahminSec(liste[i - 1].id);
  $('#tSonraki').onclick = () => tahminSec(liste[i + 1].id);
  $$('.secenek', ana).forEach(b => b.onclick = async () => {
    const sec = +b.dataset.i, dogru = sec === t.dogru;
    if (depo.tahmin[t.id] === undefined) { depo.tahmin[t.id] = dogru; kaydet(); }
    else if (depo.tahmin[t.id] === false && dogru && !depo.tahminSonra[t.id]) { depo.tahminSonra[t.id] = true; kaydet(); }
    $$('.secenek', ana).forEach(x => { x.disabled = true; const k = +x.dataset.i; if (k === t.dogru) x.classList.add('dogru'); else if (k === sec) x.classList.add('yanlis'); });
    const s = $('#tahminSonuc');
    s.innerHTML = `<div class="karar ${dogru ? 'dogru' : 'yanlis'}"><span class="karar-ikon">${dogru ? '✓' : '✕'}</span><div>${dogru ? 'Doğru tahmin!' : `Doğru cevap: <b>${esc(t.secenekler[t.dogru])}</b>`}</div></div>
      <div class="ek-kutu"><div class="ek-baslik">Neden?</div><div class="aciklama">${t.aciklama}</div></div>
      <div class="ek-kutu"><div class="ek-baslik">Kodu çalıştırınca gerçek çıktı</div><div id="tCikti">${t.dil === 'python' && pyDurum !== 'hazir' ? pyBekleHTML() : calisiyorHTML()}</div></div>`;
    await bekle(16);
    try { const r = await calistir(t.dil, t.kod, true); const c = $('#tCikti'); if (c) c.innerHTML = ciktiHTML(r); }
    catch (e) { const c = $('#tCikti'); if (c) c.innerHTML = hataHTML(e); }
    const li = $(`.soru-satir[data-id="${t.id}"] .no`); if (li) li.innerHTML = tahminIsaret(t.id);
    // İlk cevaptan sonra sayaç ve "Baştan başla" düğmesi hemen görünsün
    if (!$('#tSifirla') || TAHMINLER.filter(x => depo.tahmin[x.id] === true).length !== dogruSay) { const ls = $('.soru-liste'), y = ls ? ls.scrollTop : 0, sy = window.scrollY, sonuc = $('#tahminSonuc').innerHTML, secHTML = $('.secenekler').innerHTML; tahminCiz(); $('.secenekler').innerHTML = secHTML; $('#tahminSonuc').innerHTML = sonuc; const ls2 = $('.soru-liste'); if (ls2) ls2.scrollTop = y; window.scrollTo(0, sy); }
  });
}

// ═══════════════ MÜLAKAT ═══════════════
function mulakatCiz() {
  const ana = $('#ana');
  if (S.mulakat && S.mulakat.durum === 'devam') return kodMulakatCiz();
  if (S.mulakat && S.mulakat.durum === 'bitti') return kodSonucCiz();
  if (S.teorik && S.teorik.durum === 'devam') return teorikCiz();
  if (S.teorik && S.teorik.durum === 'bitti') return teorikSonucCiz();
  const sorular = VS[S.veriSeti].sorular;
  ana.innerHTML = `
  <div class="mulakat-giris">
    <div class="giris-baslik"><h1>Mülakat provası</h1><p>İki farklı mod var. Kod mülakatında süre işler ve ipucu yoktur. Teorik mülakatta test soruları ve açık uçlu sorular gelir.</p></div>
    <div class="mod-kartlar">
      <form class="mod-kart" id="kodForm">
        <div class="mod-ust"><span class="mod-etiket">Mod 1</span><h2>Kod mülakatı</h2><p>Kolaydan zora sıralı sorular, süre sınırı, sonunda karne. Sorular <b>${esc(VS[S.veriSeti].ad)}</b> verisinden.</p></div>
        <fieldset><legend>Dil</legend><div class="radyo">${[['sql', 'SQL'], ['python', 'Python'], ['karisik', 'Karışık']].map(([v, l], i) => `<label><input type="radio" name="dil" value="${v}" ${i === 0 ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>
        <fieldset><legend>Soru sayısı</legend><div class="radyo">${[3, 5, 8].map(n => `<label><input type="radio" name="n" value="${n}" ${n === 5 ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div></fieldset>
        <fieldset><legend>Süre</legend><div class="radyo">${[15, 25, 40].map(n => `<label><input type="radio" name="sure" value="${n}" ${n === 25 ? 'checked' : ''}><span>${n} dk</span></label>`).join('')}</div></fieldset>
        <button class="btn birincil genis" type="submit" ${sorular.length ? '' : 'disabled'}>Kod mülakatını başlat</button>
        ${sorular.length ? '' : '<p class="kucuk">Bu veri seti için henüz soru yok. Veri sekmesinden soru üretebilirsin.</p>'}
      </form>
      <form class="mod-kart" id="teoForm">
        <div class="mod-ust"><span class="mod-etiket">Mod 2</span><h2>Teorik mülakat</h2><p>Kavram soruları: test soruları anında puanlanır. Açık uçlu sorularda cevabını yazarsın, ${aiTur() ? aiAd() + ' değerlendirir' : 'anahtar noktalarla karşılaştırırsın (yapay zekâ bağlarsan değerlendirme de alırsın)'}.</p></div>
        <fieldset><legend>Alan</legend><div class="radyo">${[['karisik', 'Karışık'], ['sql', 'SQL'], ['python', 'Python'], ['genel', 'Analitik']].map(([v, l], i) => `<label><input type="radio" name="alan" value="${v}" ${i === 0 ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>
        <fieldset><legend>İçerik</legend><div class="radyo">${[['ikisi', 'Test + açık uçlu'], ['test', 'Sadece test'], ['acik', 'Sadece açık uçlu']].map(([v, l], i) => `<label><input type="radio" name="tur" value="${v}" ${i === 0 ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>
        <button class="btn birincil genis" type="submit">Teorik mülakatı başlat</button>
      </form>
    </div>
  </div>`;
  $('#kodForm').onsubmit = e => {
    e.preventDefault(); const f = new FormData(e.target);
    const dil = f.get('dil'), n = +f.get('n'), dk = +f.get('sure');
    const genel = sorular.filter(q => !q.kaynak);
    let havuz = genel.filter(q => dil === 'karisik' || q.dil === dil);
    if (!havuz.length) havuz = genel;
    const plan = n <= 3 ? [1, 2, 3] : n <= 5 ? [1, 2, 2, 3, 3] : [1, 1, 2, 2, 2, 3, 3, 3];
    const secilen = [], kul = new Set();
    for (const l of plan) { const c = karistir(havuz.filter(q => q.seviye === l && !kul.has(q.id)))[0] || karistir(havuz.filter(q => !kul.has(q.id)))[0]; if (c) { secilen.push(c); kul.add(c.id); } }
    secilen.sort((a, b) => a.seviye - b.seviye);
    if (secilen.some(q => q.dil === 'python')) pyHazirla().catch(() => { });
    S.mulakat = { durum: 'devam', veriSeti: S.veriSeti, sorular: secilen, i: 0, sonuc: {}, kod: {}, bitis: Date.now() + dk * 60000, baslangic: Date.now(), dk };
    mulakatCiz();
  };
  $('#teoForm').onsubmit = e => {
    e.preventDefault(); const f = new FormData(e.target);
    const alan = f.get('alan'), tur = f.get('tur');
    const uy = x => alan === 'karisik' || x.alan === alan;
    const test = tur === 'acik' ? [] : karistir(TEORIK_TEST.filter(uy)).slice(0, 8);
    const acik = tur === 'test' ? [] : karistir(TEORIK_ACIK.filter(uy)).slice(0, tur === 'acik' ? 4 : 2);
    S.teorik = { durum: 'devam', sorular: [...test.map(x => ({ ...x, tip: 'test' })), ...acik.map(x => ({ ...x, tip: 'acik' }))], i: 0, cevap: {} };
    mulakatCiz();
  };
}
function sureYaz(ms) { const s = Math.max(0, Math.round(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
function kodMulakatCiz() {
  const M = S.mulakat, q = M.sorular[M.i], ana = $('#ana');
  ana.innerHTML = `
  <div class="mulakat-ust">
    <div class="ilerleme-noktalar">${M.sorular.map((x, k) => `<button class="nokta ${k === M.i ? 'aktif' : ''} ${M.sonuc[x.id] === true ? 'ok' : M.sonuc[x.id] === false ? 'hayir' : ''}" data-k="${k}" aria-label="Soru ${k + 1}">${k + 1}</button>`).join('')}</div>
    <div class="sayac" id="sayac" aria-live="off">${sureYaz(M.bitis - Date.now())}</div>
    <button class="btn hafif" id="bitir">Mülakatı bitir</button>
  </div>
  <div class="iki-kolon mulakat-govde"><section class="calisma" id="calisma"></section><aside class="sema" id="sema">${semaHTML(q.dil)}</aside></div>
  <div class="gezinme"><button class="btn hafif" id="mOnceki" ${M.i === 0 ? 'disabled' : ''}>← Önceki</button><button class="btn" id="mSonraki">${M.i === M.sorular.length - 1 ? 'Bitir ve karneyi gör' : 'Sonraki soru →'}</button></div>`;
  soruCalismaCiz($('#calisma'), q, { mod: 'mulakat', onKontrol: d => { if (M.sonuc[q.id] !== true) M.sonuc[q.id] = d; const n = $(`.nokta[data-k="${M.i}"]`); if (n) { n.classList.toggle('ok', M.sonuc[q.id] === true); n.classList.toggle('hayir', M.sonuc[q.id] === false); } } });
  $$('.nokta', ana).forEach(b => b.onclick = () => { M.i = +b.dataset.k; kodMulakatCiz(); });
  $('#mOnceki').onclick = () => { M.i--; kodMulakatCiz(); };
  $('#mSonraki').onclick = () => { if (M.i === M.sorular.length - 1) mulakatBitir(); else { M.i++; kodMulakatCiz(); } };
  $('#bitir').onclick = mulakatBitir;
  clearInterval(sayacInterval);
  sayacInterval = setInterval(() => { const kalan = M.bitis - Date.now(); const el = $('#sayac'); if (el) { el.textContent = sureYaz(kalan); el.classList.toggle('az', kalan < 120000); } if (kalan <= 0) mulakatBitir(true); }, 500);
}
function mulakatBitir(sureDoldu) {
  const M = S.mulakat; if (!M || M.durum !== 'devam') return;
  clearInterval(sayacInterval); sayacInterval = null;
  M.durum = 'bitti'; M.gecen = Math.min(Date.now(), M.bitis) - M.baslangic; M.sureDoldu = !!sureDoldu;
  M.sorular.forEach(q => { if (M.sonuc[q.id] === true) { depo.cozuldu[q.id] = true; delete depo.bakarak[q.id]; } }); kaydet();
  mulakatCiz();
}
function kodSonucCiz() {
  const M = S.mulakat, ana = $('#ana');
  const dogru = M.sorular.filter(q => M.sonuc[q.id] === true).length;
  const kat = {};
  M.sorular.forEach(q => { kat[q.kategori] = kat[q.kategori] || [0, 0]; kat[q.kategori][1]++; if (M.sonuc[q.id] === true) kat[q.kategori][0]++; });
  const oran = dogru / M.sorular.length;
  ana.innerHTML = `
  <div class="karne">
    <div class="karne-ust">
      <div><span class="mod-etiket">Kod mülakatı karnesi</span><h1>${dogru} / ${M.sorular.length} doğru</h1>
      <p>${M.sureDoldu ? 'Süre doldu. ' : ''}Geçen süre: <b>${sureYaz(M.gecen)}</b> / ${M.dk} dk. ${oran === 1 ? 'Tüm sorular doğru, harika iş.' : oran >= 0.6 ? 'İyi bir sonuç. Kaçırdığın soruların açıklamalarına bak.' : 'Zorlandığın konuları Alıştırmalar\'dan tekrar etmek iyi olur.'}</p></div>
      <div class="karne-skor" style="--oran:${oran}"><span>%${Math.round(oran * 100)}</span></div>
    </div>
    <div class="kat-ozet">${Object.entries(kat).map(([k, [a, b]]) => `<span class="chip ${a === b ? 'ok' : a === 0 ? 'hayir' : ''}">${esc(k)} <b>${a}/${b}</b></span>`).join('')}</div>
    <div class="karne-liste">${M.sorular.map((q, k) => `
      <details class="karne-satir ${M.sonuc[q.id] === true ? 'ok' : M.sonuc[q.id] === false ? 'hayir' : 'bos'}">
        <summary><span class="durum-ikon">${M.sonuc[q.id] === true ? '✓' : M.sonuc[q.id] === false ? '✕' : '–'}</span><span class="ad">${k + 1}. ${esc(q.baslik)}</span><span class="rozet dil-${q.dil}">${DIL[q.dil]}</span><span class="sev sev-${q.seviye}">${SEVIYE[q.seviye]}</span><span class="kucuk">${M.sonuc[q.id] === undefined ? 'kontrol edilmedi' : ''}</span></summary>
        <div class="karne-detay"><div class="soru-metni">${q.soru}</div>
          ${M.kod[q.id] ? `<div class="ek-baslik">Senin cevabın</div>${kodBlok(M.kod[q.id], q.dil)}` : ''}
          <div class="ek-baslik">Örnek çözüm</div>${kodBlok(q.cozum, q.dil)}
          <div class="ek-baslik">Neden böyle?</div><div class="aciklama">${q.aciklama}</div></div>
      </details>`).join('')}</div>
    <div class="gezinme"><button class="btn" id="yeniM">Yeni mülakat</button><button class="btn hafif" id="alistirmaGit">Alıştırmalara dön</button></div>
  </div>`;
  $('#yeniM').onclick = () => { S.mulakat = null; mulakatCiz(); };
  $('#alistirmaGit').onclick = () => { S.mulakat = null; git('alistirma'); };
}
function teorikCiz() {
  const T = S.teorik, q = T.sorular[T.i], ana = $('#ana'), c = T.cevap[q.id];
  const alanAd = { sql: 'SQL', python: 'Python', genel: 'Analitik düşünme' }[q.alan];
  ana.innerHTML = `
  <div class="teorik">
    <div class="mulakat-ust"><div class="ilerleme-noktalar">${T.sorular.map((x, k) => `<button class="nokta ${k === T.i ? 'aktif' : ''} ${T.cevap[x.id] ? (T.cevap[x.id].dogru === true || (T.cevap[x.id].puan ?? 0) >= 6 ? 'ok' : T.cevap[x.id].dogru === false || T.cevap[x.id].puan !== undefined ? 'hayir' : 'cevap') : ''}" data-k="${k}" aria-label="Soru ${k + 1}">${k + 1}</button>`).join('')}</div>
    <span class="kucuk">${q.tip === 'test' ? 'Test sorusu' : 'Açık uçlu'} · ${alanAd}</span><button class="btn hafif" id="tBitir">Bitir</button></div>
    <div class="soru-kart teorik-kart">
      <h2>${esc(q.soru)}</h2>
      ${q.tip === 'test' ? `<div class="secenekler dikey">${q.secenekler.map((s, i) => `<button class="secenek ${c ? (i === q.dogru ? 'dogru' : i === c.sec ? 'yanlis' : '') : ''}" data-i="${i}" ${c ? 'disabled' : ''}><span class="harf">${'ABCD'[i]}</span>${esc(s)}</button>`).join('')}</div>
        ${c ? `<div class="karar ${c.dogru ? 'dogru' : 'yanlis'}"><span class="karar-ikon">${c.dogru ? '✓' : '✕'}</span><div>${c.dogru ? 'Doğru.' : 'Yanlış.'} ${esc(q.aciklama)}</div></div>` : ''}`
      : `<label class="gizli" for="acikCevap">Cevabın</label><textarea id="acikCevap" class="acik-cevap" placeholder="Cevabını mülakattaymış gibi yaz. Madde madde de yazabilirsin.">${esc(c ? c.metin : '')}</textarea>
        <div class="arac-cubugu"><button class="btn birincil" id="degerlendir">${aiAd()} değerlendirsin</button><button class="btn hafif" id="anahtar">Anahtar noktaları göster</button></div>
        <div id="degerSonuc">${c && c.puan !== undefined ? degerHTML(c) : ''}</div>
        <div id="anahtarKutu">${c && c.anahtarAcik ? anahtarHTML(q) : ''}</div>`}
    </div>
    <div class="gezinme"><button class="btn hafif" id="tOnc" ${T.i === 0 ? 'disabled' : ''}>← Önceki</button><button class="btn" id="tSon">${T.i === T.sorular.length - 1 ? 'Bitir ve sonucu gör' : 'Sonraki →'}</button></div>
  </div>`;
  $$('.nokta', ana).forEach(b => b.onclick = () => { acikKaydet(); T.i = +b.dataset.k; teorikCiz(); });
  $('#tOnc').onclick = () => { acikKaydet(); T.i--; teorikCiz(); };
  $('#tSon').onclick = () => { acikKaydet(); if (T.i === T.sorular.length - 1) { T.durum = 'bitti'; teorikSonucCiz(); } else { T.i++; teorikCiz(); } };
  $('#tBitir').onclick = () => { acikKaydet(); T.durum = 'bitti'; teorikSonucCiz(); };
  function acikKaydet() { const ta = $('#acikCevap'); if (ta) { T.cevap[q.id] = Object.assign(T.cevap[q.id] || {}, { metin: ta.value }); } }
  if (q.tip === 'test') $$('.secenek', ana).forEach(b => b.onclick = () => { const sec = +b.dataset.i; T.cevap[q.id] = { sec, dogru: sec === q.dogru }; teorikCiz(); });
  else {
    $('#anahtar').onclick = () => { acikKaydet(); T.cevap[q.id].anahtarAcik = true; $('#anahtarKutu').innerHTML = anahtarHTML(q); };
    const d = $('#degerlendir');
    if (d) d.onclick = async () => {
      if (!aiTur()) { aiPanelAc(); return; }
      acikKaydet(); const cevap = T.cevap[q.id].metin.trim();
      if (cevap.length < 15) { $('#degerSonuc').innerHTML = '<div class="bilgi">Değerlendirme için biraz daha uzun bir cevap yaz.</div>'; return; }
      d.disabled = true; $('#degerSonuc').innerHTML = `<div class="yukleniyor">${aiAd()} cevabını değerlendiriyor…</div>`;
      try {
        const r = await aiJson(`Bir veri analisti mülakatında adayın cevabını değerlendiren deneyimli bir mülakatçısın. Türkçe yanıt ver.
Soru: ${q.soru}
Değerlendirme için anahtar noktalar (rubrik): ${q.anahtar.map(a => '- ' + a).join('\n')}
Adayın cevabı:
"""${cevap}"""

0-10 arası puan ver (anahtar noktaların kapsamı, doğruluk, netlik, iş bağlamı). Adil ama talepkar ol. Yanlış bir bilgi varsa açıkça belirt.
Sadece şu JSON\'u döndür: {"puan": sayı, "ozet": "1-2 cümle genel değerlendirme", "guclu": ["..."], "eksik": ["eksik ya da hatalı noktalar"], "ornek_cumle": "cevabı güçlendirecek, mülakatta söylenebilecek tek bir örnek cümle"}`);
        T.cevap[q.id] = Object.assign(T.cevap[q.id], { puan: Math.max(0, Math.min(10, +r.puan || 0)), ozet: r.ozet, guclu: r.guclu || [], eksik: r.eksik || [], ornek: r.ornek_cumle });
        $('#degerSonuc').innerHTML = degerHTML(T.cevap[q.id]);
        const n = $(`.nokta[data-k="${T.i}"]`); if (n) n.classList.add(T.cevap[q.id].puan >= 6 ? 'ok' : 'hayir');
      } catch (e) { $('#degerSonuc').innerHTML = `<div class="hata-kutu">${esc(aiHata(e))}</div>`; }
      d.disabled = false;
    };
  }
}
function degerHTML(c) {
  return `<div class="deger"><div class="deger-puan ${c.puan >= 7 ? 'iyi' : c.puan >= 5 ? 'orta' : 'zayif'}"><b>${c.puan}</b><span>/10</span></div><div>
    <p>${esc(c.ozet || '')}</p>
    ${c.guclu.length ? `<div class="ek-baslik">Güçlü yanlar</div><ul>${c.guclu.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${c.eksik.length ? `<div class="ek-baslik">Eksik / geliştirilecek</div><ul>${c.eksik.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${c.ornek ? `<div class="ek-baslik">Şöyle de söyleyebilirsin</div><p class="alinti">${esc(c.ornek)}</p>` : ''}</div></div>`;
}
const anahtarHTML = q => `<div class="ek-kutu"><div class="ek-baslik">İyi bir cevapta olması gerekenler</div><ul>${q.anahtar.map(a => `<li>${esc(a)}</li>`).join('')}</ul></div>`;
function teorikSonucCiz() {
  const T = S.teorik, ana = $('#ana');
  const test = T.sorular.filter(q => q.tip === 'test'), acik = T.sorular.filter(q => q.tip === 'acik');
  const td = test.filter(q => T.cevap[q.id] && T.cevap[q.id].dogru).length;
  const puanlar = acik.map(q => T.cevap[q.id] && T.cevap[q.id].puan).filter(p => p !== undefined);
  ana.innerHTML = `
  <div class="karne">
    <div class="karne-ust"><div><span class="mod-etiket">Teorik mülakat sonucu</span>
      <h1>${test.length ? `Test: ${td} / ${test.length}` : ''}${test.length && acik.length ? ' · ' : ''}${acik.length ? `Açık uçlu: ${puanlar.length ? (puanlar.reduce((a, b) => a + b, 0) / puanlar.length).toFixed(1) + ' / 10' : 'puanlanmadı'}` : ''}</h1>
      <p>Aşağıda her sorunun doğru cevabı ve açıklaması var.</p></div></div>
    <div class="karne-liste">${T.sorular.map((q, k) => {
      const c = T.cevap[q.id];
      const ok = q.tip === 'test' ? c && c.dogru : c && c.puan >= 6;
      const durum = !c || (q.tip === 'acik' && c.puan === undefined) ? 'bos' : ok ? 'ok' : 'hayir';
      return `<details class="karne-satir ${durum}"><summary><span class="durum-ikon">${durum === 'ok' ? '✓' : durum === 'hayir' ? '✕' : '–'}</span><span class="ad">${k + 1}. ${esc(q.soru)}</span>${q.tip === 'acik' && c && c.puan !== undefined ? `<b>${c.puan}/10</b>` : ''}</summary>
      <div class="karne-detay">${q.tip === 'test' ? `<p>Doğru cevap: <b>${esc(q.secenekler[q.dogru])}</b>${c && !c.dogru ? `<br><span class="kucuk">Senin cevabın: ${esc(q.secenekler[c.sec])}</span>` : ''}</p><p>${esc(q.aciklama)}</p>`
        : `${c && c.metin ? `<div class="ek-baslik">Senin cevabın</div><p class="alinti">${esc(c.metin)}</p>` : ''}${c && c.puan !== undefined ? degerHTML(c) : ''}${anahtarHTML(q)}`}</div></details>`;
    }).join('')}</div>
    <div class="gezinme"><button class="btn" id="yeniT">Yeni teorik mülakat</button></div>
  </div>`;
  $('#yeniT').onclick = () => { S.teorik = null; mulakatCiz(); };
}

// ═══════════════ SERBEST ALAN ═══════════════
function serbestCiz() {
  const ana = $('#ana'), d = S.serbestDil, vs = VS[S.veriSeti];
  const gecmisBu = S.gecmis.filter(g => g.dil === d && g.vs === S.veriSeti);
  const ilkTablo = Object.keys(metaAl(S.veriSeti))[0];
  if (!S.serbestKod) S.serbestKod = varsayilanKod(S.veriSeti);
  const ornek = vs.ornekler ? vs.ornekler[d] : (d === 'sql' ? [['İlk 20 satır', `SELECT *\nFROM "${ilkTablo}"\nLIMIT 20;`], ['Satır sayısı', `SELECT COUNT(*) FROM "${ilkTablo}";`]] : [['İlk 10 satır', `${ilkTablo}.head(10)`], ['Özet', `${ilkTablo}.describe()`], ['Eksik değerler', `${ilkTablo}.isnull().sum()`]]);
  ana.innerHTML = `
  <div class="iki-kolon serbest">
    <section class="calisma">
      <div class="serbest-ust">
        <div class="seg" role="tablist">${['sql', 'python'].map(x => `<button role="tab" class="seg-btn dil-${x}" aria-selected="${d === x}" data-dil="${x}">${DIL[x]}</button>`).join('')}</div>
        <div class="ornekler"><span class="kucuk">Hazır:</span>${ornek.map(([a], i) => `<button class="chip" data-o="${i}">${esc(a)}</button>`).join('')}</div>
      </div>
      <div class="editor-alan"><div id="ed"></div>
        <div class="arac-cubugu"><button class="btn birincil" id="sCalistir">Çalıştır <kbd>Ctrl</kbd><kbd>Enter</kbd></button>
        ${d === 'sql' ? '<button class="btn hafif" id="sSifirla" title="CREATE/UPDATE/DELETE ile yaptığın değişiklikleri geri alır">Veriyi sıfırla</button>' : '<button class="btn hafif" id="sSifirla" title="Tanımladığın değişkenleri siler, tabloları orijinal haline döndürür">Sıfırla</button><span class="kucuk">Değişkenlerin ve tablolarda yaptığın değişiklikler sonraki çalıştırmalarda da durur.</span>'}</div></div>
      <div class="cikti" id="cikti"><div class="cikti-bos">Serbest alan: istediğin sorguyu yaz, sonucu gör. Burada kontrol yok, sadece keşif.</div></div>
      ${gecmisBu.length ? `<div class="gecmis"><div class="ek-baslik">Son çalıştırdıkların</div><ul>${gecmisBu.slice(0, 8).map(g => `<li><button class="gecmis-btn" data-g="${S.gecmis.indexOf(g)}"><code>${esc(g.kod.replace(/\s+/g, ' ').slice(0, 90))}</code></button></li>`).join('')}</ul></div>` : ''}
    </section>
    <aside class="sema" id="sema">${semaHTML(d)}</aside>
  </div>`;
  const ed = editorKur($('#ed'), { deger: S.serbestKod[d], dil: d, yukseklik: 240, calistir: () => run(), degisti: v => { S.serbestKod[d] = v; } });
  async function run() {
    const c = $('#cikti'); c.innerHTML = d === 'python' && pyDurum !== 'hazir' ? pyBekleHTML() : calisiyorHTML();
    await bekle(16);
    try {
      const kod = ed.get(); const r = await calistir(d, kod, false); c.innerHTML = ciktiHTML(r, { kod, dil: d });
      const k = ed.get().trim(); if (k) { S.gecmis = [{ dil: d, vs: S.veriSeti, kod: k }, ...S.gecmis.filter(g => !(g.dil === d && g.vs === S.veriSeti && g.kod === k))].slice(0, 60); }
      if (d === 'python') { const s = $('#sema'); if (s) s.innerHTML = semaHTML('python'); }
    } catch (e) { c.innerHTML = hataHTML(e); }
  }
  $('#sCalistir').onclick = run;
  const sf = $('#sSifirla'); if (sf) sf.onclick = async () => {
    if (d === 'sql') { await sqlHazirla(); await motor('sifirla', [S.veriSeti]); $('#cikti').innerHTML = '<div class="bilgi">Veri orijinal haline döndü.</div>'; }
    else { if (pyHazirP) { await pyHazirla(); await motor('pySifirla', []); } $('#cikti').innerHTML = '<div class="bilgi">Python sıfırlandı: değişkenler silindi, tablolar orijinal haline döndü.</div>'; }
  };
  $$('.seg-btn', ana).forEach(b => b.onclick = () => { S.serbestDil = b.dataset.dil; if (b.dataset.dil === 'python') pyHazirla().catch(() => { }); serbestCiz(); });
  $$('.chip[data-o]', ana).forEach(b => b.onclick = () => { ed.set(ornek[+b.dataset.o][1]); run(); });
  $$('.gecmis-btn', ana).forEach(b => b.onclick = () => { ed.set(S.gecmis[+b.dataset.g].kod); ed.odak(); });
}

// ═══════════════ VERİ ═══════════════
function bosSoruHTML() {
  return `<div class="bos-durum"><h2>${esc(VS[S.veriSeti].ad)} için henüz soru yok</h2>
    <p>Yüklediğin veriyle Serbest Alan\'da hemen sorgu yazabilirsin. Alıştırma ve mülakat soruları için yapay zekâ (claude.ai'de Claude, diğer yerlerde Gemini) bu veriye özel, kolaydan zora sorular üretebilir.</p>
    <div class="arac-cubugu"><button class="btn birincil" data-git="veri">Soru üret</button><button class="btn hafif" data-git="serbest">Serbest Alan\'a git</button></div></div>`;
}
function bosSoruBagla() { $$('[data-git]').forEach(b => b.onclick = () => git(b.dataset.git)); }
function veriCiz() {
  const ana = $('#ana'), Y = VS.yuklenen;
  ana.innerHTML = `
  <div class="veri-sayfa">
    <div class="veri-kartlar">
      ${HAZIR.map(hazirKartHTML).join('')}
      <article class="veri-kart ${S.veriSeti === 'yuklenen' ? 'secili' : ''}">
        <div class="mod-ust"><span class="mod-etiket">Kendi verin</span><h2>${Y ? esc(Y.ad) : 'Excel ya da CSV yükle'}</h2>
        <p>${Y ? `${Object.keys(Y.tablolar).length} tablo yüklendi. Her sayfa ayrı bir tablo oldu.${Y.kayitli ? ' Veri bu cihazda kayıtlı: sayfayı yenilesen ya da uygulamayı kapatıp açsan da burada olacak.' : Y.kayitli === false ? ' Veri bu tarayıcıya kaydedilemedi (gizli sekme ya da yer yetersiz olabilir), sayfayı yenileyince tekrar yüklemen gerekir.' : ''}` : 'Excel\'deki her sayfa ayrı bir tabloya dönüşür. İlk satır sütun adı olarak okunur. Veri sadece bu cihazda, tarayıcının içinde saklanır, hiçbir yere gönderilmez. Sayfayı yenilesen de kalır.'}</p></div>
        <label class="birak" id="birak" tabindex="0"><input type="file" id="dosya" accept=".xlsx,.xls,.csv,.tsv,.txt,.xlsm" hidden>
          <span class="birak-ic"><b>${Y ? 'Başka bir dosya yükle' : 'Dosyayı buraya bırak'}</b><span class="kucuk">ya da tıklayıp seç · .xlsx, .xls, .csv</span></span></label>
        <p class="kucuk" style="margin:6px 0 0;color:var(--soluk)"><i>* Her sayfanın ilk satırında sütun adları olduğundan emin ol. Başlık satırı yoksa ilk veri satırı sütun adı sanılır.</i></p>
        <div id="yukDurum"></div>
        ${Y ? `<ul class="tablo-ozet">${Object.entries(Y.tablolar).map(([a, t]) => `<li><code>${esc(a)}</code><span>${t.columns.length} sütun · ${t.rows.length} satır</span></li>`).join('')}</ul>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${S.veriSeti === 'yuklenen' ? '<span class="aktif-etiket">Şu an bu veriyle çalışıyorsun</span>' : '<button class="btn" data-vs="yuklenen">Bu veriyle çalış</button>'}<button class="btn hafif" id="veriSil" type="button">Veriyi sil</button></div>
          <p class="kucuk" style="margin:6px 0 0;color:var(--soluk)"><i>* Yeni bir dosya yüklersen bu veri ve ona özel ürettiğin sorular silinir. Aynı anda tek bir kendi veri setin saklanır.</i></p>` : ''}
      </article>
    </div>
    ${Y && S.veriSeti === 'yuklenen' ? uretPanelHTML() : ''}
    ${Y ? `<section class="onizleme"><h2>Yüklenen tablolar</h2>${Object.entries(Y.tablolar).map(([a, t], i) => onizlemeHTML(a, t, i === 0)).join('')}</section>` : ''}
  </div>`;
  $$('[data-vs]', ana).forEach(b => b.onclick = () => veriSetiDegistir(b.dataset.vs));
  const sil = $('#veriSil'); if (sil) sil.onclick = async () => { if (await onayIste('Veriyi sil', 'Yüklediğin veri ve ona özel ürettiğin sorular bu cihazdan silinsin mi?', 'Sil', 'Vazgeç')) yukleneniSil(); };
  const inp = $('#dosya'), bir = $('#birak');
  inp.onchange = () => inp.files[0] && dosyaYukle(inp.files[0]);
  bir.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } });
  bir.addEventListener('dragover', e => { e.preventDefault(); bir.classList.add('ustunde'); });
  bir.addEventListener('dragleave', () => bir.classList.remove('ustunde'));
  bir.addEventListener('drop', e => { e.preventDefault(); bir.classList.remove('ustunde'); const f = e.dataTransfer.files[0]; if (f) dosyaYukle(f); });
  const u = $('#uretForm'); if (u) u.onsubmit = e => { e.preventDefault(); const f = new FormData(u); soruUret(f.get('dil'), +f.get('adet')); };
}
const ONIZLEME_SATIR = 200;
function onizlemeHTML(ad, t, acik) {
  const n = Math.min(t.rows.length, ONIZLEME_SATIR);
  return `<details class="onizleme-tablo" ${acik ? 'open' : ''}>
    <summary><code>${esc(ad)}</code><span class="kucuk">${t.rows.length} satır × ${t.columns.length} sütun</span></summary>
    <div class="onizleme-kap" tabindex="0" aria-label="${esc(ad)} tablosu önizlemesi">
      <table class="sonuc"><thead><tr>${t.columns.map((c, i) => `<th>${esc(c)}<span class="th-tip">${esc(t.types[i].toLowerCase())}</span></th>`).join('')}</tr></thead>
      <tbody>${t.rows.slice(0, n).map(r => `<tr>${r.map(v => hucre(v)).join('')}</tr>`).join('')}</tbody></table>
    </div>
    <div class="tablo-alt">${t.rows.length > n ? `İlk ${n} satır gösteriliyor. Tamamı için Serbest Alan\'da sorgu yazabilirsin.` : 'Tüm satırlar gösteriliyor.'} Tablo kutusunun içinde yana ve aşağı kaydırabilirsin.</div>
  </details>`;
}
function soruSayisiMetni(sorular) {
  const sql = sorular.filter(q => q.dil === 'sql' && !q.kaynak).length;
  const pd = sorular.filter(q => q.dil === 'python' && q.kategori !== 'NumPy').length;
  const np = sorular.filter(q => q.kategori === 'NumPy').length;
  const parca = [sql && `${sql} SQL`, pd && `${pd} Python (pandas)`, np && `${np} NumPy`].filter(Boolean);
  const kay = {};
  sorular.filter(q => q.kaynak).forEach(q => { kay[q.kaynak] = (kay[q.kaynak] || 0) + 1; });
  return parca.join(' + ') + ' sorusu hazır.' + Object.entries(kay).map(([k, n]) => ` Ayrıca ${n} ${esc(KAYNAK_AD[k] || k)} sorusu.`).join('');
}
function hazirKartHTML(key) {
  const v = VS[key], m = metaAl(key);
  return `<article class="veri-kart ${S.veriSeti === key ? 'secili' : ''}">
        <div class="mod-ust"><span class="mod-etiket">${esc(v.etiket || 'Hazır veri')}</span><h2>${esc(v.ad)}</h2>
        <p>${esc(v.aciklama || '')}</p></div>
        <ul class="tablo-ozet">${Object.entries(m).map(([a, t]) => `<li><code>${esc(a)}</code><span>${t.columns.length} sütun · ${t.n} satır</span></li>`).join('')}</ul>
        <p class="kucuk">${soruSayisiMetni(v.sorular)}</p>
        ${S.veriSeti === key ? '<span class="aktif-etiket">Şu an bu veriyle çalışıyorsun</span>' : `<button class="btn" data-vs="${key}">Bu veriyle çalış</button>`}
      </article>`;
}
function uretPanelHTML() {
  const Y = VS.yuklenen;
  const sql = Y.sorular.filter(q => q.dil === 'sql').length, py = Y.sorular.filter(q => q.dil === 'python').length;
  return `<section class="uret-panel">
    <div><h2>Bu veriye özel sorular</h2>
    <p>${Y.sorular.length ? `Şu an <b>${sql} SQL</b> ve <b>${py} Python</b> sorusu var. Yeni ürettiklerin listeye eklenir.` : `${aiAd()} tablolarının yapısına ve örnek satırlarına bakıp kolaydan zora sorular hazırlar. Her sorunun çözümü veride çalıştırılarak doğrulanır, çalışmayanlar elenir.`}</p></div>
    ${aiTur() ? `<form id="uretForm" class="uret-form">
      <fieldset><legend>Dil</legend><div class="radyo">${[['ikisi', 'SQL + Python'], ['sql', 'SQL'], ['python', 'Python']].map(([v, l], i) => `<label><input type="radio" name="dil" value="${v}" ${i === 0 ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>
      <fieldset><legend>Adet <span class="kucuk" style="font-weight:400;color:var(--soluk)">(SQL + Python seçiliyse her dil için)</span></legend><div class="radyo">${[6, 10, 14].map(n => `<label><input type="radio" name="adet" value="${n}" ${n === 10 ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div></fieldset>
      <button class="btn birincil" type="submit" ${S.uretiliyor ? 'disabled' : ''}>${S.uretiliyor ? 'Üretiliyor…' : 'Soruları üret'}</button>
    </form><div id="uretDurum"></div>` : aiYokHTML('Soru üretmek için yapay zekâ bağlantısı gerekiyor. Ücretsiz bir Gemini API anahtarı ekleyerek açabilirsin. O zamana kadar Serbest Alan\'da bu veriyle sorgu yazabilirsin.')}
  </section>`;
}
const trHarf = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
function adTemizle(s, yedek) {
  let a = String(s ?? '').trim().replace(/[çğıöşüÇĞİÖŞÜ]/g, c => trHarf[c]).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!a) a = yedek; if (/^\d/.test(a)) a = 'c_' + a;
  if (['select', 'from', 'where', 'group', 'order', 'table', 'index', 'by', 'case', 'when', 'end', 'limit', 'join', 'on', 'as', 'and', 'or', 'not', 'null', 'in', 'is', 'having', 'values', 'class', 'def', 'pd', 'np', 'sonuc', 'lambda', 'import'].includes(a)) a += '_';
  return a;
}
// ─── CSV / TXT okuma: kodlama (UTF-8 ya da Türkçe Windows-1254), ayırıcı, Türkçe sayı ve tarih biçimleri ───
function metinCoz(buf) {
  const b = new Uint8Array(buf);
  const bom = b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF;
  try { return { metin: new TextDecoder('utf-8', { fatal: true }).decode(bom ? b.subarray(3) : b), kodlama: 'UTF-8' }; }
  catch (e) { return { metin: new TextDecoder('windows-1254').decode(b), kodlama: 'Windows-1254' }; }
}
function ayiriciBul(metin) {
  const satirlar = metin.split(/\r?\n/).filter(l => l.trim()).slice(0, 20).map(l => l.replace(/"(?:[^"]|"")*"/g, '""'));
  let en = { a: ',', puan: -1, n: 0 };
  for (const a of [',', ';', '\t', '|']) {
    const say = satirlar.map(l => l.split(a).length - 1);
    if (!say.length || !say[0]) continue;
    const puan = say.filter(n => n === say[0]).length;
    if (puan > en.puan || (puan === en.puan && say[0] > en.n)) en = { a, puan, n: say[0] };
  }
  return en.a;
}
function csvAyristir(metin, a) {
  const satirlar = []; let satir = [], hucre = '', tirnak = false;
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i];
    if (tirnak) {
      if (c === '"') { if (metin[i + 1] === '"') { hucre += '"'; i++; } else tirnak = false; }
      else hucre += c;
    } else if (c === '"' && hucre === '') tirnak = true;
    else if (c === a) { satir.push(hucre); hucre = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && metin[i + 1] === '\n') i++; satir.push(hucre); satirlar.push(satir); satir = []; hucre = ''; }
    else hucre += c;
  }
  if (hucre !== '' || satir.length) { satir.push(hucre); satirlar.push(satir); }
  return satirlar.filter(r => r.some(x => x.trim() !== ''));
}
const SAYI_RE = {
  virgul: /^[-+]?(\d{1,3}(\.\d{3})+|\d+)(,\d+)?$/,   // 1.250,50 · 3,5 · 980
  nokta: /^[-+]?(\d{1,3}(,\d{3})+|\d+)(\.\d+)?$/     // 1,250.50 · 3.5 · 980
};
function ondalikTahmin(hucreler, ayirici) {
  let tr = 0, en = 0;
  for (const s of hucreler) {
    if (/^[-+]?\d{1,3}(\.\d{3})+,\d+$/.test(s) || /^[-+]?\d+,(\d{1,2}|\d{4,})$/.test(s)) tr++;
    else if (/^[-+]?\d{1,3}(,\d{3})+\.\d+$/.test(s) || /^[-+]?\d+\.(\d{1,2}|\d{4,})$/.test(s)) en++;
  }
  if (tr !== en) return tr > en ? 'virgul' : 'nokta';
  return ayirici === ';' ? 'virgul' : 'nokta';   // Türkçe Excel ';' ile ve virgüllü ondalıkla kaydeder
}
function sayiCevir(s, ondalik) {
  if (!SAYI_RE[ondalik].test(s)) return null;
  const n = ondalik === 'virgul' ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  return Number(n);
}
function tarihCevir(s, gunOnce) {
  const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$/.test(s) ? s.replace('T', ' ') : null;
  const p = n => String(n).padStart(2, '0');
  const [g, a] = gunOnce ? [+m[1], +m[2]] : [+m[2], +m[1]];
  if (a < 1 || a > 12 || g < 1 || g > 31) return null;
  const t = `${m[3]}-${p(a)}-${p(g)}`;
  return m[4] && (+m[4] || +m[5] || +(m[6] || 0)) ? `${t} ${p(m[4])}:${m[5]}:${p(m[6] || 0)}` : t;
}
// Metin hücrelerinden oluşan tabloyu sütun sütun sayıya / ISO tarihe çevirir.
function metinSutunlariniCevir(satirlar, ondalik) {
  let n = 0; for (const r of satirlar) if (r.length > n) n = r.length;   // (spread büyük dosyada yığın taşırır)
  for (let j = 0; j < n; j++) {
    const dolu = satirlar.map(r => r[j]).filter(v => v !== null && v !== undefined).map(v => String(v).trim()).filter(Boolean);
    if (!dolu.length) continue;
    const onSifir = dolu.some(v => /^[-+]?0\d/.test(v) && !/^[-+]?0[.,]/.test(v));
    const sayilar = onSifir ? null : dolu.map(v => sayiCevir(v, ondalik));
    if (sayilar && sayilar.every(x => x !== null && isFinite(x))) {
      for (const r of satirlar) { const v = r[j] == null ? '' : String(r[j]).trim(); r[j] = v === '' ? null : sayiCevir(v, ondalik); }
      continue;
    }
    // Tarih: gg.aa.yyyy / gg/aa/yyyy (ilk sayı 12'den büyükse kesin gün; ikinci sayı 12'den büyükse ABD biçimi aa/gg)
    const parca = dolu.map(v => v.match(/^(\d{1,2})[./-](\d{1,2})[./-]\d{4}/)).filter(Boolean);
    const gunOnce = !parca.some(m => +m[2] > 12) || parca.some(m => +m[1] > 12);
    const tarihler = dolu.map(v => tarihCevir(v, gunOnce));
    if (tarihler.every(Boolean) && parca.length) {
      for (const r of satirlar) { const v = r[j] == null ? '' : String(r[j]).trim(); r[j] = v === '' ? null : tarihCevir(v, gunOnce); }
      continue;
    }
    for (const r of satirlar) if (typeof r[j] === 'string') r[j] = r[j].trim() === '' ? null : r[j].trim();
  }
  return satirlar;
}
let sonYuklenenDosya = null;
const SATIR_SINIRI_YUKLE = 100000;   // yüklenen her tablo için (Excel ve CSV)
async function dosyaYukle(f, secenek = {}) {
  const d = $('#yukDurum');
  d.innerHTML = '<div class="yukleniyor">Dosya okunuyor…</div>';
  await bekle(16);
  try {
    sonYuklenenDosya = f;
    const metinMi = /\.(csv|tsv|txt)$/i.test(f.name) || /^text\//.test(f.type || '');
    const sayfalar = [];
    const tablolar = {}; const uyarilar = []; let okuma = null;
    if (metinMi) {
      const { metin, kodlama } = metinCoz(await f.arrayBuffer());
      const ayirici = ayiriciBul(metin);
      let ham = csvAyristir(metin, ayirici);
      if (ham.length < 2) throw new Error('Dosyada okunabilir bir tablo bulunamadı. İlk satırın sütun adları olduğundan emin ol.');
      if (ham.length - 1 > SATIR_SINIRI_YUKLE) { uyarilar.push(`İlk ${SATIR_SINIRI_YUKLE.toLocaleString('tr-TR')} satır alındı (dosyada ${(ham.length - 1).toLocaleString('tr-TR')} satır var).`); ham = ham.slice(0, SATIR_SINIRI_YUKLE + 1); }
      const sayiGibi = ham.slice(1).flat().map(v => v.trim()).filter(v => /^[-+]?[\d.,]*\d$/.test(v) && /[.,]/.test(v));
      const ondalik = secenek.ondalik || ondalikTahmin(sayiGibi, ayirici);
      metinSutunlariniCevir(ham.slice(1), ondalik);
      sayfalar.push({ ad: f.name.replace(/\.[^.]+$/, ''), ham });
      okuma = { kodlama, ayirici, ondalik, onemli: sayiGibi.length > 0 };
    } else {
      if (!window.XLSX) await scriptYukle('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: true });
      for (const sn of wb.SheetNames) {
        const ham = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: null, blankrows: false });
        sayfalar.push({ ad: sn, ham });
      }
    }
    const pad = n => String(n).padStart(2, '0');
    const tarihYaz = v => { const s = `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`; return (v.getHours() || v.getMinutes() || v.getSeconds()) ? `${s} ${pad(v.getHours())}:${pad(v.getMinutes())}:${pad(v.getSeconds())}` : s; };
    for (const { ad: sn, ham } of sayfalar) {
      if (!ham.length || !ham[0] || !ham[0].some(x => x !== null && x !== '')) continue;
      let baslik = ham[0].map((h, i) => adTemizle(h, `sutun_${i + 1}`));
      const gor = {}; baslik = baslik.map(h => { if (gor[h]) { gor[h]++; return `${h}_${gor[h]}`; } gor[h] = 1; return h; });
      let satirlar = ham.slice(1).map(r => baslik.map((_, i) => { let v = r[i]; if (v === undefined || v === '') v = null; if (v instanceof Date) v = tarihYaz(v); if (typeof v === 'boolean') v = v ? 1 : 0; return v; }));
      satirlar = satirlar.filter(r => r.some(v => v !== null));
      if (satirlar.length > SATIR_SINIRI_YUKLE) { uyarilar.push(`${sn}: ilk ${SATIR_SINIRI_YUKLE.toLocaleString('tr-TR')} satır alındı (toplam ${satirlar.length.toLocaleString('tr-TR')}).`); satirlar = satirlar.slice(0, SATIR_SINIRI_YUKLE); }
      const tipler = baslik.map((_, i) => { const dolu = satirlar.map(r => r[i]).filter(v => v !== null); if (!dolu.length) return 'TEXT'; if (dolu.every(v => typeof v === 'number')) return dolu.every(Number.isInteger) ? 'INTEGER' : 'REAL'; return 'TEXT'; });
      satirlar = satirlar.map(r => r.map((v, i) => tipler[i] === 'TEXT' && v !== null ? String(v) : v));
      let tad = adTemizle(metinMi || sayfalar.length === 1 && /\.csv$/i.test(f.name) ? f.name.replace(/\.[^.]+$/, '') : sn, 'tablo');
      while (tablolar[tad]) tad += '_2';
      tablolar[tad] = { columns: baslik, types: tipler, rows: satirlar };
    }
    if (!Object.keys(tablolar).length) throw new Error('Dosyada okunabilir bir tablo bulunamadı. İlk satırın sütun adları olduğundan emin ol.');
    VS.yuklenen = { ad: f.name.replace(/\.[^.]+$/, ''), tablolar, sorular: [], meta: metaHesapla(tablolar) };
    delete gonderilen.yuklenen; Object.keys(beklenenCache).filter(k => k.startsWith('yuklenen:')).forEach(k => delete beklenenCache[k]);
    if (pyYukluVS === 'yuklenen') pyYukluVS = null;
    S.aktifId.yuklenen = null;
    S.gecmis = S.gecmis.filter(g => g.vs !== 'yuklenen');
    await sqlHazirla(); await veriGonder('yuklenen'); await motor('dbHazirla', ['yuklenen']);
    S.veriSeti = 'yuklenen';
    S.serbestKod = varsayilanKod('yuklenen');
    await yukleneniKaydet();
    yenidenCiz();
    const dd = $('#yukDurum');
    if (dd && (uyarilar.length || okuma)) {
      const AY = { ',': 'virgül', ';': 'noktalı virgül', '\t': 'sekme', '|': 'dik çizgi' };
      const OND = { virgul: 'virgül (3,5 · 1.250,50)', nokta: 'nokta (3.5 · 1,250.50)' };
      const cokSutun = okuma && Object.values(tablolar).some(t => t.columns.length > 1);
      const satir = okuma ? `Dosya ${okuma.kodlama} kodlamasıyla${cokSutun ? `, sütunlar <b>${AY[okuma.ayirici]}</b> ile ayrılmış olarak` : ''} okundu.` +
        (okuma.onemli ? ` Sayılarda ondalık ayırıcı <b>${OND[okuma.ondalik]}</b> kabul edildi. <button class="btn kucuk-btn" id="ondalikDegistir">${okuma.ondalik === 'virgul' ? 'Nokta' : 'Virgül'} olarak yeniden oku</button>` : '') : '';
      dd.innerHTML = `<div class="bilgi">${[satir, ...uyarilar.map(esc)].filter(Boolean).join('<br>')}</div>`;
      const od = $('#ondalikDegistir'); if (od) od.onclick = () => dosyaYukle(f, { ondalik: okuma.ondalik === 'virgul' ? 'nokta' : 'virgul' });
    }
  } catch (e) { d.innerHTML = `<div class="hata-kutu">Dosya okunamadı: ${esc(e.message || e)}</div>`; }
}
function veriOzetiPrompt(tablolar) {
  return Object.entries(tablolar).map(([ad, t]) => {
    const sut = t.columns.map((c, i) => {
      const deg = t.rows.map(r => r[i]); const dolu = deg.filter(v => v !== null);
      let ek = `boş: ${deg.length - dolu.length}`;
      if (t.types[i] !== 'TEXT' && dolu.length) ek += `, min: ${Math.min(...dolu)}, max: ${Math.max(...dolu)}`;
      else { const farkli = [...new Set(dolu)]; ek += `, farklı değer: ${farkli.length}${farkli.length <= 12 ? ` (${farkli.slice(0, 12).join(' / ')})` : `, örnek: ${farkli.slice(0, 4).join(' / ')}`}`; }
      return `  - ${c} ${t.types[i]} [${ek}]`;
    }).join('\n');
    return `Tablo: ${ad} (${t.rows.length} satır)\n${sut}\nİlk 4 satır:\n${t.rows.slice(0, 4).map(r => '  ' + JSON.stringify(r)).join('\n')}`;
  }).join('\n\n');
}
function soruPrompt(Y, dil, adet) {
  const dilMetni = dil === 'sql' ? 'hepsi SQL' : 'hepsi Python (pandas)';
  const mevcut = Y.sorular.map(q => `- ${q.baslik}`).join('\n');
  return `Bir veri analistinin SQL ve Python pratiği yapması için alıştırma soruları hazırlıyorsun. Tüm metinler Türkçe olsun.

VERİ:
${veriOzetiPrompt(Y.tablolar)}

KURALLAR:
- Toplam ${adet} soru üret, ${dilMetni}. Kolaydan zora sırala: yaklaşık üçte biri seviye 1 (temel SELECT/filtre/sıralama), üçte biri seviye 2 (GROUP BY, JOIN, CASE, tarih), üçte biri seviye 3 (window function, CTE, alt sorgu; pandas'ta merge, pivot_table, transform, rank).
- SQL çözümleri SQLite lehçesinde olmalı (tarih için strftime/julianday, QUALIFY yok). Tablo ve sütun adlarını aynen kullan.
- Python çözümlerinde her tablo aynı isimde bir pandas DataFrame olarak hazır; pd ve np import edilmiş. YYYY-MM-DD formatındaki tarih sütunları datetime tipinde gelir. Sonuç mutlaka \`sonuc\` değişkenine atanmalı.
- Python sorularında SADECE pandas ve NumPy kullan (ve Python'un kendi yerleşik özellikleri). scipy, sklearn, statsmodels, matplotlib, seaborn gibi başka kütüphaneleri import etme; tarayıcıdaki ortamda yoklar. Arka planda scipy isteyen pandas yöntemlerini de kullanma (ör. corr(method="spearman"/"kendall") yerine a.rank().corr(b.rank()), interpolate(method="spline") gibi).
- Her soru gerçek bir iş sorusu gibi olsun, verinin anlamına uygun olsun.
- Soru metninde beklenen sütun adlarını <code>...</code> ile belirt, yuvarlama gerekiyorsa söyle (örn. 2 ondalık).
- Sonuç boş olmamalı, deterministik olmalı. Sıralama önemliyse sirali=true yap ve eşitliği bozacak ikinci bir sıralama kriteri ekle.
- Tablolar arasında JOIN için ortak anahtar yoksa JOIN sorusu üretme.
- aciklama alanı öğretici olsun: sorgunun neden böyle yazıldığını, adımların mantığını ve sık yapılan hatayı anlat (2-4 kısa paragraf). HTML olarak <p>, <ul>, <li>, <code>, <b> kullan.
${mevcut ? `- Şu sorular zaten var, bunları tekrar etme:\n${mevcut}` : ''}

Sadece şu JSON'u döndür:
{"sorular":[{"dil":"sql"|"python","seviye":1|2|3,"kategori":"kısa kategori adı","baslik":"kısa başlık","soru":"soru metni (HTML: <code> kullanılabilir)","ipucu":"tek cümlelik ipucu","cozum":"çalışan çözüm kodu","aciklama":"HTML açıklama","sirali":true|false}]}`;
}
// "SQL + Python" seçilince iki ayrı istek: her dil için seçilen adet kadar soru (14 → 14 SQL + 14 Python)
async function soruUret(dil, adet) {
  const Y = VS.yuklenen; if (!Y || S.uretiliyor) return;
  S.uretiliyor = true; const durum = () => $('#uretDurum');
  const btn = $('#uretForm button[type=submit]'); if (btn) { btn.disabled = true; btn.textContent = 'Üretiliyor…'; }
  const diller = dil === 'ikisi' ? ['sql', 'python'] : [dil];
  const gecen = [], elenen = [], hatalar = [];
  const yaz = h => { const d = durum(); if (d) d.innerHTML = h; };
  const onceki = S.veriSeti;
  for (const [k, d] of diller.entries()) {
    const adim = diller.length > 1 ? ` (${k + 1}/${diller.length})` : '';
    yaz(`<div class="yukleniyor">${aiAd()} veriyi inceleyip ${adet} ${DIL[d]} sorusu hazırlıyor${adim}. Bu 30-60 saniye sürebilir…</div>`);
    try {
      const r = await aiJson(soruPrompt(Y, d, adet), { modelTier: 'complex' });
      const gelen = (r && r.sorular) || (Array.isArray(r) ? r : []);
      if (!gelen.length) throw new Error(aiAd() + ' geçerli bir soru listesi döndürmedi. Tekrar dene.');
      yaz(`<div class="yukleniyor">${gelen.length} ${DIL[d]} sorusu geldi${adim}. Çözümler veride çalıştırılarak doğrulanıyor…</div>`);
      S.veriSeti = 'yuklenen';
      const tag = Date.now().toString(36), bu = [];
      for (const [i, q0] of gelen.entries()) {
        const q = { id: `u${tag}_${i}`, dil: d, seviye: [1, 2, 3].includes(+q0.seviye) ? +q0.seviye : 2, kategori: String(q0.kategori || 'Genel'), baslik: String(q0.baslik || `Soru ${i + 1}`), soru: String(q0.soru || ''), ipucu: String(q0.ipucu || ''), cozum: String(q0.cozum || ''), aciklama: String(q0.aciklama || ''), sirali: !!q0.sirali };
        if (!q.cozum || !q.soru) { elenen.push(q.baslik); continue; }
        try {
          if (q.dil === 'python' && pyDurum !== 'hazir') yaz(`<div class="yukleniyor">Python soruları doğrulanıyor (Python ortamı hazırlanıyor)…</div>`);
          await bekle(10);
          const sonuc = await calistir(q.dil, q.cozum, true);
          if (sonuc.ok && sonuc.table && sonuc.table.rows.length) { beklenenCache['yuklenen:' + q.id] = sonuc; bu.push(q); } else elenen.push(q.baslik);
        } catch (e) { elenen.push(q.baslik); }
      }
      S.veriSeti = onceki;
      Y.sorular.push(...bu); gecen.push(...bu);
      yukleneniKaydet();
    } catch (e) { S.veriSeti = onceki; hatalar.push(`${DIL[d]}: ${aiHata(e)}`); }
  }
  S.uretiliyor = false;
  if (S.view === 'veri') veriCiz();
  ustCiz();
  const sayim = diller.length > 1 ? ` (${gecen.filter(q => q.dil === 'sql').length} SQL, ${gecen.filter(q => q.dil === 'python').length} Python)` : '';
  if (!gecen.length && hatalar.length) { yaz(`<div class="hata-kutu">${hatalar.map(esc).join('<br>')}</div>`); return; }
  yaz(`<div class="karar ${gecen.length ? 'dogru' : 'yanlis'}"><span class="karar-ikon">${gecen.length ? '✓' : '✕'}</span><div>${gecen.length} soru eklendi${sayim}.${elenen.length ? ` ${elenen.length} tanesinin çözümü veride çalışmadığı için elendi.` : ''}${hatalar.length ? ` Bir kısmı üretilemedi: ${esc(hatalar.join(' · '))}` : ''} ${gecen.length ? '<button class="btn kucuk-btn" data-git="alistirma">Alıştırmalara git</button>' : ''}</div></div>`);
  $$('[data-git]').forEach(b => b.onclick = async () => { if (!(await mulakatBirakilsinMi('yuklenen'))) return; if (S.veriSeti !== 'yuklenen') { S.veriSeti = 'yuklenen'; S.mulakat = null; } S.filtre = { dil: gecen[0] ? gecen[0].dil : 'sql', seviye: 0, kategori: '' }; git(b.dataset.git); });
}


// ═══════════════ KONULAB ═══════════════
// İçerik konular.json'da (kaynak/konular → konu_derle.py). Kod örneklerinin çıktıları derlemede üretildi, burada çalıştırılmaz.
let KONULAR = null, konuYukleniyor = null;
function konularAl() {
  if (KONULAR) return Promise.resolve(KONULAR);
  if (!konuYukleniyor) konuYukleniyor = fetch('konular.json').then(r => { if (!r.ok) throw new Error('Konular indirilemedi (' + r.status + ')'); return r.json(); })
    .then(d => { KONULAR = d; return d; }).catch(e => { konuYukleniyor = null; throw e; });
  return konuYukleniyor;
}
function konuBul(q) { return KONU_OZET.find(k => k.alistirma && k.alistirma.dil === q.dil && k.alistirma.kategori === q.kategori); }
function konuGit(id) { location.hash = 'konu' + (id ? '/' + encodeURIComponent(id) : ''); if (location.hash === '#konu' + (id ? '/' + encodeURIComponent(id) : '')) { S.lab = 'konu'; if (id) S.konuId = id; yenidenCiz(); } }
const trKucuk = s => String(s || '').toLocaleLowerCase('tr');
function konuGrupDil(K, grup) { const g = K.gruplar.find(x => x.id === grup); return g ? g.dil : 'genel'; }
function konuCiz() {
  const ana = $('#ana');
  if (!KONULAR) {
    ana.innerHTML = '<div class="konu-sayfa"><div></div><div class="yukleniyor">Konular yükleniyor…</div></div>';
    konularAl().then(() => { if (S.lab === 'konu') konuCiz(); }).catch(e => { ana.innerHTML = `<div class="konu-sayfa"><div></div><div class="hata-kutu">${esc(e.message)} <button class="btn kucuk-btn" id="konuTekrar">Tekrar dene</button></div></div>`; $('#konuTekrar').onclick = konuCiz; });
    return;
  }
  const K = KONULAR;
  let k = K.konular.find(x => x.id === S.konuId);
  if (S.konuId === 'sozluk' || S.konuId === 'yakinda') k = null;
  else if (!k) { k = K.konular.find(x => konuGrupDil(K, x.grup) === S.konuDil) || K.konular[0]; S.konuId = k.id; }
  if (k) { const d = konuGrupDil(K, k.grup); if (d !== 'genel') S.konuDil = d; }
  $$('#konuDil .seg-btn').forEach(b => b.setAttribute('aria-selected', String(b.dataset.kdil === S.konuDil)));
  ana.innerHTML = `<div class="konu-sayfa">
    <nav class="konu-yan kapali" aria-label="Konular" id="konuYan">
      <button class="btn konu-acilir" type="button" id="konuAcKapa" aria-expanded="false">☰ Konular${k ? ' · ' + esc(k.baslik) : ''}</button>
      <label class="konu-grup-ad" for="konuAra" style="padding:0 4px">Konu ara</label>
      <input type="search" id="konuAra" placeholder="JOIN, groupby, lambda…" value="${esc(S.konuAra)}" autocomplete="off">
      <div id="konuListe"></div>
      <div class="konu-alt">${K.gruplar.filter(g => g.dil === 'genel').map(g => K.konular.filter(x => x.grup === g.id).length ? `<div class="konu-grup-ad">${esc(g.ad)}</div>` + konuLinkler(K.konular.filter(x => x.grup === g.id), k) : '').join('')}
        ${K.sozluk && K.sozluk.length ? `<a class="konu-link" href="#konu/sozluk" ${S.konuId === 'sozluk' ? 'aria-current="page"' : ''}><span class="no">Aa</span>Sözlük</a>` : ''}</div>
    </nav>
    <article class="konu-yazi" id="konuYazi">${k ? konuYaziHTML(K, k) : S.konuId === 'yakinda' ? '<h1>Python konuları hazırlanıyor</h1><p class="konu-giris">Python Temelleri, pandas ve NumPy konuları yakında burada olacak. Şimdilik SQL konularına göz atabilirsin.</p>' : sozlukHTML(K)}</article>
    <aside class="konu-sag" aria-label="Bu sayfada">${(() => { const bl = k ? k.basliklar : S.konuId === 'sozluk' ? [['sql', 'SQL'], ['python', 'Python'], ['pandas', 'pandas'], ['numpy', 'NumPy']].map(([id, ad]) => ({ id, ad })) : []; return bl.length ? '<div class="konu-grup-ad" style="padding:0">Bu sayfada</div>' + bl.map(b => `<a href="#" data-b="${esc(b.id)}">${esc(b.ad)}</a>`).join('') : ''; })()}</aside>
  </div>`;
  konuListeCiz(K, k);
  const ara = $('#konuAra');
  ara.oninput = () => { S.konuAra = ara.value; konuListeCiz(K, k); if (S.konuId === 'sozluk') { $('#konuYazi').innerHTML = sozlukHTML(K); } };
  $('#konuAcKapa').onclick = e => { const y = $('#konuYan'); y.classList.toggle('kapali'); e.currentTarget.setAttribute('aria-expanded', String(!y.classList.contains('kapali'))); };
  $$('[data-b]', ana).forEach(a => a.onclick = e => { e.preventDefault(); const h = document.getElementById('b-' + a.dataset.b); if (h) h.scrollIntoView({ behavior: azHareket() ? 'auto' : 'smooth' }); });
  const al = $('#konuAlistirma'); if (al) al.onclick = () => konuAlistirmayaGit(k);
  window.sayfaSay();
}
function konuLinkler(liste, aktif) {
  return liste.map(x => `<a class="konu-link" href="#konu/${encodeURIComponent(x.id)}" ${aktif && aktif.id === x.id ? 'aria-current="page"' : ''}><span class="no">${x.sira}</span>${esc(x.baslik)}</a>`).join('');
}
function konuListeCiz(K, aktif) {
  const ara = trKucuk(S.konuAra).trim();
  const kap = $('#konuListe');
  if (ara) {
    const aranabilir = new Set(K.gruplar.filter(g => g.dil === 'sql' || g.dil === 'python').map(g => g.id));
    const bulunan = K.konular.filter(x => aranabilir.has(x.grup) && trKucuk(x.ara).includes(ara));
    kap.innerHTML = bulunan.length ? `<div class="konu-grup-ad">${bulunan.length} sonuç</div>` + bulunan.map(x => `<a class="konu-link" href="#konu/${encodeURIComponent(x.id)}" ${aktif && aktif.id === x.id ? 'aria-current="page"' : ''}><span class="no">${K.gruplar.find(g => g.id === x.grup).dil === 'python' ? 'py' : 'SQL'}</span>${esc(x.baslik)}</a>`).join('') : '<div class="konu-bul">Bu kelimeyle konu bulunamadı.</div>';
    return;
  }
  kap.innerHTML = K.gruplar.filter(g => g.dil === S.konuDil).map(g => {
    const l = K.konular.filter(x => x.grup === g.id);
    return l.length ? `<div style="display:grid;gap:2px"><div class="konu-grup-ad">${esc(g.ad)}</div>${konuLinkler(l, aktif)}</div>` : '';
  }).join('');
}
function konuBlokHTML(b) {
  if (b.t === 'html') return b.h;
  if (b.t === 'kutu') return `<div class="konu-kutu ${b.tur}"><div class="kutu-ad">${esc(b.ad)}</div>${b.bloklar.map(konuBlokHTML).join('')}</div>`;
  if (b.t !== 'kod') return '';
  const c = b.cikti;
  let cikti = '';
  if (c) {
    const parca = [];
    if (c.stdout) parca.push(`<pre>${esc(c.stdout.replace(/\n$/, ''))}</pre>`);
    if (c.tablo) parca.push(tabloHTML(c.tablo, 50));
    if (c.metin) parca.push(`<pre>${esc(c.metin)}</pre>`);
    if (c.hata) parca.push(`<pre class="hata-metin">${esc(c.hata)}</pre>`);
    cikti = `<div class="ornek-cikti"><div class="ornek-etiket">${c.hata ? 'Hata' : 'Çıktı'}${b.veri && VS[b.veri] ? `<span class="veri">${esc(VS[b.veri].ad)}</span>` : ''}</div>${parca.join('')}</div>`;
  }
  return `<div class="ornek"><pre class="kod-blok"><code>${renklendir(b.kod, b.dil)}</code></pre>${cikti}</div>`;
}
// Konudan alıştırmaya geçişte gidilecek veri seti: şu anki veri setinde o konudan soru varsa o, yoksa sorusu olan ilk hazır veri seti.
function konuHedefVS(k) {
  if (!k.alistirma) return null;
  const { dil, kategori } = k.alistirma;
  const uygun = key => VS[key] && VS[key].sorular.some(q => q.dil === dil && q.kategori === kategori && !q.kaynak);
  return uygun(S.veriSeti) ? S.veriSeti : (HAZIR.find(uygun) || null);
}
// Düğmede yazan sayı, tıklayınca açılacak veri setindeki soru sayısıdır.
function konuAlistirmaSay(k) {
  const key = konuHedefVS(k); if (!key) return 0;
  return VS[key].sorular.filter(q => q.dil === k.alistirma.dil && q.kategori === k.alistirma.kategori && !q.kaynak).length;
}
function konuYaziHTML(K, k) {
  const sira = K.gruplar.flatMap(g => K.konular.filter(x => x.grup === g.id));
  const i = sira.indexOf(k), once = sira[i - 1], sonra = sira[i + 1];
  const grup = K.gruplar.find(g => g.id === k.grup), grupKonu = K.konular.filter(x => x.grup === k.grup);
  const n = konuAlistirmaSay(k);
  return `<div class="konu-ust">${esc(grup.ad)} · Konu ${k.sira} / ${grupKonu.length}</div>
    <h1>${esc(k.baslik)}</h1>
    ${k.ozet ? `<p class="konu-giris">${esc(k.ozet)}</p>` : ''}
    ${k.bloklar.map(konuBlokHTML).join('')}
    <div class="konu-son">
      ${n ? `<button class="btn birincil" id="konuAlistirma">Bu konuyla alıştırma yap · ${esc(VS[konuHedefVS(k)].ad)} · ${n} soru →</button>` : ''}
      <span class="gezinme-btn">${once ? `<a class="btn" href="#konu/${encodeURIComponent(once.id)}">← ${esc(once.baslik)}</a>` : ''}${sonra ? `<a class="btn" href="#konu/${encodeURIComponent(sonra.id)}">${esc(sonra.baslik)} →</a>` : ''}</span>
    </div>`;
}
async function konuAlistirmayaGit(k) {
  const { dil, kategori } = k.alistirma;
  const key = konuHedefVS(k);
  if (!key) return;
  if (!(await mulakatBirakilsinMi(key))) return;
  if (key !== S.veriSeti) { S.veriSeti = key; S.mulakat = null; S.serbestKod = varsayilanKod(key); veriHazirla(key).catch(() => { }); }
  S.filtre = { dil, seviye: 0, kategori, kaynak: '' };
  const ilk = filtreliSorular()[0]; if (ilk) S.aktifId[key] = ilk.id;
  git('alistirma');
}
function sozlukHTML(K) {
  const ara = trKucuk(S.konuAra).trim();
  const liste = (K.sozluk || []).filter(x => !ara || trKucuk(x.ad + ' ' + x.tanim + ' ' + (x.karsilik || '') + ' ' + (x.ornek || '')).includes(ara));
  const bolumler = [['sql', 'SQL'], ['python', 'Python'], ['pandas', 'pandas'], ['numpy', 'NumPy']];
  if (S.konuDil === 'python') bolumler.push(bolumler.shift());
  const madde = x => `<div class="konu-kutu"><code style="font-size:15px">${esc(x.ad)}</code>
      <p>${esc(x.tanim)}</p>${x.ornek ? kodBlok(x.ornek, x.dil === 'sql' ? 'sql' : 'python') : ''}${x.karsilik ? `<p class="kucuk">${x.dil === 'sql' ? 'pandas karşılığı' : x.dil === 'python' ? 'Karşılığı' : 'SQL / pandas karşılığı'}: <code>${esc(x.karsilik)}</code></p>` : ''}${x.konu ? `<a class="konu-oku" href="#konu/${encodeURIComponent(x.konu)}">Konuyu oku →</a>` : ''}</div>`;
  return `<div class="konu-ust">Sözlük · ${K.sozluk.length} madde</div><h1>Sözlük</h1>
    <p class="konu-giris">Fonksiyonlar ve kavramlar, kısa tanım, örnek ve karşılığıyla. Soldaki arama kutusu sözlükte de arar.</p>
    ${liste.length ? bolumler.map(([d, ad]) => { const l = liste.filter(x => x.dil === d); return l.length ? `<h2 id="b-${d}">${ad}</h2>` + l.map(madde).join('') : ''; }).join('') : '<div class="konu-bul">Bu kelimeyle madde bulunamadı.</div>'}`;
}

// ─── Başlat ───
(function baslat() {
  const iletisimIstendi = location.hash === '#iletisim';
  if (iletisimIstendi) history.replaceState(null, '', location.pathname + location.search);
  hashOku();
  mulakatGeriYukle(false);
  veriHazirla(S.veriSeti).catch(() => { });
  yukleneniGeriYukle().then(() => { if (!S.mulakat && VS.yuklenen) { mulakatGeriYukle(true); if (S.mulakat) yenidenCiz(); } });
  if (iletisimIstendi) setTimeout(iletisimAc, 300);
  else setTimeout(() => tanitimAc(false), 400);
  yenidenCiz();
  sqlHazirla().catch(e => { $('#ana').insertAdjacentHTML('afterbegin', hataHTML(e)); });
})();
