import { createClient, fetchExchange, subscriptionExchange } from 'urql';
import { cacheExchange } from '@urql/exchange-graphcache';
import { createClient as createWsClient } from 'graphql-ws';
import { getToken } from './auth';

const wsClient = createWsClient({
  url:
    import.meta.env.VITE_GRAPHQL_WS_URL ??
    import.meta.env.VITE_GRAPHQL_URL.replace(/^http/, 'ws'),
  connectionParams: () => {
    const token = getToken();
    return token ? { authorization: `Bearer ${token}` } : {};
  },
});

export const urqlClient = createClient({
  url: import.meta.env.VITE_GRAPHQL_URL,
  exchanges: [
    cacheExchange({
      keys: {
        PageInfo: () => null,
        UserPreferences: () => null,
        CourseProgress: (data) =>
          (data as { courseId?: string }).courseId ?? null,
      },
    }),
    subscriptionExchange({
      forwardSubscription(request) {
        const input = { ...request, query: request.query ?? '' };
        return {
          subscribe(sink) {
            const unsubscribe = wsClient.subscribe(input, sink);
            return { unsubscribe };
          },
        };
      },
    }),
    fetchExchange,
  ],
  fetchOptions: () => {
    const token = getToken();
    return {
      headers: {
        authorization: token ? `Bearer ${token}` : '',
      },
    };
  },
});
export function disposeWsClient(): void {
  wsClient.dispose();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    wsClient.dispose();
  });
}
