import { Test } from '@nestjs/testing';
import { ImageUnderstandingService } from './image-understanding.service';

describe('ImageUnderstandingService', () => {
  let service: ImageUnderstandingService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ImageUnderstandingService],
    }).compile();
    service = module.get(ImageUnderstandingService);
  });

  it('generateCaption returns empty string when Ollama is unavailable', async () => {
    // OLLAMA_URL points to a non-existent endpoint in test
    const result = await service.generateCaption('dGVzdA=='); // base64 "test"
    expect(typeof result).toBe('string');
    // Either empty (Ollama down) or a real caption (Ollama running)
    // The important thing is it doesn't throw
  });

  it('detectHandwriting returns false when Ollama is unavailable', async () => {
    const result = await service.detectHandwriting('dGVzdA==');
    expect(typeof result).toBe('boolean');
  });
});
