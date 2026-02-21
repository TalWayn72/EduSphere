import { useQuery, gql } from '@apollo/client';
import { useParams } from 'react-router-dom';

const COURSE_DETAIL_QUERY = gql`
  query CourseDetail($id: ID!) {
    course(id: $id) {
      id
      title
      description
      isPublished
      modules {
        id
        title
        description
        orderIndex
        contentItems {
          id
          title
          type
          orderIndex
        }
      }
    }
  }
`;

interface ContentItem {
  id: string;
  title: string;
  type: string;
  orderIndex: number;
}

interface CourseModule {
  id: string;
  title: string;
  description?: string;
  orderIndex: number;
  contentItems?: ContentItem[];
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error } = useQuery(COURSE_DETAIL_QUERY, {
    variables: { id },
  });

  if (loading) return <div>Loading course...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error.message}</div>;

  const course = data?.course;

  return (
    <div>
      <h2>{course.title}</h2>
      <p style={{ color: '#666', fontSize: '16px' }}>{course.description}</p>

      <div style={{ marginTop: '30px' }}>
        <h3>📖 Modules</h3>
        {course.modules?.map((module: CourseModule) => (
          <div
            key={module.id}
            style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '20px',
            }}
          >
            <h4>{module.title}</h4>
            <p style={{ color: '#666' }}>{module.description}</p>

            {(module.contentItems?.length ?? 0) > 0 && (
              <div style={{ marginTop: '15px' }}>
                <strong>Content:</strong>
                <ul>
                  {module.contentItems?.map((item: ContentItem) => (
                    <li key={item.id}>
                      {item.type === 'VIDEO' && '🎥 '}
                      {item.type === 'READING' && '📄 '}
                      {item.type === 'QUIZ' && '✅ '}
                      {item.type === 'EXERCISE' && '💪 '}
                      {item.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
