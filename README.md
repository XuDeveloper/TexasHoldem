# 🃏 Texas Hold'em Online Poker

和朋友一起在线玩德州扑克！支持 AI 对手，经典赌场主题。

## 🚀 快速启动 (一键全自动)

不论是新电脑还是新成员，**无需任何前置配置**，只需运行启动脚本即可：

```bash
# 推荐：一键全自动安装环境并启动
./start.sh

# 或者（等同于 ./start.sh）
npm start
```

**`start.sh` 脚本为你做了什么？**
1. **自动检查环境**：如果没有 Node.js 或 npm，会自动下载 NVM 并安装 LTS 版本的 Node.js。
2. **自动安装依赖**：每次运行都会自动执行 `npm install` 确保包版本和当前代码一致。
3. **自动清理端口**：如果之前有残留的服务器进程占用了 3000 端口，会自动帮你强制清理，杜绝 `EADDRINUSE` 报错。
4. **自动构建启动**：打包构建前端，启动后端服务器。

启动完成后，你的终端会显示：`🃏 Texas Hold'em server running on http://localhost:3000`。
只需在浏览器打开这个地址即可开始游戏！在控制台输入 `shutdown` 或者按 `Ctrl+C` 即可优雅关闭服务器。

## 开发模式

```bash
# 终端 1：启动后端（支持热重载）
npm run dev:server

# 终端 2：启动前端（Vite 热更新）
npm run dev:client
```

## 运行测试

```bash
npm test            # 运行所有测试
npm run test:watch  # 监听模式
```

## 功能特性

- 🎮 创建房间，分享 6 位房间码，邀请朋友加入
- 🤖 AI 对手（规则驱动策略）
- 💰 完整德州扑克规则（盲注、翻牌/转牌/河牌、边池）
- ⏱️ 30 秒回合计时器
- 💬 房间内聊天
- 🔄 断线重连
- 🎨 经典赌场主题（深绿毛毡 + 金色点缀）

## 技术栈

- **Frontend**: Vite + Vanilla HTML/CSS/JS
- **Backend**: Node.js + Express + Socket.io
- **Testing**: Vitest（83 个单元测试）
