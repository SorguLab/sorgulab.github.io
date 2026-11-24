---
baslik: Değişkenler ve veri tipleri
ozet: Değer saklamak, temel tipler (int, float, str, bool), tip öğrenme ve tip dönüştürme, aritmetik operatörler, f-string.
---
Değişken, bir değere verdiğin addır. `=` ile atanır; Python tipi kendisi anlar, ayrıca belirtmen gerekmez.

```python
yas = 29
boy = 1.68
ad = "Esra"
calisiyor = True
print(ad, yas, boy, calisiyor)
```

## Temel tipler

| Tip | Ne tutar | Örnek |
|---|---|---|
| `int` | Tam sayı | `42`, `-7` |
| `float` | Ondalıklı sayı | `3.14`, `0.5` |
| `str` | Metin | `"merhaba"`, `'SQL'` |
| `bool` | Doğru / yanlış | `True`, `False` |
| `NoneType` | "Değer yok" (SQL'deki NULL'a benzer) | `None` |

`type()` bir değerin tipini söyler:

```python
type(yas), type(boy), type(ad), type(calisiyor), type(None)
```

## Tip dönüştürme

Excel'den ya da bir formdan gelen sayılar çoğu zaman metin olarak gelir. Hesap yapmadan önce dönüştürmek gerekir.

```python
fiyat_metin = "149.90"
fiyat = float(fiyat_metin)
adet = int("3")
print(fiyat * adet)
print(str(adet) + " adet")
```

:::not
`149.90 * 3` sonucunun `449.70000000000005` çıkması bir hata değil: bilgisayarlar ondalıklı sayıları ikilik sistemde tam olarak saklayamaz. Gösterirken `round(x, 2)` ya da f-string biçimi (`f"{x:.2f}"`) kullan. Para hesaplarında bu küçük farklar toplamlarda birikebileceği için finans sistemleri `decimal` modülünü kullanır.
:::

```python hata
"3" + 4
```

Metinle sayı toplanamaz. Python bunu tahmin etmeye çalışmaz, açıkça hata verir.

:::dikkat
`int("3.7")` hata verir; önce `float`'a, sonra `int`'e çevirmek gerekir. `int(3.7)` ise yuvarlamaz, ondalığı **keser**: sonuç 3. Yuvarlamak için `round(3.7)`.
:::

```python
int(float("3.7")), int(3.7), round(3.7), round(3.14159, 2)
```

## Aritmetik operatörler

| Operatör | Anlamı | `7 ? 2` |
|---|---|---|
| `+` `-` `*` | Toplama, çıkarma, çarpma | 9, 5, 14 |
| `/` | Bölme (her zaman float) | 3.5 |
| `//` | Tam bölme | 3 |
| `%` | Kalan (mod) | 1 |
| `**` | Üs | 49 |

```python
7 / 2, 7 // 2, 7 % 2, 2 ** 10
```

:::ipucu
`%` bir sayının çift olup olmadığını anlamanın yoludur: `x % 2 == 0` ise çifttir. SQL'deki tam sayı bölmesi tuzağı Python'da yok: `7 / 2` her zaman 3.5 verir.
:::

## f-string ile metin biçimlendirme

Metnin önüne `f` koyup değişkenleri `{}` içine yazarsın. `:.2f` gibi biçimlerle ondalık sayısını ayarlarsın.

```python
oran = 0.38383838
print(f"{ad} {yas} yaşında.")
print(f"Hayatta kalma oranı: %{oran * 100:.2f}")
print(f"Ciro: {1234567.891:,.2f} TL")
```
