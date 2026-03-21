import type MockAdapter from 'axios-mock-adapter';
import type { Review, ReviewSummary } from '../../types/dto/review';
import { mockOk } from '..';

const reviews: Review[] = [
  {
    id: 1, targetType: 'agent', targetId: 1, userId: 101,
    userName: '张三', avatar: null, rating: 5,
    comment: '图像生成效果非常好，文生图的质量很高，推荐使用！',
    helpfulCount: 12, createTime: '2026-03-10T09:30:00Z',
  },
  {
    id: 2, targetType: 'agent', targetId: 1, userId: 102,
    userName: '李四', avatar: null, rating: 4,
    comment: '整体不错，但生成速度稍慢，希望后续能优化。',
    helpfulCount: 5, createTime: '2026-03-12T14:20:00Z',
  },
  {
    id: 3, targetType: 'agent', targetId: 1, userId: 103,
    userName: '王五', avatar: null, rating: 5,
    comment: '配合PPT生成工具一起使用效果绝佳，大大提升了工作效率。',
    helpfulCount: 8, createTime: '2026-03-15T11:00:00Z',
  },
  {
    id: 4, targetType: 'skill', targetId: 2, userId: 104,
    userName: '赵六', avatar: null, rating: 4,
    comment: '联网搜索结果比较准确，速度也很快。',
    helpfulCount: 3, createTime: '2026-03-08T16:45:00Z',
  },
  {
    id: 5, targetType: 'skill', targetId: 2, userId: 105,
    userName: '钱七', avatar: null, rating: 3,
    comment: '学术搜索功能还需要完善，部分期刊论文搜不到。',
    helpfulCount: 7, createTime: '2026-03-11T10:15:00Z',
  },
  {
    id: 6, targetType: 'app', targetId: 1, userId: 106,
    userName: '孙八', avatar: null, rating: 5,
    comment: '智能助手应用做得很好，交互体验流畅。',
    helpfulCount: 15, createTime: '2026-03-14T08:30:00Z',
  },
  {
    id: 7, targetType: 'agent', targetId: 6, userId: 107,
    userName: '周九', avatar: null, rating: 4,
    comment: '任务管理功能实用，分解任务的能力很强。',
    helpfulCount: 6, createTime: '2026-03-16T13:20:00Z',
  },
  {
    id: 8, targetType: 'agent', targetId: 1, userId: 108,
    userName: '吴十', avatar: null, rating: 4,
    comment: '生成的图像风格多样，但偶尔会出现色彩偏差。',
    helpfulCount: 2, createTime: '2026-03-18T15:40:00Z',
  },
];

let nextId = 100;

function computeSummary(targetType: string, targetId: number): ReviewSummary {
  const subset = reviews.filter((r) => r.targetType === targetType && r.targetId === targetId);
  const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;
  for (const r of subset) {
    distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    sum += r.rating;
  }
  return {
    avgRating: subset.length ? Math.round((sum / subset.length) * 10) / 10 : 0,
    totalCount: subset.length,
    distribution,
  };
}

export function registerHandlers(mock: MockAdapter): void {
  mock.onGet('/reviews').reply((config) => {
    const p = config.params || {};
    const filtered = reviews.filter(
      (r) => r.targetType === p.targetType && r.targetId === Number(p.targetId),
    );
    return mockOk(filtered);
  });

  mock.onGet('/reviews/summary').reply((config) => {
    const p = config.params || {};
    return mockOk(computeSummary(p.targetType, Number(p.targetId)));
  });

  mock.onPost('/reviews').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const newReview: Review = {
      id: nextId++,
      targetType: body.targetType,
      targetId: body.targetId,
      userId: 999,
      userName: '当前用户',
      avatar: null,
      rating: body.rating,
      comment: body.comment,
      helpfulCount: 0,
      createTime: new Date().toISOString(),
    };
    reviews.push(newReview);
    return mockOk(newReview);
  });

  mock.onPost(/\/reviews\/(\d+)\/helpful$/).reply((config) => {
    const id = Number(config.url!.match(/\/reviews\/(\d+)\/helpful$/)?.[1]);
    const review = reviews.find((r) => r.id === id);
    if (review) review.helpfulCount += 1;
    return mockOk(null);
  });
}
