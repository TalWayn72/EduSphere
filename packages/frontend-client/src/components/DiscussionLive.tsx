import { useSubscription, gql } from '@apollo/client';

const DISCUSSION_CREATED_SUB = gql`
  subscription OnDiscussionCreated($courseId: ID!) {
    discussionCreated(courseId: $courseId) {
      id
      title
      content
      upvotes
      createdAt
    }
  }
`;

const _DISCUSSION_UPVOTED_SUB = gql`
  subscription OnDiscussionUpvoted($discussionId: ID!) {
    discussionUpvoted(discussionId: $discussionId) {
      id
      upvotes
    }
  }
`;

interface Props {
  courseId: string;
}

export default function DiscussionLive({ courseId }: Props) {
  // Subscribe to new discussions
  const { data: newDiscussion } = useSubscription(DISCUSSION_CREATED_SUB, {
    variables: { courseId },
  });

  return (
    <div
      style={{
        padding: '20px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        marginTop: '20px',
      }}
    >
      <h3>🔴 Live Updates</h3>
      {newDiscussion?.discussionCreated && (
        <div
          style={{
            padding: '15px',
            backgroundColor: '#e8f5e9',
            borderRadius: '5px',
            marginTop: '10px',
            animation: 'fadeIn 0.5s',
          }}
        >
          <strong>New Discussion:</strong>{' '}
          {newDiscussion.discussionCreated.title}
          <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
            {newDiscussion.discussionCreated.content}
          </p>
        </div>
      )}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
