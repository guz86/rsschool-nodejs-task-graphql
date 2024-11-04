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

    const createInputType = (name: string, fields: Record<string, any>) => {
        return new GraphQLInputObjectType({
            name,
            fields,
        });
    };

    const changePostFields = {
        title: { type: GraphQLString },
        content: { type: GraphQLString },
    };

    const changeProfileFields = {
        isMale: { type: GraphQLBoolean },
        yearOfBirth: { type: GraphQLInt },
        memberTypeId: { type: MemberTypeId },
    };

    const changeUserFields = {
        name: { type: GraphQLString },
        balance: { type: GraphQLFloat },
    };

    const createPostFields = {
        title: { type: new GraphQLNonNull(GraphQLString) },
        content: { type: new GraphQLNonNull(GraphQLString) },
        authorId: { type: new GraphQLNonNull(UUIDType) },
    };

    const createProfileFields = {
        isMale: { type: new GraphQLNonNull(GraphQLBoolean) },
        yearOfBirth: { type: new GraphQLNonNull(GraphQLInt) },
        memberTypeId: { type: new GraphQLNonNull(MemberTypeId) },
        userId: { type: new GraphQLNonNull(UUIDType) },
    };

    const createUserFields = {
        name: { type: new GraphQLNonNull(GraphQLString) },
        balance: { type: new GraphQLNonNull(GraphQLFloat) },
    };

    const ChangePostInput = createInputType('ChangePostInput', changePostFields);
    const ChangeProfileInput = createInputType('ChangeProfileInput', changeProfileFields);
    const ChangeUserInput = createInputType('ChangeUserInput', changeUserFields);
    const CreatePostInput = createInputType('CreatePostInput', createPostFields);
    const CreateProfileInput = createInputType('CreateProfileInput', createProfileFields);
    const CreateUserInput = createInputType('CreateUserInput', createUserFields);
    const Mutations = new GraphQLObjectType({
        name: 'Mutations',
        fields: {
            createUser: {
                type: new GraphQLNonNull(User),
                args: {
                    dto: { type: new GraphQLNonNull(CreateUserInput) },
                },
                resolve: async (_, { dto }) => {
                    try {
                        return await prisma.user.create({ data: dto });
                    } catch (error) {
                        throw new Error(`Failed to create user: ${error.message}`);
                    }
                },
            },

            createProfile: {
                type: new GraphQLNonNull(Profile),
                args: {
                    dto: { type: CreateProfileInput },
                },
                resolve: async (_, { dto }) => {
                    try {
                        return await prisma.profile.create({ data: dto });
                    } catch (error) {
                        throw new Error(`Failed to create profile: ${error.message}`);
                    }
                },
            },

            createPost: {
                type: new GraphQLNonNull(Post),
                args: {
                    dto: { type: new GraphQLNonNull(CreatePostInput) },
                },
                resolve: async (_, { dto }) => {
                    try {
                        return await prisma.post.create({ data: dto });
                    } catch (error) {
                        throw new Error(`Failed to create post: ${error.message}`);
                    }
                },
            },

            changePost: {
                type: new GraphQLNonNull(Post),
                args: {
                    id: { type: new GraphQLNonNull(UUIDType) },
                    dto: { type: new GraphQLNonNull(ChangePostInput) },
                },
                resolve: async (_, { id, dto }) => {
                    try {
                        return await prisma.post.update({ where: { id }, data: dto });
                    } catch (error) {
                        throw new Error(`Failed to update post: ${error.message}`);
                    }
                },
            },

            changeProfile: {
                type: new GraphQLNonNull(Profile),
                args: {
                    id: { type: new GraphQLNonNull(UUIDType) },
                    dto: { type: new GraphQLNonNull(ChangeProfileInput) },
                },
                resolve: async (_, { id, dto }) => {
                    try {
                        return await prisma.profile.update({ where: { id }, data: dto });
                    } catch (error) {
                        throw new Error(`Failed to update profile: ${error.message}`);
                    }
                },
            },

            changeUser: {
                type: new GraphQLNonNull(User),
                args: {
                    id: { type: new GraphQLNonNull(UUIDType) },
                    dto: { type: new GraphQLNonNull(ChangeUserInput) },
                },
                resolve: async (_, { id, dto }) => {
                    try {
                        return await prisma.user.update({ where: { id }, data: dto });
                    } catch (error) {
                        throw new Error(`Failed to update user: ${error.message}`);
                    }
                },
            },

            deleteUser: {
                type: new GraphQLNonNull(GraphQLString),
                args: {
                    id: { type: new GraphQLNonNull(UUIDType) },
                },
                resolve: async (_, { id }) => {
                    try {
                        await prisma.user.delete({ where: { id } });
                        return 'User deleted';
                    } catch (error) {
                        throw new Error(`Failed to delete user: ${error.message}`);
                    }
                },
            },

            deletePost: {
                type: new GraphQLNonNull(GraphQLString),
                args: {
                    id: { type: new GraphQLNonNull(UUIDType) },
                },
                resolve: async (_, { id }) => {
                    try {
                        await prisma.post.delete({ where: { id } });
                        return 'Post deleted';
                    } catch (error) {
                        throw new Error(`Failed to delete post: ${error.message}`);
                    }
                },
            },

            deleteProfile: {
                type: new GraphQLNonNull(GraphQLString),
                args: {
                    id: { type: new GraphQLNonNull(UUIDType) },
                },
                resolve: async (_, { id }) => {
                    try {
                        await prisma.profile.delete({ where: { id } });
                        return 'Profile deleted';
                    } catch (error) {
                        throw new Error(`Failed to delete profile: ${error.message}`);
                    }
                },
            },

            subscribeTo: {
                type: new GraphQLNonNull(GraphQLString),
                args: {
                    userId: { type: new GraphQLNonNull(UUIDType) },
                    authorId: { type: new GraphQLNonNull(UUIDType) },
                },
                resolve: async (_, { userId, authorId }) => {
                    try {
                        await prisma.subscribersOnAuthors.create({
                            data: { subscriberId: userId, authorId },
                        });
                        return 'Subscribed';
                    } catch (error) {
                        throw new Error(`Failed to subscribe: ${error.message}`);
                    }
                },
            },

            unsubscribeFrom: {
                type: new GraphQLNonNull(GraphQLString),
                args: {
                    userId: { type: new GraphQLNonNull(UUIDType) },
                    authorId: { type: new GraphQLNonNull(UUIDType) },
                },
                resolve: async (_, { userId, authorId }) => {
                    try {
                        await prisma.subscribersOnAuthors.delete({
                            where: {
                                subscriberId_authorId: {
                                    subscriberId: userId,
                                    authorId,
                                },
                            },
                        });
                        return 'Unsubscribed';
                    } catch (error) {
                        throw new Error(`Failed to unsubscribe: ${error.message}`);
                    }
                },
            },
        },
    });

    const schema = new GraphQLSchema({
        query: RootQueryType,
        mutation: Mutations,
    });

    return schema;
}