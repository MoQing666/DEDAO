"""Pydantic 请求/响应模型（FastAPI 自动校验 + OpenAPI 文档）"""
from datetime import datetime

from pydantic import BaseModel, Field


# ---------- 玩家 ----------
class PlayerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=32, examples=["云无月"])


class PlayerOut(BaseModel):
    id: int
    name: str
    api_key: str  # 注册时一次性下发，之后作为身份凭据

    model_config = {"from_attributes": True}


# ---------- 分数 / 排行榜 ----------
class ScoreSubmit(BaseModel):
    score: int = Field(ge=0, examples=[102400])
    stage: str = Field(default="", max_length=32, examples=["元婴期"])


class LeaderboardEntry(BaseModel):
    rank: int
    name: str
    score: int
    stage: str
    achieved_at: datetime


# ---------- 云存档 ----------
class SaveUpload(BaseModel):
    slot: str = Field(default="main", max_length=16, examples=["main"])
    data: dict = Field(examples=[{"engine": {"spiritStones": 1024}, "version": "0.9.2"}])
    # version 为客户端已知的旧版本号；与服务端一致才允许覆盖（乐观锁）
    version: int | None = Field(default=None, ge=1)


class SaveOut(BaseModel):
    slot: str
    data: dict
    version: int
    updated_at: datetime

    model_config = {"from_attributes": True}


class SaveVersionCheck(BaseModel):
    current_version: int
