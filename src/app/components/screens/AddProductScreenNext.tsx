"use client";

import { useEffect, useRef, useState } from "react";
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

export function AddProductScreenNext() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const push = (path: string) => router.push(path);
  const { user, isAuthenticated, accessToken } = useAuth();
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

  const maxPhotos = 5;
  const editProductId = searchParams.get("edit")?.trim() || "";
  const duplicateProductId = searchParams.get("duplicate")?.trim() || "";
  const sourceProductId = editProductId || duplicateProductId;
  const isEditMode = Boolean(editProductId);
  const isDuplicateMode = Boolean(!editProductId && duplicateProductId);
  const sourceProductKey = sourceProductId ? `${isEditMode ? "edit" : "duplicate"}:${sourceProductId}` : "";

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
      if (title.trim().length < 3) errors.push("Le titre doit contenir au moins 3 caracteres.");
      if (description.trim().length < 20) errors.push("La description doit contenir au moins 20 caracteres.");
      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) errors.push("Le prix doit etre superieur a 0.");
      if (!Number.isInteger(parsedStock) || parsedStock < 1) errors.push("Le stock doit etre un entier superieur ou egal a 1.");
      if (categories.length < 1) errors.push("Selectionnez au moins 1 categorie.");
      if (!pickup && !delivery) errors.push("Activez au moins un mode de remise (retrait ou livraison).");
    } else {
      if (!title.trim()) errors.push("Ajoutez au moins un titre pour le brouillon.");
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  useEffect(() => {
    if (!isAuthenticated) {
      push("/auth?role=seller");
      return;
    }
    if (user?.role !== "seller" || !user?.siretVerified) {
      push("/siret");
    }
  }, [isAuthenticated, user, push]);

  useEffect(() => {
    if (!user?.id || !accessToken || !user?.siretVerified) {
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
  }, [user?.id, user?.siretVerified, accessToken]);

  useEffect(() => {
    if (!user?.id || !accessToken || !sourceProductId) {
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
            setValidationErrors(["Produit introuvable pour cette action."]);
          }
          return;
        }
        if (cancelled) return;

        setTitle(isDuplicateMode ? `${sourceProduct.title} (copie)` : sourceProduct.title);
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
          setValidationErrors([error instanceof Error ? error.message : "Impossible de charger le produit."]);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [user?.id, accessToken, sourceProductId, sourceProductKey, isDuplicateMode, loadedProductKey]);

  if (!isAuthenticated || user?.role !== "seller" || !user?.siretVerified) {
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
        <h1 className="mb-2">{saveResult === "published" ? "Produit publié !" : "Brouillon enregistré !"}</h1>
        <p className="text-muted-foreground text-center text-sm mb-8 max-w-sm">
          {saveResult === "published"
            ? "Votre produit est publié. Il sera visible quand la boutique sera elle aussi publiée."
            : "Votre produit est enregistré en brouillon. Il ne sera pas visible tant qu'il n'est pas publié."}
        </p>
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <Button fullWidth variant="accent" onClick={() => push("/dashboard")}>
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
            setStock("5");
            setPickup(true);
            setDelivery(false);
          }}>
            Ajouter un autre produit
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
          title: title.trim() || "Produit brouillon",
          description: description.trim(),
          features: features.trim(),
          composition: composition.trim(),
          returnConditions: returnConditions.trim(),
          color: color.trim(),
          price: target === "published" ? Number(price.replace(",", ".")) : Math.max(0, Number(price.replace(",", ".")) || 0),
          stock: target === "published" ? Number(stock) : Math.max(0, Number(stock) || 0),
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
        const rawMessage = error instanceof Error ? error.message : "Impossible de publier le produit.";
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
        title={isEditMode ? "Modifier le produit" : isDuplicateMode ? "Copier le produit" : "Ajouter un produit"}
        onBack={() => router.back()}
      />

      <div className="flex-1 px-4 lg:px-0 py-6 max-w-xl mx-auto w-full">
        {isEditMode && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            Modification du produit en cours.
          </div>
        )}
        {isDuplicateMode && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Duplication du produit en cours. Le titre contient déjà "copie".
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
          <label className="text-sm mb-1.5 block">Titre du produit</label>
          <Input
            placeholder="Ex : Coffret Macarons Artisanaux"
            value={title}
            onChange={setTitle}
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="text-sm mb-1.5 block">Description</label>
          <textarea
            placeholder="Décrivez votre produit, ses ingrédients, sa fabrication..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-input-background rounded-xl px-4 py-3 min-h-[100px] resize-none outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="mb-4">
          <label className="text-sm mb-1.5 block">Caractéristiques</label>
          <textarea
            placeholder="Dimensions, utilisation, avantages..."
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            className="w-full bg-input-background rounded-xl px-4 py-3 min-h-[90px] resize-none outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="mb-4">
          <label className="text-sm mb-1.5 block">Composition</label>
          <textarea
            placeholder="Matières, ingrédients, provenance..."
            value={composition}
            onChange={(e) => setComposition(e.target.value)}
            className="w-full bg-input-background rounded-xl px-4 py-3 min-h-[90px] resize-none outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="mb-4">
          <label className="text-sm mb-1.5 block">Conditions de retour</label>
          <textarea
            placeholder="Délais, état du produit, modalités de remboursement..."
            value={returnConditions}
            onChange={(e) => setReturnConditions(e.target.value)}
            className="w-full bg-input-background rounded-xl px-4 py-3 min-h-[90px] resize-none outline-none placeholder:text-muted-foreground"
          />
        </div>

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
            <label className="text-sm mb-1.5 block">Prix (€)</label>
            <Input
              placeholder="0.00"
              type="number"
              value={price}
              onChange={setPrice}
            />
          </div>
          <div className="flex-1">
            <label className="text-sm mb-1.5 block">Stock disponible</label>
            <Input
              placeholder="1"
              type="number"
              value={stock}
              onChange={setStock}
            />
          </div>
        </div>

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

        {/* Fee info */}
        {price && parseFloat(price) > 0 && (
          <div className="mb-4 bg-coral-light rounded-xl p-3 text-sm">
            <div className="flex justify-between mb-1">
              <span>Prix affiché</span>
              <span>{parseFloat(price).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span className="flex items-center gap-1">
                Commission MonCadeauLocal
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
          <label className="text-sm mb-2 block">Mode de remise</label>
          <div className="flex gap-3">
            <button
              onClick={() => setPickup(!pickup)}
              className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${
                pickup ? "border-coral bg-coral-light" : "border-border bg-white"
              }`}
            >
              <MapPin className={`w-5 h-5 ${pickup ? "text-coral" : "text-muted-foreground"}`} />
              <div className="text-left">
                <p className="text-sm">Retrait en boutique</p>
                <p className="text-xs text-muted-foreground">Le client vient chercher</p>
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
                <p className="text-sm">Livraison</p>
                <p className="text-xs text-muted-foreground">Vous livrez le produit</p>
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
