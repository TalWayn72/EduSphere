import { useQuery, gql } from '@apollo/client';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import CourseList from './components/CourseList';
import CourseDetail from './components/CourseDetail';
import AITutor from './components/AITutor';

const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      firstName
      lastName
      role
    }
  }
`;

function App() {
  const { data, loading, error } = useQuery(ME_QUERY);

  return (
    <BrowserRouter>
      <div
        style={{
          fontFamily: 'system-ui, sans-serif',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '20px',
        }}
      >
        <header
          style={{
            borderBottom: '2px solid #333',
            paddingBottom: '20px',
            marginBottom: '20px',
          }}
        >
          <h1>🎓 EduSphere</h1>
          <nav style={{ marginTop: '10px' }}>
            <Link to="/" style={{ marginRight: '20px' }}>
              Courses
            </Link>
            <Link to="/tutor" style={{ marginRight: '20px' }}>
              AI Tutor
            </Link>
          </nav>
          {loading && <p>Loading user...</p>}
          {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}
          {data?.me && (
            <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
              Logged in as: {data.me.firstName} {data.me.lastName} (
              {data.me.role})
            </div>
          )}
        </header>

        <Routes>
          <Route path="/" element={<CourseList />} />
          <Route path="/course/:id" element={<CourseDetail />} />
          <Route path="/tutor" element={<AITutor />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
