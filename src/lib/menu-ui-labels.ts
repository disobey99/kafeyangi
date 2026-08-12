import type { MenuLocale } from "@/lib/menu-i18n";

export type MenuUiLabels = {
  lang: string;
  onlineOrder: string;
  onlineOrderSub: string;
  atTable: string;
  atTableSub: string;
  scanQrHint: string;
  scanQrDetail: string;
  table: string;
  callWaiter: string;
  waiterSent: string;
  requestBill: string;
  billSent: string;
  orderHistory: string;
  tableNumber: (n: number) => string;
  onlineOrderHeader: (minutes: number) => string;
  unavailable: string;
  notesOptional: string;
  notes: string;
  order: string;
  ordering: string;
  discount: string;
  successTitle: string;
  orderAgain: string;
  takeaway: string;
  delivery: string;
  minOrder: (amount: string) => string;
  minOrderNotMet: (amount: string) => string;
  deliveryFee: string;
  phone: string;
  nameOptional: string;
  address: string;
  payWithPayme: string;
  loyaltyUse: (points: number) => string;
  cancel: string;
  add: string;
  addStandard: string;
  customize: string;
  modifiersOptional: string;
  selectGroup: (name: string) => string;
  minSelect: (n: number) => string;
  connectionError: string;
  genericError: string;
  serviceWithWaiter: string;
  serviceSelf: string;
  serviceWithWaiterHint: (percent: number) => string;
  serviceSelfHint: string;
  billWaitWaiter: string;
  billWaitReady: string;
  readyConfirmTitle: string;
  readyConfirmMessage: (orderNo: string) => string;
  readyConfirmButton: string;
  serviceFee: string;
  sessionClosed: string;
  sessionExpired: string;
  tableBusy: string;
  orderingDisabled: string;
  hubWelcome: string;
  hubBack: string;
  hubOrderFood: string;
  hubOrderFoodSub: string;
  hubLoyalty: string;
  hubLoyaltySub: string;
  hubSocial: string;
  hubSocialSub: string;
  hubLoyaltyTerms: string;
  hubLoyaltyDisabled: string;
  hubCashbackRedeemHint: (period: string) => string;
  hubCheckCashback: string;
  hubPhoneHint: string;
  hubCheck: string;
  hubCashbackBalance: string;
  hubPointsBalance: string;
  hubCanRedeem: string;
  hubCannotRedeemYet: string;
  hubTelegramBot: string;
  hubSocialEmpty: string;
  hubClose: string;
  phoneOptionalLoyalty: string;
  phoneLoyaltyHint: string;
  menuSearch: string;
  menuCategories: string;
  menuAllCategories: string;
  menuCart: string;
  menuFromPrice: string;
  menuEmptyCart: string;
  menuItemsCount: (n: number) => string;
};

