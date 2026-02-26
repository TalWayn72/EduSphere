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
            <div className="mb-6">
              <h1 className="text-2xl font-bold">{title}</h1>
              {description && (
                <p className="text-muted-foreground mt-1 text-sm">
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
