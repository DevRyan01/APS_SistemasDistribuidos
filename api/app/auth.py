import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .erros import ApiErro

SEGREDO = os.getenv("ALAGA_SEGREDO", "troque-este-segredo-em-producao")
ALGORITMO = "HS256"
VALIDADE_HORAS = 24
ITERACOES = 600_000
_bearer = HTTPBearer(auto_error=False)


def gerar_hash(senha: str) -> str:
    sal = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", senha.encode(), sal.encode(), ITERACOES)
    return f"pbkdf2_sha256${ITERACOES}${sal}${h.hex()}"


def verificar_senha(senha: str, armazenado: str) -> bool:
    partes = armazenado.split("$")
    if len(partes) == 4:
        _, it, sal, h = partes
        it = int(it)
    else:
        # formato antigo, sal$hash, que usava 200 mil iterações
        sal, h = partes
        it = 200_000
    novo = hashlib.pbkdf2_hmac("sha256", senha.encode(), sal.encode(), it)
    return hmac.compare_digest(novo.hex(), h)


def criar_token(usuario_id: int) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=VALIDADE_HORAS)
    return jwt.encode({"sub": str(usuario_id), "exp": exp}, SEGREDO, algorithm=ALGORITMO)


def usuario_atual(cred: HTTPAuthorizationCredentials = Depends(_bearer)) -> int:
    if cred is None:
        raise ApiErro(401, "NAO_AUTENTICADO", "Token ausente.")
    try:
        dados = jwt.decode(cred.credentials, SEGREDO, algorithms=[ALGORITMO])
        return int(dados["sub"])
    except jwt.ExpiredSignatureError:
        raise ApiErro(401, "TOKEN_EXPIRADO", "Sessão expirada. Faça login novamente.")
    except jwt.PyJWTError:
        raise ApiErro(401, "TOKEN_INVALIDO", "Token inválido.")
