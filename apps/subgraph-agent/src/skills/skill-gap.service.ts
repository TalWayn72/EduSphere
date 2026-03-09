import { Injectable } from '@nestjs/common';
import {
  createDatabaseConnection,
  skills,
  inArray,
  type DrizzleDB,
} from '@edusphere/db';
import type { AuthContext } from '@edusphere/auth';
import type { SkillService } from './skill.service';

export interface SkillGapAnalysisResult {
  targetPathId: string;
  totalSkills: number;
  masteredSkills: number;
  gapSkills: Awaited<ReturnType<typeof SkillService.prototype.listSkills>>;
  completionPct: number;
}

@Injectable()
export class SkillGapService {
  private readonly db: DrizzleDB = createDatabaseConnection();

  async getSkillGapAnalysis(
    auth: AuthContext,
    pathId: string,
    listSkillPaths: SkillService['listSkillPaths'],
    getMySkillProgress: SkillService['getMySkillProgress']
  ): Promise<SkillGapAnalysisResult | null> {
    const paths = await listSkillPaths(auth);
    const path = paths.find((p) => p.id === pathId);
    if (!path) return null;

    const pathSkillIds = (path.skillIds as string[]) ?? [];
    const myProgress = await getMySkillProgress(auth);
    const masteredIds = new Set(
      myProgress
        .filter(
          (p) =>
            p.masteryLevel === 'MASTERED' || p.masteryLevel === 'PROFICIENT'
        )
        .map((p) => p.skillId)
    );

    const gapIds = pathSkillIds.filter((id) => !masteredIds.has(id));
    const gapSkills = gapIds.length
      ? await this.db
          .select()
          .from(skills)
          .where(inArray(skills.id, gapIds))
      : [];

    const mastered = pathSkillIds.length - gapIds.length;
    return {
      targetPathId: pathId,
      totalSkills: pathSkillIds.length,
      masteredSkills: mastered,
      gapSkills,
      completionPct:
        pathSkillIds.length > 0 ? (mastered / pathSkillIds.length) * 100 : 0,
    };
  }
}
