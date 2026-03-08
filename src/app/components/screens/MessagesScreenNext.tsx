"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Send, ImageIcon, ChevronRight } from "lucide-react";
import { Header, BottomNav, Badge } from "../ds";
import { SHOPS } from "../../data/mock-data";
import { useAuth } from "../AuthContext";
import { trackLeadEvent } from "../../services/leadEvents";

interface Message {
  id: string;
  text: string;
  sender: "user" | "shop";
  time: string;
}

const MOCK_CONVERSATIONS: Record<string, Message[]> = {
  s1: [
    { id: "m1", text: "Bonjour ! Le coffret macarons est-il disponible pour un retrait cet après-midi ?", sender: "user", time: "14:23" },
    { id: "m2", text: "Bonjour ! Oui bien sûr, nous en avons encore 5 en stock. Vous pouvez passer quand vous voulez avant 19h30 😊", sender: "shop", time: "14:25" },
    { id: "m3", text: "Super, merci beaucoup ! J'arrive vers 16h.", sender: "user", time: "14:26" },
    { id: "m4", text: "Parfait, on vous le met de côté ! À tout à l'heure.", sender: "shop", time: "14:27" },
  ],
  s2: [
    { id: "m1", text: "Bonjour, est-ce que le bracelet pierre de lune est ajustable ?", sender: "user", time: "10:15" },
    { id: "m2", text: "Bonjour ! Oui, le fermoir mousqueton permet un ajustement entre 16 et 19 cm. Souhaitez-vous le voir en boutique ?", sender: "shop", time: "10:18" },
  ],
};

// Conversation list view
function ConversationList({ onSelect }: { onSelect: (shopId: string) => void }) {
  const router = useRouter();
  const push = (path: string) => router.push(path);
  const { user, isAuthenticated } = useAuth();
  const conversations = SHOPS.filter((s) => MOCK_CONVERSATIONS[s.id]);

  return (
    <div className="min-h-screen flex flex-col bg-background pb-16">
      <Header title="Messages" />
      <div className="flex-1 px-4 py-3">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-4">💬</span>
            <h3 className="mb-2">Aucun message</h3>
            <p className="text-muted-foreground text-sm">
              Contactez une boutique pour démarrer une conversation
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((shop) => {
              const msgs = MOCK_CONVERSATIONS[shop.id] || [];
              const lastMsg = msgs[msgs.length - 1];
              return (
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
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm truncate">{shop.name}</p>
                      {lastMsg && (
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {lastMsg.time}
                        </span>
                      )}
                    </div>
                    {lastMsg && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {lastMsg.sender === "user" ? "Vous : " : ""}
                        {lastMsg.text}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
              );
            })}

            {/* Show other shops without conversations */}
            <p className="text-xs text-muted-foreground px-2 pt-4 pb-1">
              Boutiques disponibles
            </p>
            {SHOPS.filter((s) => !MOCK_CONVERSATIONS[s.id]).map((shop) => (
              <button
                key={shop.id}
                onClick={() => onSelect(shop.id)}
                className="w-full flex items-center gap-3 p-3 bg-white rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-shadow text-left opacity-70 hover:opacity-100"
              >
                <img
                  src={shop.image}
                  alt={shop.name}
                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{shop.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Aucun message
                  </p>
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

// Chat view with a specific shop
function ChatView({ shopId, onBack }: { shopId: string; onBack: () => void }) {
  const router = useRouter();
  const push = (path: string) => router.push(path);
  const shop = SHOPS.find((s) => s.id === shopId) || SHOPS[0];
  const [messages, setMessages] = useState<Message[]>(
    MOCK_CONVERSATIONS[shopId] || []
  );
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

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

    // Simulate shop auto-reply after a short delay
    setTimeout(() => {
      const replies = [
        "Merci pour votre message ! Nous vous répondons au plus vite.",
        "Bien reçu ! Un membre de notre équipe va revenir vers vous.",
        "Bonjour ! Nous prenons note de votre demande. À très vite !",
        "Merci de nous contacter ! Nous sommes disponibles jusqu'à la fermeture.",
      ];
      const shopReply: Message = {
        id: `s-${Date.now()}`,
        text: replies[Math.floor(Math.random() * replies.length)],
        sender: "shop",
        time: new Date().toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, shopReply]);
    }, 1200);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <Header
        title=""
        onBack={onBack}
        right={
          <button
            onClick={() => push(`/shop/${shop.id}`)}
            className="text-coral text-sm"
          >
            Voir boutique
          </button>
        }
      />
      {/* Shop info bar */}
      <div
        onClick={() => push(`/shop/${shop.id}`)}
        className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-border cursor-pointer hover:bg-muted/50 transition-colors"
      >
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
            <span className="text-xs text-muted-foreground">{shop.distance}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <span className="text-4xl block mb-3">👋</span>
            <p className="text-sm text-muted-foreground">
              Démarrez la conversation avec {shop.name}
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

      {/* Input bar */}
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

  // Update active chat if URL param changes
  useEffect(() => {
    if (shopIdFromUrl) setActiveChat(shopIdFromUrl);
  }, [shopIdFromUrl]);

  if (activeChat) {
    return (
      <ChatView
        shopId={activeChat}
        onBack={() => setActiveChat(null)}
      />
    );
  }

  return <ConversationList onSelect={(id) => setActiveChat(id)} />;
}
