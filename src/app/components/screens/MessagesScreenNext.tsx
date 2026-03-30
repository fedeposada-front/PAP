"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Send, ImageIcon, ChevronRight, MapPin, Star } from "lucide-react";
import { Badge, Button, Logo } from "../ds";
import { fetchShops } from "../../services/catalog";
import type { Shop } from "../../types/catalog";
import { getShopHref } from "../../utils/shopRouting";
import { useAuth } from "../AuthContext";
import {
  ensureBuyerConversation,
  fetchAccessibleConversations,
  fetchConversation,
  fetchConversationMessages,
  sendConversationMessage,
  subscribeToMessages,
  type ConversationMessage,
  type MessageConversation,
} from "../../services/messages";
import { triggerMessageEmailNotificationDispatch } from "../../services/messageNotifications";

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatConversationTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  const isSameDay = date.toDateString() === now.toDateString();

  if (isSameDay) {
    return formatMessageTime(value);
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function joinIdentityParts(parts: Array<string | null | undefined>) {
  const unique = new Map<string, string>();

  for (const part of parts) {
    const normalized = part?.trim() ?? "";
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (unique.has(key)) continue;
    unique.set(key, normalized);
  }

  return Array.from(unique.values()).join(" · ");
}

function MessagesHeader({
  onBack,
  right,
}: {
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <header className="flex items-center justify-between border-b border-border bg-white px-4 py-3">
      <div className="flex w-20 justify-start">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 transition-colors hover:bg-muted"
            aria-label="Revenir"
          >
            <ChevronRight className="h-5 w-5 rotate-180" />
          </button>
        ) : null}
      </div>
      <div className="flex flex-1 justify-center">
        <Logo size="md" href="/home" />
      </div>
      <div className="flex w-20 justify-end">
        {right ?? (
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="text-sm text-coral"
          >
            Accueil
          </button>
        )}
      </div>
    </header>
  );
}

