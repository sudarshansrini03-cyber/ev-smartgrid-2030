import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Send,
  Plus,
  History,
  Minimize2,
  Trash2,
  RotateCcw,
  ArrowUpRight,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react';
import { NAV_TABS } from '../../data/initialData';

const STORAGE_KEY = 'neuro_twin_threads_v1';
const MAX_USER_MESSAGES = 10;

const STARTERS_BY_TAB = {
  dashboard: [
    'Explain current Solar vs Grid load',
    'Which charging hub needs relief right now?',
    'Summarize Mumbai Metro grid health',
  ],
  vehicles: [
    'Which EV in our fleet has the lowest SoC?',
    'Compare EV-1001 and EV-1004 range & status',
    'How fast can EV-1003 reach 80% at 120 kW?',
  ],
  stations: [
    'Which station has the shortest wait & best score?',
    'Compare Station A vs Station B queues',
    'Inspect Station C solar capacity in 3D',
  ],
  charging: [
    'How much will charging to 80% cost in ₹?',
    'Explain the 80/20 BMS dual-bank split',
    'Optimize charging speed for current grid load',
  ],
  energy: [
    'Explain current Solar vs Battery routing',
    'How can we reduce grid draw below 40%?',
    'Calculate CO₂ & ₹ savings at current solar mix',
  ],
  battery: [
    'Why are 3 cells flagged in Bank Alpha?',
    'Compare Bank Alpha vs Bank Beta SoH & cycles',
    'What happens when we optimize the 32 cells?',
  ],
  'sell-charge': [
    'Calculate a 15 kWh P2P charge sale at ₹12/kWh',
    'Explain the 5% platform fee & 5 kWh reserve rule',
    'Which two EVs are the best Seller & Buyer pair?',
  ],
};

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour <= 11) return 'What’s on your mind, early bird?';
  if (hour >= 12 && hour <= 17) return 'Where should we start from?';
  if (hour >= 18 && hour <= 23) return 'What are we optimizing tonight?';
  return 'Burning the midnight oil?';
}

