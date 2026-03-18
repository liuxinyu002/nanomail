# NanoMail 设计系统规范

> 本文档定义 NanoMail 前端界面的设计标准，供编码 Agent 参考。

---

## 1. 设计风格 (Design Style)

### 1.1 核心风格定位

| 风格 | 说明 |
|------|------|
| **现代极简风** | 界面干净，无多余装饰，大量使用留白（Whitespace） |
| **AI/SaaS 工具风** | 专业、高效的生产力工具定位 |
| **轻量级卡片式设计** | 内容以卡片形式承载，视觉层次清晰 |

### 1.2 亲和力与微趣味元素

**应用场景（克制使用）：**

| 场景 | 说明 |
|------|------|
| 空状态 (Empty States) | "无新邮件"、"Todos已清空" 等 |
| 错误/成功提示 | 操作反馈页面 |
| 欢迎/引导页 | 首次进入的用户引导 |

**禁止使用插画的主界面：**
- 邮件列表
- Todo 看板主操作区

**插画资源：**
- MVP 阶段使用开源插画库（如 unDraw），调整为主打色系
- 不定制插画，避免开发成本

---

## 2. 主题颜色 (Color Palette)

### 2.1 品牌色

| 用途 | Tailwind 类名 | 色值 | 说明 |
|------|---------------|------|------|
| **核心主色** | `blue-600` | `#2563EB` | 主要按钮、激活态 Tab、重要链接 |
| **极浅变体** | `blue-50` | `#EFF6FF` | Hover 背景、选中高亮背景 |

**使用原则：**
- 主色仅用于**强引导交互**
- 非激活图标、边框、分割线使用灰色系（gray-200/400）
- 避免滥用主色，保持视觉焦点在文字内容

### 2.2 背景色

| 用途 | Tailwind 类名 | 色值 | 说明 |
|------|---------------|------|------|
| 全局背景 | `gray-50` | `#F9FAFB` | 浅冷灰，承载整体页面 |
| 卡片/输入框背景 | `white` | `#FFFFFF` | 纯白，与全局背景形成层次 |

### 2.3 文字颜色

| 用途 | Tailwind 类名 | 色值 | 说明 |
|------|---------------|------|------|
| 主标题 | `gray-900` | `#111827` | 深黑灰，最高对比度 |
| 副标题/提示文字 | `gray-500` | `#6B7280` | 中灰，降低视觉权重 |
| 边框/分割线 | `gray-200` | `#E5E7EB` | 极浅灰，轻量分隔 |

### 2.4 状态色

| 状态 | 实现方式 | 说明 |
|------|----------|------|
| **禁用背景** | `gray-100` 或 `opacity-50` | 略深于全局背景，或直接透明度 |
| **禁用文字** | `gray-400` + 划线 | 用于已完成的 Todo 项 |
| **禁用交互** | `cursor-not-allowed` | 统一鼠标样式 |

### 2.5 Tailwind CSS 变量映射

项目使用 Tailwind CSS v4，CSS 变量定义于 `packages/frontend/src/index.css`：

```css
/* 主要变量 */
--primary: 221.2 83.2% 53.3%;     /* 对应 blue-600 */
--background: 0 0% 100%;           /* 纯白 */
--foreground: 222.2 84% 4.9%;      /* 对应 gray-900 */
--muted-foreground: 215.4 16.3% 46.9%; /* 对应 gray-500 */
--border: 214.3 31.8% 91.4%;       /* 对应 gray-200 */
```

---

## 3. 交互动画 (Interaction & Animation)

### 3.1 下拉菜单规范

**禁止使用弹出框 (Modal/Dialog) 显示简单操作列表，优先使用下拉菜单。**

### 3.2 动画参数

| 阶段 | 效果 | 时长 | 缓动 |
|------|------|------|------|
| **进入 (Enter)** | 透明度淡入 (opacity 0→100) | `150ms` | `ease-out` |
| **退出 (Leave)** | 透明度淡出 (opacity 100→0) | `100ms` | `ease-in` |

**注意：** 不使用缩放 (scale) 效果，保持克制。

### 3.3 下拉列表 UI 样式

| 属性 | 值 | Tailwind 类名 |
|------|-----|---------------|
| 背景 | 纯白 | `bg-white` |
| 边框 | 浅灰边框 | `border border-gray-200` |
| 阴影 | 柔和大阴影 | `shadow-lg` |
| 圆角 | 适中圆角 | `rounded-md` 或 `rounded-lg` |

### 3.4 交互细节

- **点击外部关闭：** 必须支持 Click Outside 关闭下拉列表
- **列表项 Hover：**
  - 背景色：`gray-50`（中性克制）
  - 文字保持深色
  - 确保触感反馈

### 3.5 实现参考

```tsx
// 下拉菜单组件示例
<div className="bg-white border border-gray-200 rounded-md shadow-lg
                animate-in fade-in duration-150 ease-out
                animate-out fade-out duration-100 ease-in">
  {items.map(item => (
    <button
      className="w-full px-3 py-2 text-left text-gray-900
                 hover:bg-gray-50 transition-colors"
      onClick={item.onClick}
    >
      {item.label}
    </button>
  ))}
</div>
```

---

## 4. 排版规范 (Typography)

| 元素 | 样式 |
|------|------|
| 字体 | `system-ui, -apple-system, sans-serif` |
| 主标题 | `text-gray-900 font-semibold` |
| 正文 | `text-gray-900` |
| 提示文字 | `text-gray-500 text-sm` |

---

## 5. 开发检查清单

编码 Agent 在实现界面时，需确保：

- [ ] 主色仅用于强引导交互（主要按钮、激活态、重要链接）
- [ ] 下拉菜单使用纯透明度动画，无缩放
- [ ] 下拉菜单项 Hover 使用 `gray-50`，而非 `blue-50`
- [ ] 禁用态复用灰色系 + `cursor-not-allowed`
- [ ] 主界面（邮件列表、Todo看板）不使用插画装饰
- [ ] 顶部用户头像作为下拉触发点，非纯装饰