/**
 * Goose Trouble Studio — site davranışları
 * Bağımlılık yok; her modül ilgili öğe sayfada yoksa sessizce atlanır.
 */
document.documentElement.classList.add("js");

document.addEventListener("DOMContentLoaded", () => {
  initI18n();
  initHeader();
  initMobileNav();
  initReveal();
  initPicker();
  setCurrentYear();
});

/* ==========================================================================
   Çoklu dil
   Türkçe metinler HTML'de durur; diğer diller js/i18n/<kod>.js dosyalarında.
   Bir dil dosyası yalnızca o dil seçildiğinde yüklenir.
   ========================================================================== */

const DEFAULT_LANG = "tr";
const LANG_STORAGE_KEY = "gt-lang";

/** Menüde görünen sıra; her dil kendi adıyla yazılır. */
const LANGUAGES = [
  { code: "ar", name: "العربية", dir: "rtl" },
  { code: "de", name: "Deutsch" },
  { code: "el", name: "Ελληνικά" },
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "id", name: "Bahasa Indonesia" },
  { code: "it", name: "Italiano" },
  { code: "pt", name: "Português" },
  { code: "ro", name: "Română" },
  { code: "ru", name: "Русский" },
  { code: "tr", name: "Türkçe" },
  { code: "zh", name: "中文" },
];

/** HTML'de karşılığı olmayan, yalnızca JS'in gösterdiği Türkçe metinler. */
const JS_ONLY_STRINGS = {
  "tool.mock.again": "Tekrar çek",
};

const locales = (window.GT_LOCALES = window.GT_LOCALES || {});
let currentLang = DEFAULT_LANG;
let latestLanguageRequest = 0;

/** Anahtarın geçerli dildeki metni; eksikse Türkçesi. */
function t(key) {
  return locales[currentLang]?.[key] ?? locales[DEFAULT_LANG]?.[key] ?? "";
}

function initI18n() {
  locales[DEFAULT_LANG] = { ...collectDefaultStrings(), ...JS_ONLY_STRINGS };
  initLangSwitcher();

  const initial = detectLanguage();
  if (initial !== DEFAULT_LANG) setLanguage(initial);
}

/** HTML'deki Türkçe metinleri sözlük olarak toplar; Türkçeye dönüşte buradan yazılır. */
function collectDefaultStrings() {
  const strings = {};
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    strings[el.dataset.i18n] = el.innerHTML.trim();
  });
  forEachTranslatedAttr((el, attr, key) => {
    strings[key] = el.getAttribute(attr);
  });
  return strings;
}

/** data-i18n-attr="alt:anahtar; aria-label:anahtar" biçimindeki nitelikleri dolaşır. */
function forEachTranslatedAttr(callback) {
  document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    el.dataset.i18nAttr.split(";").forEach((pair) => {
      const [attr, key] = pair.split(":").map((part) => part.trim());
      if (attr && key) callback(el, attr, key);
    });
  });
}

function applyTranslations() {
  // Çeviri metinleri yalnızca bu sitenin kendi dosyalarından gelir; <strong>/<em> içerebilir.
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.innerHTML = t(el.dataset.i18n);
  });
  forEachTranslatedAttr((el, attr, key) => el.setAttribute(attr, t(key)));
}

/** Öncelik: ?lang= adresi → kayıtlı seçim → tarayıcı dili → Türkçe. */
function detectLanguage() {
  const candidates = [
    new URLSearchParams(window.location.search).get("lang"),
    readStoredLanguage(),
    ...(navigator.languages || [navigator.language]),
  ];
  for (const candidate of candidates) {
    const code = candidate?.toLowerCase().split("-")[0];
    if (findLanguage(code)) return code;
  }
  return DEFAULT_LANG;
}

function findLanguage(code) {
  return LANGUAGES.find((lang) => lang.code === code);
}

async function setLanguage(code, { remember = false } = {}) {
  const lang = findLanguage(code) ? code : DEFAULT_LANG;
  const request = ++latestLanguageRequest;

  try {
    await loadLocale(lang);
  } catch {
    return; // Dosya yüklenemezse mevcut dilde kalınır.
  }
  if (request !== latestLanguageRequest) return; // Bu arada başka bir dil seçildi.

  currentLang = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = findLanguage(lang).dir || "ltr";
  applyTranslations();
  updateLangSwitcher();
  if (remember) storeLanguage(lang);
}

