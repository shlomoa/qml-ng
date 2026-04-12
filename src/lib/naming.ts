export function pascalCase(name: string): string {
  const parts = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return 'QmlComponent';
  }

  return parts
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join('');
}

export function dasherize(name: string): string {
  const dashed = name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return dashed || 'qml-component';
}

export function componentClassName(name: string): string {
  return `${pascalCase(name)}Component`;
}
