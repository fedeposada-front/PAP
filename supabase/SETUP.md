# Supabase Setup (MVP)

## 1) Créer le projet Supabase
- Va sur Supabase et crée un nouveau projet (région Europe).
- Note les valeurs `Project URL` et `anon public key`.

## 2) Créer le schéma de base
- Ouvre `SQL Editor`.
- Colle le contenu de `supabase/schema.sql`.
- Exécute le script.

## 2.1) Appliquer les migrations
- Toujours après le schéma de base, exécute aussi les fichiers SQL dans `supabase/migrations/` (du plus ancien au plus récent).
- Pour les derniers écrans vendeur (settings + produits), exécute:
  - `supabase/migrations/20260309_shop_settings_and_product_media.sql`

## 3) Configurer le frontend
- Copie `.env.example` en `.env.local`.
- Renseigne:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

## 3.1) Notifications email messages
- Pour la queue de notifications email, execute aussi:
  - `supabase/migrations/20260323_message_email_notification_jobs.sql`
- Variables serveur a preparer:
  - `APP_URL`
  - `EMAIL_PROVIDER`
  - `EMAIL_FROM`
  - `RESEND_API_KEY` ou `BREVO_API_KEY`
  - `NOTIFICATION_WORKER_SECRET`
- Tant qu'aucun provider n'est configure, les jobs seront crees mais marques `provider_missing`.

## 4) Vérifier les tables
- Dans `Table Editor`, vérifie la présence de:
  - `profiles`
  - `favorite_products`
  - `followed_shops`
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

## 7) Regle vendeur (SIRET obligatoire)
- Un vendeur ne peut pas acceder au dashboard / publier sans `siret_verified = true`.
- Si tu mets a jour un projet existant, rejoue `supabase/schema.sql` pour ajouter:
  - `profiles.siret_number`
  - `profiles.siret_verified`
  - `profiles.shop_address`
  - `profiles.seller_attested`
  - `profiles.seller_vacation_mode`
  - `profiles.seller_deactivated`
