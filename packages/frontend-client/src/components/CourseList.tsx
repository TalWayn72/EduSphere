import { useQuery, gql } from '@apollo/client';
import { Link } from 'react-router-dom';

const COURSES_QUERY = gql`
  query Courses {
    courses(limit: 20) {
      id
      title
      description
      isPublished
      createdAt
    }
  }
`;

export default function CourseList() {
  const { data, loading, error } = useQuery(COURSES_QUERY);

  if (loading) return <div>Loading courses...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error.message}</div>;

  return (
    <div>
      <h2>📚 Available Courses</h2>
      <div style={{ display: 'grid', gap: '20px', marginTop: '20px' }}>
        {data?.courses?.map((course: any) => (
          <Link
            key={course.id}
            to={`/course/${course.id}`}
            style={{
              textDecoration: 'none',
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '20px',
              backgroundColor: course.isPublished ? '#fff' : '#f9f9f9',
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>
              {course.title}
              {!course.isPublished && <span style={{ color: '#999', fontSize: '14px' }}> (Draft)</span>}
            </h3>
            <p style={{ margin: '0', color: '#666' }}>{course.description}</p>
            <small style={{ color: '#999' }}>
              Created: {new Date(course.createdAt).toLocaleDateString()}
            </small>
          </Link>
        ))}
      </div>
    </div>
  );
}
