import {
  DateTimeResolver,
  EmailAddressResolver,
  JSONObjectResolver,
  UUIDResolver,
  URLResolver,
  PositiveIntResolver,
} from 'graphql-scalars';

export const customScalars = {
  DateTime: DateTimeResolver,
  EmailAddress: EmailAddressResolver,
  JSONObject: JSONObjectResolver,
  UUID: UUIDResolver,
  URL: URLResolver,
  PositiveInt: PositiveIntResolver,
};

export const scalarTypeDefs = `
  scalar DateTime
  scalar EmailAddress
  scalar JSONObject
  scalar UUID
  scalar URL
  scalar PositiveInt
`;