function createEmptyThread() {
  const now = new Date().toISOString();
  return {
    id: `nt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: 'New Neural Thread',
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

function loadThreads() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseAssistantReply(rawText) {
  const tagRegex = /\[\[INSPECT:([a-z-]+)\]\]/i;
  const match = rawText.match(tagRegex);
  let inspectTab = null;
  if (match) {
    const candidate = match[1].toLowerCase();
    if (NAV_TABS.some((t) => t.id === candidate)) {
      inspectTab = candidate;
    }
  }
  const cleanText = rawText.replace(/\[\[INSPECT:[a-z-]+\]\]/gi, '').trim();

  // Gentle keyword inference if model didn't emit explicit tag
  if (!inspectTab) {
    const lower = cleanText.toLowerCase();
    if (lower.includes('bank alpha') || lower.includes('flagged cell') || lower.includes('bank beta')) {
      inspectTab = 'battery';
    } else if (lower.includes('p2p') || lower.includes('platform fee') || lower.includes('seller')) {
      inspectTab = 'sell-charge';
    } else if (lower.includes('solar array') || lower.includes('substation') || lower.includes('routing')) {
      inspectTab = 'energy';
    } else if (lower.includes('station a') || lower.includes('station b') || lower.includes('station c')) {
      inspectTab = 'stations';
    }
  }

  return { cleanText, inspectTab };
}

function formatThreadTime(iso) {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function NeuroTwinDrawer({
  activeTab,
  telemetry,
  onInspectTab,
  onShowToast,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [threads, setThreads] = useState(() => {
    const saved = loadThreads();
    return saved.length > 0 ? saved : [createEmptyThread()];
  });
  const [activeThreadId, setActiveThreadId] = useState(() => {
    const saved = loadThreads();
    return saved.length > 0 ? saved[0].id : null;
  });
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [failedPrompt, setFailedPrompt] = useState(null);
  const [errorBanner, setErrorBanner] = useState('');

  // Cursor spotlight state on trigger pill
  const [spot, setSpot] = useState({ x: 90, y: 20, hovering: false });

  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  // Ensure activeThreadId points to a valid thread
  const activeThread = useMemo(() => {
    return threads.find((t) => t.id === activeThreadId) || threads[0];
  }, [threads, activeThreadId]);

  useEffect(() => {
    if (!activeThreadId && threads[0]) {
      setActiveThreadId(threads[0].id);
    }
  }, [activeThreadId, threads]);

  // Persist threads to localStorage
  useEffect(() => {
    try {
      const nonEmptyOrCurrent = threads.filter(
        (t) => t.messages.length > 0 || t.id === activeThread?.id
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nonEmptyOrCurrent));
    } catch {
      // Ignore storage quota errors
    }
  }, [threads, activeThread?.id]);

  // Auto-scroll chat stream
  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeThread?.messages?.length, isSending, isOpen]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && !showLogs) {
      const timer = setTimeout(() => inputRef.current?.focus(), 220);
      return () => clearTimeout(timer);
    }
  }, [isOpen, showLogs]);

  // Keyboard shortcuts: Cmd+K / Ctrl+K toggle, Esc minimize
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const userMessageCount = useMemo(
    () => (activeThread?.messages || []).filter((m) => m.role === 'user').length,
    [activeThread]
  );
  const limitReached = userMessageCount >= MAX_USER_MESSAGES;

  const handleNewChat = useCallback(() => {
    const fresh = createEmptyThread();
    setThreads((prev) => [fresh, ...prev.filter((t) => t.messages.length > 0)]);
    setActiveThreadId(fresh.id);
    setShowLogs(false);
    setErrorBanner('');
    setFailedPrompt(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleDeleteThread = useCallback(
    (id, e) => {
      e.stopPropagation();
      setThreads((prev) => {
        const remaining = prev.filter((t) => t.id !== id);
        if (remaining.length === 0) {
          const fresh = createEmptyThread();
          setActiveThreadId(fresh.id);
          return [fresh];
        }
        if (id === activeThread?.id) {
          setActiveThreadId(remaining[0].id);
        }
        return remaining;
      });
    },
    [activeThread?.id]
  );

  const sendMessage = useCallback(
    async (promptText, isRetry = false) => {
      const text = (promptText || '').trim();
      if (!text || isSending || !activeThread) return;

      const currentUserCount = activeThread.messages.filter((m) => m.role === 'user').length;
      if (!isRetry && currentUserCount >= MAX_USER_MESSAGES) return;

      setErrorBanner('');
      setFailedPrompt(null);

      let nextMessages = activeThread.messages;
      if (!isRetry) {
        const userMsg = {
          id: `msg-${Date.now()}`,
          role: 'user',
          content: text,
          ts: new Date().toISOString(),
        };
        nextMessages = [...activeThread.messages, userMsg];

        const shortTitle =
          activeThread.messages.length === 0
            ? text.length > 38
              ? `${text.slice(0, 38)}…`
              : text
            : activeThread.title;

        setThreads((prev) =>
          prev.map((t) =>
            t.id === activeThread.id
              ? {
                  ...t,
                  title: shortTitle,
                  updatedAt: new Date().toISOString(),
                  messages: nextMessages,
                }
              : t
          )
        );
        setInput('');
      }

      setIsSending(true);
      const apiBase = import.meta.env.VITE_API_URL || '';

      try {
        const res = await fetch(`${apiBase}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
            telemetry,
          }),
        });

        const isJson = res.headers.get('content-type')?.includes('application/json');
        const data = isJson ? await res.json() : null;

        if (!res.ok) {
          const msg =
            data?.detail ||
            (res.status === 429
              ? 'Groq rate limit reached briefly. Please retry in a moment.'
              : `Backend error (${res.status}). Check GROQ_API_KEY or retry.`);
          throw new Error(msg);
        }

        const { cleanText, inspectTab } = parseAssistantReply(data.reply || '');
        const assistantMsg = {
          id: `msg-${Date.now()}-ai`,
          role: 'assistant',
          content: cleanText,
          inspectTab,
          ts: new Date().toISOString(),
        };

        setThreads((prev) =>
          prev.map((t) =>
            t.id === activeThread.id
              ? {
                  ...t,
                  updatedAt: new Date().toISOString(),
                  messages: [...nextMessages, assistantMsg],
                }
              : t
          )
        );
      } catch (err) {
        setErrorBanner(err.message || 'Unable to reach Neuro Twin backend.');
        setFailedPrompt(text);
      } finally {
        setIsSending(false);
      }
    },
    [activeThread, isSending, telemetry]
  );

  const handleInspectClick = (tabId) => {
    onInspectTab(tabId);
    const label = NAV_TABS.find((t) => t.id === tabId)?.label || tabId;
    if (onShowToast) onShowToast(`Neuro Twin focused 3D camera on ${label}`);
  };

  const starters = STARTERS_BY_TAB[activeTab] || STARTERS_BY_TAB.dashboard;
  const greeting = getTimeGreeting();

  return (
    <>
      {/* ════════════════════════════════════════════════════════
          BOTTOM-RIGHT OBSIDIAN GLASS TRIGGER PILL ("Ask Neuro Twin")
      ════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="neuro-trigger-pill"
            type="button"
            onClick={() => setIsOpen(true)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setSpot({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                hovering: true,
              });
            }}
            onMouseLeave={() => setSpot((s) => ({ ...s, hovering: false }))}
            initial={{ opacity: 0, scale: 0.85, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.78, y: 10 }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="fixed bottom-20 right-4 z-50 flex items-center gap-2.5 overflow-hidden rounded-full border border-slate-700/70 bg-[#0B0F19]/[0.88] px-3.5 py-2 backdrop-blur-2xl transition-colors duration-200 hover:border-cyan-400/50 shadow-[0_12px_32px_-4px_rgba(9,13,22,0.35),0_4px_12px_-2px_rgba(2,132,199,0.18),inset_0_1px_0_0_rgba(255,255,255,0.18)] lg:bottom-6 lg:right-6"
          >
            {/* Cursor-tracking cyan-emerald spotlight beneath glass surface */}
            <span
              className="pointer-events-none absolute inset-0 transition-opacity duration-200"
              style={{
                opacity: spot.hovering ? 1 : 0,
                background: `radial-gradient(110px circle at ${spot.x}px ${spot.y}px, rgba(0, 240, 255, 0.22), rgba(16, 185, 129, 0.12), transparent 72%)`,
              }}
            />

            {/* 24px Animated Neural Core Badge */}
            <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-400/30 bg-slate-900/90">
              <span className="absolute h-5 w-5 animate-ping rounded-full bg-cyan-400/40 opacity-35" />
              <span
                className="relative h-2.5 w-2.5 rounded-full shadow-[0_0_10px_rgba(0,240,255,0.85)]"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, #00F0FF, #10B981)',
                }}
              />
            </span>

            <span className="relative text-sm font-medium tracking-tight text-slate-100">
              Ask Neuro Twin
            </span>

            <kbd className="relative rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
              ⌘K
            </kbd>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════════
          MACOS GENIE DARK OBSIDIAN GLASS DRAWER
      ════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isOpen && (
          <motion.section
            key="neuro-genie-drawer"
            aria-label="Neuro Twin AI Assistant"
            style={{ transformOrigin: 'bottom right' }}
            initial={{
              opacity: 0,
              scaleX: 0.22,
              scaleY: 0.08,
              skewX: -14,
              y: 28,
              clipPath: 'polygon(18% 0%, 82% 0%, 100% 100%, 72% 100%)',
            }}
            animate={{
              opacity: [0, 0.92, 1],
              scaleX: [0.22, 0.72, 1.01, 1],
              scaleY: [0.08, 0.92, 1.02, 1],
              skewX: [-14, -6, 1.5, 0],
              y: [28, -4, 0],
              clipPath: [
                'polygon(18% 0%, 82% 0%, 100% 100%, 72% 100%)',
                'polygon(6% 0%, 96% 0%, 100% 100%, 42% 100%)',
                'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
              ],
              transition: {
                duration: 0.44,
                ease: [0.22, 1, 0.36, 1],
              },
            }}
            exit={{
              opacity: [1, 0.85, 0],
              scaleX: [1, 0.56, 0.2],
              scaleY: [1, 0.72, 0.08],
              skewX: [0, -8, -16],
              y: [0, 10, 28],
              clipPath: [
                'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
                'polygon(10% 0%, 92% 0%, 100% 100%, 54% 100%)',
                'polygon(22% 0%, 80% 0%, 100% 100%, 76% 100%)',
              ],
              transition: {
                duration: 0.3,
                ease: [0.4, 0, 1, 1],
              },
            }}
            className="fixed bottom-20 right-4 z-50 flex h-[min(600px,calc(100vh-6rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#090D16]/[0.95] text-slate-100 shadow-2xl backdrop-blur-2xl sm:w-[432px] lg:bottom-6 lg:right-6 lg:h-[min(600px,calc(100vh-3rem))]"
          >
            {/* Header Bar */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/90 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-400/35 bg-slate-900">
                  <span
                    className="h-2.5 w-2.5 rounded-full shadow-[0_0_8px_rgba(0,240,255,0.85)]"
                    style={{
                      background: 'radial-gradient(circle at 30% 30%, #00F0FF, #10B981)',
                    }}
                  />
                </span>
                <div className="flex items-center gap-2">
                  <span className="whitespace-nowrap text-sm font-semibold tracking-tight text-slate-100">
                    Neuro Twin
                  </span>
                  <span className="whitespace-nowrap rounded-full border border-slate-700/80 bg-slate-800/80 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-300">
                    {userMessageCount} / {MAX_USER_MESSAGES} messages
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowLogs((s) => !s)}
                  title="Conversation Logs"
                  className={`flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-[11px] font-medium transition ${
                    showLogs
                      ? 'bg-cyan-500/15 text-cyan-300'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                  }`}
                >
                  <History className="h-3.5 w-3.5" />
                  <span>Logs</span>
                </button>
                <button
                  type="button"
                  onClick={handleNewChat}
                  title="New Chat Thread"
                  className="flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-[11px] font-medium text-slate-300 transition hover:bg-slate-800/80 hover:text-white"
                >
                  <Plus className="h-3.5 w-3.5 text-emerald-400" />
                  <span>New Chat</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Minimize (Esc)"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800/80 hover:text-white"
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Body Area: Persistent Logs Overlay OR Active Thread */}
            <div className="relative flex flex-1 flex-col overflow-hidden">
              <AnimatePresence>
                {showLogs && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.18 }}
                    className="hud-scroll absolute inset-0 z-20 flex flex-col gap-2 overflow-y-auto bg-[#090D16]/[0.98] p-4"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Saved Neural Logs ({threads.filter((t) => t.messages.length > 0).length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowLogs(false)}
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {threads.filter((t) => t.messages.length > 0).length === 0 ? (
                      <div className="mt-10 text-center text-xs text-slate-500">
                        No past conversations saved yet.
                      </div>
                    ) : (
                      threads
                        .filter((t) => t.messages.length > 0)
                        .map((t) => {
                          const isCurrent = t.id === activeThread?.id;
                          const uCount = t.messages.filter((m) => m.role === 'user').length;
                          return (
                            <div
                              key={t.id}
                              onClick={() => {
                                setActiveThreadId(t.id);
                                setShowLogs(false);
                                setErrorBanner('');
                              }}
                              className={`group flex cursor-pointer items-center justify-between gap-2 rounded-xl border p-3 transition ${
                                isCurrent
                                  ? 'border-cyan-500/40 bg-cyan-500/10'
                                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="truncate text-xs font-semibold text-slate-100">
                                  {t.title}
                                </div>
                                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-500">
                                  <span>{formatThreadTime(t.updatedAt)}</span>
                                  <span>•</span>
                                  <span className="font-mono text-slate-400">
                                    {uCount}/10 msgs
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteThread(t.id, e)}
                                title="Delete thread"
                                className="rounded-lg p-1.5 text-slate-500 opacity-70 transition hover:bg-red-500/15 hover:text-red-400 group-hover:opacity-100"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Message Stream OR Empty State */}
              <div
                ref={scrollRef}
                className="hud-scroll flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
              >
                {activeThread?.messages.length === 0 ? (
                  <div className="my-auto flex flex-col items-center px-2 text-center">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/25 bg-slate-900/90 shadow-[0_0_24px_rgba(0,240,255,0.12)]">
                      <Sparkles className="h-4 w-4 text-cyan-400" />
                    </div>
                    <h3 className="text-xl font-semibold tracking-tight text-slate-100 sm:text-2xl">
                      {greeting}
                    </h3>
                    <p className="mt-1.5 text-xs text-slate-400">
                      Synced with live 3D telemetry · Ask anything about the grid or beyond
                    </p>

                    <div className="mt-5 flex w-full flex-col gap-2">
                      {starters.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => sendMessage(prompt)}
                          className="rounded-xl border border-slate-800 bg-white/[0.04] px-3.5 py-2.5 text-left text-xs font-medium text-slate-200 transition hover:border-cyan-400/40 hover:bg-white/[0.08] hover:text-white"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  activeThread?.messages.map((msg) => {
                    const isUser = msg.role === 'user';
                    const targetTabObj = msg.inspectTab
                      ? NAV_TABS.find((t) => t.id === msg.inspectTab)
                      : null;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                            isUser
                              ? 'bg-gradient-to-br from-sky-600/90 to-emerald-600/90 text-white shadow-sm'
                              : 'border border-slate-800 bg-slate-900/85 text-slate-200'
                          }`}
                        >
                          <div className="whitespace-pre-wrap">{msg.content}</div>

                          {!isUser && targetTabObj && (
                            <button
                              type="button"
                              onClick={() => handleInspectClick(targetTabObj.id)}
                              className="mt-2.5 inline-flex items-center gap-1 rounded-lg border border-cyan-400/35 bg-cyan-500/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-cyan-300 transition hover:bg-cyan-500/20 hover:text-cyan-200"
                            >
                              <ArrowUpRight className="h-3 w-3" />
                              Inspect {targetTabObj.label} in 3D
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {isSending && (
                  <div className="flex items-start">
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/85 px-3.5 py-2.5 text-xs text-slate-400">
                      <span className="h-2 w-2 animate-ping rounded-full bg-cyan-400" />
                      <span>Thinking with live grid context…</span>
                    </div>
                  </div>
                )}

                {errorBanner && (
                  <div className="rounded-xl border border-red-500/35 bg-red-500/10 p-3 text-xs text-red-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                      <div className="flex-1">
                        <div>{errorBanner}</div>
                        {failedPrompt && (
                          <button
                            type="button"
                            onClick={() => sendMessage(failedPrompt, true)}
                            className="mt-2 inline-flex items-center gap-1 rounded-lg border border-red-400/30 bg-red-500/20 px-2.5 py-1 text-[11px] font-semibold text-red-100 transition hover:bg-red-500/30"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Retry
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 10-Message Guardrail Banner */}
              {limitReached && (
                <div className="mx-4 mb-2 flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                  <span>
                    Session limit reached (10/10) to optimize neural tokens — Start a New Thread to
                    continue.
                  </span>
                  <button
                    type="button"
                    onClick={handleNewChat}
                    className="shrink-0 rounded-lg bg-amber-500/20 px-2 py-1 font-semibold text-amber-100 transition hover:bg-amber-500/30"
                  >
                    New Thread
                  </button>
                </div>
              )}

              {/* Input Footer */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage(input);
                }}
                className="border-t border-slate-800/90 p-3"
              >
                <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5 focus-within:border-cyan-500/50">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    disabled={limitReached || isSending}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      limitReached
                        ? 'Thread limit reached (10/10)…'
                        : 'Ask Neuro Twin anything…'
                    }
                    className="flex-1 bg-transparent py-1 text-xs text-slate-100 placeholder-slate-500 outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={limitReached || isSending || !input.trim()}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </form>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
