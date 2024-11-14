const { Connection, PublicKey } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const connection = new Connection(
    process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
        confirmTransactionInitialTimeout: 60000
    }
);

// 添加延迟函数（输入秒，内部转换为毫秒）
const sleep = (seconds) => new Promise(resolve => setTimeout(resolve, seconds * 1000));

// 带重试的异步请求
async function withRetry(fn, retries = 3, initialDelaySeconds = 5) {
    let delaySeconds = initialDelaySeconds;
    const retryDelays = [5, 10, 20, 30, 40]; // 重试延迟时间（秒）
    
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            console.error(`请求失败 (尝试 ${i + 1}/${retries}):`, error.message);
            if (i < retries - 1) {
                const nextDelay = retryDelays[i] || retryDelays[retryDelays.length - 1];
                console.log(`等待 ${nextDelay} 秒后重试...`);
                await sleep(nextDelay);
                continue;
            }
            throw error;
        }
    }
}

// 获取钱包中的所有token余额
async function getWalletTokens(walletAddress) {
    try {
        console.log('\n正在获取token余额...');
        const pubKey = new PublicKey(walletAddress);
        
        // 获取SOL余额
        const solBalance = await withRetry(() => connection.getBalance(pubKey));
        console.log(`\n钱包 ${walletAddress} 的余额：`);
        console.log('------------------------');
        console.log(`SOL余额: ${(solBalance / 1e9).toFixed(6)} SOL`);
        console.log('------------------------');

        // 获取所有token账户
        const tokenAccounts = await withRetry(() => 
            connection.getParsedTokenAccountsByOwner(pubKey, {
                programId: TOKEN_PROGRAM_ID
            })
        );

        if (tokenAccounts.value.length > 0) {
            console.log('\nToken余额:');
            console.log('------------------------');
            for (const { account } of tokenAccounts.value) {
                const { mint, tokenAmount } = account.data.parsed.info;
                
                if (tokenAmount.uiAmount > 0) {
                    console.log(`Token地址: ${mint}`);
                    console.log(`余额: ${tokenAmount.uiAmount}`);
                    console.log('------------------------');
                }
            }
        } else {
            console.log('没有找到任何token余额');
            console.log('------------------------');
        }

        // 在继续之前添加较长延迟
        await sleep(10);
    } catch (error) {
        console.error('获取token余额时出错:', error.message);
    }
}

// 分批处理数组
function chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

// 获取最近的10笔交易
async function getRecentTransactions(walletAddress) {
    try {
        console.log('\n正在获取最近交易...');
        const pubKey = new PublicKey(walletAddress);
        
        // 获取签名列表
        const signatures = await withRetry(() =>
            connection.getSignaturesForAddress(pubKey, { limit: 10 })
        );

        if (signatures.length === 0) {
            console.log('\n没有找到任何交易记录');
            return;
        }

        console.log(`\n钱包 ${walletAddress} 的最近10笔交易：`);
        console.log('------------------------');

        // 将签名列表分成小批次（每批2个）
        const signatureChunks = chunk(signatures, 2);
        
        // 逐批处理交易
        for (let i = 0; i < signatureChunks.length; i++) {
            const chunk = signatureChunks[i];
            const signatureList = chunk.map(sig => sig.signature);
            
            // 添加延迟后获取当前批次的交易
            if (i > 0) {
                console.log(`等待 15 秒后获取下一批交易...`);
                await sleep(15);
            }
            console.log(`正在获取第 ${i + 1}/${signatureChunks.length} 批交易详情...`);
            
            const txs = await withRetry(() =>
                connection.getParsedTransactions(signatureList, {
                    maxSupportedTransactionVersion: 0
                }),
                3, // 重试次数
                5  // 初始延迟秒数
            );

            // 处理当前批次的交易
            for (let j = 0; j < txs.length; j++) {
                const tx = txs[j];
                const { signature, blockTime } = chunk[j];

                if (!tx || !tx.meta) {
                    console.log(`无法获取交易详情: ${signature}`);
                    continue;
                }

                const timestamp = blockTime ? new Date(blockTime * 1000).toLocaleString() : 'Unknown';
                console.log(`时间: ${timestamp}`);
                console.log(`交易签名: ${signature}`);

                // 解析Token余额变化
                if (tx.meta.postTokenBalances && tx.meta.preTokenBalances) {
                    const preBalances = tx.meta.preTokenBalances;
                    const postBalances = tx.meta.postTokenBalances;

                    for (let k = 0; k < postBalances.length; k++) {
                        const post = postBalances[k];
                        const pre = preBalances.find(b => b.accountIndex === post.accountIndex);

                        if (pre && post) {
                            const preAmount = parseFloat(pre.uiTokenAmount.uiAmountString || '0');
                            const postAmount = parseFloat(post.uiTokenAmount.uiAmountString || '0');
                            const difference = postAmount - preAmount;

                            if (difference !== 0) {
                                console.log(`Token: ${post.mint}`);
                                console.log(`变化数量: ${difference > 0 ? '+' : ''}${difference.toFixed(6)}`);
                            }
                        }
                    }
                }

                // SOL余额变化
                if (tx.meta.postBalances && tx.meta.preBalances) {
                    const accountIndex = tx.transaction.message.accountKeys.findIndex(
                        key => key.pubkey.toBase58() === walletAddress
                    );
                    
                    if (accountIndex !== -1) {
                        const preSol = tx.meta.preBalances[accountIndex] / 1e9;
                        const postSol = tx.meta.postBalances[accountIndex] / 1e9;
                        const difference = postSol - preSol;
                        
                        if (Math.abs(difference) > 0.000001) {
                            console.log(`SOL变化: ${difference > 0 ? '+' : ''}${difference.toFixed(6)}`);
                        }
                    }
                }

                console.log('------------------------');
            }
        }
    } catch (error) {
        console.error('获取最近交易时出错:', error.message);
    }
}

// 导出查询函数
module.exports = {
    getWalletTokens,
    getRecentTransactions
};

// 如果直接运行此文件
if (require.main === module) {
    const WALLET_ADDRESSES = (process.env.WALLET_ADDRESSES || '').split(',').filter(Boolean);
    
    if (WALLET_ADDRESSES.length === 0) {
        console.log('请在.env文件中配置WALLET_ADDRESSES');
    } else {
        // 串行处理每个钱包
        (async () => {
            for (const address of WALLET_ADDRESSES) {
                console.log(`\n开始查询钱包: ${address}`);
                // await getWalletTokens(address);
                await getRecentTransactions(address);
                // 在处理下一个钱包之前添加较长延迟
                if (WALLET_ADDRESSES.indexOf(address) < WALLET_ADDRESSES.length - 1) {
                    console.log(`等待 20 秒后查询下一个钱包...`);
                    await sleep(20);
                }
            }
        })().catch(console.error);
    }
}
