import { useState } from 'react';
import { BookOpen, Search, SlidersHorizontal } from 'lucide-react';
import { downloadNote } from '@/lib/notes';
import NoteCard from '@/components/NoteCard';
import NoteFilters from '@/components/NoteFilters';

export default function NotesLibrary({ notes, onUploadClick }) {
  const [search, setSearch] = useState('');
  const [semester, setSemester] = useState('all');
  const [subjectCode, setSubjectCode] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  const subjects = Array.from(
    new Map(notes.map((n) => [n.subject_code, { code: n.subject_code, name: n.subject_name }])).values()
  ).sort((a, b) => a.code.localeCompare(b.code));

  const filtered = notes
    .filter((n) => {
      if (semester !== 'all' && n.semester !== semester) return false;
      if (subjectCode !== 'all' && n.subject_code !== subjectCode) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.subject_name.toLowerCase().includes(q) ||
          n.subject_code.toLowerCase().includes(q) ||
          (n.description ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) =>
      sortBy === 'recent'
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : b.download_count - a.download_count
    );

  const grouped = new Map();
  for (const n of filtered) {
    const list = grouped.get(n.semester) ?? [];
    list.push(n);
    grouped.set(n.semester, list);
  }
  const semesters = Array.from(grouped.keys()).sort((a, b) => a - b);

  return (
    <section id="library" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-3xl font-semibold text-stone-900">Notes Library</h2>
            <p className="mt-1 text-sm text-stone-500">
              {notes.length} {notes.length === 1 ? 'set of notes' : 'sets of notes'} shared by students and teachers
            </p>
          </div>
          <button
            onClick={onUploadClick}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800 hover:shadow md:hidden"
          >
            <BookOpen className="h-4 w-4" />
            Upload notes
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, subject, or code..."
              className="w-full rounded-full border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm text-stone-800 placeholder-stone-400 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <NoteFilters
            subjects={subjects}
            semester={semester}
            subjectCode={subjectCode}
            sortBy={sortBy}
            onSemester={setSemester}
            onSubject={setSubjectCode}
            onSort={setSortBy}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white/60 px-6 py-16 text-center">
          <SlidersHorizontal className="mx-auto h-8 w-8 text-stone-300" />
          <p className="mt-3 font-medium text-stone-700">No notes found</p>
          <p className="mt-1 text-sm text-stone-500">
            {notes.length === 0
              ? 'Be the first to share notes for your class.'
              : 'Try a different search, semester, or subject.'}
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {semesters.map((sem) => (
            <div key={sem}>
              <div className="mb-4 flex items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  Semester {sem}
                </span>
                <div className="h-px flex-1 bg-stone-200" />
                <span className="text-xs text-stone-400">
                  {grouped.get(sem).length} {grouped.get(sem).length === 1 ? 'subject set' : 'subject sets'}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {grouped.get(sem).map((note) => (
                  <NoteCard key={note.id} note={note} onDownload={() => downloadNote(note)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
