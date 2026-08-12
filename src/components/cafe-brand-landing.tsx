"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { FaFacebookF, FaInstagram, FaTelegramPlane } from "react-icons/fa";
import { formatPrice } from "@/lib/utils";
import {
  MENU_LOCALE_LABELS,
  pickLocalizedDescription,
  pickLocalizedName,
  type MenuLocale,
} from "@/lib/menu-i18n";
import { CustomerCafeBlockedNotice } from "@/components/customer-cafe-blocked-notice";
import { InstallAppButton } from "@/components/install-app-button";
import { useMenuLocale } from "@/hooks/use-menu-locale";
import type { CafeBlockReason } from "@/lib/cafe-public-access";
import type { CafeBusinessHours } from "@/lib/cafe-business-hours";

type MenuProduct = {
  id: string;
  name: string;
  nameRu?: string | null;
  nameEn?: string | null;
  description?: string | null;
  descriptionRu?: string | null;
  descriptionEn?: string | null;
  price: number;
  discountPrice?: number | null;
  imageUrl: string | null;
  menuTag?: string | null;
};

type BranchCard = {
  id: string;
  name: string;
  slug: string;
  address?: string | null;
  isMainBranch?: boolean;
};

function productOnSale(p: MenuProduct) {
  return (
    p.discountPrice != null &&
    p.discountPrice > 0 &&
    p.discountPrice < p.price
  );
}

function productPayPrice(p: MenuProduct) {
  return productOnSale(p) ? (p.discountPrice as number) : p.price;
}

type MenuCategory = {
  id: string;
  name: string;
  nameRu?: string | null;
  nameEn?: string | null;
  products: MenuProduct[];
};

function normalizeSocialUrl(
  kind: "instagram" | "telegram" | "facebook",
  raw?: string | null,
) {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (kind === "telegram") return `https://t.me/${value.replace(/^@/, "")}`;
  if (kind === "instagram") return `https://instagram.com/${value.replace(/^@/, "")}`;
  return `https://facebook.com/${value}`;
}

