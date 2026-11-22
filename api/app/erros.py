class ApiErro(Exception):
    def __init__(self, status, codigo, mensagem):
        self.status = status
        self.codigo = codigo
        self.mensagem = mensagem
