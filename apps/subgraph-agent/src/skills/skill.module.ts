import { Module } from '@nestjs/common';
import { SkillService } from './skill.service';
import { SkillGapService } from './skill-gap.service';
import { SkillResolver } from './skill.resolver';

@Module({ providers: [SkillService, SkillGapService, SkillResolver] })
export class SkillModule {}
