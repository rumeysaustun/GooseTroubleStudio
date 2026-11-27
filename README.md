# Goose Trouble Studio

goosetroublestudio.com — stüdyonun tanıtım sitesi: mobil oyunlar ve Feedzi çekiliş aracı.

Derleme adımı olmayan statik site: HTML, CSS ve sade JavaScript.

## Yerelde çalıştırma

```sh
python -m http.server 5500 --bind 127.0.0.1
```

Ardından http://127.0.0.1:5500 adresini aç.

## Yapı

- `index.html` — Türkçe sayfa; aynı zamanda diğer dillerin kaynağı
- `i18n/<dil>.json` — diğer 12 dilin çevirileri
- `<dil>/index.html` — dil sayfaları (`/en/`, `/de/` …); **elle düzenlenmez, üretilir**
- `tools/build_i18n.py` — dil sayfalarını ve `sitemap.xml`'i üretir
- `css/style.css` — tüm stiller, marka renkleri en üstte değişken olarak
- `js/main.js` — dil menüsü, mobil menü, animasyonlar, çekiliş demosu
- `assets/img/` — web için optimize edilmiş görseller

## Çeviriler

Her dilin kendi adresi var; Google her dili ayrı sayfa olarak dizine ekler.
Metinler `index.html` içinde `data-i18n="anahtar"` (içerik) ve
`data-i18n-attr="öznitelik:anahtar"` ile işaretlenir.

Bir metni değiştirdikten ya da yeni metin ekledikten sonra:

1. Aynı anahtarı `i18n/` altındaki 12 dosyanın hepsinde güncelle.
2. Sayfaları yeniden üret:

   ```sh
   python tools/build_i18n.py
   ```

`python tools/build_i18n.py --check` hiçbir şey yazmaz; eksik çeviri ya da
güncel olmayan sayfa varsa söyler.

## Yayın

Cloudflare Pages: framework yok, build komutu yok, çıktı klasörü `/`.
`main` dalına yapılan her push siteyi günceller.
