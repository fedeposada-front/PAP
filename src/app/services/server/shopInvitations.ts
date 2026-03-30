import { createHash, randomBytes } from "crypto";

import { sendTransactionalEmail } from "./email";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const APP_URL = process.env.APP_URL?.trim() ?? process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";

export const ASSIGNABLE_SHOP_MEMBER_ROLES = [
  "manager",
  "support",
  "catalog",
  "content",
] as const;

export type AssignableShopMemberRole = (typeof ASSIGNABLE_SHOP_MEMBER_ROLES)[number];

type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

interface AuthenticatedUserResponse {
  id: string;
  email?: string | null;
}

interface ShopRow {
  id: string;
  name: string;
  owner_user_id: string | null;
}

interface ProfileRoleRow {
  id: string;
  roles: string[] | null;
  active_role: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

interface ShopMemberRow {
  id: string;
  shop_id: string;
  user_id: string;
  role: string;
  created_at?: string | null;
}

interface ShopMemberRoleRow {
  shop_member_id?: string;
  role: string;
}

interface ShopMemberInvitationRow {
  id: string;
  shop_id: string;
  invited_email: string;
  primary_role: AssignableShopMemberRole;
  token_hash: string;
  invited_by_user_id: string | null;
  accepted_by_user_id: string | null;
  status: InvitationStatus;
  expires_at: string;
  last_sent_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  provider: string | null;
  provider_message_id: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

interface ShopMemberInvitationRoleRow {
  invitation_id?: string;
  role: AssignableShopMemberRole;
}

interface MemberListProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

export interface ShopInvitationPreview {
  id: string;
  shopId: string;
  shopName: string;
  invitedEmailMasked: string;
  primaryRole: AssignableShopMemberRole;
  roles: AssignableShopMemberRole[];
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt: string | null;
}

export interface CreateShopInvitationResult {
  ok: boolean;
  invitationId: string;
  invitationUrl: string;
  shopName: string;
  invitedEmail: string;
  roles: AssignableShopMemberRole[];
  message: string;
  emailSent: boolean;
}

export interface AcceptShopInvitationResult {
  ok: true;
  shopId: string;
  shopName: string;
  memberId: string | null;
  roles: AssignableShopMemberRole[];
  alreadyAccepted: boolean;
}

export interface ShopInvitationListItem {
  id: string;
  invitedEmail: string;
  primaryRole: AssignableShopMemberRole;
  roles: AssignableShopMemberRole[];
  status: InvitationStatus;
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

function hasServerSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function maskEmail(email: string) {
  const normalized = normalizeEmail(email);
  const [local, domain] = normalized.split("@");
  if (!local || !domain) return normalized;
  const localMasked = local.length <= 2 ? `${local[0] ?? ""}*` : `${local.slice(0, 2)}***`;
  return `${localMasked}@${domain}`;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function encodeInList(values: string[]) {
  return values.map((value) => `"${value}"`).join(",");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createInvitationToken() {
  return randomBytes(24).toString("hex");
}

function buildAppUrl(requestOrigin?: string) {
  return APP_URL || requestOrigin || "http://localhost:3000";
}

function buildInvitationUrl(baseUrl: string, token: string) {
  return `${baseUrl.replace(/\/$/, "")}/invite/${encodeURIComponent(token)}`;
}

function isAssignableRole(value: string): value is AssignableShopMemberRole {
  return ASSIGNABLE_SHOP_MEMBER_ROLES.includes(value as AssignableShopMemberRole);
}

function normalizeRoles(roles: string[]) {
  const unique = [...new Set(roles.map((role) => role.trim().toLowerCase()).filter(Boolean))];
  return unique.filter(isAssignableRole) as AssignableShopMemberRole[];
}

function buildOrderedAssignableRoles(primaryRole: string, roles: AssignableShopMemberRole[]) {
  const ordered = [...new Set(roles)];
  if (!isAssignableRole(primaryRole)) return ordered;
  return [primaryRole, ...ordered.filter((role) => role !== primaryRole)];
}

function getEffectiveStatus(invitation: Pick<ShopMemberInvitationRow, "status" | "expires_at">): InvitationStatus {
  if (invitation.status !== "pending") return invitation.status;
  return new Date(invitation.expires_at).getTime() <= Date.now() ? "expired" : "pending";
}

function formatRoleLabel(role: AssignableShopMemberRole) {
  switch (role) {
    case "manager":
      return "gestion";
    case "support":
      return "support";
    case "catalog":
      return "catalogue";
    case "content":
      return "contenu";
    default:
      return role;
  }
}

function formatInviterLabel(profile: ProfileRoleRow | null, fallbackEmail: string) {
  const firstName = profile?.first_name?.trim() ?? "";
  const lastName = profile?.last_name?.trim() ?? "";
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || fallbackEmail;
}

function formatMemberDisplayName(profile: MemberListProfileRow | null, userId: string) {
  const firstName = profile?.first_name?.trim() ?? "";
  const lastName = profile?.last_name?.trim() ?? "";
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || `Membre ${userId.slice(0, 8)}`;
}

function buildInvitationEmail(params: {
  shopName: string;
  inviterLabel: string;
  invitationUrl: string;
  roles: AssignableShopMemberRole[];
}) {
  const rolesLabel = params.roles.map(formatRoleLabel).join(", ");
  const safeShop = escapeHtml(params.shopName);
  const safeInviter = escapeHtml(params.inviterLabel);
  const safeRoles = escapeHtml(rolesLabel);
  const safeUrl = escapeHtml(params.invitationUrl);

  return {
    subject: `${params.inviterLabel} vous invite a rejoindre ${params.shopName} sur LOVCAL`,
    text: [
      `Bonjour,`,
      "",
      `${params.inviterLabel} vous invite a rejoindre ${params.shopName} sur LOVCAL.`,
      `Acces proposes : ${rolesLabel}.`,
      "",
      `Accepter l'invitation : ${params.invitationUrl}`,
      "",
      `Si vous n'avez pas demande cet acces, ignorez simplement cet email.`,
    ].join("\n"),
    html: [
      "<p>Bonjour,</p>",
      `<p><strong>${safeInviter}</strong> vous invite a rejoindre <strong>${safeShop}</strong> sur LOVCAL.</p>`,
      `<p>Acces proposes : <strong>${safeRoles}</strong>.</p>`,
      `<p><a href="${safeUrl}" style="display:inline-block;padding:12px 18px;background:#ef6f79;color:#ffffff;text-decoration:none;border-radius:999px;">Accepter l'invitation</a></p>`,
      `<p style="font-size:14px;color:#6b7280;">Si vous n'avez pas demande cet acces, ignorez simplement cet email.</p>`,
    ].join(""),
  };
}

async function requestSupabaseRest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
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

async function fetchAuthenticatedUser(accessToken: string): Promise<AuthenticatedUserResponse | null> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) return null;
  const payload = (await response.json().catch(() => null)) as AuthenticatedUserResponse | null;
  return payload;
}

async function fetchShopById(shopId: string) {
  const rows = await requestSupabaseRest<ShopRow[]>(
    `shops?id=eq.${shopId}&select=id,name,owner_user_id&limit=1`
  );
  return rows[0] ?? null;
}

async function fetchInvitationByTokenHash(tokenHash: string) {
  const rows = await requestSupabaseRest<ShopMemberInvitationRow[]>(
    `shop_member_invitations?token_hash=eq.${tokenHash}&select=id,shop_id,invited_email,primary_role,token_hash,invited_by_user_id,accepted_by_user_id,status,expires_at,last_sent_at,accepted_at,revoked_at,provider,provider_message_id,last_error,created_at,updated_at&limit=1`
  );
  return rows[0] ?? null;
}

async function fetchInvitationById(invitationId: string) {
  const rows = await requestSupabaseRest<ShopMemberInvitationRow[]>(
    `shop_member_invitations?id=eq.${invitationId}&select=id,shop_id,invited_email,primary_role,token_hash,invited_by_user_id,accepted_by_user_id,status,expires_at,last_sent_at,accepted_at,revoked_at,provider,provider_message_id,last_error,created_at,updated_at&limit=1`
  );
  return rows[0] ?? null;
}

async function fetchPendingInvitationsByShop(shopId: string) {
  return requestSupabaseRest<ShopMemberInvitationRow[]>(
    `shop_member_invitations?shop_id=eq.${shopId}&status=eq.pending&select=id,shop_id,invited_email,primary_role,token_hash,invited_by_user_id,accepted_by_user_id,status,expires_at,last_sent_at,accepted_at,revoked_at,provider,provider_message_id,last_error,created_at,updated_at&order=created_at.desc`
  );
}

async function fetchInvitationRoles(invitationId: string) {
  const rows = await requestSupabaseRest<ShopMemberInvitationRoleRow[]>(
    `shop_member_invitation_roles?invitation_id=eq.${invitationId}&select=role&order=created_at.asc`
  );
  return normalizeRoles(rows.map((row) => row.role));
}

async function fetchInvitationRolesByInvitationIds(invitationIds: string[]) {
  if (invitationIds.length === 0) return [] as Array<{ invitationId: string; role: AssignableShopMemberRole }>;

  const rows = await requestSupabaseRest<ShopMemberInvitationRoleRow[]>(
    `shop_member_invitation_roles?invitation_id=in.(${encodeInList(invitationIds)})&select=invitation_id,role&order=created_at.asc`
  );

  return rows.flatMap((row) =>
    row.invitation_id && isAssignableRole(row.role)
      ? [{ invitationId: row.invitation_id, role: row.role }]
      : []
  );
}

async function fetchMemberByShopAndUser(shopId: string, userId: string) {
  const rows = await requestSupabaseRest<ShopMemberRow[]>(
    `shop_members?shop_id=eq.${shopId}&user_id=eq.${userId}&select=id,shop_id,user_id,role&limit=1`
  );
  return rows[0] ?? null;
}

async function fetchMemberById(shopMemberId: string) {
  const rows = await requestSupabaseRest<ShopMemberRow[]>(
    `shop_members?id=eq.${shopMemberId}&select=id,shop_id,user_id,role&limit=1`
  );
  return rows[0] ?? null;
}

async function fetchMembersByShop(shopId: string) {
  return requestSupabaseRest<ShopMemberRow[]>(
    `shop_members?shop_id=eq.${shopId}&select=id,shop_id,user_id,role,created_at&order=created_at.asc`
  );
}

async function fetchMemberRoles(shopMemberId: string) {
  const rows = await requestSupabaseRest<ShopMemberRoleRow[]>(
    `shop_member_roles?shop_member_id=eq.${shopMemberId}&select=role`
  );
  return normalizeRoles(rows.map((row) => row.role));
}

async function fetchMemberRolesByMemberIds(shopMemberIds: string[]) {
  if (shopMemberIds.length === 0) return [] as Array<{ shopMemberId: string; role: AssignableShopMemberRole }>;

  const rows = await requestSupabaseRest<ShopMemberRoleRow[]>(
    `shop_member_roles?shop_member_id=in.(${encodeInList(shopMemberIds)})&select=shop_member_id,role`
  );

  return rows.flatMap((row) =>
    row.shop_member_id && isAssignableRole(row.role)
      ? [{ shopMemberId: row.shop_member_id, role: row.role }]
      : []
  );
}

async function fetchProfile(userId: string) {
  const rows = await requestSupabaseRest<ProfileRoleRow[]>(
    `profiles?id=eq.${userId}&select=id,roles,active_role,first_name,last_name&limit=1`
  );
  return rows[0] ?? null;
}

async function fetchProfilesByIds(userIds: string[]) {
  if (userIds.length === 0) return [] as MemberListProfileRow[];
  return requestSupabaseRest<MemberListProfileRow[]>(
    `profiles?id=in.(${encodeInList(userIds)})&select=id,first_name,last_name`
  );
}

async function revokePendingInvitations(shopId: string, invitedEmail: string) {
  await requestSupabaseRest(
    `shop_member_invitations?shop_id=eq.${shopId}&status=eq.pending&invited_email=eq.${encodeURIComponent(invitedEmail)}`,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        status: "revoked",
        revoked_at: new Date().toISOString(),
        last_error: null,
      }),
    }
  );
}

