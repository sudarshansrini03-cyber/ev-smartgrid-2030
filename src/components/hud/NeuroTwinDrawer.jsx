import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Send,
  Plus,
  Menu,
  Minimize2,
  Trash2,
  RotateCcw,
  ArrowUpRight,
  AlertCircle,
  X,
  Sparkles,
  Brain,
  ChevronDown,
  Image as ImageIcon,
  FileText,
  SquarePen,
  History,
  Check,
  CheckCircle2,
} from 'lucide-react';
import { NAV_TABS } from '../../data/initialData';

const STORAGE_KEY = 'neuro_twin_threads_v1';
const MEMORIES_STORAGE_KEY = 'neuro_twin_memories';
const MODEL_STORAGE_KEY = 'neuro_twin_model_v1';
const MAX_USER_MESSAGES = 10;
const MAX_MEMORIES = 15;
const MAX_FILE_CHARS = 4500;
const MAX_IMAGES = 3;
const VISION_MODEL_ID = 'qwen/qwen3.8-27b';

const GROQ_MODELS = [
  { id: 'openai/gpt-oss-20b', label: 'Fast', shortId: 'gpt-oss-20b', desc: 'Fast · Default' },
  { id: 'openai/gpt-oss-120b', label: 'Deep', shortId: 'gpt-oss-120b', desc: 'Reasoning' },
  { id: VISION_MODEL_ID, label: 'Vision', shortId: 'qwen3.8-27b', desc: 'Screenshots & Images' },
];

const STARTERS_BY_TAB = {
  dashboard: [
    'Explain current Solar vs Grid load',
    'Which TN · KA · KL hub needs relief right now?',
    'Summarize Chennai Metro Zone grid health',
  ],
  vehicles: [
    'Which EV in our fleet has the lowest SoC?',
    'Compare Vehicle 1 and Vehicle 2 range & status',
    'How fast can Vehicle 2 reach 90% at 240 kW?',
  ],
  stations: [
    'Which station has the shortest wait & best score?',
    'Compare Chennai TN vs Bengaluru KA queues',
    'Inspect Station C (Kochi KL) solar capacity in 3D',
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
  if (hour >= 12 && hour <= 17) return 'Where should we start?';
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

function loadMemories() {
  try {
    const raw = localStorage.getItem(MEMORIES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((m) => typeof m === 'string' && m.trim()).slice(0, MAX_MEMORIES)
      : [];
  } catch {
    return [];
  }
}

function loadSavedModel() {
  try {
    const saved = localStorage.getItem(MODEL_STORAGE_KEY);
    if (saved === 'qwen/qwen-3.8-27b') return VISION_MODEL_ID;
    if (GROQ_MODELS.some((m) => m.id === saved)) return saved;
  } catch {
    // ignore
  }
  return GROQ_MODELS[0].id;
}

function compressImageToJpegBase64(file, maxDim = 1280, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format'));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

function mergeAndCapMemories(existing, incoming) {
  const seen = new Set();
  const merged = [];
  for (const item of [...incoming, ...existing]) {
    const clean = String(item || '')
      .replace(/^[-*•\s]+/, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(clean);
    if (merged.length >= MAX_MEMORIES) break;
  }
  return merged;
}

function parseAssistantReply(rawText) {
  let working = rawText || '';

  // Parse all [[ADD_EV:{...}]] action tags via matchAll
  const addEvPayloads = [];
  for (const match of working.matchAll(/\[\[ADD_EV:(\{[\s\S]*?\})\]\]/gi)) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed && typeof parsed === 'object') {
        addEvPayloads.push(parsed);
      }
    } catch {
      // ignore malformed tag
    }
  }
  working = working.replace(/\[\[ADD_EV:\{[\s\S]*?\}\]\]/gi, '').trim();

  // Parse all [[DELETE_EV:{...}]] action tags via matchAll
  const deleteEvPayloads = [];
  for (const match of working.matchAll(/\[\[DELETE_EV:(\{[\s\S]*?\})\]\]/gi)) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed && typeof parsed === 'object') {
        const query = parsed.query || parsed.id || parsed.model || parsed.owner;
        if (query) deleteEvPayloads.push({ ...parsed, query: String(query) });
      }
    } catch {
      // ignore malformed tag
    }
  }
  working = working.replace(/\[\[DELETE_EV:\{[\s\S]*?\}\]\]/gi, '').trim();

  const tagRegex = /\[\[INSPECT:([a-z-]+)\]\]/i;
  const inspectMatch = working.match(tagRegex);
  let inspectTab = null;
  if (inspectMatch) {
    const candidate = inspectMatch[1].toLowerCase();
    if (NAV_TABS.some((t) => t.id === candidate)) {
      inspectTab = candidate;
    }
  }
  const cleanText = working.replace(/\[\[INSPECT:[a-z-]+\]\]/gi, '').trim();

  if (!inspectTab && addEvPayloads.length === 0 && deleteEvPayloads.length === 0) {
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

  return { cleanText, inspectTab, addEvPayloads, deleteEvPayloads };
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

/** Normalize single-asterisk emphasis (*Label:*) -> **Label:** before inline rendering */
function normalizeMarkdownEmphasis(text) {
  return String(text || '').replace(
    /(^|[^*])\*([^\s*](?:[^*]*?[^\s*])?)\*(?!\*)/g,
    '$1**$2**'
  );
}

/** Lightweight inline formatter rendering **bold** and crisp bullets cleanly without raw tables */
function renderInlineBold(text) {
  const normalized = normalizeMarkdownEmphasis(text);
  const parts = normalized.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="rounded bg-white/10 px-1 py-0.5 font-mono text-[11px] text-cyan-300"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function FormattedResponse({ content }) {
  const lines = content.split('\n');
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;
        const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
        if (bulletMatch) {
          return (
            <div key={i} className="flex items-start gap-2 pl-0.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/80" />
              <span className="flex-1">{renderInlineBold(bulletMatch[1])}</span>
            </div>
          );
        }
        return <p key={i}>{renderInlineBold(line)}</p>;
      })}
    </div>
  );
}

