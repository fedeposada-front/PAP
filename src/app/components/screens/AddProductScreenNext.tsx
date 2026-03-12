"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  MapPin,
  Truck,
  Check,
  Image as ImageIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { Button, Input, Badge, Header, Chip, CategoryIcon } from "../ds";
import { CATEGORIES } from "../../data/catalog";
import { useAuth } from "../AuthContext";
import { createSellerProduct } from "../../services/sellerProducts";

export function AddProductScreenNext() {
  const router = useRouter();
  const push = (path: string) => router.push(path);
  const { user, isAuthenticated, accessToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [published, setPublished] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("5");
  const [categories, setCategories] = useState<string[]>([]);
  const [pickup, setPickup] = useState(true);
  const [delivery, setDelivery] = useState(false);
  const [description, setDescription] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  const maxPhotos = 5;

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

  const toggleCategory = (categoryId: string) => {
    setCategories((prev) => (
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    ));
  };

  const validateForm = () => {
    const errors: string[] = [];
    const parsedPrice = Number(price.replace(",", "."));
    const parsedStock = Number(stock);

    if (photos.length < 1) errors.push("Ajoutez au moins 1 photo.");
    if (title.trim().length < 3) errors.push("Le titre doit contenir au moins 3 caracteres.");
    if (description.trim().length < 20) errors.push("La description doit contenir au moins 20 caracteres.");
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) errors.push("Le prix doit etre superieur a 0.");
    if (!Number.isInteger(parsedStock) || parsedStock < 1) errors.push("Le stock doit etre un entier superieur ou egal a 1.");
    if (categories.length < 1) errors.push("Selectionnez au moins 1 categorie.");
    if (!pickup && !delivery) errors.push("Activez au moins un mode de remise (retrait ou livraison).");

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

  if (!isAuthenticated || user?.role !== "seller" || !user?.siretVerified) {
    return null;
  }

  const isBusinessDeactivated = Boolean(user?.sellerDeactivated);

  if (published) {
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
        <h1 className="mb-2">Produit publié !</h1>
        <p className="text-muted-foreground text-center text-sm mb-8 max-w-sm">
          Votre produit est maintenant visible par les acheteurs à proximité.
          Vous recevrez une notification à chaque commande.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <Button fullWidth variant="accent" onClick={() => push("/dashboard")}>
            Retour au tableau de bord
          </Button>
          <Button fullWidth variant="outline" onClick={() => {
            setPublished(false);
            setTitle("");
            setPrice("");
            setDescription("");
            setPhotos([]);
            setMainPhotoIndex(0);
            setCategories([]);
            setValidationErrors([]);
          }}>
            Ajouter un autre produit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header title="Ajouter un produit" onBack={() => router.back()} />

      <div className="flex-1 px-4 lg:px-0 py-6 max-w-xl mx-auto w-full">
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

        {/* Category */}
        <div className="mb-4">
          <label className="text-sm mb-2 block">Catégorie</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
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
          <p className="text-xs text-muted-foreground mt-2">
            Vous pouvez selectionner plusieurs categories.
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
          <Button fullWidth variant="outline" size="lg">
            Brouillon
          </Button>
          <Button
            fullWidth
            variant="accent"
            size="lg"
            onClick={() => {
              const run = async () => {
                if (!validateForm()) return;
                if (!user?.id || !accessToken) {
                  setValidationErrors(["Session invalide. Merci de vous reconnecter."]);
                  return;
                }

                setIsPublishing(true);
                setValidationErrors([]);
                try {
                  const normalizedMainPhotoIndex = Math.min(mainPhotoIndex, Math.max(0, photos.length - 1));
                  const mainImageUrl = photos[normalizedMainPhotoIndex];
                  await createSellerProduct({
                    userId: user.id,
                    accessToken,
                    title: title.trim(),
                    description: description.trim(),
                    price: Number(price.replace(",", ".")),
                    stock: Number(stock),
                    categories,
                    pickup,
                    delivery,
                    mainImageUrl,
                    imageUrls: photos,
                  });
                  setPublished(true);
                } catch (error) {
                  const rawMessage = error instanceof Error ? error.message : "Impossible de publier le produit.";
                  const message = rawMessage.includes("products_main_image_required_if_published")
                    ? "Choisissez une image principale valide."
                    : rawMessage.includes("schema cache") || rawMessage.includes("column")
                      ? "Base de données pas à jour. Lancez les migrations Supabase puis réessayez."
                      : rawMessage.includes("payload too large")
                        ? "Images trop lourdes. Réduisez la taille des photos puis réessayez."
                        : rawMessage;
                  setValidationErrors([message]);
                } finally {
                  setIsPublishing(false);
                }
              };
              void run();
            }}
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