async function markInvitationExpired(invitationId: string) {
  await requestSupabaseRest(
    `shop_member_invitations?id=eq.${invitationId}`,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        status: "expired",
        last_error: null,
      }),
    }
  );
}

async function deleteMemberRoles(shopMemberId: string, roles: AssignableShopMemberRole[]) {
  if (roles.length === 0) return;
  await requestSupabaseRest(
    `shop_member_roles?shop_member_id=eq.${shopMemberId}&role=in.(${encodeInList(roles)})`,
    {
      method: "DELETE",
      headers: {
        Prefer: "return=minimal",
      },
    }
  );
}

async function deleteShopMember(shopMemberId: string) {
  await requestSupabaseRest(
    `shop_members?id=eq.${shopMemberId}`,
    {
      method: "DELETE",
      headers: {
        Prefer: "return=minimal",
      },
    }
  );
}

async function assertOwnerForShop(accessToken: string, shopId: string) {
  const authUser = await fetchAuthenticatedUser(accessToken);
  if (!authUser?.id) {
    throw new Error("Session invalide.");
  }

  const shop = await fetchShopById(shopId.trim());
  if (!shop) {
    throw new Error("Entreprise introuvable.");
  }
  if (shop.owner_user_id !== authUser.id) {
    throw new Error("Seul le proprietaire peut gerer les membres.");
  }

  return { authUser, shop };
}

