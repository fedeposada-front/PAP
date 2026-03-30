"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  X,
  MapPin,
  Truck,
  Check,
  Image as ImageIcon,
  Palette,
} from "lucide-react";
import { motion } from "motion/react";
import { Button, Input, Badge, Header, Chip, CategoryIcon } from "../ds";
import { CATEGORY_GROUPS } from "../../data/catalog";
import { useAuth } from "../AuthContext";
import {
  createSellerProduct,
  createSellerShopCollection,
  fetchSellerProducts,
  fetchSellerShopCollections,
  type SellerShopCollection,
  updateSellerProduct,
} from "../../services/sellerProducts";
import { fetchShopSettings } from "../../services/shopSettings";
import { fetchManagedShopAccess } from "../../services/shopAccess";
import type { BusinessType, OfferType } from "../../types/catalog";

export function AddProductScreenNext() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const push = useCallback((path: string) => router.push(path), [router]);
  const { user, isAuthenticated, accessToken, switchRole } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const collectionImageInputRef = useRef<HTMLInputElement>(null);
  const [saveResult, setSaveResult] = useState<"published" | "draft" | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("5");
  const [categories, setCategories] = useState<string[]>([]);
  const [pickup, setPickup] = useState(true);
  const [delivery, setDelivery] = useState(false);
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState("");
  const [composition, setComposition] = useState("");
  const [returnConditions, setReturnConditions] = useState("");
  const [color, setColor] = useState("");
  const [collections, setCollections] = useState<SellerShopCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionTitle, setNewCollectionTitle] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");
  const [newCollectionYear, setNewCollectionYear] = useState(String(new Date().getFullYear()));
  const [newCollectionImageUrl, setNewCollectionImageUrl] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [loadedProductKey, setLoadedProductKey] = useState<string | null>(null);
  const [businessTypeConfigured, setBusinessTypeConfigured] = useState<boolean | null>(null);
  const [canManageCatalog, setCanManageCatalog] = useState<boolean | null>(null);
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [offerType, setOfferType] = useState<OfferType>("product");
  const [accessResolved, setAccessResolved] = useState(false);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);

  const maxPhotos = 5;
  const editProductId = searchParams.get("edit")?.trim() || "";
  const duplicateProductId = searchParams.get("duplicate")?.trim() || "";
  const sourceProductId = editProductId || duplicateProductId;
  const isEditMode = Boolean(editProductId);
  const isDuplicateMode = Boolean(!editProductId && duplicateProductId);
  const sourceProductKey = sourceProductId ? `${isEditMode ? "edit" : "duplicate"}:${sourceProductId}` : "";
  const isServiceOffer = offerType === "service";
  const canChooseOfferType = businessType === "hybrid";
  const offerLabel = isServiceOffer ? "service" : "produit";
  const offerLabelCapitalized = isServiceOffer ? "Service" : "Produit";
  const pageTitle = isEditMode
    ? `Modifier ${isServiceOffer ? "le service" : "le produit"}`
    : isDuplicateMode
      ? `Copier ${isServiceOffer ? "le service" : "le produit"}`
      : canChooseOfferType
        ? "Ajouter une offre"
        : `Ajouter ${isServiceOffer ? "un service" : "un produit"}`;

  useEffect(() => {
    if (sourceProductId) return;
    if (businessType === "service") {
      setOfferType("service");
      return;
    }
    if (businessType === "product") {
      setOfferType("product");
    }
  }, [businessType, sourceProductId]);

  const handlePhotoFiles = (fileList: FileList | null) => {
    if (!fileList) return;

    const files = Array.from(fileList);
    const remainingSlots = maxPhotos - photos.length;
    const nextFiles = files.slice(0, remainingSlots);
    const nextErrors: string[] = [];

    if (files.length > remainingSlots) {
      nextErrors.push(`Maximum ${maxPhotos} photos.`);
    }

    for (const file of nextFiles) {
      if (!file.type.startsWith("image/")) {
        nextErrors.push(`${file.name}: format non supporte.`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        nextErrors.push(`${file.name}: fichier trop lourd (max 5MB).`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        if (typeof dataUrl !== "string") return;
        setPhotos((prev) => [...prev, dataUrl].slice(0, maxPhotos));
      };
      reader.readAsDataURL(file);
    }

    setValidationErrors(nextErrors);
  };

  const removePhoto = (photoIndex: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== photoIndex));
    setMainPhotoIndex((prev) => {
      if (photoIndex < prev) return prev - 1;
      if (photoIndex === prev) return 0;
      return prev;
    });
  };

  const handleCollectionImageUpload = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setValidationErrors(["Selectionnez une image valide pour la collection."]);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setNewCollectionImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleCategory = (categoryId: string) => {
    setCategories((prev) => (
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    ));
  };

  const validateForm = (target: "published" | "draft") => {
    const errors: string[] = [];
    const parsedPrice = Number(price.replace(",", "."));
    const parsedStock = Number(stock);

    if (target === "published") {
      if (photos.length < 1) errors.push("Ajoutez au moins 1 photo.");
      if (title.trim().length < 3) errors.push(`Le titre du ${offerLabel} doit contenir au moins 3 caracteres.`);
      if (description.trim().length < 20) errors.push("La description doit contenir au moins 20 caracteres.");
      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        errors.push(`Le ${isServiceOffer ? "tarif" : "prix"} doit etre superieur a 0.`);
      }
      if (!isServiceOffer && (!Number.isInteger(parsedStock) || parsedStock < 1)) {
        errors.push(`${isServiceOffer ? "Les disponibilites" : "Le stock"} doivent etre un entier superieur ou egal a 1.`);
      }
      if (categories.length < 1) errors.push("Selectionnez au moins 1 categorie.");
      if (!pickup && !delivery) {
        errors.push(
          isServiceOffer
            ? "Activez au moins un mode de prestation (sur place ou a distance)."
            : "Activez au moins un mode de remise (retrait ou livraison)."
        );
      }
    } else {
      if (!title.trim()) errors.push(`Ajoutez au moins un titre pour le brouillon du ${offerLabel}.`);
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  useEffect(() => {
    if (!isAuthenticated) {
      push("/auth?role=seller");
      return;
    }
    if (user?.role === "seller") return;

    const run = async () => {
      if (user?.roles.includes("seller")) {
        await switchRole("seller");
        return;
      }
      push("/auth?role=seller");
    };

    void run();
  }, [isAuthenticated, user?.role, user?.roles, push, switchRole]);

  useEffect(() => {
    if (!user?.id || !accessToken || user.role !== "seller") {
      setBusinessTypeConfigured(null);
      setCanManageCatalog(null);
      setBusinessType(null);
      setAccessResolved(false);
      setAccessMessage(null);
      return;
    }

    let cancelled = false;
    const run = async () => {
      if (!cancelled) {
        setAccessResolved(false);
        setAccessMessage(null);
      }
      try {
        const access = await fetchManagedShopAccess({
          userId: user.id,
          accessToken,
        });
        if (!access && !user.siretVerified) {
          if (!cancelled) {
            setCanManageCatalog(false);
            setAccessResolved(true);
            push("/siret");
          }
          return;
        }
        if (access && !access.canManageCatalog) {
          if (!cancelled) {
            setCanManageCatalog(false);
            setAccessResolved(true);
            setAccessMessage("Votre rôle actuel ne permet pas d'ajouter ou modifier des offres.");
            push("/dashboard");
          }
          return;
        }

        const shop = await fetchShopSettings(user.id, accessToken);
        if (cancelled) return;
        const isConfigured = access?.isOwner ? Boolean(shop?.business_type_configured) : true;
        const nextBusinessType: BusinessType =
          shop?.business_type === "service" || shop?.business_type === "hybrid"
            ? shop.business_type
            : "product";
        setCanManageCatalog(Boolean(access?.canManageCatalog ?? true));
        setBusinessTypeConfigured(isConfigured);
        setBusinessType(nextBusinessType);
        if (!isConfigured) {
          push("/onboarding?next=/add-product");
        }
      } catch {
        if (!cancelled) {
          setBusinessTypeConfigured(false);
          setCanManageCatalog(false);
          setBusinessType(null);
          setAccessMessage("Impossible de charger la configuration de cette entreprise.");
        }
      } finally {
        if (!cancelled) {
          setAccessResolved(true);
        }
      }
    };
    void run();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role, user?.siretVerified, accessToken, push]);

  useEffect(() => {
    if (!user?.id || !accessToken || canManageCatalog !== true) {
      setCollections([]);
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        const nextCollections = await fetchSellerShopCollections({
          userId: user.id,
          accessToken,
        });
        if (!cancelled) setCollections(nextCollections);
      } catch {
        if (!cancelled) setCollections([]);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [user?.id, accessToken, canManageCatalog]);

  useEffect(() => {
    if (!user?.id || !accessToken || canManageCatalog !== true || !sourceProductId) {
      setLoadedProductKey(null);
      return;
    }
    if (loadedProductKey === sourceProductKey) {
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        const sellerProducts = await fetchSellerProducts({
          userId: user.id,
          accessToken,
        });
        const sourceProduct = sellerProducts.find((product) => product.id === sourceProductId);
        if (!sourceProduct) {
          if (!cancelled) {
            setValidationErrors(["Offre introuvable pour cette action."]);
          }
          return;
        }
        if (cancelled) return;

        setTitle(isDuplicateMode ? `${sourceProduct.title} (copie)` : sourceProduct.title);
        setOfferType(sourceProduct.offerType ?? "product");
        setDescription(sourceProduct.description ?? "");
        setFeatures(sourceProduct.features ?? "");
        setComposition(sourceProduct.composition ?? "");
        setReturnConditions(sourceProduct.returnConditions ?? "");
        setColor(sourceProduct.color ?? "");
        setPrice(String(sourceProduct.price));
        setStock(String(sourceProduct.stock));
        setCategories(
          sourceProduct.categories && sourceProduct.categories.length > 0
            ? sourceProduct.categories
            : sourceProduct.category
              ? [sourceProduct.category]
              : []
        );
        setSelectedCollectionId(sourceProduct.collectionId ?? "");
        setPickup(Boolean(sourceProduct.pickup));
        setDelivery(Boolean(sourceProduct.delivery));
        setPhotos(
          sourceProduct.imageUrls && sourceProduct.imageUrls.length > 0
            ? sourceProduct.imageUrls
            : sourceProduct.image
              ? [sourceProduct.image]
              : []
        );
        setMainPhotoIndex(0);
        setValidationErrors([]);
        setLoadedProductKey(sourceProductKey);
      } catch (error) {
        if (!cancelled) {
          setValidationErrors([error instanceof Error ? error.message : "Impossible de charger l'offre."]);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [user?.id, accessToken, sourceProductId, sourceProductKey, isDuplicateMode, loadedProductKey, canManageCatalog]);

  if (!isAuthenticated || user?.role !== "seller" || !accessResolved) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
        <div className="w-full max-w-md rounded-3xl border border-border bg-white p-6 text-center shadow-sm">
          <h3>Chargement de l'offre</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Nous préparons votre espace catalogue.
          </p>
        </div>
      </div>
    );
  }

  if (accessMessage && canManageCatalog !== true) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
        <div className="w-full max-w-md rounded-3xl border border-border bg-white p-6 text-center shadow-sm">
          <h3>Accès catalogue indisponible</h3>
          <p className="mt-2 text-sm text-muted-foreground">{accessMessage}</p>
          <div className="mt-5 flex flex-col gap-3">
            <Button fullWidth variant="accent" onClick={() => push("/dashboard")}>
              Retour au tableau de bord
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (businessTypeConfigured === false || businessTypeConfigured === null || canManageCatalog !== true) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
        <div className="w-full max-w-md rounded-3xl border border-border bg-white p-6 text-center shadow-sm">
          <h3>Configuration d'activité requise</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Choisissez d&apos;abord si votre entreprise propose des produits, des services, ou les deux.
          </p>
          <div className="mt-5 flex flex-col gap-3">
            <Button fullWidth variant="accent" onClick={() => push("/onboarding?next=/add-product")}>
              Configurer mon activité
            </Button>
            <Button fullWidth variant="outline" onClick={() => push("/dashboard")}>
              Retour au tableau de bord
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const businessTypeLabel =
    businessType === "service"
      ? "Services"
      : businessType === "hybrid"
        ? "Produits et services"
        : "Produits";

  if (
    !isAuthenticated ||
    user?.role !== "seller" ||
    canManageCatalog !== true
  ) {
    return null;
  }

  const isBusinessDeactivated = Boolean(user?.sellerDeactivated);

  if (saveResult) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="w-20 h-20 bg-green-light rounded-full flex items-center justify-center mb-6"
        >
          <Check className="w-10 h-10 text-green" />
        </motion.div>
        <h1 className="mb-2">{saveResult === "published" ? `${offerLabelCapitalized} publie !` : "Brouillon enregistre !"}</h1>
        <p className="text-muted-foreground text-center text-sm mb-8 max-w-sm">
          {saveResult === "published"
            ? `Votre ${offerLabel} est publie. Il sera visible quand l'entreprise sera elle aussi publiee.`
            : `Votre ${offerLabel} est enregistre en brouillon. Il ne sera pas visible tant qu'il n'est pas publie.`}
        </p>
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <Button
            fullWidth
            variant="accent"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.assign("/dashboard");
              } else {
                push("/dashboard");
              }
            }}
          >
            Retour au tableau de bord
          </Button>
          <Button fullWidth variant="outline" onClick={() => {
            setSaveResult(null);
            setTitle("");
            setPrice("");
            setDescription("");
            setFeatures("");
            setComposition("");
            setReturnConditions("");
            setPhotos([]);
            setMainPhotoIndex(0);
            setCategories([]);
            setSelectedCollectionId("");
            setIsCreatingCollection(false);
            setNewCollectionTitle("");
            setNewCollectionDescription("");
            setNewCollectionYear(String(new Date().getFullYear()));
            setNewCollectionImageUrl("");
            setColor("");
            setValidationErrors([]);
            setStock(businessType === "service" ? "1" : "5");
            setPickup(true);
            setDelivery(false);
            setOfferType(businessType === "service" ? "service" : "product");
          }}>
            {`Ajouter un autre ${offerLabel}`}
          </Button>
        </div>
      </div>
    );
  }

  const submitProduct = (target: "published" | "draft") => {
    const run = async () => {
      if (!validateForm(target)) return;
      if (!user?.id || !accessToken) {
        setValidationErrors(["Session invalide. Merci de vous reconnecter."]);
        return;
      }

      setIsPublishing(true);
      setValidationErrors([]);
      try {
        const normalizedMainPhotoIndex = Math.min(mainPhotoIndex, Math.max(0, photos.length - 1));
        const mainImageUrl = photos[normalizedMainPhotoIndex];
        let collectionId = selectedCollectionId || undefined;
        if (isCreatingCollection && newCollectionTitle.trim()) {
          const createdCollection = await createSellerShopCollection({
            userId: user.id,
            accessToken,
            title: newCollectionTitle.trim(),
            description: newCollectionDescription.trim(),
            year: Number.isInteger(Number(newCollectionYear)) ? Number(newCollectionYear) : undefined,
            imageUrl: newCollectionImageUrl,
          });
          collectionId = createdCollection.id;
          setCollections((prev) => {
            if (prev.some((collection) => collection.id === createdCollection.id)) {
              return prev;
            }
            return [...prev, createdCollection];
          });
          setSelectedCollectionId(createdCollection.id);
        }
        const payload = {
          offerType,
          title: title.trim() || (isServiceOffer ? "Service brouillon" : "Produit brouillon"),
          description: description.trim(),
          features: features.trim(),
          composition: composition.trim(),
          returnConditions: returnConditions.trim(),
          color: color.trim(),
          price: target === "published" ? Number(price.replace(",", ".")) : Math.max(0, Number(price.replace(",", ".")) || 0),
          stock: isServiceOffer ? 1 : target === "published" ? Number(stock) : Math.max(0, Number(stock) || 0),
          categories,
          collectionId,
          pickup,
          delivery,
          isPublished: target === "published",
          mainImageUrl,
          imageUrls: photos,
        };
        if (isEditMode && editProductId) {
          await updateSellerProduct({
            productId: editProductId,
            accessToken,
            ...payload,
          });
        } else {
          await createSellerProduct({
            userId: user.id,
            accessToken,
            ...payload,
          });
        }
        setSaveResult(target);
      } catch (error) {
        const rawMessage = error instanceof Error ? error.message : "Impossible de publier l'offre.";
        const isProductsSchemaError =
          (rawMessage.includes("schema cache") || rawMessage.includes("column")) &&
          rawMessage.toLowerCase().includes("products");
        const message = rawMessage.includes("products_main_image_required_if_published")
          ? "Choisissez une image principale valide."
          : isProductsSchemaError
            ? "Base de données pas à jour. Lancez les migrations Supabase puis réessayez."
          : rawMessage.includes("index row requires")
              ? "Image trop lourde pour le format actuel. Réduisez la taille ou le poids de la photo."
              : rawMessage.includes("payload too large")
                ? "Images trop lourdes. Réduisez la taille des photos puis réessayez."
                : rawMessage;
        setValidationErrors([message]);
      } finally {
        setIsPublishing(false);
      }
    };
    void run();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header
        title={pageTitle}
        onBack={() => router.back()}
      />

      <div className="flex-1 px-4 lg:px-0 py-6 max-w-xl mx-auto w-full">
        <div className="mb-4 rounded-2xl border border-border/50 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Type d&apos;activité LOVCAL</label>
              <p>{businessTypeLabel}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Modifiez ce choix si votre entreprise propose des produits, des services, ou les deux.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => push("/onboarding?next=/add-product&edit=1")}>
              Modifier
            </Button>
          </div>
        </div>

        {isEditMode && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            Modification de l'offre en cours.
          </div>
        )}
        {isDuplicateMode && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Duplication de l'offre en cours. Le titre contient deja "copie".
          </div>
        )}
        {(canChooseOfferType || businessType === "service") && (
          <div className="mb-4 rounded-2xl border border-border/50 bg-white p-4 shadow-sm">
            <label className="mb-2 block text-sm">Type d'offre</label>
            {canChooseOfferType ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setOfferType("product")}
                  className={`flex-1 rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                    offerType === "product" ? "border-coral bg-coral-light" : "border-border bg-white"
                  }`}
                >
                  <p className="text-sm">Produit</p>
                  <p className="text-xs text-muted-foreground">Article physique a acheter</p>
                </button>
                <button
                  type="button"
                  onClick={() => setOfferType("service")}
                  className={`flex-1 rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                    offerType === "service" ? "border-green bg-green-light" : "border-border bg-white"
                  }`}
                >
                  <p className="text-sm">Service</p>
                  <p className="text-xs text-muted-foreground">Prestation, rendez-vous ou intervention</p>
                </button>
              </div>
            ) : (
              <div className="rounded-xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                Cette entreprise publie uniquement des services.
              </div>
            )}
          </div>
        )}
        {/* Photos */}
        <div className="mb-6">
          <label className="text-sm mb-2 block">
            Photos <span className="text-muted-foreground">(min. 1, max. 5)</span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handlePhotoFiles(e.target.files);
              e.currentTarget.value = "";
            }}
          />
          <div className="flex gap-3 overflow-x-auto pb-2">
            {photos.map((photo, i) => (
              <div
                key={i}
                className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 border border-border"
              >
                <img src={photo} alt="" className="w-full h-full object-cover" />
                {i === mainPhotoIndex ? (
                  <span className="absolute left-1 top-1 text-[10px] px-1.5 py-0.5 rounded-full bg-white/90">
                    Principale
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMainPhotoIndex(i)}
                    className="absolute left-1 top-1 text-[10px] px-1.5 py-0.5 rounded-full bg-black/55 text-white"
                  >
                    Definir principale
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={photos.length >= maxPhotos}
              className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-coral/30 hover:text-coral transition-colors flex-shrink-0"
            >
              <ImageIcon className="w-5 h-5" />
              <span className="text-xs">Ajouter</span>
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className="text-sm mb-1.5 block">{`Titre du ${offerLabel}`}</label>
          <Input
            placeholder={isServiceOffer ? "Ex : Atelier bouquet fleurs sechees" : "Ex : Coffret Macarons Artisanaux"}
            value={title}
            onChange={setTitle}
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="text-sm mb-1.5 block">Description</label>
          <textarea
            placeholder={
              isServiceOffer
                ? "Decrivez votre service, ce qui est propose, pour qui et dans quel cadre..."
                : "Decrivez votre produit, ses ingredients, sa fabrication..."
            }
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-input-background rounded-xl px-4 py-3 min-h-[100px] resize-none outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="mb-4">
          <label className="text-sm mb-1.5 block">{isServiceOffer ? "Ce qui est inclus" : "Caracteristiques"}</label>
          <textarea
            placeholder={isServiceOffer ? "Duree, contenu, materiel fourni, benefices..." : "Dimensions, utilisation, avantages..."}
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            className="w-full bg-input-background rounded-xl px-4 py-3 min-h-[90px] resize-none outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="mb-4">
          <label className="text-sm mb-1.5 block">{isServiceOffer ? "Deroule / informations pratiques" : "Composition"}</label>
          <textarea
            placeholder={isServiceOffer ? "Lieu, preparation demandee, materiel a apporter..." : "Matieres, ingredients, provenance..."}
            value={composition}
            onChange={(e) => setComposition(e.target.value)}
            className="w-full bg-input-background rounded-xl px-4 py-3 min-h-[90px] resize-none outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="mb-4">
          <label className="text-sm mb-1.5 block">{isServiceOffer ? "Conditions d'annulation / report" : "Conditions de retour"}</label>
          <textarea
            placeholder={isServiceOffer ? "Delais de report, annulation, remboursement..." : "Delais, etat du produit, modalites de remboursement..."}
            value={returnConditions}
            onChange={(e) => setReturnConditions(e.target.value)}
            className="w-full bg-input-background rounded-xl px-4 py-3 min-h-[90px] resize-none outline-none placeholder:text-muted-foreground"
          />
        </div>

        {!isServiceOffer && (
        <div className="mb-4">
          <label className="text-sm mb-1.5 block">Collection</label>
          <select
            value={selectedCollectionId}
            onChange={(event) => setSelectedCollectionId(event.target.value)}
            className="w-full min-h-14 bg-input-background rounded-xl px-4 py-3 outline-none border border-transparent focus:border-green/50 focus:ring-2 focus:ring-green/30"
          >
            <option value="">Aucune collection</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.title}
              </option>
            ))}
          </select>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsCreatingCollection((prev) => !prev)}
              className="text-sm text-coral hover:text-coral/80 transition-colors"
            >
              {isCreatingCollection ? "Annuler la nouvelle collection" : "Créer une nouvelle collection"}
            </button>
            <p className="text-xs text-muted-foreground">Optionnel</p>
          </div>
          {isCreatingCollection && (
            <div className="mt-3 space-y-3">
              <Input
                placeholder="Ex : Coffrets de printemps"
                value={newCollectionTitle}
                onChange={setNewCollectionTitle}
              />
              <textarea
                placeholder="Description de la collection"
                value={newCollectionDescription}
                onChange={(e) => setNewCollectionDescription(e.target.value)}
                className="w-full bg-input-background rounded-xl px-4 py-3 min-h-[90px] resize-none outline-none placeholder:text-muted-foreground"
              />
              <Input
                placeholder="Année"
                type="number"
                value={newCollectionYear}
                onChange={setNewCollectionYear}
              />
              <input
                ref={collectionImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  handleCollectionImageUpload(event.target.files);
                  event.currentTarget.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => collectionImageInputRef.current?.click()}
                className="w-full rounded-xl border border-dashed border-border px-4 py-3 text-left text-sm text-muted-foreground hover:border-coral/30 hover:text-coral transition-colors"
              >
                {newCollectionImageUrl ? "Changer l'image de la collection" : "Ajouter une image a la collection"}
              </button>
              {newCollectionImageUrl && (
                <img
                  src={newCollectionImageUrl}
                  alt="Apercu collection"
                  className="w-24 h-24 rounded-xl object-cover border border-border"
                />
              )}
            </div>
          )}
        </div>
        )}

        {/* Category */}
        <div className="mb-4">
          <label className="text-sm mb-2 block">Catégorie</label>
          <div className="space-y-3">
            {CATEGORY_GROUPS.map((group) => (
              <section key={group.id}>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.children.map((cat) => (
                    <Chip
                      key={cat.id}
                      active={categories.includes(cat.id)}
                      onClick={() => toggleCategory(cat.id)}
                      icon={<CategoryIcon icon={cat.icon} className="text-sm w-4 h-4" />}
                    >
                      {cat.label}
                    </Chip>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Vous pouvez selectionner plusieurs sous-categories.
          </p>
        </div>

        {/* Price + Stock */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="text-sm mb-1.5 block">{isServiceOffer ? "Tarif minimal (€)" : "Prix (€)"}</label>
            <Input
              placeholder="0.00"
              type="number"
              value={price}
              onChange={setPrice}
            />
          </div>
          {!isServiceOffer && (
            <div className="flex-1">
              <label className="text-sm mb-1.5 block">Stock disponible</label>
              <Input
                placeholder="1"
                type="number"
                value={stock}
                onChange={setStock}
              />
            </div>
          )}
        </div>

        {isServiceOffer && (
          <p className="mb-4 text-xs text-muted-foreground">
            Indiquez un tarif minimal. Le montant final pourra ensuite etre confirme apres echange avec le client.
          </p>
        )}

        {!isServiceOffer && (
        <div className="mb-4">
          <label className="text-sm mb-1.5 block">Couleur du produit</label>
          <Input
            value={color}
            onChange={setColor}
            placeholder="Ex : Noir, Blanc cassé, Rouge"
            icon={<Palette className="w-4 h-4" />}
          />
          <p className="mt-2 text-xs text-muted-foreground">Optionnel. Pour une autre couleur, duplique ensuite le produit.</p>
        </div>
        )}

        {/* Fee info */}
        {price && parseFloat(price) > 0 && (
          <div className="mb-4 bg-coral-light rounded-xl p-3 text-sm">
            <div className="flex justify-between mb-1">
              <span>{isServiceOffer ? "Tarif minimal affiche" : "Prix affiche"}</span>
              <span>{parseFloat(price).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span className="flex items-center gap-1">
                Commission Lovcal
                <Badge variant="coral">2%</Badge>
              </span>
              <span>-{(parseFloat(price) * 0.02).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between border-t border-coral/20 mt-1.5 pt-1.5">
              <span>Vous recevez</span>
              <span className="text-green">
                {(parseFloat(price) * 0.98).toFixed(2)} €
              </span>
            </div>
          </div>
        )}

        {/* Modes */}
        <div className="mb-6">
          <label className="text-sm mb-2 block">{isServiceOffer ? "Mode de prestation" : "Mode de remise"}</label>
          <div className="flex gap-3">
            <button
              onClick={() => setPickup(!pickup)}
              className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${
                pickup ? "border-coral bg-coral-light" : "border-border bg-white"
              }`}
            >
              <MapPin className={`w-5 h-5 ${pickup ? "text-coral" : "text-muted-foreground"}`} />
              <div className="text-left">
                <p className="text-sm">{isServiceOffer ? "Sur place" : "Retrait en boutique"}</p>
                <p className="text-xs text-muted-foreground">
                  {isServiceOffer ? "Le client se rend sur place" : "Le client vient chercher"}
                </p>
              </div>
            </button>
            <button
              onClick={() => setDelivery(!delivery)}
              className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${
                delivery ? "border-green bg-green-light" : "border-border bg-white"
              }`}
            >
              <Truck className={`w-5 h-5 ${delivery ? "text-green" : "text-muted-foreground"}`} />
              <div className="text-left">
                <p className="text-sm">{isServiceOffer ? "A distance / deplacement" : "Livraison"}</p>
                <p className="text-xs text-muted-foreground">
                  {isServiceOffer ? "Visio, telephone ou intervention chez le client" : "Vous livrez le produit"}
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pb-8">
          <Button
            fullWidth
            variant="outline"
            size="lg"
            onClick={() => submitProduct("draft")}
            disabled={isBusinessDeactivated || isPublishing}
          >
            Brouillon
          </Button>
          <Button
            fullWidth
            variant="accent"
            size="lg"
            onClick={() => submitProduct("published")}
            disabled={isBusinessDeactivated || isPublishing}
          >
            {isPublishing ? "Publication..." : "Publier"}
          </Button>
        </div>
        {validationErrors.length > 0 && (
          <div className="rounded-xl bg-red-50 border border-red-100 p-3 mb-6">
            <p className="text-sm text-destructive mb-1">Veuillez corriger :</p>
            <ul className="text-xs text-destructive space-y-0.5">
              {validationErrors.map((error) => (
                <li key={error}>• {error}</li>
              ))}
            </ul>
          </div>
        )}
        {isBusinessDeactivated && (
          <p className="text-sm text-destructive text-center -mt-4 pb-8">
            Votre entreprise est désactivée. Réactivez-la dans Paramètres pour publier.
          </p>
        )}
      </div>
    </div>
  );
}
