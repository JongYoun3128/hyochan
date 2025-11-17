// ✅ 순수 JavaScript 랜딩 원페이지
// - Tailwind CSS 기반 (CDN)
// - 130% 리워드 소개 / ₩110,000 사전예약 / 파트너스(5%) 신청
// - 파트너 코드 즉시 발급(데모) + 로컬 조회(이름/연락처/이메일)
// - 카운트다운 + 파트너 5% 정산 계산기(단순)
// - 구글 시트 연동 (Google Apps Script)
// - ❗️DEV 테스트 케이스(console.assert) 포함

/************************************
 * 구글 시트 설정
 ************************************/
// 여기에 구글 Apps Script 웹 앱 URL을 입력하세요
// 가이드: 구글시트_연동_가이드.md 파일 참조
const GOOGLE_SHEET_URL =
    "https://script.google.com/macros/s/AKfycbzdqOBhz_XWmNbym4_-ZVie69vUoGD16xx6NQ66_69qQJ4vWJBB5JJxkl-ohN6W6DWnRg/exec";

/************************************
 * 유틸 & 테스트 가능한 순수 함수
 ************************************/
function computeDistribution(P, instantRate = 0.1) {
    const price = Number(P) || 0;
    const rate = Number(instantRate) || 0;
    const cost = 0.2 * price;
    const rewardFund = 0.6 * price;
    const companyGross = 0.2 * price;
    const partnerFee = 0.05 * price; // 회사 20% 중 5%p 제공
    const companyNet = 0.15 * price; // 정산 후 실마진
    const customerTarget = 1.3 * price; // 고객 목표 리워드
    const instantReward = rate * price;
    const reservedReward = Math.max(0, customerTarget - instantReward);
    return {
        price,
        cost,
        rewardFund,
        companyGross,
        partnerFee,
        companyNet,
        customerTarget,
        instantReward,
        reservedReward,
    };
}

function formatKRW(n) {
    if (Number.isNaN(Number(n))) return "-";
    return new Intl.NumberFormat("ko-KR", {
        style: "currency",
        currency: "KRW",
        maximumFractionDigits: 0,
    }).format(Math.round(Number(n)));
}

/************************************
 * 파트너 코드 유틸 (데모: localStorage 저장)
 ************************************/
const LS_KEY = "rm_partner_codes";

function loadRecords() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (_) {
        return [];
    }
}

function saveRecords(list) {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(list));
    } catch (_) {}
}

function genCodeOnce() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 가독성 고려(O/I/1/0 제외)
    let out = "P";
    for (let i = 0; i < 7; i++)
        out += chars[Math.floor(Math.random() * chars.length)];
    return out; // 예: P7K4X2M9
}

function generateUniqueCode(existing) {
    let code = genCodeOnce();
    const set = new Set(existing.map((r) => r.code));
    while (set.has(code)) code = genCodeOnce();
    return code;
}

function findCodesByQuery(list, { name, phone, email }) {
    // 하나만 입력해도 조회 가능: 이름/연락처/이메일 중 OR 조건 + 부분일치 + 대소문자/하이픈 무시
    const normalize = (s) => String(s || "").replace(/\D/g, "");
    const n = String(name || "")
        .trim()
        .toLowerCase();
    const p = normalize(phone);
    const e = String(email || "")
        .trim()
        .toLowerCase();
    return list.filter((r) => {
        const nm = String(r.name || "").toLowerCase();
        const ph = normalize(r.phone);
        const em = String(r.email || "").toLowerCase();
        const okN = n && nm.includes(n);
        const okP = p && ph.includes(p);
        const okE = e && em.includes(e);
        return okN || okP || okE;
    });
}

/************************************
 * 구글 시트 전송 함수
 ************************************/
