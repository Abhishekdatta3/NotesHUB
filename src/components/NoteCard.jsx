import { useState } from 'react';
import { Download, FileText, User } from 'lucide-react';
import { formatFileSize, formatDate } from '@/lib/notes';

export default function NoteCard({ note, onDownload }) {
  const [downloading, setDownloading] = useState(false);
  const [count, setCount] = useState(note.download_count);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await onDownload();
      setCount((c) => c + 1);
    } catch {
      // the download link still opens in a new tab; count is best-effort
    } finally {
      setDownloading(false);
    }
  };

  return (
    <article className="group flex flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-100">
          <FileText className="h-5 w-5" />
        </div>
        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-stone-500">
          {note.subject_code}
        </span>
      </div>

      <h3 className="mt-3 font-serif text-lg font-semibold leading-snug text-stone-900">{note.title}</h3>
      <p className="mt-0.5 text-sm text-stone-500">{note.subject_name}</p>
      {note.description && (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stone-600">{note.description}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-400">
        <span className="inline-flex items-center gap-1">
          <User className="h-3 w-3" />
          {note.uploaded_by}
        </span>
        <span>{formatFileSize(note.file_size)}</span>
        <span>{formatDate(note.created_at)}</span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4">
        <span className="text-xs text-stone-400">{count} downloads</span>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          <Download className="h-3.5 w-3.5" />
          {downloading ? 'Opening...' : 'Download'}
        </button>
      </div>
    </article>
  );
}
