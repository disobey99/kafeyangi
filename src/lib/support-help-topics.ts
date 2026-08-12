export type SupportHelpTopic = {
  id: string;
  label: string;
  /** true = operator chat ochiladi */
  openChat?: boolean;
  title?: string;
  steps?: string[];
  tip?: string;
};

/** Qo'llab-quvvatlash tezkor savollari (kafe egasi / menejer) */
export const SUPPORT_HELP_TOPICS: SupportHelpTopic[] = [
  {
    id: "receipt",
    label: "Chek chiqmayapti",
    title: "Chek chiqmasa — tekshiring",
    steps: [
      "Printer yoqilgan va qog'oz borligini tekshiring.",
      "USB bo'lsa: oshxona/kassa sahifasi ochiq bo'lsin yoki print-agent ishlasin.",
      "LAN bo'lsa: stansiyada printer IP to'g'ri yozilganini tekshiring.",
      "USB agent: stansiyaga `usb:Printer nomi` yozilgan bo'lishi kerak (masalan: usb:THERMAL 203DPI Printer).",
      "Kompyuterda `npm run print-agent:local` ishlab turganini tekshiring.",
      "Brauzer avto-chop va agent birga yoqilgan bo'lsa — 2 ta chek chiqishi mumkin; birini o'chiring.",
    ],
    tip: "Hali chiqmasa — «Boshqa savol» orqali operatorga yozing: printer nomi va USB/LAN ekanini yozing.",
  },
  {
    id: "payment",
    label: "Payme ni qanday ulayman?",
    title: "Payme ulash",
    steps: [
      "Dashboard → Sozlamalar / To'lovlar bo'limiga kiring.",
      "Payme Merchant ID va kalitni (secret key) kiriting.",
      "Payme ni yoqing (enabled) va saqlang.",
      "Test buyurtma berib, to'lov holatini tekshiring.",
      "Click alohida integratsiya — hozir asosan Payme/naqd/karta ishlaydi.",
    ],
    tip: "Kalitlarni Payme kabinetidan oling. Xato bo'lsa operatorga Merchant ID ni yubormang — faqat xato matnini yozing.",
  },
  {
    id: "branch",
    label: "Filial qanday qo'shaman?",
    title: "Filial qo'shish",
    steps: [
      "Pro tarifda «Ko'p filial» ochiq bo'lishi kerak.",
      "Dashboard → Filiallar (yoki Tarmoq) bo'limiga kiring.",
      "Yangi filial nomini, manzil va telefonni kiriting.",
      "Har filial o'z menyusi / stollari bilan alohida ishlashi mumkin.",
      "Starter/Standard da filial bo'limi ochilmasa — Pro ga o'ting.",
    ],
    tip: "Filial ko'rinmasa — tarifni va login qaysi kafeda ekanini tekshiring.",
  },
  {
    id: "staff",
    label: "Xodim / parol muammosi",
    title: "Xodim va kirish",
    steps: [
      "Dashboard → Xodimlar orqali yangi ofitsiant/kassir qo'shing.",
      "Telefon va parolni xodimga bering — login sahifasidan kiradi.",
      "PIN yoki biometriya Sozlamalar ichidan yoqiladi.",
      "«Parol holati yuklanmadi» bo'lsa — internetni tekshirib, sahifani yangilang.",
      "Eski parol ishlamasa — menejer yangi parol belgilashi mumkin.",
    ],
  },
  {
    id: "menu",
    label: "Menyu / narx yangilanmayapti",
    title: "Menyu yangilanishi",
    steps: [
      "Dashboard → Menyu da mahsulotni saqlaganingizni tekshiring.",
      "Mahsulot «Mavjud» holatida bo'lishi kerak.",
      "Ofitsiant/kassa sahifasini yangilang (F5) yoki chiqib qayta kiring.",
      "Chegirmali narx Ilova sozlamalari / Chegirmalar orqali beriladi.",
    ],
  },
  {
    id: "other",
    label: "Boshqa savol (operator)",
    openChat: true,
  },
];
