document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const messageDiv = document.getElementById('message');

    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const nome = document.getElementById('nome').value;
            const email = document.getElementById('email').value;
            const senha = document.getElementById('senha').value;
            const turma = document.getElementById('turma').value;

            // Limpa mensagens anteriores
            messageDiv.textContent = '';
            messageDiv.className = 'hidden';

            try {
                const response = await fetch(`${API_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nome,
                        email,
                        senha,
                        turma,
                        tipo: 'aluno' // Define o tipo como aluno por padrão
                    })
                });

                const data = await response.json();

                if (response.ok && data.message === 'success') {
                    messageDiv.textContent = 'Usuário cadastrado com sucesso! Redirecionando para o login...';
                    messageDiv.className = 'block text-green-600 text-sm text-center font-medium bg-green-50 p-2 rounded-lg';

                    // Redireciona para a página de login após 2 segundos
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 2000);

                } else {
                    messageDiv.textContent = data.error || 'Ocorreu um erro. Verifique se o usuário já existe.';
                    messageDiv.className = 'block text-red-600 text-sm text-center font-medium bg-red-50 p-2 rounded-lg';
                }
            } catch (error) {
                messageDiv.textContent = 'Erro de conexão com o servidor.';
                messageDiv.className = 'block text-red-600 text-sm text-center font-medium bg-red-50 p-2 rounded-lg';
            }
        });
    }
});
