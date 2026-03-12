-- 2026-03-09
-- Seller payout fields on profiles
-- Safe to run multiple times.

alter table public.profiles
  add column if not exists payout_iban text,
  add column if not exists payout_bank_name text,
  add column if not exists payout_account_holder text,
  add column if not exists payout_active boolean not null default true;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_payout_iban_format'
  ) then
    alter table public.profiles
      add constraint profiles_payout_iban_format
      check (
        payout_iban is null
        or (
          payout_iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$'
          and char_length(payout_iban) between 15 and 34
          and (left(payout_iban, 2) <> 'FR' or char_length(payout_iban) = 27)
        )
      );
  end if;
end
$$;
