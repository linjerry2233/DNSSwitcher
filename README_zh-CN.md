# RustDNS - Windows DNS 切换工具

[English](README.md) | 中文

一款运行在 Windows 平台的本地 DNS 代理与管理工具，提供现代化的图形界面。

## 功能特性

- **多种 DNS 协议支持**：普通 UDP/TCP、DNS-over-HTTPS (DoH)、DNS-over-TLS (DoT)、DNS-over-QUIC (DoQ)
- **双工作模式**：权重分配模式 / 并发竞速模式
- **本地 LRU 缓存**：支持自定义 TTL 范围
- **实时统计面板**：总请求量、各上游请求数、延迟、缓存命中率
- **查询日志**：实时推送与过滤
- **局域网 DNS 服务**：可选择对局域网其他设备开放 DNS 服务
- **系统托盘**：后台运行

## 技术栈

- **后端**: Rust + Tauri 2.x
- **前端**: React 18 + TypeScript + Vite + Tailwind CSS + Recharts
- **目标平台**: Windows 10/11 (x86_64)

## 开发环境要求

- Rust 1.70+
- Node.js 18+
- npm 或 yarn


### 安装依赖

```bash
# 安装前端依赖
npm install

# Rust 依赖会在首次编译时自动下载
```

### 开发运行

```bash
# 启动开发模式
npm run tauri dev
```

### 构建发布

```bash
# 构建生产版本
npm run tauri build
```

构建完成后，安装包位于 `src-tauri/target/release/bundle/` 目录。

## 项目结构

```
rustdns/
├── src/                    # 前端 React 源代码
│   ├── components/        # React 组件
│   ├── hooks/             # 自定义 Hooks
│   ├── store/             # Zustand 状态管理
│   └── types/             # TypeScript 类型定义
├── src-tauri/             # Tauri/Rust 后端
│   ├── src/
│   │   ├── commands/      # Tauri 命令
│   │   ├── config/        # 配置管理
│   │   ├── dns/          # DNS 协议实现
│   │   ├── stats/        # 统计收集
│   │   └── system/       # Windows 系统集成
│   ├── icons/            # 应用图标
│   └── capabilities/     # Tauri 能力配置
├── release/               # GitHub 发布文件
└── public/               # 静态资源
```

## 配置说明

配置文件存储在 `%APPDATA%\RustDNS\config.json`。

## 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE)。

## 贡献

欢迎提交 Pull Request！