/** Dil dosyasını <script> ile yükler; dosyayı çift tıklayıp açınca da çalışır. */
function loadLocale(code) {
  if (locales[code]) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `js/i18n/${code}.js`;
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
}

function readStoredLanguage() {
  try {
    return localStorage.getItem(LANG_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeLanguage(code) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, code);
  } catch {
    // Gizli sekme vb. durumlarda seçim hatırlanmaz; site yine çalışır.
  }
}

/** Header'daki dil menüsü. */
function initLangSwitcher() {
  const root = document.querySelector("[data-lang]");
  if (!root) return;

  const toggle = root.querySelector("[data-lang-toggle]");
  const menu = root.querySelector("[data-lang-menu]");

  LANGUAGES.forEach(({ code, name }) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "lang__option";
    option.lang = code;
    option.dataset.langOption = code;
    option.textContent = name;

    const item = document.createElement("li");
    item.append(option);
    menu.append(item);
  });

  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    menu.hidden = !open;
    if (open) menu.querySelector('[aria-current="true"]')?.focus();
  };

  toggle.addEventListener("click", () => setOpen(menu.hidden));

  menu.addEventListener("click", (event) => {
    const option = event.target.closest("[data-lang-option]");
    if (!option) return;
    setLanguage(option.dataset.langOption, { remember: true });
    setOpen(false);
    toggle.focus();
  });

  document.addEventListener("click", (event) => {
    if (!root.contains(event.target)) setOpen(false);
  });

  root.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || menu.hidden) return;
    setOpen(false);
    toggle.focus();
  });

  updateLangSwitcher();
}

function updateLangSwitcher() {
  const current = document.querySelector("[data-lang-current]");
  if (current) current.textContent = currentLang.toUpperCase();

  document.querySelectorAll("[data-lang-option]").forEach((option) => {
    option.setAttribute("aria-current", String(option.dataset.langOption === currentLang));
  });
}

/* ==========================================================================
   Arayüz
   ========================================================================== */

/** Sayfa kaydırıldığında header'a arka plan ekler. */
function initHeader() {
  const header = document.querySelector("[data-header]");
  if (!header) return;

  const update = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
  update();
  window.addEventListener("scroll", update, { passive: true });
}

/** Mobil menüyü açar/kapatır; link tıklaması ve Esc ile kapanır. */
function initMobileNav() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");
  if (!toggle || !nav) return;

  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
  };

  toggle.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
}

/** .reveal öğelerini ekrana girdiklerinde görünür yapar. */
function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  items.forEach((el) => observer.observe(el));
}

/** Demo katılımcılar — tamamen hayali kullanıcı adları. */
const DEMO_ENTRANTS = [
  "@kaz_avcisi", "@pixel.panda", "@gece_kusu", "@limonlu_cay", "@bela_arayan",
  "@tavsan.kafa", "@mor_mantar", "@kahve.bagimlisi", "@sessiz_sinema", "@zar_atan",
];

/**
 * "Kazananı seç" demosu: isimleri hızla karıştırıp yavaşlayarak birinde durur.
 * Hareket azaltma tercihi açıksa doğrudan sonucu gösterir.
 */
function initPicker() {
  const button = document.querySelector("[data-picker]");
  const card = document.querySelector("[data-picker-card]");
  const nameEl = document.querySelector("[data-picker-name]");
  if (!button || !card || !nameEl) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const randomName = () => DEMO_ENTRANTS[Math.floor(Math.random() * DEMO_ENTRANTS.length)];

  const finish = () => {
    nameEl.textContent = randomName();
    card.classList.add("is-picked");
    button.disabled = false;
    // Anahtarı değiştiriyoruz ki dil değişince doğru metin yazılsın.
    button.dataset.i18n = "tool.mock.again";
    button.textContent = t("tool.mock.again");
  };

  button.addEventListener("click", () => {
    button.disabled = true;
    card.classList.remove("is-picked");
    if (reduceMotion) return finish();

    let delay = 40;
    const shuffle = () => {
      nameEl.textContent = randomName();
      delay *= 1.15;
      if (delay > 320) return finish();
      setTimeout(shuffle, delay);
    };
    shuffle();
  });
}

function setCurrentYear() {
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
}
