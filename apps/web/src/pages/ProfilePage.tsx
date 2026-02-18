import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Shield, Key, BookOpen, Brain, MessageSquare } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getCurrentUser } from '@/lib/auth';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ORG_ADMIN: 'Organization Admin',
  INSTRUCTOR: 'Instructor',
  STUDENT: 'Student',
  RESEARCHER: 'Researcher',
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700',
  ORG_ADMIN: 'bg-orange-100 text-orange-700',
  INSTRUCTOR: 'bg-blue-100 text-blue-700',
  STUDENT: 'bg-green-100 text-green-700',
  RESEARCHER: 'bg-purple-100 text-purple-700',
};

// Mock learning stats — will be replaced by real GraphQL data
const MOCK_STATS = [
  { icon: BookOpen, label: 'Courses Enrolled', value: '4' },
  { icon: Brain, label: 'Concepts Mastered', value: '127' },
  { icon: MessageSquare, label: 'Annotations Created', value: '43' },
];

function getInitials(firstName: string, lastName: string, username: string): string {
  const first = firstName?.[0] ?? '';
  const last = lastName?.[0] ?? '';
  return (first + last).toUpperCase() || (username[0] ?? 'U').toUpperCase();
}

export function ProfilePage() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  if (!user) {
    navigate('/login');
    return null;
  }

  const initials = getInitials(user.firstName, user.lastName, user.username);
  const roleLabel = ROLE_LABELS[user.role] ?? user.role;
  const roleColor = ROLE_COLORS[user.role] ?? 'bg-gray-100 text-gray-700';

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>

        {/* Identity card */}
        <Card className="p-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20 text-2xl">
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <div>
                <h2 className="text-xl font-semibold">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColor}`}>
                {roleLabel}
              </span>
            </div>
          </div>
        </Card>

        {/* Account details */}
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Account Details
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground w-24">Username</span>
              <span className="font-medium">{user.username}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground w-24">Email</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground w-24">Role</span>
              <span className="font-medium">{roleLabel}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Key className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground w-24">Tenant ID</span>
              <span className="font-mono text-xs text-muted-foreground truncate">{user.tenantId}</span>
            </div>
          </div>
        </Card>

        {/* Permissions / Scopes */}
        {user.scopes.length > 0 && (
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Permissions
            </h3>
            <div className="flex flex-wrap gap-2">
              {user.scopes.map((scope) => (
                <span
                  key={scope}
                  className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs font-mono"
                >
                  {scope}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Learning stats */}
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Learning Overview
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {MOCK_STATS.map(({ icon: Icon, label, value }) => (
              <div key={label} className="text-center space-y-1">
                <div className="flex justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
