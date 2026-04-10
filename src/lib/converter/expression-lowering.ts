import { UiBinding } from '../schema/ui-schema';

export interface LoweredExpression {
  binding: UiBinding;
  angularExpression: string;
}

function extractDependencies(expression: string): string[] {
  const matches = expression.match(/[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*/g) ?? [];
  const blacklist = new Set(['true', 'false', 'null', 'undefined', 'parent']);
  const roots = matches
    .map(m => m.split('.')[0])
    .filter(m => !blacklist.has(m));
  return [...new Set(roots)];
}

function rewriteForSignals(expression: string, dependencies: string[]): string {
  let rewritten = expression;
  for (const dep of dependencies) {
    const exact = new RegExp(`\\b${dep}\\b`, 'g');
    rewritten = rewritten.replace(exact, `${dep}()`);
  }
  rewritten = rewritten.replace(/\?\.()/g, '?.');
  return rewritten;
}

export function lowerBinding(raw: string | number | boolean): LoweredExpression {
  if (typeof raw !== 'string') {
    return {
      binding: { kind: 'literal', value: raw, dependencies: [] },
      angularExpression: JSON.stringify(raw)
    };
  }

  const trimmed = raw.trim();
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));

  if (quoted) {
    const unquoted = trimmed.slice(1, -1);
    return {
      binding: { kind: 'literal', value: unquoted, dependencies: [] },
      angularExpression: JSON.stringify(unquoted)
    };
  }

  const isSimpleLiteral = /^[A-Za-z0-9 _-]+$/.test(trimmed) && !/[.()+\-/*]/.test(trimmed);
  if (isSimpleLiteral) {
    return {
      binding: { kind: 'literal', value: trimmed, dependencies: [] },
      angularExpression: JSON.stringify(trimmed)
    };
  }

  const dependencies = extractDependencies(trimmed);
  return {
    binding: {
      kind: 'expression',
      expression: trimmed,
      dependencies
    },
    angularExpression: rewriteForSignals(trimmed, dependencies)
  };
}
