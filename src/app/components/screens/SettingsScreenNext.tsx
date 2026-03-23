"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Header, Input, Badge } from "../ds";
import { useAuth } from "../AuthContext";
import { AddressAutocompleteInput, type AddressSuggestion } from "../AddressAutocompleteInput";
import { fetchShopSettings, saveShopSettings } from "../../services/shopSettings";
import { getPasswordRuleMessage } from "../../utils/passwordRules";
import { CATEGORY_GROUPS } from "../../data/catalog";
import { getShopHref } from "../../utils/shopRouting";
import {
  Building2,
  MapPin,
  Phone,
  Clock,
  Globe,
  Camera,
  Save,
  ChevronRight,
  Truck,
  CreditCard,
  Bell,
  Shield,
  LogOut,
  Pencil,
  Store,
  Mail,
  FileText,
  PartyPopper,
  Coffee,
} from "lucide-react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type SettingsTab = "shop" | "account" | "notifications";

interface DaySchedule {
  open: boolean;
  openTime: string;
  closeTime: string;
  lunchBreak: boolean;
  lunchStart: string;
  lunchEnd: string;
}

const DAYS_LABELS: { key: string; label: string; short: string }[] = [
  { key: "lundi", label: "Lundi", short: "Lun" },
  { key: "mardi", label: "Mardi", short: "Mar" },
  { key: "mercredi", label: "Mercredi", short: "Mer" },
  { key: "jeudi", label: "Jeudi", short: "Jeu" },
  { key: "vendredi", label: "Vendredi", short: "Ven" },
  { key: "samedi", label: "Samedi", short: "Sam" },
  { key: "dimanche", label: "Dimanche", short: "Dim" },
];

const DEFAULT_SCHEDULE: Record<string, DaySchedule> = {
  lundi: { open: false, openTime: "09:00", closeTime: "19:00", lunchBreak: false, lunchStart: "12:00", lunchEnd: "14:00" },
  mardi: { open: true, openTime: "07:00", closeTime: "19:00", lunchBreak: false, lunchStart: "12:00", lunchEnd: "14:00" },
  mercredi: { open: true, openTime: "07:00", closeTime: "19:00", lunchBreak: true, lunchStart: "12:00", lunchEnd: "14:00" },
  jeudi: { open: true, openTime: "07:00", closeTime: "19:00", lunchBreak: true, lunchStart: "12:00", lunchEnd: "14:00" },
  vendredi: { open: true, openTime: "07:00", closeTime: "19:00", lunchBreak: false, lunchStart: "12:00", lunchEnd: "14:00" },
  samedi: { open: true, openTime: "07:00", closeTime: "19:00", lunchBreak: false, lunchStart: "12:00", lunchEnd: "14:00" },
  dimanche: { open: true, openTime: "07:00", closeTime: "13:00", lunchBreak: false, lunchStart: "12:00", lunchEnd: "14:00" },
};

