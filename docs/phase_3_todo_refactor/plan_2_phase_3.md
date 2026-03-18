# Plan 2 Phase 3: 列头组件重构

> **文档版本**: v1.0
> **创建日期**: 2026-03-18
> **所属计划**: Plan 2 - Todo 模块增强
> **前置阶段**: Phase 2 - 面板宽度边界处理
> **预估时间**: 2-3h

---

## 一、计划背景

### 1.1 总体目标

在 Plan 1 实现的三面板界面基础上，新增两个增强功能：

| 功能 | 目标 |
|------|------|
| **面板可调整宽度** | 用户可通过拖拽分隔条调整 Inbox、Planner、Board 面板宽度，宽度持久化到 localStorage |
| **看板列管理** | 支持新建列、重命名、更改颜色、删除列，删除时自动迁移任务到 Inbox |

### 1.2 本阶段目标

**将 BoardColumnDroppable 的列头抽取为独立组件 `ColumnHeader`**

---

## 二、交互设计

### 2.1 列头菜单

**触发方式**：Hover 列头时显示设置按钮（`MoreHorizontal` 或 `Settings` 图标）

```
┌─────────────────────────────────┐
│  ● Todo                    [⋮] │  ← Hover 时显示按钮
└─────────────────────────────────┘
                                  ↓ 点击
                            ┌──────────────┐
                            │ Rename       │
                            │ Change Color │
                            │──────────────│
                            │ Delete       │  ← 红色
                            └──────────────┘
```

**Popover 交互规范（极简风格）**：
- **禁止遮罩**：展开时底层的 BoardPanel 不添加任何深色遮罩（Overlay）或模糊效果（Blur）
- **层级区分**：仅通过 `shadow-md` 阴影区分层级
- **关闭方式**：点击外部区域（Click outside）即刻静默关闭
- **目的**：保持轻量级的气泡菜单体验，避免打断用户视觉焦点

### 2.2 内联重命名

**触发方式**：双击列头文字区域

```
┌─────────────────────────────────┐
│  ● [_______________]       3   │  ← Input 聚焦，全选文字
└─────────────────────────────────┘
```

**行为**：
- Enter 或失焦：保存修改
- Escape：取消修改

---

## 三、技术实现

### 3.1 ColumnHeader 组件签名

```typescript
interface ColumnHeaderProps {
  column: BoardColumn
  itemCount: number
  onRename: (name: string) => void
  onColorChange: (color: string | null) => void
  onDelete: () => void
  isEditing?: boolean
  onStartEdit?: () => void
  onEndEdit?: () => void
}
```

### 3.2 Popover 极简交互实现

```typescript
// 列头菜单 Popover 配置
<Popover>
  <PopoverTrigger asChild>
    <button className="opacity-0 group-hover:opacity-100">
      <MoreHorizontal className="w-4 h-4" />
    </button>
  </PopoverTrigger>
  <PopoverContent
    className="w-48 p-1 shadow-md"  // 仅阴影，无遮罩
    // 不要设置 modal={true}，保持轻量气泡体验
  >
    {/* 菜单项 */}
  </PopoverContent>
</Popover>
```

> **交互规范**：
> - 无 Overlay/Blur 背景
> - 仅 `shadow-md` 区分层级
> - 点击外部静默关闭（Radix Popover 默认行为）

### 3.3 内联编辑实现要点

```typescript
// 双击进入编辑模式
<div onDoubleClick={handleStartEdit}>
  {isEditing ? (
    <input
      ref={inputRef}
      defaultValue={column.name}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className="w-full px-1 py-0.5 text-sm font-medium"
    />
  ) : (
    <span>{column.name}</span>
  )}
</div>
```

**关键行为**：
- 进入编辑模式时自动聚焦
- 全选文字（`inputRef.current?.select()`）
- Enter 保存
- Escape 取消
- 失焦保存

---

## 四、任务清单

### 4.1 创建 ColumnHeader 组件

**文件路径**: `packages/frontend/src/features/todos/ColumnHeader.tsx`

**实现内容**：
1. 显示列名和计数
2. 颜色指示器（圆点）
3. Hover 显示设置按钮
4. 双击进入编辑模式

### 4.2 实现内联重命名

**行为规范**：
- Input 自动聚焦和全选
- Enter 保存、Escape 取消
- 失焦保存

### 4.3 实现 Popover 菜单

**菜单项**：
- 重命名选项
- 更改颜色选项（跳转到 Phase 4 实现）
- 删除选项（红色警示）

### 4.4 更新 BoardColumnDroppable

**文件路径**: `packages/frontend/src/features/todos/BoardColumnDroppable.tsx`

**修改内容**：
- 引入新的 `ColumnHeader` 组件
- 传递必要的 props
- 移除原有的列头代码

---

## 五、文件变更清单

| 操作 | 文件路径 | 用途 |
|------|----------|------|
| 新建 | `packages/frontend/src/features/todos/ColumnHeader.tsx` | 列头组件（含菜单、重命名） |
| 修改 | `packages/frontend/src/features/todos/BoardColumnDroppable.tsx` | 使用新的 ColumnHeader，支持背景色 |

---

## 六、依赖说明

### 6.1 现有依赖（无需新增）

| 依赖 | 用途 |
|------|------|
| `@radix-ui/react-popover` | 列头菜单弹出 |
| `@radix-ui/react-dropdown-menu` | 菜单项 |
| `lucide-react` | 图标（Settings, MoreHorizontal 等） |

---

## 七、验收标准

- [ ] Hover 列头显示设置按钮
- [ ] 双击可编辑列名
- [ ] Enter 保存、Escape 取消
- [ ] 菜单正确显示所有选项
- [ ] 删除选项显示为红色警示

---

## 八、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 编辑模式与拖拽冲突 | 编辑时拖拽导致意外行为 | 编辑模式下禁用拖拽 |

---

## 九、后续阶段

完成本阶段后，进入：
- **Phase 4**: 颜色选择器（实现预设颜色选择功能）