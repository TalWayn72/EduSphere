import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApolloClient, InMemoryCache, ApolloProvider, HttpLink, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import Navigation from './src/navigation';
import { useLoadAssets } from './src/hooks/useLoadAssets';

// GraphQL setup
const GATEWAY_URL = __DEV__
  ? 'http://10.0.2.2:4000/graphql' // Android emulator
  : 'https://api.edusphere.com/graphql';

const WS_URL = __DEV__
  ? 'ws://10.0.2.2:4000/graphql'
  : 'wss://api.edusphere.com/graphql';

const httpLink = new HttpLink({ uri: GATEWAY_URL });

const wsLink = new GraphQLWsLink(
  createClient({
    url: WS_URL,
    connectionParams: async () => {
      // Get auth token from secure storage
      // const token = await SecureStore.getItemAsync('authToken');
      return {
        // authorization: token ? `Bearer ${token}` : '',
      };
    },
  }),
);

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink,
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

export default function App() {
  const isLoadingComplete = useLoadAssets();

  if (!isLoadingComplete) {
    return null;
  }

  return (
    <ApolloProvider client={client}>
      <SafeAreaProvider>
        <Navigation />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </ApolloProvider>
  );
}
