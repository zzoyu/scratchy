/**
 * HTML5 Canvas를 활용하여 스크래치 카드 메커니즘을 구현하고,
 * 햅틱 진동, 티켓 흔들림, 가루 파티클 이펙트를 연동하는 컴포넌트
 */
export class ScratchCard {
  /**
   * @param {HTMLCanvasElement} canvas - 스크래치 은박을 그릴 Canvas 엘리먼트
   * @param {HTMLElement} ticketEl - 흔들림 효과를 적용할 티켓 카드 컨테이너 엘리먼트
   * @param {HapticManager} hapticManager - 햅틱 진동 관리 객체
   * @param {Function} onComplete - 75% 이상 긁었을 때 호출될 콜백 함수
   */
  constructor(canvas, ticketEl, hapticManager, onComplete) {
    this.canvas = canvas;
    this.ticketEl = ticketEl;
    this.haptic = hapticManager;
    this.onComplete = onComplete;
    
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    this.isDrawing = false;
    this.isCompleted = false;
    this.lastX = 0;
    this.lastY = 0;
    
    // 브러쉬 크기 및 계산 최적화 변수
    this.brushRadius = 24;
    this.checkTimeout = null;
    
    this._bindEvents();
  }

  /**
   * 은박 레이어를 캔버스에 렌더링하고 상태를 초기화합니다.
   */
  initCard() {
    this.isCompleted = false;
    this.isDrawing = false;
    this.canvas.style.opacity = '1';
    this.canvas.style.pointerEvents = 'auto';
    this.ticketEl.classList.remove('completed', 'scratching-shake', 'scratching-shake-intense');

    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // 고해상도 모바일 화면을 위해 캔버스 물리 해상도 보정
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;

    // 1. 은박 메탈릭 실버 그라데이션 채우기
    const gradient = this.ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#e2e8f0');   // slate-200
    gradient.addColorStop(0.3, '#cbd5e1'); // slate-300
    gradient.addColorStop(0.5, '#94a3b8'); // slate-400 (메탈릭 반사광 느낌)
    gradient.addColorStop(0.7, '#cbd5e1');
    gradient.addColorStop(1, '#94a3b8');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);

