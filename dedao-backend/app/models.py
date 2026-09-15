"""ORM 模型：玩家 / 分数 / 云存档"""
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Player(Base):
    __tablename__ = "players"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    api_key: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    scores: Mapped[list["Score"]] = relationship(back_populates="player")
    saves: Mapped[list["Save"]] = relationship(back_populates="player")


class Score(Base):
    """分数记录：保留历史，排行榜取每个玩家最高分。"""

    __tablename__ = "scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    score: Mapped[int] = mapped_column(Integer, index=True)
    stage: Mapped[str] = mapped_column(String(32), default="")  # 所处境界/关卡
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    player: Mapped["Player"] = relationship(back_populates="scores")


class Save(Base):
    """云存档：每个玩家每个存档槽一份，覆盖式更新。"""

    __tablename__ = "saves"
    __table_args__ = (UniqueConstraint("player_id", "slot", name="uq_player_slot"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    slot: Mapped[str] = mapped_column(String(16), default="main")
    data: Mapped[dict] = mapped_column(JSON)  # 游戏存档 JSON（引擎状态）
    version: Mapped[int] = mapped_column(Integer, default=1)  # 乐观锁，防并发覆盖
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    player: Mapped["Player"] = relationship(back_populates="saves")
