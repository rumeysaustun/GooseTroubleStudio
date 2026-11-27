/**
 * Goose Trouble Studio — site davranışları
 * Bağımlılık yok; her modül ilgili öğe sayfada yoksa sessizce atlanır.
 */
document.documentElement.classList.add("js");

document.addEventListener("DOMContentLoaded", () => {
  initLanguage();
  initHeader();
  initMobileNav();
  initReveal();
  initPicker();
  setCurrentYear();
});

/* ==========================================================================
   Çoklu dil
   Her dilin kendi sayfası var (/ Türkçe, /en/, /de/ …); sayfalar önceden çevrilmiş
   gelir. Burada yalnızca dil menüsü ve hatırlanan dil seçimi yönetilir.
   ========================================================================== */

const DEFAULT_LANG = "tr";
const LANG_STORAGE_KEY = "gt-lang";

function initLanguage() {
  const links = [...document.querySelectorAll("[data-lang-menu] a[hreflang]")];
  if (!links.length) return;

  if (redirectToChosenLanguage(links)) return;
  initLangSwitcher(links);
}

/**
 * Ana sayfaya (Türkçe) gelen biri daha önce başka bir dil seçtiyse o dilin sayfasına gönderilir.
 * Eski ?lang=xx bağlantıları da burada karşılanır. Tarayıcı diline göre otomatik yönlendirme
 * bilerek yapılmaz: Google ana sayfayı İngilizce tarayıcıyla gezer ve Türkçe sayfayı göremezdi.
 */
function redirectToChosenLanguage(links) {
  if (document.documentElement.lang !== DEFAULT_LANG) return false;

  const requested = new URLSearchParams(window.location.search).get("lang") || readStoredLanguage();
  const target = links.find((link) => link.hreflang === requested);
  if (!target || target.hreflang === DEFAULT_LANG) return false;

  window.location.replace(target.href + window.location.hash);
  return true;
}

/** Header'daki dil menüsü; seçenekler sıradan bağlantılardır, seçim hatırlanır. */
function initLangSwitcher(links) {
  const root = document.querySelector("[data-lang]");
  const toggle = root.querySelector("[data-lang-toggle]");
  const menu = root.querySelector("[data-lang-menu]");

  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    menu.hidden = !open;
    if (open) menu.querySelector('[aria-current="page"]')?.focus();
  };

  toggle.addEventListener("click", () => setOpen(menu.hidden));

  links.forEach((link) => {
    link.addEventListener("click", () => storeLanguage(link.hreflang));
  });

  document.addEventListener("click", (event) => {
    if (!root.contains(event.target)) setOpen(false);
  });

  root.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || menu.hidden) return;
    setOpen(false);
    toggle.focus();
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
    if (button.dataset.labelAgain) button.textContent = button.dataset.labelAgain;
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
