# Solana Smart Money Wallet Monitor

实时监控Solana链上智能钱包的交易活动，包括：
- 交易类型（买入/卖出）
- 交易代币信息
- 交易数量
- 交易时间
- 代币合约地址

## 功能特点

- 实时监控多个钱包地址
- 自动识别交易类型
- 解析代币信息
- 格式化输出交易详情
- 支持SPL代币交易监控
- 钉钉机器人通知

## 安装

```bash
# 克隆项目
git clone [your-repository-url]
cd solana-wallet-monitor

# 安装依赖
npm install
```

## 配置

1. 复制`.env.example`文件为`.env`（如果没有则创建）
2. 在`.env`文件中配置以下内容：

```env
# Solana RPC节点URL
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# 要监控的钱包地址（用逗号分隔）
WALLET_ADDRESSES=address1,address2,address3

# 钉钉机器人Webhook地址
DING_WEBHOOK=your_dingtalk_webhook_url_here
```

### 钉钉机器人配置

1. 在钉钉群中添加自定义机器人
2. 获取机器人的Webhook地址
3. 将Webhook地址配置到`.env`文件的`DING_WEBHOOK`字段中

## 使用方法

```bash
# 启动监控
npm start

# 开发模式启动（自动重启）
npm run dev
```

## 输出示例

```
智能钱包监控提醒
------------------------
钱包地址: [wallet_address]
操作类型: 买入
代币名称: Token Name
代币地址: [token_address]
交易数量: 1000
时间: 2023-12-20 10:30:45
------------------------
```

## 通知说明

- 每次检测到交易时会同时：
  1. 在控制台输出交易信息
  2. 通过钉钉机器人发送通知

## 注意事项

1. 确保提供的RPC节点URL可用且稳定
2. 监控多个钱包地址时会增加RPC请求频率
3. 建议使用私有RPC节点以获得更好的性能
4. 部分代币信息可能显示为"Unknown"，这是正常现象
5. 请确保钉钉机器人的Webhook地址正确且有效

## 技术栈

- Node.js
- @solana/web3.js
- @solana/spl-token
- dotenv
- node-fetch (用于钉钉通知)

## 贡献

欢迎提交Issue和Pull Request来改进项目。

## 许可证

ISC
