/**
 * cadastro-pizza.js
 * Script de manipulação do formulário de cadastro de pizzas.
 */

document.addEventListener('DOMContentLoaded', () => {
    const formPizza = document.querySelector('form');

    if (!formPizza) {
        console.error('Formulário de cadastro de pizza não encontrado.');
        return;
    }

    formPizza.addEventListener('submit', async (event) => {
        event.preventDefault(); // Impede o recarregamento padrão da página

        // 1. Coleta os valores básicos dos campos
        const nome = document.getElementById('nome').value.trim();
        const categoria = document.getElementById('categoria').value;
        const descricao = document.getElementById('descricao').value.trim();

        // 2. Preços (converte para float ou define como 0 se vazio)
        const precoP = parseFloat(document.getElementById('preco-p').value) || 0;
        const precoM = parseFloat(document.getElementById('preco-m').value) || 0;
        const precoG = parseFloat(document.getElementById('preco-g').value) || 0;
        const precoGG = parseFloat(document.getElementById('preco-gg').value) || 0;

        // Validação adicional
        if (precoG <= 0) {
            alert('Por favor, informe um preço válido para o tamanho Grande (G).');
            document.getElementById('preco-g').focus();
            return;
        }

        // 3. Características (Checkboxes)
        const destaque = formPizza.querySelector('input[name="destaque"]').checked;
        const vegetariana = formPizza.querySelector('input[name="vegetariana"]').checked;
        const picante = formPizza.querySelector('input[name="picante"]').checked;

        // 4. Disponibilidade (Radio)
        const disponivel = formPizza.querySelector('input[name="disponivel"]:checked')?.value === 'sim';

        // 5. Imagem (Converte arquivo local para Base64)
        const inputImagem = document.getElementById('imagem');
        let imagemBase64 = null;

        if (inputImagem && inputImagem.files.length > 0) {
            try {
                imagemBase64 = await converterImagemParaBase64(inputImagem.files[0]);
            } catch (err) {
                console.warn('Erro ao processar imagem:', err);
            }
        }

        // 6. Montagem do Objeto Pizza
        const novaPizza = {
            id: Date.now(), // Identificador único simples
            nome,
            categoria,
            descricao,
            precos: {
                p: precoP,
                m: precoM,
                g: precoG,
                gg: precoGG
            },
            imagem: imagemBase64,
            caracteristicas: {
                destaque,
                vegetariana,
                picante
            },
            disponivel,
            criadoEm: new Date().toISOString()
        };

        // 7. Salvamento e Finalização
        salvarNoLocalStorage(novaPizza);

        /* 
        // Se você tiver um backend real, basta descomentar e ajustar a rota:
        // await enviarParaServidor(novaPizza);
        */

        alert(`Pizza "${novaPizza.nome}" cadastrada com sucesso!`);
        formPizza.reset();
    });
});

/**
 * Utilitário para converter File em string Base64
 * @param {File} file 
 * @returns {Promise<string>}
 */
function converterImagemParaBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

/**
 * Salva a pizza na lista persistida no localStorage do navegador
 * @param {Object} pizza 
 */
function salvarNoLocalStorage(pizza) {
    const STORAGE_KEY = 'cardapio_pizzas';
    const pizzasSalvas = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    
    pizzasSalvas.push(pizza);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pizzasSalvas));
    console.log('Pizzas cadastradas no LocalStorage:', pizzasSalvas);
}

/**
 * Exemplo de função para envio assíncrono para uma API REST
 * @param {Object} pizza 
 */
async function enviarParaServidor(pizza) {
    const response = await fetch('/api/pizzas', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(pizza)
    });

    if (!response.ok) {
        throw new Error('Falha ao registrar pizza no servidor');
    }

    return await response.json();
}