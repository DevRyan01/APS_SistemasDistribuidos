# ClimaCidadao - API Mobile

API intermediária (camada 2) entre o app mobile e a API Destino (Open-Meteo).

## Rodar
```
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Documentação interativa (Swagger): http://localhost:8000/docs

## Testes
```
python -m pytest -q
```

## Rotas
| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | /auth/register | não | Cria conta e devolve token |
| POST | /auth/login | não | Login e token |
| GET | /clima?lat&lon | sim | Clima atual e prob. máxima de chuva |
| GET | /ar?lat&lon | sim | Índice de qualidade do ar (US AQI) |
| POST | /ocorrencias | sim | Registra ocorrência |
| GET | /ocorrencias?lat&lon&raio_km | sim | Lista ocorrências no raio |
| GET | /saude | não | Verificação de disponibilidade |

Erros seguem o formato `{"erro": {"codigo": "...", "mensagem": "..."}}`.

## Variáveis de ambiente
`ALAGA_SEGREDO` (chave do JWT), `ALAGA_DB` (caminho do SQLite).

## Limitações
- Não detecta alagamento: repassa clima e reúne relatos de usuários.
- Quando a Open-Meteo falha, retorna dados fictícios com `"fonte": "mock"`.
