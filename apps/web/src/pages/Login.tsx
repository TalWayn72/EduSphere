import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, isAuthenticated } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { BookOpen } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleLogin = () => {
    login();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <BookOpen className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl">Welcome to EduSphere</CardTitle>
          <CardDescription>
            Knowledge Graph Educational Platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Sign in with your organizational account to access courses,
              collaborate with peers, and interact with AI learning agents.
            </p>
            <Button className="w-full" size="lg" onClick={handleLogin}>
              Sign In with Keycloak
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
