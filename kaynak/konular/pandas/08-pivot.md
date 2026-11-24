---
baslik: Pivot ve yeniden şekillendirme
ozet: pivot_table, crosstab, unstack ve melt ile tabloyu uzun biçimden geniş biçime (ve tersine) çevirmek.
---
Aynı veri iki biçimde tutulabilir:

- **Uzun (long):** Her satır bir gözlem: `sınıf | cinsiyet | oran`. Gruplama ve grafik için uygun.
- **Geniş (wide):** Bir değişkenin değerleri sütunlara yayılmış: satırlarda sınıf, sütunlarda cinsiyet. İnsan gözüyle okumak için uygun.

## pivot_table

Excel'deki pivot tablonun karşılığı. `index` satırlar, `columns` sütunlar, `values` hücrelerdeki değer, `aggfunc` hesap.

```python titanic
pd.pivot_table(titanic, index="Pclass", columns="Sex", values="Survived", aggfunc="mean").round(3)
```

`margins=True` satır ve sütun toplamlarını ekler:

```python
pd.pivot_table(titanic, index="Pclass", columns="Sex", values="PassengerId", aggfunc="count", margins=True, margins_name="Toplam")
```

## crosstab: çapraz frekans tablosu

İki kategorik değişkenin kombinasyonlarını sayar. `normalize` ile oranlara çevrilir: `"index"` satır yüzdesi, `"columns"` sütun yüzdesi, `True` genel yüzde.

```python
pd.crosstab(titanic["Pclass"], titanic["Embarked"])
```

```python
(pd.crosstab(titanic["Pclass"], titanic["Embarked"], normalize="columns") * 100).round(1)
```

Okunuşu: Cherbourg'dan binenlerin %50,6'sı 1. sınıf; Queenstown'dan binenlerin %93,5'i 3. sınıf. `normalize="columns"` dediğimiz için her sütun 100'e tamamlanıyor.

## unstack ve stack

`groupby` ile iki sütuna göre gruplanmış bir sonucu `unstack()` geniş biçime çevirir; `stack()` tersini yapar.

```python
uzun = titanic.groupby(["Pclass", "Sex"])["Fare"].median()
uzun
```

```python
genis = uzun.unstack()
genis
```

## melt: geniş → uzun

Sütunlara yayılmış değerleri tekrar satırlara indirir. Grafik kütüphaneleri ve `groupby` genelde uzun biçimi ister.

```python
genis.reset_index().melt(id_vars="Pclass", var_name="Sex", value_name="medyan_ucret")
```

:::ipucu
Hangisini kullanacağına karar vermek için sor: "Bu tabloyu kim okuyacak?" İnsan okuyacaksa geniş, kod işleyecekse uzun biçim genellikle daha uygun.
:::