export default function NeuroTwinDrawer({
  isOpen: controlledOpen,
  onOpenChange,
  activeTab,
  telemetry,
  onInspectTab,
  onAddVehicleFromAI,
  onDeleteVehicleFromAI,
  onShowToast,
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = useCallback(
    (next) => {
      const value = typeof next === 'function' ? next(isOpen) : next;
      if (onOpenChange) onOpenChange(value);
      else setInternalOpen(value);
    },
    [isOpen, onOpenChange]
  );

  const [showSidebar, setShowSidebar] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);

  const [threads, setThreads] = useState(() => {
    const saved = loadThreads();
    return saved.length > 0 ? saved : [createEmptyThread()];
  });
  const [activeThreadId, setActiveThreadId] = useState(() => {
    const saved = loadThreads();
    return saved.length > 0 ? saved[0].id : null;
  });
  const [memories, setMemories] = useState(() => loadMemories());
  const [selectedModel, setSelectedModel] = useState(() => loadSavedModel());
  const [autoSwitchedToVision, setAutoSwitchedToVision] = useState(false);

  const [input, setInput] = useState('');
  const [attachedImages, setAttachedImages] = useState([]); // Array<{ id, name, dataUrl }>
  const [imageLimitHint, setImageLimitHint] = useState('');
  const [attachedFile, setAttachedFile] = useState(null); // { name, text, base64 }
  const [isSending, setIsSending] = useState(false);
  const [extractingMemory, setExtractingMemory] = useState(false);
  const [failedRequest, setFailedRequest] = useState(null);
  const [errorBanner, setErrorBanner] = useState('');

  const [spot, setSpot] = useState({ x: 90, y: 20, hovering: false });

  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastExtractedCountRef = useRef({});

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId) || threads[0],
    [threads, activeThreadId]
  );

  useEffect(() => {
    if (!activeThreadId && threads[0]) {
      setActiveThreadId(threads[0].id);
    }
  }, [activeThreadId, threads]);

  useEffect(() => {
    try {
      const nonEmptyOrCurrent = threads.filter(
        (t) => t.messages.length > 0 || t.id === activeThread?.id
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nonEmptyOrCurrent));
    } catch {
      // Ignore quota errors
    }
  }, [threads, activeThread?.id]);

  useEffect(() => {
    try {
      localStorage.setItem(MEMORIES_STORAGE_KEY, JSON.stringify(memories));
    } catch {
      // Ignore quota errors
    }
  }, [memories]);

  useEffect(() => {
    try {
      localStorage.setItem(MODEL_STORAGE_KEY, selectedModel);
    } catch {
      // Ignore
    }
  }, [selectedModel]);

  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeThread?.messages?.length, isSending, isOpen]);

  useEffect(() => {
    if (isOpen && !showSidebar) {
      const timer = setTimeout(() => inputRef.current?.focus(), 220);
      return () => clearTimeout(timer);
    }
  }, [isOpen, showSidebar]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        if (showAttachMenu || showModelMenu || showSidebar) {
          setShowAttachMenu(false);
          setShowModelMenu(false);
          setShowSidebar(false);
        } else {
          setIsOpen(false);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, setIsOpen, showAttachMenu, showModelMenu, showSidebar]);

  const userMessageCount = useMemo(
    () => (activeThread?.messages || []).filter((m) => m.role === 'user').length,
    [activeThread]
  );
  const limitReached = userMessageCount >= MAX_USER_MESSAGES;

  const extractMemoriesFromMessages = useCallback(async (threadId, msgs) => {
    if (!threadId || !Array.isArray(msgs) || msgs.length < 2) return;
    const alreadyCount = lastExtractedCountRef.current[threadId] || 0;
    if (msgs.length <= alreadyCount) return;

    lastExtractedCountRef.current[threadId] = msgs.length;
    const apiBase = import.meta.env.VITE_API_URL || '';
    const latestStored = loadMemories();
    setExtractingMemory(true);
    try {
      const res = await fetch(`${apiBase}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'extract_memory',
          messages: msgs.map((m) => ({ role: m.role, content: m.content })),
          memories: latestStored,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.memories) && data.memories.length > 0) {
        setMemories((prev) => {
          const base = prev.length > 0 ? prev : latestStored;
          const next = mergeAndCapMemories(base, data.memories);
          try {
            localStorage.setItem(MEMORIES_STORAGE_KEY, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
      }
    } catch {
      // Non-blocking background extraction
    } finally {
      setExtractingMemory(false);
    }
  }, []);

  const handleNewChat = useCallback(() => {
    if (activeThread && activeThread.messages.length >= 2) {
      extractMemoriesFromMessages(activeThread.id, activeThread.messages);
    }
    const fresh = createEmptyThread();
    setThreads((prev) => [fresh, ...prev.filter((t) => t.messages.length > 0)]);
    setActiveThreadId(fresh.id);
    setShowSidebar(false);
    setShowAttachMenu(false);
    setShowModelMenu(false);
    setErrorBanner('');
    setFailedRequest(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [activeThread, extractMemoriesFromMessages]);

  const handleSwitchThread = useCallback(
    (targetThreadId) => {
      if (activeThread && activeThread.id !== targetThreadId && activeThread.messages.length >= 2) {
        extractMemoriesFromMessages(activeThread.id, activeThread.messages);
      }
      setActiveThreadId(targetThreadId);
      setShowSidebar(false);
      setErrorBanner('');
      setFailedRequest(null);
    },
    [activeThread, extractMemoriesFromMessages]
  );

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

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    const slotsLeft = MAX_IMAGES - attachedImages.length;
    if (slotsLeft <= 0) {
      setImageLimitHint('Maximum 3 images per message reached.');
      setShowAttachMenu(false);
      return;
    }

    let hintMsg = '';
    if (files.length > slotsLeft) {
      hintMsg = `Maximum ${MAX_IMAGES} images per message — extra file${files.length - slotsLeft > 1 ? 's' : ''} skipped.`;
    }

    const candidates = files.slice(0, slotsLeft);
    const newlyCompressed = [];

    for (const file of candidates) {
      if (file.size > 15 * 1024 * 1024) {
        hintMsg = `${file.name} skipped (must be under 15 MB).`;
        continue;
      }
      try {
        const compressedDataUrl = await compressImageToJpegBase64(file, 1280, 0.85);
        newlyCompressed.push({
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          dataUrl: compressedDataUrl,
        });
      } catch {
        hintMsg = `Unable to process ${file.name}.`;
      }
    }

    if (newlyCompressed.length > 0) {
      setAttachedImages((prev) => [...prev, ...newlyCompressed].slice(0, MAX_IMAGES));
      if (selectedModel !== VISION_MODEL_ID) {
        setSelectedModel(VISION_MODEL_ID);
        setAutoSwitchedToVision(true);
      }
    }
    setImageLimitHint(hintMsg);
    setShowAttachMenu(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      if (onShowToast) onShowToast('Document must be under 5 MB', 'warning');
      return;
    }

    const ext = file.name.toLowerCase().split('.').pop();
    const isBinaryDoc = ext === 'pdf' || ext === 'docx' || ext === 'pptx';

    const reader = new FileReader();
    reader.onload = () => {
      if (isBinaryDoc) {
        const dataUrl = String(reader.result || '');
        const b64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        setAttachedFile({
          name: file.name,
          text: null,
          base64: b64,
        });
      } else {
        const rawText = String(reader.result || '');
        const clipped = rawText.slice(0, MAX_FILE_CHARS);
        setAttachedFile({
          name: file.name,
          text: clipped,
          base64: null,
          truncated: rawText.length > MAX_FILE_CHARS,
        });
      }
      setShowAttachMenu(false);
    };

    if (isBinaryDoc) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  };

  const sendMessage = useCallback(
    async (promptText, retryPayload = null) => {
      if (isSending || !activeThread) return;

      const text = (retryPayload ? retryPayload.text : promptText || '').trim();
      const imgs = retryPayload ? retryPayload.images || [] : attachedImages;
      const fileObj = retryPayload ? retryPayload.file : attachedFile;
      const modelToUse = retryPayload
        ? retryPayload.model
        : imgs.length > 0
        ? VISION_MODEL_ID
        : selectedModel;

      const effectivePrompt =
        text ||
        (imgs.length > 0
          ? imgs.length > 1
            ? `Analyze these ${imgs.length} screenshots in detail.`
            : 'Analyze this screenshot in detail.'
          : fileObj
          ? `Analyze ${fileObj.name}.`
          : '');
      if (!effectivePrompt) return;

      const currentUserCount = activeThread.messages.filter((m) => m.role === 'user').length;
      if (!retryPayload && currentUserCount >= MAX_USER_MESSAGES) return;

      const shouldResetVision = !retryPayload && imgs.length > 0 && autoSwitchedToVision;

      setErrorBanner('');
      setFailedRequest(null);
      setShowAttachMenu(false);
      setShowModelMenu(false);
      setImageLimitHint('');

      let nextMessages = activeThread.messages;
      if (!retryPayload) {
        const userMsg = {
          id: `msg-${Date.now()}`,
          role: 'user',
          content: effectivePrompt,
          imagePreviews: imgs.map((i) => ({ name: i.name, dataUrl: i.dataUrl })),
          fileName: fileObj?.name || null,
          ts: new Date().toISOString(),
        };
        nextMessages = [...activeThread.messages, userMsg];

        const shortTitle =
          activeThread.messages.length === 0
            ? effectivePrompt.length > 36
              ? `${effectivePrompt.slice(0, 36)}…`
              : effectivePrompt
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
        setAttachedImages([]);
        setAttachedFile(null);
      }

      setIsSending(true);
      const apiBase = import.meta.env.VITE_API_URL || '';
      const storedMemories = loadMemories();
      const activeMemories = storedMemories.length > 0 ? storedMemories : memories;

      try {
        const fetchPromise = fetch(`${apiBase}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'chat',
            model: modelToUse,
            messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
            telemetry,
            memories: activeMemories,
            images_base64: imgs.length > 0 ? imgs.map((i) => i.dataUrl) : null,
            image_base64: imgs[0]?.dataUrl || null,
            file_text: fileObj?.text || null,
            file_base64: fileObj?.base64 || null,
            file_name: fileObj?.name || null,
          }),
        });

        // Immediately reset back to Fast after dispatching image request if auto-switched
        if (shouldResetVision) {
          setSelectedModel('openai/gpt-oss-20b');
          setAutoSwitchedToVision(false);
        }

        const res = await fetchPromise;

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

        const { cleanText, inspectTab, addEvPayloads, deleteEvPayloads } = parseAssistantReply(
          data.reply || ''
        );

        const addedVehicles = [];
        if (addEvPayloads.length > 0 && onAddVehicleFromAI) {
          for (const payload of addEvPayloads) {
            const added = onAddVehicleFromAI(payload);
            if (added) addedVehicles.push({ id: added.id, model: added.model });
          }
        }

        const deletedVehicles = [];
        if (deleteEvPayloads.length > 0 && onDeleteVehicleFromAI) {
          for (const payload of deleteEvPayloads) {
            const removed = onDeleteVehicleFromAI(payload.query);
            if (removed) deletedVehicles.push({ id: removed.id, model: removed.model });
          }
        }

        const fleetChanged = addedVehicles.length > 0 || deletedVehicles.length > 0;
        const assistantMsg = {
          id: `msg-${Date.now()}-ai`,
          role: 'assistant',
          content: cleanText,
          inspectTab: fleetChanged ? 'vehicles' : inspectTab,
          addedVehicles,
          deletedVehicles,
          modelUsed: data.model_used || data.model || modelToUse,
          ts: new Date().toISOString(),
        };

        const finalMessages = [...nextMessages, assistantMsg];

        setThreads((prev) =>
          prev.map((t) =>
            t.id === activeThread.id
              ? {
                  ...t,
                  updatedAt: new Date().toISOString(),
                  messages: finalMessages,
                }
              : t
          )
        );

        // Automatically extract memories after every 2nd user message
        const updatedUserCount = finalMessages.filter((m) => m.role === 'user').length;
        if (updatedUserCount >= 2 && updatedUserCount % 2 === 0) {
          extractMemoriesFromMessages(activeThread.id, finalMessages);
        }
      } catch (err) {
        setErrorBanner(err.message || 'Unable to reach Neuro Twin backend.');
        setFailedRequest({
          text: effectivePrompt,
          images: imgs,
          file: fileObj,
          model: modelToUse,
        });
      } finally {
        setIsSending(false);
      }
    },
    [
      activeThread,
      attachedFile,
      attachedImages,
      autoSwitchedToVision,
      extractMemoriesFromMessages,
      isSending,
      memories,
      onAddVehicleFromAI,
      onDeleteVehicleFromAI,
      selectedModel,
      telemetry,
    ]
  );

  const handleInspectClick = (tabId) => {
    onInspectTab(tabId);
    const label = NAV_TABS.find((t) => t.id === tabId)?.label || tabId;
    if (onShowToast) onShowToast(`Neuro Twin focused 3D camera on ${label}`);
  };

  const starters = STARTERS_BY_TAB[activeTab] || STARTERS_BY_TAB.dashboard;
  const greeting = getTimeGreeting();
  const activeModelObj = GROQ_MODELS.find((m) => m.id === selectedModel) || GROQ_MODELS[0];

  return (
    <>
      {/* Hidden file pickers */}
      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        onChange={handleImageUpload}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.pptx,.csv,.json,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/csv,application/json,text/plain,text/markdown"
        onChange={handleFileUpload}
        className="hidden"
      />

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
            <span
              className="pointer-events-none absolute inset-0 transition-opacity duration-200"
              style={{
                opacity: spot.hovering ? 1 : 0,
                background: `radial-gradient(110px circle at ${spot.x}px ${spot.y}px, rgba(0, 240, 255, 0.22), rgba(16, 185, 129, 0.12), transparent 72%)`,
              }}
            />

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
          GEMINI-MINIMALIST MACOS GENIE OBSIDIAN DRAWER
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
            className="fixed bottom-20 right-4 z-50 flex h-[min(620px,calc(100vh-6rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#090D16]/[0.95] text-slate-100 shadow-2xl backdrop-blur-2xl sm:w-[460px] lg:bottom-6 lg:right-6 lg:h-[min(620px,calc(100vh-3rem))]"
          >
            {/* Minimalist Gemini-Style Top Header */}
            <div className="flex items-center justify-between border-b border-slate-800/70 px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSidebar((s) => !s)}
                  title="Menu, Logs & Memory"
                  className={`rounded-lg p-1.5 transition ${
                    showSidebar
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                  }`}
                >
                  <Menu className="h-4 w-4" />
                </button>

                <span className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-cyan-400/35 bg-slate-900">
                  <span
                    className="h-2 w-2 rounded-full shadow-[0_0_8px_rgba(0,240,255,0.85)]"
                    style={{
                      background: 'radial-gradient(circle at 30% 30%, #00F0FF, #10B981)',
                    }}
                  />
                </span>
                <span className="whitespace-nowrap text-sm font-semibold tracking-tight text-slate-100">
                  Neuro Twin
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleNewChat}
                  title="New Chat"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-emerald-400"
                >
                  <SquarePen className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Minimize (Esc)"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body Container */}
            <div className="relative flex flex-1 flex-col overflow-hidden">
              {/* Collapsible Left-Side Gemini Rail (Logs, Memory & Quota) */}
              <AnimatePresence>
                {showSidebar && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowSidebar(false)}
                      className="absolute inset-0 z-20 bg-black/50 backdrop-blur-[2px]"
                    />
                    <motion.aside
                      initial={{ x: '-100%' }}
                      animate={{ x: 0 }}
                      exit={{ x: '-100%' }}
                      transition={{ type: 'spring', stiffness: 360, damping: 34 }}
                      className="hud-scroll absolute inset-y-0 left-0 z-30 flex w-[82%] max-w-[320px] flex-col gap-4 overflow-y-auto border-r border-slate-800 bg-[#0B0F19]/[0.98] p-4 shadow-2xl"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Workspace & Memory
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowSidebar(false)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Quota Card */}
                      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-slate-400">Thread Quota</span>
                          <span className="font-mono font-semibold text-cyan-300">
                            {userMessageCount} / {MAX_USER_MESSAGES} messages
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all"
                            style={{ width: `${(userMessageCount / MAX_USER_MESSAGES) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Cross-Chat Memory Section */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">
                            <Brain
                              className={`h-3.5 w-3.5 ${
                                extractingMemory ? 'animate-pulse text-cyan-400' : 'text-emerald-400'
                              }`}
                            />
                            <span>Memory ({memories.length})</span>
                          </div>
                          {memories.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setMemories([])}
                              className="text-[10px] font-semibold text-red-400 transition hover:text-red-300"
                            >
                              Clear All
                            </button>
                          )}
                        </div>

                        {memories.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-800 p-3 text-[11px] text-slate-500">
                            No saved memories yet. Captured automatically every 2 messages or on New Chat.
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            {memories.map((item, idx) => (
                              <div
                                key={`${idx}-${item}`}
                                className="flex items-start justify-between gap-2 rounded-lg border border-slate-800/90 bg-slate-900/60 px-2.5 py-2 text-[11px] text-slate-300"
                              >
                                <span className="leading-snug">{item}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMemories((prev) => prev.filter((_, i) => i !== idx))
                                  }
                                  title="Delete memory"
                                  className="shrink-0 rounded p-0.5 text-slate-500 hover:bg-red-500/15 hover:text-red-400"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Conversation Logs Section */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">
                            <History className="h-3.5 w-3.5 text-cyan-400" />
                            <span>
                              Logs ({threads.filter((t) => t.messages.length > 0).length})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleNewChat}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 hover:text-emerald-300"
                          >
                            <Plus className="h-3 w-3" /> New Chat
                          </button>
                        </div>

                        {threads.filter((t) => t.messages.length > 0).length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-800 p-3 text-[11px] text-slate-500">
                            No past conversations saved yet.
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            {threads
                              .filter((t) => t.messages.length > 0)
                              .map((t) => {
                                const isCurrent = t.id === activeThread?.id;
                                const uCount = t.messages.filter((m) => m.role === 'user').length;
                                return (
                                  <div
                                    key={t.id}
                                    onClick={() => handleSwitchThread(t.id)}
                                    className={`group flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-2.5 py-2 transition ${
                                      isCurrent
                                        ? 'border-cyan-500/40 bg-cyan-500/10'
                                        : 'border-slate-800/80 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900'
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <div className="truncate text-[11px] font-semibold text-slate-200">
                                        {t.title}
                                      </div>
                                      <div className="mt-0.5 text-[10px] text-slate-500">
                                        {formatThreadTime(t.updatedAt)} · {uCount}/10
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteThread(t.id, e)}
                                      title="Delete thread"
                                      className="rounded p-1 text-slate-500 hover:bg-red-500/15 hover:text-red-400"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </motion.aside>
                  </>
                )}
              </AnimatePresence>

              {/* Message Stream OR Gemini-Style Empty State */}
              <div
                ref={scrollRef}
                className="hud-scroll flex flex-1 flex-col gap-3.5 overflow-y-auto px-4 py-4"
              >
                {activeThread?.messages.length === 0 ? (
                  <div className="my-auto flex flex-col items-center px-3 py-6 text-center">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-slate-900/80 shadow-[0_0_28px_rgba(0,240,255,0.12)]">
                      <Sparkles className="h-5 w-5 text-cyan-400" />
                    </div>
                    <h3 className="text-2xl font-semibold tracking-tight text-slate-100">
                      {greeting}
                    </h3>
                    <p className="mt-2 max-w-xs text-xs text-slate-400">
                      Live 3D telemetry &amp; cross-chat memory active
                    </p>

                    <div className="mt-7 flex w-full flex-col gap-2">
                      {starters.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => sendMessage(prompt)}
                          className="rounded-2xl border border-slate-800/90 bg-white/[0.03] px-3.5 py-2.5 text-left text-xs font-medium text-slate-300 transition hover:border-cyan-400/40 hover:bg-white/[0.07] hover:text-white"
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
                              ? 'bg-[#1B2336] text-slate-100 border border-slate-700/70 shadow-sm'
                              : 'text-slate-200'
                          }`}
                        >
                          {isUser &&
                            (msg.imagePreviews?.length > 0 ? (
                              <div className="mb-2 flex flex-wrap gap-1.5">
                                {msg.imagePreviews.map((img, i) => (
                                  <img
                                    key={i}
                                    src={img.dataUrl}
                                    alt={img.name || `Screenshot ${i + 1}`}
                                    className="max-h-28 w-auto rounded-xl border border-slate-700/60 object-cover"
                                  />
                                ))}
                              </div>
                            ) : (
                              msg.imagePreview && (
                                <img
                                  src={msg.imagePreview}
                                  alt={msg.imageName || 'Uploaded screenshot'}
                                  className="mb-2 max-h-40 w-auto rounded-xl border border-slate-700/60 object-contain"
                                />
                              )
                            ))}
                          {isUser && msg.fileName && (
                            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/70 px-2 py-1 text-[10px] font-medium text-cyan-300">
                              <FileText className="h-3 w-3" />
                              <span>{msg.fileName}</span>
                            </div>
                          )}

                          {isUser ? (
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                          ) : (
                            <FormattedResponse content={msg.content} />
                          )}

                          {!isUser &&
                            (msg.addedVehicles?.length > 0
                              ? msg.addedVehicles
                              : msg.addedVehicle
                              ? [msg.addedVehicle]
                              : []
                            ).map((ev) => (
                              <div
                                key={`added-${ev.id}`}
                                className="mt-2 mr-1.5 inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                <span>
                                  Added {ev.model} ({ev.id}) to 3D Fleet
                                </span>
                              </div>
                            ))}

                          {!isUser &&
                            msg.deletedVehicles?.map((ev) => (
                              <div
                                key={`deleted-${ev.id}`}
                                className="mt-2 mr-1.5 inline-flex items-center gap-1.5 rounded-lg border border-rose-400/35 bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                                <span>
                                  ✓ Removed {ev.model} ({ev.id})
                                </span>
                              </div>
                            ))}

                          {!isUser && (targetTabObj || msg.modelUsed) && (
                            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                              {targetTabObj && (
                                <button
                                  type="button"
                                  onClick={() => handleInspectClick(targetTabObj.id)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/35 bg-cyan-500/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-cyan-300 transition hover:bg-cyan-500/20 hover:text-cyan-200"
                                >
                                  <ArrowUpRight className="h-3 w-3" />
                                  Inspect {targetTabObj.label} in 3D
                                </button>
                              )}
                              {msg.modelUsed && (
                                <span className="rounded-md border border-slate-800 bg-slate-900/80 px-2 py-0.5 font-mono text-[9.5px] text-slate-400">
                                  {msg.modelUsed}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {isSending && (
                  <div className="flex items-start px-1">
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-800/90 bg-slate-900/70 px-3.5 py-2 text-xs text-slate-400">
                      <span className="h-2 w-2 animate-ping rounded-full bg-cyan-400" />
                      <span>Thinking with {activeModelObj.label}…</span>
                    </div>
                  </div>
                )}

                {errorBanner && (
                  <div className="rounded-xl border border-red-500/35 bg-red-500/10 p-3 text-xs text-red-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                      <div className="flex-1">
                        <div>{errorBanner}</div>
                        {failedRequest && (
                          <button
                            type="button"
                            onClick={() => sendMessage(failedRequest.text, failedRequest)}
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
                <div className="mx-3.5 mb-2 flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
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

              {/* Unified Gemini-Style Input Pill */}
              <div className="relative px-3.5 pb-3.5 pt-1">
                {/* Attach Popover Menu */}
                <AnimatePresence>
                  {showAttachMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.14 }}
                      className="absolute bottom-[4.5rem] left-3.5 z-30 w-56 rounded-2xl border border-slate-700/80 bg-[#131824] p-1.5 shadow-2xl backdrop-blur-xl"
                    >
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-200 transition hover:bg-white/10"
                      >
                        <ImageIcon className="h-4 w-4 text-cyan-400" />
                        <span>Upload Screenshot / Image</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-200 transition hover:bg-white/10"
                      >
                        <FileText className="h-4 w-4 text-emerald-400" />
                        <span>Attach Document / File</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Model Selector Dropdown Menu */}
                <AnimatePresence>
                  {showModelMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.14 }}
                      className="absolute bottom-[4.5rem] right-12 z-30 w-64 rounded-2xl border border-slate-700/80 bg-[#131824] p-1.5 shadow-2xl backdrop-blur-xl"
                    >
                      {GROQ_MODELS.map((m) => {
                        const active = selectedModel === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setSelectedModel(m.id);
                              setAutoSwitchedToVision(false);
                              setShowModelMenu(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                              active
                                ? 'bg-cyan-500/15 text-cyan-200'
                                : 'text-slate-200 hover:bg-white/10'
                            }`}
                          >
                            <div>
                              <div className="text-xs font-semibold">
                                {m.label} · <span className="font-mono text-[11px] text-cyan-300">{m.shortId}</span>
                              </div>
                              <div className="text-[10px] text-slate-400">{m.desc}</div>
                            </div>
                            {active && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage(input);
                  }}
                  className="rounded-3xl border border-slate-700/70 bg-[#131824] px-3 py-2 shadow-lg focus-within:border-cyan-500/50"
                >
                  {/* Attachment Preview Chips */}
                  {(attachedImages.length > 0 ||
                    attachedFile ||
                    autoSwitchedToVision ||
                    imageLimitHint) && (
                    <div className="mb-2 flex flex-wrap items-center gap-2 px-1">
                      {attachedImages.map((img) => (
                        <div
                          key={img.id}
                          className="relative flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 p-1 pr-2"
                        >
                          <img
                            src={img.dataUrl}
                            alt={img.name}
                            className="h-8 w-8 rounded-lg object-cover"
                          />
                          <span className="max-w-[90px] truncate text-[10px] font-medium text-slate-200">
                            {img.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setImageLimitHint('');
                              setAttachedImages((prev) => {
                                const next = prev.filter((item) => item.id !== img.id);
                                if (next.length === 0 && autoSwitchedToVision) {
                                  setSelectedModel('openai/gpt-oss-20b');
                                  setAutoSwitchedToVision(false);
                                }
                                return next;
                              });
                            }}
                            className="rounded-full p-0.5 text-slate-400 hover:bg-white/10 hover:text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}

                      {attachedFile && (
                        <div className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-2.5 py-1 text-[10px] font-medium text-emerald-300">
                          <FileText className="h-3 w-3" />
                          <span className="max-w-[130px] truncate">{attachedFile.name}</span>
                          <button
                            type="button"
                            onClick={() => setAttachedFile(null)}
                            className="rounded-full p-0.5 text-slate-400 hover:bg-white/10 hover:text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}

                      {autoSwitchedToVision && (
                        <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
                          Auto-switched to Vision
                        </span>
                      )}

                      {imageLimitHint && (
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                          {imageLimitHint}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Borderless Center Textarea */}
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    disabled={limitReached || isSending}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(input);
                      }
                    }}
                    placeholder={
                      limitReached ? 'Thread limit reached (10/10)…' : 'Ask Neuro Twin...'
                    }
                    className="hud-scroll max-h-24 w-full resize-none bg-transparent px-1.5 py-1 text-xs text-slate-100 placeholder-slate-500 outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  />

                  {/* Bottom Pill Controls Row: + Attach | Model v + Send */}
                  <div className="mt-1 flex items-center justify-between">
                    <button
                      type="button"
                      disabled={limitReached || isSending}
                      onClick={() => {
                        setShowAttachMenu((a) => !a);
                        setShowModelMenu(false);
                      }}
                      title="Upload screenshot or data file"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={limitReached || isSending}
                        onClick={() => {
                          setShowModelMenu((m) => !m);
                          setShowAttachMenu(false);
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-700/70 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:border-slate-600 hover:bg-white/10 hover:text-white disabled:opacity-40"
                      >
                        <span>
                          {activeModelObj.label} ·{' '}
                          <span className="font-mono text-[10px] text-cyan-300">
                            {activeModelObj.shortId}
                          </span>
                        </span>
                        <ChevronDown className="h-3 w-3 text-slate-400" />
                      </button>

                      <button
                        type="submit"
                        disabled={
                          limitReached ||
                          isSending ||
                          (!input.trim() && attachedImages.length === 0 && !attachedFile)
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
