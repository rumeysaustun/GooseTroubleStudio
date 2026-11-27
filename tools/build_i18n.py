"""
Dil sayfalarını üretir: index.html (Türkçe kaynak) + i18n/<kod>.json -> <kod>/index.html

Kullanım (proje kökünden):
    python tools/build_i18n.py           # sayfaları üretir
    python tools/build_i18n.py --check   # her şey güncel mi diye bakar, dosya yazmaz

index.html hem kaynak hem de Türkçe sayfanın kendisidir. Betik onun yalnızca
işaretli bloklarını (hreflang, dil menüsü) günceller. <kod>/index.html dosyaları
tamamen üretilir; elle düzenlenmez.

Çevrilecek yerler index.html'de şöyle işaretlenir:
    data-i18n="anahtar"                 -> öğenin içeriği (HTML olabilir: <strong>, <em>)
    data-i18n-attr="alt:anahtar;..."    -> öğenin nitelikleri
"""

from __future__ import annotations

import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE_URL = "https://goosetroublestudio.com/"
DEFAULT_LANG = "tr"

# Menüdeki sıra; her dil kendi adıyla yazılır.
LANGUAGES = [
    # kod, ad, og:locale, yazı yönü
    ("ar", "العربية", "ar_AR", "rtl"),
    ("de", "Deutsch", "de_DE", "ltr"),
    ("el", "Ελληνικά", "el_GR", "ltr"),
    ("en", "English", "en_US", "ltr"),
    ("es", "Español", "es_ES", "ltr"),
    ("fr", "Français", "fr_FR", "ltr"),
    ("id", "Bahasa Indonesia", "id_ID", "ltr"),
    ("it", "Italiano", "it_IT", "ltr"),
    ("pt", "Português", "pt_BR", "ltr"),
    ("ro", "Română", "ro_RO", "ltr"),
    ("ru", "Русский", "ru_RU", "ltr"),
    ("tr", "Türkçe", "tr_TR", "ltr"),
    ("zh", "中文", "zh_CN", "ltr"),
]

# Üreteç dışında elle yazılan, site haritasına girecek sayfalar.
EXTRA_PAGES = ["dosya-021/", "afterlight/", "gizlilik/", "en/privacy/"]

VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input",
             "link", "meta", "source", "track", "wbr"}

# Göreli adresler alt klasördeki sayfalarda "../" ile başlamalı.
RELATIVE_URL = re.compile(r'(\s(?:src|href)=")(?!https?:|mailto:|tel:|data:|#|/|\.\./)([^"]*")')


def page_path(code: str) -> str:
    """Sitenin köküne göre sayfa yolu: "" (Türkçe) veya "en/"."""
    return "" if code == DEFAULT_LANG else f"{code}/"


# --------------------------------------------------------------------------
# Çevrilecek öğeleri bulma
# --------------------------------------------------------------------------

class I18nLocator(HTMLParser):
    """data-i18n içeriklerinin ve data-i18n-attr etiketlerinin konumlarını toplar."""

    def __init__(self, source: str):
        super().__init__(convert_charrefs=False)
        self._line_starts = [0]
        for match in re.finditer("\n", source):
            self._line_starts.append(match.end())
        self._stack: list[tuple[str, str | None, int]] = []
        self.contents: list[tuple[int, int, str]] = []    # (başlangıç, bitiş, anahtar)
        self.attr_tags: list[tuple[int, int, str]] = []   # (başlangıç, bitiş, eşlemeler)

    def _offset(self) -> int:
        line, col = self.getpos()
        return self._line_starts[line - 1] + col

    def handle_starttag(self, tag, attrs):
        start = self._offset()
        end = start + len(self.get_starttag_text())
        attrs = dict(attrs)
        if "data-i18n-attr" in attrs:
            self.attr_tags.append((start, end, attrs["data-i18n-attr"]))
        if tag not in VOID_TAGS:
            self._stack.append((tag, attrs.get("data-i18n"), end))

    def handle_startendtag(self, tag, attrs):
        start = self._offset()
        attrs = dict(attrs)
        if "data-i18n-attr" in attrs:
            self.attr_tags.append((start, start + len(self.get_starttag_text()), attrs["data-i18n-attr"]))

    def handle_endtag(self, tag):
        # Kapanmamış öğeleri (ör. <p> içinde unutulmuş) atlayarak eşleşeni bul.
        while self._stack:
            open_tag, key, inner_start = self._stack.pop()
            if open_tag == tag:
                if key:
                    self.contents.append((inner_start, self._offset(), key))
                return


def parse_attr_map(value: str) -> list[tuple[str, str]]:
    pairs = []
    for pair in value.split(";"):
        attr, _, key = pair.partition(":")
        if attr.strip() and key.strip():
            pairs.append((attr.strip(), key.strip()))
    return pairs