async function assertOwnerForInvitation(accessToken: string, invitationId: string) {
  const authUser = await fetchAuthenticatedUser(accessToken);
  if (!authUser?.id) {
    throw new Error("Session invalide.");
  }

  const invitation = await fetchInvitationById(invitationId.trim());
  if (!invitation) {
    throw new Error("Invitation introuvable.");
  }

  const shop = await fetchShopById(invitation.shop_id);
  if (!shop) {
    throw new Error("Entreprise introuvable.");
  }
  if (shop.owner_user_id !== authUser.id) {
    throw new Error("Seul le proprietaire peut gerer les membres.");
  }

  return { authUser, shop, invitation };
}

async function assertOwnerForMember(accessToken: string, shopMemberId: string) {
  const authUser = await fetchAuthenticatedUser(accessToken);
  if (!authUser?.id) {
    throw new Error("Session invalide.");
  }

  const member = await fetchMemberById(shopMemberId.trim());
  if (!member) {
    throw new Error("Membre introuvable.");
  }

  const shop = await fetchShopById(member.shop_id);
  if (!shop) {
    throw new Error("Entreprise introuvable.");
  }
  if (shop.owner_user_id !== authUser.id) {
    throw new Error("Seul le proprietaire peut gerer les membres.");
  }

  return { authUser, shop, member };
}

