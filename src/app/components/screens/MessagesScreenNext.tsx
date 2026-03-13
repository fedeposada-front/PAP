"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Send, ImageIcon, ChevronRight } from "lucide-react";
import { Header, BottomNav, Badge } from "../ds";
import { useAuth } from "../AuthContext";
import { trackLeadEvent } from "../../services/leadEvents";
import { fetchShops } from "../../services/catalog";
import type { Shop } from "../../types/catalog";
import { getShopHref } from "../../utils/shopRouting";

interface Message {
  id: string;
  text: string;
  sender: "user" | "shop";
  time: string;
}

function ConversationList({ onSelect }: { onSelect: (shopId: string) => void }) {
  const router = useRouter();
  const push = (path: string) => router.push(path);
  const { user, isAuthenticated } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const nextShops = await fetchShops();
      if (cancelled) return;
      setShops(nextShops);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background pb-16">
      <Header title="Messages" />
      <div className="flex-1 px-4 py-3">
        {shops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-4">💬</span>
            <h3 className="mb-2">Aucun message</h3>
            <p className="text-muted-foreground text-sm">
              Aucune conversation disponible pour le moment.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {shops.map((shop) => (
              <button
                key={shop.id}
                onClick={() => onSelect(shop.id)}
                className="w-full flex items-center gap-3 p-3 bg-white rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <img
                  src={shop.image}
                  alt={shop.name}
                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{shop.name}</p>
                  <p className="text-xs text-muted-foreground">Aucun message</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
      <BottomNav
        active="messages"
        onNavigate={(tab) => {
          if (tab === "home") push("/home");
          if (tab === "cart") push("/cart");
          if (tab === "profile") {
            if (!isAuthenticated) {
              push("/auth");
              return;
            }
            if (user?.role === "seller") {
              push(user.siretVerified ? "/dashboard" : "/siret");
              return;
            }
            push("/profile");
          }
          if (tab === "messages") push("/messages");
        }}
      />
    </div>
  );
}

function ChatView({ shopId, onBack }: { shopId: string; onBack: () => void }) {
  const router = useRouter();
  const push = (path: string) => router.push(path);
  const [shops, setShops] = useState<Shop[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const nextShops = await fetchShops();
      if (cancelled) return;
      setShops(nextShops);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const shop = shops.find((s) => s.id === shopId);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    trackLeadEvent({
      type: "click_message",
      shopId,
      metadata: { source: "messages_screen" },
    });

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      text,
      sender: "user",
      time: new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
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
              src={shop.image}
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

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <span className="text-4xl block mb-3">👋</span>
            <p className="text-sm text-muted-foreground">
              Démarrez la conversation
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                msg.sender === "user"
                  ? "bg-coral text-white rounded-br-sm"
                  : "bg-white border border-border/50 rounded-bl-sm"
              }`}
            >
              <p>{msg.text}</p>
              <p
                className={`text-[10px] mt-1 ${
                  msg.sender === "user" ? "text-white/60" : "text-muted-foreground"
                }`}
              >
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border-t border-border px-4 py-3 flex items-center gap-3">
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors flex-shrink-0">
          <ImageIcon className="w-5 h-5" />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Votre message..."
          className="flex-1 bg-input-background rounded-full px-4 py-2.5 outline-none placeholder:text-muted-foreground text-sm"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors flex-shrink-0 ${
            input.trim()
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
  const searchParams = useSearchParams();
  const shopIdFromUrl = searchParams.get("shop");
  const [activeChat, setActiveChat] = useState<string | null>(shopIdFromUrl);

  useEffect(() => {
    if (shopIdFromUrl) setActiveChat(shopIdFromUrl);
  }, [shopIdFromUrl]);

  if (activeChat) {
    return <ChatView shopId={activeChat} onBack={() => setActiveChat(null)} />;
  }

  return <ConversationList onSelect={(id) => setActiveChat(id)} />;
}
