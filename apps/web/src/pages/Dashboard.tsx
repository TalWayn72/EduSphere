import { useQuery } from 'urql';
import { Layout } from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { AIChatPanel } from '@/components/AIChatPanel';
import { ME_QUERY, COURSES_QUERY } from '@/lib/queries';
import { BookOpen, Users, FileText, Bot, TrendingUp, Clock } from 'lucide-react';

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

// Mock data for dev mode
const MOCK_ME = {
  me: {
    id: 'dev-user-1',
    username: 'developer',
    email: 'dev@edusphere.local',
    firstName: 'Dev',
    lastName: 'User',
    role: 'SUPER_ADMIN',
    tenantId: 'dev-tenant-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

const MOCK_COURSES = {
  courses: {
    edges: [
      {
        cursor: 'course-1',
        node: {
          id: 'course-1',
          title: 'Introduction to Talmud Study',
          description: 'Learn the fundamentals of Talmudic reasoning and argumentation',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      {
        cursor: 'course-2',
        node: {
          id: 'course-2',
          title: 'Advanced Chavruta Techniques',
          description: 'Master the art of collaborative Talmud learning with AI assistance',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      {
        cursor: 'course-3',
        node: {
          id: 'course-3',
          title: 'Knowledge Graph Navigation',
          description: 'Explore interconnected concepts in Jewish texts using graph-based learning',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    ],
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: 'course-1',
      endCursor: 'course-3',
    },
  },
};

export function Dashboard() {
  const [meResult] = useQuery({ query: ME_QUERY, pause: DEV_MODE });
  const [coursesResult] = useQuery({
    query: COURSES_QUERY,
    variables: { first: 5 },
    pause: DEV_MODE,
  });

  // Use mock data in dev mode or fallback to mock data if queries fail
  const meData = DEV_MODE || meResult.error ? MOCK_ME : meResult.data;
  const coursesData = DEV_MODE || coursesResult.error ? MOCK_COURSES : coursesResult.data;
  const meFetching = !DEV_MODE && meResult.fetching;
  const coursesFetching = !DEV_MODE && coursesResult.fetching;
  const meError = !DEV_MODE && meResult.error;

  return (
    <Layout>
      <AIChatPanel />
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back{meData?.me && `, ${meData.me.firstName}`}!
          </p>
        </div>

        {DEV_MODE && (
          <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <CardContent className="pt-6">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                🔧 <strong>Development Mode:</strong> Using mock data. Start the Gateway to see real data.
              </p>
            </CardContent>
          </Card>
        )}

        {meError && !DEV_MODE && (
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
