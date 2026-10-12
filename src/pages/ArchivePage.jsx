import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  BookOpen,
  Plus,
  Trash2,
  Check,
  Calendar,
  MapPin,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import BottomSheet from '../components/BottomSheet';
import { calculateDday, isTripPast, makeId, useTripStore } from '../store/useTripStore';

// 로컬 사진 파일을 오프라인/SQLite 저장에 적합하도록 경량 WebP/JPEG DataURL로 리사이즈
function compressImageFile(file, maxWidth = 900) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ArchivePage() {
  const navigate = useNavigate();
  const trips = useTripStore((s) => s.trips);
  const expenses = useTripStore((s) => s.expenses);
  const activeTripId = useTripStore((s) => s.activeTripId);
  const setActiveTripId = useTripStore((s) => s.setActiveTripId);
  const saveTrip = useTripStore((s) => s.saveTrip);
  const deleteTrip = useTripStore((s) => s.deleteTrip);

  // 추억: 여행 기간이 지났거나(end_date < 오늘) 완료 처리된 지난 여행 일정만 표시
  const pastTrips = useMemo(
    () =>
      trips
        .filter((t) => isTripPast(t))
        .sort((a, b) => b.start_date.localeCompare(a.start_date)),
    [trips]
  );

  const activeTrip =
    pastTrips.find((t) => t.id === activeTripId) || pastTrips[0] || null;

  const [memoDraft, setMemoDraft] = useState(activeTrip?.memo || '');
  const [savedNotice, setSavedNotice] = useState(false);
  const [isPhotoSheetOpen, setIsPhotoSheetOpen] = useState(false);
  const [photoForm, setPhotoForm] = useState({ caption: '', url: '' });

  // 활성 여행이 바뀌면 메모 동기화
  const currentMemo = memoDraft !== undefined ? memoDraft : activeTrip?.memo || '';

  // 추억에서 여행 일정을 선택하면 해당 일정 상세(/schedule)로 즉시 진입
  const handleEnterPastTrip = (trip) => {
    setActiveTripId(trip.id);
    setMemoDraft(trip.memo || '');
    navigate('/schedule');
  };

  const handleSelectForNote = (trip) => {
    setActiveTripId(trip.id);
    setMemoDraft(trip.memo || '');
  };

  const handleRestoreToHome = async (trip) => {
    await saveTrip({ ...trip, status: 'planned' });
  };

  const handleSaveMemo = async () => {
    if (!activeTrip) return;
    await saveTrip({ ...activeTrip, memo: memoDraft });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1800);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await compressImageFile(file);
    setPhotoForm((prev) => ({ ...prev, url: dataUrl }));
  };

  const handleAddPhoto = async (e) => {
    e.preventDefault();
    if (!activeTrip || !photoForm.url) return;
    const newPhoto = {
      id: makeId('photo'),
      caption: photoForm.caption.trim() || `${activeTrip.destination}의 순간`,
      date: new Date().toISOString().slice(0, 10),
      url: photoForm.url,
    };
    const nextPhotos = [newPhoto, ...(activeTrip.photos || [])];
    await saveTrip({ ...activeTrip, photos: nextPhotos });
    setPhotoForm({ caption: '', url: '' });
    setIsPhotoSheetOpen(false);
  };

  const handleDeletePhoto = async (photoId) => {
    if (!activeTrip) return;
    const nextPhotos = (activeTrip.photos || []).filter((p) => p.id !== photoId);
    await saveTrip({ ...activeTrip, photos: nextPhotos });
  };

  const tripTotalSpent = expenses
    .filter((e) => e.trip_id === activeTrip?.id)
    .reduce((acc, cur) => acc + (cur.krw_amount || 0), 0);

  return (
    <div className="space-y-5">
      {/* 1. 지난 여행 일정 리스트 (선택 시 해당 여행의 일정 상세 화면으로 이동) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span>추억 · 지난 여행 일정 ({pastTrips.length})</span>
            </h1>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              여행을 선택하면 해당 여행의 상세 일정·가계부로 들어갑니다
            </p>
          </div>
        </div>

        {pastTrips.length === 0 ? (
          <div className="glass-card rounded-3xl p-8 text-center space-y-2 border border-white/10">
            <BookOpen className="w-8 h-8 text-zinc-500 mx-auto" />
            <p className="text-sm font-semibold text-zinc-200">아직 지난 여행 일정이 없습니다</p>
            <p className="text-xs text-zinc-400">
              여행 기간이 종료되거나 [홈]에서 추억으로 이동한 여행이 이곳에 보관됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {pastTrips.map((trip) => {
              const badge = calculateDday(trip.start_date, trip.end_date);
              const isSelected = trip.id === activeTrip?.id;
              return (
                <div
                  key={trip.id}
                  onClick={() => handleEnterPastTrip(trip)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleEnterPastTrip(trip)}
                  className={`glass-card rounded-2xl p-4 flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99] ${
                    isSelected
                      ? 'ring-2 ring-purple-400/70 bg-purple-500/10'
                      : 'hover:bg-white/5 opacity-90'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl shrink-0">
                      {trip.cover_emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-purple-300">{badge.label}</span>
                        <span className="text-[10px] text-zinc-400">
                          {trip.start_date} ~ {trip.end_date}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-white truncate mt-0.5">
                        {trip.title}
                      </h3>
                      <p className="text-xs text-zinc-400 truncate">
                        {trip.destination} · 사진 {(trip.photos || []).length}장
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectForNote(trip);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-purple-500/20 border border-purple-400/30 text-[11px] font-semibold text-purple-200 hover:bg-purple-500/30"
                    >
                      사진·회고
                    </button>
                    {trip.status === 'completed' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestoreToHome(trip);
                        }}
                        title="계획 상태로 되돌리기"
                        className="tap-target inline-flex items-center justify-center rounded-xl text-zinc-400 hover:text-sky-400 hover:bg-white/10"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTrip(trip.id);
                      }}
                      aria-label={`${trip.title} 삭제`}
                      className="tap-target inline-flex items-center justify-center rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {activeTrip && (
        <>
          {/* 2. 선택된 지난 여행 요약 및 텍스트 회고록 메모장 */}
          <section className="glass-card rounded-3xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium">
                  추억 회고록 & 앨범
                </span>
                <h2 className="text-lg font-bold text-white mt-1">
                  {activeTrip.cover_emoji} {activeTrip.title}
                </h2>
                <p className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-purple-400" />
                    {activeTrip.destination}
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    {activeTrip.start_date} ~ {activeTrip.end_date}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-zinc-400">총 지출 기록</span>
                <p className="text-sm font-bold text-emerald-400">
                  ₩{tripTotalSpent.toLocaleString()}
                </p>
                <button
                  type="button"
                  onClick={() => handleEnterPastTrip(activeTrip)}
                  className="mt-1 text-[11px] font-semibold text-sky-400 hover:underline"
                >
                  일정 상세 보기 →
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <label htmlFor="archive-memo" className="text-xs font-semibold text-zinc-300">
                  나만의 여행 기록 & 메모
                </label>
                <button
                  type="button"
                  onClick={handleSaveMemo}
                  className="tap-target inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-200 text-xs font-medium"
                >
                  {savedNotice ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>저장됨</span>
                    </>
                  ) : (
                    <span>메모 저장</span>
                  )}
                </button>
              </div>
              <textarea
                id="archive-memo"
                rows={4}
                value={currentMemo}
                onChange={(e) => setMemoDraft(e.target.value)}
                placeholder="가장 기억에 남는 장소, 음식, 다음 여행을 위한 팁을 기록해 보세요."
                className="w-full p-3.5 rounded-2xl bg-black/40 border border-white/10 text-sm text-zinc-100 leading-relaxed focus:outline-none focus:border-purple-400"
              />
            </div>
          </section>

          {/* 3. 추억 사진 갤러리 */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-sky-400" />
                <span>추억 스냅샷 ({(activeTrip.photos || []).length})</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsPhotoSheetOpen(true)}
                className="tap-target inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white"
              >
                <Plus className="w-4 h-4 text-sky-400" />
                <span>사진 추가</span>
              </button>
            </div>

            {(!activeTrip.photos || activeTrip.photos.length === 0) ? (
              <div className="glass-card rounded-3xl p-8 text-center space-y-2">
                <Camera className="w-8 h-8 text-zinc-500 mx-auto" />
                <p className="text-sm font-medium text-zinc-300">아직 등록된 추억 사진이 없습니다</p>
                <p className="text-xs text-zinc-500">
                  아이폰/갤러리 사진을 올리면 오프라인에서도 언제든 꺼내볼 수 있습니다.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {activeTrip.photos.map((photo) => (
                  <article
                    key={photo.id}
                    className="glass-card rounded-3xl overflow-hidden border border-white/10"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption}
                      loading="lazy"
                      className="w-full h-52 object-cover bg-zinc-900"
                    />
                    <div className="p-3.5 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-white">{photo.caption}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{photo.date}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(photo.id)}
                        aria-label="사진 삭제"
                        className="tap-target inline-flex items-center justify-center rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* 추억 사진 추가 바텀 시트 */}
      <BottomSheet
        isOpen={isPhotoSheetOpen}
        onClose={() => setIsPhotoSheetOpen(false)}
        title="추억 사진 기록하기"
      >
        <form onSubmit={handleAddPhoto} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              기기에서 사진 선택 (자동 리사이즈 및 오프라인 저장)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="w-full text-xs text-zinc-300 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sky-500/20 file:text-sky-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              또는 이미지 URL 직접 입력
            </label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={photoForm.url}
              onChange={(e) => setPhotoForm({ ...photoForm, url: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-sky-400"
            />
          </div>

          {photoForm.url && (
            <img
              src={photoForm.url}
              alt="미리보기"
              className="w-full h-40 object-cover rounded-2xl border border-white/10"
            />
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">한 줄 캡션</label>
            <input
              type="text"
              placeholder="예: 시부야 스카이에서 본 황혼"
              value={photoForm.caption}
              onChange={(e) => setPhotoForm({ ...photoForm, caption: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-sky-400"
            />
          </div>

          <button
            type="submit"
            disabled={!photoForm.url}
            className="tap-target w-full py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-zinc-950 font-bold text-sm"
          >
            앨범에 저장하기
          </button>
        </form>
      </BottomSheet>
    </div>
  );
}
