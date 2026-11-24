---
baslik: Birleştirme
ozet: merge ile tabloları ortak anahtarla birleştirmek (SQL JOIN), how türleri, indicator ile eşleşme kontrolü ve concat.
alistirma: python | Birleştirme
---
`merge`, SQL'deki `JOIN`'in pandas karşılığı.

```python northwind satir=5
siparis = Orders.merge(Customers, on="CustomerID")
siparis[["OrderID", "CompanyName", "Country"]].head(5)
```

## how: birleştirme türü

| `how=` | SQL karşılığı | Ne tutar |
|---|---|---|
| `"inner"` (varsayılan) | `INNER JOIN` | İki tabloda da eşleşenler |
| `"left"` | `LEFT JOIN` | Soldakilerin hepsi |
| `"right"` | `RIGHT JOIN` | Sağdakilerin hepsi |
| `"outer"` | `FULL OUTER JOIN` | İki taraftakilerin hepsi |

```python
print(len(Customers.merge(Orders, on="CustomerID", how="inner")))
print(len(Customers.merge(Orders, on="CustomerID", how="left")))
```

Fark 2 satır: hiç sipariş vermemiş 2 müşteri `left` birleştirmede `OrderID`'si boş olarak kaldı.

## indicator: kim nereden geldi?

`indicator=True` her satırın iki tabloda da mı, sadece birinde mi bulunduğunu gösteren bir `_merge` sütunu ekler. Anti-join (eşleşmeyenleri bulmak) için kullanışlı:

```python
m = Customers.merge(Orders[["CustomerID", "OrderID"]], on="CustomerID", how="left", indicator=True)
m.loc[m["_merge"] == "left_only", ["CompanyName", "_merge"]]
```

## Farklı adlı anahtarlar

İki tabloda anahtar sütunun adı farklıysa `left_on` / `right_on`:

```python satir=4
calisan = Employees[["EmployeeID", "FirstName", "ReportsTo"]]
yonetici = Employees[["EmployeeID", "FirstName"]]
calisan.merge(yonetici, left_on="ReportsTo", right_on="EmployeeID", how="left",
              suffixes=("", "_yonetici"))[["FirstName", "FirstName_yonetici"]].head(4)
```

Bu bir self-join: tablo kendisiyle birleşti. Aynı adlı sütunlar çakışınca pandas `_x`, `_y` ekler; `suffixes` ile anlamlı adlar verdik.

## Zincirleme birleştirme ve gruplama

Sipariş kalemleri → ürünler → kategoriler, sonra kategori başına ciro:

```python
d = (OrderDetails
     .merge(Products[["ProductID", "CategoryID"]], on="ProductID")
     .merge(Categories[["CategoryID", "CategoryName"]], on="CategoryID"))
d["tutar"] = d["UnitPrice"] * d["Quantity"] * (1 - d["Discount"])
d.groupby("CategoryName")["tutar"].sum().round(2).sort_values(ascending=False).head(4)
```

:::dikkat
Birleştirmeden sonra satır sayısını kontrol et. Anahtar bir tarafta tekrar ediyorsa satırlar çoğalır (fan-out) ve sonraki toplamlar şişer. `validate="one_to_one"` ya da `"many_to_one"` parametresi beklenmeyen tekrar olursa hata vererek seni uyarır.
:::

```python hata
Orders.merge(OrderDetails, on="OrderID", validate="one_to_one")
```

## concat: alt alta eklemek

Aynı sütunlara sahip tabloları alt alta (ya da `axis=1` ile yan yana) ekler. SQL'deki `UNION ALL`:

```python
ocak = pd.DataFrame({"urun": ["A", "B"], "adet": [10, 4]})
subat = pd.DataFrame({"urun": ["A", "C"], "adet": [7, 9]})
pd.concat([ocak, subat], ignore_index=True)
```
