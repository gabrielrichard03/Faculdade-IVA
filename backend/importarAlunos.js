import pg from 'pg';
import bcrypt from 'bcrypt';
import 'dotenv/config'; // Para carregar DATABASE_URL do .env

// --- CONFIGURAÇÃO DE CONEXÃO ---
const DATABASE_URL = process.env.DATABASE_URL;

const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// --- DADOS DOS ALUNOS PARA IMPORTAR ---
// Você pode preencher este array com os dados dos seus alunos.
// A senha padrão será "senha123" para todos, e será criptografada.
const alunosParaImportar = [
    { nome: "Ana Paula", email: "ana.paula@iva.com", turma: "A" },
    { nome: "Bruno Costa", email: "bruno.costa@iva.com", turma: "B" },
    { nome: "Carla Dias", email: "carla.dias@iva.com", turma: "A" },
    { nome: "Daniel Rocha", email: "daniel.rocha@iva.com", turma: "B" },
    { nome: "Eduarda Lima", email: "eduarda.lima@iva.com", turma: "A" },
    // Adicione mais alunos aqui
];

const importarAlunos = async () => {
    if (!DATABASE_URL) {
        console.error("❌ ERRO FATAL: A variável de ambiente DATABASE_URL não está definida.");
        process.exit(1);
    }

    console.log(`Iniciando importação de ${alunosParaImportar.length} alunos...`);

    const defaultPassword = "senha123"; // Senha padrão para os novos alunos
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    let importedCount = 0;
    let errorCount = 0;

    for (const aluno of alunosParaImportar) {
        const formattedEmail = aluno.email.includes('@') ? aluno.email : `${aluno.email}@iva.com`;
        const sql = `
            INSERT INTO usuarios (nome, email, senha, tipo, turma)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (email) DO UPDATE SET
                nome = EXCLUDED.nome,
                turma = EXCLUDED.turma,
                senha = EXCLUDED.senha # Atualiza a senha mesmo em caso de conflito, se necessário
            RETURNING id
        `;
        const params = [aluno.nome, formattedEmail, hashedPassword, 'aluno', aluno.turma];

        try {
            const result = await pool.query(sql, params);
            console.log(`✅ Sucesso: Aluno '${aluno.nome}' (${formattedEmail}) importado/atualizado com ID: ${result.rows[0].id}`);
            importedCount++;
        } catch (err) {
            console.error(`❌ Erro ao importar aluno '${aluno.nome}' (${formattedEmail}):`, err.message);
            errorCount++;
        }
    }

    console.log(`\n--- Resumo da Importação ---`);
    console.log(`Total de alunos processados: ${alunosParaImportar.length}`);
    console.log(`Alunos importados/atualizados: ${importedCount}`);
    console.log(`Alunos com erro: ${errorCount}`);
    await pool.end();
};

importarAlunos();