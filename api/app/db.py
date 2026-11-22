import os
import sqlite3


def caminho_db():
    return os.getenv("ALAGA_DB", "alagaalerta.db")


def conn():
    c = sqlite3.connect(caminho_db())
    c.row_factory = sqlite3.Row
    return c


def init_db():
    with conn() as c:
        c.executescript(
            """
            create table if not exists usuario (
                id integer primary key autoincrement,
                nome text not null,
                email text not null unique,
                senha_hash text not null,
                criado_em text not null
            );
            create table if not exists ocorrencia (
                id integer primary key autoincrement,
                usuario_id integer not null references usuario(id),
                tipo text not null,
                descricao text not null,
                latitude real not null,
                longitude real not null,
                criado_em text not null
            );
            """
        )
