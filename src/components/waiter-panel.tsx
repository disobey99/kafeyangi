"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  CheckCircle2,
  History,
  Minus,
  Plus,
  ShoppingBag,
  UtensilsCrossed,
  Menu,
  X,
  Eye,
  EyeOff,
  Settings,
  Lock,
  LogOut,
  Globe,
  ArrowLeft,
  User,
  Search,
  ChevronRight,
  ArrowLeftRight,
  Shield,
} from "lucide-react";
import { WaiterCallsBanner } from "@/components/waiter-calls-banner";
import { PendingWaiterAssignmentBanner } from "@/components/pending-waiter-assignment";
import { WaiterHistory } from "@/components/waiter-history";
import { ProductMenuImage } from "@/components/product-menu-image";
import { StaffBiometricSettings } from "@/components/staff-biometric-settings";
import { ShiftSwapPanel } from "@/components/shift-swap-panel";
import {
  disableOrderSound,
  enableOrderSound,
  isOrderSoundEnabled,
} from "@/lib/order-notifications";
import { playNewOrderAlert } from "@/lib/new-order-alert";
import {
  isPushSupported,
  subscribeCafePush,
} from "@/lib/push-client";
import { useOffline } from "@/hooks/use-offline";
import { useHardwareBackHandler } from "@/hooks/use-hardware-back";
import {
  addPendingAction,
  getMenuCache,
  getOpenTablesCache,
  saveMenuCache,
  saveOpenTablesCache,
} from "@/lib/offline-store";
import { formatPrice, cafeRoleLabel } from "@/lib/utils";
import { computeOrderTotals } from "@/lib/waiter-service-fee";
import {
  ProductModifierPicker,
  type ModifierGroup,
} from "@/components/product-modifier-picker";
import { hasModifierGroups, mustPickModifiersBeforeAdd } from "@/lib/modifiers";
import { FloorZoneTabs } from "@/components/floor-zone-tabs";
import { TableOrderManager } from "@/components/table-order-manager";
import {
  TABLE_ZONE_LABELS,
  TABLE_ZONE_ORDER,
  tableZoneLabel,
  type TableZone,
} from "@/lib/table-zones";
import { ThemeToggle } from "@/components/theme-toggle";
import { lockStaffScreen } from "@/lib/staff-pin-client";
import { AppNotificationsBell } from "@/components/app-notifications-bell";
import { StaffChatWidget } from "@/components/staff-chat-widget";
import { TrustedDevicesPanel } from "@/components/trusted-devices-panel";

type Table = {
  id: string;
  number: number;
  name: string | null;
  status: string;
  zone?: TableZone;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  modifierGroups?: ModifierGroup[];
};

type Category = {
  id: string;
  name: string;
  products: Product[];
};

type CartItem = {
  key: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  modifierOptionIds: string[];
};