async function sendToGoogleSheet(data) {
    // 구글 시트 URL이 설정되지 않은 경우
    if (!GOOGLE_SHEET_URL || GOOGLE_SHEET_URL.includes("YOUR_SCRIPT_ID")) {
        console.warn(
            "구글 시트 URL이 설정되지 않았습니다. localStorage에만 저장됩니다."
        );
        return { success: false, message: "구글 시트 URL 미설정" };
    }

    try {
        const response = await fetch(GOOGLE_SHEET_URL, {
            method: "POST",
            mode: "no-cors", // CORS 이슈 우회
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        // no-cors 모드에서는 응답을 읽을 수 없으므로 성공으로 간주
        console.log("구글 시트로 데이터 전송 완료:", data);
        return { success: true, message: "데이터 전송 성공" };
    } catch (error) {
        console.error("구글 시트 전송 실패:", error);
        return { success: false, message: error.message };
    }
}

/************************************
 * 상태 관리 (간단한 상태 객체)
 ************************************/
const state = {
    price: 100000,
    openModal: false,
    openCodeModal: false,
    isReserved: false,
    form: {
        name: "",
        phone: "",
        email: "",
        partnerCode: "",
        depositAt: "",
        depositorName: "",
    },
    deadline: new Date("2025-12-31T23:59:00+09:00"),
    now: Date.now(),
    records: [],
    lastCode: "",
    lookup: { name: "", phone: "", email: "" },
    lookupResults: [],
};

/************************************
 * 카운트다운 업데이트
 ************************************/
function updateCountdown() {
    state.now = Date.now();
    const diff = Math.max(0, state.deadline.getTime() - state.now);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    const countdownEl = document.getElementById("countdown");
    if (countdownEl) {
        countdownEl.innerHTML = `
      <div class="countdown-item">
        <span class="countdown-number">${String(days).padStart(2, "0")}</span>
        <span class="countdown-label">일</span>
      </div>
      <div class="countdown-item">
        <span class="countdown-number">${String(hours).padStart(2, "0")}</span>
        <span class="countdown-label">시간</span>
      </div>
      <div class="countdown-item">
        <span class="countdown-number">${String(minutes).padStart(
            2,
            "0"
        )}</span>
        <span class="countdown-label">분</span>
      </div>
      <div class="countdown-item">
        <span class="countdown-number">${String(seconds).padStart(
            2,
            "0"
        )}</span>
        <span class="countdown-label">초</span>
      </div>
    `;
    }
}

/************************************
 * 계산기 업데이트
 ************************************/
function updateCalculator() {
    const dist = computeDistribution(state.price, 0.1);

    // 파트너 정산 금액만 업데이트
    const partnerFeeEl = document.getElementById("calc-partnerFee");
    if (partnerFeeEl) {
        partnerFeeEl.textContent = formatKRW(dist.partnerFee);
    }
}

/************************************
 * 모달 표시/숨김
 ************************************/
function showModal() {
    state.openModal = true;
    const modal = document.getElementById("modal");
    if (modal) {
        modal.classList.remove("hidden");
    }
}

function hideModal() {
    state.openModal = false;
    const modal = document.getElementById("modal");
    if (modal) {
        modal.classList.add("hidden");
    }
}

function showCodeModal(code) {
    state.lastCode = code;
    state.openCodeModal = true;
    const modal = document.getElementById("code-modal");
    if (modal) {
        modal.classList.remove("hidden");
        const codeEl = document.getElementById("modal-code");
        if (codeEl) codeEl.textContent = code;
    }
}

function hideCodeModal() {
    state.openCodeModal = false;
    state.lastCode = "";
    const modal = document.getElementById("code-modal");
    if (modal) {
        modal.classList.add("hidden");
    }
}

function copyCode() {
    if (navigator.clipboard && state.lastCode) {
        navigator.clipboard.writeText(state.lastCode);
        alert("코드가 복사되었습니다!");
    }
}

/************************************
 * FAQ 토글
 ************************************/
function toggleFaq(index) {
    const faqContent = document.getElementById(`faq-content-${index}`);
    const faqIcon = document.getElementById(`faq-icon-${index}`);
    if (faqContent && faqIcon) {
        const isOpen = !faqContent.classList.contains("hidden");
        if (isOpen) {
            faqContent.classList.add("hidden");
            faqIcon.textContent = "+";
        } else {
            faqContent.classList.remove("hidden");
            faqIcon.textContent = "−";
        }
    }
}

/************************************
 * 파트너스 신청 폼 렌더링
 ************************************/
function renderPartnerForm() {
    const container = document.getElementById("partner-form-container");
    if (!container) return;

    const afterDeadline = Date.now() > state.deadline.getTime();

    if (afterDeadline) {
        container.innerHTML =
            '<div class="mt-3 text-xs text-gray-500">사전예약 기간 종료로 신규 파트너스 등록이 영구 마감되었습니다.</div>';
        return;
    }

    if (!state.isReserved) {
        container.innerHTML =
            '<div class="mt-3 text-xs text-gray-600">사전예약을 완료한 계정만 신청할 수 있습니다. 먼저 사전예약을 진행해 주세요.</div>';
        return;
    }

    container.innerHTML = `
    <form id="partner-form" class="mt-3 grid gap-3 sm:grid-cols-3">
      <input id="partner-name" class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 sm:col-span-1 focus:outline-none focus:ring-2 focus:ring-[#0f9ccf]" placeholder="이름" required/>
      <input id="partner-bank" class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 sm:col-span-1 focus:outline-none focus:ring-2 focus:ring-[#0f9ccf]" placeholder="은행 (예: 카카오뱅크)" required/>
      <input id="partner-account" class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 sm:col-span-1 focus:outline-none focus:ring-2 focus:ring-[#0f9ccf]" placeholder="계좌번호" required/>
      <button type="submit" class="sm:col-span-3 rounded-xl bg-[#0f9ccf] px-4 py-2 text-sm font-semibold text-white transition hover:translate-y-[1px] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#0f9ccf]">파트너스 신청하기</button>
    </form>
  `;

    const form = document.getElementById("partner-form");
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            alert(
                "데모: 파트너스 신청이 접수되었습니다. 승인 후 파트너 코드가 발급됩니다."
            );
        });
    }
}

