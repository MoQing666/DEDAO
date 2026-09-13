"""DEDAO 排行榜 / 云存档后端服务

FastAPI + SQLite + SQLAlchemy 2.0
为修仙放置游戏 DEDAO 提供玩家注册、分数上报、排行榜查询、云存档读写能力。
"""
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models, schemas
from .auth import get_current_player
from .database import Base, engine, get_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)  # 启动时建表（SQLite 零迁移成本）
    yield


app = FastAPI(
    title="DEDAO Backend",
    description="修仙放置游戏 DEDAO 的排行榜与云存档服务",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health", tags=["system"])
def health():
    return {"status": "ok"}


# ==================== 玩家 ====================

@app.post("/players", response_model=schemas.PlayerOut, status_code=201, tags=["player"])
def register_player(payload: schemas.PlayerCreate, db: Session = Depends(get_db)):
    """注册玩家，返回 api_key（客户端保存，后续所有请求通过 X-API-Key 头携带）。"""
    if db.query(models.Player).filter(models.Player.name == payload.name).first():
        raise HTTPException(status_code=409, detail="该道号已被注册")
    from .auth import generate_api_key

    player = models.Player(name=payload.name, api_key=generate_api_key())
    db.add(player)
    db.commit()
    db.refresh(player)
    return player


# ==================== 分数 / 排行榜 ====================

@app.post("/scores", status_code=201, tags=["score"])
def submit_score(
    payload: schemas.ScoreSubmit,
    player: models.Player = Depends(get_current_player),
    db: Session = Depends(get_db),
):
    """上报分数（服务端记录历史，排行榜取个人最高分）。"""
    record = models.Score(player_id=player.id, score=payload.score, stage=payload.stage)
    db.add(record)
    db.commit()
    return {"detail": "记录成功"}


@app.get("/leaderboard", response_model=list[schemas.LeaderboardEntry], tags=["score"])
def leaderboard(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """全服排行榜：按每个玩家的历史最高分排序。"""
    best = (
        db.query(
            models.Score.player_id.label("pid"),
            func.max(models.Score.score).label("best"),
        )
        .group_by(models.Score.player_id)
        .subquery()
    )
    rows = (
        db.query(models.Player, best.c.best, models.Score)
        .join(best, best.c.pid == models.Player.id)
        .join(
            models.Score,
            (models.Score.player_id == best.c.pid)
            & (models.Score.score == best.c.best),
        )
        .order_by(best.c.best.desc())
        .limit(limit)
        .all()
    )
    seen: set[int] = set()
    entries: list[schemas.LeaderboardEntry] = []
    for player, best_score, score in rows:
        if player.id in seen:
            continue
        seen.add(player.id)
        entries.append(
            schemas.LeaderboardEntry(
                rank=len(entries) + 1,
                name=player.name,
                score=best_score,
                stage=score.stage,
                achieved_at=score.created_at,
            )
        )
    return entries


@app.get("/leaderboard/me", tags=["score"])
def my_rank(
    player: models.Player = Depends(get_current_player),
    db: Session = Depends(get_db),
):
    """查询自己在排行榜的排名与身前一人（用于游戏内展示）。"""
    my_best = (
        db.query(func.max(models.Score.score))
        .filter(models.Score.player_id == player.id)
        .scalar()
    )
    if my_best is None:
        raise HTTPException(status_code=404, detail="还没有上报过分数")
    higher = (
        db.query(func.count(func.distinct(models.Score.player_id)))
        .filter(models.Score.score > my_best)
        .scalar()
    )
    return {"rank": higher + 1, "score": my_best}


# ==================== 云存档 ====================

@app.put("/saves", response_model=schemas.SaveOut, tags=["save"])
def upload_save(
    payload: schemas.SaveUpload,
    player: models.Player = Depends(get_current_player),
    db: Session = Depends(get_db),
):
    """上传/覆盖云存档。携带 version 时做乐观锁校验，防止多端并发互相覆盖。"""
    save = (
        db.query(models.Save)
        .filter(models.Save.player_id == player.id, models.Save.slot == payload.slot)
        .first()
    )
    if save:
        if payload.version is not None and payload.version != save.version:
            raise HTTPException(
                status_code=409,
                detail=f"存档版本冲突（服务端 v{save.version}，客户端 v{payload.version}）",
            )
        save.data = payload.data
        save.version += 1
    else:
        save = models.Save(player_id=player.id, slot=payload.slot, data=payload.data)
        db.add(save)
    db.commit()
    db.refresh(save)
    return save


@app.get("/saves/{slot}", response_model=schemas.SaveOut, tags=["save"])
def download_save(
    slot: str,
    player: models.Player = Depends(get_current_player),
    db: Session = Depends(get_db),
):
    """拉取云存档（换设备/清缓存后恢复进度）。"""
    save = (
        db.query(models.Save)
        .filter(models.Save.player_id == player.id, models.Save.slot == slot)
        .first()
    )
    if not save:
        raise HTTPException(status_code=404, detail="该槽位暂无云存档")
    return save
