import { UiDiagnostic } from '../schema/ui-schema';

export interface DiagnosticCounts {
  error: number;
  warning: number;
  info: number;
}

export function countDiagnosticsBySeverity(diagnostics: UiDiagnostic[]): DiagnosticCounts {
  return diagnostics.reduce<DiagnosticCounts>(
    (counts, diagnostic) => {
      counts[diagnostic.severity] += 1;
      return counts;
    },
    { error: 0, warning: 0, info: 0 }
  );
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatDiagnosticCounts(counts: DiagnosticCounts): string {
  const parts: string[] = [];
  if (counts.error > 0) parts.push(pluralize(counts.error, 'error'));
  if (counts.warning > 0) parts.push(pluralize(counts.warning, 'warning'));
  if (counts.info > 0) parts.push(pluralize(counts.info, 'info'));
  return parts.join(', ') || '0 diagnostics';
}

function formatDiagnosticLocation(diagnostic: UiDiagnostic): string {
  const file = diagnostic.file ?? '<unknown>';
  const start = diagnostic.location?.start;
  if (!start) {
    return file;
  }
  return `${file}:${start.line}:${start.column}`;
}

export function formatDiagnostic(diagnostic: UiDiagnostic): string {
  const parts = [
    formatDiagnosticLocation(diagnostic),
    diagnostic.severity.toUpperCase(),
    diagnostic.category.toUpperCase()
  ];

  if (diagnostic.code) {
    parts.push(diagnostic.code);
  }

  return `${parts.join(' ')} ${diagnostic.message}`;
}

export function formatDiagnostics(diagnostics: UiDiagnostic[]): string[] {
  return diagnostics.map(formatDiagnostic);
}

export function hasStrictModeViolations(diagnostics: UiDiagnostic[]): boolean {
  return diagnostics.some(diagnostic =>
    diagnostic.severity === 'error' || diagnostic.category === 'unsupported'
  );
}
