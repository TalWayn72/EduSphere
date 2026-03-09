/**
 * Cmi5LauncherService — cmi5 AU launch protocol implementation.
 *
 * Emits the 9 required cmi5 xAPI verbs via XapiStatementService.
 * Evaluates MoveOn criteria to determine AU satisfaction.
 *
 * Reference: ADL cmi5 Specification (https://adlnet.gov/projects/cmi5/)
 */
import { Injectable, Logger } from '@nestjs/common';
import { XapiStatementService } from '../xapi/xapi-statement.service.js';

/** cmi5 9 required verbs (ADL cmi5 profile) */
export const CMI5_VERBS = {
  launched:    'https://adlnet.gov/expapi/verbs/launched',
  initialized: 'http://activitystrea.ms/schema/1.0/initialized',
  terminated:  'https://adlnet.gov/expapi/verbs/terminated',
  passed:      'https://adlnet.gov/expapi/verbs/passed',
  failed:      'https://adlnet.gov/expapi/verbs/failed',
  completed:   'https://adlnet.gov/expapi/verbs/completed',
  satisfied:   'https://adlnet.gov/expapi/verbs/satisfied',
  waived:      'https://adlnet.gov/expapi/verbs/waived',
  abandoned:   'https://adlnet.gov/expapi/verbs/abandoned',
} as const;

export type Cmi5Verb = keyof typeof CMI5_VERBS;

export interface Cmi5LaunchParams {
  activityId: string;    // AU activity IRI
  actor: { name: string; mbox: string };
  registration: string;  // UUID
  returnURL: string;
  sessionId: string;     // UUID
  tenantId: string;
}

export interface Cmi5MoveOnCriteria {
  mode: 'Passed' | 'Completed' | 'CompletedAndPassed' | 'CompletedOrPassed' | 'NotApplicable';
}

@Injectable()
export class Cmi5LauncherService {
  private readonly logger = new Logger(Cmi5LauncherService.name);

  constructor(private readonly xapiStatementService: XapiStatementService) {}

  /** Emit a cmi5 xAPI statement for the given verb */
  async emitStatement(
    verb: Cmi5Verb,
    params: Cmi5LaunchParams,
    extensions?: Record<string, unknown>,
  ): Promise<void> {
    const statement = {
      id: crypto.randomUUID(),
      actor: {
        objectType: 'Agent' as const,
        name: params.actor.name,
        mbox: `mailto:${params.actor.mbox}`,
      },
      verb: {
        // eslint-disable-next-line security/detect-object-injection -- verb is keyof CMI5_VERBS (closed union), not user input
        id: CMI5_VERBS[verb],
        display: { 'en-US': verb },
      },
      object: {
        objectType: 'Activity' as const,
        id: params.activityId,
        definition: { name: { 'en-US': verb } },
      },
      context: {
        registration: params.registration,
        contextActivities: {
          grouping: [{ id: 'https://adlnet.gov/expapi/activities/cmi5' }],
        },
        extensions: {
          'https://adlnet.gov/expapi/cmi5/context/sessionId': params.sessionId,
          ...extensions,
        },
      },
      timestamp: new Date().toISOString(),
    };

    try {
      await this.xapiStatementService.storeStatement(params.tenantId, statement);
      this.logger.log(
        `[cmi5] verb=${verb} registration=${params.registration} tenantId=${params.tenantId}`,
      );
    } catch (err) {
      this.logger.error(
        { err, verb, registration: params.registration },
        '[cmi5] failed to emit statement',
      );
    }
  }

  /**
   * Evaluate MoveOn criteria against session results.
   * Returns true when the AU is considered satisfied.
   */
  isSatisfied(
    criteria: Cmi5MoveOnCriteria,
    completed: boolean,
    passed: boolean,
  ): boolean {
    switch (criteria.mode) {
      case 'Passed':             return passed;
      case 'Completed':          return completed;
      case 'CompletedAndPassed': return completed && passed;
      case 'CompletedOrPassed':  return completed || passed;
      case 'NotApplicable':      return true;
    }
  }

  /** Build the cmi5 launch URL with required query parameters */
  buildLaunchUrl(baseUrl: string, params: Cmi5LaunchParams, lrsEndpoint: string): string {
    const url = new URL(baseUrl);
    url.searchParams.set('endpoint', lrsEndpoint);
    url.searchParams.set('fetch', `${lrsEndpoint}/fetch-url`);
    url.searchParams.set('registration', params.registration);
    url.searchParams.set('activityId', params.activityId);
    url.searchParams.set('actor', JSON.stringify(params.actor));
    return url.toString();
  }
}
