import { extractDependencies } from '../qml/expression-analysis';
import { ExpressionNode } from '../qml/expression-ast';
import { ExpressionParser } from '../qml/expression-parser';
import { UiDocument, UiEvent, UiNode, UiStateDeclaration } from '../schema/ui-schema';
import { DiagnosticsEmitter, ImportsResolver, NamingService, RenderContext, TypeScriptRenderer } from './renderer-contract';

const ALLOWED_HANDLER_CALLEE_PREFIXES = ['Math.'];
const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function isAllowedHandlerCallee(callee: string): boolean {
  return ALLOWED_HANDLER_CALLEE_PREFIXES.some(prefix => callee.startsWith(prefix));
}

function generateComponentMethodExpression(ast: ExpressionNode, declaredSignalNames: Set<string>): string {
  switch (ast.kind) {
    case 'literal':
      return JSON.stringify(ast.value);

    case 'identifier':
      return declaredSignalNames.has(ast.name) ? `this.${ast.name}()` : ast.name;

    case 'memberAccess':
      return `${generateComponentMethodExpression(ast.object, declaredSignalNames)}${ast.optional ? '?.' : '.'}${ast.property}`;

    case 'call':
      return `${generateComponentMethodExpression(ast.callee, declaredSignalNames)}(${ast.arguments
        .map(argument => generateComponentMethodExpression(argument, declaredSignalNames))
        .join(', ')})`;

    case 'unaryOp':
      return `${ast.operator}${generateComponentMethodExpression(ast.argument, declaredSignalNames)}`;

    case 'binaryOp':
      return `${generateComponentMethodExpression(ast.left, declaredSignalNames)} ${ast.operator} ${generateComponentMethodExpression(ast.right, declaredSignalNames)}`;

    case 'conditional':
      return `${generateComponentMethodExpression(ast.test, declaredSignalNames)} ? ${generateComponentMethodExpression(ast.consequent, declaredSignalNames)} : ${generateComponentMethodExpression(ast.alternate, declaredSignalNames)}`;

    case 'array':
      return `[${ast.elements.map(element => generateComponentMethodExpression(element, declaredSignalNames)).join(', ')}]`;
  }
}

function renderAssignmentMethod(event: UiEvent, context: RenderContext, diagnosticsEmitter: DiagnosticsEmitter): string {
  const model = event.handlerModel;
  if (model?.kind !== 'assignment' || !event.generatedMethod) {
    return '';
  }

  const targetIsSignal = IDENTIFIER_PATTERN.test(model.target) && context.declaredSignalNames.has(model.target);
  if (targetIsSignal) {
    const parser = new ExpressionParser();
    const result = parser.parse(model.value);
    if (result.ast && result.errors.length === 0) {
      const dependencyInfo = extractDependencies(result.ast);
      const hasUnverifiedIdentifiers = [...dependencyInfo.identifiers].some(identifier => !context.declaredSignalNames.has(identifier));
      const usesUnsupportedCallee = [...dependencyInfo.callees].some(callee => !isAllowedHandlerCallee(callee));
      if (!hasUnverifiedIdentifiers && !usesUnsupportedCallee) {
        const valueExpression = generateComponentMethodExpression(result.ast, context.declaredSignalNames);
        return [
          `  ${event.generatedMethod.name}(): void {`,
          `    this.${model.target}.set(${valueExpression});`,
          '  }'
        ].join('\n');
      }
    }
  }

  return [
    `  ${event.generatedMethod.name}(): void {`,
    `    ${diagnosticsEmitter.renderHandlerComment(event.handler)}`,
    '  }'
  ].join('\n');
}

function collectStateDeclarations(root: UiNode): UiStateDeclaration[] {
  const seen = new Set<string>();
  const result: UiStateDeclaration[] = [];

  function visit(node: UiNode): void {
    for (const declaration of node.stateDeclarations ?? []) {
      if (!seen.has(declaration.name)) {
        seen.add(declaration.name);
        result.push(declaration);
      }
    }
    node.children.forEach(visit);
  }

  visit(root);
  return result;
}

function stateDeclarationToTs(declaration: UiStateDeclaration): string {
  return `readonly ${declaration.name} = signal<${declaration.tsType}>(${declaration.initialValue});`;
}

export class AngularTypeScriptRenderer implements TypeScriptRenderer {
  constructor(
    private readonly importsResolver: ImportsResolver,
    private readonly namingService: NamingService,
    private readonly diagnosticsEmitter: DiagnosticsEmitter
  ) {}

  collectStateDeclarations(root: UiNode): UiStateDeclaration[] {
    return collectStateDeclarations(root);
  }

  render(doc: UiDocument, className: string, context: RenderContext, stateDeclarations: UiStateDeclaration[]): string {
    const typedSignalLines = stateDeclarations
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(stateDeclarationToTs);

    const fallbackSignalLines = [...context.dependencyNames]
      .filter(dependency => !context.declaredSignalNames.has(dependency))
      .sort()
      .map(dependency => `readonly ${dependency} = signal<any>(null);`);

    const generatedMethods = context.requiredGeneratedMethods
      .map(event => renderAssignmentMethod(event, context, this.diagnosticsEmitter))
      .filter(Boolean);

    const needsSignal = typedSignalLines.length > 0 || fallbackSignalLines.length > 0;
    const needsComputed = context.computedDeclarations.length > 0;
    const ngImports = [
      'Component',
      ...(needsComputed ? ['computed'] : []),
      ...(needsSignal ? ['signal'] : [])
    ].sort((left, right) => left.localeCompare(right));
    const componentImports = this.importsResolver.collectComponentImports(doc.root);
    const renderedImportStatements = this.importsResolver.renderImportStatements(componentImports).join('\n');

    return [
      // Angular core imports stay local to the TypeScript renderer because they are
      // driven by emitted class features (`computed`, `signal`) rather than node-kind mappings.
      // Material imports still flow through ImportsResolver because they depend on rendered controls.
      `import { ${ngImports.join(', ')} } from '@angular/core';`,
      renderedImportStatements,
      '',
      '@Component({',
      `  selector: '${this.namingService.componentSelector(doc)}',`,
      '  standalone: true,',
      `  imports: [${componentImports.join(', ')}],`,
      `  templateUrl: '${this.namingService.templateUrl(doc)}',`,
      `  styleUrl: '${this.namingService.styleUrl(doc)}'`,
      '})',
      `export class ${className} {`,
      ...typedSignalLines.map(line => `  ${line}`),
      ...fallbackSignalLines.map(line => `  ${line}`),
      ...context.computedDeclarations.map(line => `  ${line}`),
      ...generatedMethods,
      '}',
      ''
    ].join('\n');
  }
}
