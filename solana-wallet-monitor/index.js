const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const { ding } = require('./ding');
require('dotenv').config();

// 连接到Solana主网
const connection = new Connection(
    process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    'confirmed'
);

// 从环境变量获取钱包地址
const WALLET_ADDRESSES = (process.env.WALLET_ADDRESSES || '').split(',').filter(Boolean);

// SPL Token 转账指令数据布局
const TOKEN_TRANSFER_LAYOUT = {
    TRANSFER: 3,            // Transfer instruction
    TRANSFER_CHECKED: 12,   // TransferChecked instruction
};

// 解析交易类型
async function parseTransactionType(transaction, walletAddress) {
    try {
        const { instructions, message } = transaction.transaction;
        if (!message.accountKeys || !instructions) return { type: 'unknown', amount: 0, tokenAddress: null };

        const walletPubkey = new PublicKey(walletAddress);
        let type = 'unknown';
        let amount = 0;
        let tokenAddress = null;

        for (const ix of message.instructions) {
            const programId = message.accountKeys[ix.programId];
            
            // 检查是否是Token程序交易
            if (programId.equals(TOKEN_PROGRAM_ID)) {
                const data = Buffer.from(ix.data, 'base64');
                const instruction = data[0]; // 第一个字节是指令类型

                if (instruction === TOKEN_TRANSFER_LAYOUT.TRANSFER || 
                    instruction === TOKEN_TRANSFER_LAYOUT.TRANSFER_CHECKED) {
                    
                    const sourceAccount = message.accountKeys[ix.accounts[0]];
                    const destAccount = message.accountKeys[ix.accounts[1]];
                    
                    // 获取token地址
                    tokenAddress = message.accountKeys[ix.accounts[1]].toBase58();
                    
                    // 判断交易方向
                    if (sourceAccount.equals(walletPubkey)) {
                        type = 'sell';
                    } else if (destAccount.equals(walletPubkey)) {
                        type = 'buy';
                    }

                    // 解析金额
                    if (instruction === TOKEN_TRANSFER_LAYOUT.TRANSFER) {
                        amount = data.readBigUInt64LE(1);
                    } else {
                        amount = data.readBigUInt64LE(1);
                    }
                }
            }
        }

        return { type, amount: Number(amount), tokenAddress };
    } catch (error) {
        console.error('Error parsing transaction type:', error);
        return { type: 'unknown', amount: 0, tokenAddress: null };
    }
}

// 获取Token信息
async function getTokenInfo(tokenAddress) {
    try {
        // 获取token账户信息
        const tokenAccount = await connection.getParsedAccountInfo(new PublicKey(tokenAddress));
        
        if (tokenAccount.value?.data?.parsed?.info) {
            const { mint, tokenAmount } = tokenAccount.value.data.parsed.info;
            return {
                name: 'Unknown Token', // 这里可以集成其他API来获取token名称
                address: mint,
                decimals: tokenAmount.decimals
            };
        }
        
        return {
            name: 'Unknown Token',
            address: tokenAddress,
            decimals: 0
        };
    } catch (error) {
        console.error('Error getting token info:', error);
        return null;
    }
}

// 格式化输出
function formatOutput(type, amount, tokenInfo, timestamp, walletAddress) {
    const operation = type === 'buy' ? '买入' : type === 'sell' ? '卖出' : '未知操作';
    const tokenAmount = tokenInfo?.decimals ? 
        (amount / Math.pow(10, tokenInfo.decimals)).toFixed(tokenInfo.decimals) : 
        amount.toString();
    
    return `
智能钱包监控提醒
------------------------
钱包地址: ${walletAddress}
操作类型: ${operation}
代币名称: ${tokenInfo?.name || 'Unknown'}
代币地址: ${tokenInfo?.address || 'Unknown'}
交易数量: ${tokenAmount}
时间: ${new Date(timestamp * 1000).toLocaleString()}
------------------------`;
}

// 监听交易
async function monitorWallets() {
    console.log('开始监控智能钱包交易...\n');

    for (const address of WALLET_ADDRESSES) {
        try {
            const publicKey = new PublicKey(address);
            
            // 订阅账户变更
            connection.onAccountChange(
                publicKey,
                async (accountInfo, context) => {
                    console.log(`\n检测到钱包交易: ${address}`);
                    
                    // 获取最近的交易签名
                    const signatures = await connection.getSignaturesForAddress(
                        publicKey,
                        { limit: 1 }
                    );

                    if (signatures.length > 0) {
                        const txSignature = signatures[0].signature;
                        const tx = await connection.getParsedTransaction(txSignature, 'confirmed');

                        if (tx) {
                            const { type, amount, tokenAddress } = await parseTransactionType(tx, address);
                            if (tokenAddress) {
                                const tokenInfo = await getTokenInfo(tokenAddress);
                                const output = formatOutput(
                                    type,
                                    amount,
                                    tokenInfo,
                                    tx.blockTime,
                                    address
                                );
                                
                                // 打印到控制台
                                console.log(output);
                                
                                // 发送钉钉通知
                                await ding(output);
                            }
                        }
                    }
                },
                'confirmed'
            );

            console.log(`正在监控钱包: ${address}`);
        } catch (error) {
            console.error(`监控钱包 ${address} 时出错:`, error);
        }
    }
}

// 启动监控
monitorWallets().catch(console.error);
