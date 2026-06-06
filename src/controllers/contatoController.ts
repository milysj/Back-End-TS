import { Request, Response } from 'express';
import Contato from '../models/contato';
import { IUser } from '../models/user';

interface AuthRequest extends Request {
    user?: IUser;
}

export const criarContato = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { nome, email, assunto, mensagem } = req.body;
    const userId = req.user?._id || null;

    if (!nome || !email || !assunto || !mensagem) {
      return res.status(400).json({ message: "Preencha todos os campos obrigatórios." });
    }

    const contato = await Contato.create({
      nome,
      email,
      assunto,
      mensagem,
      usuario: userId,
      data: new Date()
    });

    return res.status(201).json({
      message: "Mensagem enviada com sucesso!",
      contato: {
        _id: contato._id,
        nome: contato.nome,
        email: contato.email,
        assunto: contato.assunto,
        mensagem: contato.mensagem,
        data: contato.data
      }
    });
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao criar contato:", err);
    return res.status(500).json({ message: "Erro ao enviar mensagem", error: err.message });
  }
};

export const listarContatos = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    if (req.user?.tipoUsuario !== "ADMINISTRADOR") {
      return res.status(403).json({ message: "Acesso negado. Apenas administradores podem ver mensagens de contato." });
    }
    const contatos = await Contato.find()
      .populate<{ usuario: Pick<IUser, 'nome' | 'email' | 'username'> }>("usuario", "nome email username")
      .sort({ createdAt: -1 });
    return res.status(200).json({ contatos });
  } catch (error) {
    const err = error as Error;
    console.error("Erro ao listar contatos:", err);
    return res.status(500).json({ message: "Erro ao listar mensagens de contato", error: err.message });
  }
};