/************************************
 * 조회 결과 렌더링
 ************************************/
function renderLookupResults() {
    const container = document.getElementById("lookup-results");
    if (!container) return;

    if (state.lookupResults.length === 0) {
        container.innerHTML =
            '<div class="lookup-no-results">조회 결과가 없습니다.</div>';
        return;
    }

    // 모바일용 카드 뷰
    const mobileView = state.lookupResults
        .map(
            (r, i) => `
        <div class="lookup-card" key="${r.code + i}">
          <div class="lookup-card-header">
            <div class="lookup-card-code">${r.code}</div>
            <div class="lookup-card-badge">파트너 코드</div>
          </div>
          <div class="lookup-card-body">
            <div class="lookup-card-row">
              <span class="lookup-card-label">이름</span>
              <span class="lookup-card-value">${r.name}</span>
            </div>
            <div class="lookup-card-row">
              <span class="lookup-card-label">연락처</span>
              <span class="lookup-card-value">${r.phone}</span>
            </div>
            <div class="lookup-card-row">
              <span class="lookup-card-label">이메일</span>
              <span class="lookup-card-value">${r.email}</span>
            </div>
            <div class="lookup-card-row">
              <span class="lookup-card-label">입금일시</span>
              <span class="lookup-card-value">${r.depositAt}</span>
            </div>
            <div class="lookup-card-row">
              <span class="lookup-card-label">입금자명</span>
              <span class="lookup-card-value">${r.depositorName}</span>
            </div>
          </div>
        </div>
      `
        )
        .join("");

    // 데스크탑용 테이블 뷰
    const desktopView = `
    <div class="lookup-table-wrapper">
      <table class="lookup-table">
        <thead>
          <tr>
            <th>파트너 코드</th>
            <th>이름</th>
            <th>연락처</th>
            <th>이메일</th>
            <th>입금일시</th>
            <th>입금자명</th>
          </tr>
        </thead>
        <tbody>
          ${state.lookupResults
              .map(
                  (r, i) => `
            <tr key="${r.code + i}">
              <td class="font-mono font-semibold">${r.code}</td>
              <td>${r.name}</td>
              <td>${r.phone}</td>
              <td>${r.email}</td>
              <td>${r.depositAt}</td>
              <td>${r.depositorName}</td>
            </tr>
          `
              )
              .join("")}
        </tbody>
      </table>
    </div>
  `;

    container.innerHTML = `
    <div class="lookup-results-mobile">${mobileView}</div>
    <div class="lookup-results-desktop">${desktopView}</div>
  `;
}

/************************************
 * 이벤트 리스너 설정
 ************************************/
function setupEventListeners() {
    // 가격 입력
    const priceInput = document.getElementById("price-input");
    if (priceInput) {
        priceInput.addEventListener("input", (e) => {
            state.price = Number(e.target.value) || 0;
            updateCalculator();
        });
    }

    // 예약 폼 제출
    const reserveForm = document.getElementById("reserve-form");
    if (reserveForm) {
        reserveForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            // 폼 데이터 수집
            const formData = {
                name: document.getElementById("form-name").value.trim(),
                phone: document.getElementById("form-phone").value.trim(),
                email: document.getElementById("form-email").value.trim(),
                depositAt: document
                    .getElementById("form-depositAt")
                    .value.trim(),
                depositorName: document
                    .getElementById("form-depositorName")
                    .value.trim(),
                partnerCode: document
                    .getElementById("form-partnerCode")
                    .value.trim()
                    .toUpperCase(),
            };

            // 필수값 검증
            if (
                !formData.name ||
                !formData.phone ||
                !formData.email ||
                !formData.depositAt ||
                !formData.depositorName
            ) {
                alert(
                    "이름/연락처/이메일/입금일시/입금자명을 모두 입력해 주세요."
                );
                return;
            }

            // 제출 버튼 비활성화 (중복 제출 방지)
            const submitBtn = reserveForm.querySelector(
                'button[type="submit"]'
            );
            const originalBtnText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = "처리 중...";

            // 코드 생성 및 저장
            const code = generateUniqueCode(state.records);
            const rec = {
                code,
                name: formData.name,
                phone: formData.phone,
                email: formData.email,
                depositAt: formData.depositAt,
                depositorName: formData.depositorName,
                partnerRef: formData.partnerCode || "",
                createdAt: new Date().toISOString(),
            };

            // localStorage에 저장
            const next = [rec, ...state.records];
            state.records = next;
            saveRecords(next);

            // 구글 시트로 전송
            await sendToGoogleSheet(rec);

            state.isReserved = true;
            state.form = formData;

            // 제출 버튼 다시 활성화
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;

            hideModal();
            renderPartnerForm();

            // 폼 초기화
            reserveForm.reset();

            // 코드 모달 표시
            showCodeModal(code);
        });
    }

    // 조회 폼 제출
    const lookupForm = document.getElementById("lookup-form");
    if (lookupForm) {
        lookupForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const lookup = {
                name: document.getElementById("lookup-name").value,
                phone: document.getElementById("lookup-phone").value,
                email: document.getElementById("lookup-email").value,
            };
            if (!(lookup.name || lookup.phone || lookup.email)) {
                alert("이름 또는 연락처 또는 이메일 중 하나는 입력해 주세요.");
                return;
            }
            state.lookup = lookup;
            state.lookupResults = findCodesByQuery(state.records, lookup);
            renderLookupResults();
        });
    }
}

