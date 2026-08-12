import type { MenuLocale } from "@/lib/menu-i18n";

export type DeliveryUiLabels = {
  homeTab: string;
  ordersTab: string;
  menuTab: string;
  profileTab: string;
  salom: string;
  greetingGuest: string;
  todayQuestion: string;
  enterAddress: string;
  takeawayPrompt: string;
  deliveryAddressTitle: string;
  takeawayNotesTitle: string;
  minutesShort: string;
  searchPlaceholder: (name: string) => string;
  announcementsTitle: string;
  categoriesTitle: string;
  allCategories: string;
  menuEmpty: string;
  recommendedTitle: string;
  noRecommendations: string;
  moreLabel: string;
  som: string;
  personalInfo: string;
  namePlaceholder: string;
  phonePlaceholder: string;
  profileHint: string;
  loyaltyTitle: string;
  checkButton: string;
  myBalance: string;
  loading: string;
  cashback: string;
  points: string;
  pointsDiscount: (pts: number, discount: string) => string;
  loyaltyTermsHint: string;
  canRedeemCashback: string;
  noBalanceYet: string;
  orderTypeTitle: string;
  delivery: string;
  takeaway: string;
  addressTitle: string;
  addressPlaceholder: string;
  addressPickerHint: string;
  noSavedAddresses: string;
  addNewAddress: string;
  saveAddress: string;
  deleteAddress: string;
  confirmDeleteAddress: string;
  useCurrentLocation: string;
  updateGps: string;
  setGps: string;
  gpsSaved: (lat: number, lng: number) => string;
  gpsSuccess: string;
  gpsFallbackHint: string;
  supportTitle: string;
  supportCall: string;
  supportHint: string;
  languageTitle: string;
  appearanceTitle: string;
  themeLight: string;
  themeDark: string;
  themeSystem: string;
  securityTitle: string;
  appLockTitle: string;
  appLockEnabled: string;
  appLockDesc: string;
  reSetup: string;
  setup: string;
  delete: string;
  modeTitle: string;
  switchMode: string;
  logoutTitle: string;
  favoritesTitle: string;
  favoritesCount: (n: number) => string;
  favoritesEmpty: string;
  customerTab: string;
  courierTab: string;
  welcomeTitle: string;
  customerWelcomeSub: string;
  customerLoginSub: string;
  customerRegisterSub: string;
  phoneLabel: string;
  phoneError: string;
  networkError: string;
  continueBtn: string;
  registerTitle: string;
  registerSub: string;
  fullNameLabel: string;
  fullNamePlaceholder: string;
  deliveryAddressLabel: string;
  addressPlaceholderLogin: string;
  gpsLocationLabel: string;
  gpsSuccessLabel: string;
  gpsCaptureBtn: string;
  gpsCapturing: string;
  gpsError: string;
  registerBtn: string;
  courierWelcomeSub: string;
  emailLabel: string;
  passwordLabel: string;
  confirmPasswordLabel: string;
  loginBtn: string;
  courierError: string;
  courierNotForCafe: string;
  customerLoginError: string;
  passwordRequired: string;
  passwordMin: string;
  passwordMismatch: string;
  nameRequired: string;
  emailRequired: string;
  registerFailed: string;
  noAccountRegister: string;
  haveAccountLogin: string;
  onlineOrderingSystem: string;
  noFavoritesYet: string;
  favoritesHint: string;
  confirmRemove: (name: string) => string;
  removeFromFavorites: string;
  orderNow: string;
  noOrdersYet: string;
  unlockTitle: string;
  setupSubtitle: string;
  pinPlaceholder: string;
  confirmPinPlaceholder: string;
  pinLengthError: string;
  pinMismatchError: string;
  incorrectPin: string;
  saveBtn: string;
  unlockBtn: string;
  bioBtn: string;
  bioConnectBtn: string;
  bioConnectedAlert: string;
  bioError: string;
  bioUnlockError: string;
  connectBioFirst: string;
  specialOffer: string;
  goToMenu: string;
  later: string;
  canCloseAnytime: string;
  courierOrdersTitle: string;
  refreshBtn: string;
  todayLabel: string;
  ordersCountLabel: string;
  ratingLabel: string;
  noRatingsYet: string;
  ratingsCount: (n: number) => string;
  salesLabel: string;
  notOnDuty: string;
  upcomingSectionTitle: string;
  upcomingSectionEmpty: string;
  mineSectionTitle: string;
  mineSectionEmpty: string;
  availableSectionTitle: string;
  availableSectionEmpty: string;
  etaModalTitle: string;
  etaModalDesc: string;
  minutesLabel: (n: number) => string;
  noEtaLabel: string;
  cancelBtn: string;
  historyTitle: string;
  historySubtitle: (date: string) => string;
  clearFilterTitle: string;
  noHistoryFound: string;
  noHistoryYet: string;
  paymentLabel: string;
  paidLabel: string;
  unpaidLabel: string;
  cashMethod: string;
  cardMethod: string;
  paymeMethod: string;
  waitingArrivalDesc: string;
  customerLabel: string;
  distanceToCafe: string;
  distanceToCustomer: string;
  callLabel: string;
  commentLabel: string;
  customerRatingLabel: string;
  deliveredLabel: string;
  etaSetLabel: (n: number) => string;
};

