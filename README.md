# RustDNS - DNS Switcher for Windows

[English](README.md) | [中文](README_zh-CN.md)

A local DNS proxy and management tool for Windows platform with modern UI.

## Features

- **Multiple DNS Protocols**: Plain UDP/TCP, DNS-over-HTTPS (DoH), DNS-over-TLS (DoT), DNS-over-QUIC (DoQ)
- **Dual Work Modes**: Weighted Round Robin mode / Concurrent Racing mode
- **Local LRU Cache**: With customizable TTL range
- **Real-time Statistics Dashboard**: Total queries, per-upstream stats, latency, cache hit rate
- **Query Logs**: Real-time push with filtering capabilities
- **LAN DNS Server**: Optional DNS service open to other devices on local network
- **System Tray**: Runs in background with system tray support

## Tech Stack

- **Backend**: Rust + Tauri 2.x
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Recharts
- **Target Platform**: Windows 10/11 (x86_64)

## Prerequisites

- Rust 1.70+
- Node.js 18+
- npm or yarn

## Getting Started


### Install dependencies

```bash
# Install frontend dependencies
npm install

# Rust dependencies will be downloaded automatically during first build
```

### Development

```bash
# Start development mode
npm run tauri dev
```

### Build

```bash
# Build production version
npm run tauri build
```

The installer will be located in `src-tauri/target/release/bundle/` after build.

## Project Structure

```
rustdns/
├── src/                    # Frontend React source
│   ├── components/         # React components
│   ├── hooks/             # Custom hooks
│   ├── store/             # Zustand state store
│   └── types/             # TypeScript types
├── src-tauri/             # Tauri/Rust backend
│   ├── src/
│   │   ├── commands/      # Tauri commands
│   │   ├── config/        # Configuration management
│   │   ├── dns/          # DNS protocol implementations
│   │   ├── stats/        # Statistics collection
│   │   └── system/       # Windows system integration
│   ├── icons/            # App icons
│   └── capabilities/     # Tauri capabilities
├── release/               # Files for GitHub release
└── public/               # Static assets
```

## Configuration

Configuration file is stored at `%APPDATA%\RustDNS\config.json`.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
