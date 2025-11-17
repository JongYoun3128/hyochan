# 리워드몰 사전예약 랜딩 페이지

순수 HTML, CSS, JavaScript로 구현된 리워드몰 사전예약 랜딩 원페이지입니다.

## 기능

-   ✅ 130% 리워드 소개
-   ✅ ₩110,000 사전예약 폼
-   ✅ 파트너스(5%) 신청
-   ✅ 실시간 카운트다운
-   ✅ 리워드/마진 계산기
-   ✅ FAQ 아코디언
-   ✅ 반응형 디자인 (Tailwind CSS)
-   ✅ **Google Sheets 자동 저장** (모달 폼 데이터)

## 실행 방법

1. `index.html` 파일을 브라우저에서 직접 열기
2. 또는 로컬 서버로 실행:

    ```bash
    # Python 3
    python -m http.server 8000

    # Node.js (http-server)
    npx http-server
    ```

## 파일 구조

```
.
├── index.html              # 메인 HTML 파일
├── style.css               # 커스텀 CSS 스타일
├── app.js                  # 모든 JavaScript 로직 (구글 시트 연동 포함)
├── 구글시트_연동_가이드.md  # Google Sheets 설정 가이드
└── README.md              # 이 파일
```

## 주요 특징

-   **순수 JavaScript**: React 없이 바닐라 JS로 구현
-   **Tailwind CSS CDN**: 별도 빌드 과정 없이 바로 사용
-   **상태 관리**: 간단한 상태 객체로 관리
-   **테스트 케이스**: console.assert로 계산 로직 검증
-   **구글 시트 연동**: 사전예약 데이터 자동 저장

## Google Sheets 연동

모달 폼에 입력된 데이터를 Google Sheets에 자동으로 저장할 수 있습니다.

**설정 방법**: `구글시트_연동_가이드.md` 파일을 참고하세요.

1. Google Sheets 생성
2. Google Apps Script 설정 (가이드 문서 내 코드 사용)
3. 웹앱으로 배포
4. `app.js`의 `GOOGLE_SHEET_URL`에 웹앱 URL 입력

### 저장되는 데이터

-   타임스탬프 (자동 생성)
-   이름
-   연락처
-   이메일
-   입금일시
-   입금자명
-   파트너스 코드 (선택)
-   고유코드 (자동 생성)

## TODO

-   [x] Google Sheets 연동
-   [ ] 실제 결제 연동 (PG SDK)
-   [ ] 서버 API 연동
-   [ ] 파트너 코드 추적 시스템

## 라이선스

프로젝트 내부 사용 목적
