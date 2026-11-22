import os
import tempfile

os.environ["ALAGA_DB"] = os.path.join(tempfile.mkdtemp(), "teste.db")

import httpx
import pytest
from fastapi.testclient import TestClient

from app import externo
from app.main import app


@pytest.fixture(autouse=True)
def api_externa_fora(monkeypatch):
    async def falha(*a, **k):
        raise httpx.ConnectError("sem rede")
    monkeypatch.setattr(externo, "_buscar", falha)
    externo._cache.clear()


@pytest.fixture
def cliente():
    with TestClient(app) as c:
        yield c


def _token(cliente, email="a@a.com"):
    r = cliente.post("/auth/register", json={"nome": "Ana", "email": email, "senha": "123456"})
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_cadastro_duplicado(cliente):
    _token(cliente, "dup@a.com")
    r = cliente.post("/auth/register", json={"nome": "Ana", "email": "dup@a.com", "senha": "123456"})
    assert r.status_code == 409 and r.json()["erro"]["codigo"] == "EMAIL_EXISTENTE"


def test_login_invalido(cliente):
    r = cliente.post("/auth/login", json={"email": "x@x.com", "senha": "errada"})
    assert r.status_code == 401


def test_rota_sem_token(cliente):
    assert cliente.get("/clima?lat=-23.5&lon=-46.6").status_code == 401


def test_clima_usa_fallback_quando_api_cai(cliente):
    h = _token(cliente, "c@a.com")
    r = cliente.get("/clima?lat=-23.5&lon=-46.6", headers=h)
    assert r.status_code == 200 and r.json()["fonte"] == "mock"


def test_ar_usa_fallback(cliente):
    h = _token(cliente, "d@a.com")
    assert cliente.get("/ar?lat=-23.5&lon=-46.6", headers=h).json()["fonte"] == "mock"


def test_validacao_coordenada(cliente):
    h = _token(cliente, "e@a.com")
    r = cliente.get("/clima?lat=999&lon=0", headers=h)
    assert r.status_code == 422 and r.json()["erro"]["codigo"] == "DADOS_INVALIDOS"


def test_ocorrencia_e_filtro_por_raio(cliente):
    h = _token(cliente, "f@a.com")
    body = {"tipo": "alagamento", "descricao": "Rua cheia", "latitude": -23.55, "longitude": -46.63}
    assert cliente.post("/ocorrencias", json=body, headers=h).status_code == 201
    perto = cliente.get("/ocorrencias?lat=-23.55&lon=-46.63&raio_km=5", headers=h).json()
    longe = cliente.get("/ocorrencias?lat=-22.90&lon=-43.17&raio_km=5", headers=h).json()
    assert len(perto) >= 1 and longe == []


def test_tipo_invalido(cliente):
    h = _token(cliente, "g@a.com")
    r = cliente.post("/ocorrencias", headers=h,
                     json={"tipo": "xxx", "descricao": "abc", "latitude": 0, "longitude": 0})
    assert r.json()["erro"]["codigo"] == "TIPO_INVALIDO"


def test_limite_por_hora(cliente):
    h = _token(cliente, "h@a.com")
    body = {"tipo": "outro", "descricao": "teste", "latitude": 0, "longitude": 0}
    for _ in range(10):
        assert cliente.post("/ocorrencias", json=body, headers=h).status_code == 201
    assert cliente.post("/ocorrencias", json=body, headers=h).status_code == 429
