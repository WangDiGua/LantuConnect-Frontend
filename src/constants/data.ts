import { Search, Sparkles, FileText, Layout, Terminal, MessageSquare, Zap } from 'lucide-react';

export const FEATURED_TOOLS = [
  { 
    title: '百度搜索', 
    desc: '25年搜索沉淀，权威高质量核心信源，专为生成式AI提供全网实时信息检索服务，具备海量内容站点、高权威性、强实时性。', 
    icon: Search, 
    color: 'from-blue-500/10 to-indigo-500/10', 
    tags: ['25年搜索沉淀', '权威高质量核心信源'] 
  },
  { 
    title: '智能搜索生成', 
    desc: '智能搜索生成（原百度AI搜索）基于百度搜索与AI技术，可提供强大的百度搜索和智能搜索生成能力。智能搜索生成在百度搜索的基础上，通过大模型对搜索结果进行精准总结。', 
    icon: Sparkles, 
    color: 'from-emerald-500/10 to-teal-500/10', 
    tags: ['深度搜索全网结果', '模型精准总结'] 
  },
  { 
    title: '百度百科', 
    desc: '百度百科（BaiduBaike）可根据某个具体的词条内容或者词条ID（结合百度词条义项查询组件）检索百度百科的官方内容，包含摘要、图文详情等。', 
    icon: FileText, 
    color: 'from-orange-500/10 to-red-500/10', 
    tags: ['超3千万行业词条', '800万用户贡献'] 
  },
  { 
    title: '智能生成PPT', 
    desc: '智能生成PPT由百度文库、百度网盘和千帆团队共同推进运营，该分解能力为支持基于大纲内容以及上传的资源文件快速生成完整演示文档。', 
    icon: Layout, 
    color: 'from-purple-500/10 to-pink-500/10', 
    tags: ['智能大纲汇总', '文库资源沉淀'] 
  },
];

export const TOOL_SECTIONS = [
  { 
    title: '最新', 
    items: [
      { title: '应用开发 (秒哒)', author: '百度秒哒', desc: '百度应用开发 (秒哒) Skill，支持OpenClaw调用，通过自然语言对话，完成应用的创建、查看、修改、发布上线等操作，实现智能化应用开发。', tags: ['OpenClaw', 'MCP'], icon: Terminal },
      { title: '智能Query改写', author: '百度千帆官方', desc: '智能 Query 改写主要是用于理解并优化用户输入的 Query，通过进行 Query 重写与泛化拆解，提升语义匹配准确度，从而获得更相关的结果。', tags: ['图文处理与生成', 'API'], icon: MessageSquare },
      { title: '文档解析', author: '百度智能云AI开放能力', desc: '文档解析MCP是一项基于百度智能云OCR技术的文档智能解析服务，可将各类非结构化文档转化为结构化数据，支持Markdown格式输出。', tags: ['图文处理与生成', 'MCP'], icon: FileText },
      { title: '百度搜索 (MCP版)', author: '百度千帆官方', desc: '百度搜索 (BaiduSearch) 服务基于百度搜索能力与AI技术，专为生成式AI提供全网实时信息检索服务，具备海量内容站点、高权威性。', tags: ['搜索工具', 'MCP'], icon: Search },
    ]
  },
  { 
    title: '搜索工具', 
    items: [
      { title: '智能搜索生成 (高性能版)', author: '百度千帆官方', desc: '智能搜索生成高性能版为内容生产场景提供快速增强搜索回答服务，快速检索全网结果并精准总结，适用于高并发场景。', tags: ['搜索工具', 'API'], icon: Zap },
      { title: '智能搜索生成 (AI总结)', author: '百度千帆官方', desc: '智能搜索生成 (原百度AI搜索) 基于百度搜索与AI技术，可提供强大的百度搜索和智能搜索生成能力，通过大模型进行总结。', tags: ['搜索工具', 'API'], icon: Sparkles },
      { title: '百度搜索', author: '百度千帆官方', desc: '百度搜索 (BaiduSearch) 服务基于百度搜索能力与AI技术，专为生成式AI提供全网实时信息检索服务，覆盖全网海量数据。', tags: ['搜索工具', 'API'], icon: Search },
      { title: '百度百科', author: '百度千帆官方', desc: '百度百科 (BaiduBaike) 可根据某个具体的词条内容或者词条ID，检索百度百科的官方内容，获取权威的百科知识。', tags: ['知识工具', 'API'], icon: FileText },
    ]
  }
];

export const AI_ASSISTANT_SUGGESTIONS = [
  { title: '如何防范电信诈骗？', desc: '了解常见的诈骗手段和保护措施。' },
  { title: '帮我写一段 Python 代码', desc: '快速生成高质量的代码片段。' }
];
