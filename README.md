# LicenseRun - 3D驾驶网页游戏

一个基于Three.js的3D驾驶网页游戏，支持移动端和桌面端，帮助用户学习驾驶规则。

## 技术栈

- Three.js: 3D场景渲染
- Cannon.js: 物理引擎
- Vue 3: UI框架
- NippleJS: 移动端虚拟摇杆
- Vite: 构建工具

## 项目结构

```
LicenseRun/
├── src/                    # 源代码
│   ├── assets/            # 静态资源
│   │   ├── models/       # 3D模型
│   │   ├── textures/     # 贴图
│   │   └── audio/        # 音效
│   ├── components/       # Vue组件
│   ├── core/             # 核心游戏逻辑
│   │   ├── physics/     # 物理引擎相关
│   │   ├── controls/    # 控制器相关
│   │   └── scene/       # 场景管理
│   ├── utils/           # 工具函数
│   └── App.vue          # 主应用组件
├── public/               # 公共资源
├── index.html           # 入口HTML
├── package.json         # 项目配置
└── vite.config.js       # Vite配置
```

## 开发环境设置

1. 安装依赖：
```bash
npm install
```

2. 启动开发服务器：
```bash
npm run dev
```

3. 构建生产版本：
```bash
npm run build
```

## 功能特性

- 3D驾驶场景
- 移动端虚拟摇杆控制
- 桌面端键盘控制
- 物理引擎模拟
- 交通规则检测
- 多语言支持
- 响应式设计

## 浏览器支持

- Chrome (推荐)
- Firefox
- Safari
- Edge

## 移动端支持

- iOS Safari
- Android Chrome
- 支持竖屏和横屏模式

## 开发进度

当前处于第一阶段开发，正在实现基础功能与移动端控制。 