/**
 * Semantic Lowering Passes
 *
 * This module implements a multi-pass semantic lowering architecture
 * for converting QML AST to Angular-compatible UI schema.
 *
 * The passes are organized into distinct responsibilities:
 *
 * 1. **Structural Normalization**: Classifies QML types, detects unsupported types
 * 2. **Binding Lowering**: Processes property bindings and expressions
 * 3. **Handler Lowering**: Maps QML event handlers to Angular events
 * 4. **Layout Lowering**: Processes layout and anchor properties
 * 5. **Control Mapping**: Maps QML controls to Angular Material equivalents
 * 6. **Diagnostics Enrichment**: Adds final validation and diagnostics
 *
 * Each pass:
 * - Takes a UiNode and PassContext as input
 * - Returns a transformed UiNode
 * - Can append diagnostics to the context
 * - Is independently testable
 *
 * Usage:
 * ```typescript
 * const pipeline = new PassPipeline()
 *   .add(new StructuralNormalizationPass())
 *   .add(new BindingLoweringPass())
 *   .add(new HandlerLoweringPass())
 *   .add(new LayoutLoweringPass())
 *   .add(new ControlMappingPass())
 *   .add(new DiagnosticsEnrichmentPass());
 *
 * const context: PassContext = { diagnostics: [], filePath: 'example.qml' };
 * const result = pipeline.execute(node, context);
 * ```
 */

export { LoweringPass, QmlPass, PassContext, PassPipeline } from './pass-interface';
export { StructuralNormalizationPass } from './structural-normalization';
export { BindingLoweringPass } from './binding-lowering';
export { HandlerLoweringPass } from './handler-lowering';
export { LayoutLoweringPass } from './layout-lowering';
export { ControlMappingPass } from './control-mapping';
export { DiagnosticsEnrichmentPass } from './diagnostics-enrichment';