function ConversationList({
  accessToken,
  currentUserId,
  onSelect,
}: {
  accessToken: string;
  currentUserId: string;
  onSelect: (conversationId: string) => void;
}) {
  const [conversations, setConversations] = useState<MessageConversation[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadShops = async () => {
      try {
        const nextShops = await fetchShops();
        if (!cancelled) setShops(nextShops);
      } catch {
        if (!cancelled) setShops([]);
      }
    };

    void loadShops();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadConversations = async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      try {
        if (!silent) {
          setIsLoading(true);
        }
        setLoadError(null);
        const nextConversations = await fetchAccessibleConversations({ accessToken });
        if (!cancelled) setConversations(nextConversations);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Impossible de charger les conversations.");
          if (!silent) setConversations([]);
        }
      } finally {
        if (!cancelled && !silent) setIsLoading(false);
      }
    };

    void loadConversations();
    const unsubscribe = subscribeToMessages(() => {
      void loadConversations({ silent: true });
    });
    const intervalId = window.setInterval(() => {
      void loadConversations({ silent: true });
    }, 8000);
    const handleFocus = () => {
      void loadConversations({ silent: true });
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      cancelled = true;
      unsubscribe();
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [accessToken]);

  const shopById = useMemo(
    () => new Map(shops.map((shop) => [shop.id, shop])),
    [shops]
  );

  return (
    <div className="min-h-screen flex flex-col bg-background pb-16">
      <MessagesHeader />
      <div className="flex-1 px-4 py-3">
        {loadError && (
          <div className="mb-4 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {loadError}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-muted-foreground">Chargement des conversations...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-4">💬</span>
            <h3 className="mb-2">Aucun message</h3>
            <p className="text-muted-foreground text-sm">
              Aucune conversation disponible pour le moment.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conversation) => {
              const shop = shopById.get(conversation.shopId);
              const isBuyerView = conversation.buyerUserId === currentUserId;
              const preview = conversation.lastMessagePreview?.trim() || "Nouvelle conversation";
              const sellerFacingName =
                conversation.buyerDisplayName.trim().toLowerCase() === "client"
                  ? conversation.buyerEmail?.trim() || conversation.buyerDisplayName
                  : conversation.buyerDisplayName;
              const sellerFacingTitle = conversation.buyerNickname?.trim() || sellerFacingName;
              const title = isBuyerView
                ? shop?.name ?? "Boutique"
                : sellerFacingTitle;
              const avatarLabel = isBuyerView
                ? shop?.name ?? "Boutique"
                : sellerFacingTitle;
              const avatarSrc = isBuyerView
                ? (shop?.image ?? "https://placehold.co/96x96?text=MCL")
                : null;
              const secondaryLabel =
                !isBuyerView
                  ? joinIdentityParts([
                      conversation.buyerFullName && conversation.buyerFullName !== title
                        ? conversation.buyerFullName
                        : null,
                      conversation.buyerCity,
                      conversation.buyerEmail && conversation.buyerEmail !== title
                        ? conversation.buyerEmail
                        : null,
                    ]) || null
                  : null;

              return (
                <button
                  key={conversation.id}
                  onClick={() => onSelect(conversation.id)}
                  className="w-full flex items-center gap-3 p-3 bg-white rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-shadow text-left"
                >
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={avatarLabel}
                      className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-coral/12 text-base font-semibold text-coral">
                      {avatarLabel.trim().charAt(0).toUpperCase() || "C"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm truncate">{title}</p>
                      <span className="text-[11px] text-muted-foreground flex-shrink-0">
                        {formatConversationTime(conversation.lastMessageAt)}
                      </span>
                    </div>
                    {secondaryLabel && (
                      <p className="text-[11px] text-muted-foreground truncate">{secondaryLabel}</p>
                    )}
                    <p className="text-xs text-muted-foreground truncate">{preview}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatView({
  conversationId,
  accessToken,
  currentUserId,
  onBack,
  returnToOrigin,
}: {
  conversationId: string;
  accessToken: string;
  currentUserId: string;
  onBack: () => void;
  returnToOrigin?: () => void;
}) {
  const router = useRouter();
  const push = (path: string) => router.push(path);
  const { user } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [conversation, setConversation] = useState<MessageConversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const nextShops = await fetchShops();
        if (!cancelled) setShops(nextShops);
      } catch {
        if (!cancelled) setShops([]);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncConversation = async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      try {
        if (!silent) {
          setIsLoading(true);
        }
        setLoadError(null);
        const [nextConversation, nextMessages] = await Promise.all([
          fetchConversation({ conversationId, accessToken }),
          fetchConversationMessages({ conversationId, accessToken }),
        ]);

        if (cancelled) return;
        setConversation(nextConversation);
        setMessages(nextMessages);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Impossible de charger la conversation.");
          if (!silent) {
            setConversation(null);
            setMessages([]);
          }
        }
      } finally {
        if (!cancelled && !silent) setIsLoading(false);
      }
    };

    void syncConversation();
    const unsubscribe = subscribeToMessages(() => {
      void syncConversation({ silent: true });
    });
    const intervalId = window.setInterval(() => {
      void syncConversation({ silent: true });
    }, 4000);
    const handleFocus = () => {
      void syncConversation({ silent: true });
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      cancelled = true;
      unsubscribe();
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [conversationId, accessToken]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const shop = shops.find((entry) => entry.id === conversation?.shopId);
  const isBuyerView = conversation?.buyerUserId === currentUserId;
  const sellerFacingName = conversation?.buyerDisplayName?.trim().toLowerCase() === "client"
    ? conversation?.buyerEmail?.trim() || conversation?.buyerDisplayName || "Client"
    : conversation?.buyerDisplayName ?? "Client";
  const counterpartName = isBuyerView
    ? shop?.name ?? "Boutique"
    : conversation?.buyerNickname?.trim() || sellerFacingName;
  const counterpartAvatarSrc = isBuyerView
    ? (shop?.image ?? "https://placehold.co/96x96?text=MCL")
    : null;
  const counterpartSecondaryLabel =
    !isBuyerView
      ? joinIdentityParts([
          conversation?.buyerFullName && conversation.buyerFullName !== counterpartName
            ? conversation.buyerFullName
            : null,
          conversation?.buyerEmail && conversation.buyerEmail !== counterpartName
            ? conversation.buyerEmail
            : null,
        ]) || null
      : null;

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !user?.id || !accessToken || isSending) return;

    try {
      setIsSending(true);
      const createdMessage = await sendConversationMessage({
        conversationId,
        senderUserId: user.id,
        text,
        accessToken,
      });
      void triggerMessageEmailNotificationDispatch({
        messageId: createdMessage.id,
        accessToken,
      });
      setInput("");
      const nextMessages = await fetchConversationMessages({ conversationId, accessToken });
      setMessages(nextMessages);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Impossible d'envoyer le message.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MessagesHeader
        onBack={returnToOrigin ?? onBack}
        right={
          shop && isBuyerView ? (
            <button
              type="button"
              onClick={() => push(getShopHref(shop))}
              className="text-coral text-sm"
            >
              Voir boutique
            </button>
          ) : null
        }
      />
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-border">
        {conversation ? (
          <>
            {counterpartAvatarSrc ? (
              <img
                src={counterpartAvatarSrc}
                alt={counterpartName}
                className="w-10 h-10 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-coral/12 text-sm font-semibold text-coral">
                {counterpartName.trim().charAt(0).toUpperCase() || "C"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{counterpartName}</p>
              {counterpartSecondaryLabel && (
                <p className="text-[11px] text-muted-foreground truncate">{counterpartSecondaryLabel}</p>
              )}
              <div className="flex items-center gap-1.5">
                {isBuyerView ? (
                  shop?.isOpen ? (
                    <Badge variant="success">Ouvert</Badge>
                  ) : (
                    <Badge variant="default">Fermé</Badge>
                  )
                ) : (
                  <Badge variant="outline">Acheteur</Badge>
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Conversation</p>
        )}
      </div>

      {!isBuyerView && conversation && (
        <div className="border-b border-border/60 bg-white px-4 pb-3">
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Carte client</p>
                <p className="mt-1 text-sm break-words">{counterpartName}</p>
                {counterpartSecondaryLabel && (
                  <p className="mt-1 text-[11px] text-muted-foreground break-words">{counterpartSecondaryLabel}</p>
                )}
              </div>
              <Badge variant="outline">Acheteur</Badge>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-white px-3 py-2.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  Ville
                </div>
                <p className="mt-1 text-sm">{conversation.buyerCity?.trim() || "Non renseignee"}</p>
              </div>
              <div className="rounded-xl bg-white px-3 py-2.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <Star className="h-3.5 w-3.5" />
                  Evaluations
                </div>
                <p className="mt-1 text-sm">
                  {conversation.buyerReviewCount && conversation.buyerReviewCount > 0
                    ? `${conversation.buyerRating?.toFixed(1) ?? "-"} / 5 · ${conversation.buyerReviewCount} avis`
                    : "Aucune evaluation pour le moment"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {loadError && (
        <div className="px-4 pt-4">
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {loadError}
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">Chargement de la conversation...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl block mb-3">👋</span>
            <p className="text-sm text-muted-foreground">
              Démarrez la conversation
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.senderUserId === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                    isOwnMessage
                      ? "bg-coral text-white rounded-br-sm"
                      : "bg-white border border-border/50 rounded-bl-sm"
                  }`}
                >
                  <p>{msg.text}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      isOwnMessage ? "text-white/60" : "text-muted-foreground"
                    }`}
                  >
                    {formatMessageTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="bg-white border-t border-border px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          disabled
          className="w-10 h-10 flex items-center justify-center rounded-full bg-muted text-muted-foreground flex-shrink-0 opacity-50"
          title="Pièces jointes bientôt disponibles"
        >
          <ImageIcon className="w-5 h-5" />
        </button>
        <input
          suppressHydrationWarning
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void handleSend()}
          placeholder="Votre message..."
          className="flex-1 bg-input-background rounded-full px-4 py-2.5 outline-none placeholder:text-muted-foreground text-sm"
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!input.trim() || isSending}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors flex-shrink-0 ${
            input.trim() && !isSending
              ? "bg-coral text-white hover:bg-coral/90"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export function MessagesScreenNext() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationIdFromUrl = searchParams.get("conversation");
  const shopIdFromUrl = searchParams.get("shop");
  const returnPathFromUrl = searchParams.get("from");
  const { isAuthenticated, accessToken, user } = useAuth();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [originPath, setOriginPath] = useState<string | null>(null);

  useEffect(() => {
    if (conversationIdFromUrl || !shopIdFromUrl || !accessToken || !user?.id || user.role === "seller") return;
    let cancelled = false;

    const run = async () => {
      try {
        setIsBootstrapping(true);
        setBootstrapError(null);
        const conversation = await ensureBuyerConversation({
          buyerUserId: user.id,
          buyerDisplayName:
            user.nickname?.trim()
            || `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
            || "Client",
          shopId: shopIdFromUrl,
          accessToken,
        });
        if (cancelled) return;
        setOriginPath(returnPathFromUrl);
        setActiveConversationId(conversation.id);
        router.replace("/messages");
      } catch (error) {
        if (!cancelled) {
          setBootstrapError(
            error instanceof Error ? error.message : "Impossible d'ouvrir cette conversation."
          );
        }
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    conversationIdFromUrl,
    shopIdFromUrl,
    returnPathFromUrl,
    accessToken,
    user?.id,
    user?.role,
    user?.nickname,
    user?.firstName,
    user?.lastName,
    router,
  ]);

  useEffect(() => {
    if (!conversationIdFromUrl || !accessToken || !user?.id) return;
    setBootstrapError(null);
    setOriginPath(returnPathFromUrl);
    setActiveConversationId(conversationIdFromUrl);
    router.replace("/messages");
  }, [conversationIdFromUrl, returnPathFromUrl, accessToken, user?.id, router]);

  if (!isAuthenticated || !accessToken || !user?.id) {
    const nextPath = (() => {
      const params = new URLSearchParams();
      if (conversationIdFromUrl) params.set("conversation", conversationIdFromUrl);
      if (shopIdFromUrl) params.set("shop", shopIdFromUrl);
      if (returnPathFromUrl) params.set("from", returnPathFromUrl);
      const query = params.toString();
      return query ? `/messages?${query}` : "/messages";
    })();

    return (
      <div className="min-h-screen flex flex-col bg-background pb-16">
        <MessagesHeader />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-white p-6 text-center shadow-sm">
            <span className="text-5xl">💬</span>
            <h3 className="mt-4 mb-2">Connecte-toi pour écrire à une boutique</h3>
            <p className="text-sm text-muted-foreground mb-5">
              La messagerie est réservée aux utilisateurs connectés.
            </p>
            <Button
              fullWidth
              onClick={() => router.push(`/auth?next=${encodeURIComponent(nextPath)}`)}
            >
              Connexion / Inscription
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isBootstrapping) {
    return (
      <div className="min-h-screen flex flex-col bg-background pb-16">
        <MessagesHeader />
        <div className="flex flex-1 items-center justify-center px-4">
          <p className="text-muted-foreground">Ouverture de la conversation...</p>
        </div>
      </div>
    );
  }

  if (bootstrapError) {
    return (
      <div className="min-h-screen flex flex-col bg-background pb-16">
        <MessagesHeader onBack={() => router.push("/home")} />
        <div className="px-4 pt-4">
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {bootstrapError}
          </div>
        </div>
      </div>
    );
  }

  if (activeConversationId) {
    return (
      <ChatView
        conversationId={activeConversationId}
        accessToken={accessToken}
        currentUserId={user.id}
        onBack={() => setActiveConversationId(null)}
        returnToOrigin={originPath ? () => router.push(originPath) : undefined}
      />
    );
  }

  return (
    <ConversationList
      accessToken={accessToken}
      currentUserId={user.id}
      onSelect={(conversationId) => {
        setOriginPath(null);
        setActiveConversationId(conversationId);
      }}
    />
  );
}
