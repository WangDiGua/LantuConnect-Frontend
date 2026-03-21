import type MockAdapter from 'axios-mock-adapter';
import type { UserInfo, LoginResponse } from '../../../types/dto/auth';
import { mockOk } from '../mockAdapter';

const mockUser: UserInfo = {
  id: 'u_001',
  username: '张管理',
  email: 'admin@school.edu.cn',
  phone: '13800138000',
  avatar: '',
  nickname: '张老师',
  role: 'admin',
  status: 'active',
  department: '信息技术中心',
  lastLoginAt: '2026-03-20T08:30:00Z',
  createdAt: '2025-09-01T00:00:00Z',
  updatedAt: '2026-03-20T08:30:00Z',
};

const DEMO_ACCOUNTS: Record<string, { password: string; user: UserInfo }> = {
  admin: {
    password: '123456',
    user: {
      ...mockUser,
      id: 'u_001',
      username: '张管理',
      email: 'admin@school.edu.cn',
      nickname: '张老师',
      role: 'admin',
      department: '信息技术中心',
    },
  },
  '2024001': {
    password: '123456',
    user: {
      ...mockUser,
      id: 'u_002',
      username: '李同学',
      email: '2024001@stu.school.edu.cn',
      nickname: '李同学',
      role: 'user',
      department: '计算机科学学院',
    },
  },
};

export function registerHandlers(mock: MockAdapter): void {
  mock.onPost('/auth/login').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const loginId = body.username || body.email || '';
    const password = body.password || '';

    const account = DEMO_ACCOUNTS[loginId];
    if (account && account.password === password) {
      const loginResp: LoginResponse = {
        token: 'mock_access_' + Date.now().toString(36),
        refreshToken: 'mock_refresh_' + Date.now().toString(36),
        user: { ...account.user, lastLoginAt: new Date().toISOString() },
        expiresIn: 7200,
      };
      return mockOk(loginResp);
    }

    const fallbackUser: UserInfo = {
      ...mockUser,
      id: 'u_' + Date.now().toString(36),
      username: loginId || '用户',
      email: loginId.includes('@') ? loginId : `${loginId}@school.edu.cn`,
    };
    const loginResp: LoginResponse = {
      token: 'mock_access_' + Date.now().toString(36),
      refreshToken: 'mock_refresh_' + Date.now().toString(36),
      user: fallbackUser,
      expiresIn: 7200,
    };
    return mockOk(loginResp);
  });

  mock.onPost('/auth/register').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const newUser: UserInfo = {
      ...mockUser,
      id: 'u_' + Date.now().toString(36),
      username: body.username || '新用户',
      email: body.email || 'new@school.edu.cn',
      role: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return mockOk({
      token: 'mock_access_' + Date.now().toString(36),
      refreshToken: 'mock_refresh_' + Date.now().toString(36),
      user: newUser,
      expiresIn: 7200,
    });
  });

  mock.onPost('/auth/refresh').reply(() => {
    return mockOk({
      token: 'mock_access_refreshed_' + Date.now().toString(36),
      refreshToken: 'mock_refresh_refreshed_' + Date.now().toString(36),
    });
  });

  mock.onGet('/auth/me').reply(() => {
    return mockOk(mockUser);
  });

  mock.onPost('/auth/logout').reply(() => {
    return mockOk(null);
  });
}
