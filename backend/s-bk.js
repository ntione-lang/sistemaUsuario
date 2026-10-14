const http = require('http');
const fs = require('fs');
const path = require('path');

// Caminho ultra seguro para encontrar o index.html na pasta frontend
const caminhoHtml = path.join(__dirname, '..', 'frontend', 'index.html');

let pagina = '<h1>Erro: index.html não foi encontrado pelo servidor.</h1>';

try {
    pagina = fs.readFileSync(caminhoHtml, 'utf8');
    console.log('✅ Arquivo index.html carregado com sucesso!');
} catch (erro) {
    console.error('❌ ATENÇÃO: Não foi possível carregar o index.html.');
    console.error('O Node procurou neste caminho:', caminhoHtml);
}

http.createServer(async (req, res) => {
    // Correção do erro de digitação de "nethod" para "method"
    if (req.method === 'GET' && req.url === '/') {
        return res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(pagina);
    }
    
    if (req.method === 'POST' && req.url === '/api/usuarios') {
        try {
            const partes = [];
            for await (const parte of req) partes.push(parte);

            // Correção de "Buffer.contact" para "Buffer.concat"
            const dadosBrutos = Buffer.concat(partes).toString('utf8');
            const { nome, email, telefone = '' } = JSON.parse(dadosBrutos);
            
            // Substitua 'inserir' pelo nome da sua variável de banco de dados (ex: db.prepare...)
            inserir.run(nome, email, telefone); 

            return res.writeHead(201).end();
        } catch (erroPost) {
            console.error('Erro no POST /api/usuarios:', erroPost);
            return res.writeHead(500).end();
        }
    }
    
    res.writeHead(404).end();
}).listen(3000, () => {
    console.log('🚀 Servidor rodando na porta 3000!');
});
