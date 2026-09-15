"""简单 API Key 鉴权：注册下发，之后通过 X-API-Key 请求头识别玩家。"""
import secrets

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from .database import get_db
from .models import Player


def generate_api_key() -> str:
    return secrets.token_hex(24)


def get_current_player(
    x_api_key: str = Header(..., description="注册时下发的 API Key"),
    db: Session = Depends(get_db),
) -> Player:
    player = db.query(Player).filter(Player.api_key == x_api_key).first()
    if player is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的 API Key，请先注册玩家",
        )
    return player
