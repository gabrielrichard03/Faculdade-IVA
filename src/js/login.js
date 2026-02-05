// Aguarda o DOM estar completamente carregado para garantir que todos os elementos HTML existam.
document.addEventListener('DOMContentLoaded', () => {

    // LIMPEZA DE SEGURANÇA: Remove qualquer usuário logado anteriormente ao abrir a tela de login
    sessionStorage.removeItem('user');

    // Seleciona os elementos do formulário que vamos usar.
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    const loginButton = document.getElementById('login-button');

    // Verifica se o formulário de login realmente existe na página antes de adicionar o listener.
    if (loginForm) {
        // Adiciona um "ouvinte" para o evento de 'submit' do formulário.
        loginForm.addEventListener('submit', async (event) => {
            // 1. Previne o comportamento padrão do formulário, que é recarregar a página.
            event.preventDefault();

            // 2. Pega os valores digitados pelo usuário nos campos de usuário e senha.
            const username = usernameInput.value;
            const password = passwordInput.value;

            try {

                const response = await fetch(`${API_URL}/login`, {

                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: username, password: password })
                });

                const data = await response.json();

                if (response.ok && data.message === 'success') {
                    sessionStorage.setItem('user', JSON.stringify(data.user)); // Salva o usuário na sessão da aba
                    if (data.user.tipo === 'professor') {
                        window.location.href = './professor/index_professor.html';
                    } else {
                        window.location.href = './aluno/index_aluno.html';
                    }
                } else {
                    errorMessage.textContent = data.message || 'Usuário ou senha incorretos';
                    errorMessage.classList.remove('hidden');
                }
            } catch (error) {
                errorMessage.textContent = 'Erro de conexão com o servidor.';
                errorMessage.classList.remove('hidden');
            }
        });
    }
});