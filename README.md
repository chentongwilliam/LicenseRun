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

# LicenseRun 车辆参数JSON说明

本项目支持通过JSON文件自定义和加载像素风格小车。你可以通过修改JSON文件，快速生成不同颜色、尺寸、风格的车辆。

## 车辆参数JSON结构

```json
{
  "name": "PixelCar", // 车型名称
  "body": {
    "size": [宽, 高, 长], // 车身尺寸，单位：米
    "position": [x, y, z], // 车身中心点在三维空间的位置
    "color": "#RRGGBB" // 车身颜色（16进制RGB）
  },
  "chassis": {
    "size": [宽, 高, 长],
    "position": [x, y, z],
    "color": "#RRGGBB"
  },
  "arch": [ // 轮拱（数组，四个）
    { "size": [宽, 高, 厚], "position": [x, y, z], "color": "#RRGGBB" },
    ...
  ],
  "roof": { "size": [宽, 高, 长], "position": [x, y, z], "color": "#RRGGBB" },
  "hood": { "size": [宽, 高, 长], "position": [x, y, z], "color": "#RRGGBB" },
  "trunk": { "size": [宽, 高, 长], "position": [x, y, z], "color": "#RRGGBB" },
  "bumpers": [ // 前后保险杠
    { "size": [宽, 高, 厚], "position": [x, y, z], "color": "#RRGGBB" },
    ...
  ],
  "wheel": {
    "radius": 半径, // 轮胎半径，单位：米
    "width": 宽度, // 轮胎宽度，单位：米
    "color": "#RRGGBB"
  },
  "headlight": [ // 大灯（数组，通常2个）
    { "radius": 半径, "height": 厚度, "position": [x, y, z], "color": "#RRGGBB" },
    ...
  ],
  "taillight": [ // 尾灯（数组，通常2个）
    { "size": [宽, 高, 厚], "position": [x, y, z], "color": "#RRGGBB" },
    ...
  ],
  "window": [ // 所有窗户（数组）
    { "size": [宽, 高, 厚], "position": [x, y, z], "color": "#RRGGBB", "opacity": 透明度(0-1) },
    ...
  ],
  "mirror": [ // 后视镜（数组，通常2个）
    { "size": [宽, 高, 厚], "position": [x, y, z], "color": "#RRGGBB" },
    ...
  ]
}
```

## 字段说明
- `size`：三维尺寸，单位为米（如[1.5, 0.7, 4]表示宽1.5米，高0.7米，长4米）
- `position`：部件中心点在车体坐标系中的位置，单位为米
- `color`：部件颜色，16进制RGB字符串（如`#3ec6f3`）
- `opacity`：透明度，0为完全透明，1为不透明（窗户可用）
- `radius`/`height`：圆柱体部件（如轮胎、大灯）用

## 使用方法
1. 修改`src/core/physics/CarConfig.sample.json`，调整任意参数即可生成不同外观的车。
2. 你可以复制多份json，做出不同车型。
3. 代码会自动读取所有参数，无需改动代码。

## 常见问题
- 如果某个部件不显示，请检查`size`和`position`是否填写正确。
- 你可以通过调整`position`让部件对齐或错开。
- 轮胎的动画和转向逻辑已自动处理，无需在json中配置。

## 示例
见`src/core/physics/CarConfig.sample.json`。

---
如有更多自定义需求，欢迎随时提问！ 