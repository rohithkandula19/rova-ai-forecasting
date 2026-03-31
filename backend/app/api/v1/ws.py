from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import asyncio, json
from datetime import datetime

router = APIRouter()

class ConnMgr:
    def __init__(self):
        self.active: dict[str, list[WebSocket]] = {}

    async def connect(self, ws: WebSocket, game_id: str):
        await ws.accept()
        self.active.setdefault(game_id, []).append(ws)

    def disconnect(self, ws: WebSocket, game_id: str):
        if game_id in self.active:
            self.active[game_id] = [w for w in self.active[game_id] if w != ws]

    async def broadcast(self, game_id: str, msg: dict):
        for ws in list(self.active.get(game_id, [])):
            try:
                await ws.send_text(json.dumps(msg))
            except Exception:
                self.disconnect(ws, game_id)

manager = ConnMgr()

@router.websocket("/draws")
async def draw_feed(ws: WebSocket, game_id: str = Query("all")):
    await manager.connect(ws, game_id)
    try:
        await ws.send_text(json.dumps({"type":"connected","game_id":game_id,
                                        "ts":datetime.utcnow().isoformat()}))
        while True:
            await asyncio.sleep(30)
            await ws.send_text(json.dumps({"type":"heartbeat","ts":datetime.utcnow().isoformat()}))
    except WebSocketDisconnect:
        manager.disconnect(ws, game_id)
    except Exception:
        manager.disconnect(ws, game_id)

@router.websocket("/live")
async def live_feed(ws: WebSocket):
    await manager.connect(ws, "all")
    try:
        await ws.send_text(json.dumps({"type":"connected","game_id":"all",
                                        "ts":datetime.utcnow().isoformat()}))
        while True:
            await asyncio.sleep(30)
            await ws.send_text(json.dumps({"type":"heartbeat","ts":datetime.utcnow().isoformat()}))
    except WebSocketDisconnect:
        manager.disconnect(ws, "all")
    except Exception:
        manager.disconnect(ws, "all")
