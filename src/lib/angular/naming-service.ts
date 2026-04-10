import { NamingService } from './renderer-contract';

/**
 * Default implementation of naming conventions for Angular components
 * Follows Angular style guide conventions
 */
export class DefaultNamingService implements NamingService {
  generateComputedName(prefix: string, counter: number): string {
    return `${prefix}Expr${counter}`;
  }

  generateClassName(componentName: string): string {
    // Convert kebab-case or snake_case to PascalCase
    // e.g., "login-form" -> "LoginFormComponent"
    const pascal = componentName
      .split(/[-_]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('');
    return `${pascal}Component`;
  }

  generateSelector(componentName: string): string {
    // Convert to kebab-case and prefix with 'app-'
    // e.g., "LoginForm" -> "app-login-form"
    const kebab = componentName
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase();
    return `app-${kebab}`;
  }
}
