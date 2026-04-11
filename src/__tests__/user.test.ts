import request from 'supertest';
import app from '../server'; // Importa a instância do app Express
import { describe, it, expect, afterAll, jest } from '@jest/globals';
import mongoose from 'mongoose';
import User from '../models/user';

jest.setTimeout(20000);

describe('Fluxo de Usuário - Testes de Integração', () => {

    const testUser = {
        nome: "Usuário de Teste",
        email: `teste_${Date.now()}@exemplo.com`,
        senha: "senhaSegura123",
        dataNascimento: "1995-05-15",
        tipoUsuario: "ALUNO" as const,
        aceiteTermos: true
    };

    let authToken = '';

    it('ETAPA 1: Deve registrar um novo usuário com sucesso', async () => {
        const res = await request(app)
            .post('/api/users/register')
            .send(testUser);
        
        expect(res.statusCode).toEqual(201);
        expect(res.body.message).toContain('Usuário cadastrado com sucesso');

        // Verifica se o usuário foi realmente salvo no banco
        const userInDb = await User.findOne({ email: testUser.email });
        expect(userInDb).not.toBeNull();
        expect(userInDb?.nome).toBe(testUser.nome);

        // Com verificação por e-mail ativa: confirma via link. Sem ela: usuário já nasce verificado.
        const verificationToken = userInDb?.verificationToken;
        if (verificationToken) {
            const verifyRes = await request(app)
                .get(`/api/auth/confirmar?token=${verificationToken}`);
            expect([200, 302]).toContain(verifyRes.statusCode);
            const verifiedUser = await User.findOne({ email: testUser.email });
            expect(verifiedUser?.isVerified).toBe(true);
        } else {
            expect(userInDb?.isVerified).toBe(true);
        }
    });

    it('ETAPA 2: Deve impedir o registro de um usuário com email duplicado', async () => {
        const res = await request(app)
            .post('/api/users/register')
            .send(testUser); // Tenta registrar o mesmo usuário novamente
        
        expect(res.statusCode).toEqual(409);
        expect(res.body).toHaveProperty('message', 'Email já cadastrado.');
    });

    it('ETAPA 3: Deve fazer login do usuário registrado e obter um token', async () => {
        await User.updateOne({ email: testUser.email }, { isVerified: true });
        const res = await request(app)
            .post('/api/users/login')
            .send({
                email: testUser.email,
                senha: testUser.senha
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body.perfilCriado).toBe(false); // Perfil ainda não foi criado
        
        authToken = res.body.token; // Salva o token para os próximos testes
    });

    it('ETAPA 4: Deve impedir o login com senha incorreta', async () => {
        const res = await request(app)
            .post('/api/users/login')
            .send({
                email: testUser.email,
                senha: 'senha-errada'
            });

        expect(res.statusCode).toEqual(401);
        expect(res.body).toHaveProperty('message', 'Credenciais inválidas.');
    });

    it('ETAPA 5: Deve criar um perfil para o usuário autenticado', async () => {
        const profileData = {
            username: `teste_user_${Date.now()}`,
            personagem: "Guerreiro" as const,
            fotoPerfil: "/img/guerreiro.png"
        };
        
        const res = await request(app)
            .post('/api/users/criar-perfil')
            .set('Authorization', `Bearer ${authToken}`)
            .send(profileData);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'Perfil criado com sucesso!');
        expect(res.body.usuario.username).toBe(profileData.username);
        expect(res.body.usuario.personagem).toBe(profileData.personagem);

        // Verifica se o perfil foi salvo no banco
        const userInDb = await User.findOne({ email: testUser.email });
        expect(userInDb?.username).toBe(profileData.username);
    });

    it('ETAPA 6: Deve buscar os dados do usuário autenticado via /api/users/me', async () => {
        const res = await request(app)
            .get('/api/users/me')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.email).toBe(testUser.email);
        expect(res.body.nome).toBe(testUser.nome);
        expect(res.body).not.toHaveProperty('senha'); // Garante que a senha não foi retornada
    });

    it('ETAPA 7: Deve atualizar dados pessoais', async () => {
        const res = await request(app)
            .put('/api/users/dados-pessoais')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ nome: 'Nome Atualizado' });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'Dados atualizados com sucesso!');
        expect(res.body.usuario.nome).toBe('Nome Atualizado');
    });

    it('ETAPA 8: Deve mudar a senha do usuário', async () => {
        const res = await request(app)
            .put('/api/users/mudar-senha')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ senhaAtual: testUser.senha, novaSenha: 'senhaNova123' });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'Senha alterada com sucesso!');
    });

    it('ETAPA 9: Deve solicitar recuperação de senha', async () => {
        const res = await request(app)
            .post('/api/users/solicitar-recuperacao')
            .send({ email: testUser.email });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'Se o email estiver cadastrado, um link de recuperação será enviado.');
    });

    it('ETAPA 10: Deve verificar token de autorização com /api/users/verify', async () => {
        const res = await request(app)
            .get('/api/users/verify')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('authenticated', true);
    });
});
