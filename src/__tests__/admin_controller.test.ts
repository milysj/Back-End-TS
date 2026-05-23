// @ts-nocheck
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import {
    listarUsuarios,
    alterarTipoUsuario,
    alterarStatusUsuario,
    excluirUsuario,
    alterarPermissoesAdmin
} from '../controllers/adminController';
import User from '../models/user';

jest.mock('../models/user');
jest.mock('../logging/appLogger', () => ({
    logHandledError: jest.fn(),
    appLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

describe('Admin Controller Unit Tests', () => {
    let mockReq: any;
    let mockRes: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            user: { _id: 'admin123', tipoUsuario: 'ADMINISTRADOR', canPromoteToAdmin: true },
            params: {},
            body: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('listarUsuarios', () => {
        it('deve listar usuários com sucesso', async () => {
            const mockUsers = [{ _id: 'u1', nome: 'Test' }];
            const sortMock = jest.fn().mockResolvedValue(mockUsers);
            const selectMock = jest.fn().mockReturnValue({ sort: sortMock });
            (User.find as jest.Mock).mockReturnValue({ select: selectMock });

            await listarUsuarios(mockReq, mockRes);
            expect(mockRes.json).toHaveBeenCalledWith(mockUsers);
        });

        it('deve lidar com erro', async () => {
            (User.find as jest.Mock).mockImplementation(() => { throw new Error('DB Error'); });
            await listarUsuarios(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Erro ao listar usuários.' });
        });
    });

    describe('alterarTipoUsuario', () => {
        it('não pode alterar próprio tipo', async () => {
            mockReq.params.id = 'admin123';
            await alterarTipoUsuario(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: expect.stringContaining('próprio') });
        });

        it('rejeita tipo inválido', async () => {
            mockReq.params.id = 'target123';
            mockReq.body.tipoUsuario = 'INVALIDO';
            await alterarTipoUsuario(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('rejeita se target não for encontrado', async () => {
            mockReq.params.id = 'target123';
            mockReq.body.tipoUsuario = 'PROFESSOR';
            (User.findById as jest.Mock).mockResolvedValue(null);
            await alterarTipoUsuario(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('admin não pode modificar owner', async () => {
            mockReq.params.id = 'owner123';
            mockReq.body.tipoUsuario = 'PROFESSOR';
            (User.findById as jest.Mock).mockResolvedValue({ _id: 'owner123', tipoUsuario: 'OWNER' });
            await alterarTipoUsuario(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: expect.stringContaining('permissão') });
        });

        it('admin não pode promover a owner', async () => {
            mockReq.params.id = 'aluno123';
            mockReq.body.tipoUsuario = 'OWNER';
            (User.findById as jest.Mock).mockResolvedValue({ _id: 'aluno123', tipoUsuario: 'ALUNO' });
            await alterarTipoUsuario(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: expect.stringContaining('Apenas um OWNER') });
        });

        it('admin sem canPromoteToAdmin não pode promover a admin', async () => {
            mockReq.user.canPromoteToAdmin = false;
            mockReq.params.id = 'aluno123';
            mockReq.body.tipoUsuario = 'ADMINISTRADOR';
            (User.findById as jest.Mock).mockResolvedValue({ _id: 'aluno123', tipoUsuario: 'ALUNO' });
            await alterarTipoUsuario(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: expect.stringContaining('não tem permissão') });
        });

        it('atualiza tipo com sucesso', async () => {
            mockReq.params.id = 'aluno123';
            mockReq.body.tipoUsuario = 'PROFESSOR';
            const saveMock = jest.fn();
            (User.findById as jest.Mock).mockResolvedValue({ _id: 'aluno123', tipoUsuario: 'ALUNO', save: saveMock });
            await alterarTipoUsuario(mockReq, mockRes);
            expect(saveMock).toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith({ message: expect.any(String), usuario: expect.any(Object) });
        });

        it('owner pode modificar admin', async () => {
            mockReq.user.tipoUsuario = 'OWNER';
            mockReq.params.id = 'adminX';
            mockReq.body.tipoUsuario = 'PROFESSOR';
            const saveMock = jest.fn();
            (User.findById as jest.Mock).mockResolvedValue({ _id: 'adminX', tipoUsuario: 'ADMINISTRADOR', save: saveMock });
            await alterarTipoUsuario(mockReq, mockRes);
            expect(saveMock).toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
        });
        
        it('deve lidar com erro', async () => {
            mockReq.params.id = 't1';
            mockReq.body.tipoUsuario = 'PROFESSOR';
            (User.findById as jest.Mock).mockImplementation(() => { throw new Error('DB Error'); });
            await alterarTipoUsuario(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });

    describe('alterarStatusUsuario', () => {
        it('não pode alterar próprio status', async () => {
            mockReq.params.id = 'admin123';
            await alterarStatusUsuario(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it('rejeita status inválido', async () => {
            mockReq.params.id = 'target123';
            mockReq.body.status = 'INVALIDO';
            await alterarStatusUsuario(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('rejeita target não encontrado', async () => {
            mockReq.params.id = 'target123';
            mockReq.body.status = 'BANIDO';
            (User.findById as jest.Mock).mockResolvedValue(null);
            await alterarStatusUsuario(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('admin não pode banir owner', async () => {
            mockReq.params.id = 'owner123';
            mockReq.body.status = 'BANIDO';
            (User.findById as jest.Mock).mockResolvedValue({ _id: 'owner123', tipoUsuario: 'OWNER' });
            await alterarStatusUsuario(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it('atualiza para BLOQUEADO com data', async () => {
            mockReq.params.id = 'aluno123';
            mockReq.body.status = 'BLOQUEADO';
            mockReq.body.bloqueadoAte = '2024-01-01T00:00:00Z';
            const mockTarget = { _id: 'aluno123', tipoUsuario: 'ALUNO', status: 'ATIVO', bloqueadoAte: null, save: jest.fn() };
            (User.findById as jest.Mock).mockResolvedValue(mockTarget);
            
            await alterarStatusUsuario(mockReq, mockRes);
            
            expect(mockTarget.status).toBe('BLOQUEADO');
            expect(mockTarget.bloqueadoAte).not.toBeNull();
            expect(mockTarget.save).toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalled();
        });

        it('atualiza para ATIVO e limpa bloqueadoAte', async () => {
            mockReq.params.id = 'aluno123';
            mockReq.body.status = 'ATIVO';
            const mockTarget = { _id: 'aluno123', tipoUsuario: 'ALUNO', status: 'BLOQUEADO', bloqueadoAte: new Date(), save: jest.fn() };
            (User.findById as jest.Mock).mockResolvedValue(mockTarget);
            
            await alterarStatusUsuario(mockReq, mockRes);
            
            expect(mockTarget.status).toBe('ATIVO');
            expect(mockTarget.bloqueadoAte).toBeNull();
            expect(mockRes.json).toHaveBeenCalled();
        });
        
        it('deve lidar com erro', async () => {
            mockReq.params.id = 't1';
            mockReq.body.status = 'ATIVO';
            (User.findById as jest.Mock).mockImplementation(() => { throw new Error('DB Error'); });
            await alterarStatusUsuario(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });

    describe('excluirUsuario', () => {
        it('não pode excluir a si mesmo', async () => {
            mockReq.params.id = 'admin123';
            await excluirUsuario(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it('rejeita target não encontrado', async () => {
            mockReq.params.id = 'target123';
            (User.findById as jest.Mock).mockResolvedValue(null);
            await excluirUsuario(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('admin não pode excluir admin/owner', async () => {
            mockReq.params.id = 'adminX';
            (User.findById as jest.Mock).mockResolvedValue({ _id: 'adminX', tipoUsuario: 'ADMINISTRADOR' });
            await excluirUsuario(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it('exclui com sucesso', async () => {
            mockReq.params.id = 'aluno123';
            (User.findById as jest.Mock).mockResolvedValue({ _id: 'aluno123', tipoUsuario: 'ALUNO' });
            (User.findByIdAndDelete as jest.Mock).mockResolvedValue({});
            
            await excluirUsuario(mockReq, mockRes);
            expect(User.findByIdAndDelete).toHaveBeenCalledWith('aluno123');
            expect(mockRes.json).toHaveBeenCalledWith({ message: expect.any(String) });
        });
        
        it('deve lidar com erro', async () => {
            mockReq.params.id = 't1';
            (User.findById as jest.Mock).mockImplementation(() => { throw new Error('DB Error'); });
            await excluirUsuario(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });

    describe('alterarPermissoesAdmin', () => {
        it('apenas owner pode alterar permissões', async () => {
            mockReq.user.tipoUsuario = 'ADMINISTRADOR';
            mockReq.params.id = 'target123';
            await alterarPermissoesAdmin(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it('rejeita target não encontrado', async () => {
            mockReq.user.tipoUsuario = 'OWNER';
            mockReq.params.id = 'target123';
            (User.findById as jest.Mock).mockResolvedValue(null);
            await alterarPermissoesAdmin(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('rejeita alvo que não é admin', async () => {
            mockReq.user.tipoUsuario = 'OWNER';
            mockReq.params.id = 'aluno123';
            (User.findById as jest.Mock).mockResolvedValue({ _id: 'aluno123', tipoUsuario: 'ALUNO' });
            await alterarPermissoesAdmin(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('atualiza permissões com sucesso', async () => {
            mockReq.user.tipoUsuario = 'OWNER';
            mockReq.params.id = 'admin2';
            mockReq.body.canPromoteToAdmin = true;
            
            const mockTarget = { _id: 'admin2', tipoUsuario: 'ADMINISTRADOR', canPromoteToAdmin: false, save: jest.fn() };
            (User.findById as jest.Mock).mockResolvedValue(mockTarget);
            
            await alterarPermissoesAdmin(mockReq, mockRes);
            
            expect(mockTarget.canPromoteToAdmin).toBe(true);
            expect(mockTarget.save).toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalled();
        });

        it('deve lidar com erro', async () => {
            mockReq.user.tipoUsuario = 'OWNER';
            mockReq.params.id = 'target123';
            (User.findById as jest.Mock).mockImplementation(() => { throw new Error('DB Error'); });
            await alterarPermissoesAdmin(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });
});
