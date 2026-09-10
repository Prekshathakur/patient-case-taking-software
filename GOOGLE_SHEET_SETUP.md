# How to Connect GitHub Pages to a Live Google Sheet (Excel)
## Capture Logins from Every Device Worldwide in Real-Time

Because **GitHub Pages** is a static hosting platform, it cannot run Python backend servers (`server.py`). To record logins from **anyone on any phone or laptop across the internet** into a live Excel sheet, use a free Google Apps Script webhook.

---

### Step 1: Create a Google Sheet
1. Go to [Google Sheets](https://sheets.new) and create a new blank spreadsheet.
2. Name it: **`AyurAyush_User_Logins`**.
3. In Row 1, add these column headers:
   - **A1**: Log ID
   - **B1**: User Full Name
   - **C1**: Email / Mobile ID
   - **D1**: Portal Role
   - **E1**: Login Date & Time
   - **F1**: Device Platform
   - **G1**: Session Status

---

### Step 2: Add the Google Apps Script
1. In the Google Sheet top menu, click **Extensions** > **Apps Script**.
2. Delete any code in the editor and paste the following script:

```javascript
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    sheet.appendRow([
      data.id || "LOG-" + new Date().getTime(),
      data.name || "Anonymous",
      data.email || "N/A",
      data.role || "KIOSK",
      data.loginTime || new Date().toISOString(),
      data.device || "Web Browser",
      data.status || "Success"
    ]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ "result": "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ "result": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. Click the **Save** icon (💾).

---

### Step 3: Deploy as a Web App
1. At the top right of the Apps Script window, click **Deploy** > **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in the deployment details:
   - **Description**: `AyurAyush Login Logger`
   - **Execute as**: `Me (your email)`
   - **Who has access**: **`Anyone`** *(Crucial so GitHub Pages can send logs)*
4. Click **Deploy**.
5. If prompted, click **Authorize access**, choose your Google account, click **Advanced**, and then click **Go to Untitled project (unsafe)**.
6. Copy the **Web App URL** (it looks like `https://script.google.com/macros/s/AKfycbx.../exec`).

---

### Step 4: Connect to Your Website
You have two easy ways to connect:

- **Method A (Without touching code)**:
  1. Open your website.
  2. Click the sidebar > **"View Login History & Status"** > Click **"Connect Google Sheet"**.
  3. Paste your Web App URL and click OK.

- **Method B (Permanent in code)**:
  1. Open `app.js`.
  2. Look near the top of the file or set:
     ```javascript
     window.AYUR_CLOUD_WEBHOOK_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";
     ```
  3. Push to GitHub.

---

### Step 5: How to Download Excel File (.xlsx)
1. Open your Google Sheet anytime on your phone or laptop.
2. Click **File** > **Download** > **Microsoft Excel (.xlsx)**.
3. Every login by any faculty member, student, doctor, or patient from any device in the world will be present in this spreadsheet!