function mapShopMemberRow(params: {
  member: ShopMemberRow & { created_at?: string | null };
  roles: AssignableShopMemberRole[];
  profile: MemberListProfileRow | null;
}) {
  const orderedRoles = buildOrderedAssignableRoles(params.member.role, params.roles);

  return {
    id: params.member.id,
    userId: params.member.user_id,
    displayName: formatMemberDisplayName(params.profile, params.member.user_id),
    primaryRole: params.member.role,
    roles: orderedRoles,
    createdAt: params.member.created_at ?? null,
  } satisfies ShopMemberListItem;
}

async function insertInvitation(params: {
  shopId: string;
  invitedEmail: string;
  primaryRole: AssignableShopMemberRole;
  tokenHash: string;
  invitedByUserId: string;
  expiresAt: string;
}) {
  const rows = await requestSupabaseRest<ShopMemberInvitationRow[]>(
    "shop_member_invitations?select=id,shop_id,invited_email,primary_role,token_hash,invited_by_user_id,accepted_by_user_id,status,expires_at,last_sent_at,accepted_at,revoked_at,provider,provider_message_id,last_error,created_at,updated_at",
    {
      method: "POST",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify([
        {
          shop_id: params.shopId,
          invited_email: params.invitedEmail,
          primary_role: params.primaryRole,
          token_hash: params.tokenHash,
          invited_by_user_id: params.invitedByUserId,
          expires_at: params.expiresAt,
        },
      ]),
    }
  );
  return rows[0] ?? null;
}

