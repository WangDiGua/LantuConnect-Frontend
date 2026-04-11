/**
 * 通用组件导出
 * 
 * 本文件统一导出 src/components/common/ 目录下的所有通用组件。
 * 这些组件具有高复用性，不包含特定业务逻辑，可在多个页面中复用。
 * 
 * 业务组件位于 src/components/business/ 目录
 * MCP 组件位于 src/components/mcp/ 目录
 */

// 数据表格 - 支持排序、分页、行操作的通用表格组件
export { DataTable } from './DataTable';
export type { Column, RowAction, DataTableProps } from './DataTable';

// 搜索输入框 - 带防抖的搜索输入组件
export { SearchInput } from './SearchInput';
export type { SearchInputProps } from './SearchInput';

// 筛选选择器 - 下拉筛选组件，支持单选/多选
export { FilterSelect } from './FilterSelect';
export type { FilterOption, FilterSelectProps } from './FilterSelect';

// 蓝图选择器 - 统一样式的下拉选择组件
export { LantuSelect } from './LantuSelect';
export type { LantuSelectOption, LantuSelectProps } from './LantuSelect';

// 进度条 - 线性进度指示器
export { ProgressBar } from './ProgressBar';
export type { ProgressBarProps } from './ProgressBar';

// 倒计时器 - 时间倒计时显示组件
export { CountdownTimer } from './CountdownTimer';
export type { CountdownTimerProps } from './CountdownTimer';

// 状态徽章 - 显示资源状态的彩色徽章
export { StatusBadge } from './StatusBadge';
export type { StatusType, BadgeSize, StatusBadgeProps } from './StatusBadge';

// 消息提示 - 全局消息提示 Provider 和 Hook
export { MessageProvider, useMessage } from './Message';
export type { MessageType } from './Message';

// 分页器 - 列表分页导航组件
export { Pagination } from './Pagination';
export type { PaginationProps } from './Pagination';

// 错误边界 - React 错误捕获组件
export { ErrorBoundary } from './ErrorBoundary';

// 页面错误 - 全屏错误展示组件
export { PageError } from './PageError';
export type { PageErrorProps } from './PageError';

// 空状态 - 无数据时的占位展示
export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

// 确认对话框 - 二次确认弹窗
export { ConfirmDialog } from './ConfirmDialog';
export type { ConfirmDialogProps } from './ConfirmDialog';

// 模态框 - 通用弹窗容器
export { Modal } from './Modal';
export type { ModalProps } from './Modal';

// 按钮 - 统一样式的按钮组件
export { Button } from './Button';
export type { ButtonProps, ButtonVariant } from './Button';

// 页面骨架屏 - 加载占位骨架
export { PageSkeleton } from './PageSkeleton';

// 内容加载器 - 局部加载指示器
export { ContentLoader } from './ContentLoader';

// 启动画面 - 应用启动时的加载画面
export { SplashScreen } from './SplashScreen';

// Logo - 应用品牌标识组件
export { Logo, APP_BRAND_NAME } from './Logo';

// 表格单元格省略 - 长文本省略显示
export { TableCellEllipsis } from './TableCellEllipsis';
export type { TableCellEllipsisProps } from './TableCellEllipsis';
