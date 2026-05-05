"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Bot,
  MapPinned,
  MessageSquarePlus,
  Send,
  TrendingUp,
  User,
  Users,
  Zap,
} from "lucide-react";

const API = "http://127.0.0.1:8000/api/chatbot";

type Conversation = {
  id: string;
  titre: string;
  updated_at: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const SUGGESTED_QUESTIONS = [
  { text: "Quelles sont les zones prioritaires du dernier import ?", icon: MapPinned },
  { text: "Combien de clients ont été retenus ?", icon: Users },
  { text: "Quelle zone a le montant impayé le plus élevé ?", icon: TrendingUp },
  { text: "Répartition des clients par centre ?", icon: BarChart3 },
];

export function ChatbotClient() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversation = useCallback(async (id: string) => {
    setCurrentConvId(id);
    try {
      const res = await fetch(`${API}/conversations/${id}/messages/`);
      const data = await res.json();
      setMessages(
        data.map((m: { id: string; role: "user" | "assistant"; content: string; created_at: string }) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.created_at),
        }))
      );
    } catch {}
  }, []);

  useEffect(() => {
    fetch(`${API}/conversations/`)
      .then((r) => r.json())
      .then((data: Conversation[]) => {
        setConversations(data);
        if (data.length > 0) loadConversation(data[0].id);
      })
      .catch(() => {});
  }, [loadConversation]);

  const newConversation = () => {
    setCurrentConvId(null);
    setMessages([]);
    textareaRef.current?.focus();
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    let convId = currentConvId;

    if (!convId) {
      try {
        const res = await fetch(`${API}/conversations/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const conv: Conversation = await res.json();
        convId = conv.id;
        setCurrentConvId(convId);
        setConversations((prev) => [conv, ...prev]);
      } catch {
        return;
      }
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const botMsgId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: botMsgId, role: "assistant", content: "", timestamp: new Date() },
    ]);

    try {
      const res = await fetch(`${API}/conversations/${convId}/chat/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.token) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === botMsgId ? { ...m, content: m.content + parsed.token } : m
                )
              );
            }
            if (parsed.error) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === botMsgId ? { ...m, content: `Erreur : ${parsed.error}` } : m
                )
              );
            }
          } catch {}
        }
      }

      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId && !c.titre ? { ...c, titre: text.slice(0, 60) } : c
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId
            ? { ...m, content: "Impossible de contacter le serveur. Vérifiez que le backend est démarré." }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] overflow-hidden rounded-xl border border-slate-200 shadow-sm">

      {/* ── Sidebar claire ── */}
      <div className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">

        {/* Logo */}
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
            <Bot size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Assistant IA</p>
            <p className="text-[10px] text-slate-400">SNDE Recouvrement</p>
          </div>
        </div>

        {/* Nouveau chat */}
        <div className="p-3">
          <button
            onClick={newConversation}
            className="flex w-full items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-500 active:bg-blue-700"
          >
            <MessageSquarePlus size={14} />
            Nouvelle conversation
          </button>
        </div>

        {/* Liste conversations */}
        <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
          {conversations.length === 0 ? (
            <p className="pt-8 text-center text-xs text-slate-400">Aucune conversation</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => loadConversation(c.id)}
                className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                  c.id === currentConvId
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <p className="truncate text-xs font-medium">
                  {c.titre || "Nouvelle conversation"}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  {new Date(c.updated_at).toLocaleDateString("fr-FR")}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Pied de sidebar */}
        <div className="border-t border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <p className="text-[10px] text-slate-400">Llama 3.3 70B · Groq</p>
          </div>
        </div>
      </div>

      {/* ── Zone de chat ── */}
      <div className="flex min-w-0 flex-1 flex-col bg-slate-50">

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-3.5 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-sm">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Assistant IA · SNDE</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <p className="text-[11px] text-slate-500">En ligne · Llama 3.3 70B</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-10">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-8">
              <div className="text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg">
                  <Zap size={28} className="text-white" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Comment puis-je vous aider ?
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  Posez une question sur vos données de recouvrement.
                </p>
              </div>

              <div className="grid w-full max-w-xl gap-3 sm:grid-cols-2">
                {SUGGESTED_QUESTIONS.map(({ text, icon: Icon }) => (
                  <button
                    key={text}
                    onClick={() => sendMessage(text)}
                    className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
                      <Icon size={13} />
                    </div>
                    <p className="text-xs leading-relaxed text-slate-600 group-hover:text-slate-900">
                      {text}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-sm ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-blue-500 to-blue-700"
                        : "border border-slate-200 bg-white"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <User size={14} className="text-white" />
                    ) : (
                      <Bot size={14} className="text-slate-600" />
                    )}
                  </div>

                  {/* Bulle */}
                  <div
                    className={`flex max-w-[80%] flex-col gap-1 ${
                      msg.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "rounded-tr-sm bg-blue-600 text-white shadow-sm"
                          : "rounded-tl-sm border border-slate-100 bg-white text-slate-800 shadow-sm"
                      }`}
                    >
                      {msg.content === "" && isStreaming ? (
                        <span className="inline-flex gap-1 py-0.5">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                        </span>
                      ) : (
                        <p className="whitespace-pre-wrap">
                          {msg.content}
                          {isStreaming && msg.role === "assistant" && msg.content !== "" && (
                            <span className="ml-0.5 inline-block h-[14px] w-0.5 animate-pulse bg-slate-400 align-middle" />
                          )}
                        </p>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {msg.timestamp.toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Zone de saisie */}
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:px-10">
          <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
            <div className="flex items-end gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-shadow focus-within:border-blue-300 focus-within:shadow-md">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Posez votre question sur les données de recouvrement..."
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Send size={14} />
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              Entrée pour envoyer · Shift+Entrée pour nouvelle ligne
            </p>
          </form>
        </div>

      </div>
    </div>
  );
}
