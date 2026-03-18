# Plan 2 Phase 4: 颜色选择器

> **文档版本**: v1.0
> **创建日期**: 2026-03-18
> **所属计划**: Plan 2 - Todo 模块增强
> **前置阶段**: Phase 3 - 列头组件重构
> **预估时间**: 1-2h

---

## 一、计划背景

### 1.1 总体目标

在 Plan 1 实现的三面板界面基础上，新增两个增强功能：

| 功能 | 目标 |
|------|------|
| **面板可调整宽度** | 用户可通过拖拽分隔条调整 Inbox、Planner、Board 面板宽度，宽度持久化到 localStorage |
| **看板列管理** | 支持新建列、重命名、更改颜色、删除列，删除时自动迁移任务到 Inbox |

### 1.2 本阶段目标

**实现预设颜色选择功能，允许用户更改看板列的背景颜色**

---

## 二、交互设计

### 2.1 颜色选择器 UI

```
┌───────────────────────────────┐
│ Column Color                  │
├───────────────────────────────┤
│  ○     ○     ○     ○     ○   │  ← 颜色圆点选择器
│ Gray Blue Grn Yell Prpl Pink  │
└───────────────────────────────┘
```

**交互流程**：
1. 点击列头菜单中的 "Change Color"
2. 弹出颜色选择器
3. 点击颜色圆点选择颜色
4. 立即应用颜色到列背景

### 2.2 预设颜色（柔和色调）

| 颜色名 | Hex 值 | Tailwind 类 | 用途 |
|--------|--------|-------------|------|
| Gray | `#E5E7EB` | `bg-gray-200` | 默认/中性 |
| Blue | `#DBEAFE` | `bg-blue-100` | 进行中 |
| Green | `#D1FAE5` | `bg-green-100` | 完成 |
| Yellow | `#FEF3C7` | `bg-yellow-100` | 警告/待处理 |
| Purple | `#EDE9FE` | `bg-purple-100` | 特殊标记 |
| Pink | `#FCE7F3` | `bg-pink-100` | 高优先级 |

---

## 三、技术实现

### 3.1 后端数据模型确认

**`color` 字段已存在**：
- `packages/backend/src/entities/BoardColumn.entity.ts`：
  ```typescript
  @Column({ type: 'text', nullable: true })
  color!: string | null
  ```
- `packages/shared/src/schemas/boardColumn.ts`：
  ```typescript
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable()
  ```

> **注意**：Plan 1 已包含 `color` 字段，无需额外数据库迁移。本计划只需实现前端颜色选择与更新逻辑。

### 3.2 ColorPicker 组件实现

```typescript
// packages/frontend/src/features/todos/ColorPicker.tsx
import { cn } from '@/lib/utils'

const PRESET_COLORS = [
  { name: 'Gray', value: '#E5E7EB', bgClass: 'bg-gray-200' },
  { name: 'Blue', value: '#DBEAFE', bgClass: 'bg-blue-100' },
  { name: 'Green', value: '#D1FAE5', bgClass: 'bg-green-100' },
  { name: 'Yellow', value: '#FEF3C7', bgClass: 'bg-yellow-100' },
  { name: 'Purple', value: '#EDE9FE', bgClass: 'bg-purple-100' },
  { name: 'Pink', value: '#FCE7F3', bgClass: 'bg-pink-100' },
]

interface ColorPickerProps {
  value: string | null
  onChange: (color: string | null) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex gap-2 p-2">
      {PRESET_COLORS.map((color) => (
        <button
          key={color.value}
          onClick={() => onChange(color.value === value ? null : color.value)}
          className={cn(
            "w-6 h-6 rounded-full border-2 transition-all",
            color.bgClass,
            value === color.value
              ? "border-primary ring-2 ring-primary/20"
              : "border-transparent hover:border-gray-300"
          )}
          title={color.name}
        />
      ))}
    </div>
  )
}
```

### 3.3 集成到列头菜单

```typescript
// 在 ColumnHeader 的 Popover 菜单中
<DropdownMenu>
  <DropdownMenuItem onSelect={() => setShowColorPicker(true)}>
    Change Color
  </DropdownMenuItem>
</DropdownMenu>

// 颜色选择器弹窗
{showColorPicker && (
  <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
    <PopoverContent>
      <ColorPicker
        value={column.color}
        onChange={(color) => {
          onColorChange(color)
          setShowColorPicker(false)
        }}
      />
    </PopoverContent>
  </Popover>
)}
```

### 3.4 更新 BoardColumnDroppable 支持背景色

```typescript
// BoardColumnDroppable.tsx
<div
  className={cn(
    "flex flex-col h-full rounded-lg",
    column.color ? `bg-[${column.color}]` : "bg-muted/30"
  )}
>
  {/* 列内容 */}
</div>
```

**颜色指示器样式**：
```typescript
// 在 ColumnHeader 中显示颜色圆点
<div
  className={cn(
    "w-3 h-3 rounded-full",
    column.color ? `bg-[${column.color}]` : "bg-gray-300"
  )}
/>
```

---

## 四、任务清单

### 4.1 创建 ColorPicker 组件

**文件路径**: `packages/frontend/src/features/todos/ColorPicker.tsx`

**实现内容**：
- 6 个预设颜色圆点
- 当前选中状态（ring 效果）
- 点击选择颜色
- 支持取消选择（点击已选中的颜色）

### 4.2 集成到列头菜单

**修改文件**: `packages/frontend/src/features/todos/ColumnHeader.tsx`

**实现内容**：
- 点击 "Change Color" 显示颜色选择器
- 选择后立即更新列颜色
- 调用 `useUpdateBoardColumnMutation`

### 4.3 更新 BoardColumnDroppable

**修改文件**: `packages/frontend/src/features/todos/BoardColumnDroppable.tsx`

**实现内容**：
- 列背景色支持
- 传递颜色给 ColumnHeader 的颜色指示器

---

## 五、文件变更清单

| 操作 | 文件路径 | 用途 |
|------|----------|------|
| 新建 | `packages/frontend/src/features/todos/ColorPicker.tsx` | 颜色选择器组件 |
| 修改 | `packages/frontend/src/features/todos/ColumnHeader.tsx` | 集成颜色选择器 |
| 修改 | `packages/frontend/src/features/todos/BoardColumnDroppable.tsx` | 列背景色支持 |

---

## 六、依赖说明

### 6.1 现有依赖（无需新增）

| 依赖 | 用途 |
|------|------|
| `@radix-ui/react-popover` | 颜色选择器弹窗 |
| `@nanomail/shared` | BoardColumn 类型定义 |

---

## 七、验收标准

- [ ] 可选择 6 种预设颜色
- [ ] 颜色立即应用到列背景
- [ ] 点击已选中颜色可取消选择
- [ ] 颜色持久化到数据库

---

## 八、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 颜色对比度问题 | 文字难以辨认 | 预设颜色经过对比度测试，确保在白色文字下可读 |

---

## 九、后续阶段

完成本阶段后，进入：
- **Phase 5**: 新建列功能（实现添加新列功能）