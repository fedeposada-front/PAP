# Supabase Setup (MVP)

## 1) Créer le projet Supabase
- Va sur Supabase et crée un nouveau projet (région Europe).
- Note les valeurs `Project URL` et `anon public key`.

## 2) Créer le schéma de base
- Ouvre `SQL Editor`.
- Colle le contenu de `supabase/schema.sql`.
- Exécute le script.

## 3) Configurer le frontend
- Copie `.env.example` en `.env.local`.
- Renseigne:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 4) Vérifier les tables
- Dans `Table Editor`, vérifie la présence de:
  - `shops`
  - `products`
  - `lead_events`
  - `ads`
  - `ad_impressions`
  - `ad_clicks`

## 5) Optionnel immédiat
- Ajoute 1 boutique + 2 produits via `Table Editor` pour valider la lecture depuis l'app.

## 6) Ajouter une premiere publicite
- Cree une ligne dans `ads` avec:
  - `placement = home_sidebar`
  - `city = Amiens`
  - `is_active = true`
  - `title`, `subtitle`, `cta_label`
  - `target_url` ou `shop_id`
- La home chargera automatiquement cette pub pour la ville courante.
