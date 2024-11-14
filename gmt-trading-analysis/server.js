const express = require('express');
const path = require('path');
const analysisRoutes = require('./src/routes/analysisRoutes');

const app = express();
const port = 7777;

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// API 路由
app.use('/api', analysisRoutes);

// 主页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