async function insertInvitationRoles(invitationId: string, roles: AssignableShopMemberRole[]) {
  if (roles.length === 0) return;
  await requestSupabaseRest(
    "shop_member_invitation_roles",
    {
      method: "POST",
      headers: {
        Prefer: "return=minimal",
      },
      body: JSON.stringify(
        roles.map((role) => ({
          invitation_id: invitationId,
          role,
        }))
      ),
    }
  );
}

async function updateInvitation(invitationId: string, patch: Record<string, unknown>) {
  await requestSupabaseRest(
    `shop_member_invitations?id=eq.${invitationId}`,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal",
      },
      body: JSON.stringify(patch),
    }
  );
}

async function createMember(params: {
  shopId: string;
  userId: string;
  primaryRole: AssignableShopMemberRole;
  createdByUserId: string | null;
}) {
  const rows = await requestSupabaseRest<ShopMemberRow[]>(
    "shop_members?select=id,shop_id,user_id,role",
    {
      method: "POST",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify([
        {
          shop_id: params.shopId,
          user_id: params.userId,
          role: params.primaryRole,
          created_by_user_id: params.createdByUserId,
        },
      ]),
    }
  );
  return rows[0] ?? null;
}

async function updateMemberPrimaryRole(shopMemberId: string, primaryRole: AssignableShopMemberRole) {
  await requestSupabaseRest(
    `shop_members?id=eq.${shopMemberId}`,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ role: primaryRole }),
    }
  );
}

async function insertMissingMemberRoles(shopMemberId: string, roles: AssignableShopMemberRole[]) {
  if (roles.length === 0) return;
  const existingRoles = await fetchMemberRoles(shopMemberId);
  const missing = roles.filter((role) => !existingRoles.includes(role));
  if (missing.length === 0) return;

  await requestSupabaseRest(
    "shop_member_roles",
    {
      method: "POST",
      headers: {
        Prefer: "return=minimal",
      },
      body: JSON.stringify(
        missing.map((role) => ({
          shop_member_id: shopMemberId,
          role,
        }))
      ),
    }
  );
}

async function ensureSellerRoleOnProfile(userId: string) {
  const profile = await fetchProfile(userId);
  const existingRoles = Array.isArray(profile?.roles)
    ? profile.roles.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : ["buyer"];

  const nextRoles = [...new Set([...existingRoles, "seller"])];
  const nextActiveRole = "seller";

  await requestSupabaseRest(
    "profiles?on_conflict=id",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify([
        {
          id: userId,
          roles: nextRoles,
          active_role: nextActiveRole,
        },
      ]),
    }
  );
}

