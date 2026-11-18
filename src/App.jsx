import { useEffect, useState } from 'react';
import { Bot, CloudUpload, GraduationCap, Hand, Library, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import NotesLibrary from '@/components/NotesLibrary';
import UploadModal from '@/components/UploadModal';
import AiTutorDrawer from '@/components/AiTutorDrawer';

export default function App() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);

  const loadNotes = async () => {
    setLoadError(null);
    const { data, error } = await supabase
      .from('notes')
      .select('id, title, subject_name, subject_code, semester, description, uploaded_by, file_path, file_name, file_size, file_type, download_count, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) {
      setLoadError('Could not load the notes library. Please refresh the page.');
    } else {
      setNotes(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadNotes();
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-stone-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-serif text-xl font-semibold tracking-tight text-stone-900">NotesHub</span>
          </div>
          <nav className="flex items-center gap-2">
            <a
              href="#library"
              className="hidden items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-200/60 hover:text-stone-900 sm:inline-flex"
            >
              <Library className="h-4 w-4" />
              Library
            </a>
            <button
              onClick={() => setTutorOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:border-emerald-500 hover:text-emerald-700"
            >
              <Bot className="h-4 w-4" />
              Ask AI Tutor
            </button>
            <button
              onClick={() => setUploadOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800"
            >
              <CloudUpload className="h-4 w-4" />
              Upload
            </button>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-stone-200 bg-white">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 15% 20%, rgba(2, 122, 86, 0.08) 0, transparent 40%), radial-gradient(circle at 85% 10%, rgba(180, 130, 60, 0.08) 0, transparent 45%)',
            }}
          />
          <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
                <Sparkles className="h-3.5 w-3.5" />
                For students and teachers
              </span>
              <h1 className="mt-5 font-serif text-4xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-5xl">
                Every subject, every semester — one shared shelf of notes.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-stone-600 sm:text-lg">
                Upload your notes with the subject name, code, and semester — then download anyone else's in a click.
                Stuck on a topic? Ask the AI tutor, which reads the notes (even photos of handwriting) and explains them back to you.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={() => setUploadOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-700"
                >
                  <CloudUpload className="h-4 w-4" />
                  Upload notes
                </button>
                <button
                  onClick={() => setTutorOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-800 shadow-sm transition hover:border-emerald-500 hover:text-emerald-700"
                >
                  <Bot className="h-4 w-4" />
                  Solve a doubt with AI
                </button>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-stone-500">
                <span className="inline-flex items-center gap-2">
                  <Hand className="h-4 w-4 text-emerald-700" />
                  Handwriting-friendly
                </span>
                <span className="inline-flex items-center gap-2">
                  <Library className="h-4 w-4 text-emerald-700" />
                  Organized by semester
                </span>
                <span className="inline-flex items-center gap-2">
                  <Bot className="h-4 w-4 text-emerald-700" />
                  Doubt solving with RAG
                </span>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="mx-auto max-w-6xl px-4 py-24 text-center text-stone-500 sm:px-6">Loading the library...</div>
        ) : loadError ? (
          <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
            <p className="text-stone-700">{loadError}</p>
            <button onClick={loadNotes} className="mt-4 rounded-full bg-stone-900 px-5 py-2 text-sm text-white hover:bg-stone-700">
              Try again
            </button>
          </div>
        ) : (
          <NotesLibrary notes={notes} onUploadClick={() => setUploadOpen(true)} />
        )}
      </main>

      <footer className="border-t border-stone-200 bg-white py-8 text-center text-sm text-stone-400">
        NotesHub — share notes, learn together.
      </footer>

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={(note) => setNotes((n) => [note, ...n])} />
      <AiTutorDrawer open={tutorOpen} onClose={() => setTutorOpen(false)} />
    </div>
  );
}
