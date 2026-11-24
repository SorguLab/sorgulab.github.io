---
baslik: Metinler
ozet: Metin (string) işlemleri. len, indeksleme ve dilimleme, replace, upper/lower, capitalize, strip, split/join ve in ile arama.
---
Metinler (string) tırnak içinde yazılır; tek ya da çift tırnak fark etmez. Bir metin bir karakter dizisidir: her karakterin bir sırası (indeksi) vardır.

## Uzunluk ve indeksleme

`len` karakter sayısını verir. İndeks **0'dan** başlar; negatif indeks sondan sayar.

```python
isim = "Braund, Mr. Owen Harris"
len(isim), isim[0], isim[-1]
```

## Dilimleme

`metin[başlangıç:bitiş]` başlangıç dahil, bitiş **hariç** parçayı verir. Boş bırakılan uç "baştan" ya da "sona kadar" demektir.

```python
print(isim[0:6])
print(isim[8:11])
print(isim[-6:])
print(isim[::-1])
```

## Sık kullanılan metotlar

```python
s = "  sorgulab ile SQL öğren  "
print(s.strip())
print(s.upper())
print(s.strip().capitalize())
print(s.strip().title())
print(s.replace("SQL", "Python"))
```

:::dikkat
Metinler değiştirilemez (immutable). `s.upper()` yeni bir metin döner, `s`'nin kendisi değişmez. Sonucu kullanmak istiyorsan bir değişkene ata: `s = s.upper()`.
:::

```python
s.upper()
s
```

:::dikkat
`upper()` ve `title()` Türkçe kurallarını bilmez: "ile" → "ILE" olur, "İLE" değil. Ekrana göstereceğin Türkçe metinlerde bunu hesaba kat. Karşılaştırma yaparken (aramada) iki tarafı da aynı fonksiyonla dönüştürürsen sorun çıkmaz.
:::

## in ile arama

`in` bir metnin içinde başka bir metin geçiyor mu diye bakar, `True`/`False` döner. Büyük/küçük harfe duyarlıdır.

```python
print("Mr." in isim)
print("mr." in isim)
print("mr." in isim.lower())
print(isim.startswith("Braund"), isim.count("r"), isim.find(","))
```

## split ve join

`split` metni bir ayraca göre parçalayıp liste yapar; `join` listeyi tek metinde birleştirir. SQL'de `SUBSTR` + `INSTR` ile uğraştığın işi çok daha kolay yapar:

```python
soyad, gerisi = isim.split(", ")
unvan = gerisi.split(".")[0]
print(soyad, "|", unvan)
kategoriler = "[ERKEK, COCUK, KADIN]".strip("[]").split(", ")
print(kategoriler)
print(" / ".join(kategoriler))
```

:::ipucu
FLO'daki `[ERKEK, COCUK]` gibi metinleri bu şekilde listeye çevirince `"COCUK" in liste` tam eşleşme arar; SQL'deki `LIKE '%COCUK%'` tuzağına (AKTIFCOCUK'u da yakalama) düşmezsin.
:::

```python
liste = "[AKTIFCOCUK, KADIN]".strip("[]").split(", ")
"COCUK" in "[AKTIFCOCUK, KADIN]", "COCUK" in liste
```
