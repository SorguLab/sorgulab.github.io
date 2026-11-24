---
baslik: Tarih işlemleri
ozet: to_datetime ile tarihe çevirmek, .dt ile parça çıkarmak, iki tarih arası fark (Timedelta), tarih filtreleme ve resample.
alistirma: python | Tarih
---
## Tarih tipine çevirmek

Dosyadan okunan tarihler çoğu zaman metin (`object`) olarak gelir. Gün farkı, ay çıkarma gibi işlemler için önce `pd.to_datetime` ile tarih tipine çevrilmeli.

```python
metin = pd.Series(["2021-05-30", "2020-12-01", "bozuk"])
pd.to_datetime(metin, errors="coerce")
```

`errors="coerce"` tarihe çevrilemeyen değerleri `NaT` (tarihin NaN'ı) yapar; vermezsen hata alırsın.

:::not
SorguLab'de `YYYY-MM-DD` biçimindeki sütunlar otomatik olarak tarih tipinde yüklenir. Kendi verinde `pd.read_csv(..., parse_dates=["sutun"])` ile okurken çevirebilirsin.
:::

```python flo
flo.filter(like="date").dtypes
```

## .dt ile parça çıkarmak

```python satir=4
t = flo["last_order_date"]
pd.DataFrame({"tarih": t, "yil": t.dt.year, "ay": t.dt.month, "gun_adi": t.dt.day_name(), "ay_basi": t.dt.to_period("M")}).head(4)
```

## İki tarih arası fark

İki tarihin farkı bir `Timedelta`'dır; `.dt.days` gün sayısını verir. Recency (son alışverişten bu yana geçen gün), sabit bir analiz tarihine göre:

```python
analiz = pd.Timestamp("2021-06-01")
flo["recency"] = (analiz - flo["last_order_date"]).dt.days
flo["omur_gun"] = (flo["last_order_date"] - flo["first_order_date"]).dt.days
flo[["recency", "omur_gun"]].describe().round(1)
```

## Tarihle filtreleme

Tarih sütunu metinle karşılaştırılabilir; pandas metni tarihe çevirir.

```python
ilk_2021 = flo[(flo["first_order_date"] >= "2021-01-01") & (flo["first_order_date"] < "2021-02-01")]
len(ilk_2021)
```

## Aylık özet: resample ve to_period

Zaman serisini aylık, haftalık gibi dönemlere toplar. `resample` için tarih sütunu index olmalı:

```python northwind
aylik = Orders.set_index("OrderDate").resample("ME")["OrderID"].count()
aylik.head(6)
```

Aynı sonucu `groupby` ile de alabilirsin:

```python satir=6
Orders.groupby(Orders["OrderDate"].dt.to_period("M"))["OrderID"].count().head(6)
```

:::ipucu
`resample` boş dönemleri de 0 olarak gösterir; `groupby` sadece verisi olan dönemleri gösterir. Grafik çizerken boşlukların görünmesi önemliyse `resample` kullan.
:::
