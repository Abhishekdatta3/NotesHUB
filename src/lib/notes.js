import { supabase } from './supabase';

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function fileToSafeName(name) {
  const dot = name.lastIndexOf('.');
  const base = dot > -1 ? name.slice(0, dot) : name;
  const ext = dot > -1 ? name.slice(dot).toLowerCase() : '';
  const safe = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${safe || 'notes'}${ext || ''}`;
}

export async function downloadNote(note) {
  const { data } = supabase.storage.from('notes-files').getPublicUrl(note.file_path);
  if (!data?.publicUrl) {
    throw new Error('Could not get the file link.');
  }
  await supabase
    .from('notes')
    .update({ download_count: note.download_count + 1 })
    .eq('id', note.id);
  window.open(data.publicUrl, '_blank', 'noopener');
}
