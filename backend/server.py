import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "mytriplog.db"

app = FastAPI(
    title="MyTripLog Mac mini Backend",
    description="로컬 맥미니 기반 오프라인 퍼스트 여행 플래너 & 가계부 동기화 서버",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def init_db() -> None:
    with get_conn() as conn:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS trips (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                destination TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                total_budget INTEGER NOT NULL DEFAULT 1000000,
                currency TEXT NOT NULL DEFAULT 'KRW',
                cover_emoji TEXT NOT NULL DEFAULT '✈️',
                status TEXT NOT NULL DEFAULT 'planned',
                memo TEXT NOT NULL DEFAULT '',
                photos_json TEXT NOT NULL DEFAULT '[]',
                extra_json TEXT NOT NULL DEFAULT '{}',
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS schedules (
                id TEXT PRIMARY KEY,
                trip_id TEXT NOT NULL,
                day_number INTEGER NOT NULL DEFAULT 1,
                order_index INTEGER NOT NULL DEFAULT 0,
                place_name TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'spot',
                time_slot TEXT NOT NULL DEFAULT '10:00',
                lat REAL NOT NULL DEFAULT 35.6762,
                lng REAL NOT NULL DEFAULT 139.6503,
                address TEXT NOT NULL DEFAULT '',
                memo TEXT NOT NULL DEFAULT '',
                updated_at TEXT NOT NULL,
                FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS expenses (
                id TEXT PRIMARY KEY,
                trip_id TEXT NOT NULL,
                day_number INTEGER NOT NULL DEFAULT 1,
                title TEXT NOT NULL,
                amount REAL NOT NULL,
                currency TEXT NOT NULL DEFAULT 'KRW',
                krw_amount INTEGER NOT NULL,
                category TEXT NOT NULL DEFAULT 'food',
                spent_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS app_meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS colored_regions (
                id TEXT PRIMARY KEY,
                region_key TEXT NOT NULL,
                region_name TEXT NOT NULL,
                country_name TEXT NOT NULL DEFAULT '대한민국',
                flag TEXT NOT NULL DEFAULT '🇰🇷',
                scope TEXT NOT NULL DEFAULT 'domestic',
                visited_date TEXT NOT NULL,
                color TEXT NOT NULL DEFAULT '#38bdf8',
                memo TEXT NOT NULL DEFAULT '',
                lat REAL NOT NULL DEFAULT 37.5665,
                lng REAL NOT NULL DEFAULT 126.9780,
                geojson_str TEXT NOT NULL DEFAULT '',
                updated_at TEXT NOT NULL
            );
            """
        )

        # 기존 DB에 extra_json 컬럼이 없을 경우 무중단 자동 추가
        try:
            conn.execute("ALTER TABLE trips ADD COLUMN extra_json TEXT NOT NULL DEFAULT '{}';")
        except sqlite3.OperationalError:
            pass

        # 최초 DB 생성 시에만 1회 시딩 (사용자가 샘플을 모두 삭제해도 재기동 시 복구되지 않도록 보호)
        seed_done = conn.execute(
            "SELECT value FROM app_meta WHERE key = 'initial_seed_done'"
        ).fetchone()
        count = conn.execute("SELECT COUNT(*) FROM trips").fetchone()[0]
        conn.execute(
            "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('initial_seed_done', '1')"
        )
        if not seed_done and count == 0:
            ts = now_iso()
            conn.execute(
                """
                INSERT INTO trips (id, title, destination, start_date, end_date, total_budget, currency, cover_emoji, status, memo, photos_json, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "trip-tokyo-2026",
                    "도쿄 가을 미식 & 미술관 투어",
                    "도쿄, 일본",
                    "2026-10-24",
                    "2026-10-27",
                    1200000,
                    "JPY",
                    "🗼",
                    "planned",
                    "시부야 스카이 선셋 예약 완료. 스이카 카드 충전 필수!",
                    json.dumps([]),
                    ts,
                ),
            )
            conn.execute(
                """
                INSERT INTO trips (id, title, destination, start_date, end_date, total_budget, currency, cover_emoji, status, memo, photos_json, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "trip-jeju-archive",
                    "제주 서쪽 해안도로 힐링 여행",
                    "제주도, 대한민국",
                    "2026-05-15",
                    "2026-05-18",
                    800000,
                    "KRW",
                    "🍊",
                    "completed",
                    "협재 해수욕장 노을이 정말 아름다웠던 여행. 다음엔 우도에서 1박 하기!",
                    json.dumps(
                        [
                            {
                                "id": "photo-1",
                                "caption": "협재 에메랄드빛 바다와 비양도",
                                "date": "2026-05-16",
                                "url": "https://images.unsplash.com/photo-1548115184-bc6544d06a58?auto=format&fit=crop&w=800&q=80",
                            }
                        ]
                    ),
                    ts,
                ),
            )

            sample_schedules = [
                ("sch-1", "trip-tokyo-2026", 1, 0, "나리타 국제공항 제1터미널", "transit", "11:30", 35.7719, 140.3929, "Chiba, Narita", "스카이라이너 탑승", ts),
                ("sch-2", "trip-tokyo-2026", 1, 1, "시부야 스카이 (SHIBUYA SKY)", "spot", "15:00", 35.6580, 139.7016, "2-24-12 Shibuya, Tokyo", "QR 티켓 오프라인 캡처 준비", ts),
                ("sch-3", "trip-tokyo-2026", 1, 2, "이치란 라멘 시부야점", "food", "18:30", 35.6612, 139.7010, "1-22-7 Jinnan, Shibuya", "반숙 계란 추가", ts),
                ("sch-4", "trip-tokyo-2026", 2, 0, "츠키지 장외시장", "food", "09:30", 35.6655, 139.7707, "4 Chome Tsukiji, Chuo", "카이센동 & 계란말이", ts),
                ("sch-5", "trip-tokyo-2026", 2, 1, "모리 미술관 (롯폰기 힐즈)", "spot", "14:00", 35.6604, 139.7292, "6-10-1 Roppongi, Minato", "현대미술 특별전 관람", ts),
            ]
            conn.executemany(
                """
                INSERT INTO schedules (id, trip_id, day_number, order_index, place_name, category, time_slot, lat, lng, address, memo, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                sample_schedules,
            )

            sample_expenses = [
                ("exp-1", "trip-tokyo-2026", 1, "스카이라이너 왕복권", 5400, "JPY", 49680, "transport", "2026-10-24T11:45:00", ts),
                ("exp-2", "trip-tokyo-2026", 1, "시부야 스카이 입장권", 2500, "JPY", 23000, "tour", "2026-10-24T15:00:00", ts),
                ("exp-3", "trip-tokyo-2026", 1, "이치란 라멘 저녁 식사", 1680, "JPY", 15456, "food", "2026-10-24T19:00:00", ts),
                ("exp-4", "trip-jeju-archive", 1, "제주 렌터카 3일 완전자차", 165000, "KRW", 165000, "transport", "2026-05-15T10:30:00", ts),
                ("exp-5", "trip-jeju-archive", 2, "애월 흑돼지 구이", 68000, "KRW", 68000, "food", "2026-05-16T19:00:00", ts),
            ]
            conn.executemany(
                """
                INSERT INTO expenses (id, trip_id, day_number, title, amount, currency, krw_amount, category, spent_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                sample_expenses,
            )


# --- Pydantic Models ---
class TripPayload(BaseModel):
    id: str
    title: str
    destination: str
    start_date: str
    end_date: str
    total_budget: int = 1000000
    currency: str = "KRW"
    cover_emoji: str = "✈️"
    status: str = "planned"
    memo: str = ""
    photos: List[Dict[str, Any]] = Field(default_factory=list)
    flights: List[Dict[str, Any]] = Field(default_factory=list)
    accommodations: List[Dict[str, Any]] = Field(default_factory=list)
    checklist: List[Dict[str, Any]] = Field(default_factory=list)
    cities: List[Dict[str, Any]] = Field(default_factory=list)
    country: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    updated_at: Optional[str] = None


class SchedulePayload(BaseModel):
    id: str
    trip_id: str
    day_number: int = 1
    order_index: int = 0
    place_name: str
    category: str = "spot"
    time_slot: str = "10:00"
    lat: float = 35.6762
    lng: float = 139.6503
    address: str = ""
    memo: str = ""
    updated_at: Optional[str] = None


class ExpensePayload(BaseModel):
    id: str
    trip_id: str
    day_number: int = 1
    title: str
    amount: float
    currency: str = "KRW"
    krw_amount: int
    category: str = "food"
    spent_at: str
    updated_at: Optional[str] = None


class SyncAction(BaseModel):
    id: str
    entity: str  # 'trip' | 'schedule' | 'expense' | 'schedule_reorder'
    action: str  # 'upsert' | 'delete'
    payload: Dict[str, Any]
    created_at: str


class SyncBatchRequest(BaseModel):
    actions: List[SyncAction]


def serialize_trip(row: sqlite3.Row) -> Dict[str, Any]:
    d = dict(row)
    d["photos"] = json.loads(d.pop("photos_json", "[]") or "[]")
    extra_raw = d.pop("extra_json", "{}") or "{}"
    try:
        extra = json.loads(extra_raw)
    except Exception:
        extra = {}
    d["flights"] = extra.get("flights", [])
    d["accommodations"] = extra.get("accommodations", [])
    d["checklist"] = extra.get("checklist", [])
    d["cities"] = extra.get("cities", [])
    d["country"] = extra.get("country", "")
    d["lat"] = extra.get("lat", None)
    d["lng"] = extra.get("lng", None)
    return d


def apply_upsert_trip(conn: sqlite3.Connection, p: Dict[str, Any]) -> None:
    ts = p.get("updated_at") or now_iso()
    photos_json = json.dumps(p.get("photos", []), ensure_ascii=False)
    extra_json = json.dumps(
        {
            "flights": p.get("flights", []),
            "accommodations": p.get("accommodations", []),
            "checklist": p.get("checklist", []),
            "cities": p.get("cities", []),
            "country": p.get("country", ""),
            "lat": p.get("lat", None),
            "lng": p.get("lng", None),
        },
        ensure_ascii=False,
    )
    conn.execute(
        """
        INSERT OR REPLACE INTO trips
        (id, title, destination, start_date, end_date, total_budget, currency, cover_emoji, status, memo, photos_json, extra_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            p["id"],
            p["title"],
            p["destination"],
            p["start_date"],
            p["end_date"],
            int(p.get("total_budget", 1000000)),
            p.get("currency", "KRW"),
            p.get("cover_emoji", "✈️"),
            p.get("status", "planned"),
            p.get("memo", ""),
            photos_json,
            extra_json,
            ts,
        ),
    )


def apply_upsert_schedule(conn: sqlite3.Connection, p: Dict[str, Any]) -> None:
    ts = p.get("updated_at") or now_iso()
    conn.execute(
        """
        INSERT OR REPLACE INTO schedules
        (id, trip_id, day_number, order_index, place_name, category, time_slot, lat, lng, address, memo, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            p["id"],
            p["trip_id"],
            int(p.get("day_number", 1)),
            int(p.get("order_index", 0)),
            p["place_name"],
            p.get("category", "spot"),
            p.get("time_slot", "10:00"),
            float(p.get("lat", 35.6762)),
            float(p.get("lng", 139.6503)),
            p.get("address", ""),
            p.get("memo", ""),
            ts,
        ),
    )


def apply_upsert_expense(conn: sqlite3.Connection, p: Dict[str, Any]) -> None:
    ts = p.get("updated_at") or now_iso()
    conn.execute(
        """
        INSERT OR REPLACE INTO expenses
        (id, trip_id, day_number, title, amount, currency, krw_amount, category, spent_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            p["id"],
            p["trip_id"],
            int(p.get("day_number", 1)),
            p["title"],
            float(p["amount"]),
            p.get("currency", "KRW"),
            int(p["krw_amount"]),
            p.get("category", "food"),
            p.get("spent_at") or ts,
            ts,
        ),
    )


def apply_upsert_colored_region(conn: sqlite3.Connection, p: Dict[str, Any]) -> None:
    ts = p.get("updated_at") or now_iso()
    geojson_val = p.get("geojson", p.get("geojson_str", ""))
    if isinstance(geojson_val, (dict, list)):
        geojson_str = json.dumps(geojson_val, ensure_ascii=False)
    else:
        geojson_str = str(geojson_val or "")

    conn.execute(
        """
        INSERT OR REPLACE INTO colored_regions
        (id, region_key, region_name, country_name, flag, scope, visited_date, color, memo, lat, lng, geojson_str, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            p["id"],
            p.get("region_key") or f"{p.get('country_name', '대한민국')}-{p['region_name']}",
            p["region_name"],
            p.get("country_name", "대한민국"),
            p.get("flag", "🇰🇷"),
            p.get("scope", "domestic"),
            p.get("visited_date") or ts[:10],
            p.get("color", "#38bdf8"),
            p.get("memo", ""),
            float(p.get("lat", 37.5665)),
            float(p.get("lng", 126.9780)),
            geojson_str,
            ts,
        ),
    )


def serialize_colored_region(row: sqlite3.Row) -> Dict[str, Any]:
    d = dict(row)
    raw = d.pop("geojson_str", "") or ""
    try:
        d["geojson"] = json.loads(raw) if raw else None
    except Exception:
        d["geojson"] = None
    return d


init_db()


@app.get("/api/health")
def health_check() -> Dict[str, Any]:
    return {"status": "ok", "server": "macmini-mytriplog", "timestamp": now_iso()}


@app.get("/api/bootstrap")
def get_bootstrap_data() -> Dict[str, Any]:
    """앱 초기 진입 또는 동기화 직후 전체 최신 스냅샷 반환"""
    with get_conn() as conn:
        trips = [
            serialize_trip(r)
            for r in conn.execute("SELECT * FROM trips ORDER BY start_date ASC").fetchall()
        ]
        schedules = [
            dict(r)
            for r in conn.execute(
                "SELECT * FROM schedules ORDER BY day_number ASC, order_index ASC"
            ).fetchall()
        ]
        expenses = [
            dict(r)
            for r in conn.execute(
                "SELECT * FROM expenses ORDER BY spent_at DESC, updated_at DESC"
            ).fetchall()
        ]
        colored_regions = [
            serialize_colored_region(r)
            for r in conn.execute(
                "SELECT * FROM colored_regions ORDER BY visited_date DESC, updated_at DESC"
            ).fetchall()
        ]
    return {
        "trips": trips,
        "schedules": schedules,
        "expenses": expenses,
        "colored_regions": colored_regions,
        "synced_at": now_iso(),
    }


@app.post("/api/trips")
def upsert_trip(payload: TripPayload) -> Dict[str, Any]:
    with get_conn() as conn:
        apply_upsert_trip(conn, payload.model_dump())
    return {"ok": True, "id": payload.id}


@app.delete("/api/trips/{trip_id}")
def delete_trip(trip_id: str) -> Dict[str, Any]:
    with get_conn() as conn:
        conn.execute("DELETE FROM trips WHERE id = ?", (trip_id,))
    return {"ok": True, "id": trip_id}


@app.post("/api/schedules")
def upsert_schedule(payload: SchedulePayload) -> Dict[str, Any]:
    with get_conn() as conn:
        apply_upsert_schedule(conn, payload.model_dump())
    return {"ok": True, "id": payload.id}


@app.put("/api/schedules/reorder")
def reorder_schedules(items: List[SchedulePayload]) -> Dict[str, Any]:
    with get_conn() as conn:
        for item in items:
            apply_upsert_schedule(conn, item.model_dump())
    return {"ok": True, "count": len(items)}


@app.delete("/api/schedules/{schedule_id}")
def delete_schedule(schedule_id: str) -> Dict[str, Any]:
    with get_conn() as conn:
        conn.execute("DELETE FROM schedules WHERE id = ?", (schedule_id,))
    return {"ok": True, "id": schedule_id}


@app.post("/api/expenses")
def upsert_expense(payload: ExpensePayload) -> Dict[str, Any]:
    with get_conn() as conn:
        apply_upsert_expense(conn, payload.model_dump())
    return {"ok": True, "id": payload.id}


@app.delete("/api/expenses/{expense_id}")
def delete_expense(expense_id: str) -> Dict[str, Any]:
    with get_conn() as conn:
        conn.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
    return {"ok": True, "id": expense_id}


@app.post("/api/sync")
def sync_offline_queue(batch: SyncBatchRequest) -> Dict[str, Any]:
    """
    오프라인(IndexedDB sync_queue)에서 누적된 변경 작업을 일괄 반영(Idempotent Upsert/Delete)하고
    최신 전체 스냅샷을 반환합니다.
    """
    applied_ids: List[str] = []
    with get_conn() as conn:
        for item in batch.actions:
            entity = item.entity
            action = item.action
            p = item.payload

            if entity == "trip":
                if action == "upsert":
                    apply_upsert_trip(conn, p)
                elif action == "delete":
                    conn.execute("DELETE FROM trips WHERE id = ?", (p["id"],))
            elif entity == "schedule":
                if action == "upsert":
                    apply_upsert_schedule(conn, p)
                elif action == "delete":
                    conn.execute("DELETE FROM schedules WHERE id = ?", (p["id"],))
            elif entity == "schedule_reorder":
                for sch in p.get("items", []):
                    apply_upsert_schedule(conn, sch)
            elif entity == "expense":
                if action == "upsert":
                    apply_upsert_expense(conn, p)
                elif action == "delete":
                    conn.execute("DELETE FROM expenses WHERE id = ?", (p["id"],))
            elif entity == "colored_region":
                if action == "upsert":
                    apply_upsert_colored_region(conn, p)
                elif action == "delete":
                    conn.execute("DELETE FROM colored_regions WHERE id = ?", (p["id"],))
            else:
                raise HTTPException(status_code=400, detail=f"Unknown entity: {entity}")

            applied_ids.append(item.id)

    snapshot = get_bootstrap_data()
    snapshot["applied_action_ids"] = applied_ids
    return snapshot
