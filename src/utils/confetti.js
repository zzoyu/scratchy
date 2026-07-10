/**
 * 긁기 완료 시 화면 전체에 폭죽 효과(Confetti)를 뿌려주는 클래스
 */
export class ConfettiManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.active = false;
    this.colors = ['#d946ef', '#8b5cf6', '#3b82f6', '#06b6d4', '#fbbf24', '#ff4b4b', '#22c55e'];
    this.animationFrameId = null;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /**
   * 캔버스 크기를 윈도우 크기에 맞춥니다.
   */
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /**
   * 새로운 파티클들을 생성합니다.
   */
  _createParticle() {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 8 + 5;
    
    // 모바일에서는 화면 밑이나 옆에서 솟구치게 하거나, 화면 중앙에서 뿜어져 나오게 설정
    // 여기서는 화면 하단 좌/우 구석 및 중앙에서 솟구치게 랜덤 배포
    const spawnPoints = [
      { x: 0, y: this.canvas.height },
      { x: this.canvas.width / 2, y: this.canvas.height },
      { x: this.canvas.width, y: this.canvas.height }
    ];
    const point = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];

    return {
      x: point.x,
      y: point.y,
      vx: Math.cos(angle) * speed + (point.x === 0 ? 3 : point.x === this.canvas.width ? -3 : 0),
      vy: -Math.random() * 15 - 10, // 위로 솟구침
      size: Math.random() * 6 + 6,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 10 - 5,
      opacity: 1,
      gravity: 0.35,
      friction: 0.98
    };
  }

  /**
   * 폭죽 효과를 시작합니다.
   * @param {number} duration - 효과 지속 시간 (ms)
   */
  start(duration = 2500) {
    if (this.active) return;
    this.active = true;
    this.particles = [];
    
    // 초기 폭발적으로 50개 생성
    for (let i = 0; i < 60; i++) {
      this.particles.push(this._createParticle());
    }

    // 지속시간 동안 계속 추가 생성
    const interval = setInterval(() => {
      if (!this.active) {
        clearInterval(interval);
        return;
      }
      for (let i = 0; i < 5; i++) {
        this.particles.push(this._createParticle());
      }
    }, 50);

    // duration 후 생성 중지
    setTimeout(() => {
      clearInterval(interval);
      setTimeout(() => {
        this.stop();
      }, 2000); // 남아있는 것들 마저 떨어진 뒤 완전히 중지
    }, duration);

    this._animate();
  }

  /**
   * 루프 돌며 애니메이션 렌더링
   */
  _animate() {
    if (!this.active && this.particles.length === 0) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      // 물리 연산
      p.vy += p.gravity;
      p.vx *= p.friction;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;

      // 바닥을 벗어났거나 완전히 투명해진 것 삭제
      if (p.y > this.canvas.height + 20 || p.opacity <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // 화면 근처로 떨어질 때 서서히 흐려짐
      if (p.y > this.canvas.height * 0.8) {
        p.opacity -= 0.02;
      }

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.globalAlpha = Math.max(0, p.opacity);
      this.ctx.fillStyle = p.color;
      
      // 사각형 confetti 드로잉
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      this.ctx.restore();
    }

    this.animationFrameId = requestAnimationFrame(() => this._animate());
  }

  /**
   * 폭죽을 멈추고 캔버스를 청소합니다.
   */
  stop() {
    this.active = false;
    this.particles = [];
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