const MENU_UI: Record<MenuLocale, MenuUiLabels> = {
  uz: {
    lang: "Til",
    onlineOrder: "Onlayn buyurtma",
    onlineOrderSub: "Yetkazish / olib ketish",
    atTable: "Stolda",
    atTableSub: "Stoldagi QR-kodni skanerlang",
    scanQrHint: "Stolda buyurtma berish",
    scanQrDetail:
      "Stolingizdagi QR-kodni telefon kamerasi bilan skanerlang. Shundan keyin stol raqami avtomatik tanlanadi va buyurtmangiz kassada shu stol uchun ko'rinadi.",
    table: "Stol",
    callWaiter: "Ofitsiant chaqirish",
    waiterSent: "Yuborildi",
    requestBill: "Hisob so'rash",
    billSent: "Hisob so'raldi",
    orderHistory: "Buyurtmalar tarixi",
    tableNumber: (n) => `Stol ${n}`,
    onlineOrderHeader: (m) => `Onlayn buyurtma · ~${m} daqiqa`,
    unavailable: "Mavjud emas",
    notesOptional: "Izoh (ixtiyoriy)",
    notes: "Izoh",
    order: "Buyurtma berish",
    ordering: "Yuborilmoqda...",
    discount: "Chegirma",
    successTitle: "Buyurtma qabul qilindi!",
    orderAgain: "Yana buyurtma",
    takeaway: "Olib ketish",
    delivery: "Yetkazish",
    minOrder: (a) => `Minimal buyurtma: ${a} so'm`,
    minOrderNotMet: (a) => `Minimal summa yetmadi (${a} so'm)`,
    deliveryFee: "Yetkazish",
    phone: "Telefon *",
    nameOptional: "Ismingiz (ixtiyoriy)",
    address: "Yetkazish manzili *",
    payWithPayme: "Payme orqali to'lash",
    loyaltyUse: (p) => `100 ball ishlatish (-10 000 so'm) · sizda ${p} ball`,
    cancel: "Bekor",
    add: "Qo'shish",
  addStandard: "Oddiy (qo'shimchasiz)",
  customize: "Variant",
  modifiersOptional: "ixtiyoriy",
    selectGroup: (name) => `${name} — tanlang`,
    minSelect: (n) => `Kamida ${n} ta tanlov kerak`,
    connectionError: "Ulanish xatosi",
    genericError: "Xatolik",
    serviceWithWaiter: "Ofitsiant bilan",
    serviceSelf: "O'zim olaman",
    serviceWithWaiterHint: (p) => `Ofitsiant xizmati (+${p}% xizmat haqi)`,
    serviceSelfHint: "Ofitsiantsiz — tayyor bo'lgach xabar keladi",
    billWaitWaiter: "Ofitsiant qabul qilgunicha hisob so'ralmaydi",
    billWaitReady: "Taom tayyor bo'lgach hisob so'rashingiz mumkin",
    readyConfirmTitle: "Buyurtmangiz tayyor!",
    readyConfirmMessage: (n) =>
      `#${n} buyurtma tayyor. Olib boring va istalgan vaqtda hisob so'rashingiz mumkin.`,
    readyConfirmButton: "Ko'rdim",
    serviceFee: "Xizmat haqi",
    sessionClosed: "Hisob so'raldi. Stol bo'shguncha yangi buyurtma berib bo'lmaydi.",
    sessionExpired: "Buyurtma berib bo'lmaydi.",
    tableBusy: "Stol band. Boshqa mijoz buyurtma bergan — stol bo'shguncha kuting.",
    orderingDisabled: "Buyurtma berish vaqtincha o'chirilgan",
    hubWelcome: "Xizmat turini tanlang",
    hubBack: "Orqaga",
    hubOrderFood: "Taom buyurtma qilish",
    hubOrderFoodSub: "Menyudan tanlang va buyurtma bering",
    hubLoyalty: "Sodiqlik dasturi",
    hubLoyaltySub: "Keshbek va aksiyalar",
    hubSocial: "Ijtimoiy tarmoqlar",
    hubSocialSub: "Bizni kuzatib boring",
    hubLoyaltyTerms: "Sodiqlik shartlari",
    hubLoyaltyDisabled: "Sodiqlik dasturi hozircha yoqilmagan",
    hubCashbackRedeemHint: (p) =>
      `Keshbek naqd pul emas — to'lovda chegirma sifatida ishlatiladi (${p})`,
    hubCheckCashback: "Keshbekni tekshirish",
    hubPhoneHint: "Buyurtmada kiritilgan telefon yoki Telegram bot orqali",
    hubCheck: "Tekshirish",
    hubCashbackBalance: "Keshbek",
    hubPointsBalance: "Ball",
    hubCanRedeem: "Keshbekni to'lovda ishlatish mumkin",
    hubCannotRedeemYet: "Keshbek keyingi davrda ishlatiladi",
    hubTelegramBot: "Telegram bot orqali ko'rish",
    hubSocialEmpty: "Ijtimoiy tarmoq havolalari hali qo'shilmagan",
    hubClose: "Yopish",
    phoneOptionalLoyalty: "Telefon (keshbek uchun)",
    phoneLoyaltyHint: "Keshbek yig'ish uchun telefon raqamingizni kiriting",
    menuSearch: "Taom qidirish...",
    menuCategories: "Kategoriyalar",
    menuAllCategories: "Hammasi",
    menuCart: "Savatcha",
    menuFromPrice: "dan",
    menuEmptyCart: "Savatcha bo'sh",
    menuItemsCount: (n) => `${n} ta`,
  },
  ru: {
    lang: "Язык",
    onlineOrder: "Онлайн-заказ",
    onlineOrderSub: "Доставка / самовывоз",
    atTable: "За столом",
    atTableSub: "Сканируйте QR-код на столе",
    scanQrHint: "Заказ за столом",
    scanQrDetail:
      "Отсканируйте QR-код на вашем столе камерой телефона. Номер стола подставится автоматически, и заказ появится на кассе для этого стола.",
    table: "Стол",
    callWaiter: "Вызвать официанта",
    waiterSent: "Отправлено",
    requestBill: "Попросить счёт",
    billSent: "Счёт запрошен",
    orderHistory: "История заказов",
    tableNumber: (n) => `Стол ${n}`,
    onlineOrderHeader: (m) => `Онлайн-заказ · ~${m} мин`,
    unavailable: "Нет в наличии",
    notesOptional: "Комментарий (необяз.)",
    notes: "Комментарий",
    order: "Оформить заказ",
    ordering: "Отправка...",
    discount: "Скидка",
    successTitle: "Заказ принят!",
    orderAgain: "Новый заказ",
    takeaway: "Самовывоз",
    delivery: "Доставка",
    minOrder: (a) => `Минимальный заказ: ${a} сум`,
    minOrderNotMet: (a) => `Минимальная сумма не достигнута (${a} сум)`,
    deliveryFee: "Доставка",
    phone: "Телефон *",
    nameOptional: "Ваше имя (необяз.)",
    address: "Адрес доставки *",
    payWithPayme: "Оплатить через Payme",
    loyaltyUse: (p) => `Списать 100 баллов (-10 000 сум) · у вас ${p} баллов`,
    cancel: "Отмена",
    add: "Добавить",
  addStandard: "Обычный (без добавок)",
  customize: "Вариант",
  modifiersOptional: "необяз.",
    selectGroup: (name) => `${name} — выберите`,
    minSelect: (n) => `Выберите минимум ${n}`,
    connectionError: "Ошибка соединения",
    genericError: "Ошибка",
    serviceWithWaiter: "С официантом",
    serviceSelf: "Самообслуживание",
    serviceWithWaiterHint: (p) => `Обслуживание официантом (+${p}% сервис)`,
    serviceSelfHint: "Без официанта — уведомление когда готово",
    billWaitWaiter: "Счёт доступен после принятия официантом",
    billWaitReady: "Счёт можно запросить, когда блюдо готово",
    readyConfirmTitle: "Ваш заказ готов!",
    readyConfirmMessage: (n) =>
      `Заказ #${n} готов. Заберите и запросите счёт, когда закончите.`,
    readyConfirmButton: "Вижу",
    serviceFee: "Сервисный сбор",
    sessionClosed: "Счёт запрошен. Новый заказ возможен, когда стол освободится.",
    sessionExpired: "Оформление заказа недоступно.",
    tableBusy: "Стол занят. Другой гость уже заказал — дождитесь освобождения стола.",
    orderingDisabled: "Оформление заказа временно отключено",
    hubWelcome: "Выберите услугу",
    hubBack: "Назад",
    hubOrderFood: "Заказать еду",
    hubOrderFoodSub: "Выберите из меню и оформите заказ",
    hubLoyalty: "Программа лояльности",
    hubLoyaltySub: "Кешбэк и акции",
    hubSocial: "Соцсети",
    hubSocialSub: "Подписывайтесь на нас",
    hubLoyaltyTerms: "Условия программы",
    hubLoyaltyDisabled: "Программа лояльности пока отключена",
    hubCashbackRedeemHint: (p) =>
      `Кешбэк — не наличные, а скидка при оплате (${p})`,
    hubCheckCashback: "Проверить кешбэк",
    hubPhoneHint: "Телефон из заказа или через Telegram-бота",
    hubCheck: "Проверить",
    hubCashbackBalance: "Кешбэк",
    hubPointsBalance: "Баллы",
    hubCanRedeem: "Кешбэк можно использовать при оплате",
    hubCannotRedeemYet: "Кешбэк будет доступен в следующем периоде",
    hubTelegramBot: "Посмотреть в Telegram-боте",
    hubSocialEmpty: "Ссылки на соцсети ещё не добавлены",
    hubClose: "Закрыть",
    phoneOptionalLoyalty: "Телефон (для кешбэка)",
    phoneLoyaltyHint: "Укажите телефон для накопления кешбэка",
    menuSearch: "Поиск блюда...",
    menuCategories: "Категории",
    menuAllCategories: "Все",
    menuCart: "Корзина",
    menuFromPrice: "от",
    menuEmptyCart: "Корзина пуста",
    menuItemsCount: (n) => `${n} шт.`,
  },
  en: {
    lang: "Language",
    onlineOrder: "Online order",
    onlineOrderSub: "Delivery / pickup",
    atTable: "At table",
    atTableSub: "Scan the QR code on your table",
    scanQrHint: "Order at your table",
    scanQrDetail:
      "Scan the QR code on your table with your phone camera. Your table number is set automatically and your order appears at the cashier for that table.",
    table: "Table",
    callWaiter: "Call waiter",
    waiterSent: "Sent",
    requestBill: "Request bill",
    billSent: "Bill requested",
    orderHistory: "Order history",
    tableNumber: (n) => `Table ${n}`,
    onlineOrderHeader: (m) => `Online order · ~${m} min`,
    unavailable: "Unavailable",
    notesOptional: "Notes (optional)",
    notes: "Notes",
    order: "Place order",
    ordering: "Sending...",
    discount: "Discount",
    successTitle: "Order accepted!",
    orderAgain: "Order again",
    takeaway: "Pickup",
    delivery: "Delivery",
    minOrder: (a) => `Minimum order: ${a} UZS`,
    minOrderNotMet: (a) => `Minimum not reached (${a} UZS)`,
    deliveryFee: "Delivery",
    phone: "Phone *",
    nameOptional: "Your name (optional)",
    address: "Delivery address *",
    payWithPayme: "Pay with Payme",
    loyaltyUse: (p) => `Use 100 points (-10,000 UZS) · you have ${p} points`,
    cancel: "Cancel",
    add: "Add",
  addStandard: "Standard (no extras)",
  customize: "Options",
  modifiersOptional: "optional",
    selectGroup: (name) => `${name} — required`,
    minSelect: (n) => `Pick at least ${n}`,
    connectionError: "Connection error",
    genericError: "Error",
    serviceWithWaiter: "With waiter",
    serviceSelf: "Self-service",
    serviceWithWaiterHint: (p) => `Waiter service (+${p}% service fee)`,
    serviceSelfHint: "No waiter — you'll be notified when ready",
    billWaitWaiter: "Bill available after waiter accepts",
    billWaitReady: "You can request the bill when food is ready",
    readyConfirmTitle: "Your order is ready!",
    readyConfirmMessage: (n) =>
      `Order #${n} is ready. Pick it up and request the bill when you're done.`,
    readyConfirmButton: "Got it",
    serviceFee: "Service fee",
    sessionClosed: "Bill requested. New orders when the table is free.",
    sessionExpired: "Ordering is not available.",
    tableBusy: "Table is occupied. Another guest has ordered — please wait until the table is free.",
    orderingDisabled: "Ordering is temporarily disabled",
    hubWelcome: "Choose a service",
    hubBack: "Back",
    hubOrderFood: "Order food",
    hubOrderFoodSub: "Browse the menu and place an order",
    hubLoyalty: "Loyalty program",
    hubLoyaltySub: "Cashback and promotions",
    hubSocial: "Social media",
    hubSocialSub: "Follow us",
    hubLoyaltyTerms: "Loyalty terms",
    hubLoyaltyDisabled: "Loyalty program is not enabled yet",
    hubCashbackRedeemHint: (p) =>
      `Cashback is not cash — use it as a discount at payment (${p})`,
    hubCheckCashback: "Check cashback",
    hubPhoneHint: "Phone from your order or via Telegram bot",
    hubCheck: "Check",
    hubCashbackBalance: "Cashback",
    hubPointsBalance: "Points",
    hubCanRedeem: "Cashback can be used at payment",
    hubCannotRedeemYet: "Cashback available in the next period",
    hubTelegramBot: "View in Telegram bot",
    hubSocialEmpty: "Social links not added yet",
    hubClose: "Close",
    phoneOptionalLoyalty: "Phone (for cashback)",
    phoneLoyaltyHint: "Enter your phone to earn cashback",
    menuSearch: "Search dishes...",
    menuCategories: "Categories",
    menuAllCategories: "All",
    menuCart: "Cart",
    menuFromPrice: "from",
    menuEmptyCart: "Cart is empty",
    menuItemsCount: (n) => `${n} items`,
  },
};

export function getMenuUiLabels(locale: MenuLocale): MenuUiLabels {
  return MENU_UI[locale];
}
