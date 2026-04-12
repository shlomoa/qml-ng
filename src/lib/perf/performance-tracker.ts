/**
 * Performance tracking utilities for measuring timing and memory usage
 * during QML-to-Angular conversion pipeline stages.
 */

export interface StageMetrics {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryBefore?: number;
  memoryAfter?: number;
  memoryDelta?: number;
}

export interface ConversionMetrics {
  totalDuration: number;
  stages: StageMetrics[];
  peakMemory: number;
  fileCount: number;
}

export class PerformanceTracker {
  private stages: StageMetrics[] = [];
  private currentStage: StageMetrics | null = null;
  private startMemory: number = 0;

  constructor() {
    this.startMemory = this.getMemoryUsage();
  }

  /**
   * Start tracking a new stage of the conversion pipeline
   */
  startStage(name: string): void {
    if (this.currentStage && !this.currentStage.endTime) {
      this.endStage();
    }

    this.currentStage = {
      name,
      startTime: performance.now(),
      memoryBefore: this.getMemoryUsage(),
    };
  }

  /**
   * End the current stage and record metrics
   */
  endStage(): void {
    if (!this.currentStage) {
      return;
    }

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();

    this.currentStage.endTime = endTime;
    this.currentStage.duration = endTime - this.currentStage.startTime;
    this.currentStage.memoryAfter = memoryAfter;
    this.currentStage.memoryDelta = memoryAfter - (this.currentStage.memoryBefore || 0);

    this.stages.push(this.currentStage);
    this.currentStage = null;
  }

  /**
   * Get all recorded stage metrics
   */
  getStages(): StageMetrics[] {
    return this.stages;
  }

  /**
   * Get total duration across all stages
   */
  getTotalDuration(): number {
    return this.stages.reduce((sum, stage) => sum + (stage.duration || 0), 0);
  }

  /**
   * Get peak memory usage across all stages
   */
  getPeakMemory(): number {
    const memories = this.stages
      .map(s => s.memoryAfter || 0)
      .filter(m => m > 0);
    return memories.length > 0 ? Math.max(...memories) : 0;
  }

  /**
   * Get current memory usage in MB
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024;
    }
    return 0;
  }

  /**
   * Generate a summary report of all metrics
   */
  generateReport(fileCount: number = 1): ConversionMetrics {
    return {
      totalDuration: this.getTotalDuration(),
      stages: this.stages,
      peakMemory: this.getPeakMemory(),
      fileCount,
    };
  }

  /**
   * Format metrics for human-readable output
   */
  static formatReport(metrics: ConversionMetrics): string {
    const lines: string[] = [];

    lines.push('=== Performance Metrics ===');
    lines.push(`Files processed: ${metrics.fileCount}`);
    lines.push(`Total duration: ${metrics.totalDuration.toFixed(2)}ms`);
    lines.push(`Peak memory: ${metrics.peakMemory.toFixed(2)}MB`);
    lines.push('');
    lines.push('Stage breakdown:');

    for (const stage of metrics.stages) {
      lines.push(`  ${stage.name}:`);
      lines.push(`    Duration: ${(stage.duration || 0).toFixed(2)}ms`);
      if (stage.memoryDelta !== undefined) {
        const sign = stage.memoryDelta >= 0 ? '+' : '';
        lines.push(`    Memory delta: ${sign}${stage.memoryDelta.toFixed(2)}MB`);
      }
    }

    if (metrics.fileCount > 1) {
      lines.push('');
      lines.push('Averages per file:');
      lines.push(`  Duration: ${(metrics.totalDuration / metrics.fileCount).toFixed(2)}ms`);
    }

    return lines.join('\n');
  }
}
