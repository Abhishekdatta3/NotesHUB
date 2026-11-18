// Runtime validation coverage for text and image file classification.
import { describe, expect, it } from 'vitest';
import { isImage, isPdf, isTextLike } from './extract';

describe('file classification', () => {
  it('recognizes text files by MIME type and extension', () => {
    expect(isTextLike({ type: 'text/plain', name: 'lecture.txt' })).toBe(true);
    expect(isTextLike({ type: 'application/octet-stream', name: 'notes.md' })).toBe(true);
  });

  it('recognizes PDFs and images', () => {
    expect(isPdf({ type: 'application/pdf', name: 'chapter.pdf' })).toBe(true);
    expect(isImage({ type: 'image/png', name: 'handwriting.png' })).toBe(true);
  });
});
