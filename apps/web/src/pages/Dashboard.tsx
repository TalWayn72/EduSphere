import React from 'react';
import { useQuery } from 'urql';
import { Layout } from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ME_QUERY, COURSES_QUERY } from '@/lib/queries';
import { BookOpen, Users, FileText, Bot, TrendingUp, Clock } from 'lucide-react';

export function Dashboard() {
  const [meResult] = useQuery({ query: ME_QUERY });
  const [coursesResult] = useQuery({
    query: COURSES_QUERY,
    variables: { first: 5 },
  });

  const { data: meData, fetching: meFetching, error: meError } = meResult;
  const { data: coursesData, fetching: coursesFetching } = coursesResult;

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back{meData?.me && `, ${meData.me.firstName}`}!
          </p>
        </div>

        {meError && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">Error loading user data: {meError.message}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {coursesFetching ? '...' : coursesData?.courses?.edges?.length ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Enrolled and in progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Study Groups</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">Active collaborations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Annotations</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">127</div>
              <p className="text-xs text-muted-foreground">Notes and highlights</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Sessions</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">45</div>
              <p className="text-xs text-muted-foreground">Learning agent interactions</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Courses</CardTitle>
              <CardDescription>Your active learning paths</CardDescription>
            </CardHeader>
            <CardContent>
              {coursesFetching ? (
                <p className="text-sm text-muted-foreground">Loading courses...</p>
              ) : coursesData?.courses?.edges?.length > 0 ? (
                <div className="space-y-4">
                  {coursesData.courses.edges.map((edge: { node: { id: string; title: string; description: string } }) => (
                    <div key={edge.node.id} className="flex items-start space-x-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">{edge.node.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {edge.node.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No courses found</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Learning Activity</CardTitle>
              <CardDescription>Your recent study sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">Study Session</p>
                    <p className="text-sm text-muted-foreground">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">Quiz Completed</p>
                    <p className="text-sm text-muted-foreground">5 hours ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {meFetching ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Loading user profile...</p>
            </CardContent>
          </Card>
        ) : meData?.me ? (
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Username</dt>
                  <dd className="text-sm">{meData.me.username}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                  <dd className="text-sm">{meData.me.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Role</dt>
                  <dd className="text-sm">{meData.me.role}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Tenant ID</dt>
                  <dd className="text-sm font-mono text-xs">{meData.me.tenantId}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </Layout>
  );
}
