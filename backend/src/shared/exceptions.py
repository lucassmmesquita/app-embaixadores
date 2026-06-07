"""
═══════════════════════════════════════════════════════════════
  Shared Exceptions — Custom API exceptions
═══════════════════════════════════════════════════════════════
"""

from fastapi import HTTPException, status


class NotFoundException(HTTPException):
    def __init__(self, detail: str = "Recurso não encontrado"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class ForbiddenException(HTTPException):
    def __init__(self, detail: str = "Acesso negado"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class ConflictException(HTTPException):
    def __init__(self, detail: str = "Conflito — recurso já existe"):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)


class BadRequestException(HTTPException):
    def __init__(self, detail: str = "Requisição inválida"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class UnauthorizedException(HTTPException):
    def __init__(self, detail: str = "Não autorizado"):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)
