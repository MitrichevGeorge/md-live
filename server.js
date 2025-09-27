const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const chokidar = require('chokidar');

const fileName = process.argv[2];

if (!fileName) {
    console.error('Usage: node server.js <file.md>');
    process.exit(1);
}

const filePath = path.resolve(fileName);
if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
}

const mdDir = path.dirname(filePath);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

app.use(express.static(mdDir));

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${path.basename(filePath)} — Live Preview</title>

<!-- MathJax -->
<script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
<script id="MathJax-script" async
 src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>

<!-- Highlight.js -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>

<style>
body {
    font-family: "Noto Serif", "Georgia", serif;
    max-width: 860px;
    margin: 2rem auto;
    padding: 0 2rem;
    line-height: 1.7;
    color: #24292e;
    background: #ffffff;
}

h1, h2, h3, h4, h5, h6 {
    font-family: "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-weight: 600;
    margin-top: 1.5em;
    margin-bottom: 0.75em;
    line-height: 1.25;
}

p {
    margin: 1em 0;
}

pre {
    padding: 1rem;
    border-radius: 6px;
    background: #f6f8fa;
    overflow-x: auto;
    font-size: 0.95em;
    line-height: 1.45;
}

code {
    font-family: "Noto Sans Mono", monospace;
    background: #f6f8fa;
    padding: 0.2em 0.4em;
    border-radius: 4px;
}

img {
    max-width: 100%;
    display: block;
    margin: 1rem auto;
}

blockquote {
    border-left: 4px solid #d0d7de;
    padding-left: 1em;
    color: #6a737d;
    margin: 1em 0;
}

ul, ol {
    padding-left: 2em;
    margin: 1em 0;
}
</style>
</head>
<body>
<div id="content"></div>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();
socket.on('update', html => {
    document.getElementById('content').innerHTML = html;
    document.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
    MathJax.typesetPromise();
});
</script>
</body>
</html>
    `);
});



function sendUpdate() {
    exec(`pandoc "${filePath}" --from markdown --to html`, (err, stdout, stderr) => {
        if (err) {
            console.error(stderr);
            return;
        }
        io.emit('update', stdout);
    });
}

chokidar.watch(filePath).on('change', sendUpdate);
io.on('connection', sendUpdate);

server.listen(PORT, () => {
    console.log(`Live preview running at http://localhost:${PORT}`);
    import('open').then(mod => mod.default(`http://localhost:${PORT}`));
});

