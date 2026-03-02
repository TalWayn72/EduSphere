import { ApolloLink, Observable } from '@apollo/client';
import { OperationDefinitionNode } from 'graphql';
import { database } from '../services/database';
import NetInfo from '@react-native-community/netinfo';

export const offlineLink = new ApolloLink((operation, forward) => {
  return new Observable((observer) => {
    let subscription: { unsubscribe: () => void } | undefined;

    NetInfo.fetch().then((state) => {
      const isOnline = state.isConnected ?? false;

      // For queries, try cache first if offline
      const firstDef = operation.query.definitions[0];
      if (!isOnline && firstDef?.kind === 'OperationDefinition') {
        const def = firstDef as OperationDefinitionNode;
        if (def.operation === 'query') {
          database
            .getCachedQuery(
              operation.query.loc?.source.body || '',
              operation.variables
            )
            .then((cachedData) => {
              if (cachedData) {
                observer.next({ data: cachedData });
                observer.complete();
              } else {
                observer.error(new Error('No cached data available offline'));
              }
            });
          return;
        }

        // For mutations, queue them for later
        if ((def as OperationDefinitionNode).operation === 'mutation') {
          database
            .addOfflineMutation(
              operation.query.loc?.source.body || '',
              operation.variables
            )
            .then(() => {
              observer.next({ data: { __offline: true } });
              observer.complete();
            });
          return;
        }
      }

      // If online, proceed normally and cache the result
      subscription = forward(operation).subscribe({
        next: (result) => {
          // Cache successful query results
          const onlineDef = operation.query.definitions[0];
          if (onlineDef?.kind === 'OperationDefinition') {
            const def = onlineDef as OperationDefinitionNode;
            if (def.operation === 'query' && result.data) {
              database.cacheQuery(
                operation.query.loc?.source.body || '',
                operation.variables,
                result.data
              );
            }
          }
          observer.next(result);
        },
        error: observer.error.bind(observer),
        complete: observer.complete.bind(observer),
      });
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  });
});
