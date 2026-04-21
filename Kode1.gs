/* =====================================================
   PULL DATA DARI FIREBASE (manual / trigger)
   ===================================================== */
function getAllData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = "Asia/Jakarta";

  const now = new Date();
  const sheetName = Utilities.formatDate(now, tz, "dd MM yyyy");

  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(["Date", "Time", "Temperature", "Average"]);

    // FORMAT HEADER
    const header = sheet.getRange("A1:D1");
    header
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setBorder(true, true, true, true, true, true);

    sheet.autoResizeColumns(1, 4);
  }

  const firebaseUrl =
    "https://oil-plta-bta-default-rtdb.firebaseio.com/Temperature";
  const db = FirebaseApp.getDatabaseByUrl(firebaseUrl);
  const data = db.getData();

  if (!data || typeof data !== "object") {
    Logger.log("Data Firebase tidak valid");
    return;
  }

  const date = Utilities.formatDate(now, tz, "dd-MM-yy");
  const time = Utilities.formatDate(now, tz, "HH:mm:ss");

  const temperature = data.current ?? "";
  const average     = data.average ?? "";

  sheet.insertRowBefore(2);

  const range = sheet.getRange(2, 1, 1, 4);
  range.setValues([[date, time, temperature, average]]);

  // FORMAT DATA
  range
    .setHorizontalAlignment("center")
    .setBorder(true, true, true, true, true, true);

  Logger.log("Data Firebase ditambahkan ke sheet: " + sheetName);
}


/* =====================================================
   PUSH DATA REALTIME DARI ESP32 (Web App)
   ===================================================== */
function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = "Asia/Jakarta";

  if (!e || !e.postData || !e.postData.contents) {
    return ContentService
      .createTextOutput("Invalid payload")
      .setMimeType(ContentService.MimeType.TEXT);
  }

  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService
      .createTextOutput("JSON parse error")
      .setMimeType(ContentService.MimeType.TEXT);
  }

  const now = new Date();
  const sheetName = Utilities.formatDate(now, tz, "dd MM yyyy");

  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(["Date", "Time", "Temperature", "Average"]);

    // FORMAT HEADER
    const header = sheet.getRange("A1:D1");
    header
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setBorder(true, true, true, true, true, true);

    sheet.autoResizeColumns(1, 4);
  }

  const date = Utilities.formatDate(now, tz, "dd-MM-yy");
  const time = Utilities.formatDate(now, tz, "HH:mm:ss");

  const temperature = data.temperature ?? "";
  const average     = data.average ?? "";

  sheet.insertRowBefore(2);

  const range = sheet.getRange(2, 1, 1, 4);
  range.setValues([[date, time, temperature, average]]);

  // FORMAT DATA
  range
    .setHorizontalAlignment("center")
    .setBorder(true, true, true, true, true, true);

  return ContentService
    .createTextOutput("OK")
    .setMimeType(ContentService.MimeType.TEXT);
}


/* =====================================================
   EXPORT PDF
   ===================================================== */
function exportTodaySheetToPDF() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = "Asia/Jakarta";

  const now = new Date();
  const sheetName = Utilities.formatDate(now, tz, "dd MM yyyy");

  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error("Sheet hari ini tidak ditemukan: " + sheetName);
  }

  const spreadsheetId = ss.getId();
  const sheetId = sheet.getSheetId();

  const folderId = "12VnkkOp7f5Twb8b0pX1rtNZDNqmBBotQ";
  const folder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();

  const url =
    "https://docs.google.com/spreadsheets/d/" + spreadsheetId +
    "/export?format=pdf" +
    "&gid=" + sheetId +
    "&size=A4" +
    "&portrait=true" +
    "&fitw=true" +
    "&sheetnames=false" +
    "&printtitle=false" +
    "&pagenumbers=false" +
    "&gridlines=false" +
    "&fzr=false";

  const token = ScriptApp.getOAuthToken();

  const response = UrlFetchApp.fetch(url, {
    headers: {
      Authorization: "Bearer " + token
    }
  });

  const pdfBlob = response.getBlob()
    .setName("Log Suhu " + sheetName + ".pdf");

  folder.createFile(pdfBlob);

  Logger.log("PDF berhasil dibuat: " + pdfBlob.getName());
}


/* =====================================================
   API UNTUK WEBSITE
   ===================================================== */
function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = "Asia/Jakarta";

  const now = new Date();
  const sheetName = Utilities.formatDate(now, tz, "dd MM yyyy");
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet || sheet.getLastRow() < 2) {
    return ContentService
      .createTextOutput(JSON.stringify({ log: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const lastRow = sheet.getLastRow();

  // jumlah data yang diambil (maks 10)
  const numRows = Math.min(10, lastRow - 1);

  // ambil dari row 2 ke bawah
  const data = sheet.getRange(2, 1, numRows, 4).getValues();

  const log = data.map(r => {
    const timeFormatted = Utilities.formatDate(
      new Date(r[1]),
      "Asia/Jakarta",
      "HH:mm:ss"
    );

    return {
      time: timeFormatted,
      temp: r[2]
    };
  });

  return ContentService
    .createTextOutput(JSON.stringify({ log }))
    .setMimeType(ContentService.MimeType.JSON);
}