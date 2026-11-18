const TEXT_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'text/html',
]);

export function isTextLike(file) {
  if (TEXT_TYPES.has(file.type)) return true;
  return /\.(txt|md|csv|json|html?)$/i.test(file.name);
}

export function isPdf(file) {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

export function isImage(file) {
  return file.type.startsWith('image/');
}

function cleanText(text) {
  return text
    .replace(/\0/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Lightweight PDF text extraction: pulls string literals used by PDF text
// operators. Works for most digitally-generated PDFs; scanned PDFs yield
// little or no text (same as OCR-free handling of images).
async function extractPdfText(file) {
  const buffer = await file.arrayBuffer();
  const raw = new TextDecoder('latin1').decode(buffer);
  const parts = [];
  const re = /\(((?:\\.|[^\\()])*)\)/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    const s = m[1]
      .replace(/\\([nrt()\\])/g, (_all, c) =>
        c === 'n' ? '\n' : c === 'r' ? '' : c === 't' ? '\t' : c
      )
      .replace(/\\[0-7]{1,3}/g, ' ');
    if (/[A-Za-z]{3,}/.test(s)) parts.push(s);
  }
  return parts.join(' ');
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '\n');
}

export async function extractText(file) {
  try {
    if (isTextLike(file)) {
      const raw = await file.text();
      const text = file.type === 'text/html' || /\.html?$/i.test(file.name) ? stripHtml(raw) : raw;
      return cleanText(text);
    }
    if (isPdf(file)) {
      return cleanText(await extractPdfText(file));
    }
  } catch {
    return '';
  }
  return '';
}