export async function fetchShopInvitationPreviewByToken(token: string): Promise<ShopInvitationPreview | null> {
  if (!hasServerSupabaseConfig()) {
    throw new Error("Configuration serveur Supabase manquante.");
  }

  const normalizedToken = token.trim();
  if (!normalizedToken) return null;

  const invitation = await fetchInvitationByTokenHash(hashToken(normalizedToken));
  if (!invitation) return null;

  const effectiveStatus = getEffectiveStatus(invitation);
  if (effectiveStatus === "expired" && invitation.status === "pending") {
    await markInvitationExpired(invitation.id);
  }

  const [shop, roles] = await Promise.all([
    fetchShopById(invitation.shop_id),
    fetchInvitationRoles(invitation.id),
  ]);
  if (!shop) return null;

  return {
    id: invitation.id,
    shopId: invitation.shop_id,
    shopName: shop.name,
    invitedEmailMasked: maskEmail(invitation.invited_email),
    primaryRole: invitation.primary_role,
    roles: roles.length > 0 ? roles : [invitation.primary_role],
    status: effectiveStatus,
    expiresAt: invitation.expires_at,
    acceptedAt: invitation.accepted_at,
  };
}

export async function createShopMemberInvitation(params: {
  accessToken: string;
  shopId: string;
  invitedEmail: string;
  roles: string[];
  requestOrigin?: string;
}): Promise<CreateShopInvitationResult> {
  if (!hasServerSupabaseConfig()) {
    throw new Error("Configuration serveur Supabase manquante.");
  }

  const { authUser, shop } = await assertOwnerForShop(params.accessToken, params.shopId);
  if (!authUser.email) {
    throw new Error("Session invalide.");
  }

  const invitedEmail = normalizeEmail(params.invitedEmail);
  if (!isValidEmail(invitedEmail)) {
    throw new Error("Adresse email invalide.");
  }
  if (invitedEmail === normalizeEmail(authUser.email)) {
    throw new Error("Vous ne pouvez pas vous inviter vous-meme.");
  }

  const roles = normalizeRoles(params.roles);
  if (roles.length === 0) {
    throw new Error("Choisissez au moins un role.");
  }

  await revokePendingInvitations(shop.id, invitedEmail);

  const token = createInvitationToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const primaryRole = roles[0];

  const invitation = await insertInvitation({
    shopId: shop.id,
    invitedEmail,
    primaryRole,
    tokenHash,
    invitedByUserId: authUser.id,
    expiresAt,
  });

  if (!invitation) {
    throw new Error("Impossible de creer l'invitation.");
  }

  await insertInvitationRoles(invitation.id, roles);

  const inviterProfile = await fetchProfile(authUser.id);
  const inviterLabel = formatInviterLabel(inviterProfile, authUser.email);
  const invitationUrl = buildInvitationUrl(buildAppUrl(params.requestOrigin), token);
  const emailContent = buildInvitationEmail({
    shopName: shop.name,
    inviterLabel,
    invitationUrl,
    roles,
  });

  const sendResult = await sendTransactionalEmail({
    to: invitedEmail,
    subject: emailContent.subject,
    text: emailContent.text,
    html: emailContent.html,
  });

  if (!sendResult.ok) {
    await updateInvitation(invitation.id, {
      provider: sendResult.provider,
      last_error: sendResult.message,
      last_sent_at: new Date().toISOString(),
    });

    return {
      ok: false,
      invitationId: invitation.id,
      invitationUrl,
      shopName: shop.name,
      invitedEmail,
      roles,
      message: sendResult.message,
      emailSent: false,
    };
  }

  await updateInvitation(invitation.id, {
    provider: sendResult.provider,
    provider_message_id: sendResult.providerMessageId,
    last_error: null,
    last_sent_at: new Date().toISOString(),
  });

  return {
    ok: true,
    invitationId: invitation.id,
    invitationUrl,
    shopName: shop.name,
    invitedEmail,
    roles,
    message: "Invitation envoyee.",
    emailSent: true,
  };
}

