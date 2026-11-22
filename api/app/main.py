import sqlite3
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from math import asin, cos, radians, sin, sqrt

from fastapi import Depends, FastAPI, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from . import auth, db, externo
from .erros import ApiErro

TIPOS = {"alagamento", "chuvas", "enchente", "bueiro_entupido", "queda_de_arvore", "outro"}
LIMITE_POR_HORA = 10  # limite simples pra não encher o banco de lixo


@asynccontextmanager
async def lifespan(_):
    db.init_db()
    yield


app = FastAPI(title="ClimaCidadão - API Mobile", version="1.0.0", lifespan=lifespan)


def _resp(status, codigo, mensagem):
    return JSONResponse(status_code=status,
                        content={"erro": {"codigo": codigo, "mensagem": mensagem}})


@app.exception_handler(ApiErro)
async def _h_api(_: Request, e: ApiErro):
    return _resp(e.status, e.codigo, e.mensagem)


@app.exception_handler(RequestValidationError)
async def _h_validacao(_: Request, e: RequestValidationError):
    campos = ", ".join(".".join(str(p) for p in er["loc"][1:]) for er in e.errors())
    return _resp(422, "DADOS_INVALIDOS", f"Campos inválidos: {campos}.")


@app.exception_handler(Exception)
async def _h_geral(_: Request, e: Exception):
    return _resp(500, "ERRO_INTERNO", "Erro inesperado no servidor.")


class Cadastro(BaseModel):
    nome: str = Field(min_length=2, max_length=80)
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=120)
    senha: str = Field(min_length=6, max_length=100)


class Login(BaseModel):
    email: str
    senha: str


class NovaOcorrencia(BaseModel):
    tipo: str
    descricao: str = Field(min_length=3, max_length=300)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


@app.post("/auth/register", status_code=201)
def registrar(d: Cadastro):
    try:
        with db.conn() as c:
            cur = c.execute(
                "INSERT INTO usuario (nome, email, senha_hash, criado_em) VALUES (?,?,?,?)",
                (d.nome, d.email.lower(), auth.gerar_hash(d.senha),
                 datetime.now(timezone.utc).isoformat()),
            )
            uid = cur.lastrowid
    except sqlite3.IntegrityError:
        raise ApiErro(409, "EMAIL_EXISTENTE", "Já existe uma conta com esse e-mail.")
    return {"token": auth.criar_token(uid), "nome": d.nome}


@app.post("/auth/login")
def entrar(d: Login):
    with db.conn() as c:
        u = c.execute("SELECT * FROM usuario WHERE email = ?", (d.email.lower(),)).fetchone()
    if not u or not auth.verificar_senha(d.senha, u["senha_hash"]):
        raise ApiErro(401, "CREDENCIAIS_INVALIDAS", "E-mail ou senha incorretos.")
    return {"token": auth.criar_token(u["id"]), "nome": u["nome"]}


@app.get("/clima")
async def clima(lat: float = Query(ge=-90, le=90), lon: float = Query(ge=-180, le=180),
                _: int = Depends(auth.usuario_atual)):
    return await externo.obter_clima(lat, lon)


@app.get("/ar")
async def ar(lat: float = Query(ge=-90, le=90), lon: float = Query(ge=-180, le=180),
             _: int = Depends(auth.usuario_atual)):
    return await externo.obter_ar(lat, lon)


def _haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    dlat, dlon = radians(lat2 - lat1), radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * r * asin(sqrt(a))


@app.post("/ocorrencias", status_code=201)
def criar_ocorrencia(d: NovaOcorrencia, uid: int = Depends(auth.usuario_atual)):
    if d.tipo not in TIPOS:
        raise ApiErro(422, "TIPO_INVALIDO", f"Tipo deve ser um de: {', '.join(sorted(TIPOS))}.")
    desde = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    with db.conn() as c:
        n = c.execute(
            "SELECT COUNT(*) FROM ocorrencia WHERE usuario_id=? AND criado_em>?", (uid, desde)
        ).fetchone()[0]
        if n >= LIMITE_POR_HORA:
            raise ApiErro(429, "LIMITE_EXCEDIDO", "Limite de ocorrências por hora atingido.")
        agora = datetime.now(timezone.utc).isoformat()
        cur = c.execute(
            "INSERT INTO ocorrencia (usuario_id,tipo,descricao,latitude,longitude,criado_em) "
            "VALUES (?,?,?,?,?,?)",
            (uid, d.tipo, d.descricao, d.latitude, d.longitude, agora),
        )
    return {"id": cur.lastrowid, **d.model_dump(), "criado_em": agora}


@app.get("/ocorrencias")
def listar_ocorrencias(lat: float = Query(ge=-90, le=90), lon: float = Query(ge=-180, le=180),
                       raio_km: float = Query(10, gt=0, le=100),
                       _: int = Depends(auth.usuario_atual)):
    with db.conn() as c:
        linhas = c.execute(
            "SELECT id,tipo,descricao,latitude,longitude,criado_em FROM ocorrencia "
            "ORDER BY criado_em DESC"
        ).fetchall()
    saida = []
    for l in linhas:
        dist = _haversine_km(lat, lon, l["latitude"], l["longitude"])
        if dist <= raio_km:
            saida.append({**dict(l), "distancia_km": round(dist, 2)})
    return saida


@app.get("/saude")
def saude():
    return {"status": "ok"}
