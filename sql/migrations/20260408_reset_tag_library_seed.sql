-- 清空目录标签并重新种子：先删资源-标签关联，再删标签本体；按 agent/skill/mcp/app/dataset 各 10 条、general 5 条。
-- 执行：mysql ... lantu_connect --default-character-set=utf8mb4 < 本文件
SET NAMES utf8mb4;

START TRANSACTION;

DELETE FROM t_resource_tag_rel;
DELETE FROM t_tag;

INSERT INTO t_tag (name, category, usage_count, create_time) VALUES
('教学助手', 'agent', 0, NOW()),
('科研协作', 'agent', 0, NOW()),
('教务问答', 'agent', 0, NOW()),
('校园服务', 'agent', 0, NOW()),
('智能客服', 'agent', 0, NOW()),
('流程自动化', 'agent', 0, NOW()),
('知识检索', 'agent', 0, NOW()),
('多轮对话', 'agent', 0, NOW()),
('任务编排', 'agent', 0, NOW()),
('决策支持', 'agent', 0, NOW()),

('文档生成', 'skill', 0, NOW()),
('表格处理', 'skill', 0, NOW()),
('翻译润色', 'skill', 0, NOW()),
('代码辅助', 'skill', 0, NOW()),
('数据清洗', 'skill', 0, NOW()),
('OCR识别', 'skill', 0, NOW()),
('语音转写', 'skill', 0, NOW()),
('PPT制作', 'skill', 0, NOW()),
('邮件起草', 'skill', 0, NOW()),
('摘要提炼', 'skill', 0, NOW()),

('文件系统', 'mcp', 0, NOW()),
('数据库访问', 'mcp', 0, NOW()),
('HTTP调用', 'mcp', 0, NOW()),
('浏览器自动化', 'mcp', 0, NOW()),
('Git操作', 'mcp', 0, NOW()),
('云端存储', 'mcp', 0, NOW()),
('消息推送', 'mcp', 0, NOW()),
('日历日程', 'mcp', 0, NOW()),
('地图地理', 'mcp', 0, NOW()),
('支付对账', 'mcp', 0, NOW()),

('移动办公', 'app', 0, NOW()),
('教务管理', 'app', 0, NOW()),
('科研管理', 'app', 0, NOW()),
('图书馆', 'app', 0, NOW()),
('一卡通', 'app', 0, NOW()),
('迎新离校', 'app', 0, NOW()),
('考勤门禁', 'app', 0, NOW()),
('资产管理', 'app', 0, NOW()),
('问卷调研', 'app', 0, NOW()),
('门户集成', 'app', 0, NOW()),

('教学资源', 'dataset', 0, NOW()),
('科研数据', 'dataset', 0, NOW()),
('教务统计', 'dataset', 0, NOW()),
('人事档案', 'dataset', 0, NOW()),
('资产台账', 'dataset', 0, NOW()),
('日志审计', 'dataset', 0, NOW()),
('传感器时序', 'dataset', 0, NOW()),
('图像样本', 'dataset', 0, NOW()),
('文本语料', 'dataset', 0, NOW()),
('CSV基准', 'dataset', 0, NOW()),

('校园信息化', 'general', 0, NOW()),
('人工智能', 'general', 0, NOW()),
('数字化转型', 'general', 0, NOW()),
('开放生态', 'general', 0, NOW()),
('安全合规', 'general', 0, NOW());

COMMIT;
