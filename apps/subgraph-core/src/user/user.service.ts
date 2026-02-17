import { Injectable } from '@nestjs/common';

// Temporary mock data until Drizzle is set up
const mockUsers = [
  {
    id: '1',
    email: 'super.admin@edusphere.dev',
    firstName: 'Super',
    lastName: 'Admin',
    role: 'SUPER_ADMIN',
    tenantId: '00000000-0000-0000-0000-000000000000',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    email: 'student@example.com',
    firstName: 'Jane',
    lastName: 'Student',
    role: 'STUDENT',
    tenantId: '11111111-1111-1111-1111-111111111111',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

@Injectable()
export class UserService {
  async findById(id: string) {
    return mockUsers.find((u) => u.id === id) || null;
  }

  async findAll(limit: number, offset: number) {
    return mockUsers.slice(offset, offset + limit);
  }

  async create(input: any) {
    const newUser = {
      id: String(mockUsers.length + 1),
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockUsers.push(newUser);
    return newUser;
  }

  async update(id: string, input: any) {
    const user = mockUsers.find((u) => u.id === id);
    if (!user) {
      throw new Error('User not found');
    }
    Object.assign(user, input, { updatedAt: new Date() });
    return user;
  }
}