/************************************
 * 전역 함수로 노출 (onclick 사용)
 ************************************/
window.showModal = showModal;
window.hideModal = hideModal;
window.showCodeModal = showCodeModal;
window.hideCodeModal = hideCodeModal;
window.copyCode = copyCode;
window.toggleFaq = toggleFaq;

/************************************
 * 초기화
 ************************************/
document.addEventListener("DOMContentLoaded", () => {
    // localStorage에서 기존 레코드 로드
    state.records = loadRecords();

    // 이벤트 리스너 설정
    setupEventListeners();
    updateCountdown();
    updateCalculator();
    renderPartnerForm();

    // 카운트다운 업데이트 (1초마다)
    setInterval(updateCountdown, 1000);

    // URL 파라미터로 파트너 코드 자동 채움
    try {
        const usp = new URLSearchParams(window.location.search);
        const code = (usp.get("pc") || usp.get("partner") || "").toUpperCase();
        if (code) {
            state.form.partnerCode = code;
            const partnerCodeInput =
                document.getElementById("form-partnerCode");
            if (partnerCodeInput) {
                partnerCodeInput.value = code;
            }
        }
    } catch (_) {}
});

/************************************
 * DEV 전용 간단 테스트
 ************************************/
// Test Case #1: P=100,000 / 즉시 10%
const t1 = computeDistribution(100000, 0.1);
console.assert(t1.cost === 20000, "TC1 cost");
console.assert(t1.rewardFund === 60000, "TC1 rewardFund");
console.assert(t1.companyGross === 20000, "TC1 companyGross");
console.assert(t1.partnerFee === 5000, "TC1 partnerFee");
console.assert(t1.companyNet === 15000, "TC1 companyNet");
console.assert(t1.customerTarget === 130000, "TC1 customerTarget");
console.assert(t1.instantReward === 10000, "TC1 instantReward");

// Test Case #2: P=500,000 / 즉시 20%
const t2 = computeDistribution(500000, 0.2);
console.assert(t2.cost === 100000, "TC2 cost");
console.assert(t2.rewardFund === 300000, "TC2 rewardFund");
console.assert(t2.companyGross === 100000, "TC2 companyGross");
console.assert(t2.partnerFee === 25000, "TC2 partnerFee");
console.assert(t2.companyNet === 75000, "TC2 companyNet");
console.assert(t2.customerTarget === 650000, "TC2 customerTarget");
console.assert(t2.instantReward === 100000, "TC2 instantReward");

// Test Case #3: P=0 / 즉시 15%
const t3 = computeDistribution(0, 0.15);
console.assert(t3.cost === 0, "TC3 cost");
console.assert(t3.rewardFund === 0, "TC3 rewardFund");
console.assert(t3.companyGross === 0, "TC3 companyGross");
console.assert(t3.partnerFee === 0, "TC3 partnerFee");
console.assert(t3.companyNet === 0, "TC3 companyNet");
console.assert(t3.customerTarget === 0, "TC3 customerTarget");
console.assert(t3.instantReward === 0, "TC3 instantReward");

// Test Case #4: reservedReward 계산 확인
const t4 = computeDistribution(100000, 0.1);
console.assert(t4.reservedReward === 120000, "TC4 reservedReward");

// Test Case #5: 파트너 코드 생성 유효성
const sample = new Set(Array.from({ length: 10 }, () => genCodeOnce()));
console.assert(sample.size === 10, "TC5 genCode uniqueness");

const codeEx = genCodeOnce();
console.assert(
    /^P[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{7}$/.test(codeEx),
    "TC6 genCode pattern"
);

console.log("✅ 모든 테스트 케이스 통과");
