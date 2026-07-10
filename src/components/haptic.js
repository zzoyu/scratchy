/**
 * Vibration API 및 iOS 햅틱 폴백 관리를 담당하는 모듈
 */
export class HapticManager {
  constructor() {
    this.hasVibration = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
    this.isIOSDevice = this._checkIsIOS();
    this.lastVibrateTime = 0;
    this.vibrateInterval = 60; // 60ms 간격으로 진동 제한 (과도한 호출 방지)
  }

  /**
   * iOS 기기인지 판별 (진동 미지원 기기로서 쉐이크 효과를 강화하기 위함)
   */
  _checkIsIOS() {
    if (typeof window === 'undefined') return false;
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /ipad|iphone|ipod/.test(userAgent) || 
           (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /mac/.test(userAgent));
  }

  /**
   * 미세 진동을 일으킵니다.
   * @param {number} duration - 진동 시간 (ms)
   */
  trigger(duration = 10) {
    if (!this.hasVibration || this.isIOSDevice) {
      return; // iOS이거나 진동 API 미지원 시 무시
    }

    const now = Date.now();
    if (now - this.lastVibrateTime > this.vibrateInterval) {
      try {
        navigator.vibrate(duration);
        this.lastVibrateTime = now;
      } catch (e) {
        console.warn('Vibration trigger failed:', e);
      }
    }
  }

  /**
   * 긁기 완료 시 발생하는 강한 진동 패턴
   */
  triggerSuccess() {
    if (this.hasVibration && !this.isIOSDevice) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch (e) {
        console.warn('Vibration success trigger failed:', e);
      }
    }
  }
}
