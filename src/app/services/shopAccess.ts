const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const ASSIGNABLE_MEMBER_ROLES = ["manager", "support", "catalog", "content"] as const;

export type SellerAccessRole = "owner" | (typeof ASSIGNABLE_MEMBER_ROLES)[number];

interface ShopOwnerRow {
  id: string;
  name?: string | null;
  owner_user_id: string | null;
  business_type_configured?: boolean | null;
}

interface ShopMemberRow {
  id: string;
  shop_id: string;
  role: string;
}

interface ShopMemberRoleRow {
  role: string;
}

export interface ManagedShopAccess {
  shopId: string;
  shopName: string;
  isOwner: boolean;
  primaryRole: SellerAccessRole;
  roles: SellerAccessRole[];
  businessTypeConfigured: boolean;
  canManageCatalog: boolean;
  canManageContent: boolean;
  canSupport: boolean;
  canManageMembers: boolean;
  canManageSettings: boolean;
}

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function isSchemaCompatibilityError(message: string, terms: string[]) {
  const normalized = message.toLowerCase();
  return (
    /schema cache|column|relation|function|does not exist/i.test(normalized) &&
    terms.some((term) => normalized.includes(term.toLowerCase()))
  );
}

function uniqueShopIds(shopIds: string[]) {
  return Array.from(new Set(shopIds.map((shopId) => shopId.trim()).filter(Boolean)));
}

function encodeInList(values: string[]) {
  return values.map((value) => `"${value}"`).join(",");
}

function isAssignableMemberRole(role: string): role is (typeof ASSIGNABLE_MEMBER_ROLES)[number] {
  return ASSIGNABLE_MEMBER_ROLES.includes(role as (typeof ASSIGNABLE_MEMBER_ROLES)[number]);
}

async function requestSupabase<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: string }).message)
        : "Erreur Supabase.";
    throw new Error(message);
  }

  return payload as T;
}

function buildManagedShopAccess(params: {
  shopId: string;
  shopName?: string | null;
  businessTypeConfigured?: boolean | null;
  primaryRole: SellerAccessRole;
  additionalRoles: string[];
  isOwner: boolean;
}): ManagedShopAccess {
  const assignableRoles = params.additionalRoles.filter(isAssignableMemberRole);
  const roles: SellerAccessRole[] = params.isOwner
    ? ["owner"]
    : ([params.primaryRole, ...assignableRoles.filter((role) => role !== params.primaryRole)] as SellerAccessRole[]);

  const hasRole = (...expected: SellerAccessRole[]) => roles.some((role) => expected.includes(role));

  return {
    shopId: params.shopId,
    shopName: params.shopName?.trim() || "Entreprise",
    isOwner: params.isOwner,
    primaryRole: params.primaryRole,
    roles,
    businessTypeConfigured: Boolean(params.businessTypeConfigured),
    canManageCatalog: params.isOwner || hasRole("manager", "catalog"),
    canManageContent: params.isOwner || hasRole("manager", "content"),
    canSupport: params.isOwner || hasRole("manager", "support"),
    canManageMembers: params.isOwner,
    canManageSettings: params.isOwner,
  };
}

export async function fetchManagedShopAccess(params: {
  userId: string;
  accessToken: string;
}): Promise<ManagedShopAccess | null> {
  if (!hasSupabaseConfig()) return null;
  if (!params.userId.trim() || !params.accessToken.trim()) return null;

  const ownerRows = await requestSupabase<ShopOwnerRow[]>(
    `shops?owner_user_id=eq.${params.userId}&select=id,name,owner_user_id,business_type_configured&order=created_at.asc&limit=1`,
    params.accessToken
  );
  if (ownerRows[0]) {
    return buildManagedShopAccess({
      shopId: ownerRows[0].id,
      shopName: ownerRows[0].name,
      businessTypeConfigured: ownerRows[0].business_type_configured,
      primaryRole: "owner",
      additionalRoles: [],
      isOwner: true,
    });
  }

  let memberships: ShopMemberRow[] = [];
  try {
    memberships = await requestSupabase<ShopMemberRow[]>(
      `shop_members?user_id=eq.${params.userId}&select=id,shop_id,role&order=created_at.asc&limit=1`,
      params.accessToken
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!isSchemaCompatibilityError(message, ["shop_members"])) {
      throw error;
    }
    return null;
  }

  const membership = memberships[0];
  if (!membership?.shop_id) return null;

  const shopRows = await requestSupabase<ShopOwnerRow[]>(
    `shops?id=eq.${membership.shop_id}&select=id,name,owner_user_id,business_type_configured&limit=1`,
    params.accessToken
  );
  const shop = shopRows[0];
  if (!shop) return null;

  let roleRows: ShopMemberRoleRow[] = [];
  try {
    roleRows = await requestSupabase<ShopMemberRoleRow[]>(
      `shop_member_roles?shop_member_id=eq.${membership.id}&select=role`,
      params.accessToken
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!isSchemaCompatibilityError(message, ["shop_member_roles"])) {
      throw error;
    }
    roleRows = [];
  }

  const primaryRole = isAssignableMemberRole(membership.role) ? membership.role : "support";
  return buildManagedShopAccess({
    shopId: shop.id,
    shopName: shop.name,
    businessTypeConfigured: shop.business_type_configured,
    primaryRole,
    additionalRoles: roleRows.map((row) => row.role),
    isOwner: false,
  });
}

export async function resolveSellerEntryPath(params: {
  userId: string;
  accessToken: string | null;
  siretVerified: boolean;
}): Promise<"/dashboard" | "/siret"> {
  if (params.accessToken?.trim()) {
    try {
      const access = await fetchManagedShopAccess({
        userId: params.userId,
        accessToken: params.accessToken,
      });
      if (access?.shopId) {
        return "/dashboard";
      }
    } catch {
      // Fall back to the legacy seller routing below.
    }
  }

  return params.siretVerified ? "/dashboard" : "/siret";
}

export async function fetchInternalShopIds(params: {
  shopIds: string[];
  userId: string;
  accessToken: string;
}): Promise<string[]> {
  if (!hasSupabaseConfig()) return [];

  const shopIds = uniqueShopIds(params.shopIds);
  if (!params.userId.trim() || !params.accessToken.trim() || shopIds.length === 0) {
    return [];
  }

  const inFilter = shopIds.join(",");
  const internalShopIds = new Set<string>();

  const ownerRows = await requestSupabase<ShopOwnerRow[]>(
    `shops?select=id,owner_user_id&id=in.(${inFilter})`,
    params.accessToken
  );

  ownerRows.forEach((shop) => {
    if (shop.owner_user_id === params.userId) {
      internalShopIds.add(shop.id);
    }
  });

  try {
    const memberRows = await requestSupabase<ShopMemberRow[]>(
      `shop_members?select=shop_id&user_id=eq.${params.userId}&shop_id=in.(${encodeInList(shopIds)})`,
      params.accessToken
    );

    memberRows.forEach((membership) => {
      internalShopIds.add(membership.shop_id);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!isSchemaCompatibilityError(message, ["shop_members"])) {
      throw error;
    }
  }

  return Array.from(internalShopIds);
}

export async function isShopInternalUser(params: {
  shopId: string;
  userId: string;
  accessToken: string;
}): Promise<boolean> {
  const internalShopIds = await fetchInternalShopIds({
    shopIds: [params.shopId],
    userId: params.userId,
    accessToken: params.accessToken,
  });

  return internalShopIds.includes(params.shopId);
}