const DELIVERY_UI: Record<MenuLocale, DeliveryUiLabels> = {
  uz: {
    homeTab: "Bosh",
    ordersTab: "Buyurtma",
    menuTab: "Menyu",
    profileTab: "Profil",
    salom: "Salom",
    greetingGuest: "mehmon",
    todayQuestion: "Bugun nima buyurtma qilamiz?",
    enterAddress: "Manzilni kiriting ›",
    takeawayPrompt: "Olib ketish ›",
    deliveryAddressTitle: "Yetkazish manzili",
    takeawayNotesTitle: "Olib ketish izohi (ixtiyoriy)",
    minutesShort: "daq",
    searchPlaceholder: (name) => `${name} dan qidirish…`,
    announcementsTitle: "E'lonlar va Yangiliklar",
    categoriesTitle: "Bo'limlar",
    allCategories: "Barchasi",
    menuEmpty: "Menyu hali bo'sh",
    recommendedTitle: "Tavsiya etamiz",
    noRecommendations: "Hozircha tavsiyalar yo'q",
    moreLabel: "Ko'proq",
    som: "so'm",
    personalInfo: "Shaxsiy ma'lumot",
    namePlaceholder: "Ism",
    phonePlaceholder: "Telefon",
    profileHint: "Buyurtmada ism va telefon avtomatik to'ldiriladi. Shu raqam sodiqlik dasturi bilan bir xil.",
    loyaltyTitle: "Kuponlar / sodiqlik",
    checkButton: "Tekshirish",
    myBalance: "Mening balansom",
    loading: "Yuklanmoqda…",
    cashback: "Keshbek",
    points: "Ball",
    pointsDiscount: (pts, discount) => `${pts} ball — ${discount} so'm chegirma olish mumkin.`,
    loyaltyTermsHint: "100 ball = 10 000 so'm chegirma. Online yoki kafeda bir xil hisob.",
    canRedeemCashback: " Keshbekni to'lovda ishlatishingiz mumkin.",
    noBalanceYet: "Hali balans yo'q — buyurtma berganingizda kupon yig'iladi.",
    orderTypeTitle: "Buyurtma turi",
    delivery: "Yetkazish",
    takeaway: "Olib ketish",
    addressTitle: "Manzil",
    addressPlaceholder: "Yetkazish manzili",
    addressPickerHint: "Buyurtmada shu manzil ishlatiladi",
    noSavedAddresses: "Hali saqlangan manzil yo'q",
    addNewAddress: "Qo'lda manzil yozish",
    saveAddress: "Saqlash",
    deleteAddress: "Manzilni o'chirish",
    confirmDeleteAddress: "Bu manzilni o'chirib tashlamoqchimisiz?",
    useCurrentLocation: "Joriy joyimni aniqlash",
    updateGps: "Joylashuvni yangilash (GPS)",
    setGps: "Yetkazish nuqtasini GPS bilan belgilash",
    gpsSaved: (lat, lng) => `GPS saqlandi: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    gpsSuccess: "Joylashuv bor — yetkazuvchi masofani ko'radi",
    gpsFallbackHint: "GPS bo'lmasa, masofa taxminiy (kafegacha) bo'lishi mumkin",
    supportTitle: "Qo'llab-quvvatlash",
    supportCall: "Qo'ng'iroq qilish",
    supportHint: "Savol yoki muammo bo'lsa — kafega qo'ng'iroq qiling",
    languageTitle: "Til",
    appearanceTitle: "Ko'rinish",
    themeLight: "Kun",
    themeDark: "Tun",
    themeSystem: "Avto",
    securityTitle: "Xavfsizlik",
    appLockTitle: "Ilova qulfi",
    appLockEnabled: "(yoqilgan)",
    appLockDesc: "PIN va barmoq izi / Face ID — ilovani qayta ochganda so'raladi.",
    reSetup: "Qayta sozlash",
    setup: "O'rnatish",
    delete: "O'chirish",
    modeTitle: "Rejim",
    switchMode: "Rejimni almashtirish",
    logoutTitle: "Profilni o'chirish (Chiqish)",
    favoritesTitle: "Saralangan taomlar",
    favoritesCount: (n) => `${n} ta sevimli taom saqlangan`,
    favoritesEmpty: "Hozircha bo'sh",
    customerTab: "Mijoz",
    courierTab: "Kuryer",
    welcomeTitle: "Xush kelibsiz!",
    customerWelcomeSub: "Telefon raqamingizni kiriting va buyurtma berishni boshlang",
    customerLoginSub: "Telefon va parol bilan kiring",
    customerRegisterSub: "Ism, Gmail, telefon va parol — kafe egasi emas, mijoz hisobi",
    phoneLabel: "Telefon raqamingiz",
    phoneError: "Telefon raqamini to'liq kiriting",
    networkError: "Tarmoq xatosi, qayta urinib ko'ring",
    continueBtn: "Davom etish",
    registerTitle: "Ro'yxatdan o'tish",
    registerSub: "Iltimos, ma'lumotlaringizni to'ldiring",
    fullNameLabel: "To'liq ismingiz",
    fullNamePlaceholder: "Ism va familiya",
    deliveryAddressLabel: "Yetkazib berish manzili",
    addressPlaceholderLogin: "Ko'cha, uy, xonadon...",
    gpsLocationLabel: "GPS joylashuv (ixtiyoriy)",
    gpsSuccessLabel: "GPS joylashuv muvaffaqiyatli olindi!",
    gpsCaptureBtn: "GPS joylashuvni aniqlash",
    gpsCapturing: "Aniqlanmoqda...",
    gpsError: "GPS joylashuvni olish imkoni bo'lmadi",
    registerBtn: "Ro'yxatdan o'tish",
    courierWelcomeSub: "Kuryer tizimiga kirish uchun email va parolingizni kiriting",
    emailLabel: "Email (Gmail)",
    passwordLabel: "Parol",
    confirmPasswordLabel: "Parolni tasdiqlang",
    loginBtn: "Tizimga kirish",
    courierError: "Email yoki parol noto'g'ri",
    courierNotForCafe: "Bu hisob ushbu kafeda kuryer emas",
    customerLoginError: "Telefon yoki parol noto'g'ri",
    passwordRequired: "Parolni kiriting",
    passwordMin: "Parol kamida 6 ta belgidan iborat bo'lsin",
    passwordMismatch: "Parollar mos emas",
    nameRequired: "Ismingizni kiriting",
    emailRequired: "Gmail / email manzilini kiriting",
    registerFailed: "Ro'yxatdan o'tishda xatolik",
    noAccountRegister: "Hisobingiz yo'qmi? Ro'yxatdan o'ting",
    haveAccountLogin: "Allaqachon hisobingiz bormi? Kirish",
    onlineOrderingSystem: "Onlayn buyurtma tizimi",
    noFavoritesYet: "Sizda hali saralangan taom yo'q",
    favoritesHint: "Bosh sahifadagi taomlar burchagidagi yurakchani bosib, sevimli taomlaringizni qo'shishingiz mumkin.",
    confirmRemove: (name) => `"${name}" taomini saralanganlardan o'chirmoqchimisiz?`,
    removeFromFavorites: "Sevimlilardan o'chirish",
    orderNow: "Buyurtma berish",
    noOrdersYet: "Hali buyurtma yo'q. Menyudan tanlab savatga qo'shing.",
    unlockTitle: "Qulfni oching",
    setupSubtitle: "PIN va ixtiyoriy barmoq izi / Face ID",
    pinPlaceholder: "PIN",
    confirmPinPlaceholder: "Qayta PIN",
    pinLengthError: "Kamida 4 raqam",
    pinMismatchError: "Parollar mos emas",
    incorrectPin: "Noto'g'ri parol",
    saveBtn: "Saqlash",
    unlockBtn: "Ochish",
    bioBtn: "Barmoq izi",
    bioConnectBtn: "Barmoq izini ulash",
    bioConnectedAlert: "Barmoq izi ulandi",
    bioError: "Biometriya ulanmadi",
    bioUnlockError: "Barmoq izi ishlamadi",
    connectBioFirst: "Avval barmoq izini ulang",
    specialOffer: "Maxsus taklif",
    goToMenu: "Menyuga o'tish",
    later: "Keyinroq",
    canCloseAnytime: "Istalgan vaqtda yopishingiz mumkin",
    courierOrdersTitle: "Buyurtmalar",
    refreshBtn: "Yangilash",
    todayLabel: "Bugun",
    ordersCountLabel: "zakaz",
    ratingLabel: "Reyting",
    noRatingsYet: "baho yo'q",
    ratingsCount: (n) => `${n} baho`,
    salesLabel: "Savdo",
    notOnDuty: "Siz ishda emassiz — yangi buyurtmalar ko'rinmaydi.",
    upcomingSectionTitle: "Kelishi kutilmoqda",
    upcomingSectionEmpty: "Hozircha oshxonada buyurtma yo'q",
    mineSectionTitle: "Mening yo'lim",
    mineSectionEmpty: "Hozircha yo'lda buyurtma yo'q",
    availableSectionTitle: "Tayyor — oling",
    availableSectionEmpty: "Olish uchun tayyor buyurtma yo'q",
    etaModalTitle: "Yetkazish vaqti",
    etaModalDesc: "Mijozga buyurtma taxminan necha daqiqada yetib borishini belgilang. Bu ma'lumot mijoz ekranida ko'rinadi:",
    minutesLabel: (n) => `${n} daqiqa`,
    noEtaLabel: "Belgilamaslik",
    cancelBtn: "Bekor qilish",
    historyTitle: "Tarix",
    historySubtitle: (date) => date ? `${date} kunidagi buyurtmalar` : "Yakunlangan yetkazishlar (14 kun)",
    clearFilterTitle: "Filtrni tozalash",
    noHistoryFound: "Ushbu sanada buyurtmalar topilmadi",
    noHistoryYet: "Hozircha yakunlangan buyurtma yo'q",
    paymentLabel: "To'lov",
    paidLabel: "To'langan",
    unpaidLabel: "To'lanmagan",
    cashMethod: "Naqd pul",
    cardMethod: "Karta (Terminal)",
    paymeMethod: "Payme",
    waitingArrivalDesc: "Buyurtma kelishi kutilmoqda — tayyorlaning",
    customerLabel: "Mijoz",
    distanceToCafe: " (kafegacha)",
    distanceToCustomer: " (mijozgacha)",
    callLabel: "Qo'ng'iroq",
    commentLabel: "Izoh",
    customerRatingLabel: "Mijoz bahosi",
    deliveredLabel: "Yetkazildi",
    etaSetLabel: (n) => `Belgilangan vaqt: ${n} daqiqa`,
  },
  ru: {
    homeTab: "Главная",
    ordersTab: "Заказы",
    menuTab: "Меню",
    profileTab: "Профиль",
    salom: "Привет",
    greetingGuest: "гость",
    todayQuestion: "Что закажем сегодня?",
    enterAddress: "Введите адрес ›",
    takeawayPrompt: "Самовывоз ›",
    deliveryAddressTitle: "Адрес доставки",
    takeawayNotesTitle: "Комментарий к самовывозу (необяз.)",
    minutesShort: "мин",
    searchPlaceholder: (name) => `Поиск в ${name}…`,
    announcementsTitle: "Объявления и Новости",
    categoriesTitle: "Разделы",
    allCategories: "Все",
    menuEmpty: "Меню пока пусто",
    recommendedTitle: "Рекомендуем",
    noRecommendations: "Рекомендаций пока нет",
    moreLabel: "Больше",
    som: "сум",
    personalInfo: "Личная информация",
    namePlaceholder: "Имя",
    phonePlaceholder: "Телефон",
    profileHint: "Имя и телефон будут автоматически подставляться в заказ. Этот номер совпадает с программой лояльности.",
    loyaltyTitle: "Купоны / лояльность",
    checkButton: "Проверить",
    myBalance: "Мой баланс",
    loading: "Загрузка…",
    cashback: "Кешбэк",
    points: "Баллы",
    pointsDiscount: (pts, discount) => `${pts} баллов — можно получить скидку ${discount} сум.`,
    loyaltyTermsHint: "100 баллов = 10 000 сум скидки. Одинаково онлайн или в кафе.",
    canRedeemCashback: " Вы можете использовать кешбэк при оплате.",
    noBalanceYet: "Баланса пока нет — купоны будут накапливаться при заказах.",
    orderTypeTitle: "Тип заказа",
    delivery: "Доставка",
    takeaway: "Самовывоз",
    addressTitle: "Адрес",
    addressPlaceholder: "Адрес доставки",
    addressPickerHint: "В заказе будет использован этот адрес",
    noSavedAddresses: "Пока нет сохранённых адресов",
    addNewAddress: "Ввести адрес вручную",
    saveAddress: "Сохранить",
    deleteAddress: "Удалить адрес",
    confirmDeleteAddress: "Удалить этот адрес?",
    useCurrentLocation: "Определить моё местоположение",
    updateGps: "Обновить геопозицию (GPS)",
    setGps: "Указать точку доставки по GPS",
    gpsSaved: (lat, lng) => `GPS сохранен: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    gpsSuccess: "Геопозиция есть — курьер увидит расстояние",
    gpsFallbackHint: "Без GPS расстояние может быть неточным (до кафе)",
    supportTitle: "Поддержка",
    supportCall: "Позвонить",
    supportHint: "Есть вопрос — позвоните в кафе",
    languageTitle: "Язык",
    appearanceTitle: "Оформление",
    themeLight: "День",
    themeDark: "Ночь",
    themeSystem: "Авто",
    securityTitle: "Безопасность",
    appLockTitle: "Блокировка приложения",
    appLockEnabled: "(включено)",
    appLockDesc: "PIN и отпечаток пальца / Face ID — запрашиваются при повторном открытии.",
    reSetup: "Перенастроить",
    setup: "Настроить",
    delete: "Удалить",
    modeTitle: "Режим",
    switchMode: "Сменить режим",
    logoutTitle: "Удалить профиль (Выйти)",
    favoritesTitle: "Избранные блюда",
    favoritesCount: (n) => `${n} избранных блюд сохранено`,
    favoritesEmpty: "Пока пусто",
    customerTab: "Клиент",
    courierTab: "Курьер",
    welcomeTitle: "Добро пожаловать!",
    customerWelcomeSub: "Введите номер телефона и начните заказывать",
    customerLoginSub: "Войдите по телефону и паролю",
    customerRegisterSub: "Имя, Gmail, телефон и пароль — это аккаунт клиента, не кафе",
    phoneLabel: "Номер телефона",
    phoneError: "Введите номер телефона полностью",
    networkError: "Ошибка сети, попробуйте еще раз",
    continueBtn: "Продолжить",
    registerTitle: "Регистрация",
    registerSub: "Пожалуйста, заполните ваши данные",
    fullNameLabel: "Полное имя",
    fullNamePlaceholder: "Имя и фамилия",
    deliveryAddressLabel: "Адрес доставки",
    addressPlaceholderLogin: "Улица, дом, квартира...",
    gpsLocationLabel: "GPS геопозиция (необяз.)",
    gpsSuccessLabel: "GPS геопозиция успешно получена!",
    gpsCaptureBtn: "Определить по GPS",
    gpsCapturing: "Определение...",
    gpsError: "Не удалось получить GPS геопозицию",
    registerBtn: "Зарегистрироваться",
    courierWelcomeSub: "Введите email и пароль для входа в систему курьера",
    emailLabel: "Email (Gmail)",
    passwordLabel: "Пароль",
    confirmPasswordLabel: "Подтвердите пароль",
    loginBtn: "Войти в систему",
    courierError: "Неверный email или пароль",
    courierNotForCafe: "Этот аккаунт не является курьером этого кафе",
    customerLoginError: "Неверный телефон или пароль",
    passwordRequired: "Введите пароль",
    passwordMin: "Пароль не менее 6 символов",
    passwordMismatch: "Пароли не совпадают",
    nameRequired: "Введите имя",
    emailRequired: "Введите Gmail / email",
    registerFailed: "Ошибка регистрации",
    noAccountRegister: "Нет аккаунта? Зарегистрируйтесь",
    haveAccountLogin: "Уже есть аккаунт? Войти",
    onlineOrderingSystem: "Система онлайн-заказов",
    noFavoritesYet: "У вас пока нет избранных блюд",
    favoritesHint: "Вы можете добавить любимые блюда, нажав на сердечко в углу блюда на главной странице.",
    confirmRemove: (name) => `Хотите удалить блюдо "${name}" из избранного?`,
    removeFromFavorites: "Удалить из избранного",
    orderNow: "Заказать",
    noOrdersYet: "Заказов пока нет. Выберите из меню и добавьте в корзину.",
    unlockTitle: "Разблокировать",
    setupSubtitle: "PIN и по желанию отпечаток пальца / Face ID",
    pinPlaceholder: "ПИН",
    confirmPinPlaceholder: "Повторите ПИН",
    pinLengthError: "Минимум 4 цифры",
    pinMismatchError: "Пароли не совпадают",
    incorrectPin: "Неверный пароль",
    saveBtn: "Сохранить",
    unlockBtn: "Открыть",
    bioBtn: "Отпечаток пальца",
    bioConnectBtn: "Подключить отпечаток пальца",
    bioConnectedAlert: "Отпечаток пальца подключен",
    bioError: "Не удалось подключить биометрию",
    bioUnlockError: "Отпечаток пальца не сработал",
    connectBioFirst: "Сначала подключите отпечаток пальца",
    specialOffer: "Специальное предложение",
    goToMenu: "Перейти к меню",
    later: "Позже",
    canCloseAnytime: "Вы можете закрыть в любое время",
    courierOrdersTitle: "Заказы",
    refreshBtn: "Обновить",
    todayLabel: "Сегодня",
    ordersCountLabel: "заказов",
    ratingLabel: "Рейтинг",
    noRatingsYet: "нет оценок",
    ratingsCount: (n) => `${n} оценок`,
    salesLabel: "Продажи",
    notOnDuty: "Вы не на работе — новые заказы не видны.",
    upcomingSectionTitle: "Ожидается прибытие",
    upcomingSectionEmpty: "Пока на кухне нет заказов",
    mineSectionTitle: "Мой путь",
    mineSectionEmpty: "Пока в пути нет заказов",
    availableSectionTitle: "Готово — забирайте",
    availableSectionEmpty: "Нет готовых заказов для выдачи",
    etaModalTitle: "Время доставки",
    etaModalDesc: "Укажите, примерно через сколько минут заказ будет доставлен клиенту. Эта информация отобразится на экране клиента:",
    minutesLabel: (n) => `${n} минут`,
    noEtaLabel: "Не указывать",
    cancelBtn: "Отмена",
    historyTitle: "История",
    historySubtitle: (date) => date ? `Заказы за ${date}` : "Завершенные доставки (14 дней)",
    clearFilterTitle: "Очистить фильтр",
    noHistoryFound: "Заказы на эту дату не найдены",
    noHistoryYet: "Пока нет завершенных заказов",
    paymentLabel: "Оплата",
    paidLabel: "Оплачено",
    unpaidLabel: "Не оплачено",
    cashMethod: "Наличные",
    cardMethod: "Карта (Терминал)",
    paymeMethod: "Payme",
    waitingArrivalDesc: "Ожидается прибытие заказа — готовьтесь",
    customerLabel: "Клиент",
    distanceToCafe: " (до кафе)",
    distanceToCustomer: " (до клиента)",
    callLabel: "Звонок",
    commentLabel: "Комментарий",
    customerRatingLabel: "Оценка клиента",
    deliveredLabel: "Доставлено",
    etaSetLabel: (n) => `Установленное время: ${n} мин`,
  },
  en: {
    homeTab: "Home",
    ordersTab: "Orders",
    menuTab: "Menu",
    profileTab: "Profile",
    salom: "Hello",
    greetingGuest: "guest",
    todayQuestion: "What are we ordering today?",
    enterAddress: "Enter address ›",
    takeawayPrompt: "Takeaway ›",
    deliveryAddressTitle: "Delivery address",
    takeawayNotesTitle: "Takeaway note (optional)",
    minutesShort: "min",
    searchPlaceholder: (name) => `Search in ${name}…`,
    announcementsTitle: "Announcements & News",
    categoriesTitle: "Categories",
    allCategories: "All",
    menuEmpty: "Menu is empty",
    recommendedTitle: "We recommend",
    noRecommendations: "No recommendations yet",
    moreLabel: "More",
    som: "som",
    personalInfo: "Personal info",
    namePlaceholder: "Name",
    phonePlaceholder: "Phone",
    profileHint: "Name and phone will be auto-filled in orders. This number matches the loyalty program.",
    loyaltyTitle: "Coupons / loyalty",
    checkButton: "Check",
    myBalance: "My balance",
    loading: "Loading…",
    cashback: "Cashback",
    points: "Points",
    pointsDiscount: (pts, discount) => `${pts} points — you can get a discount of ${discount} som.`,
    loyaltyTermsHint: "100 points = 10,000 som discount. Same online or in cafe.",
    canRedeemCashback: " You can use cashback for payment.",
    noBalanceYet: "No balance yet — coupons will accumulate when you order.",
    orderTypeTitle: "Order type",
    delivery: "Delivery",
    takeaway: "Takeaway",
    addressTitle: "Address",
    addressPlaceholder: "Delivery address",
    addressPickerHint: "This address will be used for the order",
    noSavedAddresses: "No saved addresses yet",
    addNewAddress: "Enter address manually",
    saveAddress: "Save",
    deleteAddress: "Delete address",
    confirmDeleteAddress: "Delete this address?",
    useCurrentLocation: "Use my current location",
    updateGps: "Update location (GPS)",
    setGps: "Set delivery point by GPS",
    gpsSaved: (lat, lng) => `GPS saved: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    gpsSuccess: "Location saved — courier will see distance",
    gpsFallbackHint: "Without GPS, distance may be estimated (to cafe)",
    supportTitle: "Support",
    supportCall: "Call",
    supportHint: "Questions? Call the cafe",
    languageTitle: "Language",
    appearanceTitle: "Appearance",
    themeLight: "Day",
    themeDark: "Night",
    themeSystem: "Auto",
    securityTitle: "Security",
    appLockTitle: "App lock",
    appLockEnabled: "(enabled)",
    appLockDesc: "PIN and fingerprint / Face ID — requested upon reopening.",
    reSetup: "Reconfigure",
    setup: "Setup",
    delete: "Delete",
    modeTitle: "Mode",
    switchMode: "Switch mode",
    logoutTitle: "Delete profile (Logout)",
    favoritesTitle: "Favorite dishes",
    favoritesCount: (n) => `${n} favorite dishes saved`,
    favoritesEmpty: "Empty for now",
    customerTab: "Customer",
    courierTab: "Courier",
    welcomeTitle: "Welcome!",
    customerWelcomeSub: "Enter your phone number and start ordering",
    customerLoginSub: "Sign in with phone and password",
    customerRegisterSub: "Name, Gmail, phone and password — customer account, not cafe owner",
    phoneLabel: "Phone number",
    phoneError: "Enter complete phone number",
    networkError: "Network error, please try again",
    continueBtn: "Continue",
    registerTitle: "Registration",
    registerSub: "Please fill in your details",
    fullNameLabel: "Full name",
    fullNamePlaceholder: "First and last name",
    deliveryAddressLabel: "Delivery address",
    addressPlaceholderLogin: "Street, house, apartment...",
    gpsLocationLabel: "GPS location (optional)",
    gpsSuccessLabel: "GPS location successfully captured!",
    gpsCaptureBtn: "Determine by GPS",
    gpsCapturing: "Determining...",
    gpsError: "Failed to get GPS location",
    registerBtn: "Register",
    courierWelcomeSub: "Enter email and password to log into the courier system",
    emailLabel: "Email (Gmail)",
    passwordLabel: "Password",
    confirmPasswordLabel: "Confirm password",
    loginBtn: "Log in",
    courierError: "Incorrect email or password",
    courierNotForCafe: "This account is not a courier for this cafe",
    customerLoginError: "Incorrect phone or password",
    passwordRequired: "Enter password",
    passwordMin: "Password must be at least 6 characters",
    passwordMismatch: "Passwords do not match",
    nameRequired: "Enter your name",
    emailRequired: "Enter Gmail / email",
    registerFailed: "Registration failed",
    noAccountRegister: "No account? Register",
    haveAccountLogin: "Already have an account? Sign in",
    onlineOrderingSystem: "Online ordering system",
    noFavoritesYet: "You don't have any favorite dishes yet",
    favoritesHint: "You can add favorite dishes by clicking the heart in the corner of the dish on the home page.",
    confirmRemove: (name) => `Do you want to remove "${name}" from favorites?`,
    removeFromFavorites: "Remove from favorites",
    orderNow: "Order now",
    noOrdersYet: "No orders yet. Select from the menu and add to cart.",
    unlockTitle: "Unlock",
    setupSubtitle: "PIN and optional fingerprint / Face ID",
    pinPlaceholder: "PIN",
    confirmPinPlaceholder: "Confirm PIN",
    pinLengthError: "At least 4 digits",
    pinMismatchError: "Passwords do not match",
    incorrectPin: "Incorrect password",
    saveBtn: "Save",
    unlockBtn: "Unlock",
    bioBtn: "Fingerprint",
    bioConnectBtn: "Connect fingerprint",
    bioConnectedAlert: "Fingerprint connected",
    bioError: "Failed to connect biometrics",
    bioUnlockError: "Fingerprint failed",
    connectBioFirst: "Connect fingerprint first",
    specialOffer: "Special offer",
    goToMenu: "Go to menu",
    later: "Later",
    canCloseAnytime: "You can close at any time",
    courierOrdersTitle: "Orders",
    refreshBtn: "Refresh",
    todayLabel: "Today",
    ordersCountLabel: "orders",
    ratingLabel: "Rating",
    noRatingsYet: "no ratings",
    ratingsCount: (n) => `${n} ratings`,
    salesLabel: "Sales",
    notOnDuty: "You are not on duty — new orders are not visible.",
    upcomingSectionTitle: "Expected to arrive",
    upcomingSectionEmpty: "No orders in the kitchen yet",
    mineSectionTitle: "My active route",
    mineSectionEmpty: "No orders on route yet",
    availableSectionTitle: "Ready — take",
    availableSectionEmpty: "No ready orders to pick up",
    etaModalTitle: "Delivery time",
    etaModalDesc: "Specify approximately how many minutes it will take to deliver the order to the customer. This information will appear on the customer's screen:",
    minutesLabel: (n) => `${n} minutes`,
    noEtaLabel: "Do not specify",
    cancelBtn: "Cancel",
    historyTitle: "History",
    historySubtitle: (date) => date ? `Orders for ${date}` : "Completed deliveries (14 days)",
    clearFilterTitle: "Clear filter",
    noHistoryFound: "No orders found for this date",
    noHistoryYet: "No completed orders yet",
    paymentLabel: "Payment",
    paidLabel: "Paid",
    unpaidLabel: "Unpaid",
    cashMethod: "Cash",
    cardMethod: "Card (Terminal)",
    paymeMethod: "Payme",
    waitingArrivalDesc: "Order arrival expected — get ready",
    customerLabel: "Customer",
    distanceToCafe: " (to cafe)",
    distanceToCustomer: " (to customer)",
    callLabel: "Call",
    commentLabel: "Comment",
    customerRatingLabel: "Customer rating",
    deliveredLabel: "Delivered",
    etaSetLabel: (n) => `Set time: ${n} min`,
  },
};

export function getDeliveryUiLabels(locale: MenuLocale): DeliveryUiLabels {
  return DELIVERY_UI[locale] || DELIVERY_UI.uz;
}
