import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, User, Settings, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logout } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';

interface UserMenuProps {
  user: AuthUser;
}

function getRoleBadgeColor(role: string): string {
  const colors: Record<string, string> = {
    SUPER_ADMIN: 'text-red-500',
    ORG_ADMIN: 'text-orange-500',
    INSTRUCTOR: 'text-blue-500',
    STUDENT: 'text-green-500',
    RESEARCHER: 'text-purple-500',
  };
  return colors[role] ?? 'text-muted-foreground';
}

function getInitials(user: AuthUser): string {
  const first = user.firstName?.[0] ?? '';
  const last = user.lastName?.[0] ?? '';
  return (first + last).toUpperCase() || (user.username[0] ?? 'U').toUpperCase();
}

export function UserMenu({ user }: UserMenuProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full p-1 hover:bg-accent transition-colors outline-none"
          aria-label="User menu"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback>{getInitials(user)}</AvatarFallback>
          </Avatar>
          <span className="hidden lg:block text-sm font-medium max-w-[120px] truncate">
            {user.firstName || user.username}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden lg:block" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            <p className={`text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
              {(user.role ?? '').replace('_', ' ')}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => navigate('/profile')}>
          <User className="mr-2 h-4 w-4" />
          {t('profile')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          {t('settings')}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleLogout}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t('logOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