function copy(locale: MenuLocale) {
  if (locale === "ru") {
    return {
      navMenu: "Меню",
      navSpace: "Пространство",
      navPlace: "Адрес",
      navContact: "Контакты",
      order: "Заказ",
      orderCta: "Заказать",
      menu: "Меню",
      heroEyebrowFallback: "Ташкент",
      heroTitleA: "Чистый вкус.",
      heroTitleB: "Быстрый заказ.",
      heroLead:
        "QR-заказ со стола — без очереди. Меню, оплата и кухня в одной системе NOOKLINE.",
      menuEyebrow: "Меню",
      menuTitle: "Сегодня в меню",
      orderInApp: "Заказать в приложении",
      qrEyebrow: "QR-заказ",
      qrTitle: "Три шага. Без очереди.",
      qrLead: "Сканируйте QR на столе — меню откроется на телефоне.",
      step1: "Сканируйте",
      step1d: "QR на столе открывает меню кафе в телефоне.",
      step2: "Выберите",
      step2d: "Соберите заказ — стол привяжется автоматически.",
      step3: "Оплатите",
      step3d: "Онлайн или на кассе. Кухня получает заказ сразу.",
      spaceEyebrow: "Пространство",
      spaceTitle: "Атмосфера",
      placeEyebrow: "Адрес",
      placeTitle: "Когда придёте?",
      openNow: "Открыто сейчас",
      reviewsEyebrow: "Отзывы",
      reviewsTitle: "Что говорят гости",
      q1: "«QR-заказ — без очереди, кофе горячий.»",
      q2: "«Удобно для работы. Вкус стабильный.»",
      q3: "«Поставил приложение — возвращаюсь.»",
      appEyebrow: "Приложение",
      appTitle: "Скачать приложение",
      appSub:
        "Быстрое меню, заказ и статус — Android приложение на телефоне.",
      install: "Скачать приложение",
      openApp: "Открыть приложение",
      orderTelegram: "Заказать в Telegram",
      site: "Сайт",
      contact: "Контакты",
      nookBadge: "Сайт создан на платформе NOOKLINE",
      receiptTable: "Стол",
      receiptTotal: "ИТОГО",
      galleryNote: "Иллюстрация",
      branchesEyebrow: "Филиалы",
      branchesTitle: "Другие филиалы",
      branchOpen: "Открыть сайт",
      sale: "Скидка",
      hours: [
        { day: "Пн–Пт", time: "08:00 – 22:00" },
        { day: "Суббота", time: "09:00 – 23:00" },
        { day: "Воскресенье", time: "09:00 – 21:00" },
      ],
      gallery: ["Бар", "Обжарка", "Зал", "Витрина", "Терраса"],
    };
  }
  if (locale === "en") {
    return {
      navMenu: "Menu",
      navSpace: "Space",
      navPlace: "Location",
      navContact: "Contact",
      order: "Order",
      orderCta: "Order now",
      menu: "Menu",
      heroEyebrowFallback: "Tashkent",
      heroTitleA: "Clean taste.",
      heroTitleB: "Fast order.",
      heroLead:
        "Table QR ordering — no queue. Menu, payment and kitchen on NOOKLINE.",
      menuEyebrow: "Menu",
      menuTitle: "On the menu",
      orderInApp: "Order in the app",
      qrEyebrow: "QR order",
      qrTitle: "Three steps. No queue.",
      qrLead: "Scan the table QR — the menu opens on your phone.",
      step1: "Scan",
      step1d: "Table QR opens this cafe’s menu on your phone.",
      step2: "Choose",
      step2d: "Build your cart — the table links automatically.",
      step3: "Pay",
      step3d: "Pay online or at the counter. Kitchen gets it instantly.",
      spaceEyebrow: "Space",
      spaceTitle: "The room",
      placeEyebrow: "Location",
      placeTitle: "When will you visit?",
      openNow: "Open now",
      reviewsEyebrow: "Reviews",
      reviewsTitle: "What guests say",
      q1: "“QR order — no queue, coffee arrives hot.”",
      q2: "“Great for work. Consistent taste.”",
      q3: "“Installed the app — I’m coming back.”",
      appEyebrow: "App",
      appTitle: "Download the app",
      appSub: "Fast menu, orders and status — Android app on your phone.",
      install: "Download app",
      openApp: "Open app",
      orderTelegram: "Order on Telegram",
      site: "Site",
      contact: "Contact",
      nookBadge: "This site was built on NOOKLINE",
      receiptTable: "Table",
      receiptTotal: "TOTAL",
      galleryNote: "Illustrative",
      branchesEyebrow: "Branches",
      branchesTitle: "Other branches",
      branchOpen: "Open site",
      sale: "Sale",
      hours: [
        { day: "Mon–Fri", time: "08:00 – 22:00" },
        { day: "Saturday", time: "09:00 – 23:00" },
        { day: "Sunday", time: "09:00 – 21:00" },
      ],
      gallery: ["Bar", "Roastery", "Seating", "Display", "Terrace"],
    };
  }
  return {
    navMenu: "Menyu",
    navSpace: "Makon",
    navPlace: "Manzil",
    navContact: "Aloqa",
    order: "Buyurtma",
    orderCta: "Buyurtma berish",
    menu: "Menyu",
    heroEyebrowFallback: "Toshkent",
    heroTitleA: "Toza ta’m.",
    heroTitleB: "Tezkor buyurtma.",
    heroLead:
      "Stol QR orqali navbatsiz buyurtma. Menyu, to‘lov va oshxona — NOOKLINE tizimida.",
    menuEyebrow: "Menyu",
    menuTitle: "Bugungi ta’mlar",
    orderInApp: "Ilovada buyurtma",
    qrEyebrow: "QR buyurtma",
    qrTitle: "Uch qadam. Navbatsiz.",
    qrLead: "Stol QR-kodini skanerlang — menyu telefonda ochiladi.",
    step1: "Skanerlang",
    step1d: "Stoldagi QR orqali kafe menyusiga kirasiz.",
    step2: "Tanlang",
    step2d: "Savatni to‘ldiring — stol avtomatik birikadi.",
    step3: "To‘lang",
    step3d: "Onlayn yoki kassada. Oshxona buyurtmani darhol oladi.",
    spaceEyebrow: "Makon",
    spaceTitle: "Ichki muhit",
    placeEyebrow: "Manzil",
    placeTitle: "Qachon kelasiz?",
    openNow: "Ochiq hozir",
    reviewsEyebrow: "Fikrlar",
    reviewsTitle: "Mijozlar nima deydi",
    q1: "“QR bilan buyurtma — navbat yo‘q, issiq keladi.”",
    q2: "“Ishlash uchun qulay. Ta’m barqaror.”",
    q3: "“Ilovani o‘rnatdim — yana kelaman.”",
    appEyebrow: "Ilova",
    appTitle: "Ilovani yuklab oling",
    appSub:
      "Tezkor menyu, buyurtma va holat — telefonda Android ilova.",
    install: "Ilovani yuklab olish",
    openApp: "Ilovani ochish",
    orderTelegram: "Telegramda buyurtma",
    site: "Sayt",
    contact: "Aloqa",
    nookBadge: "Ushbu sayt NOOKLINE platformasida yaratilgan",
    receiptTable: "Stol",
    receiptTotal: "JAMI",
    galleryNote: "Illyustrativ",
    branchesEyebrow: "Filiallar",
    branchesTitle: "Boshqa filiallar",
    branchOpen: "Saytni ochish",
    sale: "Chegirma",
    hours: [
      { day: "Du–Ju", time: "08:00 – 22:00" },
      { day: "Shanba", time: "09:00 – 23:00" },
      { day: "Yakshanba", time: "09:00 – 21:00" },
    ],
    gallery: ["Bar zonasi", "Qovurish", "O‘tirish joyi", "Vitrina", "Terassa"],
  };
}