function getAvatarColor(name: string) {
  const colors = [
    "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400",
    "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
    "bg-pink-50 text-pink-600 dark:bg-pink-950/30 dark:text-pink-400",
    "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
    "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
    "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400",
    "bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400",
  ];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

type PanelTab = "order" | "history" | "settings" | "profile";
type SettingsSection = "home" | "security" | "shift";

const TABLE_STATUS: Record<string, string> = {
  FREE: "Bo'sh",
  OCCUPIED: "Band",
  RESERVED: "Band qilingan",
  BILL_REQUESTED: "Hisob so'ralgan",
};

function getLocalizedTableStatus(status: string, locale: string) {
  const map: Record<string, Record<string, string>> = {
    uz: {
      FREE: "Bo'sh",
      OCCUPIED: "Band",
      RESERVED: "Band qilingan",
      BILL_REQUESTED: "Hisob so'ralgan",
    },
    ru: {
      FREE: "Свободен",
      OCCUPIED: "Занят",
      RESERVED: "Забронирован",
      BILL_REQUESTED: "Счет запрошен",
    },
    en: {
      FREE: "Free",
      OCCUPIED: "Busy",
      RESERVED: "Reserved",
      BILL_REQUESTED: "Bill requested",
    }
  };
  return map[locale]?.[status] ?? map.uz[status] ?? status;
}

const TABLE_STATUS_STYLE: Record<
  string,
  { border: string; background: string; badge: string }
> = {
  FREE: {
    border: "rgba(34, 197, 94, 0.45)",
    background: "rgba(34, 197, 94, 0.12)",
    badge: "text-emerald-600 dark:text-emerald-400",
  },
  OCCUPIED: {
    border: "var(--dp-accent)",
    background: "var(--dp-accent-soft)",
    badge: "text-[var(--dp-accent)]",
  },
  RESERVED: {
    border: "rgba(59, 130, 246, 0.45)",
    background: "rgba(59, 130, 246, 0.12)",
    badge: "text-blue-600 dark:text-blue-400",
  },
  BILL_REQUESTED: {
    border: "rgba(239, 68, 68, 0.55)",
    background: "rgba(239, 68, 68, 0.14)",
    badge: "text-red-600 dark:text-red-400",
  },
};

const TRANSLATIONS = {
  uz: {
    waiter: "Ofitsiant",
    todayOrders: "Bugungi buyurtmalar",
    todayEarnings: "Bugungi xizmat haqi",
    order: "Buyurtma",
    history: "Tarix",
    settings: "Sozlamalar",
    signalOn: "Signal yoqilgan",
    signalOff: "Signal yoqish",
    selectLanguage: "Tilni tanlash",
    lockTimeout: "Avtomatik qulflash vaqti",
    lockTimeoutDesc: "Faoliyatsizlikdan keyin ekranni qulflash",
    never: "O'chirish (hech qachon)",
    min1: "1 daqiqa",
    min3: "3 daqiqa",
    min5: "5 daqiqa",
    min10: "10 daqiqa",
    lockScreen: "Ekranni qulflash",
    logout: "Chiqish",
    close: "Yopish",
    selectCategory: "Kategoriya tanlang",
    cart: "Savat",
    emptyCart: "Savat bo'sh",
    notes: "Izoh (ixtiyoriy)",
    submit: "Buyurtmani yuborish",
    submitting: "Yuborilmoqda...",
    total: "Jami",
    serviceFee: "Xizmat foizi",
    discount: "Chegirma",
    backToTables: "Boshqa stol",
    selectedTable: "Tanlangan stol",
    noTables: "Stollar topilmadi",
    selectATable: "Stol tanlang",
    waiterCalls: "Ofitsiant chaqiruvlari",
    appendedText: "Stol buyurtmasiga qo'shildi!",
    submittedText: "Buyurtma yuborildi!",
    appendedLabel: "Yangi qo'shimcha",
    queuedText: "Buyurtma offline saqlandi",
    queuedHint: "Internet qaytgach avtomatik yuboriladi. Oshxona cheki online bo'lgach chiqadi.",
    syncingText: "Yuborilmoqda…",
    syncingHint: "Tarmoq sekin bo'lsa ham buyurtma saqlanadi",
    kitchenReceiptText: "Buyurtma stansiyalarga avtomatik chiqadi (kassir tasdiqlashi shart emas)",
    moreOrder: "Yana buyurtma",
    chooseTableText: "Stol tanlang",
    chooseTableDesc: "Stol holati va ofitsiant",
    tableOrders: "Stoldagi buyurtmalar",
    appendedAlert: "Tanlangan buyurtmaga qo'shiladi — savatdagi taomlarni yuboring",
    addToCartBtn: "Qo'shish",
    variantBtn: "Variant",
    notAvailable: "Mavjud emas",
    backToOrders: "Buyurtmalarga qaytish",
    activeStaff: "Tarmoqda",
    profile: "Profil",
    profileDesc: "Shaxsiy ma'lumotlaringizni tahrirlang",
    save: "Saqlash",
    saving: "Saqlanmoqda...",
    name: "Ism",
    phone: "Telefon",
    password: "Yangi parol (ixtiyoriy)",
    passwordPlaceholder: "O'zgarishsiz qoldirish uchun bo'sh qo'ying",
    avatarLabel: "Profil rasm (Yuklash yoki URL)",
    avatarPlaceholder: "Rasm havolasini yozing",
    uploadBtn: "Fayl tanlash",
    savedSuccess: "Muvaffaqiyatli saqlandi!",
    namePlaceholder: "Ismingizni kiriting",
    uploadError: "Rasm yuklashda xatolik",
    uploadNetworkError: "Rasm yuklashda ulanish xatosi",
  },
  ru: {
    waiter: "Официант",
    todayOrders: "Заказы за сегодня",
    todayEarnings: "Услуги за сегодня",
    order: "Заказ",
    history: "История",
    settings: "Настройки",
    signalOn: "Сигнал включен",
    signalOff: "Включить сигнал",
    selectLanguage: "Выбор языка",
    lockTimeout: "Время автоблокировки",
    lockTimeoutDesc: "Блокировка экрана при неактивности",
    never: "Отключить (никогда)",
    min1: "1 минута",
    min3: "3 минуты",
    min5: "5 минут",
    min10: "10 минут",
    lockScreen: "Заблокировать экран",
    logout: "Выйти",
    close: "Закрыть",
    selectCategory: "Выберите категорию",
    cart: "Корзина",
    emptyCart: "Корзина пуста",
    notes: "Примечание (необязательно)",
    submit: "Отправить заказ",
    submitting: "Отправка...",
    total: "Итого",
    serviceFee: "Процент обслуживания",
    discount: "Скидка",
    backToTables: "Другой стол",
    selectedTable: "Выбранный стол",
    noTables: "Столы не найдены",
    selectATable: "Выберите стол",
    waiterCalls: "Вызовы официанта",
    appendedText: "Добавлено к заказу стола!",
    submittedText: "Заказ отправлен!",
    appendedLabel: "Новое дополнение",
    queuedText: "Заказ сохранён офлайн",
    queuedHint: "Отправится автоматически при появлении сети. Кухонный чек — после синхронизации.",
    syncingText: "Отправка…",
    syncingHint: "Даже при медленной сети заказ сохраняется",
    kitchenReceiptText: "Заказ сразу уходит на станции (подтверждение кассира не нужно)",
    moreOrder: "Еще заказ",
    chooseTableText: "Выберите стол",
    chooseTableDesc: "Статус стола и официант",
    tableOrders: "Заказы стола",
    appendedAlert: "Будет добавлено к выбранному заказу — отправьте блюда из корзины",
    addToCartBtn: "Добавить",
    variantBtn: "Вариант",
    notAvailable: "Нет в наличии",
    backToOrders: "Назад к заказам",
    activeStaff: "В сети",
    profile: "Профиль",
    profileDesc: "Редактируйте личные данные",
    save: "Сохранить",
    saving: "Сохранение...",
    name: "Имя",
    phone: "Телефон",
    password: "Новый пароль (необязательно)",
    passwordPlaceholder: "Оставьте пустым, чтобы не менять",
    avatarLabel: "Фото профиля (Загрузка или URL)",
    avatarPlaceholder: "Введите ссылку на фото",
    uploadBtn: "Выбрать файл",
    savedSuccess: "Успешно сохранено!",
    namePlaceholder: "Введите ваше имя",
    uploadError: "Ошибка при загрузке изображения",
    uploadNetworkError: "Ошибка сети при загрузке",
  },
  en: {
    waiter: "Waiter",
    todayOrders: "Today's Orders",
    todayEarnings: "Today's Service Fee",
    order: "Order",
    history: "History",
    settings: "Settings",
    signalOn: "Signal Enabled",
    signalOff: "Enable Signal",
    selectLanguage: "Select Language",
    lockTimeout: "Auto-lock Timeout",
    lockTimeoutDesc: "Lock screen after inactivity",
    never: "Disable (never)",
    min1: "1 minute",
    min3: "3 minutes",
    min5: "5 minutes",
    min10: "10 minutes",
    lockScreen: "Lock Screen",
    logout: "Log Out",
    close: "Close",
    selectCategory: "Select Category",
    cart: "Cart",
    emptyCart: "Cart is empty",
    notes: "Notes (optional)",
    submit: "Submit Order",
    submitting: "Submitting...",
    total: "Total",
    serviceFee: "Service Fee",
    discount: "Discount",
    backToTables: "Change Table",
    selectedTable: "Selected Table",
    noTables: "No tables found",
    selectATable: "Select a Table",
    waiterCalls: "Waiter Calls",
    appendedText: "Added to table order!",
    submittedText: "Order submitted!",
    appendedLabel: "New Addition",
    queuedText: "Order saved offline",
    queuedHint: "Will send automatically when back online. Kitchen prints after sync.",
    syncingText: "Sending…",
    syncingHint: "Order is kept even on a slow network",
    kitchenReceiptText: "Order goes to prep stations automatically (no cashier confirm)",
    moreOrder: "New Order",
    chooseTableText: "Select a Table",
    chooseTableDesc: "Table status and waiter",
    tableOrders: "Table Orders",
    appendedAlert: "Will be added to selected order — submit items from cart",
    addToCartBtn: "Add",
    variantBtn: "Variant",
    notAvailable: "Not available",
    backToOrders: "Back to Orders",
    activeStaff: "Online",
    profile: "Profile",
    profileDesc: "Edit your personal profile",
    save: "Save",
    saving: "Saving...",
    name: "Name",
    phone: "Phone",
    password: "New Password (optional)",
    passwordPlaceholder: "Leave blank to keep unchanged",
    avatarLabel: "Profile Picture (Upload or URL)",
    avatarPlaceholder: "Enter image URL",
    uploadBtn: "Choose File",
    savedSuccess: "Successfully saved!",
    namePlaceholder: "Enter your name",
    uploadError: "Error uploading image",
    uploadNetworkError: "Network error uploading image",
  },
};

export function WaiterPanel({
  cafeId,
  cafeName,
  userName,
  userId,
  userRole: _userRole = "WAITER",
  waiterServiceFeePercent = 0,
  waiterOnly = true,
}: {
  cafeId: string;
  cafeName: string;
  userName: string;
  userId?: string;
  userRole?: string;
  waiterServiceFeePercent?: number;
  waiterOnly?: boolean;
}) {
  const [tables, setTables] = useState<Table[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null);
  const [appendToOrderId, setAppendToOrderId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{
    orderNumber: number;
    appended?: boolean;
    queued?: boolean;
    syncing?: boolean;
  } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [waiterAlert, setWaiterAlert] = useState<number | null>(null);
  const [tab, setTab] = useState<PanelTab>("order");
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("home");
  const audioCtx = useRef<AudioContext | null>(null);
  const soundEnabledRef = useRef(false);

  // New States for Local Settings & Stats
  const [locale, setLocale] = useState<"uz" | "ru" | "en">("uz");
  const [lockTimeout, setLockTimeout] = useState("300000");
  const [showEarnings, setShowEarnings] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<{ orderCount: number; serviceFeeSum: number } | null>(null);
  const [activeStaff, setActiveStaff] = useState<{ id: string; userId: string; name: string; role: string; avatarUrl?: string | null }[]>([]);
  const [tableZone, setTableZone] = useState<TableZone>("HALL");
  const [menuCategoryId, setMenuCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [ordersExpanded, setOrdersExpanded] = useState(false);
  const { online, pendingCount } = useOffline();

  useHardwareBackHandler(() => {
    if (pickerProduct) {
      setPickerProduct(null);
      return true;
    }
    if (success) {
      setSuccess(null);
      return true;
    }
    if (cartSheetOpen) {
      setCartSheetOpen(false);
      return true;
    }
    if (sidebarOpen) {
      setSidebarOpen(false);
      return true;
    }
    if (selectedTable) {
      setSelectedTable(null);
      setCart([]);
      setAppendToOrderId(null);
      setNotes("");
      return true;
    }
    if (tab === "settings" && settingsSection !== "home") {
      setSettingsSection("home");
      return true;
    }
    if (tab !== "order") {
      setTab("order");
      setSettingsSection("home");
      return true;
    }
    return false;
  });

  const t = TRANSLATIONS[locale];

  const zoneTables = useMemo(
    () => tables.filter((tbl) => (tbl.zone ?? "HALL") === tableZone),
    [tables, tableZone],
  );

  const filteredMenuCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return categories.filter((c) => c.products.length > 0);
    }
    return categories
      .map((c) => ({
        ...c,
        products: c.products.filter((p) => p.name.toLowerCase().includes(q)),
      }))
      .filter((c) => c.products.length > 0);
  }, [categories, searchQuery]);

  const activeMenuCategory = useMemo(() => {
    if (filteredMenuCategories.length === 0) return null;
    if (menuCategoryId && filteredMenuCategories.some((c) => c.id === menuCategoryId)) {
      return filteredMenuCategories.find((c) => c.id === menuCategoryId) ?? null;
    }
    return filteredMenuCategories[0] ?? null;
  }, [filteredMenuCategories, menuCategoryId]);

  useEffect(() => {
    if (filteredMenuCategories.length === 0) {
      setMenuCategoryId(null);
      return;
    }
    if (!menuCategoryId || !filteredMenuCategories.some((c) => c.id === menuCategoryId)) {
      setMenuCategoryId(filteredMenuCategories[0].id);
    }
  }, [filteredMenuCategories, menuCategoryId]);

  const activeZones = useMemo(() => {
    const set = new Set<string>(TABLE_ZONE_ORDER);
    for (const t of tables) {
      if (t.zone) set.add(t.zone);
    }
    return Array.from(set);
  }, [tables]);

  const zoneCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const zone of activeZones) {
      counts[zone] = tables.filter((tbl) => (tbl.zone ?? "HALL") === zone).length;
    }
    return counts;
  }, [tables, activeZones]);

  function tableLabel(table: Table) {
    return table.name?.trim() || `Stol ${table.number}`;
  }

  const loadTables = useCallback(async () => {
    const cached = await getOpenTablesCache(cafeId);
    if (cached?.length) {
      setTables(cached as Table[]);
    }
    try {
      const res = await fetch(`/api/cafes/${cafeId}/waiter/tables`);
      if (res.ok) {
        const data = await res.json();
        const next = data.tables ?? [];
        setTables(next);
        void saveOpenTablesCache(cafeId, next);
      }
    } catch {
      // cache bilan ishlashda davom
    }
  }, [cafeId]);

  const loadMenu = useCallback(async () => {
    const cached = await getMenuCache(cafeId);
    if (cached?.length) {
      setCategories(cached as Category[]);
    }
    try {
      const res = await fetch(`/api/cafes/${cafeId}/waiter/menu`);
      if (res.ok) {
        const data = await res.json();
        const next = data.categories ?? [];
        setCategories(next);
        void saveMenuCache(cafeId, next);
      }
    } catch {
      // sekin tarmoqda cache yetarli
    }
  }, [cafeId]);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/cafes/${cafeId}/waiter/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error("Stats load error:", e);
    }
  }, [cafeId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedLocale = localStorage.getItem("waiter_locale") as "uz" | "ru" | "en";
      if (storedLocale && ["uz", "ru", "en"].includes(storedLocale)) {
        setLocale(storedLocale);
      }
      const storedTimeout = localStorage.getItem("staff_pin_timeout_ms");
      if (storedTimeout) {
        setLockTimeout(storedTimeout);
      }
      const storedShow = localStorage.getItem("waiter_show_earnings");
      if (storedShow !== null) {
        setShowEarnings(storedShow === "true");
      }
    }
  }, []);

  const loadActiveStaff = useCallback(async () => {
    try {
      const res = await fetch(`/api/cafes/${cafeId}/staff/active`);
      if (res.ok) {
        const data = await res.json();
        setActiveStaff(data.activeStaff ?? []);
      }
    } catch (e) {
      console.error("Error loading active staff:", e);
    }
  }, [cafeId]);

  useEffect(() => {
    loadTables();
    loadMenu();
    loadStats();
    loadActiveStaff();
  }, [cafeId, loadTables, loadMenu, loadStats, loadActiveStaff]);

  useEffect(() => {
    if (!waiterAlert) return;
    const timer = setTimeout(() => setWaiterAlert(null), 8000);
    return () => clearTimeout(timer);
  }, [waiterAlert]);

  async function ensureAudioContext() {
    if (!soundEnabledRef.current) return null;
    if (!audioCtx.current) {
      audioCtx.current = new AudioContext();
    }
    if (audioCtx.current.state === "suspended") {
      try {
        await audioCtx.current.resume();
      } catch {
        return null;
      }
    }
    return audioCtx.current;
  }

  function onPendingWaiterOrder() {
    if (!soundEnabledRef.current) return;
    void ensureAudioContext().then((ctx) => {
      if (ctx) playNewOrderAlert(ctx, { withVoice: true });
    });
  }

  useEffect(() => {
    if (!isOrderSoundEnabled()) return;
    soundEnabledRef.current = true;
    setSoundEnabled(true);
  }, []);

  useEffect(() => {
    function onAlertsEnabled() {
      if (!isOrderSoundEnabled()) return;
      soundEnabledRef.current = true;
      setSoundEnabled(true);
    }
    function onAlertsDisabled() {
      soundEnabledRef.current = false;
      setSoundEnabled(false);
    }
    window.addEventListener("kafe:alerts-enabled", onAlertsEnabled);
    window.addEventListener("kafe:alerts-disabled", onAlertsDisabled);
    return () => {
      window.removeEventListener("kafe:alerts-enabled", onAlertsEnabled);
      window.removeEventListener("kafe:alerts-disabled", onAlertsDisabled);
    };
  }, []);

  useEffect(() => {
    function onNewOrder(e: Event) {
      const d = (e as CustomEvent<{ cafeId: string; orderNumber: number; tableNumber?: number }>)
        .detail;
      if (d?.cafeId !== cafeId) return;
      loadStats();
    }
    function onWaiterCallEvent(e: Event) {
      const d = (e as CustomEvent<{ cafeId: string; tableNumber: number }>).detail;
      if (d?.cafeId !== cafeId) return;
      setWaiterAlert(d.tableNumber);
    }
    window.addEventListener("kafe:new-order", onNewOrder);
    window.addEventListener("kafe:waiter-call", onWaiterCallEvent);

    // Set up a heartbeat interval to update active staff list every 30 seconds
    const interval = setInterval(loadActiveStaff, 30000);

    return () => {
      window.removeEventListener("kafe:new-order", onNewOrder);
      window.removeEventListener("kafe:waiter-call", onWaiterCallEvent);
      clearInterval(interval);
    };
  }, [cafeId, loadStats, loadActiveStaff]);

  async function toggleSound() {
    if (soundEnabledRef.current) {
      disableOrderSound();
      soundEnabledRef.current = false;
      setSoundEnabled(false);
      if (audioCtx.current) void audioCtx.current.suspend();
      return;
    }

    enableOrderSound();
    if (!audioCtx.current) audioCtx.current = new AudioContext();
    if (audioCtx.current.state === "suspended") {
      await audioCtx.current.resume();
    }
    soundEnabledRef.current = true;
    setSoundEnabled(true);
    playNewOrderAlert(audioCtx.current, { withVoice: true });
    if (isPushSupported()) {
      await subscribeCafePush(cafeId);
    }
  }

  function onWaiterCall(tableNumber: number) {
    setWaiterAlert(tableNumber);
  }

  function selectTable(table: Table) {
    setSelectedTable(table);
    setCart([]);
    setNotes("");
    setError("");
    setSuccess(null);
    setAppendToOrderId(null);
    setCartSheetOpen(false);
    setOrdersExpanded(false);
    void fetch(`/api/tables/${table.id}/assign-waiter`, { method: "POST" });
  }

  function openModifierPicker(product: Product) {
    setPickerProduct(product);
  }

  function addToCart(product: Product) {
    if (!product.isAvailable) return;
    const groups = product.modifierGroups ?? [];
    if (mustPickModifiersBeforeAdd(groups)) {
      openModifierPicker(product);
      return;
    }
    pushCart(product, product.price, product.name, []);
  }

  function productCartQty(productId: string) {
    return cart
      .filter((i) => i.productId === productId)
      .reduce((s, i) => s + i.quantity, 0);
  }

  function changeProductQty(product: Product, delta: number) {
    if (!product.isAvailable && delta > 0) return;
    if (delta > 0) {
      addToCart(product);
      return;
    }
    const lines = cart.filter((i) => i.productId === product.id);
    if (lines.length === 0) return;
    const simple = lines.find((i) => i.key === `${product.id}:`);
    const target = simple ?? lines[lines.length - 1];
    updateQty(target.key, -1);
  }

  function pushCart(
    product: Product,
    unitPrice: number,
    displayName: string,
    modifierOptionIds: string[],
  ) {
    const key = `${product.id}:${modifierOptionIds.slice().sort().join(",")}`;
    setCart((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) => (i.key === key ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          key,
          productId: product.id,
          name: displayName,
          price: unitPrice,
          quantity: 1,
          modifierOptionIds,
        },
      ];
    });
  }

  function updateQty(cartKey: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.key === cartKey ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0),
    );
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartQty = cart.reduce((s, i) => s + i.quantity, 0);
  const discount = 0;
  const { serviceFeeAmount, totalAmount: total } = computeOrderTotals({
    subtotalAmount: subtotal,
    discountAmount: discount,
    hasWaiter: true,
    waiterServiceFeePercent,
  });

  async function submitOrder() {
    if (!selectedTable || cart.length === 0) return;
    setLoading(true);
    setError("");

    const tableSnapshot = selectedTable;
    const notesSnapshot = notes;
    const appendId = appendToOrderId;
    const items = cart.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      modifierOptionIds: i.modifierOptionIds.length ? i.modifierOptionIds : undefined,
    }));
    const cartSnapshot = cart;

    async function queueOffline(appended: boolean) {
      if (appended && appendId) {
        await addPendingAction({
          type: "ORDER_APPEND",
          payload: { orderId: appendId, items },
        });
      } else {
        await addPendingAction({
          type: "ORDER_CREATE",
          payload: {
            cafeId,
            tableId: tableSnapshot.id,
            source: "WAITER",
            notes: notesSnapshot || undefined,
            items,
          },
        });
      }
      setSuccess({
        orderNumber: 0,
        appended,
        queued: true,
        syncing: false,
      });
    }

    // Darhol UI — sekin internetda kutish yo'q
    setCart([]);
    setNotes("");
    setAppendToOrderId(null);
    setSuccess({
      orderNumber: 0,
      appended: Boolean(appendId),
      syncing: true,
    });
    setLoading(false);

    if (!online) {
      try {
        await queueOffline(Boolean(appendId));
      } catch {
        setCart(cartSnapshot);
        setNotes(notesSnapshot);
        setAppendToOrderId(appendId);
        setSuccess(null);
        setError("Ulanish xatosi");
      }
      return;
    }

    try {
      if (appendId) {
        const res = await fetch(`/api/orders/${appendId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        const data = await res.json();
        if (!res.ok) {
          await queueOffline(true);
          return;
        }
        setSuccess({
          orderNumber: data.order?.orderNumber ?? 0,
          appended: true,
          syncing: false,
        });
        void loadTables();
        void loadStats();
        return;
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cafeId,
          tableId: tableSnapshot.id,
          source: "WAITER",
          notes: notesSnapshot,
          items,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        await queueOffline(false);
        return;
      }

      setSuccess({
        orderNumber: data.orderNumber ?? 0,
        appended: Boolean(data.appended),
        syncing: false,
      });
      void loadTables();
      void loadStats();
    } catch {
      try {
        await queueOffline(Boolean(appendId));
      } catch {
        setCart(cartSnapshot);
        setNotes(notesSnapshot);
        setAppendToOrderId(appendId);
        setSuccess(null);
        setError("Ulanish xatosi");
      }
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.replace("/login");
  }

  async function handleLock() {
    await lockStaffScreen(cafeId);
  }

  if (success) {
    return (
      <div className="dp-card rounded-2xl p-8 text-center max-w-md mx-auto my-12">
        <CheckCircle2
          className="mx-auto h-16 w-16"
          style={{ color: "var(--dp-success, #10b981)" }}
        />
        <h2 className="mt-4 text-xl font-bold text-[var(--dp-text)]">
          {success.queued
            ? t.queuedText
            : success.syncing
              ? t.syncingText
              : success.appended
                ? t.appendedText
                : t.submittedText}
        </h2>
        {!success.queued && !success.syncing && (
          <p className="mt-2 text-4xl font-black text-[var(--dp-accent)]">
            #{String(success.orderNumber).padStart(3, "0")}
          </p>
        )}
        {success.syncing && (
          <p className="mt-3 text-sm font-medium text-[var(--dp-accent)]">● ● ●</p>
        )}
        {success.appended && !success.queued && !success.syncing && (
          <p className="mt-1 text-xs font-semibold uppercase text-[var(--dp-accent)]">
            {t.appendedLabel}
          </p>
        )}
        {selectedTable && (
          <p className="mt-1 text-sm text-[var(--dp-muted)]">{t.selectedTable} {selectedTable.number}</p>
        )}
        <p className="mt-2 text-sm text-[var(--dp-muted)]">
          {success.queued
            ? t.queuedHint
            : success.syncing
              ? t.syncingHint
              : t.kitchenReceiptText}
        </p>
        <button
          type="button"
          onClick={() => setSuccess(null)}
          className="btn btn-primary mt-6 w-full"
        >
          {t.moreOrder}
        </button>
      </div>
    );
  }

  return (
    <div className="waiter-panel-root relative flex w-full max-w-full min-h-0 flex-1 overflow-x-hidden rounded-2xl bg-[var(--dp-bg)] text-[var(--dp-text)] ring-1 ring-[var(--dp-border)] lg:overflow-hidden">
      {(!online || pendingCount > 0) && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[60] flex justify-center px-3 pt-2 lg:left-72">
          <div
            className={`pointer-events-auto rounded-xl px-3 py-1.5 text-xs font-semibold shadow-lg ${
              online
                ? "bg-amber-500 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {online
              ? `${pendingCount} ta buyurtma yuborilmoqda…`
              : `Offline${pendingCount ? ` · ${pendingCount} ta navbatda` : ""}`}
          </div>
        </div>
      )}
      {/* Left Sidebar / Drawer — mobile'da flow'dan tashqari */}
      <div
        className={`waiter-drawer fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] flex-col border-r transition-transform duration-300 lg:static lg:inset-auto lg:h-auto lg:min-h-full lg:w-72 lg:shrink-0 lg:self-stretch lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Sidebar Header */}
        <div className="waiter-drawer-header flex items-center justify-between border-b px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black tracking-tight">{cafeName}</h2>
            <p className="truncate text-xs opacity-80">
              {userName} ({t.waiter})
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="waiter-drawer-icon-btn rounded-lg p-2 lg:hidden"
            aria-label="Yopish"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {stats && (
          <div className="waiter-drawer-balance mx-4 mt-3 rounded-xl px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                {t.todayEarnings}
              </p>
              <button
                type="button"
                onClick={() => {
                  const next = !showEarnings;
                  setShowEarnings(next);
                  localStorage.setItem("waiter_show_earnings", String(next));
                }}
                className="rounded p-0.5 opacity-70 hover:opacity-100"
                title={showEarnings ? "Yashirish" : "Ko'rsatish"}
              >
                {showEarnings ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="mt-0.5 text-lg font-black text-[var(--dp-accent)]">
              {showEarnings ? formatPrice(stats.serviceFeeSum) : "••••••"}
            </p>
            <p className="text-[11px] opacity-75">
              {t.todayOrders}: {stats.orderCount} ta
            </p>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 p-4">
          <button
            type="button"
            onClick={() => { setTab("order"); setSidebarOpen(false); }}
            className={`waiter-drawer-nav ${tab === "order" ? "is-active" : ""}`}
          >
            <UtensilsCrossed className="h-4 w-4" />
            {t.order}
          </button>
          <button
            type="button"
            onClick={() => { setTab("history"); setSidebarOpen(false); }}
            className={`waiter-drawer-nav ${tab === "history" ? "is-active" : ""}`}
          >
            <History className="h-4 w-4" />
            {t.history}
          </button>
          {userId && (
            <StaffChatWidget
              cafeId={cafeId}
              userId={userId}
              userName={userName}
              className="waiter-drawer-nav relative w-full"
            />
          )}
          <button
            type="button"
            onClick={() => { setTab("profile"); setSidebarOpen(false); }}
            className={`waiter-drawer-nav ${tab === "profile" ? "is-active" : ""}`}
          >
            <User className="h-4 w-4" />
            {t.profile}
          </button>
          <button
            type="button"
            onClick={() => { setTab("settings"); setSettingsSection("home"); setSidebarOpen(false); }}
            className={`waiter-drawer-nav ${tab === "settings" ? "is-active" : ""}`}
          >
            <Settings className="h-4 w-4" />
            {t.settings}
          </button>

          {!waiterOnly && (
            <Link
              href="/dashboard"
              className="waiter-drawer-nav"
            >
              <ArrowLeft className="h-4 w-4" />
              Kafe paneli
            </Link>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className="waiter-drawer-footer space-y-2 border-t p-4">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs opacity-80">Mavzu</span>
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={handleLock}
            className="waiter-drawer-nav"
          >
            <Lock className="h-4 w-4" />
            {t.lockScreen}
          </button>
          <button
            type="button"
            onClick={logout}
            className="waiter-drawer-nav is-danger"
          >
            <LogOut className="h-4 w-4" />
            {t.logout}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 w-full max-w-full flex-1 flex-col overflow-x-hidden">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b px-3 py-2.5 backdrop-blur-md sm:px-4 lg:static lg:border-0 lg:bg-transparent lg:px-8 lg:py-4 lg:backdrop-blur-none"
          style={{
            borderColor: "var(--dp-border-subtle)",
            background: "color-mix(in srgb, var(--dp-bg) 92%, transparent)",
          }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="shrink-0 rounded-xl p-2.5 hover:bg-[var(--dp-input-bg)] hidden"
              aria-label="Menyu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-black tracking-tight text-[var(--dp-text)] sm:text-xl lg:text-2xl">
                {selectedTable ? `${t.selectedTable} ${selectedTable.number}` : t.waiter}
              </h1>
              <p className="truncate text-[11px] text-[var(--dp-muted)] sm:text-xs">
                {cafeName}
                {userName ? ` · ${userName}` : ""}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            {stats && (
              <button
                type="button"
                onClick={() => {
                  const next = !showEarnings;
                  setShowEarnings(next);
                  localStorage.setItem("waiter_show_earnings", String(next));
                }}
                className="waiter-balance-chip max-w-[7.5rem] rounded-xl px-2.5 py-1.5 text-right sm:max-w-none"
                title={t.todayEarnings}
              >
                <p className="truncate text-[9px] font-bold uppercase tracking-wide text-[var(--dp-muted)]">
                  {t.todayEarnings}
                </p>
                <p className="truncate text-xs font-black text-[var(--dp-accent)] sm:text-sm">
                  {showEarnings ? formatPrice(stats.serviceFeeSum) : "••••"}
                </p>
              </button>
            )}
            <AppNotificationsBell cafeId={cafeId} />
            <button
              type="button"
              onClick={() => void toggleSound()}
              className={`waiter-sound-toggle ${soundEnabled ? "is-on" : "is-off"}`}
              aria-pressed={soundEnabled}
              aria-label={soundEnabled ? t.signalOn : t.signalOff}
              title={soundEnabled ? t.signalOn : t.signalOff}
            >
              {soundEnabled ? (
                <Bell className="h-5 w-5" strokeWidth={2.25} fill="currentColor" />
              ) : (
                <BellOff className="h-5 w-5" strokeWidth={2.25} />
              )}
            </button>
          </div>
        </header>

        {/* Main Content Body */}
        <main
          className={`w-full min-w-0 max-w-full flex-1 space-y-4 overflow-x-hidden p-3 sm:space-y-6 sm:p-4 lg:p-8 ${
            selectedTable && tab === "order"
              ? "pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:pb-8"
              : "pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-8"
          }`}
        >
          {waiterAlert != null && (
            <div className="fixed inset-x-4 top-4 z-[80] mx-auto max-w-lg animate-pulse rounded-2xl bg-red-500 px-6 py-4 text-center text-white shadow-xl">
              <p className="text-lg font-bold">Ofitsiant chaqirildi!</p>
              <p className="mt-1 text-3xl font-black">Stol {waiterAlert}</p>
            </div>
          )}

          <WaiterCallsBanner cafeId={cafeId} onNewCall={onWaiterCall} locale={locale} />

          <PendingWaiterAssignmentBanner
            cafeId={cafeId}
            mode="waiter"
            onNewPending={onPendingWaiterOrder}
            locale={locale}
          />

          {tab === "profile" ? (
            <div className="space-y-4 max-w-lg">
              <button
                type="button"
                onClick={() => setTab("order")}
                className="flex items-center gap-2 text-sm font-bold text-[var(--dp-accent)] hover:opacity-80 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                {t.backToOrders}
              </button>
              <WaiterProfileForm cafeId={cafeId} t={t} />
            </div>
          ) : tab === "settings" ? (
            <div className="space-y-4 max-w-lg">
              <button
                type="button"
                onClick={() => {
                  if (settingsSection !== "home") {
                    setSettingsSection("home");
                    return;
                  }
                  setTab("order");
                }}
                className="flex items-center gap-2 text-sm font-bold text-[var(--dp-accent)] hover:opacity-80 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                {settingsSection === "home" ? t.backToOrders : t.settings}
              </button>

              {settingsSection === "security" ? (
                <div className="dp-card space-y-6 rounded-2xl p-6">
                  <div>
                    <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--dp-text)]">
                      <Shield className="h-5 w-5 text-[var(--dp-accent)]" />
                      Xavfsizlik
                    </h2>
                    <p className="mt-1 text-xs text-[var(--dp-muted)]">
                      Parol, biometriya va ishonchli qurilmalar
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-[var(--dp-text)]">
                      <Lock className="h-4 w-4 text-[var(--dp-accent)]" />
                      {t.lockTimeout}
                    </label>
                    <p className="text-xs text-[var(--dp-muted)]">{t.lockTimeoutDesc}</p>
                    <select
                      value={lockTimeout}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLockTimeout(val);
                        localStorage.setItem("staff_pin_timeout_ms", val);
                      }}
                      className="input w-full text-sm"
                    >
                      <option value="0">{t.never}</option>
                      <option value="60000">{t.min1}</option>
                      <option value="180000">{t.min3}</option>
                      <option value="300000">{t.min5}</option>
                      <option value="600000">{t.min10}</option>
                    </select>
                  </div>

                  <StaffBiometricSettings cafeId={cafeId} />
                  <TrustedDevicesPanel />
                </div>
              ) : settingsSection === "shift" ? (
                <div className="dp-card space-y-4 rounded-2xl p-6">
                  <ShiftSwapPanel cafeId={cafeId} userId={userId} />
                </div>
              ) : (
                <div className="dp-card space-y-5 rounded-2xl p-6">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--dp-text)]">{t.settings}</h2>
                    <p className="text-xs text-[var(--dp-muted)]">
                      Tez-tez ishlatiladigan sozlamalar
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-[var(--dp-text)]">
                      <Globe className="h-4 w-4 text-[var(--dp-accent)]" />
                      {t.selectLanguage}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["uz", "ru", "en"] as const).map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => {
                            setLocale(l);
                            localStorage.setItem("waiter_locale", l);
                            localStorage.setItem("kafe-alert-locale", l);
                            window.dispatchEvent(
                              new CustomEvent("kafe:alert-locale", {
                                detail: { locale: l },
                              }),
                            );
                          }}
                          className={`rounded-xl border py-2.5 text-sm font-bold transition ${
                            locale === l
                              ? "border-[var(--dp-accent)] bg-[var(--dp-accent-soft)] text-[var(--dp-accent)]"
                              : "border-[var(--dp-border)] bg-[var(--dp-input-bg)] text-[var(--dp-subtle)] hover:opacity-90"
                          }`}
                        >
                          {l === "uz" ? "O'zbekcha" : l === "ru" ? "Русский" : "English"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
                    style={{ borderColor: "var(--dp-border)", background: "var(--dp-input-bg)" }}
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--dp-text)]">{t.signalOn}</p>
                      <p className="text-xs text-[var(--dp-muted)]">Chaqiruv va buyurtma ovozi</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void toggleSound()}
                      className={`waiter-sound-toggle ${soundEnabled ? "is-on" : "is-off"}`}
                      aria-pressed={soundEnabled}
                      aria-label={soundEnabled ? t.signalOn : t.signalOff}
                      title={soundEnabled ? t.signalOn : t.signalOff}
                    >
                      {soundEnabled ? (
                        <Bell className="h-5 w-5" strokeWidth={2.25} fill="currentColor" />
                      ) : (
                        <BellOff className="h-5 w-5" strokeWidth={2.25} />
                      )}
                    </button>
                  </div>

                  <div
                    className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
                    style={{ borderColor: "var(--dp-border)", background: "var(--dp-input-bg)" }}
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--dp-text)]">Mavzu</p>
                      <p className="text-xs text-[var(--dp-muted)]">Qorong&apos;u yoki yorug&apos; rejim</p>
                    </div>
                    <ThemeToggle />
                  </div>

                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--dp-muted)]">
                      Boshqa bo&apos;limlar
                    </p>
                    <button
                      type="button"
                      onClick={() => setSettingsSection("security")}
                      className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition hover:opacity-90"
                      style={{ borderColor: "var(--dp-border)", background: "var(--dp-input-bg)" }}
                    >
                      <Shield className="h-4 w-4 shrink-0 text-[var(--dp-accent)]" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--dp-text)]">Xavfsizlik</p>
                        <p className="text-xs text-[var(--dp-muted)]">
                          Qulflash, biometriya, qurilmalar
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--dp-muted)]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettingsSection("shift")}
                      className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition hover:opacity-90"
                      style={{ borderColor: "var(--dp-border)", background: "var(--dp-input-bg)" }}
                    >
                      <ArrowLeftRight className="h-4 w-4 shrink-0 text-[var(--dp-accent)]" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--dp-text)]">Smena almashish</p>
                        <p className="text-xs text-[var(--dp-muted)]">
                          So&apos;rov ochish, qabul qilish
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--dp-muted)]" />
                    </button>
                  </div>

                  {!waiterOnly && (
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-3 rounded-xl border px-4 py-3 transition hover:opacity-90"
                      style={{ borderColor: "var(--dp-border)", background: "var(--dp-input-bg)" }}
                    >
                      <ArrowLeft className="h-4 w-4 text-[var(--dp-accent)]" />
                      <div>
                        <p className="text-sm font-semibold text-[var(--dp-text)]">Kafe paneli</p>
                        <p className="text-xs text-[var(--dp-muted)]">
                          Asosiy boshqaruv paneliga o&apos;tish
                        </p>
                      </div>
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={handleLock}
                    className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition hover:opacity-90"
                    style={{ borderColor: "var(--dp-border)", background: "var(--dp-input-bg)" }}
                  >
                    <Lock className="h-4 w-4 text-[var(--dp-accent)]" />
                    <div>
                      <p className="text-sm font-semibold text-[var(--dp-text)]">{t.lockScreen}</p>
                      <p className="text-xs text-[var(--dp-muted)]">Ekranni parollash</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={logout}
                    className="flex w-full items-center gap-3 rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 text-left transition hover:bg-red-50 dark:border-red-900/30 dark:bg-red-950/10 dark:hover:bg-red-950/20"
                  >
                    <LogOut className="h-4 w-4 text-red-500" />
                    <div>
                      <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                        {t.logout}
                      </p>
                      <p className="text-xs text-red-400 dark:text-red-500/80">Tizimdan chiqish</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          ) : tab === "history" ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setTab("order")}
                className="flex items-center gap-2 text-sm font-bold text-[var(--dp-accent)] hover:opacity-80 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                {t.backToOrders}
              </button>
              <WaiterHistory cafeId={cafeId} cafeName={cafeName} locale={locale} />
            </div>
          ) : (
            <>
              {activeStaff.length > 0 && (
                <div className="waiter-online-row max-w-full overflow-x-auto" aria-label={t.activeStaff}>
                  {activeStaff.map((staff) => (
                    <OnlineStaffAvatar
                      key={staff.id}
                      name={staff.name}
                      role={staff.role}
                      avatarUrl={staff.avatarUrl}
                    />
                  ))}
                </div>
              )}

              {!selectedTable ? (
                <section className="dp-card rounded-2xl p-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <UtensilsCrossed className="h-5 w-5 text-[var(--dp-accent)]" />
                      <h2 className="text-lg font-bold text-[var(--dp-text)]">{t.chooseTableText}</h2>
                    </div>
                    {zoneTables.length > 0 && (
                      <span className="text-xs font-medium text-[var(--dp-muted)]">
                        {zoneTables.length} stol ·{" "}
                        {zoneTables.filter((tbl) => tbl.status === "OCCUPIED").length} band ·{" "}
                        {zoneTables.filter((tbl) => tbl.status === "FREE").length} bo&apos;sh
                      </span>
                    )}
                  </div>

                  <FloorZoneTabs
                    active={tableZone}
                    onChange={setTableZone}
                    counts={zoneCounts}
                    zones={activeZones}
                  />

                  {tables.length === 0 ? (
                    <p className="mt-4 text-sm text-[var(--dp-muted)]">{t.noTables}</p>
                  ) : zoneTables.length === 0 ? (
                    <p className="mt-4 text-sm text-[var(--dp-muted)]">
                      {tableZoneLabel(tableZone)} zonasida stollar yo&apos;q
                    </p>
                  ) : (
                    <div className="mt-3 grid grid-cols-3 gap-2 xs:gap-3 sm:mt-4 sm:grid-cols-4 md:grid-cols-5">
                      {zoneTables.map((table) => {
                        const statusStyle =
                          TABLE_STATUS_STYLE[table.status] ?? TABLE_STATUS_STYLE.FREE;
                        const isBillRequested = table.status === "BILL_REQUESTED";
                        return (
                        <button
                          key={table.id}
                          type="button"
                          onClick={() => selectTable(table)}
                          className={`relative flex flex-col justify-between rounded-2xl border p-3 text-left transition-all active:scale-[0.96] shadow-sm hover:shadow-md min-h-[5.5rem] ${
                            isBillRequested ? "animate-pulse" : ""
                          }`}
                          style={{
                            borderColor: statusStyle.border,
                            background: statusStyle.background,
                          }}
                        >
                          <div className="w-full">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-base font-black tracking-tight text-[var(--dp-text)]">
                                {tableLabel(table)}
                              </p>
                              {isBillRequested && (
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-semibold text-[var(--dp-muted)] mt-0.5">
                              №{table.number} · {table.zone ? (TABLE_ZONE_LABELS[table.zone] ?? table.zone) : "HALL"}
                            </p>
                          </div>
                          
                          <div className="mt-2 flex items-center justify-between w-full">
                            <span
                              className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${statusStyle.badge} bg-white/80 dark:bg-black/30 shadow-sm`}
                            >
                              {getLocalizedTableStatus(table.status, locale)}
                            </span>
                          </div>
                        </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              ) : (
                <div className="w-full min-w-0 max-w-full space-y-3 sm:space-y-4">
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3"
                    style={{ borderColor: "var(--dp-border)", background: "var(--dp-accent-soft)" }}
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-[var(--dp-muted)] sm:text-sm">{t.selectedTable}</p>
                      <p className="truncate text-xl font-black text-[var(--dp-accent)] sm:text-2xl">
                        {tableLabel(selectedTable)}
                      </p>
                      <p className="text-[11px] text-[var(--dp-muted)] sm:text-xs">
                        {TABLE_ZONE_LABELS[selectedTable.zone ?? "HALL"]} · №{selectedTable.number}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTable(null);
                        setCartSheetOpen(false);
                      }}
                      className="btn btn-secondary shrink-0 px-3 py-2 text-xs sm:text-sm"
                    >
                      {t.backToTables}
                    </button>
                  </div>

                  <section className="dp-card rounded-2xl p-3 sm:p-4">
                    <button
                      type="button"
                      onClick={() => setOrdersExpanded((v) => !v)}
                      className="flex w-full items-center justify-between gap-2 text-left lg:pointer-events-none"
                    >
                      <h3 className="font-bold text-[var(--dp-text)]">{t.tableOrders}</h3>
                      <span className="text-xs font-semibold text-[var(--dp-accent)] lg:hidden">
                        {ordersExpanded ? "Yopish" : "Ochish"}
                      </span>
                    </button>
                    <div className={`mt-3 ${ordersExpanded ? "block" : "hidden lg:block"}`}>
                      <TableOrderManager
                        cafeId={cafeId}
                        tableId={selectedTable.id}
                        activeAppendOrderId={appendToOrderId}
                        onAppendToOrder={setAppendToOrderId}
                        readOnly={true}
                      />
                      {appendToOrderId && (
                        <p className="mt-2 text-xs text-[var(--dp-accent)]">
                          {t.appendedAlert}
                        </p>
                      )}
                    </div>
                  </section>

                  <div className="grid w-full min-w-0 max-w-full gap-4 lg:grid-cols-3">
                    <div className="min-w-0 max-w-full space-y-3 lg:col-span-2">
                      {/* Search Bar */}
                      <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                        <input
                          type="search"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={locale === "ru" ? "Поиск блюд..." : locale === "en" ? "Search dishes..." : "Taomlarni qidirish..."}
                          className="w-full rounded-xl border border-[var(--dp-border)] bg-[var(--dp-input-bg)] py-2.5 pl-10 pr-4 text-sm text-[var(--dp-text)] placeholder-stone-400 outline-none focus:border-[var(--dp-accent)] focus:ring-1 focus:ring-[var(--dp-accent)] transition-all"
                        />
                      </div>

                      {filteredMenuCategories.length > 0 && (
                        <div className="waiter-category-scroll-wrap sticky top-[3.25rem] z-20 lg:top-2">
                          <div className="waiter-category-scroll" role="tablist" aria-label="Menyu bo'limlari">
                            {filteredMenuCategories.map((cat) => {
                              const active = activeMenuCategory?.id === cat.id;
                              return (
                                <button
                                  key={cat.id}
                                  type="button"
                                  role="tab"
                                  aria-selected={active}
                                  onClick={() => setMenuCategoryId(cat.id)}
                                  className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition active:scale-[0.98] ${
                                    active
                                      ? "bg-[var(--dp-accent)] text-white"
                                      : "bg-[var(--dp-input-bg)] text-[var(--dp-muted)]"
                                  }`}
                                >
                                  {cat.name}
                                  <span
                                    className={`ml-1.5 text-xs ${
                                      active ? "text-white/80" : "text-[var(--dp-muted)]"
                                    }`}
                                  >
                                    {cat.products.length}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {activeMenuCategory ? (
                        <section className="dp-card rounded-2xl p-2.5 sm:p-4">
                          <h3 className="mb-2 px-0.5 text-sm font-bold text-[var(--dp-text)] sm:mb-3 sm:text-base">
                            {activeMenuCategory.name}
                          </h3>
                          <div className="waiter-product-grid">
                            {activeMenuCategory.products.map((product) => {
                              const qty = productCartQty(product.id);
                              return (
                              <div
                                key={product.id}
                                className="flex flex-col overflow-hidden rounded-2xl border bg-[var(--dp-card)] shadow-sm hover:shadow-md transition-all duration-200"
                                style={{ borderColor: "var(--dp-border)" }}
                              >
                                <div className="flex flex-col flex-1 p-3 gap-2 text-left">
                                  {/* Product Image and Name */}
                                  <div className="flex items-start gap-3">
                                    <div className="relative shrink-0 rounded-xl overflow-hidden shadow-sm border border-stone-100 dark:border-stone-800">
                                      <ProductMenuImage
                                        url={product.imageUrl}
                                        name={product.name}
                                        size="sm"
                                      />
                                    </div>
                                    <p className="flex-1 text-sm font-bold leading-snug text-[var(--dp-text)] line-clamp-2">
                                      {product.name}
                                    </p>
                                  </div>

                                  {/* Price and Availability */}
                                  <div className="flex items-center justify-between gap-1 mt-1">
                                    <p className="text-sm font-extrabold text-[var(--dp-accent)]">
                                      {formatPrice(product.price)}
                                    </p>
                                    {!product.isAvailable && (
                                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-600 dark:bg-red-950/30 dark:text-red-400">
                                        {t.notAvailable}
                                      </span>
                                    )}
                                  </div>

                                  {/* Quantity Stepper */}
                                  <div className="mt-auto pt-2">
                                    <div className="flex items-center justify-between gap-1 rounded-xl bg-[var(--dp-input-bg)] border border-[var(--dp-border)] p-1">
                                      <button
                                        type="button"
                                        onClick={() => changeProductQty(product, -1)}
                                        disabled={qty <= 0}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--dp-card)] text-[var(--dp-text)] shadow-sm hover:bg-stone-50 active:scale-95 disabled:opacity-30 transition-all"
                                      >
                                        <Minus className="h-4 w-4" />
                                      </button>
                                      <span className="w-8 text-center text-sm font-black text-[var(--dp-text)]">
                                        {qty}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => changeProductQty(product, 1)}
                                        disabled={!product.isAvailable}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--dp-accent)] text-white shadow-sm hover:opacity-90 active:scale-95 disabled:opacity-30 transition-all"
                                      >
                                        <Plus className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Modifier / Variant Button */}
                                {hasModifierGroups(product.modifierGroups) && (
                                  <button
                                    type="button"
                                    onClick={() => openModifierPicker(product)}
                                    disabled={!product.isAvailable}
                                    className="border-t py-2 text-xs font-extrabold text-[var(--dp-accent)] bg-[var(--dp-accent-soft)] hover:opacity-90 transition-all disabled:opacity-50"
                                    style={{ borderColor: "var(--dp-border)" }}
                                  >
                                    {t.variantBtn}
                                  </button>
                                )}
                              </div>
                              );
                            })}
                          </div>
                        </section>
                      ) : (
                        <p className="text-sm text-[var(--dp-muted)]">Menyu bo&apos;sh</p>
                      )}
                    </div>

                    <div className="dp-card sticky top-4 hidden h-fit rounded-2xl p-4 lg:block">
                      <div className="mb-3 flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5 text-[var(--dp-accent)]" />
                        <h3 className="font-bold text-[var(--dp-text)]">{t.cart}</h3>
                      </div>

                      {cart.length === 0 ? (
                        <p className="text-sm text-[var(--dp-muted)]">{t.emptyCart}</p>
                      ) : (
                        <>
                          <ul className="space-y-2">
                            {cart.map((item) => (
                              <li
                                key={item.key}
                                className="flex items-center justify-between gap-2 text-sm"
                              >
                                <span className="min-w-0 truncate text-[var(--dp-subtle)]">
                                  {item.name}
                                </span>
                                <div className="flex shrink-0 items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => updateQty(item.key, -1)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                                    style={{ background: "var(--dp-input-bg)" }}
                                  >
                                    <Minus className="h-3.5 w-3.5" />
                                  </button>
                                  <span className="w-5 text-center font-medium">{item.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => updateQty(item.key, 1)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                                    style={{ background: "var(--dp-input-bg)" }}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>

                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={t.notes}
                            rows={2}
                            className="input mt-3 w-full resize-none text-sm"
                          />

                          {discount > 0 && (
                            <div className="mt-3 flex justify-between text-sm text-emerald-500">
                              <span>{t.discount}</span>
                              <span>-{formatPrice(discount)}</span>
                            </div>
                          )}

                          {serviceFeeAmount > 0 && (
                            <div className="mt-2 flex justify-between text-sm text-[var(--dp-muted)]">
                              <span>{t.serviceFee} ({waiterServiceFeePercent}%)</span>
                              <span>{formatPrice(serviceFeeAmount)}</span>
                            </div>
                          )}

                          <div
                            className="mt-3 flex justify-between border-t pt-3 font-bold"
                            style={{ borderColor: "var(--dp-border)" }}
                          >
                            <span className="text-[var(--dp-text)]">{t.total}</span>
                            <span className="text-[var(--dp-accent)]">{formatPrice(total)}</span>
                          </div>

                          {error && (
                            <p className="mt-2 text-sm text-red-500">{error}</p>
                          )}

                          <button
                            type="button"
                            onClick={submitOrder}
                            disabled={loading}
                            className="btn btn-primary mt-4 w-full py-3"
                          >
                            {loading
                              ? t.submitting
                              : appendToOrderId
                                ? t.appendedText
                                : t.submit}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {selectedTable && tab === "order" && (
        <>
          <div
            className="fixed bottom-4 left-4 right-4 z-[70] rounded-3xl border bg-[var(--dp-card)] p-3 shadow-[0_10px_30px_rgba(0,0,0,0.15)] lg:hidden transition-all duration-300"
            style={{ borderColor: "var(--dp-border)" }}
          >
            <div className="mx-auto flex max-w-7xl items-center gap-2.5">
              <button
                type="button"
                onClick={() => setCartSheetOpen(true)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-[var(--dp-input-bg)] border border-[var(--dp-border)] px-3 py-2 hover:bg-stone-50 dark:hover:bg-stone-900 active:scale-[0.98] transition-all text-left"
              >
                <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--dp-accent)] text-white shadow-sm">
                  <ShoppingBag className="h-5 w-5" />
                  {cartQty > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black shadow-sm">
                      {cartQty}
                    </span>
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-[var(--dp-text)]">
                    {cartQty > 0 ? `${cartQty} ta · ${formatPrice(total)}` : t.cart}
                  </span>
                  <span className="block truncate text-[10px] font-bold text-[var(--dp-muted)] uppercase tracking-wider">
                    {cartQty > 0 ? "Savatni ochish" : t.emptyCart}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (cart.length === 0) {
                    setCartSheetOpen(true);
                    return;
                  }
                  void submitOrder();
                }}
                disabled={loading || cart.length === 0}
                className="flex h-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--dp-accent)] px-6 text-sm font-black text-white shadow-md hover:opacity-90 active:scale-[0.96] disabled:opacity-40 transition-all"
              >
                {loading ? "…" : t.submit}
              </button>
            </div>
          </div>

          {cartSheetOpen && (
            <div className="fixed inset-0 z-[80] lg:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
                aria-label="Yopish"
                onClick={() => setCartSheetOpen(false)}
              />
              <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-[var(--dp-card)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl transition-transform duration-300 ease-out animate-in slide-in-from-bottom">
                {/* Drag Handle Indicator */}
                <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-stone-200 dark:bg-stone-800" />

                <div className="mb-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-[var(--dp-accent)]" />
                    <h3 className="font-bold text-[var(--dp-text)]">{t.cart}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCartSheetOpen(false)}
                    className="rounded-xl p-2 hover:bg-[var(--dp-input-bg)]"
                    aria-label="Yopish"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {cart.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[var(--dp-muted)]">{t.emptyCart}</p>
                ) : (
                  <>
                    <ul className="space-y-3">
                      {cart.map((item) => (
                        <li
                          key={item.key}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="min-w-0 truncate font-medium text-[var(--dp-text)]">
                            {item.name}
                          </span>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateQty(item.key, -1)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--dp-input-bg)] border border-[var(--dp-border)] text-[var(--dp-text)] shadow-sm active:scale-90 transition-all"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-6 text-center text-sm font-black">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQty(item.key, 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--dp-accent)] text-white shadow-sm active:scale-90 transition-all"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>

                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t.notes}
                      rows={2}
                      className="input mt-4 w-full resize-none text-sm"
                    />

                    {discount > 0 && (
                      <div className="mt-3 flex justify-between text-sm text-emerald-500">
                        <span>{t.discount}</span>
                        <span>-{formatPrice(discount)}</span>
                      </div>
                    )}

                    {serviceFeeAmount > 0 && (
                      <div className="mt-2 flex justify-between text-sm text-[var(--dp-muted)]">
                        <span>
                          {t.serviceFee} ({waiterServiceFeePercent}%)
                        </span>
                        <span>{formatPrice(serviceFeeAmount)}</span>
                      </div>
                    )}

                    <div
                      className="mt-3 flex justify-between border-t pt-3 text-base font-bold"
                      style={{ borderColor: "var(--dp-border)" }}
                    >
                      <span className="text-[var(--dp-text)]">{t.total}</span>
                      <span className="text-[var(--dp-accent)]">{formatPrice(total)}</span>
                    </div>

                    {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

                    <button
                      type="button"
                      onClick={() => {
                        void submitOrder().then(() => setCartSheetOpen(false));
                      }}
                      disabled={loading}
                      className="btn btn-primary mt-4 w-full py-3.5 text-base"
                    >
                      {loading
                        ? t.submitting
                        : appendToOrderId
                          ? t.appendedText
                          : t.submit}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {pickerProduct && (
        <ProductModifierPicker
          productName={pickerProduct.name}
          basePrice={pickerProduct.price}
          groups={pickerProduct.modifierGroups ?? []}
          locale={locale}
          onCancel={() => setPickerProduct(null)}
          onConfirm={(optionIds, totalUnitPrice, summary) => {
            const baseName = pickerProduct.name;
            pushCart(
              pickerProduct,
              totalUnitPrice,
              summary ? `${baseName} (${summary})` : baseName,
              optionIds,
            );
            setPickerProduct(null);
          }}
        />
      )}

      {/* Mobile Bottom Navigation */}
      {(!selectedTable || tab !== "order") && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 border-t bg-[var(--dp-card)] shadow-[0_-10px_30px_rgba(0,0,0,0.06)] backdrop-blur-md lg:hidden"
          style={{ borderColor: "var(--dp-border)" }}
        >
          <div className="flex h-16 items-center justify-around px-3 pb-[env(safe-area-inset-bottom)]">
            <button
              type="button"
              onClick={() => setTab("order")}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider transition-all duration-200 active:scale-90 ${
                tab === "order"
                  ? "text-[var(--dp-accent)]"
                  : "text-[var(--dp-muted)] hover:text-[var(--dp-text)]"
              }`}
            >
              <span className={`flex items-center justify-center rounded-2xl px-4 py-1.5 transition-all duration-200 ${
                tab === "order" ? "bg-[var(--dp-accent-soft)]" : "bg-transparent"
              }`}>
                <UtensilsCrossed className="h-5 w-5" />
              </span>
              <span>{t.order}</span>
            </button>

            <button
              type="button"
              onClick={() => setTab("history")}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider transition-all duration-200 active:scale-90 ${
                tab === "history"
                  ? "text-[var(--dp-accent)]"
                  : "text-[var(--dp-muted)] hover:text-[var(--dp-text)]"
              }`}
            >
              <span className={`flex items-center justify-center rounded-2xl px-4 py-1.5 transition-all duration-200 ${
                tab === "history" ? "bg-[var(--dp-accent-soft)]" : "bg-transparent"
              }`}>
                <History className="h-5 w-5" />
              </span>
              <span>{t.history}</span>
            </button>

            {userId && (
              <StaffChatWidget
                cafeId={cafeId}
                userId={userId}
                userName={userName}
                className="relative flex flex-col items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider text-[var(--dp-muted)] transition-all duration-200 active:scale-90 hover:text-[var(--dp-text)]"
              />
            )}

            <button
              type="button"
              onClick={() => setTab("profile")}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider transition-all duration-200 active:scale-90 ${
                tab === "profile"
                  ? "text-[var(--dp-accent)]"
                  : "text-[var(--dp-muted)] hover:text-[var(--dp-text)]"
              }`}
            >
              <span className={`flex items-center justify-center rounded-2xl px-4 py-1.5 transition-all duration-200 ${
                tab === "profile" ? "bg-[var(--dp-accent-soft)]" : "bg-transparent"
              }`}>
                <User className="h-5 w-5" />
              </span>
              <span>{t.profile}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab("settings");
                setSettingsSection("home");
              }}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider transition-all duration-200 active:scale-90 ${
                tab === "settings"
                  ? "text-[var(--dp-accent)]"
                  : "text-[var(--dp-muted)] hover:text-[var(--dp-text)]"
              }`}
            >
              <span className={`flex items-center justify-center rounded-2xl px-4 py-1.5 transition-all duration-200 ${
                tab === "settings" ? "bg-[var(--dp-accent-soft)]" : "bg-transparent"
              }`}>
                <Settings className="h-5 w-5" />
              </span>
              <span>{t.settings}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function isSafeAvatarUrl(url?: string | null): boolean {
  if (!url?.trim()) return false;
  const u = url.trim();
  if (u.startsWith("/uploads/")) return true;
  if (!/^https?:\/\//i.test(u)) return false;
  // Google qidiruv / HTML sahifalar emas — faqat to'g'ridan-to'g'ri rasm
  if (/google\.[^/]+\/(search|imgres|url\?)/i.test(u)) return false;
  return /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(u) || u.includes("/uploads/");
}

function OnlineStaffAvatar({
  name,
  role,
  avatarUrl,
}: {
  name: string;
  role: string;
  avatarUrl?: string | null;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const avatarColor = getAvatarColor(name);
  const shortName = name.split(" ")[0];
  const showImg = isSafeAvatarUrl(avatarUrl) && !imgFailed;

  return (
    <div
      className="waiter-online-person"
      title={`${name} (${cafeRoleLabel(role)})`}
    >
      <div className="waiter-online-avatar-wrap">
        <div className="waiter-online-avatar">
          {showImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl!}
              alt=""
              width={40}
              height={40}
              loading="lazy"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <span className={avatarColor}>{initials}</span>
          )}
        </div>
        <div className="waiter-online-dot" aria-hidden="true" title="Onlayn" />
      </div>
      <span className="waiter-online-name">{shortName}</span>
    </div>
  );
}

function WaiterProfileForm({ cafeId, t }: { cafeId: string; t: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    avatarUrl: "",
  });

  useEffect(() => {
    fetch(`/api/cafes/${cafeId}/waiter/profile`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.profile) {
          setForm({
            name: data.profile.name || "",
            phone: data.profile.phone || "",
            password: "",
            avatarUrl: data.profile.avatarUrl || "",
          });
        }
      });
  }, [cafeId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const res = await fetch(`/api/cafes/${cafeId}/waiter/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Xatolik");
        return;
      }
      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dp-card rounded-2xl p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[var(--dp-text)]">{t.profile}</h2>
        <p className="text-xs text-[var(--dp-muted)]">{t.profileDesc}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1.5">{t.name}</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900/30 transition-all"
              placeholder={t.namePlaceholder}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1.5">{t.phone}</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900/30 transition-all"
              placeholder="+998901234567"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1.5">{t.password}</label>
            <input
              type="password"
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900/30 transition-all"
              placeholder={t.passwordPlaceholder}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1.5">{t.avatarLabel}</label>
            <div className="flex gap-3 items-center">
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setLoading(true);
                  try {
                    const { uploadCafeImage } = await import("@/lib/upload-client");
                    const result = await uploadCafeImage(
                      cafeId,
                      file,
                      form.avatarUrl,
                    );
                    if ("url" in result) {
                      const nextUrl = result.url;
                      setForm({ ...form, avatarUrl: nextUrl });
                      const saveRes = await fetch(`/api/cafes/${cafeId}/waiter/profile`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ avatarUrl: nextUrl }),
                      });
                      if (!saveRes.ok) {
                        const data = await saveRes.json().catch(() => ({}));
                        alert(
                          typeof data.error === "string"
                            ? data.error
                            : t.uploadError,
                        );
                      }
                    } else {
                      alert(result.error || t.uploadError);
                    }
                  } catch {
                    alert(t.uploadNetworkError);
                  } finally {
                    setLoading(false);
                    e.target.value = "";
                  }
                }}
                className="hidden"
                id="profile-avatar-upload"
              />
              <label
                htmlFor="profile-avatar-upload"
                className="cursor-pointer rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 px-4 py-2.5 text-sm font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition shrink-0"
              >
                {t.uploadBtn}
              </label>
              <input
                value={form.avatarUrl}
                onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
                className="flex-1 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900/30 transition-all"
                placeholder={t.avatarPlaceholder}
              />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
        {success && <p className="text-sm text-emerald-600 font-medium">{t.savedSuccess}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 transition disabled:opacity-50 w-full"
        >
          {loading ? t.saving : t.save}
        </button>
      </form>
    </div>
  );
}
