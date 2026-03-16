/**
 * AdminLayout — Shared layout wrapper for all admin pages.
 * Composes outer Layout + AdminSidebar + content area.
 */
import React from 'react';
import { Layout } from '@/components/Layout';
import { AdminSidebar } from './AdminSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function AdminLayout({
  children,
  title,
  description,
}: AdminLayoutProps) {
  return (
    <Layout>
      <div className="flex gap-6">
        <AdminSidebar />
        <div className="flex-1 min-w-0">
          {title && (
            <div className="mb-6" data-testid="admin-page-header">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
              {description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
          )}
          {children}
        </div>
      </div>
    </Layout>
  );
}
