# Quick Export Test Guide

## How to Test the Updated Exports

### Step 1: Run Test Script (Optional but Recommended)

```bash
node test-export-functionality.js
```

This will show you what data exists in your database and verify the queries work.

---

### Step 2: Start Your Local Environment

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

---

### Step 3: Access Admin Panel

1. Open browser: `http://localhost:3000/admin`
2. Login with your admin credentials
3. Navigate to "Export" section

---

### Step 4: Test Each Export Type

## 🧪 Test Matrix

| Export Type | Format | Identity-Linked | Expected Result |
|-------------|--------|----------------|-----------------|
| Participants | CSV | No | File downloads, no names |
| Participants | CSV | Yes | File downloads, includes names |
| Participants | Excel | No | File downloads, no names |
| Participants | Excel | Yes | File downloads, includes names |
| Responses | CSV | No | File downloads, no names |
| Responses | CSV | Yes | File downloads, includes names + responses |
| Responses | Excel | No | File downloads, no names |
| Responses | Excel | Yes | File downloads, includes names + responses |
| Codings | CSV | No | File downloads, no names |
| Codings | CSV | Yes | File downloads, includes names + responses + coding |
| Codings | Excel | No | File downloads, no names |
| Codings | Excel | Yes | File downloads, includes names + responses + coding |
| Research Dataset | CSV | No | File downloads, comprehensive data, no names |
| Research Dataset | CSV | Yes | File downloads, comprehensive data with names |
| Research Dataset | Excel | No | File downloads, comprehensive data, no names |
| Research Dataset | Excel | Yes | File downloads, comprehensive data with names |

---

## ✅ What to Check in Each Export

### Participants Export

**Identity-Linked Should Include:**
- ✅ Participant ID (P001, P002, etc.)
- ✅ Name
- ✅ Username
- ✅ Age
- ✅ Gender
- ✅ University
- ✅ Department
- ✅ Condition
- ✅ Status
- ✅ Consent information
- ✅ Experiment progress

**De-identified Should Include:**
- ✅ Participant ID
- ✅ Condition
- ✅ Status
- ✅ Timestamps
- ❌ NO name
- ❌ NO username
- ❌ NO age
- ❌ NO gender
- ❌ NO university
- ❌ NO department

---

### Responses Export

**Identity-Linked Should Include:**
- ✅ Response ID
- ✅ Participant ID
- ✅ Participant Name
- ✅ Participant Demographics
- ✅ Condition
- ✅ Video information
- ✅ Full response text
- ✅ Response metrics (length, word count)
- ✅ Timestamps

**De-identified Should Include:**
- ✅ Response ID
- ✅ Participant ID
- ✅ Condition
- ✅ Video information
- ✅ Full response text
- ✅ Response metrics
- ❌ NO participant name or demographics

---

### Codings Export

**Identity-Linked Should Include:**
- ✅ Coding ID
- ✅ Response ID
- ✅ Participant ID
- ✅ Participant Name
- ✅ Participant Demographics
- ✅ Condition
- ✅ Video information
- ✅ Full response text
- ✅ Response metrics
- ✅ ALL coding results (sentiment, aggression, cyberbullying)
- ✅ Coding indicators
- ✅ Coder information

**De-identified Should Include:**
- ✅ All coding data
- ✅ Response text
- ✅ Condition
- ❌ NO participant name or demographics

---

### Research Dataset Export

**Identity-Linked Should Include:**
- ✅ Record ID
- ✅ Participant ID
- ✅ Response ID
- ✅ Coding ID
- ✅ Complete participant demographics (name, age, gender, etc.)
- ✅ Participant study info (condition, status, consent, etc.)
- ✅ Video information
- ✅ Complete response data
- ✅ Complete coding results
- ✅ One row per response
- ✅ Participants without responses still included

**De-identified Should Include:**
- ✅ All data EXCEPT participant identities
- ✅ Complete responses and coding
- ❌ NO participant name or demographics

---

## 🔍 How to Verify Export Quality

### 1. Open in Excel
- File should open without errors
- No strange characters (encoding issues)
- Columns should be properly formatted
- Data should be readable

### 2. Check Data Completeness
- Count rows - should match database count
- Check for empty cells where there should be data
- Verify all columns are present

### 3. Check Identity Protection
- De-identified files should have NO names
- Identity-linked files should have names
- Both should have complete response and coding data

### 4. Test Filters
- Export with "Anonymous" condition
- Export with "Identifiable" condition
- Export with "All Conditions"
- Verify counts match expected

---

## 🐛 Common Issues & Quick Fixes

### Issue: "Admin authentication required"
**Fix:** 
- Logout and login again
- Clear browser cache
- Check browser console for errors

### Issue: Download doesn't start
**Fix:**
- Check browser popup blocker
- Try different browser
- Check browser console for errors

### Issue: File has weird characters
**Fix:**
- Open with UTF-8 encoding
- Try Excel format instead of CSV
- Check if special characters in data

### Issue: Missing data in export
**Fix:**
- Verify data exists in database
- Check filter settings
- Run test-export-functionality.js

### Issue: File won't open in Excel
**Fix:**
- Try CSV format instead
- Check file size (too large?)
- Verify file downloaded completely

---

## 📊 Expected File Sizes (Approximate)

- **Participants:** ~10-50 KB for 30 participants
- **Responses:** ~50-500 KB depending on response length
- **Codings:** ~100-1000 KB with all coding data
- **Research Dataset:** ~200-2000 KB (largest file)

---

## ✨ What Success Looks Like

**All Tests Pass When:**
1. ✅ All 16 export options download successfully
2. ✅ Files open correctly in Excel
3. ✅ Identity-linked exports include participant names
4. ✅ De-identified exports protect privacy
5. ✅ Response text is complete and readable
6. ✅ All coding results are present
7. ✅ Research dataset has comprehensive data
8. ✅ No authentication errors
9. ✅ Filters work correctly
10. ✅ Data matches database content

---

## 🚀 Production Testing

After local testing succeeds:

1. Deploy to production
2. Login to production admin panel
3. Repeat ALL tests above
4. Verify production exports match localhost
5. Test with client data
6. Get client approval

---

## 📞 Need Help?

Check these files:
- `EXPORT-DATA-STRUCTURE-UPDATED.md` - Detailed data structure
- `EXPORT-UPDATE-DEPLOYMENT.md` - Deployment guide
- `backend/src/controllers/exportController.js` - Export code

Run this to test database:
```bash
node test-export-functionality.js
```

Check logs:
- Backend: Terminal where `npm start` is running
- Frontend: Terminal where `npm run dev` is running
- Browser: Developer tools → Console tab

---

**Remember:** Test thoroughly in localhost before deploying to production!
