import { Prisma, PrismaClient } from '@prisma/client';
import { DefaultArgs } from '@prisma/client/runtime/library.js';
import {
    GraphQLBoolean,
    GraphQLEnumType,
    GraphQLFloat,
    GraphQLInputObjectType,
    GraphQLInt,
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLSchema,
    GraphQLString,
} from 'graphql';
import { UUIDType } from './types/uuid.js';

const MemberTypeId = new GraphQLEnumType({
    name: 'MemberTypeId',
    values: {
        BASIC: { value: 'BASIC' },
        BUSINESS: { value: 'BUSINESS' },
    },
});

const MemberType = new GraphQLObjectType({
    name: 'MemberType',
    fields: {
        id: { type: new GraphQLNonNull(MemberTypeId) },
        discount: { type: new GraphQLNonNull(GraphQLFloat) },
        postsLimitPerMonth: { type: new GraphQLNonNull(GraphQLInt) },
    },
});

const Post = new GraphQLObjectType({
    name: 'Post',
    fields: {
        id: { type: new GraphQLNonNull(UUIDType) },
        title: { type: new GraphQLNonNull(GraphQLString) },
        content: { type: new GraphQLNonNull(GraphQLString) },
    },
});

export function createGraphQLSchema(
    prisma: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>,
) {
    const Profile = new GraphQLObjectType({
        name: 'Profile',
        fields: {
            id: { type: new GraphQLNonNull(UUIDType) },
            isMale: { type: new GraphQLNonNull(GraphQLBoolean) },
            yearOfBirth: { type: new GraphQLNonNull(GraphQLInt) },
            memberType: {
                type: new GraphQLNonNull(MemberType),
                resolve: (profile: { memberTypeId: string }) =>
                    prisma.memberType.findFirst({ where: { id: profile.memberTypeId } }),
            },
        },
    });

    const User: GraphQLObjectType = new GraphQLObjectType({
        name: 'User',
        fields: () => ({
            id: { type: new GraphQLNonNull(UUIDType) },
            name: { type: new GraphQLNonNull(GraphQLString) },
            balance: { type: new GraphQLNonNull(GraphQLFloat) },
            profile: {
                type: Profile,
                resolve: (user: { id: string }) =>
                    prisma.profile.findFirst({ where: { userId: user.id } }),
            },
            posts: {
                type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Post))),
                resolve: (user: { id: string }) =>
                    prisma.post.findMany({ where: { authorId: user.id } }),
            },
            userSubscribedTo: {
                type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(User))),
                resolve: async (user: { id: string }) => {
                    const subscribes = await prisma.subscribersOnAuthors.findMany({
                        where: { subscriberId: user.id },
                    });

                    return Promise.all(
                        subscribes.map(({ authorId }) =>
                            prisma.user.findFirst({ where: { id: authorId } }),
                        )
                    );
                },
            },
            subscribedToUser: {
                type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(User))),
                resolve: async (user: { id: string }) => {
                    const subscribes = await prisma.subscribersOnAuthors.findMany({
                        where: { authorId: user.id },
                    });

                    return Promise.all(
                        subscribes.map(({ subscriberId }) =>
                            prisma.user.findFirst({ where: { id: subscriberId } }),
                        )
                    );
                },
            },
        }),
    });


    const RootQueryType = new GraphQLObjectType({
        name: 'RootQueryType',
        fields: {
            memberTypes: {
                type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MemberType))),
                resolve: () => prisma.memberType.findMany(),
            },

            memberType: {
                type: MemberType,
                args: {
                    id: { type: new GraphQLNonNull(MemberTypeId) },
                },
                resolve: async (_, { id }: { id: string }) => {
                    try {
                        return await prisma.memberType.findFirst({ where: { id } });
                    } catch (error) {
                        if (error instanceof Error) {
                            throw new Error(`Error fetching memberType: ${error.message}`);
                        }
                        throw new Error(`Unknown error fetching memberType`);
                    }
                },
            },

            users: {
                type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(User))),
                resolve: () => prisma.user.findMany(),
            },

            user: {
                type: User,
                args: {
                    id: { type: new GraphQLNonNull(UUIDType) },
                },
                resolve: async (_, { id }: { id: string }) => {
                    try {
                        return await prisma.user.findFirst({ where: { id } });
                    } catch (error) {
                        if (error instanceof Error) {
                            throw new Error(`Error fetching user: ${error.message}`);
                        }
                        throw new Error(`Unknown error fetching user`);
                    }
                },
            },

            posts: {
                type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Post))),
                resolve: () => prisma.post.findMany(),
            },

            post: {
                type: Post,
                args: {
                    id: { type: new GraphQLNonNull(UUIDType) },
                },
                resolve: async (_, { id }: { id: string }) => {
                    try {
                        return await prisma.post.findFirst({ where: { id } });
                    } catch (error) {
                        if (error instanceof Error) {
                            throw new Error(`Error fetching post: ${error.message}`);
                        }
                        throw new Error(`Unknown error fetching post`);
                    }
                },
            },

            profiles: {
                type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Profile))),
                resolve: () => prisma.profile.findMany(),
            },

            profile: {
                type: Profile,
                args: {
                    id: { type: new GraphQLNonNull(UUIDType) },
                },
                resolve: async (_, { id }: { id: string }) => {
                    try {
                        return await prisma.profile.findFirst({ where: { id } });
                    } catch (error) {
                        if (error instanceof Error) {
                            throw new Error(`Error fetching profile: ${error.message}`);
                        }
                        throw new Error(`Unknown error fetching profile`);
                    }
                },
            },
        },
    });



    const schema = new GraphQLSchema({
        query: RootQueryType,
    });

    return schema;
}