export async function fetchOwnerPendingShopInvitations(params: {
  accessToken: string;
  shopId: string;
}): Promise<ShopInvitationListItem[]> {
  if (!hasServerSupabaseConfig()) {
    throw new Error("Configuration serveur Supabase manquante.");
  }

  const { shop } = await assertOwnerForShop(params.accessToken, params.shopId);
  const invitations = await fetchPendingInvitationsByShop(shop.id);
  if (invitations.length === 0) return [];

  const activeInvitations: ShopMemberInvitationRow[] = [];
  for (const invitation of invitations) {
    const effectiveStatus = getEffectiveStatus(invitation);
    if (effectiveStatus === "expired") {
      await markInvitationExpired(invitation.id);
      continue;
    }
    activeInvitations.push(invitation);
  }

  if (activeInvitations.length === 0) return [];

  const roleRows = await fetchInvitationRolesByInvitationIds(activeInvitations.map((invitation) => invitation.id));

  return activeInvitations.map((invitation) => {
    const roles = roleRows
      .filter((role) => role.invitationId === invitation.id)
      .map((role) => role.role);

    return {
      id: invitation.id,
      invitedEmail: invitation.invited_email,
      primaryRole: invitation.primary_role,
      roles: buildOrderedAssignableRoles(invitation.primary_role, roles),
      status: "pending",
      expiresAt: invitation.expires_at,
      createdAt: invitation.created_at,
    };
  });
}

export async function revokeShopMemberInvitation(params: {
  accessToken: string;
  invitationId: string;
}) {
  if (!hasServerSupabaseConfig()) {
    throw new Error("Configuration serveur Supabase manquante.");
  }

  const { invitation } = await assertOwnerForInvitation(params.accessToken, params.invitationId);
  const effectiveStatus = getEffectiveStatus(invitation);
  if (effectiveStatus === "accepted") {
    throw new Error("Cette invitation a deja ete acceptee.");
  }
  if (effectiveStatus === "revoked") {
    return;
  }
  if (effectiveStatus === "expired") {
    await markInvitationExpired(invitation.id);
    return;
  }

  await updateInvitation(invitation.id, {
    status: "revoked",
    revoked_at: new Date().toISOString(),
    last_error: null,
  });
}

export async function fetchOwnerShopMembers(params: {
  accessToken: string;
  shopId: string;
}): Promise<ShopMemberListItem[]> {
  if (!hasServerSupabaseConfig()) {
    throw new Error("Configuration serveur Supabase manquante.");
  }

  const { shop } = await assertOwnerForShop(params.accessToken, params.shopId);
  const members = await fetchMembersByShop(shop.id);
  if (members.length === 0) return [];

  const [roleRows, profileRows] = await Promise.all([
    fetchMemberRolesByMemberIds(members.map((member) => member.id)),
    fetchProfilesByIds(members.map((member) => member.user_id)),
  ]);

  return members.map((member) => {
    const roles = roleRows
      .filter((role) => role.shopMemberId === member.id)
      .map((role) => role.role);
    const profile = profileRows.find((row) => row.id === member.user_id) ?? null;
    return mapShopMemberRow({ member, roles, profile });
  });
}

export async function updateShopMemberRoles(params: {
  accessToken: string;
  shopMemberId: string;
  roles: string[];
}): Promise<ShopMemberListItem> {
  if (!hasServerSupabaseConfig()) {
    throw new Error("Configuration serveur Supabase manquante.");
  }

  const { member } = await assertOwnerForMember(params.accessToken, params.shopMemberId);
  const nextRoles = normalizeRoles(params.roles);
  if (nextRoles.length === 0) {
    throw new Error("Choisissez au moins un role.");
  }

  await updateMemberPrimaryRole(member.id, nextRoles[0]);

  const existingRoles = await fetchMemberRoles(member.id);
  const rolesToRemove = existingRoles.filter((role) => !nextRoles.includes(role));
  if (rolesToRemove.length > 0) {
    await deleteMemberRoles(member.id, rolesToRemove);
  }
  await insertMissingMemberRoles(member.id, nextRoles);

  const profileRows = await fetchProfilesByIds([member.user_id]);

  return mapShopMemberRow({
    member: {
      ...member,
      role: nextRoles[0],
    },
    roles: nextRoles,
    profile: profileRows[0] ?? null,
  });
}

