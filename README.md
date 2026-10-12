# ✈️ MyTripLog (마이트립로그)

**MyTripLog**는 로컬 맥미니(Mac mini) 홈서버를 백엔드로 활용하며, 비행기 모드나 해외 로밍 오프라인 환경에서도 일정·동선 확인과 가계부 기록이 가능한 **모바일 퍼스트 개인 맞춤형 여행 플래너 PWA**입니다.

---

## ✨ 핵심 기능

1. **📡 오프라인 퍼스트 PWA & 맥미니 자동 동기화**
   - `vite-plugin-pwa`(Service Worker) + 브라우저 네이티브 `IndexedDB`(`mytriplog_idb`)를 통해 오프라인 상태에서도 전체 여행 일정과 가계부를 즉시 조회하고 입력할 수 있습니다.
   - 오프라인에서 추가·수정한 지출 내역과 동선 변경 사항은 `sync_queue`에 보관되었다가 네트워크 복구(`online` / `visibilitychange` / `SyncManager`) 시 맥미니 백엔드(`POST /api/sync`)로 일괄 멱등(Idempotent) 동기화됩니다.
2. **🧭 [계획] D-Day 대시보드 (`HomePage`)**
   - 출발일/종료일 기준 실시간 D-Day 카운트다운(`D-N`, `Day N 여행중`, `D+N`), 예산 소진율 미니 위젯, 동선 요약 및 새 여행 플랜 등록/수정 바텀 시트를 제공합니다.
3. **📍 [일정] 지도 핀·동선 연결 및 드래그 앤 드롭 (`SchedulePage`)**
   - `@dnd-kit` 기반 모바일 터치/포인터 드래그 앤 드롭으로 타임라인 순서를 변경하면 지도 위 핀 번호(`1 → 2 → 3`)와 이동 동선(`Polyline`) 및 총 이동 거리(`km`)가 실시간으로 갱신됩니다.
   - `VITE_GOOGLE_MAPS_API_KEY` 설정 시 Google Maps JS SDK가 렌더링되며, 오프라인 또는 키 미설정 시 인터랙티브 SVG 벡터 동선 맵과 내장 인기 명소 검색(`PRESET_PLACES` + OpenStreetMap 폴백)이 자동 동작합니다.
4. **💰 [예산] 다중 통화 가계부 & 프로그레스 바 (`BudgetPage`)**
   - `KRW`, `JPY`, `USD`, `EUR` 다중 통화 입력 시 즉시 원화(`₩`)로 환산되어 총 예산 대비 지출 비율 프로그레스 바와 카테고리별(`식비`, `교통`, `숙박`, `쇼핑`, `관광`) 비중에 실시간 반영됩니다.
5. **📸 [추억] 여행 아카이빙 (`ArchivePage`)**
   - 종료된 여행의 회고 메모와 사진을 기록합니다. 기기 사진 업로드 시 브라우저 `Canvas`에서 경량 JPEG DataURL로 자동 리사이즈되어 별도 외부 스토리지 없이도 오프라인 및 맥미니 SQLite에 안전하게 보관됩니다.

---

## 🛠️ 기술 스택 & 포트 구성

| 구분 | 기술 스택 | 포트 |
| :--- | :--- | :---: |
| **Frontend (PWA)** | React 19, Vite 6, Tailwind CSS v4, Zustand, `@dnd-kit`, `vite-plugin-pwa` | `5174` |
| **Backend (Mac mini)** | FastAPI, Python 표준 `sqlite3` (`WAL` 모드, `backend/mytriplog.db`) | `8050` |

---

## 🚀 실행 방법

```bash
# 1. 의존성 설치
npm install

# 2. 맥미니 백엔드(8050) + 프론트엔드(5174) 통합 실행
./start.sh

# 또는 개별 실행:
npm run api   # FastAPI + SQLite 서버 (http://127.0.0.1:8050)
npm run dev   # Vite PWA 개발 서버 (http://localhost:5174)
```
