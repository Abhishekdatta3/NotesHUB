import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Sparkles, User, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const SUGGESTIONS = [
  'Explain the hardest topic in my latest notes simply',
  'Summarize the notes I uploaded this week',
  'Quiz me on a topic from the notes',
];

function newSessionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadSessionId() {
  try {
    const existing = localStorage.getItem('ai-tutor-session');
    if (existing) return existing;
    const id = newSessionId();
    localStorage.setItem('ai-tutor-session', id);
    return id;
  } catch {
    return newSessionId();
  }
}

export default function AiTutorDrawer({ open, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const sessionIdRef = useRef(loadSessionId());
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!open || messages.length > 0) return;
    supabase
      .from('chat_messages')
      .select('id, role, content, citations')
      .eq('session_id', sessionIdRef.current)
      .order('created_at', { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data && data.length > 0) setMessages(data);
      });
  }, [open, messages.length]);

  const ask = async (question) => {
    const q = question.trim();
    if (!q || loading) return;
    setError(null);
    setInput('');
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: 'user', content: q }]);
    setLoading(true);
    try {
      const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: q, sessionId: sessionIdRef.current, history }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || typeof data.answer !== 'string') {
        if (res.status === 404) {
          throw new Error('AI tutor is not deployed on this Supabase project. Deploy the ai-tutor Edge Function, then try again.');
        }
        throw new Error(
          (data && typeof data.error === 'string' && data.error)
          || (data && typeof data.message === 'string' && data.message)
          || `The tutor request failed (${res.status}). Please try again.`,
        );
      }
      if (!data.llm && Array.isArray(data.providerErrors) && data.providerErrors.length > 0) {
        console.warn('AI tutor provider errors:', data.providerErrors);
      }
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.answer,
          citations: Array.isArray(data.citations) ? data.citations : [],
          providerWarning:
            !data.llm && data.usedNotes
              ? (data.providerConfigured
                  ? 'AI provider request failed; this response is from note-text matching only.'
                  : 'No AI provider secret is configured; this response is from note-text matching only.')
              : '',
        },
      ]);
    } catch (err) {
      if (err instanceof TypeError) {
        setError('Could not reach the Supabase AI tutor endpoint. Check the URL, internet connection, and Edge Function deployment.');
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-900/40 backdrop-blur-sm" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col bg-stone-50 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-stone-200 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-white">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold text-stone-900">AI Study Tutor</h3>
              <p className="text-xs text-stone-500">Answers from your uploaded notes</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600" aria-label="Close tutor">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
          {messages.length === 0 && !loading && (
            <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
              <Sparkles className="mx-auto h-7 w-7 text-emerald-600" />
              <p className="mt-2 font-medium text-stone-800">Ask anything from your notes</p>
              <p className="mt-1 text-sm text-stone-500">
                I read the notes uploaded to this site — including text recognized from photos of handwriting — and answer with the exact references.
              </p>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : ''}`}>
              {m.role === 'assistant' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user' ? 'bg-emerald-700 text-white' : 'bg-white text-stone-800 shadow-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.role === 'assistant' && m.providerWarning && (
                  <p className="mt-2 border-t border-stone-100 pt-2 text-xs text-amber-700">{m.providerWarning}</p>
                )}
                {m.role === 'assistant' && m.citations && m.citations.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-stone-100 pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">From your notes</p>
                    {m.citations.map((c, i) => (
                      <div key={i} className="rounded-lg bg-stone-50 px-3 py-2">
                        <p className="text-xs font-medium text-stone-700">
                          [{i + 1}] {c.title} — {c.subjectName} ({c.subjectCode}), Semester {c.semester}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs italic text-stone-500">"{c.snippet}..."</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {m.role === 'user' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-300 text-stone-600">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-stone-300" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 px-4 pb-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600 shadow-sm transition hover:border-emerald-400 hover:text-emerald-700"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="border-t border-stone-200 bg-white p-4"
        >
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a doubt, e.g. explain topic X from unit 2..."
              className="flex-1 rounded-full border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-800 placeholder-stone-400 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white transition hover:bg-emerald-800 disabled:opacity-40"
              aria-label="Send question"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
