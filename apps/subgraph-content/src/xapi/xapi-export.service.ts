/**
 * XapiExportService — Phase 41 A2
 * Provides aggregate/export operations over stored xAPI statements.
 */
import { Injectable, Logger } from '@nestjs/common';
import { XapiStatementService } from './xapi-statement.service.js';

@Injectable()
export class XapiExportService {
  private readonly logger = new Logger(XapiExportService.name);

  constructor(private readonly statementService: XapiStatementService) {}

  async getStatementCount(tenantId: string, since?: string): Promise<number> {
    this.logger.log({ tenantId, since }, 'XapiExportService.getStatementCount');
    const stmts = await this.statementService.queryStatements(tenantId, {
      limit: 100000,
      since,
    });
    return stmts.length;
  }
}
