"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Header, Input, Badge } from "../ds";
import { useAuth } from "../AuthContext";
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
  Copy,
  Coffee,
} from "lucide-react";

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
  const { logout, user, updateSellerStatus } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("shop");
  const [saved, setSaved] = useState(false);
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [shopName, setShopName] = useState(user?.shopName ?? "");
  const [shopDesc, setShopDesc] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [shopCity, setShopCity] = useState("");
  const [shopPostal, setShopPostal] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [shopEmail, setShopEmail] = useState(user?.email ?? "");
  const [shopWebsite, setShopWebsite] = useState("");
  const [schedule, setSchedule] = useState<Record<string, DaySchedule>>(DEFAULT_SCHEDULE);
  const [openHolidays, setOpenHolidays] = useState(false);
  const [shopSiret] = useState("");
  const [delivery, setDelivery] = useState(true);
  const [pickup, setPickup] = useState(true);
  const [vacationMode, setVacationMode] = useState(Boolean(user?.sellerVacationMode));
  const [businessDeactivated, setBusinessDeactivated] = useState(Boolean(user?.sellerDeactivated));

  // Notifications
  const [notifOrders, setNotifOrders] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifPromo, setNotifPromo] = useState(false);
  const [notifWeekly, setNotifWeekly] = useState(true);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setter(url);
  };

  const handleSave = () => {
    const run = async () => {
      await updateSellerStatus({
        vacationMode,
        deactivated: businessDeactivated,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    };
    void run();
  };

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: "shop", label: "Boutique" },
    { key: "account", label: "Compte" },
    { key: "notifications", label: "Notifs" },
  ];

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
                      SIRET
                    </label>
                    <div className="bg-muted/50 rounded-xl px-4 py-3 text-sm text-muted-foreground flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {shopSiret}
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
                    <Input value={shopAddress} onChange={setShopAddress} />
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
                <div className="flex items-center justify-between">
                  <h4 className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green" />
                    Horaires d'ouverture
                  </h4>
                  <button
                    onClick={() => {
                      const first = DAYS_LABELS.find((d) => schedule[d.key].open);
                      if (!first) return;
                      const ref = schedule[first.key];
                      const updated = { ...schedule };
                      DAYS_LABELS.forEach((d) => {
                        if (updated[d.key].open) {
                          updated[d.key] = { ...updated[d.key], openTime: ref.openTime, closeTime: ref.closeTime };
                        }
                      });
                      setSchedule(updated);
                    }}
                    className="text-xs text-green flex items-center gap-1 hover:underline"
                  >
                    <Copy className="w-3 h-3" />
                    Appliquer à tous
                  </button>
                </div>

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
              </div>

              {/* Save */}
              <Button
                fullWidth
                size="lg"
                variant="accent"
                icon={<Save className="w-4 h-4" />}
                onClick={handleSave}
              >
                {saved ? "Enregistré !" : "Enregistrer les modifications"}
              </Button>
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
                      <p className="text-xs text-muted-foreground">
                        Bernard Dupont
                      </p>
                    </div>
                    <button className="text-sm text-coral flex items-center gap-1">
                      Modifier <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm">Adresse e-mail</p>
                      <p className="text-xs text-muted-foreground">
                        bernard@maison-dupont.fr
                      </p>
                    </div>
                    <button className="text-sm text-coral flex items-center gap-1">
                      Modifier <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm">Mot de passe</p>
                      <p className="text-xs text-muted-foreground">
                        Dernière modification il y a 3 mois
                      </p>
                    </div>
                    <button className="text-sm text-coral flex items-center gap-1">
                      Modifier <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-4 space-y-4">
                <h4 className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-green" />
                  Moyen de versement
                </h4>
                <div className="bg-muted rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-7 bg-blue-100 rounded flex items-center justify-center text-xs">
                      IBAN
                    </div>
                    <div>
                      <p className="text-sm">FR76 •••• •••• •••• 4521</p>
                      <p className="text-xs text-muted-foreground">
                        Crédit Agricole
                      </p>
                    </div>
                  </div>
                  <Badge variant="success">Actif</Badge>
                </div>
                <button className="text-sm text-coral flex items-center gap-1">
                  Modifier le RIB <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Danger zone */}
              <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-4 space-y-3">
                <h4 className="text-red-500">Zone sensible</h4>
                <button
                  onClick={() => logout()}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 transition-colors text-red-500"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Se déconnecter</span>
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
                onClick={handleSave}
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
