import './style.css';
import { HapticManager } from './components/haptic.js';
import { Sharer } from './components/sharer.js';
import { ScratchCard } from './components/scratch-card.js';
import { ConfettiManager } from './utils/confetti.js';

// 1. 매니저 클래스 인스턴스 초기화
const haptic = new HapticManager();
const sharer = new Sharer();

// 2. DOM 엘리먼트 획득
const playView = document.getElementById('play-view');
const createView = document.getElementById('create-view');
const viewSubtitle = document.getElementById('view-subtitle');

const canvas = document.getElementById('scratch-canvas');
const ticket = document.getElementById('scratch-ticket');
const targetMessage = document.getElementById('target-message');
const scratchGuide = document.getElementById('scratch-guide');
const actionArea = document.getElementById('action-area');

const btnCreateMode = document.getElementById('btn-create-mode');
const btnResetTicket = document.getElementById('btn-reset-ticket');
const btnBackToPlay = document.getElementById('btn-back-to-play');

const messageInput = document.getElementById('message-input');
const charCount = document.getElementById('char-count');
const btnGenerate = document.getElementById('btn-generate');

const shareModal = document.getElementById('share-modal');
const shareUrlInput = document.getElementById('share-url-input');
const btnCopyUrl = document.getElementById('btn-copy-url');
const btnCloseModal = document.getElementById('btn-close-modal');

const confettiCanvas = document.getElementById('confetti-canvas');

// 3. Confetti 매니저 초기화
const confetti = new ConfettiManager(confettiCanvas);

// 4. ScratchCard 컴포넌트 초기화
const scratchCard = new ScratchCard(canvas, ticket, haptic, () => {
  // 스크래칭 완료 콜백
  scratchGuide.style.display = 'none';
  
  // 버튼 액션 영역 노출
  actionArea.classList.remove('fade-in-hidden');
  actionArea.classList.add('fade-in-visible');
  
  // 폭죽 팡팡!
  confetti.start(2500);
});

/**
 * URL 상태에 맞춰 복권을 설정합니다.
 */
function setupAppFromUrl() {
  const sharedMsg = sharer.getSharedMessage();
  confetti.stop();

  if (sharedMsg) {
    // 공유된 비밀 문구가 있는 경우
    targetMessage.textContent = sharedMsg;
    viewSubtitle.textContent = '누군가 보낸 비밀 메시지입니다. 어서 긁어보세요!';
    btnCreateMode.classList.remove('btn-secondary');
    btnCreateMode.classList.add('btn-primary');
  } else {
    // 기본 첫 진입 상태
    targetMessage.textContent = '안녕 💰';
    viewSubtitle.textContent = '메시지가 숨겨진 행운의 티켓을 긁어보세요!';
    btnCreateMode.classList.remove('btn-primary');
    btnCreateMode.classList.add('btn-secondary');
  }

  // UI 상태 복구
  scratchGuide.style.display = 'flex';
  actionArea.classList.remove('fade-in-visible');
  actionArea.classList.add('fade-in-hidden');

  // 은박 다시 씌우기
  scratchCard.initCard();
}

// 최초 로딩 및 해시 변경 시 초기화 연동
window.addEventListener('load', setupAppFromUrl);
window.addEventListener('hashchange', setupAppFromUrl);

// 윈도우 크기 변화 시 은박 캔버스 재조정 (긁는 중 리사이즈 감지)
window.addEventListener('resize', () => {
  if (!scratchCard.isCompleted) {
    scratchCard.initCard();
  }
});

// 5. 버튼 이벤트 바인딩

// 나도 만들기 버튼 -> 작성 모드로 화면 전환
btnCreateMode.addEventListener('click', () => {
  playView.classList.remove('active');
  createView.classList.add('active');
  messageInput.value = '';
  charCount.textContent = '0';
  messageInput.focus();
});

// 다시 긁기 버튼
btnResetTicket.addEventListener('click', () => {
  setupAppFromUrl();
});

// 돌아가기 버튼 -> 플레이 모드로 화면 전환
btnBackToPlay.addEventListener('click', () => {
  createView.classList.remove('active');
  playView.classList.add('active');
});

// 실시간 글자수 계산 및 16자 제한 시각 피드백
messageInput.addEventListener('input', (e) => {
  const value = e.target.value;
  
  // 모바일 입력 가상 키보드 고려한 문자 제한
  if (value.length > 16) {
    e.target.value = value.substring(0, 16);
  }
  
  charCount.textContent = e.target.value.length;
  
  // 16자에 도달하면 숫자를 강조
  if (e.target.value.length >= 16) {
    charCount.style.color = '#d946ef';
  } else {
    charCount.style.color = 'var(--text-secondary)';
  }
});

// 링크 생성 버튼 클릭
btnGenerate.addEventListener('click', () => {
  const text = messageInput.value.trim();
  
  if (!text) {
    alert('비밀 메시지를 입력해주세요! (최대 16자)');
    messageInput.focus();
    return;
  }

  // URL 생성 및 모달 표시
  const shareUrl = sharer.generateShareUrl(text);
  shareUrlInput.value = shareUrl;
  
  shareModal.classList.add('active');
});

// 클립보드 복사 버튼 클릭
btnCopyUrl.addEventListener('click', async () => {
  const success = await sharer.copyToClipboard(shareUrlInput.value);
  
  if (success) {
    btnCopyUrl.textContent = '완료! ✅';
    btnCopyUrl.classList.remove('btn-accent');
    btnCopyUrl.style.background = '#22c55e'; // 성공 초록색
    
    setTimeout(() => {
      btnCopyUrl.textContent = '복사';
      btnCopyUrl.style.background = '';
      btnCopyUrl.classList.add('btn-accent');
    }, 1500);
  } else {
    alert('복사에 실패했습니다. 주소창의 텍스트를 직접 복사해주세요.');
  }
});

// 모달 닫기
btnCloseModal.addEventListener('click', () => {
  shareModal.classList.remove('active');
});

// 모달 외부 영역 클릭 시 닫기
shareModal.addEventListener('click', (e) => {
  if (e.target === shareModal) {
    shareModal.classList.remove('active');
  }
});
