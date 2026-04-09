import type { LegalNotices } from '../types/dto/auth';

/** 服务端不可达时的占位文案（与页脚、后端默认表述一致） */
export const LOGIN_LEGAL_NOTICES_FALLBACK: LegalNotices = {
  privacyTitle: '隐私说明',
  termsTitle: '用户条款',
  privacyBody:
    '暂无法从服务器加载隐私说明。用户协议与隐私政策以学校及平台公示为准；技术支持与合规咨询请联系学校信息化管理部门。',
  termsBody:
    '暂无法从服务器加载用户条款。用户协议与隐私政策以学校及平台公示为准；技术支持与合规咨询请联系学校信息化管理部门。',
};
