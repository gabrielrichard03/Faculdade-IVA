import pg from 'pg';
import bcrypt from 'bcrypt';
import 'dotenv/config'; // Importa e carrega as variáveis de ambiente do .env

// --- DADOS DO ADMINISTRADOR A SER RECRIADO ---
const adminUser = {
    nome: "Gabriel (Admin)",
    email: "gabriel@iva.com.br", // E-mail fornecido na sua solicitação
    senha: "nova_senha_segura_aqui", // IMPORTANTE: Troque por uma senha forte e segura
    tipo: "professor", // Perfil de professor para acesso total
    turma: "" // Admin não tem turma
};
// -------------------------------------------

// --- CONFIGURAÇÃO DE CONEXÃO ---
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("❌ ERRO FATAL: A variável de ambiente DATABASE_URL não está definida. Verifique seu arquivo .env.");
    process.exit(1);
}

const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const limparERecriar = async () => {
    const client = await pool.connect(); // Pega uma conexão do pool para usar em uma transação

    try {
        await client.query('BEGIN'); // Inicia uma transação para segurança

        // 1. Limpar a tabela de usuários e dados relacionados
        console.log("🧹 Limpando a tabela 'usuarios' e dados relacionados (notas, frequência, etc)...");
        // TRUNCATE com CASCADE é a forma mais segura de limpar tudo, pois remove registros em tabelas que dependem do ID do usuário.
        await client.query('TRUNCATE TABLE usuarios RESTART IDENTITY CASCADE');
        console.log("✅ Tabela 'usuarios' limpa com sucesso.");

        // 2. Recriar o usuário Admin com senha criptografada
        console.log(`👤 Recriando usuário admin: ${adminUser.email}`);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminUser.senha, salt);

        const sql = `INSERT INTO usuarios (nome, email, senha, tipo, turma) VALUES ($1, $2, $3, $4, $5) RETURNING id`;
        const params = [adminUser.nome, adminUser.email, hashedPassword, adminUser.tipo, adminUser.turma];

        const result = await client.query(sql, params);

        await client.query('COMMIT'); // Confirma a transação se tudo deu certo

        console.log("\n🎉 --- OPERAÇÃO CONCLUÍDA --- 🎉");
        console.log(`✅ Sucesso! Usuário Admin '${adminUser.nome}' criado com ID: ${result.rows[0].id}`);
        console.log(`   > Login: ${adminUser.email}`);
        console.log(`   > Senha: ${adminUser.senha} (Lembre-se de usar esta nova senha para o login)`);
        console.log("\nℹ️  AVISO: Todos os outros usuários foram removidos. O servidor irá recriar os usuários de teste na próxima inicialização.");

    } catch (err) {
        await client.query('ROLLBACK'); // Desfaz a transação em caso de erro
        console.error("❌ Erro durante a operação. Nenhuma alteração foi salva no banco.");
        console.error(err.message);
    } finally {
        client.release(); // Libera a conexão de volta para o pool
        await pool.end(); // Fecha todas as conexões do pool
    }
};

limparERecriar();