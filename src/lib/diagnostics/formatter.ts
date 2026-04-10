import { UiDiagnostic } from '../schema/ui-schema';

export interface DiagnosticFormatterOptions {
  verbose?: boolean;
  colors?: boolean;
}

/**
 * Format a single diagnostic message for console output
 */
export function formatDiagnostic(diagnostic: UiDiagnostic, options: DiagnosticFormatterOptions = {}): string {
  const parts: string[] = [];

  // Add file location if available
  if (diagnostic.file) {
    parts.push(diagnostic.file);
    if (diagnostic.line !== undefined) {
      parts.push(`:${diagnostic.line}`);
      if (diagnostic.column !== undefined) {
        parts.push(`:${diagnostic.column}`);
      }
    }
    parts.push(' - ');
  }

  // Add severity
  const severityLabel = diagnostic.severity.toUpperCase();
  parts.push(`${severityLabel}: `);

  // Add message
  parts.push(diagnostic.message);

  return parts.join('');
}

/**
 * Format all diagnostics with summary
 */
export function formatDiagnostics(diagnostics: UiDiagnostic[], options: DiagnosticFormatterOptions = {}): string {
  if (diagnostics.length === 0) {
    return 'No diagnostics';
  }

  const lines: string[] = [];

  // Group by severity
  const errors = diagnostics.filter(d => d.severity === 'error');
  const warnings = diagnostics.filter(d => d.severity === 'warning');
  const infos = diagnostics.filter(d => d.severity === 'info');

  // Format each diagnostic
  diagnostics.forEach(diagnostic => {
    lines.push(formatDiagnostic(diagnostic, options));
  });

  // Add summary
  lines.push('');
  const summary: string[] = [];
  if (errors.length > 0) summary.push(`${errors.length} error(s)`);
  if (warnings.length > 0) summary.push(`${warnings.length} warning(s)`);
  if (infos.length > 0) summary.push(`${infos.length} info(s)`);
  lines.push(`Summary: ${summary.join(', ')}`);

  return lines.join('\n');
}

/**
 * Aggregate diagnostics from multiple files
 */
export function aggregateDiagnostics(
  diagnosticsByFile: Map<string, UiDiagnostic[]>
): { total: number; errors: number; warnings: number; infos: number; byFile: Map<string, UiDiagnostic[]> } {
  let total = 0;
  let errors = 0;
  let warnings = 0;
  let infos = 0;

  for (const diagnostics of diagnosticsByFile.values()) {
    total += diagnostics.length;
    errors += diagnostics.filter(d => d.severity === 'error').length;
    warnings += diagnostics.filter(d => d.severity === 'warning').length;
    infos += diagnostics.filter(d => d.severity === 'info').length;
  }

  return { total, errors, warnings, infos, byFile: diagnosticsByFile };
}
