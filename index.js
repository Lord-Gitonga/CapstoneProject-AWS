const express = require('express');
const path = require('path');

const app = express();

// Serve static files from the current directory
app.use(express.static(__dirname));

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy'
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Application started on port ${PORT}`);
});