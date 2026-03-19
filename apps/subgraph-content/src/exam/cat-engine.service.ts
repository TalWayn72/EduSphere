/**
 * CatEngineService — Computer Adaptive Testing engine.
 *
 * Item selection via Maximum Fisher Information (MFI) with
 * randomesque exposure control. Ability estimation via EAP/MLE.
 */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
} from '@edusphere/db';
import type { TenantContext, ExamItem } from '@edusphere/db';
import { fisherInformation3PL, passingProbability } from './cat-math.js';
import { estimateAbilityEAP } from './cat-eap-estimator.js';
import { estimateAbilityMLE } from '../psychometrics/irt-math.js';
import { ExamSessionHelpers } from './exam-session-helpers.js';
import { CatItemLoader } from './cat-item-loader.js';
import type { CatState, TerminationResult, CatNextResult } from './cat-engine.types.js';

const MFI_TOP_K = 5;
const EAP_THRESHOLD = 5;

@Injectable()
export class CatEngineService implements OnModuleDestroy {
  private readonly logger = new Logger(CatEngineService.name);
  private readonly db = createDatabaseConnection();
  private readonly helpers: ExamSessionHelpers;
  private readonly loader: CatItemLoader;

  constructor() {
    this.helpers = new ExamSessionHelpers(this.db);
    this.loader = new CatItemLoader(this.db);
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('CatEngineService destroyed — connections closed');
  }

  async selectNextItem(
    sessionId: string, tenantId: string,
  ): Promise<ExamItem | null> {
    const ctx = this.buildCtx(tenantId);
    const session = await this.helpers.loadSession(sessionId, ctx);
    const catState = this.loader.parseCatState(session);
    const bp = await this.helpers.loadBlueprint(session.blueprintId, ctx);

    const eligible = await this.loader.loadEligibleItems(
      bp.courseId, catState.administeredItemIds, ctx,
    );
    if (eligible.length === 0) return null;
    return this.mfiSelect(eligible, catState.currentTheta);
  }

  async updateAbility(
    sessionId: string, itemId: string,
    isCorrect: boolean, tenantId: string,
  ): Promise<{ theta: number; se: number }> {
    const ctx = this.buildCtx(tenantId);
    const session = await this.helpers.loadSession(sessionId, ctx);
    const catState = this.loader.parseCatState(session);

    catState.administeredItemIds.push(itemId);
    catState.responsePattern.push(isCorrect);

    const items = await this.loader.loadAdministeredItems(catState.administeredItemIds, ctx);
    const estimate = this.estimateTheta(items, catState.responsePattern);
    catState.currentTheta = estimate.theta;
    catState.currentSE = estimate.se;

    await this.loader.saveCatState(sessionId, catState, ctx);
    this.logger.log({ sessionId, theta: estimate.theta, se: estimate.se }, 'CAT ability updated');
    return estimate;
  }

  async checkTermination(
    sessionId: string, tenantId: string,
  ): Promise<TerminationResult> {
    const ctx = this.buildCtx(tenantId);
    const session = await this.helpers.loadSession(sessionId, ctx);
    const catState = this.loader.parseCatState(session);
    const bp = await this.helpers.loadBlueprint(session.blueprintId, ctx);

    const count = catState.administeredItemIds.length;
    const min = bp.catMinItems ?? 10;
    const max = bp.catMaxItems ?? 60;
    const seT = bp.catSeThreshold ?? 0.3;
    const confT = bp.catConfidenceThreshold ?? 0.95;

    if (count < min) return this.result(catState, false, 'CONTINUE');
    if (count >= max) return this.result(catState, true, 'MAX_ITEMS');
    if (catState.currentSE < seT) return this.result(catState, true, 'PRECISION');

    const thetaCut = (bp.passingScore - 500) / 100;
    const pPass = passingProbability(catState.currentTheta, thetaCut, catState.currentSE);
    if (pPass > confT || (1 - pPass) > confT) {
      return this.result(catState, true, 'PASS_FAIL_CONFIDENCE');
    }
    return this.result(catState, false, 'CONTINUE');
  }

  async getNextOrTerminate(
    sessionId: string, tenantId: string,
  ): Promise<CatNextResult> {
    const term = await this.checkTermination(sessionId, tenantId);
    if (term.shouldTerminate) return { terminated: true, result: term };

    const item = await this.selectNextItem(sessionId, tenantId);
    if (!item) {
      return { terminated: true, result: { ...term, shouldTerminate: true, reason: 'NO_ITEMS' } };
    }
    return { terminated: false, item };
  }

  private mfiSelect(items: ExamItem[], theta: number): ExamItem {
    const scored = items.map((item) => ({
      item,
      info: fisherInformation3PL(theta, item.irtA, item.irtB, item.irtC),
    }));
    scored.sort((a, b) => b.info - a.info);
    const topK = scored.slice(0, MFI_TOP_K);
    return topK[Math.floor(Math.random() * topK.length)]!.item;
  }

  private estimateTheta(
    items: ExamItem[], responses: boolean[],
  ): { theta: number; se: number } {
    const paired = items.map((item, i) => ({
      isCorrect: responses[i]!, a: item.irtA, b: item.irtB, c: item.irtC,
      irtA: item.irtA, irtB: item.irtB, irtC: item.irtC,
    }));
    return paired.length < EAP_THRESHOLD
      ? estimateAbilityEAP(paired)
      : estimateAbilityMLE(paired);
  }

  private result(s: CatState, stop: boolean, reason: string): TerminationResult {
    return { shouldTerminate: stop, reason, theta: s.currentTheta, se: s.currentSE };
  }

  private buildCtx(tenantId: string): TenantContext {
    return { tenantId, userId: 'system', userRole: 'INSTRUCTOR' };
  }
}
