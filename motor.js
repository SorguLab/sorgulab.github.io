// SorguLab motoru: SQL (sql.js) ve Python (Pyodide).
// Normalde ayrı bir arka plan iş parçacığında (Web Worker) çalışır: sonsuz döngü sayfayı dondurmaz, Durdur ile kesilebilir.
// Worker kurulamazsa aynı kod sayfanın içinde (eski yöntem) çalışır. Her iki durumda da tek kaynak bu dosyadır.
var Motor = (function () {
  var isci = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
  var G = isci ? self : window;
  var ilerleme = function () { };

  function scriptAl(url) {
    if (isci) return new Promise(function (ok, red) { try { importScripts(url); ok(); } catch (e) { red(new Error(url + ' yüklenemedi')); } });
    return new Promise(function (ok, red) {
      var s = document.createElement('script'); s.src = url; s.onload = ok;
      s.onerror = function () { s.remove(); red(new Error(url + ' yüklenemedi')); };
      document.head.appendChild(s);
    });
  }
  function sureli(p, ms, ad) {
    var t;
    return Promise.race([p, new Promise(function (_, red) { t = setTimeout(function () { red(new Error(ad + ' ' + Math.round(ms / 1000) + ' saniyede yüklenemedi')); }, ms); })])
      .finally(function () { clearTimeout(t); });
  }

  // ─── Veri ───
  var veri = {};      // anahtar -> { tablolar, bytes, oyun }
  var pyAnahtar = null, pyTip = {};
  function veriVer(key, tablolar) {
    var v = veri[key];
    if (v && v.tablolar === tablolar) return true;
    if (v && v.oyun) { try { v.oyun.close(); } catch (e) { } }
    veri[key] = { tablolar: tablolar, bytes: null, oyun: null };
    if (pyAnahtar === key) pyAnahtar = null;
    return true;
  }

  // ─── SQL ───
  var SQL = null, sqlP = null;
  function sqlBaslat(kaynaklar) {
    if (!sqlP) sqlP = (async function () {
      var son = null;
      for (var i = 0; i < kaynaklar.length; i++) {
        var k = kaynaklar[i];
        try {
          if (!G.initSqlJs) await sureli(scriptAl(k.js), 30000, 'SQL motoru');
          SQL = await sureli(G.initSqlJs(k.wasm ? { locateFile: function () { return k.wasm; } } : {}), 30000, 'SQL motoru');
          return true;
        } catch (e) { son = e; SQL = null; try { delete G.initSqlJs; } catch (x) { G.initSqlJs = undefined; } }
      }
      throw son || new Error('SQL motoru yüklenemedi');
    })().catch(function (e) { sqlP = null; throw e; });
    return sqlP;
  }
  function olustur(tablolar) {
    var db = new SQL.Database();
    Object.keys(tablolar).forEach(function (ad) {
      var t = tablolar[ad];
      db.run('CREATE TABLE "' + ad + '" (' + t.columns.map(function (c, i) { return '"' + c + '" ' + (t.types[i] || ''); }).join(', ') + ')');
      var st = db.prepare('INSERT INTO "' + ad + '" VALUES (' + t.columns.map(function () { return '?'; }).join(',') + ')');
      db.run('BEGIN');
      for (var r = 0; r < t.rows.length; r++) st.run(t.rows[r]);
      db.run('COMMIT');
      st.free();
    });
    return db;
  }
  function dbAl(key) {
    var v = veri[key];
    if (!v) throw new Error('Veri yüklenmedi: ' + key);
    if (!v.bytes) { var db = olustur(v.tablolar); v.bytes = db.export(); v.oyun = db; }
    return v;
  }
  function exec(db, kod) {
    var t0 = performance.now();
    try {
      var r = db.exec(kod);
      var ms = Math.round(performance.now() - t0);
      var son = r[r.length - 1];
      if (!son) return { ok: true, table: null, ms: ms, mesaj: 'Sorgu çalıştı, sonuç tablosu dönmedi (' + db.getRowsModified() + ' satır etkilendi).' };
      return { ok: true, table: { columns: son.columns, rows: son.values, total: son.values.length }, ms: ms };
    } catch (e) { return { ok: false, error: e.message, ms: Math.round(performance.now() - t0) }; }
  }
  async function sql(key, kod, temiz) {
    await sqlP;
    var v = dbAl(key);
    if (temiz) { var db = new SQL.Database(v.bytes); try { return exec(db, kod); } finally { db.close(); } }
    return exec(v.oyun, kod);
  }
  async function dbHazirla(key) { await sqlP; dbAl(key); return true; }
  function sifirla(key) {
    var v = veri[key];
    if (v && v.bytes) { try { v.oyun.close(); } catch (e) { } v.oyun = new SQL.Database(v.bytes); }
    return true;
  }

  // ─── Python ───
  var py = null, pyP = null;
  function pyBaslat(kaynaklar, paketler, helper) {
    if (!pyP) pyP = (async function () {
      var son = null;
      for (var i = 0; i < kaynaklar.length; i++) {
        var kok = kaynaklar[i];
        try {
          ilerleme('Python motoru indiriliyor (1/3)…');
          if (!G.loadPyodide) await sureli(scriptAl(kok + 'pyodide.js'), 45000, 'Python motoru');
          ilerleme('Python motoru başlatılıyor (2/3)…');
          var yerel = i === 0 && kaynaklar.length > 0 && kok.indexOf('cdn.jsdelivr') < 0;
          py = await sureli(G.loadPyodide(yerel ? { indexURL: kok, stdLibURL: kok + 'python_stdlib.wasm' } : { indexURL: kok }), 120000, 'Python motoru');
          ilerleme('pandas ve NumPy yükleniyor (3/3)…');
          if (yerel) {
            var site = py.runPython('import site; site.getsitepackages()[0]');
            for (var j = 0; j < paketler.length; j++) {
              var ad = paketler[j];
              var buf = await sureli(fetch(kok + 'paket-' + ad + '.wasm').then(function (r) { if (!r.ok) throw new Error(ad + ' paketi indirilemedi (' + r.status + ')'); return r.arrayBuffer(); }), 90000, ad);
              await py.unpackArchive(buf, 'wheel', { extractDir: site });
            }
            py.runPython('import importlib; importlib.invalidate_caches()');
          } else await sureli(py.loadPackage(['pandas']), 150000, 'pandas');
          py.runPython(helper);
          pyAnahtar = null;
          ilerleme('Python hazır');
          return true;
        } catch (e) {
          son = e; py = null;
          try { delete G.loadPyodide; } catch (x) { G.loadPyodide = undefined; }
        }
      }
      throw son || new Error('bilinmeyen hata');
    })().catch(function (e) { pyP = null; throw e; });
    return pyP;
  }
  async function pyVeri(key) {
    await pyP;
    if (pyAnahtar !== key) {
      var f = py.globals.get('_yukle');
      try { pyTip = JSON.parse(f(JSON.stringify(veri[key].tablolar))); } finally { f.destroy(); }
      pyAnahtar = key;
    }
    return pyTip;
  }
  async function pyCalistir(key, kod, kalici) {
    var tip = await pyVeri(key);
    var t0 = performance.now();
    var f = py.globals.get('_calistir');
    var out;
    try { out = JSON.parse(f(kod, !!kalici)); } finally { f.destroy(); }
    out.ms = Math.round(performance.now() - t0);
    out.tipler = tip;
    return out;
  }

  async function pySifirla() { if (pyP) { await pyP; py.runPython('_serbest_sifirla()'); } return true; }
  var api = { pySifirla: pySifirla, veriVer: veriVer, sqlBaslat: sqlBaslat, sql: sql, dbHazirla: dbHazirla, sifirla: sifirla, pyBaslat: pyBaslat, pyVeri: pyVeri, py: pyCalistir,
    ilerlemeAyarla: function (f) { ilerleme = f; } };

  if (isci) {
    ilerleme = function (t) { self.postMessage({ asama: t }); };
    self.onmessage = async function (e) {
      var m = e.data;
      self.postMessage({ id: m.id, basladi: true });
      try { var r = await api[m.fn].apply(null, m.args || []); self.postMessage({ id: m.id, ok: true, r: r }); }
      catch (x) { self.postMessage({ id: m.id, ok: false, hata: (x && x.message) || String(x) }); }
    };
    self.postMessage({ merhaba: true });
  }
  return api;
})();
