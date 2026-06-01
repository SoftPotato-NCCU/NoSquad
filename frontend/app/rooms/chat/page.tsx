"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  getRoomDetails,
  listRoomMessages,
  sendRoomMessage,
  type ChatMessageDto,
} from "@/lib/api";
import type { RoomDetails } from "@/types/rooms";

interface ChatMessage {
  id: string;
  text: string;
  senderName: string;
  senderInitial: string;
  isMine: boolean;
  timestamp: Date;
}

const POLL_INTERVAL_MS = 3000;

function formatTime(date: Date) {
  return date.toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const roomId = searchParams.get("room_id");

  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastIdRef = useRef(0);

  const toChatMessage = (m: ChatMessageDto): ChatMessage => {
    // The send endpoint doesn't echo back sender_name, so fall back to the
    // current user's name (a sent message is always mine) and stay defensive.
    const senderName =
      m.sender_name ?? (m.user_id === user?.id ? user?.name : undefined) ?? "";
    return {
      id: String(m.id),
      text: m.body,
      senderName,
      senderInitial: senderName[0]?.toUpperCase() ?? "U",
      isMine: m.user_id === user?.id,
      timestamp: new Date(m.created_at),
    };
  };

  useEffect(() => {
    if (!roomId || !user) return;

    getRoomDetails(roomId)
      .then(async (res) => {
        const roomData = res.data.room;
        const canChat =
          roomData.is_owner || roomData.membership_status === "approved";
        if (!canChat) {
          router.replace(`/rooms/room?room_id=${roomId}`);
          return;
        }
        setRoom(roomData);

        const initial = await listRoomMessages(roomId);
        const loaded = initial.data.messages;
        setMessages(loaded.map(toChatMessage));
        lastIdRef.current = loaded.at(-1)?.id ?? 0;
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "無法載入房間資訊");
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user, router]);

  // Poll for new messages every few seconds (no SSR/WebSocket in static export).
  useEffect(() => {
    if (!roomId || !user || error) return;
    const timer = setInterval(async () => {
      try {
        const res = await listRoomMessages(roomId, lastIdRef.current);
        const fresh = res.data.messages;
        if (fresh.length) {
          setMessages((prev) => [...prev, ...fresh.map(toChatMessage)]);
          lastIdRef.current = fresh.at(-1)!.id;
        }
      } catch {
        // ignore transient polling errors; next tick retries
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user, error]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !user || isSending || !roomId) return;

    const text = input.trim();
    setInput("");
    setIsSending(true);

    try {
      const res = await sendRoomMessage(roomId, text);
      setMessages((prev) => [...prev, toChatMessage(res.data)]);
      lastIdRef.current = Math.max(lastIdRef.current, res.data.id);
    } catch {
      // A send failure shouldn't blow away the whole chat view — just put the
      // text back so the user can retry.
      setInput(text);
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/");
    return null;
  }

  if (error || !room) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200/70 dark:border-zinc-800 bg-white/85 dark:bg-zinc-900/70 backdrop-blur shrink-0">
          <button
            type="button"
            onClick={() => router.push(`/rooms/room?room_id=${roomId}`)}
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-300"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <span className="font-semibold text-zinc-950 dark:text-zinc-50">
            群聊
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-red-500 dark:text-red-400 text-center">
            {error ?? "找不到房間"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200/70 dark:border-zinc-800 bg-white/85 dark:bg-zinc-900/70 backdrop-blur shrink-0">
        <button
          type="button"
          onClick={() => router.push(`/rooms/room?room_id=${roomId}`)}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-300"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-500/20 dark:to-blue-500/20">
            <svg
              className="w-5 h-5 text-purple-600 dark:text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>

          <div className="min-w-0">
            <p className="truncate font-semibold text-zinc-950 dark:text-zinc-50 leading-tight">
              {room.name}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {room.member_count} 位成員
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push(`/rooms/room?room_id=${roomId}`)}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 dark:text-zinc-400"
          title="房間資訊"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
      </div>

      {/* Messages area */}
      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-zinc-50/60 dark:bg-zinc-950/60">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-400 dark:text-zinc-500 select-none">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium">目前還沒有訊息</p>
            <p className="text-xs">來開始對話吧！</p>
          </div>
        )}

        {messages.map((msg) =>
          msg.isMine ? (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-[70%]">
                <div className="rounded-2xl rounded-tr-sm bg-gradient-to-br from-purple-600 to-blue-600 px-4 py-2.5 text-white shadow-sm shadow-purple-500/20">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {msg.text}
                  </p>
                </div>
                <p className="mt-1 text-right text-[0.65rem] text-zinc-400 dark:text-zinc-500">
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex items-end gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-700 dark:to-zinc-800 text-xs font-bold text-zinc-600 dark:text-zinc-300">
                {msg.senderInitial}
              </div>
              <div className="max-w-[70%]">
                <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {msg.senderName}
                </p>
                <div className="rounded-2xl rounded-tl-sm bg-white dark:bg-zinc-800 px-4 py-2.5 shadow-sm border border-zinc-200/70 dark:border-zinc-700">
                  <p className="text-sm leading-relaxed text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap break-words">
                    {msg.text}
                  </p>
                </div>
                <p className="mt-1 text-[0.65rem] text-zinc-400 dark:text-zinc-500">
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>
          ),
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-zinc-200/70 dark:border-zinc-800 bg-white/85 dark:bg-zinc-900/70 backdrop-blur px-4 py-3">
        <div className="flex items-end gap-3 max-w-2xl mx-auto">
          <div className="flex-1 min-w-0 rounded-3xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 focus-within:border-purple-400 dark:focus-within:border-purple-500 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="傳送訊息…"
              rows={1}
              className="w-full resize-none bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none leading-relaxed"
              style={{ maxHeight: "120px" }}
            />
          </div>

          <button
            type="button"
            onClick={sendMessage}
            disabled={!input.trim() || isSending}
            className="flex shrink-0 items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-md shadow-purple-500/20 transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg
              className="w-4 h-4 translate-x-0.5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="-m-4 md:-m-8 flex items-center justify-center h-full">
          <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
