import { Module } from '@nestjs/common';
import { QuizResolver } from './quiz.resolver';
import { QuizService } from './quiz.service';
import { QuizGraderService } from './quiz-grader.service';

@Module({
  providers: [QuizResolver, QuizService, QuizGraderService],
  exports: [QuizService],
})
export class QuizModule {}
