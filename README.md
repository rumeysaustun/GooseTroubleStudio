# Goose Trouble Studio

goosetroublestudio.com — stüdyonun tanıtım sitesi: mobil oyunlar ve Feedzi çekiliş aracı.

Derleme adımı olmayan statik site: HTML, CSS ve sade JavaScript.

## Yerelde çalıştırma

```sh
python -m http.server 5500 --bind 127.0.0.1
```

Ardından http://127.0.0.1:5500 adresini aç.

## Yapı

- `index.html` — sayfa; Türkçe metinler burada (kaynak dil)
- `css/style.css` — tüm stiller, marka renkleri en üstte değişken olarak
- `js/main.js` — dil seçici, menü, animasyonlar, çekiliş demosu
- `js/i18n/<dil>.js` — diğer 12 dilin çevirileri
- `assets/img/` — web için optimize edilmiş görseller

## Çeviriler

Metinler `data-i18n="anahtar"` (içerik) ve `data-i18n-attr="öznitelik:anahtar"` ile işaretlenir.
Türkçe bir metin değişirse ya da yeni metin eklenirse, aynı anahtar `js/i18n/` altındaki
12 dosyanın hepsine eklenmeli. Eksik anahtarlar Türkçeye düşer.

## Yayın

Cloudflare Pages: framework yok, build komutu yok, çıktı klasörü `/`.
`main` dalına yapılan her push siteyi günceller.
