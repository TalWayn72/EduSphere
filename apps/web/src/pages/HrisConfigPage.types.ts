/**
 * HrisConfigPage types, constants, and status display helpers.
 */
import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

export type HrisType = 'SCIM' | 'WORKDAY' | 'SAP' | 'BANNER';

export type SystemStatus = 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR';

export interface SystemCard {
  type: HrisType;
  label: string;
  status: SystemStatus;
  lastSync?: string;
}

export const SYSTEM_CARDS: SystemCard[] = [
  { type: 'SCIM', label: 'SCIM 2.0 (Generic)', status: 'NOT_CONFIGURED' },
  { type: 'WORKDAY', label: 'Workday', status: 'NOT_CONFIGURED' },
  { type: 'SAP', label: 'SAP SuccessFactors', status: 'NOT_CONFIGURED' },
  { type: 'BANNER', label: 'Banner (Ellucian)', status: 'NOT_CONFIGURED' },
];

export const STATUS_STYLES: Record<SystemStatus, string> = {
  CONNECTED: 'text-green-700 bg-green-50 border-green-200',
  NOT_CONFIGURED: 'text-gray-500 bg-gray-50 border-gray-200',
  ERROR: 'text-red-700 bg-red-50 border-red-200',
};

export const STATUS_ICONS: Record<SystemStatus, React.ReactNode> = {
  CONNECTED: React.createElement(CheckCircle, { className: 'h-4 w-4 text-green-600 dark:text-green-400' }),
  NOT_CONFIGURED: React.createElement(XCircle, { className: 'h-4 w-4 text-gray-400 dark:text-gray-500' }),
  ERROR: React.createElement(XCircle, { className: 'h-4 w-4 text-red-600 dark:text-red-400' }),
};

export interface SyncEntry {
  id: string;
  type: string;
  timestamp: string;
  usersUpserted: number;
  errors: number;
  status: 'SUCCESS' | 'ERROR';
}

export const MOCK_SYNC_HISTORY: SyncEntry[] = [];

export const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);
