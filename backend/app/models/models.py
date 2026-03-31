import uuid
from datetime import datetime, date
from sqlalchemy import String, Boolean, Integer, Float, BigInteger, DateTime, Date, ForeignKey, Text, Index
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base

class Game(Base):
    __tablename__ = "games"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    country: Mapped[str] = mapped_column(String(50), nullable=False)
    pool_size: Mapped[int] = mapped_column(Integer, nullable=False)
    bonus_pool_size: Mapped[int] = mapped_column(Integer, default=25)
    draw_schedule: Mapped[str] = mapped_column(String(100), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    draws = relationship("Draw", back_populates="game", cascade="all, delete-orphan")
    features = relationship("NumberFeature", back_populates="game", cascade="all, delete-orphan")

class Draw(Base):
    __tablename__ = "draws"
    __table_args__ = (Index("ix_draws_game_date", "game_id", "draw_date"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    game_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("games.id"), nullable=False)
    draw_date: Mapped[date] = mapped_column(Date, nullable=False)
    numbers: Mapped[list] = mapped_column(ARRAY(Integer), nullable=False)
    bonus: Mapped[int] = mapped_column(Integer, default=0)
    jackpot: Mapped[int] = mapped_column(BigInteger, default=0)
    winners: Mapped[int] = mapped_column(Integer, default=0)
    source: Mapped[str] = mapped_column(String(50), default="manual")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    game = relationship("Game", back_populates="draws")

class NumberFeature(Base):
    __tablename__ = "number_features"
    __table_args__ = (Index("ix_features_game_number", "game_id", "number"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    game_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("games.id"), nullable=False)
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    freq_30d: Mapped[float] = mapped_column(Float, default=0.0)
    freq_60d: Mapped[float] = mapped_column(Float, default=0.0)
    freq_90d: Mapped[float] = mapped_column(Float, default=0.0)
    freq_all: Mapped[float] = mapped_column(Float, default=0.0)
    entropy: Mapped[float] = mapped_column(Float, default=0.0)
    last_seen_draws_ago: Mapped[int] = mapped_column(Integer, default=0)
    avg_gap: Mapped[float] = mapped_column(Float, default=14.0)
    trend_slope_7d: Mapped[float] = mapped_column(Float, default=0.0)
    positional_bias: Mapped[float] = mapped_column(Float, default=0.0)
    computed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    game = relationship("Game", back_populates="features")

class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), default="")
    plan: Mapped[str] = mapped_column(String(20), default="free")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_login: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    simulations = relationship("Simulation", back_populates="user", cascade="all, delete-orphan")

class MLModel(Base):
    __tablename__ = "ml_models"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    game_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("games.id"), nullable=False)
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    architecture: Mapped[str] = mapped_column(String(50), default="dense_nn")
    val_loss: Mapped[float] = mapped_column(Float, default=0.0)
    accuracy: Mapped[float] = mapped_column(Float, default=0.0)
    artifact_path: Mapped[str] = mapped_column(String(500), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    deployed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Simulation(Base):
    __tablename__ = "simulations"
    __table_args__ = (Index("ix_simulations_user_date", "user_id", "ran_at"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    game_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("games.id"), nullable=False)
    strategy: Mapped[str] = mapped_column(String(50), default="ai_model")
    n_simulations: Mapped[int] = mapped_column(Integer, default=1000000)
    n_tickets: Mapped[int] = mapped_column(Integer, default=100)
    results: Mapped[dict] = mapped_column(JSONB, default={})
    status: Mapped[str] = mapped_column(String(20), default="pending")
    ran_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="simulations")

class BacktestResult(Base):
    __tablename__ = "backtest_results"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    game_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("games.id"), nullable=False)
    strategy: Mapped[str] = mapped_column(String(50), nullable=False)
    period_start: Mapped[date] = mapped_column(Date)
    period_end: Mapped[date] = mapped_column(Date)
    avg_matches: Mapped[float] = mapped_column(Float, default=0.0)
    match_distribution: Mapped[dict] = mapped_column(JSONB, default={})
    roi_estimate: Mapped[float] = mapped_column(Float, default=-48.0)
    notes: Mapped[str] = mapped_column(Text, default="")
    computed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
