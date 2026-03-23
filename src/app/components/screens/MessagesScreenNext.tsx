"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Send, ImageIcon, ChevronRight } from "lucide-react";
import { Header, Badge, Button } from "../ds";
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

function ConversationList({
  accessToken,
  onSelect,
}: {
  accessToken: string;
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
      <Header title="Messages" />
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
              const preview = conversation.lastMessagePreview?.trim() || "Nouvelle conversation";

              return (
                <button
                  key={conversation.id}
                  onClick={() => onSelect(conversation.id)}
                  className="w-full flex items-center gap-3 p-3 bg-white rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-shadow text-left"
                >
                  <img
                    src={shop?.image ?? "https://placehold.co/96x96?text=MCL"}
                    alt={shop?.name ?? "Boutique"}
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm truncate">{shop?.name ?? "Boutique"}</p>
                      <span className="text-[11px] text-muted-foreground flex-shrink-0">
                        {formatConversationTime(conversation.lastMessageAt)}
                      </span>
                    </div>
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
  onBack,
}: {
  conversationId: string;
  accessToken: string;
  onBack: () => void;
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

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !user?.id || !accessToken || isSending) return;

    try {
      setIsSending(true);
      await sendConversationMessage({
        conversationId,
        senderUserId: user.id,
        text,
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
      <Header
        title=""
        onBack={onBack}
        right={
          shop ? (
            <button
              onClick={() => push(getShopHref(shop))}
              className="text-coral text-sm"
            >
              Voir boutique
            </button>
          ) : null
        }
      />
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-border">
        {shop ? (
          <>
            <img
              src={shop.image ?? "https://placehold.co/96x96?text=MCL"}
              alt={shop.name}
              className="w-10 h-10 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{shop.name}</p>
              <div className="flex items-center gap-1.5">
                {shop.isOpen ? (
                  <Badge variant="success">Ouvert</Badge>
                ) : (
                  <Badge variant="default">Fermé</Badge>
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Conversation</p>
        )}
      </div>

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
  const shopIdFromUrl = searchParams.get("shop");
  const { isAuthenticated, accessToken, user } = useAuth();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  useEffect(() => {
    if (!shopIdFromUrl || !accessToken || !user?.id || user.role === "seller") return;
    let cancelled = false;

    const run = async () => {
      try {
        setIsBootstrapping(true);
        setBootstrapError(null);
        const conversation = await ensureBuyerConversation({
          buyerUserId: user.id,
          shopId: shopIdFromUrl,
          accessToken,
        });
        if (cancelled) return;
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
  }, [shopIdFromUrl, accessToken, user?.id, user?.role, router]);

  if (!isAuthenticated || !accessToken || !user?.id) {
    const nextPath = shopIdFromUrl ? `/messages?shop=${shopIdFromUrl}` : "/messages";

    return (
      <div className="min-h-screen flex flex-col bg-background pb-16">
        <Header title="Messages" />
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
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <p className="text-muted-foreground">Ouverture de la conversation...</p>
      </div>
    );
  }

  if (bootstrapError) {
    return (
      <div className="min-h-screen flex flex-col bg-background pb-16">
        <Header title="Messages" onBack={() => router.push("/home")} />
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
        onBack={() => setActiveConversationId(null)}
      />
    );
  }

  return (
    <ConversationList
      accessToken={accessToken}
      onSelect={(conversationId) => setActiveConversationId(conversationId)}
    />
  );
}
