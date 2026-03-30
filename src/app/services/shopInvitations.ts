const ASSIGNABLE_SHOP_MEMBER_ROLES = ["manager", "support", "catalog", "content"] as const;

export type AssignableShopMemberRole = (typeof ASSIGNABLE_SHOP_MEMBER_ROLES)[number];

export interface ShopInvitationCreateResult {
  ok: boolean;
  invitationId: string;
  invitationUrl: string;
  shopName: string;
  invitedEmail: string;
  roles: AssignableShopMemberRole[];
  message: string;
  emailSent: boolean;
}

export interface ShopInvitationListItem {
  id: string;
  invitedEmail: string;
  primaryRole: AssignableShopMemberRole;
  roles: AssignableShopMemberRole[];
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  createdAt: string;
}

export interface ShopMemberListItem {
  id: string;
  userId: string;
  displayName: string;
  primaryRole: string;
  roles: AssignableShopMemberRole[];
  createdAt: string | null;
}

interface ApiEnvelope<T> {
  ok?: boolean;
  result?: T;
  message?: string;
}

async function requestApi<T>(path: string, init: RequestInit, accessToken: string): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok) {
    throw new Error(payload?.message ?? "Erreur invitations.");
  }

  return (payload?.result ?? null) as T;
}

export async function createShopMemberInvitation(params: {
  accessToken: string;
  shopId: string;
  invitedEmail: string;
  roles: AssignableShopMemberRole[];
}): Promise<ShopInvitationCreateResult> {
  const response = await fetch("/api/shop-members/invitations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      shopId: params.shopId,
      invitedEmail: params.invitedEmail,
      roles: params.roles,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<ShopInvitationCreateResult>
    | null;

  if (payload?.result) {
    return payload.result;
  }

  throw new Error(payload?.message ?? "Impossible d'envoyer l'invitation.");
}

export async function fetchPendingShopInvitations(params: {
  accessToken: string;
  shopId: string;
}): Promise<ShopInvitationListItem[]> {
  return requestApi<ShopInvitationListItem[]>(
    `/api/shop-members/invitations?shopId=${encodeURIComponent(params.shopId)}`,
    { method: "GET" },
    params.accessToken
  );
}

export async function revokeShopInvitation(params: {
  accessToken: string;
  invitationId: string;
}) {
  await requestApi<null>(
    `/api/shop-members/invitations?invitationId=${encodeURIComponent(params.invitationId)}`,
    { method: "DELETE" },
    params.accessToken
  );
}

export async function fetchShopMembers(params: {
  accessToken: string;
  shopId: string;
}): Promise<ShopMemberListItem[]> {
  return requestApi<ShopMemberListItem[]>(
    `/api/shop-members?shopId=${encodeURIComponent(params.shopId)}`,
    { method: "GET" },
    params.accessToken
  );
}

export async function updateShopMemberRoles(params: {
  accessToken: string;
  memberId: string;
  roles: AssignableShopMemberRole[];
}): Promise<ShopMemberListItem> {
  return requestApi<ShopMemberListItem>(
    `/api/shop-members/${encodeURIComponent(params.memberId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        roles: params.roles,
      }),
    },
    params.accessToken
  );
}

export async function removeShopMember(params: {
  accessToken: string;
  memberId: string;
}) {
  await requestApi<null>(
    `/api/shop-members/${encodeURIComponent(params.memberId)}`,
    { method: "DELETE" },
    params.accessToken
  );
}

export { ASSIGNABLE_SHOP_MEMBER_ROLES };
