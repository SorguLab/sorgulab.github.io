---
baslik: Eksik veri
ozet: Eksik değerleri bulmak (isnull), atmak (dropna) ve doldurmak (fillna). Grup bazlı doldurma ve eksikliği bilgi olarak kullanmak.
alistirma: python | Eksik Veri
---
pandas eksik değeri `NaN` (sayılarda) ya da `None` olarak gösterir. Gerçek verilerin neredeyse hepsinde eksik değer vardır; nasıl ele alacağın analizin sonucunu değiştirir.

## Eksikleri bulmak

`isnull()` her hücre için True/False döner; `.sum()` sütun başına sayar, `.mean()` oranı verir.

```python titanic
titanic.isnull().sum()
```

```python
oran = (titanic.isnull().mean() * 100).round(2)
oran[oran > 0].sort_values(ascending=False)
```

Üç sütunda eksik var, her biri farklı strateji ister.

## Atmak: dropna

```python
print(len(titanic.dropna()))
print(len(titanic.dropna(subset=["Age"])))
```

:::dikkat
`dropna()` tek başına, **herhangi bir** sütunu eksik olan satırı atar. Titanic'te bu, 891 yolcudan 708'ini silmek demek (Cabin yüzünden). Hangi sütuna göre atacağını `subset` ile söyle.
:::

## Doldurmak: fillna

Sabit bir değerle, ortalamayla, medyanla ya da en sık değerle (mod) doldurulabilir.

```python
liman_mod = titanic["Embarked"].mode()[0]
print(liman_mod)
titanic["Embarked"] = titanic["Embarked"].fillna(liman_mod)
titanic["Embarked"].isnull().sum()
```

`mode()` birden fazla mod olabileceği için Series döner; `[0]` ilkini alır.

## Grup bazlı doldurma

Tüm eksik yaşları genel ortalamayla (~30) doldurmak, eksik yaşlı küçük bir çocuğu 30 yaşında yapar. Daha iyisi benzer yolcuların değeriyle doldurmak. Örneğin unvana göre medyan:

```python
titanic["unvan"] = titanic["Name"].str.extract(r",\s*([^\.]+)\.")[0]
medyan = titanic.groupby("unvan")["Age"].transform("median")
print(medyan.head(4).tolist())
titanic["Age_dolu"] = titanic["Age"].fillna(medyan)
titanic.loc[titanic["Age"].isnull(), ["Name", "unvan", "Age_dolu"]].head(4)
```

`transform("median")` her satıra kendi grubunun medyanını yayar; satır sayısı değişmez. Bu yüzden `fillna`'ya doğrudan verilebilir. Eksik yaşlı "Master" (erkek çocuk) 3,5 ile doldu, "Mr" 30 ile.

## Eksikliği bilgi olarak kullanmak

Cabin'in %77'si eksik; doldurmaya çalışmak anlamsız. Ama eksikliğin kendisi bir şey söylüyor olabilir:

```python
titanic["kabin_var"] = titanic["Cabin"].notnull().astype(int)
titanic.groupby("kabin_var")["Survived"].mean().round(3)
```

Kabin kaydı olanların hayatta kalma oranı iki katından fazla: kabin kaydı çoğunlukla 1. sınıf yolcular için tutulmuş. Eksiklik rastgele değilse, "eksik mi?" bayrağı güçlü bir değişken olur.