export async function removeShopMember(params: {
  accessToken: string;
  shopMemberId: string;
}) {
  if (!hasServerSupabaseConfig()) {
    throw new Error("Configuration serveur Supabase manquante.");
  }

  const { member } = await assertOwnerForMember(params.accessToken, params.shopMemberId);
  if (member.role === "owner") {
    throw new Error("Le proprietaire principal ne peut pas etre retire.");
  }
  await deleteShopMember(member.id);
}

export async function acceptShopMemberInvitation(params: {
  accessToken: string;
  token: string;
}): Promise<AcceptShopInvitationResult> {
  if (!hasServerSupabaseConfig()) {
    throw new Error("Configuration serveur Supabase manquante.");
  }

  const authUser = await fetchAuthenticatedUser(params.accessToken);
  if (!authUser?.id || !authUser.email) {
    throw new Error("Session invalide.");
  }

  const token = params.token.trim();
  if (!token) {
    throw new Error("Invitation invalide.");
  }

  const invitation = await fetchInvitationByTokenHash(hashToken(token));
  if (!invitation) {
    throw new Error("Invitation introuvable.");
  }

  const effectiveStatus = getEffectiveStatus(invitation);
  if (effectiveStatus === "expired") {
    if (invitation.status === "pending") {
      await markInvitationExpired(invitation.id);
    }
    throw new Error("Cette invitation a expire.");
  }
  if (effectiveStatus === "revoked") {
    throw new Error("Cette invitation a ete revoquee.");
  }
  if (effectiveStatus === "accepted") {
    if (invitation.accepted_by_user_id && invitation.accepted_by_user_id !== authUser.id) {
      throw new Error("Cette invitation a deja ete utilisee.");
    }
    const shop = await fetchShopById(invitation.shop_id);
    if (!shop) {
      throw new Error("Entreprise introuvable.");
    }
    const roles = await fetchInvitationRoles(invitation.id);
    return {
      ok: true,
      shopId: shop.id,
      shopName: shop.name,
      memberId: null,
      roles: roles.length > 0 ? roles : [invitation.primary_role],
      alreadyAccepted: true,
    };
  }

  if (normalizeEmail(authUser.email) !== normalizeEmail(invitation.invited_email)) {
    throw new Error("Connectez-vous avec l'adresse email invitee pour accepter cette invitation.");
  }

  const shop = await fetchShopById(invitation.shop_id);
  if (!shop) {
    throw new Error("Entreprise introuvable.");
  }

  const roles = await fetchInvitationRoles(invitation.id);
  const nextRoles = roles.length > 0 ? roles : [invitation.primary_role];
  const primaryRole = nextRoles[0];

  let member = await fetchMemberByShopAndUser(shop.id, authUser.id);
  if (!member) {
    member = await createMember({
      shopId: shop.id,
      userId: authUser.id,
      primaryRole,
      createdByUserId: invitation.invited_by_user_id,
    });
    if (!member) {
      throw new Error("Impossible de rattacher ce compte a l'entreprise.");
    }
  } else if (member.role === "member") {
    await updateMemberPrimaryRole(member.id, primaryRole);
  }

  await insertMissingMemberRoles(member.id, nextRoles);
  await ensureSellerRoleOnProfile(authUser.id);

  await updateInvitation(invitation.id, {
    status: "accepted",
    accepted_by_user_id: authUser.id,
    accepted_at: new Date().toISOString(),
    last_error: null,
  });

  return {
    ok: true,
    shopId: shop.id,
    shopName: shop.name,
    memberId: member.id,
    roles: nextRoles,
    alreadyAccepted: false,
  };
}
