---
baslik: Hata yakalama
ozet: try / except ile hataları yakalamak, programın çökmesini önlemek. Sık görülen hata türleri.
---
Python bir hatayla karşılaşınca çalışmayı durdurur ve hata mesajı verir. Hata mesajının son satırı hatanın **türünü** ve açıklamasını söyler; okumayı alışkanlık edin.

## Sık görülen hata türleri

| Hata | Ne zaman | Örnek |
|---|---|---|
| `NameError` | Tanımlanmamış bir isim | `pritn("a")` |
| `TypeError` | Uyumsuz tipler | `"3" + 4` |
| `ValueError` | Tip doğru, değer uygunsuz | `int("on iki")` |
| `KeyError` | Sözlükte (ya da DataFrame'de) olmayan anahtar | `d["yok"]` |
| `IndexError` | Listenin dışında indeks | `[1, 2][5]` |
| `ZeroDivisionError` | Sıfıra bölme | `1 / 0` |

```python hata
int("on iki")
```

## try / except

Hata verebilecek kodu `try` bloğuna, hata olursa yapılacakları `except` bloğuna yazarsın. Böylece bir satırdaki sorun tüm işlemi durdurmaz.

```python
gelen = ["12", "7.5", "on", "", "30"]
temiz = []
for g in gelen:
    try:
        temiz.append(float(g))
    except ValueError:
        print(f"Atlandı: {g!r}")
temiz
```

## Hatayı türüne göre yakalamak

`except` arkasına hata türünü yazmak iyi bir alışkanlık. Yalın `except:` her şeyi yakalar, beklemediğin hataları da gizler.

```python
def oran(pay, payda):
    try:
        return round(pay / payda, 4)
    except ZeroDivisionError:
        return None
    except TypeError:
        return "sayı bekleniyordu"

oran(3, 4), oran(3, 0), oran("3", 4)
```

## else ve finally

`else` hata **olmazsa** çalışır, `finally` her durumda çalışır (dosya kapatmak, bağlantıyı bitirmek gibi temizlik işleri için).

```python
for deger in ["42", "x"]:
    try:
        sayi = int(deger)
    except ValueError:
        print(deger, "→ sayı değil")
    else:
        print(deger, "→ sayı:", sayi)
    finally:
        print("  kontrol bitti")
```

:::kural
Hata yakalamak, hatayı saklamak değildir. Yakaladığın hatayı en azından kaydet ya da yazdır; sessizce `pass` geçersen veri neden eksik diye sonra saatlerce aranırsın.
:::
