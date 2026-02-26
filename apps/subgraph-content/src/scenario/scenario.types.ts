/**
 * Shared TypeScript types for branching scenario content (F-009).
 * These types describe the JSON stored in content_items.content when
 * the content type is SCENARIO.
 */

export interface ScenarioChoiceItem {
  id: string;
  text: string;
  nextContentItemId: string | null;
}

export interface ScenarioContent {
  title: string;
  description: string;
  choices: ScenarioChoiceItem[];
  isEndNode: boolean;
  endingType?: 'SUCCESS' | 'FAILURE' | 'NEUTRAL';
}

export interface ScenarioNodeDto {
  id: string;
  title: string;
  description: string;
  choices: ScenarioChoiceItem[];
  isEndNode: boolean;
  endingType?: string;
}

export interface ScenarioProgressEntryDto {
  fromContentItemId: string;
  choiceId: string;
  choiceText: string;
  chosenAt: string;
}
