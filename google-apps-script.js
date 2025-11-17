/**
 * Google Apps Script - 구글 시트 데이터 수집 및 조회 스크립트
 *
 * 사용 방법:
 * 1. Google Sheets를 열고 '확장 프로그램' → 'Apps Script' 클릭
 * 2. 이 코드를 전체 복사하여 붙여넣기
 * 3. '배포' → '새 배포' → '웹 앱' 선택
 * 4. '다음 계정으로 실행': '나'
 * 5. '액세스 권한': '모든 사용자'
 * 6. '배포' 클릭 후 웹 앱 URL 복사
 * 7. app.js의 GOOGLE_SHEET_URL에 해당 URL 입력
 */

/**
 * POST 요청 핸들러 - 데이터 저장
 */
function doPost(e) {
    try {
        var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        var data = JSON.parse(e.postData.contents);

        // 한국 시간대로 타임스탬프 생성
        var timestamp = Utilities.formatDate(
            new Date(),
            "Asia/Seoul",
            "yyyy-MM-dd HH:mm:ss"
        );

        // 새 행에 데이터 추가
        sheet.appendRow([
            timestamp, // A열: 타임스탬프
            data.name || "", // B열: 이름
            data.phone || "", // C열: 연락처
            data.email || "", // D열: 이메일
            data.depositAt || "", // E열: 입금일시
            data.depositorName || "", // F열: 입금자명
            data.partnerRef || "", // G열: 파트너스 코드 (추천인)
            data.code || "", // H열: 고유코드
        ]);

        return ContentService.createTextOutput(
            JSON.stringify({
                status: "success",
                message: "데이터가 성공적으로 저장되었습니다.",
                timestamp: timestamp,
            })
        ).setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        Logger.log("Error in doPost: " + error.toString());
        return ContentService.createTextOutput(
            JSON.stringify({
                status: "error",
                message: error.toString(),
            })
        ).setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * GET 요청 핸들러 - 데이터 조회
 * 쿼리 파라미터: name, phone, email 중 하나 이상
 */
function doGet(e) {
    try {
        var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        var params = e.parameter;

        // 조회 요청인 경우
        if (params.action === "search") {
            var results = searchRecords(sheet, params);
            return ContentService.createTextOutput(
                JSON.stringify({
                    status: "success",
                    data: results,
                    count: results.length,
                })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        // 기본 응답 (헬스체크)
        return ContentService.createTextOutput(
            JSON.stringify({
                status: "success",
                message: "Google Apps Script가 정상적으로 실행 중입니다.",
                timestamp: Utilities.formatDate(
                    new Date(),
                    "Asia/Seoul",
                    "yyyy-MM-dd HH:mm:ss"
                ),
            })
        ).setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        Logger.log("Error in doGet: " + error.toString());
        return ContentService.createTextOutput(
            JSON.stringify({
                status: "error",
                message: error.toString(),
            })
        ).setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * 데이터 검색 함수
 */
function searchRecords(sheet, params) {
    var data = sheet.getDataRange().getValues();
    var results = [];

    // 검색어 정규화 (소문자, 공백/하이픈 제거)
    var searchName = (params.name || "").toLowerCase().trim();
    var searchPhone = (params.phone || "").replace(/\D/g, "");
    var searchEmail = (params.email || "").toLowerCase().trim();

    // 검색어가 하나도 없으면 빈 배열 반환
    if (!searchName && !searchPhone && !searchEmail) {
        return results;
    }

    // 첫 번째 행(헤더)을 제외하고 검색
    for (var i = 1; i < data.length; i++) {
        var row = data[i];

        // 빈 행 건너뛰기
        if (!row[0]) continue;

        var rowName = (row[1] || "").toString().toLowerCase();
        var rowPhone = (row[2] || "").toString().replace(/\D/g, "");
        var rowEmail = (row[3] || "").toString().toLowerCase();

        // OR 조건으로 검색 (하나라도 일치하면 포함)
        var nameMatch = searchName && rowName.indexOf(searchName) > -1;
        var phoneMatch = searchPhone && rowPhone.indexOf(searchPhone) > -1;
        var emailMatch = searchEmail && rowEmail.indexOf(searchEmail) > -1;

        if (nameMatch || phoneMatch || emailMatch) {
            results.push({
                timestamp: row[0],
                name: row[1],
                phone: row[2],
                email: row[3],
                depositAt: row[4],
                depositorName: row[5],
                partnerRef: row[6],
                code: row[7],
            });
        }
    }

    return results;
}

/**
 * 시트 초기화 함수 (선택사항)
 * Apps Script 편집기에서 직접 실행하면 헤더를 자동으로 생성합니다.
 */
function initializeSheet() {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // 첫 번째 행이 비어있다면 헤더 추가
    if (sheet.getRange(1, 1).getValue() === "") {
        var headers = [
            "타임스탬프",
            "이름",
            "연락처",
            "이메일",
            "입금일시",
            "입금자명",
            "파트너스 코드",
            "고유코드",
        ];

        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

        // 헤더 행 서식 지정
        var headerRange = sheet.getRange(1, 1, 1, headers.length);
        headerRange.setBackground("#0f9ccf");
        headerRange.setFontColor("#ffffff");
        headerRange.setFontWeight("bold");
        headerRange.setHorizontalAlignment("center");

        // 열 너비 자동 조정
        for (var i = 1; i <= headers.length; i++) {
            sheet.autoResizeColumn(i);
        }

        Logger.log("시트 초기화 완료!");
    } else {
        Logger.log("시트에 이미 데이터가 있습니다.");
    }
}
