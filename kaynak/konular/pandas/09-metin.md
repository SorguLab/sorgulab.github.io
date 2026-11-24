---
baslik: Metin işlemleri
ozet: .str erişimcisi ile tüm sütunda metin işlemleri. contains, replace, split, str.extract ile regex ve explode.
alistirma: python | Metin
---
Bir metin sütununda Python'un metin metotlarını kullanmak için araya `.str` yazılır; işlem tüm satırlara aynı anda uygulanır.

```python titanic satir=4
titanic["Name"].str.upper().head(4)
```

## Sık kullanılan metotlar

```python satir=4
isim = titanic["Name"]
pd.DataFrame({
    "uzunluk": isim.str.len(),
    "Mrs_mi": isim.str.contains("Mrs."),
    "soyad": isim.str.split(",").str[0],
    "kisa": isim.str.slice(0, 10),
}).head(4)
```

`str.split(",")` her satırda bir liste üretir, `.str[0]` listenin ilk elemanını alır.

:::dikkat
`str.contains` varsayılan olarak deseni **regex** sayar. Regex'te `.` "herhangi bir karakter" demek; `contains("Mrs.")` "Mrs" + herhangi bir karakteri arar. Düz metin aramak için `regex=False` ekle. Eksik değer olan sütunlarda `na=False` da ekle, yoksa sonuçta NaN olur ve filtrede hata alırsın.
:::

```python
titanic["Cabin"].str.contains("C", na=False).sum()
```

## str.extract: regex ile parça çıkarmak

Parantezle işaretlediğin kısmı (yakalama grubu) yeni bir sütun olarak çıkarır. İsimden unvan:

```python
titanic["unvan"] = titanic["Name"].str.extract(r",\s*([^\.]+)\.")[0]
titanic["unvan"].value_counts().head(6)
```

Desenin anlamı: virgül, sıfır ya da daha fazla boşluk (`\s*`), nokta olmayan karakterlerden oluşan bir grup (`([^\.]+)`, yakalanan kısım), nokta.

`str.extract` her zaman DataFrame döner (her grup bir sütun); `[0]` ilk sütunu Series olarak alır.

## replace

```python flo satir=3
flo["interested_in_categories_12"].str.replace("[", "", regex=False).str.replace("]", "", regex=False).head(3)
```

## split + explode: listeyi satırlara açmak

FLO'da ilgi alanları tek hücrede liste olarak duruyor. `explode` listedeki her öğe için ayrı bir satır üretir; index tekrar eder, böylece öğenin hangi müşteriye ait olduğu korunur.

```python satir=6
kat = flo["interested_in_categories_12"].str.strip("[]").str.split(", ")
print(kat.head(2).tolist())
acik = kat.explode()
acik.head(6)
```

```python
acik[acik != ""].value_counts()
```

Boş listeden (`[]`) boş metin çıktığı için onu eledik. SQL'de `LIKE '%COCUK%'` ile yaşadığımız AKTIFCOCUK karışıklığı burada yok: her öğe ayrı ve tam karşılaştırılıyor.