function paintQr(root: HTMLElement) {
  root.innerHTML = "";
  const size = 9;
  const cells: { x: number; y: number; on: boolean }[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      cells.push({ x, y, on: false });
    }
  }
  const finder = (ox: number, oy: number) => {
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        const edge = x === 0 || y === 0 || x === 2 || y === 2;
        const center = x === 1 && y === 1;
        cells[(oy + y) * size + (ox + x)].on = edge || center;
      }
    }
  };
  finder(0, 0);
  finder(6, 0);
  finder(0, 6);
  for (const c of cells) {
    const inFinder =
      (c.x < 3 && c.y < 3) || (c.x > 5 && c.y < 3) || (c.x < 3 && c.y > 5);
    if (!inFinder) c.on = Math.random() < 0.43;
    const el = document.createElement("i");
    if (c.on) el.className = "on";
    root.appendChild(el);
  }
}

function brandMark(name: string) {
  const part = name.trim().split(/\s+/)[0] || name;
  return part.slice(0, 12).toUpperCase();
}

export function CafeBrandLanding({
  slug,
  cafeName,
  address,
  phone,
  logoUrl,
  coverImageUrl,
  tagline,
  businessHours,
  branches = [],
  groupName = null,
  social,
  menuPrimaryColor,
  categories,
  telegramBotUrl = null,
  blocked = null,
}: {
  slug: string;
  cafeName: string;
  address?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  tagline?: string | null;
  businessHours: CafeBusinessHours;
  branches?: BranchCard[];
  groupName?: string | null;
  social?: {
    instagram?: string | null;
    telegram?: string | null;
    facebook?: string | null;
  };
  menuPrimaryColor?: string | null;
  categories: MenuCategory[];
  telegramBotUrl?: string | null;
  blocked?: CafeBlockReason | null;
}) {
  const { locale, setLocale } = useMenuLocale(slug);
  const t = copy(locale);
  const mark = brandMark(cafeName);
  const appHref = `/c/${slug}/app`;
  const qrRef = useRef<HTMLDivElement>(null);
  const accent = menuPrimaryColor?.trim() || "#d1293d";
  const [activeCatId, setActiveCatId] = useState<string | null>(null);

  const displayHours = useMemo(
    () => [
      { day: t.hours[0]?.day ?? "Du–Ju", time: businessHours.monFri },
      { day: t.hours[1]?.day ?? "Shanba", time: businessHours.sat },
      { day: t.hours[2]?.day ?? "Yakshanba", time: businessHours.sun },
    ],
    [businessHours, t.hours],
  );

  const allProducts = useMemo(
    () => categories.flatMap((c) => c.products),
    [categories],
  );

  const activeCategory = useMemo(() => {
    if (!categories.length) return null;
    const id = activeCatId ?? categories[0]?.id;
    return categories.find((c) => c.id === id) ?? categories[0];
  }, [categories, activeCatId]);

  const receiptItems = useMemo(() => allProducts.slice(0, 3), [allProducts]);
  const receiptTotal = receiptItems.reduce((s, p) => s + productPayPrice(p), 0);

  const galleryItems = useMemo(() => {
    const fromProducts = allProducts
      .filter((p) => p.imageUrl)
      .slice(0, 5)
      .map((p) => ({
        src: p.imageUrl as string,
        label: pickLocalizedName(p, locale),
      }));
    if (coverImageUrl && fromProducts.length < 5) {
      fromProducts.unshift({ src: coverImageUrl, label: cafeName });
    }
    return fromProducts.slice(0, 5);
  }, [allProducts, coverImageUrl, cafeName, locale]);

  useEffect(() => {
    if (qrRef.current) paintQr(qrRef.current);
  }, []);

  useEffect(() => {
    if (categories[0]?.id) setActiveCatId(categories[0].id);
  }, [categories]);

  const locales = Object.keys(MENU_LOCALE_LABELS) as MenuLocale[];
  const lead =
    tagline?.trim() ||
    (locale === "ru"
      ? `${cafeName} — QR-заказ со стола на платформе NOOKLINE.`
      : locale === "en"
        ? `${cafeName} — table QR ordering on the NOOKLINE platform.`
        : `${cafeName} — stol QR buyurtma, NOOKLINE platformasida.`);
  const eyebrow = address?.trim() || t.heroEyebrowFallback;

  const instagram = normalizeSocialUrl("instagram", social?.instagram);
  const telegram = normalizeSocialUrl("telegram", social?.telegram);
  const facebook = normalizeSocialUrl("facebook", social?.facebook);
  const hasSocial = Boolean(instagram || telegram || facebook);

  return (
    <div
      className="mila-site"
      style={{ ["--mila-red" as string]: accent }}
    >
      <div className="mila-wrap">
        <nav className="mila-nav" aria-label="Asosiy">
          <Link className="mila-logo" href={`/c/${slug}`}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="mila-logo-img" />
            ) : null}
            <span>{mark}</span>
          </Link>
          <div className="mila-navlinks">
            <a href="#menu">{t.navMenu}</a>
            <a href="#space">{t.navSpace}</a>
            <a href="#place">{t.navPlace}</a>
            <a href="#contact">{t.navContact}</a>
          </div>
          <div className="mila-nav-actions">
            <div className="mila-langs" aria-label="Til">
              {locales.map((l, i) => (
                <span key={l}>
                  {i > 0 ? <span className="mila-lang-sep">·</span> : null}
                  <button
                    type="button"
                    className={l === locale ? "is-active" : undefined}
                    onClick={() => setLocale(l)}
                  >
                    {MENU_LOCALE_LABELS[l]}
                  </button>
                </span>
              ))}
            </div>
            {!blocked ? (
              <Link className="mila-btn mila-btn-ink" href={appHref}>
                {t.order}
              </Link>
            ) : null}
          </div>
        </nav>

        {blocked ? (
          <div className="mila-block">
            <CustomerCafeBlockedNotice reason={blocked} locale={locale} />
          </div>
        ) : null}

        <header className="mila-hero">
          <div>
            <p className="mila-eyebrow">{eyebrow}</p>
            <h1 className="mila-display">
              {t.heroTitleA}{" "}
              <span className="mila-accent">{t.heroTitleB}</span>
            </h1>
            <p className="mila-lead">{lead}</p>
            {!blocked ? (
              <div className="mila-hero-cta">
                <Link className="mila-btn mila-btn-red" href={appHref}>
                  {t.orderCta}
                </Link>
                {telegramBotUrl ? (
                  <a
                    className="mila-btn mila-btn-outline mila-btn-tg"
                    href={telegramBotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FaTelegramPlane aria-hidden />
                    {t.orderTelegram}
                  </a>
                ) : (
                  <a className="mila-btn mila-btn-outline" href="#menu">
                    {t.menu}
                  </a>
                )}
              </div>
            ) : null}
          </div>

          <div className="mila-receipt-wrap">
            <aside className="mila-receipt" aria-label="Chek">
              <div className="mila-receipt-brand">{mark}</div>
              <div className="mila-receipt-meta">
                {cafeName}
                <br />
                {t.receiptTable}
              </div>
              {receiptItems.length > 0 ? (
                receiptItems.map((p) => (
                  <div key={p.id} className="mila-receipt-line">
                    <span>
                      {pickLocalizedName(p, locale)}
                      {productOnSale(p) ? (
                        <em className="mila-sale-inline"> · {t.sale}</em>
                      ) : null}
                    </span>
                    <span>{formatPrice(productPayPrice(p))}</span>
                  </div>
                ))
              ) : (
                <div className="mila-receipt-line">
                  <span>—</span>
                  <span>—</span>
                </div>
              )}
              <div className="mila-receipt-total">
                <span>{t.receiptTotal}</span>
                <span>
                  {receiptItems.length ? formatPrice(receiptTotal) : "—"}
                </span>
              </div>
              <div className="mila-receipt-qr">
                <div className="mila-qr" ref={qrRef} />
              </div>
              <div className="mila-receipt-foot">/c/{slug}</div>
            </aside>
          </div>
        </header>

        <section className="mila-section" id="menu">
          <div className="mila-section-head">
            <div>
              <p className="mila-eyebrow">{t.menuEyebrow}</p>
              <h2 className="mila-display mila-h2">{t.menuTitle}</h2>
            </div>
            {!blocked ? (
              <Link className="mila-text-link" href={appHref}>
                {t.orderInApp}
              </Link>
            ) : null}
          </div>

          {categories.length > 1 ? (
            <div className="mila-tabs" role="tablist">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={activeCategory?.id === cat.id}
                  className={
                    activeCategory?.id === cat.id
                      ? "mila-tab is-active"
                      : "mila-tab"
                  }
                  onClick={() => setActiveCatId(cat.id)}
                >
                  {pickLocalizedName(cat, locale)}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mila-menu">
            {activeCategory ? (
              <div className="mila-menu-cat">
                {activeCategory.products.map((product) => {
                  const name = pickLocalizedName(product, locale);
                  const description = pickLocalizedDescription(
                    product,
                    locale,
                  );
                  const onSale = productOnSale(product);
                  return (
                    <article key={product.id} className="mila-menu-item">
                      <div className="mila-menu-row">
                        <span className="mila-menu-name">
                          {name}
                          {onSale ? (
                            <span className="mila-sale-badge">{t.sale}</span>
                          ) : null}
                        </span>
                        <span className="mila-menu-dots" aria-hidden />
                        <span className="mila-menu-price">
                          {onSale ? (
                            <>
                              <s className="mila-price-old">
                                {formatPrice(product.price)}
                              </s>{" "}
                              <strong>{formatPrice(product.discountPrice!)}</strong>
                            </>
                          ) : (
                            formatPrice(product.price)
                          )}
                        </span>
                      </div>
                      {description ? (
                        <p className="mila-menu-desc">{description}</p>
                      ) : null}
                    </article>
                  );
                })}
                {activeCategory.products.length === 0 ? (
                  <p className="mila-menu-desc">—</p>
                ) : null}
              </div>
            ) : (
              <p className="mila-menu-desc">—</p>
            )}
          </div>
        </section>
      </div>

      {!blocked ? (
        <section className="mila-qr-section" id="order">
          <div className="mila-wrap">
            <p className="mila-eyebrow">{t.qrEyebrow}</p>
            <h2 className="mila-display mila-h2">{t.qrTitle}</h2>
            <p className="mila-qr-lead">{t.qrLead}</p>
            <div className="mila-stubs">
              <article className="mila-stub">
                <div className="mila-stub-num">01</div>
                <h3>{t.step1}</h3>
                <p>{t.step1d}</p>
              </article>
              <article className="mila-stub">
                <div className="mila-stub-num">02</div>
                <h3>{t.step2}</h3>
                <p>{t.step2d}</p>
              </article>
              <article className="mila-stub">
                <div className="mila-stub-num">03</div>
                <h3>{t.step3}</h3>
                <p>{t.step3d}</p>
              </article>
            </div>
          </div>
        </section>
      ) : null}

      <div className="mila-wrap">
        <section className="mila-section" id="space">
          <div className="mila-section-head">
            <div>
              <p className="mila-eyebrow">{t.spaceEyebrow}</p>
              <h2 className="mila-display mila-h2">{t.spaceTitle}</h2>
            </div>
          </div>
          <div className="mila-gallery">
            {(galleryItems.length > 0
              ? galleryItems
              : t.gallery.map((label, i) => ({
                  src: null as string | null,
                  label,
                  i,
                }))
            ).map((item, i) => {
              const label =
                "label" in item ? item.label : t.gallery[i] ?? "";
              const src = "src" in item ? item.src : null;
              return (
                <div
                  key={`${label}-${i}`}
                  className={`mila-g-cell mila-g${(i % 5) + 1}`}
                  style={
                    src
                      ? {
                          backgroundImage: `linear-gradient(180deg, rgba(22,21,19,0.15), rgba(22,21,19,0.55)), url(${src})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : undefined
                  }
                >
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mila-section" id="place">
          <div className="mila-section-head">
            <div>
              <p className="mila-eyebrow">{t.placeEyebrow}</p>
              <h2 className="mila-display mila-h2">{t.placeTitle}</h2>
            </div>
          </div>
          <div className="mila-place">
            <div>
              {displayHours.map((h) => (
                <div key={h.day} className="mila-hours-row">
                  <span className="mila-day">{h.day}</span>
                  <span className="mila-time">{h.time}</span>
                </div>
              ))}
            </div>
            <div className="mila-stamp-block">
              <div className="mila-stamp" aria-hidden>
                <div>
                  <strong>
                    {t.openNow.split(" ").slice(0, 1).join(" ")}
                    <br />
                    {t.openNow.split(" ").slice(1).join(" ") || " "}
                  </strong>
                </div>
              </div>
              <p className="mila-addr">
                {address ? <b>{address}</b> : <b>{cafeName}</b>}
                {phone ? (
                  <>
                    <br />
                    <a href={`tel:${phone}`}>{phone}</a>
                  </>
                ) : null}
              </p>
              {hasSocial ? (
                <div className="mila-socials">
                  {instagram ? (
                    <a href={instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
                      <FaInstagram />
                    </a>
                  ) : null}
                  {telegram ? (
                    <a href={telegram} target="_blank" rel="noreferrer" aria-label="Telegram">
                      <FaTelegramPlane />
                    </a>
                  ) : null}
                  {facebook ? (
                    <a href={facebook} target="_blank" rel="noreferrer" aria-label="Facebook">
                      <FaFacebookF />
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {branches.length > 0 ? (
          <section className="mila-section" id="branches">
            <div className="mila-section-head">
              <div>
                <p className="mila-eyebrow">{t.branchesEyebrow}</p>
                <h2 className="mila-display mila-h2">
                  {groupName?.trim() || t.branchesTitle}
                </h2>
              </div>
            </div>
            <div className="mila-branches">
              {branches.map((b) => (
                <article key={b.id} className="mila-branch">
                  <div>
                    <h3>{b.name}</h3>
                    {b.address ? <p>{b.address}</p> : null}
                  </div>
                  <Link className="mila-text-link" href={`/c/${b.slug}`}>
                    {t.branchOpen}
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mila-section">
          <div className="mila-section-head">
            <div>
              <p className="mila-eyebrow">{t.reviewsEyebrow}</p>
              <h2 className="mila-display mila-h2">{t.reviewsTitle}</h2>
            </div>
          </div>
          <div className="mila-reviews">
            <blockquote className="mila-quote">
              <p>{t.q1}</p>
              <cite>A.</cite>
            </blockquote>
            <blockquote className="mila-quote">
              <p>{t.q2}</p>
              <cite>B.</cite>
            </blockquote>
            <blockquote className="mila-quote">
              <p>{t.q3}</p>
              <cite>C.</cite>
            </blockquote>
          </div>
        </section>

        {!blocked ? (
          <section className="mila-section" id="app">
            <div className="mila-install">
              <div>
                <p className="mila-eyebrow">{t.appEyebrow}</p>
                <h2 className="mila-display mila-h2">{t.appTitle}</h2>
                <p className="mila-install-sub">{t.appSub}</p>
                <div className="mila-install-actions">
                  <InstallAppButton
                    href={appHref}
                    label={t.install}
                    color={accent}
                    hideHint
                    buttonClassName="mila-btn mila-btn-red"
                  />
                  <Link className="mila-btn mila-btn-outline" href={appHref}>
                    {t.openApp}
                  </Link>
                  {telegramBotUrl ? (
                    <a
                      className="mila-btn mila-btn-outline mila-btn-tg"
                      href={telegramBotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FaTelegramPlane aria-hidden />
                      {t.orderTelegram}
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <footer className="mila-footer" id="contact">
          <div className="mila-footer-top">
            <div>
              <div className="mila-logo">{mark}</div>
              <p className="mila-footer-desc">{lead}</p>
              {hasSocial ? (
                <div className="mila-socials mila-socials-footer">
                  {instagram ? (
                    <a href={instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
                      <FaInstagram />
                    </a>
                  ) : null}
                  {telegram ? (
                    <a href={telegram} target="_blank" rel="noreferrer" aria-label="Telegram">
                      <FaTelegramPlane />
                    </a>
                  ) : null}
                  {facebook ? (
                    <a href={facebook} target="_blank" rel="noreferrer" aria-label="Facebook">
                      <FaFacebookF />
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="mila-footer-cols">
              <div>
                <h4>{t.site}</h4>
                <a href="#menu">{t.navMenu}</a>
                <a href="#space">{t.navSpace}</a>
                <a href="#order">{t.order}</a>
                {branches.length > 0 ? (
                  <a href="#branches">{t.branchesEyebrow}</a>
                ) : null}
                <a href="#app">{t.appEyebrow}</a>
              </div>
              <div>
                <h4>{t.contact}</h4>
                {phone ? <a href={`tel:${phone}`}>{phone}</a> : null}
                {address ? <span className="mila-footer-addr">{address}</span> : null}
              </div>
            </div>
          </div>
          <div className="mila-footer-bottom">
            <span>© {new Date().getFullYear()} {cafeName}</span>
            <a
              className="mila-nook-badge"
              href={
                process.env.NEXT_PUBLIC_APP_URL
                  ? process.env.NEXT_PUBLIC_APP_URL.startsWith("http")
                    ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
                    : `https://${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}`
                  : "https://kafeyangi-avk6.vercel.app"
              }
              target="_blank"
              rel="noopener noreferrer"
              title="NOOKLINE"
            >
              <i /> {t.nookBadge}
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