    // 2. 미세 노이즈 패턴 렌더링 (리얼한 은박 질감)
    const imgData = this.ctx.getImageData(0, 0, width * dpr, height * dpr);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      // 아주 미세한 백색/회색 노이즈 노이즈 가감
      const noise = (Math.random() - 0.5) * 16;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));     // R
      data[i+1] = Math.min(255, Math.max(0, data[i+1] + noise)); // G
      data[i+2] = Math.min(255, Math.max(0, data[i+2] + noise)); // B
    }
    this.ctx.putImageData(imgData, 0, 0);

    // 3. 은박 장식 테두리 라인
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(6, 6, width - 12, height - 12);

    // 4. "SCRATCH HERE!" 안내 문구 텍스트 드로잉
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    this.ctx.shadowBlur = 4;
    this.ctx.shadowOffsetY = 1;
    
    this.ctx.fillStyle = '#475569'; // 메탈릭 어두운 글자
    this.ctx.font = '800 1.2rem "Outfit", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.letterSpacing = '0.15em';
    this.ctx.fillText('SCRATCH HERE!', width / 2, height / 2);

    // 그림자 복구
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetY = 0;
  }

  /**
   * 이벤트 리스너 바인딩
   */
  _bindEvents() {
    // 마우스 이벤트
    this.canvas.addEventListener('mousedown', (e) => this._onStart(e));
    this.canvas.addEventListener('mousemove', (e) => this._onMove(e));
    window.addEventListener('mouseup', () => this._onEnd());
    
    // 터치 이벤트
    this.canvas.addEventListener('touchstart', (e) => this._onStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this._onMove(e), { passive: false });
    window.addEventListener('touchend', () => this._onEnd());
  }

  /**
   * 이벤트가 캔버스 상에서 발생한 정확한 로컬 좌표를 구합니다.
   */
  _getCoordinates(e) {
    const rect = this.canvas.getBoundingClientRect();
    let clientX, clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  _onStart(e) {
    if (this.isCompleted) return;
    
    // 터치 이동 시 브라우저 기본 스크롤(풀다운 리프레시 등) 무력화
    if (e.cancelable) e.preventDefault();

    this.isDrawing = true;
    const { x, y } = this._getCoordinates(e);
    this.lastX = x;
    this.lastY = y;
    
    // 터치 시작 시 즉시 지우기 및 미세 피드백
    this._scratch(x, y);
  }

  _onMove(e) {
    if (!this.isDrawing || this.isCompleted) return;
    if (e.cancelable) e.preventDefault();

    const { x, y } = this._getCoordinates(e);
    this._scratch(x, y);
    
    this.lastX = x;
    this.lastY = y;
  }

  _onEnd() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    
    // 긁기 멈추면 쉐이크 클래스 제거
    this.ticketEl.classList.remove('scratching-shake', 'scratching-shake-intense');
    
    // 마우스를 뗄 때 최종 스크래치 율 체크
    this._checkScratchPercentage();
  }

  /**
   * 지정 좌표를 은박 Canvas에서 지우고 물리 효과를 발생시킵니다.
   */
  _scratch(x, y) {
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.beginPath();
    
    // 선을 그려서 공백 없이 매끄럽게 연결되도록 처리
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    this.ctx.lineWidth = this.brushRadius * 2;
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();

    // 1. 햅틱 피드백 유발
    this.haptic.trigger(10);

    // 2. 쉐이크 효과 인가 (진동 미지원 iOS 기기는 격렬한 쉐이크 이펙트 추가)
    if (this.haptic.isIOSDevice) {
      this.ticketEl.classList.add('scratching-shake-intense');
    } else {
      this.ticketEl.classList.add('scratching-shake');
    }

    // 3. 긁개 가루 파티클 생성
    this._spawnParticles(x, y);

    // 4. 성능 최적화: 200ms 단위로 긁기 진척도 계산 실행 (디바운싱)
    if (!this.checkTimeout) {
      this.checkTimeout = setTimeout(() => {
        this._checkScratchPercentage();
        this.checkTimeout = null;
      }, 200);
    }
  }

  /**
   * 은박 지우개 가루 파티클 생성
   */
  _spawnParticles(x, y) {
    const container = this.ticketEl.querySelector('#particle-container');
    if (!container) return;

    // 모바일 성능을 위해 한 번에 3개 정도만 스폰
    const count = 3;
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'scratch-particle';
      
      // 스폰 좌표 지정
      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;
      
      container.appendChild(particle);

      // 발사 벡터 연산 (무작위 각도 & 속도)
      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * 60 + 30; // 발사 속도
      const targetX = Math.cos(angle) * velocity;
      const targetY = Math.sin(angle) * velocity + 20; // 중력 때문에 아래로 더 쳐지게

      // 애니메이션 적용
      requestAnimationFrame(() => {
        particle.style.transform = `translate(calc(-50% + ${targetX}px), calc(-50% + ${targetY}px)) scale(0.2)`;
        particle.style.opacity = '0';
      });

      // 400ms 후 DOM에서 완전 제거
      setTimeout(() => {
        if (container.contains(particle)) {
          container.removeChild(particle);
        }
      }, 400);
    }
  }

  /**
   * Canvas 내의 투명 픽셀 비율(긁기 달성률)을 계산합니다.
   */
  _checkScratchPercentage() {
    if (this.isCompleted) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // 계산 성능을 향상시키기 위해 픽셀 데이터를 축소 분석 (샘플링)
    // 10x10 간격으로 그리드를 나눠 투명도 체크
    const sampleSize = 8; 
    let totalSamples = 0;
    let clearedSamples = 0;

    try {
      const imgData = this.ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      // 4채널(RGBA) 중 Alpha 채널이 데이터의 [i+3] 위치에 존재
      for (let y = 0; y < height; y += sampleSize) {
        for (let x = 0; x < width; x += sampleSize) {
          const index = (y * width + x) * 4;
          totalSamples++;
          // 알파 채널이 10 이하(대부분 투명해진 상태)이면 긁힌 픽셀로 카운트
          if (data[index + 3] <= 10) {
            clearedSamples++;
          }
        }
      }

      const percent = (clearedSamples / totalSamples) * 100;
      
      // 75% 이상 긁혔을 때 완료 처리
      if (percent >= 75) {
        this._completeCard();
      }
    } catch (e) {
      console.error('Scratch percentage check failed:', e);
    }
  }

  /**
   * 완료 조건 만족 시 은박 레이어를 즉시 숨기고 성공 콜백을 작동시킵니다.
   */
  _completeCard() {
    this.isCompleted = true;
    this.isDrawing = false;
    
    // 남은 흔들림 클래스 초기화
    this.ticketEl.classList.remove('scratching-shake', 'scratching-shake-intense');
    
    // 캔버스 부드러운 사라짐 처리
    this.canvas.style.transition = 'opacity 0.6s ease';
    this.canvas.style.opacity = '0';
    this.canvas.style.pointerEvents = 'none';

    // 티켓 자체에 성공 완료 클래스 부여 (Glow 효과 등)
    this.ticketEl.classList.add('completed');

    // 햅틱 성공 성공 진동
    this.haptic.triggerSuccess();

    // 완료 콜백 함수 실행
    if (typeof this.onComplete === 'function') {
      this.onComplete();
    }
  }
}
