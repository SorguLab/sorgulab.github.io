---
baslik: Koşullar
ozet: if, elif ve else ile karar vermek. Karşılaştırma ve mantık operatörleri, True/False sayılan değerler.
---
`if` bir koşul doğruysa altındaki bloğu çalıştırır. Python'da bloklar **girinti** (genelde 4 boşluk) ile belirlenir; süslü parantez yok.

```python
puan = 78
if puan >= 85:
    print("Pekiyi")
elif puan >= 70:
    print("İyi")
elif puan >= 50:
    print("Orta")
else:
    print("Kaldı")
```

Koşullar yukarıdan aşağı denenir, ilk doğru olan çalışır ve gerisine bakılmaz. SQL'deki `CASE WHEN` ile aynı mantık.

## Karşılaştırma ve mantık operatörleri

| Operatör | Anlamı |
|---|---|
| `==` `!=` | Eşit, eşit değil |
| `<` `<=` `>` `>=` | Küçük, büyük… |
| `and` `or` `not` | Ve, veya, değil |
| `in` / `not in` | İçinde mi? |
| `is None` | Değer yok mu? |

```python
yas = 34
departman = "Sales"
mesai = "Yes"
if departman == "Sales" and mesai == "Yes" and not yas > 40:
    print("Fazla mesai yapan genç satışçı")
print(departman in ["Sales", "Marketing"])
```

:::dikkat
Eşitlik için `==`, atama için `=` kullanılır. `if puan = 80:` sözdizimi hatası verir. Ayrıca Python'da aralık zincirleme yazılabilir: `if 18 <= yas < 60:`.
:::

```python
18 <= yas < 60
```

## True ve False sayılan değerler

`if` sadece `True`/`False` değil, her değeri kabul eder. Boş değerler `False` sayılır:

| False sayılanlar | True sayılanlar |
|---|---|
| `0`, `0.0`, `""`, `[]`, `{}`, `None` | Geri kalan her şey |

```python
sepet = []
if sepet:
    print("Sepette ürün var")
else:
    print("Sepet boş")
bool(0), bool(""), bool("0"), bool([0])
```

`"0"` boş olmayan bir metin, `[0]` boş olmayan bir liste olduğu için ikisi de `True`.

## Tek satırda koşul

Basit iki seçenekli durumlar için:

```python
durum = "Geçti" if puan >= 50 else "Kaldı"
durum
```
