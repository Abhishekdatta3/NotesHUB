import { useRef, useState } from 'react';
import { X, UploadCloud, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { extractText, isPdf, isTextLike } from '@/lib/extract';
import { fileToSafeName } from '@/lib/notes';

const MAX_SIZE = 50 * 1024 * 1024;

const inputClass =
  'w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 placeholder-stone-400 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-500">{label}</span>
      {children}
    </label>
  );
}

function Notice({ tone, icon, children }) {
  const styles = {
    info: 'bg-stone-50 text-stone-600 border-stone-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    error: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm ${styles[tone]}`}>
      {icon}
      <span>{children}</span>
    </div>
  );
}

export default function UploadModal({ open, onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [semester, setSemester] = useState('');
  const [description, setDescription] = useState('');
  const [uploadedBy, setUploadedBy] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef(null);

  if (!open) return null;

  const reset = () => {
    setFile(null);
    setTitle('');
    setSubjectName('');
    setSubjectCode('');
    setSemester('');
    setDescription('');
    setUploadedBy('');
    setStatus('idle');
    setError(null);
  };

  const pickFile = (f) => {
    if (!f) return;
    if (f.size > MAX_SIZE) {
      setError('That file is larger than 50 MB. Please pick a smaller file.');
      return;
    }
    setError(null);
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
  };

  const canSubmit = file && title.trim() && subjectName.trim() && subjectCode.trim() && semester && status !== 'reading' && status !== 'uploading';

  const submit = async (e) => {
    e.preventDefault();
    if (!file || !canSubmit) return;
    setError(null);

    try {
      setStatus('reading');
      const text = isTextLike(file) || isPdf(file) ? await extractText(file) : '';

      setStatus('uploading');
      const path = `${Date.now()}-${fileToSafeName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from('notes-files')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw new Error('Uploading the file failed. Please try again.');

      const { data, error: insertError } = await supabase
        .from('notes')
        .insert({
          title: title.trim(),
          subject_name: subjectName.trim(),
          subject_code: subjectCode.trim().toUpperCase(),
          semester: Number(semester),
          description: description.trim() || null,
          uploaded_by: uploadedBy.trim() || 'Anonymous',
          file_path: path,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type || 'application/octet-stream',
          extracted_text: text || null,
        })
        .select()
        .single();
      if (insertError || !data) {
        await supabase.storage.from('notes-files').remove([path]);
        throw new Error('Saving the note failed. Please try again.');
      }

      setStatus('done');
      onUploaded(data);
      setTimeout(() => {
        reset();
        onClose();
      }, 1200);
    } catch (err) {
      setStatus('idle');
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  const readingOrUploading = status === 'reading' || status === 'uploading';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-serif text-xl font-semibold text-stone-900">Share your notes</h3>
            <p className="mt-1 text-sm text-stone-500">Add the details below so others can find them easily.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0]); }}
            onClick={() => fileInput.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
              dragging ? 'border-emerald-500 bg-emerald-50' : 'border-stone-300 bg-stone-50 hover:border-emerald-400 hover:bg-emerald-50/50'
            }`}
          >
            <input
              ref={fileInput}
              type="file"
              className="hidden"
              accept=".pdf,.txt,.md,.csv,.json,.html,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.ppt,.pptx"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            {file ? (
              <div className="flex items-center justify-center gap-3 text-left">
                <FileText className="h-8 w-8 shrink-0 text-emerald-600" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-stone-800">{file.name}</p>
                  <p className="text-xs text-stone-500">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
              </div>
            ) : (
              <>
                <UploadCloud className="mx-auto h-8 w-8 text-stone-400" />
                <p className="mt-2 text-sm font-medium text-stone-700">Tap to choose a file or drag it here</p>
                <p className="mt-1 text-xs text-stone-400">PDF, notes, photos of handwriting, slides — up to 50 MB</p>
              </>
            )}
          </div>

          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Unit 3 — Deadlocks, full class notes"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Subject name">
              <input
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                required
                placeholder="e.g. Operating Systems"
                className={inputClass}
              />
            </Field>
            <Field label="Subject code">
              <input
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                required
                placeholder="e.g. CS303"
                className={`${inputClass} uppercase`}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Semester">
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                required
                className={inputClass}
              >
                <option value="" disabled>
                  Select semester
                </option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Your name (optional)">
              <input
                value={uploadedBy}
                onChange={(e) => setUploadedBy(e.target.value)}
                placeholder="e.g. Priya, teacher"
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Description (optional)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What do these notes cover?"
              className={`${inputClass} resize-none`}
            />
          </Field>

          {status === 'reading' && (
            <Notice tone="info" icon={<Loader2 className="h-4 w-4 animate-spin" />}>
              Reading your file so the AI tutor can answer questions from it...
            </Notice>
          )}
          {status === 'uploading' && (
            <Notice tone="info" icon={<Loader2 className="h-4 w-4 animate-spin" />}>
              Uploading your notes...
            </Notice>
          )}
          {status === 'done' && (
            <Notice tone="success" icon={<CheckCircle2 className="h-4 w-4" />}>
              Notes uploaded. Thank you for sharing!
            </Notice>
          )}
          {error && (
            <Notice tone="error" icon={<AlertCircle className="h-4 w-4" />}>
              {error}
            </Notice>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-full bg-emerald-700 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {readingOrUploading ? 'Working...' : 'Upload notes'}
          </button>
        </form>
      </div>
    </div>
  );
}
