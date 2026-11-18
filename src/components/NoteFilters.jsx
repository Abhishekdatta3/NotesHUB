const selectClass =
  'rounded-full border border-stone-200 bg-white py-2.5 pl-4 pr-8 text-sm text-stone-700 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100';

export default function NoteFilters({ subjects, semester, subjectCode, sortBy, onSemester, onSubject, onSort }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={semester}
        onChange={(e) => onSemester(e.target.value === 'all' ? 'all' : Number(e.target.value))}
        className={selectClass}
        aria-label="Filter by semester"
      >
        <option value="all">All semesters</option>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
          <option key={s} value={s}>
            Semester {s}
          </option>
        ))}
      </select>

      <select
        value={subjectCode}
        onChange={(e) => onSubject(e.target.value)}
        className={selectClass}
        aria-label="Filter by subject"
      >
        <option value="all">All subjects</option>
        {subjects.map((s) => (
          <option key={s.code} value={s.code}>
            {s.code} — {s.name}
          </option>
        ))}
      </select>

      <select
        value={sortBy}
        onChange={(e) => onSort(e.target.value)}
        className={selectClass}
        aria-label="Sort notes"
      >
        <option value="recent">Newest first</option>
        <option value="popular">Most downloaded</option>
      </select>
    </div>
  );
}