def translate(source: str, strings: dict[str, str], missing: set[str]) -> str:
    locator = I18nLocator(source)
    locator.feed(source)
    locator.close()

    edits: list[tuple[int, int, str]] = []

    for start, end, key in locator.contents:
        if key in strings:
            edits.append((start, end, strings[key]))
        else:
            missing.add(key)

    for start, end, mapping in locator.attr_tags:
        tag = source[start:end]
        for attr, key in parse_attr_map(mapping):
            if key not in strings:
                missing.add(key)
                continue
            value = html.escape(strings[key], quote=True)
            tag, count = re.subn(rf'(\s{re.escape(attr)}=")[^"]*(")',
                                 lambda m: m.group(1) + value + m.group(2), tag, count=1)
            if not count:
                raise SystemExit(f'"{attr}" niteliği bulunamadı: {tag}')
        edits.append((start, end, tag))

    # Sondan başa uygula ki konumlar kaymasın; iç içe çeviri olmamalı.
    edits.sort(key=lambda edit: edit[0], reverse=True)
    result = source
    last_start = len(source) + 1
    for start, end, text in edits:
        if end > last_start:
            raise SystemExit("İç içe data-i18n öğeleri desteklenmiyor.")
        result = result[:start] + text + result[end:]
        last_start = start
    return result


# --------------------------------------------------------------------------
# Üretilen bloklar
# --------------------------------------------------------------------------

def replace_block(source: str, name: str, content: str) -> str:
    pattern = re.compile(rf"([ \t]*)<!-- {name}:start -->.*?<!-- {name}:end -->", re.S)
    match = pattern.search(source)
    if not match:
        raise SystemExit(f"index.html içinde <!-- {name}:start --> bloğu yok.")
    indent = match.group(1)
    body = "\n".join(f"{indent}{line}" if line else "" for line in content.splitlines())
    block = f"{indent}<!-- {name}:start -->\n{body}\n{indent}<!-- {name}:end -->"
    return source[:match.start()] + block + source[match.end():]


def head_block(code: str) -> str:
    own_url = SITE_URL + page_path(code)
    lines = [f'<link rel="canonical" href="{own_url}">']
    for other, *_ in LANGUAGES:
        lines.append(f'<link rel="alternate" hreflang="{other}" href="{SITE_URL}{page_path(other)}">')
    lines.append(f'<link rel="alternate" hreflang="x-default" href="{SITE_URL}">')
    locale = next(loc for c, _, loc, _ in LANGUAGES if c == code)
    lines.append(f'<meta property="og:url" content="{own_url}">')
    lines.append(f'<meta property="og:locale" content="{locale}">')
    for other, _, other_locale, _ in LANGUAGES:
        if other != code:
            lines.append(f'<meta property="og:locale:alternate" content="{other_locale}">')
    return "\n".join(lines)


def menu_block(code: str) -> str:
    to_root = "" if code == DEFAULT_LANG else "../"
    lines = []
    for other, name, _, _ in LANGUAGES:
        href = to_root + page_path(other) or "./"
        current = ' aria-current="page"' if other == code else ""
        lines.append(f'<li><a class="lang__option" href="{href}" hreflang="{other}" lang="{other}"{current}>{name}</a></li>')
    return "\n".join(lines)


def render(source: str, code: str, strings: dict[str, str], missing: set[str]) -> str:
    page = source if code == DEFAULT_LANG else translate(source, strings, missing)
    direction = next(d for c, _, _, d in LANGUAGES if c == code)

    page = re.sub(r"<html [^>]*>", f'<html lang="{code}" dir="{direction}">', page, count=1)
    page = re.sub(r"(<span data-lang-current>)[^<]*(</span>)", rf"\g<1>{code.upper()}\g<2>", page, count=1)

    if code != DEFAULT_LANG:
        page = RELATIVE_URL.sub(r"\1../\2", page)
        page = page.replace(
            "<!doctype html>",
            "<!doctype html>\n<!-- OTOMATİK ÜRETİLDİ: düzenleme. index.html ve i18n/*.json'u değiştirip "
            "python tools/build_i18n.py çalıştır. -->",
            1,
        )

    page = replace_block(page, "i18n-head", head_block(code))
    page = replace_block(page, "i18n-menu", menu_block(code))
    return page


def sitemap() -> str:
    paths = [page_path(code) for code, *_ in LANGUAGES] + EXTRA_PAGES
    urls = "\n".join(f"  <url><loc>{SITE_URL}{path}</loc></url>" for path in paths)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            f"{urls}\n</urlset>\n")


# --------------------------------------------------------------------------

def main() -> int:
    check_only = "--check" in sys.argv[1:]
    source = (ROOT / "index.html").read_text(encoding="utf-8")

    outputs: dict[Path, str] = {ROOT / "sitemap.xml": sitemap()}
    problems = []

    for code, *_ in LANGUAGES:
        strings: dict[str, str] = {}
        if code != DEFAULT_LANG:
            strings = json.loads((ROOT / "i18n" / f"{code}.json").read_text(encoding="utf-8"))
        missing: set[str] = set()
        outputs[ROOT / page_path(code) / "index.html"] = render(source, code, strings, missing)
        if missing:
            problems.append(f"{code}: eksik çeviri -> {', '.join(sorted(missing))}")

    stale = [path for path, text in outputs.items()
             if not path.exists() or path.read_text(encoding="utf-8") != text]

    for problem in problems:
        print(problem)

    if check_only:
        for path in stale:
            print(f"güncel değil: {path.relative_to(ROOT).as_posix()}")
        return 1 if stale or problems else 0

    for path in stale:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(outputs[path], encoding="utf-8", newline="\n")
        print(f"yazıldı: {path.relative_to(ROOT).as_posix()}")
    if not stale:
        print("Her şey güncel.")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
