/**
 * Current schema version following semantic versioning.
 *
 * Schema version format: MAJOR.MINOR
 * - MAJOR: Incremented for breaking changes (incompatible schema structure changes)
 * - MINOR: Incremented for backward-compatible additions
 *
 * Version History:
 * - 1.0: Initial schema with UiBinding, UiEvent, UiLayout, UiNode, UiDocument
 */
export const SCHEMA_VERSION = '1.0';

/**
 * Generator version from package.json.
 * This tracks the qml-ng tool version that produced the schema/output.
 */
export interface VersionInfo {
  schemaVersion: string;
  generatorVersion: string;
  generatedAt: string;
}

export interface UiBinding {
  kind: 'literal' | 'expression';
  value?: string | number | boolean;
  expression?: string;
  dependencies: string[];
}

export interface UiEvent {
  name: string;
  angularEvent: string;
  handler: string;
}

export interface UiLayout {
  fillParent?: boolean;
  centerInParent?: boolean;
}

/**
 * Deprecation information for features that are being phased out.
 */
export interface DeprecationInfo {
  feature: string;
  reason: string;
  alternative?: string;
  removeInVersion?: string;
}

export interface UiNode {
  kind: 'container' | 'text' | 'input' | 'button' | 'image' | 'animation' | 'unknown';
  id?: string;
  name?: string;
  text?: UiBinding;
  placeholder?: UiBinding;
  source?: UiBinding;
  layout?: UiLayout;
  events: UiEvent[];
  children: UiNode[];
  meta?: Record<string, unknown>;
  /** Deprecation warnings for this node, if any */
  deprecations?: DeprecationInfo[];
}

export interface UiDocument {
  name: string;
  root: UiNode;
  diagnostics: string[];
  /** Version information for this document */
  version: VersionInfo;
  /** Document-level deprecations */
  deprecations?: DeprecationInfo[];
}
