# Plan 6 - Phase 4: UI 基础组件

> **阶段目标**: 创建 Select、Popover、DropdownMenu 基础 UI 组件
> **预估时间**: 1h
> **前置依赖**: Phase 1 完成（Radix UI 已安装）

---

## 任务上下文

日历视图功能需要以下 UI 组件：

1. **Select** - 用于优先级下拉选择（High/Medium/Low）
2. **Popover** - 用于日期选择器弹出层
3. **DropdownMenu** - 用于任务操作菜单（编辑/删除）

这些组件基于 Radix UI 原语封装，遵循项目现有的 Tailwind + Radix 设计模式。

---

## 现有代码参考

参考项目中现有的 UI 组件风格：

**文件**: `packages/frontend/src/components/ui/button.tsx`
**文件**: `packages/frontend/src/components/ui/sheet.tsx`

设计原则：
- 使用 `cn()` 函数合并 Tailwind 类名
- 使用 `forwardRef` 转发 ref
- 遵循 Radix UI 的组合式 API 设计

---

## 任务清单

### 1. 创建 Select 组件

**文件**: `packages/frontend/src/components/ui/select.tsx`

基于 `@radix-ui/react-select` 封装：

```typescript
import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

// SelectContent, SelectItem, SelectLabel 等子组件...
// 完整实现参考 shadcn/ui select 组件
```

### 2. 创建 Popover 组件

**文件**: `packages/frontend/src/components/ui/popover.tsx`

基于 `@radix-ui/react-popover` 封装：

```typescript
import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cn } from '@/lib/utils'

const Popover = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
```

### 3. 创建 DropdownMenu 组件

**文件**: `packages/frontend/src/components/ui/dropdown-menu.tsx`

基于 `@radix-ui/react-dropdown-menu` 封装：

```typescript
import * as React from 'react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { Check, ChevronRight, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

const DropdownMenu = DropdownMenuPrimitive.Root
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
const DropdownMenuGroup = DropdownMenuPrimitive.Group
const DropdownMenuPortal = DropdownMenuPrimitive.Portal
const DropdownMenuSub = DropdownMenuPrimitive.Sub
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      inset && 'pl-8',
      className
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

// DropdownMenuLabel, DropdownMenuSeparator 等子组件...
// 完整实现参考 shadcn/ui dropdown-menu 组件

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  // ...其他导出
}
```

### 4. 更新组件导出

**文件**: `packages/frontend/src/components/ui/index.ts`

```typescript
export * from './select'
export * from './popover'
export * from './dropdown-menu'
```

---

## 设计规范

### 样式约定

- 使用 Tailwind CSS 变量（`--background`, `--foreground`, `--primary` 等）
- 动画使用 Tailwind `animate-in` / `animate-out` 类
- 圆角统一使用 `rounded-md`
- 边框使用 `border-input` 颜色

### 可访问性

- 所有交互组件支持键盘导航
- 正确设置 `aria-*` 属性
- 支持焦点指示器（`focus:ring-2`）

---

## 验收标准

- [x] Select 组件支持单选、分组、禁用状态
- [x] Popover 组件支持定位、偏移、动画
- [x] DropdownMenu 组件支持嵌套菜单、分隔符、标签
- [x] 所有组件样式与现有 UI 一致
- [x] 组件可从 `@/components/ui` 正确导入

## 实施记录

**完成时间**: 2026-03-13

**实施内容**:
1. 创建 `select.tsx` - 10 个子组件
2. 创建 `popover.tsx` - 4 个子组件
3. 创建 `dropdown-menu.tsx` - 14 个子组件
4. 更新 `index.ts` 导出所有新组件

**测试覆盖**:
- `popover.test.tsx`: 13 tests ✅
- `select.test.tsx`: 13 tests ✅
- `dropdown-menu.test.tsx`: 20 tests ✅
- **总计**: 46 tests passed

**技术要点**:
- 使用 `React.forwardRef` 转发 ref
- 使用 `cn()` 合并 Tailwind 类名
- 遵循 Radix UI 组合式 API 设计
- 所有组件支持键盘导航和可访问性

---

## 后续阶段

完成后进入 **Phase 5: React Query Hooks**