import { createClient, fetchExchange } from 'urql';
import { cacheExchange } from '@urql/exchange-graphcache';
import { getToken } from './auth';

export const urqlClient = createClient({
  url: import.meta.env.VITE_GRAPHQL_URL,
  exchanges: [
    cacheExchange({
      keys: {
        PageInfo: () => null,
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
