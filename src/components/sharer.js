/**
 * URL 기반의 메시지 인코딩/디코딩 및 공유 링크 생성을 담당하는 모듈
 */
export class Sharer {
  /**
   * 한글을 포함한 UTF-8 문자열을 URL 세이프한 Base64로 인코딩합니다.
   * @param {string} str - 원본 메시지 (최대 16자)
   */
  encode(str) {
    const trimmed = str.trim().substring(0, 16);
    try {
      // 1. encodeURIComponent로 UTF-8 바이트 시퀀스(%XX)로 변환
      // 2. 바이트 값을 문자로 변환 후 btoa 실행
      return btoa(
        encodeURIComponent(trimmed).replace(/%([0-9A-F]{2})/g, (_, p1) => 
          String.fromCharCode(parseInt(p1, 16))
        )
      );
    } catch (e) {
      console.error('Encoding failed:', e);
      return '';
    }
  }

  /**
   * URL 세이프한 Base64 문자열을 원본 UTF-8 문자열로 디코딩합니다.
   * @param {string} b64 - Base64 문자열
   */
  decode(b64) {
    if (!b64) return '';
    try {
      // 1. atob로 문자열 복원
      // 2. 개별 바이트 문자를 %XX 형식의 URI 컴포넌트로 매핑
      // 3. decodeURIComponent로 복구
      return decodeURIComponent(
        atob(b64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch (e) {
      console.error('Decoding failed:', e);
      return '';
    }
  }

  /**
   * 현재 URL 해시(#) 파라미터에서 메시지를 추출해 반환합니다.
   * 예: https://domain/#m=SGVsbG8= -> "Hello"
   */
  getSharedMessage() {
    const hash = window.location.hash;
    if (!hash || !hash.startsWith('#m=')) {
      return null;
    }
    const b64Data = hash.substring(3); // '#m=' 이후 부분
    return this.decode(b64Data);
  }

  /**
   * 메시지를 기반으로 전체 공유 URL을 생성합니다.
   * @param {string} msg 
   */
  generateShareUrl(msg) {
    const b64Data = this.encode(msg);
    const origin = window.location.origin + window.location.pathname;
    return `${origin}#m=${b64Data}`;
  }

  /**
   * 텍스트를 클립보드에 복사합니다.
   * @param {string} text 
   */
  async copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        console.error('Clipboard API failed, falling back:', e);
      }
    }

    // Clipboard API 미지원 기기 폴백 (예: 구형 모바일 브라우저)
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed'; // 화면 밖 배치
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error('Fallback copy failed:', err);
      if (document.body.contains(textArea)) {
        document.body.removeChild(textArea);
      }
      return false;
    }
  }
}
