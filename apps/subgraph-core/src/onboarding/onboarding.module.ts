import { Module } from '@nestjs/common';
import { OnboardingResolver } from './onboarding.resolver';
import { OnboardingService } from './onboarding.service';

@Module({
  providers: [OnboardingResolver, OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
