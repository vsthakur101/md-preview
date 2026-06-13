/**
 * Whole-library JSON backup. A pure serializer (so it's unit-testable) that
 * normalizes each file to the portable fields and orders newest-first. The
 * shape is versioned so a future import can detect the format.
 */
export interface ExportFileInput {
  title: string;
  content: string;
  tags?: string[];
  createdAt: string; // ISO
}

export interface ExportFile {
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
}

export interface LibraryExport {
  version: number;
  exportedAt: string;
  count: number;
  files: ExportFile[];
}

export const LIBRARY_EXPORT_VERSION = 1;

export function buildLibraryExport(files: ExportFileInput[], now: Date): LibraryExport {
  const mapped: ExportFile[] = files
    .map((f) => ({
      title: f.title,
      content: f.content,
      tags: f.tags ?? [],
      createdAt: f.createdAt,
    }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));

  return {
    version: LIBRARY_EXPORT_VERSION,
    exportedAt: now.toISOString(),
    count: mapped.length,
    files: mapped,
  };
}
