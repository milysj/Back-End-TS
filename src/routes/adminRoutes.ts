import express from "express";
import { verificarToken, verificarAdministrador } from "../middlewares/authMiddleware";
import {
    listarUsuarios,
    alterarTipoUsuario,
    alterarStatusUsuario,
    excluirUsuario,
    alterarPermissoesAdmin
} from "../controllers/adminController";
import { criarMateria, deletarMateria, atualizarMateria } from "../controllers/materiaController";

const router = express.Router();

// Todas as rotas de admin requerem autenticação e privilégio de ADMINISTRADOR ou OWNER
router.use(verificarToken);
router.use(verificarAdministrador);

router.get("/usuarios", listarUsuarios);
router.put("/usuarios/:id/tipo", alterarTipoUsuario);
router.put("/usuarios/:id/status", alterarStatusUsuario);
router.delete("/usuarios/:id", excluirUsuario);
router.put("/usuarios/:id/permissoes", alterarPermissoesAdmin);

// Rotas de gerenciamento de matérias (Admin)
router.post("/materias", criarMateria);
router.put("/materias/:nome", atualizarMateria);
router.delete("/materias/:nome", deletarMateria);


export default router;
