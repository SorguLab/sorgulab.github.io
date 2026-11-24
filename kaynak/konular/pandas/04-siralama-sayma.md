---
baslik: Sıralama ve sayma
ozet: sort_values ile sıralama, value_counts ile frekans ve oran, nlargest / nsmallest.
---
## sort_values

Bir ya da birden fazla sütuna göre sıralar. `ascending=False` azalan sıra.

```python titanic satir=5
titanic.sort_values("Fare", ascending=False)[["Name", "Pclass", "Fare"]].head(5)
```

Birden fazla sütunda her biri için yön ayrı verilir. Eşit değerlerde sıra belirsiz olmasın diye ikinci kriter ekle:

```python satir=5
titanic.sort_values(["Fare", "PassengerId"], ascending=[False, True])[["PassengerId", "Name", "Fare"]].head(5)
```

:::dikkat
`sort_values` yeni bir DataFrame döner, orijinali değiştirmez. Sıralı hali kullanacaksan bir değişkene ata. (`inplace=True` parametresi de var ama artık önerilmiyor.)
:::

## value_counts: frekans tablosu

Bir sütundaki her değerin kaç kez geçtiğini, çoktan aza sıralı verir. Veriyi tanımanın en hızlı yolu.

```python
titanic["Embarked"].value_counts()
```

`normalize=True` sayılar yerine oranları verir:

```python
(titanic["Survived"].value_counts(normalize=True) * 100).round(2)
```

:::not
`value_counts()` varsayılan olarak eksik değerleri saymaz. Onları da görmek için `dropna=False`.
:::

```python
titanic["Embarked"].value_counts(dropna=False)
```

## Birden fazla sütunun kombinasyonları

```python
titanic[["Pclass", "Sex"]].value_counts().sort_index()
```

## nlargest ve nsmallest

"En büyük n" için sıralayıp `head` almanın kısa yolu:

```python northwind satir=5
Products.nlargest(5, "UnitPrice")[["ProductName", "UnitPrice"]]
```

```python satir=3
Products.nsmallest(3, "UnitsInStock")[["ProductName", "UnitsInStock"]]
```

Stokta 0 olan beş ürün var ama `nsmallest(3)` sadece ilk üçünü gösterir. Eşitlerin hepsini istiyorsan `keep="all"` ekle.

## sort_index

Index'e göre sıralar. `value_counts` sonucunu çoktan aza değil, değer sırasına göre görmek için kullanışlı:

```python titanic
(titanic["SibSp"] + titanic["Parch"] + 1).value_counts().sort_index()
```
