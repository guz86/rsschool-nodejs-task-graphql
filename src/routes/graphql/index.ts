import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { createGqlResponseSchema, gqlResponseSchema } from './schemas.js';
import { graphql, parse, validate } from 'graphql';
import { createGraphQLSchema } from './schema.js';
import depthLimit from 'graphql-depth-limit';

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const { prisma } = fastify;

  const schema = createGraphQLSchema(prisma);
  const limit = 5;

  fastify.route({
    url: '/',
    method: 'POST',
    schema: {
      ...createGqlResponseSchema,
      response: {
        200: gqlResponseSchema,
      },
    },
    async handler(req) {

      const errors = validate(schema, parse(req.body.query), [depthLimit(limit)]);

      if (errors.length) {
        return { errors };
      }

      return graphql({
        schema,
        source: req.body.query,
        variableValues: req.body.variables,
      });
    },
  });
};

export default plugin;