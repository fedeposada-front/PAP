import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Camera,
  Plus,
  X,
  MapPin,
  Truck,
  Check,
  Image as ImageIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { Button, Input, Badge, Header, Chip } from "../ds";
import { CATEGORIES, IMAGES } from "../../data/mock-data";

export function AddProductScreen() {
  const navigate = useNavigate();
  const [published, setPublished] = useState(false);
  const [photos, setPhotos] = useState<string[]>([IMAGES.macarons]);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("5");
  const [category, setCategory] = useState("");
  const [pickup, setPickup] = useState(true);
  const [delivery, setDelivery] = useState(false);
  const [description, setDescription] = useState("");

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
          <Button fullWidth variant="accent" onClick={() => navigate("/dashboard")}>
            Retour au tableau de bord
          </Button>
          <Button fullWidth variant="outline" onClick={() => {
            setPublished(false);
            setTitle("");
            setPrice("");
            setDescription("");
            setPhotos([]);
          }}>
            Ajouter un autre produit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header title="Ajouter un produit" onBack={() => navigate(-1)} />

      <div className="flex-1 px-4 lg:px-0 py-6 max-w-xl mx-auto w-full">
        {/* Photos */}
        <div className="mb-6">
          <label className="text-sm mb-2 block">
            Photos <span className="text-muted-foreground">(min. 1, max. 5)</span>
          </label>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {photos.map((photo, i) => (
              <div
                key={i}
                className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 border border-border"
              >
                <img src={photo} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() =>
                    setPhotos(photos.filter((_, idx) => idx !== i))
                  }
                  className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setPhotos([...photos, IMAGES.chocolate])}
              className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-coral/30 hover:text-coral transition-colors flex-shrink-0"
            >
              <Camera className="w-5 h-5" />
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
                active={category === cat.id}
                onClick={() => setCategory(cat.id)}
                icon={<span className="text-sm">{cat.icon}</span>}
              >
                {cat.label}
              </Chip>
            ))}
          </div>
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
            onClick={() => setPublished(true)}
          >
            Publier
          </Button>
        </div>
      </div>
    </div>
  );
}
