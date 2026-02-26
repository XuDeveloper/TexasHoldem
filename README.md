# 🃏 Texas Hold'em Online Poker

和朋友一起在线玩德州扑克！支持 AI 对手，经典赌场主题。

## 快速启动

```bash
# 安装依赖
npm install

# 一键启动（构建前端 + 启动服务器）
npm start

# 或者使用脚本
./start.sh
```

启动后打开 **http://localhost:3000** 即可开始游戏。

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