export function SettingsScreenNext() {
  const router = useRouter();
  const push = (path: string) => router.push(path);
  const { logout, user, accessToken, updateSellerStatus, updateUser, updateProfile, updateEmail, updatePassword } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("shop");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [shopName, setShopName] = useState(user?.shopName ?? "");
  const [shopCategory, setShopCategory] = useState("");
  const [shopDesc, setShopDesc] = useState("");
  const [shopStory, setShopStory] = useState("");
  const [shopAddress, setShopAddress] = useState(user?.shopAddress ?? "");
  const [shopCity, setShopCity] = useState("");
  const [shopPostal, setShopPostal] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [shopEmail, setShopEmail] = useState(user?.email ?? "");
  const [shopWebsite, setShopWebsite] = useState("");
  const [schedule, setSchedule] = useState<Record<string, DaySchedule>>(DEFAULT_SCHEDULE);
  const [openHolidays, setOpenHolidays] = useState(false);
  const [shopSiret] = useState(user?.siretNumber ?? "");
  const [delivery, setDelivery] = useState(true);
  const [pickup, setPickup] = useState(true);
  const [deliveryHand, setDeliveryHand] = useState(true);
  const [deliveryPost, setDeliveryPost] = useState(false);
  const [deliveryCarrier, setDeliveryCarrier] = useState(false);
  const [vacationMode, setVacationMode] = useState(Boolean(user?.sellerVacationMode));
  const [businessDeactivated, setBusinessDeactivated] = useState(Boolean(user?.sellerDeactivated));
  const [shopPublished, setShopPublished] = useState(false);

  // Notifications
  const [notifOrders, setNotifOrders] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifPromo, setNotifPromo] = useState(false);
  const [notifWeekly, setNotifWeekly] = useState(true);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [accountFirstName, setAccountFirstName] = useState(user?.firstName ?? "");
  const [accountLastName, setAccountLastName] = useState(user?.lastName ?? "");
  const [accountEmail, setAccountEmail] = useState(user?.email ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [editingPayout, setEditingPayout] = useState(false);
  const [isSavingPayout, setIsSavingPayout] = useState(false);
  const [payoutIban, setPayoutIban] = useState("");
  const [payoutBankName, setPayoutBankName] = useState("");
  const [payoutAccountHolder, setPayoutAccountHolder] = useState("");
  const [payoutActive, setPayoutActive] = useState(true);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutMessage, setPayoutMessage] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!user?.id || !accessToken) return;
    let cancelled = false;

    const run = async () => {
      try {
        const shop = await fetchShopSettings(user.id, accessToken);
        if (!shop || cancelled) return;

        setShopName(shop.name ?? "");
        setShopCategory(shop.category ?? "");
        setShopDesc(shop.description ?? "");
        setShopStory(shop.story ?? "");
        setShopAddress(shop.address ?? "");
        setShopPostal(shop.postal_code ?? "");
        setShopCity(shop.city ?? "");
        setShopPhone(shop.phone ?? "");
        setShopEmail(shop.email ?? user.email ?? "");
        setShopWebsite(shop.website ?? "");
        setDelivery(Boolean(shop.delivery));
        setPickup(Boolean(shop.pickup_today));
        setDeliveryHand(Boolean(shop.delivery_hand ?? true));
        setDeliveryPost(Boolean(shop.delivery_post ?? false));
        setDeliveryCarrier(Boolean(shop.delivery_carrier ?? false));
        setOpenHolidays(Boolean(shop.open_holidays));
        setShopPublished(Boolean(shop.is_published));
        if (shop.opening_hours && typeof shop.opening_hours === "object") {
          setSchedule((prev) => ({ ...prev, ...(shop.opening_hours as Record<string, DaySchedule>) }));
        }
        if (shop.logo_image_url && !shop.logo_image_url.startsWith("blob:")) {
          setLogoImage(shop.logo_image_url);
        }
        if (shop.banner_image_url && !shop.banner_image_url.startsWith("blob:")) {
          setBannerImage(shop.banner_image_url);
        }
      } catch {
        // keep defaults if fetch fails
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email, accessToken]);

  useEffect(() => {
    setAccountFirstName(user?.firstName ?? "");
    setAccountLastName(user?.lastName ?? "");
    setAccountEmail(user?.email ?? "");
  }, [user?.firstName, user?.lastName, user?.email]);

  useEffect(() => {
    if (!user?.id || !accessToken || !SUPABASE_URL || !SUPABASE_ANON_KEY) return;
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=payout_iban,payout_bank_name,payout_account_holder,payout_active`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        if (!res.ok) return;
        const rows = (await res.json()) as Array<{
          payout_iban: string | null;
          payout_bank_name: string | null;
          payout_account_holder: string | null;
          payout_active: boolean | null;
        }>;
        const row = rows[0];
        if (!row || cancelled) return;
        setPayoutIban(row.payout_iban ?? "");
        setPayoutBankName(row.payout_bank_name ?? "");
        setPayoutAccountHolder(row.payout_account_holder ?? "");
        setPayoutActive(Boolean(row.payout_active ?? true));
      } catch {
        // no-op
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [user?.id, accessToken]);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setter(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (publishTarget: boolean) => {
    const run = async () => {
      setSaved(false);
      if (!user?.id || !accessToken) {
        setSaveError("Session invalide. Merci de vous reconnecter.");
        return;
      }

      const errors: string[] = [];
      if (shopName.trim().length < 2) errors.push("Nom de boutique requis (min 2 caracteres).");
      if (shopCategory.trim().length < 2) errors.push("Catégorie boutique requise.");
      if (shopAddress.trim().length < 6) errors.push("Adresse invalide.");
      if (!/^[0-9]{5}$/.test(shopPostal.trim())) errors.push("Code postal invalide (5 chiffres).");
      if (shopCity.trim().length < 2) errors.push("Ville invalide.");
      if (shopPhone.trim() && !/^[0-9+() .-]{8,20}$/.test(shopPhone.trim())) errors.push("Telephone invalide.");
      if (shopEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shopEmail.trim())) errors.push("E-mail invalide.");
      if (shopWebsite.trim() && !/^https?:\/\//i.test(shopWebsite.trim())) errors.push("Site web: utilisez une URL http(s).");
      if (delivery && !deliveryHand && !deliveryPost && !deliveryCarrier) {
        errors.push("Selectionnez au moins un mode de livraison.");
      }
      if (!pickup && !delivery) {
        errors.push("Activez au moins Retrait ou Livraison.");
      }
      if (errors.length > 0) {
        setSaveError(errors.join(" "));
        return;
      }

      setSaveError(null);
      setIsSaving(true);
      await updateSellerStatus({
        vacationMode,
        deactivated: businessDeactivated,
      });
      const persistedShop = await saveShopSettings({
        userId: user.id,
        accessToken,
        shopName: shopName.trim(),
        shopCategory: shopCategory.trim(),
        shopDesc: shopDesc.trim(),
        shopStory: shopStory.trim(),
        shopAddress: shopAddress.trim(),
        shopCity: shopCity.trim(),
        shopPostal: shopPostal.trim(),
        shopPhone: shopPhone.trim(),
        shopEmail: shopEmail.trim(),
        shopWebsite: shopWebsite.trim(),
        schedule,
        openHolidays,
        pickup,
        delivery,
        deliveryHand,
        deliveryPost,
        deliveryCarrier,
        logoImage: logoImage ?? null,
        bannerImage: bannerImage ?? null,
        isPublished: publishTarget,
      });
      setShopName(persistedShop.name ?? "");
      setShopCategory(persistedShop.category ?? "");
      setShopDesc(persistedShop.description ?? "");
      setShopStory(persistedShop.story ?? "");
      setShopAddress(persistedShop.address ?? "");
      setShopPostal(persistedShop.postal_code ?? "");
      setShopCity(persistedShop.city ?? "");
      setShopPhone(persistedShop.phone ?? "");
      setShopEmail(persistedShop.email ?? "");
      setShopWebsite(persistedShop.website ?? "");
      setDelivery(Boolean(persistedShop.delivery));
      setPickup(Boolean(persistedShop.pickup_today));
      setDeliveryHand(Boolean(persistedShop.delivery_hand ?? true));
      setDeliveryPost(Boolean(persistedShop.delivery_post ?? false));
      setDeliveryCarrier(Boolean(persistedShop.delivery_carrier ?? false));
      setOpenHolidays(Boolean(persistedShop.open_holidays ?? false));
      setShopPublished(Boolean(persistedShop.is_published ?? false));
      if (persistedShop.logo_image_url && !persistedShop.logo_image_url.startsWith("blob:")) {
        setLogoImage(persistedShop.logo_image_url);
      }
      if (persistedShop.banner_image_url && !persistedShop.banner_image_url.startsWith("blob:")) {
        setBannerImage(persistedShop.banner_image_url);
      }
      updateUser({
        shopName: persistedShop.name ?? shopName.trim(),
        shopAddress: persistedShop.address ?? shopAddress.trim(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setIsSaving(false);
    };
    void run().catch((error) => {
      const message = error instanceof Error ? error.message : "Impossible d'enregistrer les modifications.";
      setSaveError(message);
      setIsSaving(false);
    });
  };

  const normalizedIban = (value: string) => value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const ibanLengths: Record<string, number> = {
    FR: 27,
    DE: 22,
    ES: 24,
    IT: 27,
    BE: 16,
    NL: 18,
    LU: 20,
    PT: 25,
    IE: 22,
    GB: 22,
    CH: 21,
  };
  const isValidIban = (value: string) => {
    const iban = normalizedIban(value);
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban)) return false;
    const country = iban.slice(0, 2);
    const expectedLength = ibanLengths[country];
    if (expectedLength && iban.length !== expectedLength) return false;
    if (!expectedLength && (iban.length < 15 || iban.length > 34)) return false;

    const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
    const numeric = rearranged.replace(/[A-Z]/g, (char) => String(char.charCodeAt(0) - 55));

    let remainder = 0;
    for (let i = 0; i < numeric.length; i += 7) {
      const block = `${remainder}${numeric.slice(i, i + 7)}`;
      remainder = Number(block) % 97;
    }
    return remainder === 1;
  };
  const maskIban = (value: string) => {
    const clean = normalizedIban(value);
    if (!clean) return "";
    if (clean.length <= 8) return clean;
    return `${clean.slice(0, 4)} •••• •••• •••• ${clean.slice(-4)}`;
  };

  const savePayout = () => {
    const run = async () => {
      setAccountError(null);
      setAccountMessage(null);
      setPayoutError(null);
      setPayoutMessage(null);
      if (!user?.id || !accessToken || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
        setPayoutError("Session invalide. Reconnectez-vous.");
        return;
      }
      if (!payoutIban.trim() || !isValidIban(payoutIban)) {
        setPayoutError("IBAN invalide ou incomplet.");
        return;
      }
      if (!payoutAccountHolder.trim()) {
        setPayoutError("Titulaire du compte requis.");
        return;
      }
      if (payoutBankName.trim().length > 0 && payoutBankName.trim().length < 2) {
        setPayoutError("Nom de banque invalide.");
        return;
      }

      setIsSavingPayout(true);
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?on_conflict=id`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
            Prefer: "resolution=merge-duplicates,return=representation",
          },
          body: JSON.stringify([
            {
              id: user.id,
              payout_iban: normalizedIban(payoutIban),
              payout_bank_name: payoutBankName.trim() || null,
              payout_account_holder: payoutAccountHolder.trim(),
              payout_active: payoutActive,
            },
          ]),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          throw new Error(
            (errorData && (errorData.message || errorData.error_description || errorData.msg)) ||
              "Impossible de sauvegarder le moyen de versement."
          );
        }
        setEditingPayout(false);
        setPayoutMessage("Moyen de versement mis à jour.");
      } catch (error) {
        setPayoutError(
          error instanceof Error ? error.message : "Impossible de sauvegarder le moyen de versement."
        );
      } finally {
        setIsSavingPayout(false);
      }
    };
    void run();
  };

  const handleLogout = () => {
    const run = async () => {
      setIsLoggingOut(true);
      try {
        await logout();
      } finally {
        push("/home");
        setIsLoggingOut(false);
      }
    };
    void run();
  };

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: "shop", label: "Boutique" },
    { key: "account", label: "Compte" },
    { key: "notifications", label: "Notifs" },
  ];
  const isPublishedShop = shopPublished;
  const previewShopHref = `${getShopHref({
    id: user?.id ?? "seller",
    name: shopName.trim() || user?.shopName || "boutique",
  })}?preview=1`;

  const saveName = () => {
    const run = async () => {
      setAccountError(null);
      setAccountMessage(null);
      if (!accountFirstName.trim() || !accountLastName.trim()) {
        setAccountError("Prénom et nom sont requis.");
        return;
      }
      setIsSavingAccount(true);
      try {
        await updateProfile({
          firstName: accountFirstName.trim(),
          lastName: accountLastName.trim(),
        });
        setEditingName(false);
        setAccountFirstName(accountFirstName.trim());
        setAccountLastName(accountLastName.trim());
        setAccountMessage("Nom mis à jour.");
      } catch (error) {
        setAccountError(error instanceof Error ? error.message : "Impossible de mettre à jour le nom.");
      } finally {
        setIsSavingAccount(false);
      }
    };
    void run();
  };

  const saveEmail = () => {
    const run = async () => {
      setAccountError(null);
      setAccountMessage(null);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountEmail.trim())) {
        setAccountError("E-mail invalide.");
        return;
      }
      setIsSavingAccount(true);
      try {
        await updateEmail(accountEmail.trim());
        setEditingEmail(false);
        setAccountEmail(accountEmail.trim());
        setAccountMessage("E-mail mis à jour.");
      } catch (error) {
        setAccountError(error instanceof Error ? error.message : "Impossible de mettre à jour l'e-mail.");
      } finally {
        setIsSavingAccount(false);
      }
    };
    void run();
  };

  const savePassword = () => {
    const run = async () => {
      setAccountError(null);
      setAccountMessage(null);
      if (!newPassword.trim() || !confirmPassword.trim()) {
        setAccountError("Renseignez les deux champs mot de passe.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setAccountError("Les mots de passe ne correspondent pas.");
        return;
      }
      const passwordError = getPasswordRuleMessage(newPassword);
      if (passwordError) {
        setAccountError(passwordError);
        return;
      }
      setIsSavingAccount(true);
      try {
        await updatePassword(newPassword);
        setEditingPassword(false);
        setNewPassword("");
        setConfirmPassword("");
        setAccountMessage("Mot de passe mis à jour.");
      } catch (error) {
        setAccountError(error instanceof Error ? error.message : "Impossible de mettre à jour le mot de passe.");
      } finally {
        setIsSavingAccount(false);
      }
    };
    void run();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header title="Paramètres" onBack={() => push("/dashboard")} />

      {/* Tabs */}
      <div className="bg-white border-b border-border px-4">
        <div className="flex gap-1 max-w-2xl mx-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 text-sm text-center transition-colors relative ${
                activeTab === tab.key
                  ? "text-green"
                  : "text-muted-foreground"
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-green rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* ─── SHOP TAB ─── */}
          {activeTab === "shop" && (
            <>
              {/* Shop photo banner */}
              <div className="relative bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                {/* Hidden file inputs */}
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, setBannerImage)}
                />
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, setLogoImage)}
                />

                {/* Banner */}
                <button
                  onClick={() => bannerInputRef.current?.click()}
                  className="relative w-full h-32 group cursor-pointer"
                >
                  {bannerImage ? (
                    <img
                      src={bannerImage}
                      alt="Bannière boutique"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-green/20 to-green/5" />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
                      <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Changer la bannière</span>
                    </div>
                  </div>
                </button>

                {/* Logo overlay */}
                <div className="absolute left-1/2 -translate-x-1/2 -bottom-8 z-10">
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="relative w-20 h-20 rounded-2xl border-2 border-green/30 shadow-md overflow-hidden bg-white group cursor-pointer"
                  >
                    {logoImage ? (
                      <img
                        src={logoImage}
                        alt="Logo boutique"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Store className="w-8 h-8 text-green" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <Camera className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                    </div>
                  </button>
                </div>
              </div>
              {/* Spacer for logo overflow */}
              <div className="h-4" />

              {/* Shop info */}
              <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-4 space-y-4">
                <h4 className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-green" />
                  Informations de la boutique
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Nom de la boutique
                    </label>
                    <Input
                      value={shopName}
                      onChange={setShopName}
                      icon={<Pencil className="w-4 h-4" />}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Secteur / service principal
                    </label>
                    <select
                      value={shopCategory}
                      onChange={(event) => setShopCategory(event.target.value)}
                      className="w-full min-h-14 bg-input-background rounded-xl px-4 py-3 outline-none border border-transparent focus:border-green/50 focus:ring-2 focus:ring-green/30"
                    >
                      <option value="">Choisir une sous-catégorie</option>
                      {CATEGORY_GROUPS.map((group) => (
                        <optgroup key={group.id} label={group.label}>
                          {group.children.map((subcategory) => (
                            <option key={subcategory.id} value={subcategory.id}>
                              {subcategory.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Description
                    </label>
                    <textarea
                      value={shopDesc}
                      onChange={(e) => setShopDesc(e.target.value)}
                      rows={3}
                      className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green/30 border border-transparent focus:border-green/50 transition-all resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Histoire de la boutique
                    </label>
                    <textarea
                      value={shopStory}
                      onChange={(e) => setShopStory(e.target.value)}
                      rows={5}
                      className="w-full bg-muted rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green/30 border border-transparent focus:border-green/50 transition-all resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      SIRET
                    </label>
                    <div className="bg-muted/50 rounded-xl px-4 py-3 text-sm text-muted-foreground flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {shopSiret || "Non renseigné"}
                      </span>
                      <Badge variant="success">Vérifié</Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-4 space-y-4">
                <h4 className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green" />
                  Adresse
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Rue
                    </label>
                    <AddressAutocompleteInput
                      value={shopAddress}
                      onChange={setShopAddress}
                      onSelectSuggestion={(suggestion: AddressSuggestion) => {
                        if (suggestion.postcode) setShopPostal(suggestion.postcode);
                        if (suggestion.city) setShopCity(suggestion.city);
                      }}
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Code postal
                      </label>
                      <Input value={shopPostal} onChange={setShopPostal} />
                    </div>
                    <div className="flex-[2]">
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Ville
                      </label>
                      <Input value={shopCity} onChange={setShopCity} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-4 space-y-4">
                <h4 className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-green" />
                  Contact
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Téléphone
                    </label>
                    <Input
                      value={shopPhone}
                      onChange={setShopPhone}
                      icon={<Phone className="w-4 h-4" />}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      E-mail
                    </label>
                    <Input
                      value={shopEmail}
                      onChange={setShopEmail}
                      icon={<Mail className="w-4 h-4" />}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Site web
                    </label>
                    <Input
                      value={shopWebsite}
                      onChange={setShopWebsite}
                      icon={<Globe className="w-4 h-4" />}
                    />
                  </div>
                </div>
              </div>

              {/* Hours */}
              <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-4 space-y-4">
                <h4 className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green" />
                  Horaires d'ouverture
                </h4>

                <div className="space-y-1">
                  {DAYS_LABELS.map((day) => {
                    const ds = schedule[day.key];
                    return (
                      <div
                        key={day.key}
                        className={`rounded-xl px-3 py-2.5 transition-colors ${
                          ds.open ? "bg-green-light/40" : "bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Custom checkbox */}
                          <button
                            onClick={() =>
                              setSchedule({
                                ...schedule,
                                [day.key]: { ...ds, open: !ds.open },
                              })
                            }
                            className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
                              ds.open
                                ? "bg-green border-green text-white"
                                : "bg-white border-gray-300"
                            }`}
                          >
                            {ds.open && (
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>

                          {/* Day label */}
                          <span className={`text-sm w-24 flex-shrink-0 ${ds.open ? "" : "text-muted-foreground"}`}>
                            {day.label}
                          </span>

                          {/* Time pickers or "Fermé" */}
                          {ds.open ? (
                            <div className="flex items-center gap-1.5 ml-auto">
                              <input
                                type="time"
                                value={ds.openTime}
                                onChange={(e) =>
                                  setSchedule({
                                    ...schedule,
                                    [day.key]: { ...ds, openTime: e.target.value },
                                  })
                                }
                                className="bg-white border border-border rounded-lg px-2 py-1 text-xs w-[5.5rem] text-center outline-none focus:border-green focus:ring-1 focus:ring-green/30"
                              />
                              <span className="text-xs text-muted-foreground">à</span>
                              <input
                                type="time"
                                value={ds.closeTime}
                                onChange={(e) =>
                                  setSchedule({
                                    ...schedule,
                                    [day.key]: { ...ds, closeTime: e.target.value },
                                  })
                                }
                                className="bg-white border border-border rounded-lg px-2 py-1 text-xs w-[5.5rem] text-center outline-none focus:border-green focus:ring-1 focus:ring-green/30"
                              />
                            </div>
                          ) : (
                            <span className="ml-auto text-xs text-muted-foreground italic">
                              Fermé
                            </span>
                          )}
                        </div>

                        {/* Lunch break row */}
                        {ds.open && (
                          <div className="flex items-center gap-3 mt-1.5 ml-8">
                            <button
                              onClick={() =>
                                setSchedule({
                                  ...schedule,
                                  [day.key]: { ...ds, lunchBreak: !ds.lunchBreak },
                                })
                              }
                              className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
                                ds.lunchBreak
                                  ? "bg-bleu border-bleu text-white"
                                  : "bg-white border-gray-300"
                              }`}
                            >
                              {ds.lunchBreak && (
                                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                  <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </button>
                            <Coffee className={`w-3 h-3 flex-shrink-0 ${ds.lunchBreak ? "text-bleu" : "text-gray-400"}`} />
                            <span className={`text-xs flex-shrink-0 ${ds.lunchBreak ? "text-bleu" : "text-muted-foreground"}`}>
                              Pause
                            </span>
                            {ds.lunchBreak ? (
                              <div className="flex items-center gap-1.5 ml-auto">
                                <input
                                  type="time"
                                  value={ds.lunchStart}
                                  onChange={(e) =>
                                    setSchedule({
                                      ...schedule,
                                      [day.key]: { ...ds, lunchStart: e.target.value },
                                    })
                                  }
                                  className="bg-white border border-bleu/30 rounded-lg px-2 py-0.5 text-xs w-[5.5rem] text-center outline-none focus:border-bleu focus:ring-1 focus:ring-bleu/20"
                                />
                                <span className="text-xs text-muted-foreground">à</span>
                                <input
                                  type="time"
                                  value={ds.lunchEnd}
                                  onChange={(e) =>
                                    setSchedule({
                                      ...schedule,
                                      [day.key]: { ...ds, lunchEnd: e.target.value },
                                    })
                                  }
                                  className="bg-white border border-bleu/30 rounded-lg px-2 py-0.5 text-xs w-[5.5rem] text-center outline-none focus:border-bleu focus:ring-1 focus:ring-bleu/20"
                                />
                              </div>
                            ) : (
                              <span className="ml-auto text-xs text-muted-foreground italic">
                                Sans pause
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Holidays toggle */}
                <div className="pt-2 border-t border-border">
                  <label className="flex items-center justify-between gap-3 py-2 cursor-pointer select-none">
                    <div className="flex items-center gap-3">
                      <PartyPopper className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-sm">Ouvert les jours fériés</p>
                        <p className="text-xs text-muted-foreground">
                          1er Jan, Pâques, 1er Mai, 8 Mai, 14 Juil, 15 Août, Toussaint, 11 Nov, Noël
                        </p>
                      </div>
                    </div>
                    <div
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors flex-shrink-0 ${
                        openHolidays ? "bg-green" : "bg-gray-200"
                      }`}
                      onClick={() => setOpenHolidays(!openHolidays)}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                          openHolidays ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </div>
                  </label>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-4 space-y-4">
                <h4 className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green" />
                  Statut de l'entreprise
                </h4>

                <button
                  onClick={() => {
                    if (businessDeactivated) return;
                    setVacationMode((v) => !v);
                  }}
                  className="w-full flex items-center justify-between rounded-xl bg-muted/40 px-3 py-3 text-left"
                >
                  <div>
                    <p>Mode vacances</p>
                    <p className="text-xs text-muted-foreground">
                      Votre vitrine reste visible, mais vous indiquez une indisponibilité temporaire.
                    </p>
                  </div>
                  <span className={`inline-flex w-11 h-6 rounded-full p-0.5 transition-colors ${vacationMode ? "bg-green" : "bg-border"}`}>
                    <span className={`w-5 h-5 rounded-full bg-white transition-transform ${vacationMode ? "translate-x-5" : "translate-x-0"}`} />
                  </span>
                </button>

                <button
                  onClick={() => {
                    const next = !businessDeactivated;
                    setBusinessDeactivated(next);
                    if (next) setVacationMode(true);
                  }}
                  className="w-full flex items-center justify-between rounded-xl bg-muted/40 px-3 py-3 text-left"
                >
                  <div>
                    <p>Désactiver l'entreprise</p>
                    <p className="text-xs text-muted-foreground">
                      Ferme la boutique: plus de publication ni de vente tant que désactivé.
                    </p>
                  </div>
                  <span className={`inline-flex w-11 h-6 rounded-full p-0.5 transition-colors ${businessDeactivated ? "bg-destructive" : "bg-border"}`}>
                    <span className={`w-5 h-5 rounded-full bg-white transition-transform ${businessDeactivated ? "translate-x-5" : "translate-x-0"}`} />
                  </span>
                </button>
              </div>

              {/* Options */}
              <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-4 space-y-2">
                <h4 className="flex items-center gap-2 mb-2">
                  <Truck className="w-4 h-4 text-green" />
                  Options de retrait / livraison
                </h4>
                <ToggleRow
                  icon={<Truck className="w-4 h-4" />}
                  label="Livraison disponible"
                  checked={delivery}
                  onChange={setDelivery}
                />
                <ToggleRow
                  icon={<Store className="w-4 h-4" />}
                  label="Retrait en boutique"
                  checked={pickup}
                  onChange={setPickup}
                />
                {delivery && (
                  <div className="rounded-xl bg-muted/30 p-3 space-y-2">
                    <p className="text-xs text-muted-foreground">Modes de livraison</p>
                    <ToggleRow
                      icon={<MapPin className="w-4 h-4" />}
                      label="Livraison en main propre (courte distance)"
                      checked={deliveryHand}
                      onChange={setDeliveryHand}
                    />
                    <ToggleRow
                      icon={<Truck className="w-4 h-4" />}
                      label="Livraison via La Poste"
                      checked={deliveryPost}
                      onChange={setDeliveryPost}
                    />
                    <ToggleRow
                      icon={<Truck className="w-4 h-4" />}
                      label="Livraison via transporteur"
                      checked={deliveryCarrier}
                      onChange={setDeliveryCarrier}
                    />
                  </div>
                )}
              </div>

              {/* Save */}
              <Button
                fullWidth
                size="lg"
                variant="outline"
                icon={<Store className="w-4 h-4" />}
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.open(previewShopHref, "_blank", "noopener,noreferrer");
                  }
                }}
              >
                Voir l'aperçu de la boutique
              </Button>
              {!isPublishedShop ? (
                <>
                  <Button
                    fullWidth
                    size="lg"
                    variant="accent"
                    icon={<Save className="w-4 h-4" />}
                    onClick={() => handleSave(false)}
                    disabled={isSaving}
                  >
                    {saved && !shopPublished ? "Brouillon enregistré !" : isSaving ? "Enregistrement..." : "Enregistrer en brouillon"}
                  </Button>
                  <Button
                    fullWidth
                    size="lg"
                    variant="accent"
                    icon={<Save className="w-4 h-4" />}
                    onClick={() => handleSave(true)}
                    disabled={isSaving}
                  >
                    {saved && shopPublished ? "Boutique publiée !" : isSaving ? "Publication..." : "Publier la boutique"}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    fullWidth
                    size="lg"
                    variant="outline"
                    icon={<Save className="w-4 h-4" />}
                    onClick={() => handleSave(false)}
                    disabled={isSaving}
                  >
                    {isSaving ? "Désactivation..." : "Désactiver la boutique"}
                  </Button>
                  <Button
                    fullWidth
                    size="lg"
                    variant="accent"
                    icon={<Save className="w-4 h-4" />}
                    onClick={() => handleSave(true)}
                    disabled={isSaving}
                  >
                    {saved && shopPublished ? "Modifications sauvegardées !" : isSaving ? "Enregistrement..." : "Sauvegarder les modifications"}
                  </Button>
                </>
              )}
              {saveError && (
                <p className="text-sm text-destructive text-center">{saveError}</p>
              )}
            </>
          )}

          {/* ─── ACCOUNT TAB ─── */}
          {activeTab === "account" && (
            <>
              <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-4 space-y-4">
                <h4 className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green" />
                  Informations du compte
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm">Nom complet</p>
                      {!editingName ? (
                        <p className="text-xs text-muted-foreground">
                          {`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Non renseigné"}
                        </p>
                      ) : (
                        <div className="mt-2 flex gap-2">
                          <Input value={accountFirstName} onChange={setAccountFirstName} placeholder="Prénom" />
                          <Input value={accountLastName} onChange={setAccountLastName} placeholder="Nom" />
                        </div>
                      )}
                    </div>
                    {!editingName ? (
                      <button onClick={() => setEditingName(true)} className="text-sm text-coral flex items-center gap-1">
                        Modifier <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAccountFirstName(user?.firstName ?? "");
                            setAccountLastName(user?.lastName ?? "");
                            setEditingName(false);
                            setAccountError(null);
                          }}
                        >
                          Annuler
                        </Button>
                        <Button size="sm" variant="accent" onClick={saveName} disabled={isSavingAccount}>OK</Button>
                      </div>
                    )}
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm">Adresse e-mail</p>
                      {!editingEmail ? (
                        <p className="text-xs text-muted-foreground">
                          {user?.email || "Non renseigné"}
                        </p>
                      ) : (
                        <div className="mt-2">
                          <Input value={accountEmail} onChange={setAccountEmail} placeholder="E-mail" icon={<Mail className="w-4 h-4" />} />
                        </div>
                      )}
                    </div>
                    {!editingEmail ? (
                      <button onClick={() => setEditingEmail(true)} className="text-sm text-coral flex items-center gap-1">
                        Modifier <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAccountEmail(user?.email ?? "");
                            setEditingEmail(false);
                            setAccountError(null);
                          }}
                        >
                          Annuler
                        </Button>
                        <Button size="sm" variant="accent" onClick={saveEmail} disabled={isSavingAccount}>OK</Button>
                      </div>
                    )}
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm">Mot de passe</p>
                      {!editingPassword ? (
                        <p className="text-xs text-muted-foreground">
                          ********
                        </p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          <Input value={newPassword} onChange={setNewPassword} placeholder="Nouveau mot de passe" type="password" />
                          <Input value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirmer le mot de passe" type="password" />
                        </div>
                      )}
                    </div>
                    {!editingPassword ? (
                      <button onClick={() => setEditingPassword(true)} className="text-sm text-coral flex items-center gap-1">
                        Modifier <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingPassword(false);
                            setNewPassword("");
                            setConfirmPassword("");
                            setAccountError(null);
                          }}
                        >
                          Annuler
                        </Button>
                        <Button size="sm" variant="accent" onClick={savePassword} disabled={isSavingAccount}>OK</Button>
                      </div>
                    )}
                  </div>
                </div>
                {accountMessage && <p className="text-sm text-green">{accountMessage}</p>}
                {accountError && <p className="text-sm text-destructive">{accountError}</p>}
              </div>

              {/* Payment */}
              <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-4 space-y-4">
                <h4 className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-green" />
                  Moyen de versement
                </h4>
                {!editingPayout ? (
                  <div className="space-y-3">
                    {payoutIban ? (
                      <div className="bg-muted rounded-xl p-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm">{maskIban(payoutIban)}</p>
                          <p className="text-xs text-muted-foreground">
                            {payoutBankName || "Banque non renseignée"}{payoutAccountHolder ? ` · ${payoutAccountHolder}` : ""}
                          </p>
                        </div>
                        <Badge variant={payoutActive ? "success" : "warning"}>
                          {payoutActive ? "Actif" : "Inactif"}
                        </Badge>
                      </div>
                    ) : (
                      <div className="bg-muted rounded-xl p-3">
                        <p className="text-sm">Aucun moyen de versement configuré.</p>
                      </div>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setEditingPayout(true)}>
                      {payoutIban ? "Modifier le RIB" : "Configurer le RIB"}
                    </Button>
                    {payoutMessage && <p className="text-sm text-green">{payoutMessage}</p>}
                    {payoutError && <p className="text-sm text-destructive">{payoutError}</p>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">IBAN</label>
                      <Input value={payoutIban} onChange={setPayoutIban} placeholder="FR76..." />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Banque</label>
                      <Input value={payoutBankName} onChange={setPayoutBankName} placeholder="Nom de la banque" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Titulaire du compte</label>
                      <Input value={payoutAccountHolder} onChange={setPayoutAccountHolder} placeholder="Nom complet / Raison sociale" />
                    </div>
                    <ToggleRow
                      icon={<CreditCard className="w-4 h-4" />}
                      label="Moyen de versement actif"
                      checked={payoutActive}
                      onChange={setPayoutActive}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingPayout(false);
                          setPayoutError(null);
                        }}
                      >
                        Annuler
                      </Button>
                      <Button size="sm" variant="accent" onClick={savePayout} disabled={isSavingPayout}>
                        {isSavingPayout ? "Enregistrement..." : "Enregistrer"}
                      </Button>
                    </div>
                    {payoutMessage && <p className="text-sm text-green">{payoutMessage}</p>}
                    {payoutError && <p className="text-sm text-destructive">{payoutError}</p>}
                  </div>
                )}
              </div>

              {/* Danger zone */}
              <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-4 space-y-3">
                <h4 className="text-red-500">Zone sensible</h4>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 transition-colors text-red-500 disabled:opacity-60"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">{isLoggingOut ? "Déconnexion..." : "Se déconnecter"}</span>
                </button>
              </div>
            </>
          )}

          {/* ─── NOTIFICATIONS TAB ─── */}
          {activeTab === "notifications" && (
            <>
              <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-4 space-y-4">
                <h4 className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-green" />
                  Préférences de notifications
                </h4>
                <div className="space-y-2">
                  <ToggleRow
                    icon={<CreditCard className="w-4 h-4" />}
                    label="Nouvelles commandes"
                    desc="Recevez une alerte pour chaque commande"
                    checked={notifOrders}
                    onChange={setNotifOrders}
                  />
                  <ToggleRow
                    icon={<Mail className="w-4 h-4" />}
                    label="Messages clients"
                    desc="Notification pour chaque nouveau message"
                    checked={notifMessages}
                    onChange={setNotifMessages}
                  />
                  <ToggleRow
                    icon={<Bell className="w-4 h-4" />}
                    label="Promotions MonCadeauLocal"
                    desc="Offres et nouveautés de la plateforme"
                    checked={notifPromo}
                    onChange={setNotifPromo}
                  />
                  <ToggleRow
                    icon={<FileText className="w-4 h-4" />}
                    label="Rapport hebdomadaire"
                    desc="Résumé de votre activité chaque lundi"
                    checked={notifWeekly}
                    onChange={setNotifWeekly}
                  />
                </div>
              </div>

              <Button
                fullWidth
                size="lg"
                variant="accent"
                icon={<Save className="w-4 h-4" />}
                onClick={() => handleSave(shopPublished)}
              >
                {saved ? "Enregistré !" : "Enregistrer"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Toggle Row Component ─── */
function ToggleRow({
  icon,
  label,
  desc,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-3 py-2.5 cursor-pointer select-none"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-muted-foreground flex-shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm">{label}</p>
          {desc && (
            <p className="text-xs text-muted-foreground truncate">{desc}</p>
          )}
        </div>
      </div>
      <div
        className={`w-11 h-6 rounded-full p-0.5 transition-colors flex-shrink-0 ${
          checked ? "bg-green" : "bg-gray-200"
        }`}
      >
        <div
          className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
    </div>
  );
}
