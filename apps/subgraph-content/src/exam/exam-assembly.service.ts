/**
 * ExamAssemblyService — Selects items from the item bank per blueprint constraints
 *
 * Assembly algorithm:
 * 1. Load blueprint with domain/bloom distributions and difficulty range
 * 2. Load eligible items (CALIBRATED + PILOT, not RETIRED, not DIF-flagged)
 * 3. Stratified sampling per domain weight × totalQuestions
 * 4. Within each domain: apply bloom distribution and difficulty range filters
 * 5. Fisher-Yates shuffle for final ordering
 * 6. Generate per-item option shuffle seeds
 */
import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import type { ExamItem } from '@edusphere/db';
import { randomInt } from 'crypto';
import { ExamItemService } from './exam-item.service';
import { ExamBlueprintService } from './exam-blueprint.service';

export interface AssemblyResult {
  questionOrder: string[];
  optionShuffleSeeds: Record<string, number>;
}

export interface ValidationResult {
  valid: boolean;
  issues: string[];
}

interface DomainDist {
  [domain: string]: number;
}

interface BloomDist {
  [level: string]: number;
}

interface DifficultyRange {
  min: number;
  max: number;
}

@Injectable()
export class ExamAssemblyService implements OnModuleDestroy {
  private readonly logger = new Logger(ExamAssemblyService.name);

  constructor(
    private readonly itemService: ExamItemService,
    private readonly blueprintService: ExamBlueprintService
  ) {}

  async onModuleDestroy(): Promise<void> {
    // No DB connection owned by this service — cleanup delegated to ExamDeliveryService
    this.logger.log('ExamAssemblyService destroyed');
  }

  async assembleExam(
    blueprintId: string,
    userId: string,
    tenantId: string
  ): Promise<AssemblyResult> {
    const blueprint = await this.blueprintService.getBlueprint(
      blueprintId,
      tenantId,
      userId,
      'INSTRUCTOR'
    );

    const allItems = await this.itemService.getAssemblableItems(
      blueprint.courseId,
      tenantId,
      userId
    );

    const eligible = allItems.filter(
      (i) =>
        i.calibrationStatus === 'CALIBRATED' ||
        i.calibrationStatus === 'PILOT'
    );

    const domainDist = (blueprint.domainDistribution ?? {}) as DomainDist;
    const bloomDist = (blueprint.bloomDistribution ?? {}) as BloomDist;
    const diffRange = (blueprint.difficultyRange ?? null) as DifficultyRange | null;

    const selected = this.stratifiedSample(
      eligible,
      blueprint.totalQuestions,
      domainDist,
      bloomDist,
      diffRange
    );

    if (selected.length !== blueprint.totalQuestions) {
      throw new BadRequestException(
        `Assembly selected ${selected.length} items but blueprint requires ${blueprint.totalQuestions}`
      );
    }

    const shuffled = this.fisherYatesShuffle([...selected]);
    const questionOrder = shuffled.map((item) => item.id);
    const optionShuffleSeeds: Record<string, number> = {};
    for (const id of questionOrder) {
      optionShuffleSeeds[id] = randomInt(1, 2147483647);
    }

    this.logger.log(
      { blueprintId, tenantId, itemCount: questionOrder.length },
      'Exam assembled successfully'
    );

    return { questionOrder, optionShuffleSeeds };
  }

  async validateBlueprintCanAssemble(
    blueprintId: string,
    tenantId: string,
    userId: string
  ): Promise<ValidationResult> {
    const blueprint = await this.blueprintService.getBlueprint(
      blueprintId,
      tenantId,
      userId,
      'INSTRUCTOR'
    );

    const allItems = await this.itemService.getAssemblableItems(
      blueprint.courseId,
      tenantId,
      userId
    );

    const eligible = allItems.filter(
      (i) =>
        i.calibrationStatus === 'CALIBRATED' ||
        i.calibrationStatus === 'PILOT'
    );

    const issues: string[] = [];
    const domainDist = (blueprint.domainDistribution ?? {}) as DomainDist;

    if (eligible.length < blueprint.totalQuestions) {
      issues.push(
        `Need ${blueprint.totalQuestions} items but only ${eligible.length} eligible`
      );
    }

    for (const [domain, weight] of Object.entries(domainDist)) {
      const needed = Math.round((weight / 100) * blueprint.totalQuestions);
      const available = eligible.filter((i) => i.domainTag === domain).length;
      if (available < needed) {
        issues.push(
          `Domain "${domain}": need ${needed} items, have ${available}`
        );
      }
    }

    return { valid: issues.length === 0, issues };
  }

  private stratifiedSample(
    items: ExamItem[],
    total: number,
    domainDist: DomainDist,
    bloomDist: BloomDist,
    diffRange: DifficultyRange | null
  ): ExamItem[] {
    const selected: ExamItem[] = [];
    const used = new Set<string>();

    let filtered = items;
    if (diffRange) {
      filtered = items.filter(
        (i) => i.irtB >= diffRange.min && i.irtB <= diffRange.max
      );
    }

    for (const [domain, weight] of Object.entries(domainDist)) {
      const needed = Math.round((weight / 100) * total);
      const domainItems = filtered.filter(
        (i) => i.domainTag === domain && !used.has(i.id)
      );
      const picked = this.pickWithBloomDist(domainItems, needed, bloomDist);
      for (const item of picked) {
        selected.push(item);
        used.add(item.id);
      }
    }

    // Fill remaining slots if rounding left gaps
    if (selected.length < total) {
      const remaining = filtered.filter((i) => !used.has(i.id));
      const shuffledRemaining = this.fisherYatesShuffle([...remaining]);
      for (const item of shuffledRemaining) {
        if (selected.length >= total) break;
        selected.push(item);
        used.add(item.id);
      }
    }

    return selected.slice(0, total);
  }

  private pickWithBloomDist(
    items: ExamItem[],
    needed: number,
    bloomDist: BloomDist
  ): ExamItem[] {
    const picked: ExamItem[] = [];
    const used = new Set<string>();

    for (const [level, weight] of Object.entries(bloomDist)) {
      const bloomNeeded = Math.round((weight / 100) * needed);
      const bloomItems = items.filter(
        (i) => i.bloomLevel === level && !used.has(i.id)
      );
      const shuffled = this.fisherYatesShuffle([...bloomItems]);
      for (let j = 0; j < bloomNeeded && j < shuffled.length; j++) {
        picked.push(shuffled[j]!);
        used.add(shuffled[j]!.id);
      }
    }

    // Fill remaining from unassigned items
    if (picked.length < needed) {
      const remaining = items.filter((i) => !used.has(i.id));
      const shuffled = this.fisherYatesShuffle([...remaining]);
      for (const item of shuffled) {
        if (picked.length >= needed) break;
        picked.push(item);
      }
    }

    return picked.slice(0, needed);
  }

  private fisherYatesShuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randomInt(0, i + 1);
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr;
  }
}
