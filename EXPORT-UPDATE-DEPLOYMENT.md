# Export Update Deployment Guide

## Changes Made

### Backend Changes (backend/src/controllers/exportController.js)

1. **exportParticipants** - Updated to include ALL participant data
   - Always includes participant name in identity-linked export
   - Includes all demographics: age, gender, university, department
   - Includes complete study progress information
   - Proper de-identification when needed

2. **exportResponses** - Updated to include participant name + responses
   - Always includes participant name in identity-linked export
   - Includes participant demographics
   - Includes complete response data (text, length, word count)
   - Includes video information (title, order, topic)

3. **exportCodings** - Updated to include participant + response + coding
   - Always includes participant name in identity-linked export
   - Includes participant demographics
   - Includes complete response text
   - Includes ALL coding results (sentiment, aggression, cyberbullying)
   - Includes coding indicators and metadata
   - Now supports identityLinked parameter

4. **exportResearchDataset** - Completely rewritten
   - Comprehensive participant journey
   - One row per response with full participant context
   - Includes participants even if they have no responses
   - Complete demographics + responses + coding in single dataset
   - Properly structured for statistical analysis

### Frontend Changes (frontend/app/admin/export/page.tsx)

1. **Updated handleExport function**
   - Now passes identityLinked parameter to ALL export types
   - Proper authentication headers already implemented

2. **Updated Codings Export UI**
   - Added de-identified export option
   - Added identity-linked export option
   - Better descriptions

3. **Updated All Descriptions**
   - More accurate descriptions of what's included
   - Clear explanation of comprehensive data structure

---

## Testing Checklist

### Local Testing (Localhost)

- [ ] **Test Participants Export**
  - [ ] De-identified CSV download
  - [ ] De-identified Excel download
  - [ ] Identity-linked CSV download
  - [ ] Identity-linked Excel download
  - [ ] Verify name is included in identity-linked
  - [ ] Verify name is removed in de-identified
  - [ ] Check all demographics are present

- [ ] **Test Responses Export**
  - [ ] De-identified CSV download
  - [ ] De-identified Excel download
  - [ ] Identity-linked CSV download
  - [ ] Identity-linked Excel download
  - [ ] Verify participant name with responses
  - [ ] Verify full response text is included
  - [ ] Check video information is complete

- [ ] **Test Codings Export**
  - [ ] De-identified CSV download
  - [ ] De-identified Excel download
  - [ ] Identity-linked CSV download
  - [ ] Identity-linked Excel download
  - [ ] Verify participant name + response + coding
  - [ ] Check all coding fields are present
  - [ ] Verify indicators are included

- [ ] **Test Research Dataset Export**
  - [ ] De-identified CSV download
  - [ ] De-identified Excel download
  - [ ] Identity-linked CSV download
  - [ ] Identity-linked Excel download
  - [ ] Verify comprehensive data structure
  - [ ] Check one row per response
  - [ ] Verify participants without responses are included
  - [ ] Test in Excel/SPSS for compatibility

- [ ] **Test Filters**
  - [ ] Export with "Anonymous" condition filter
  - [ ] Export with "Identifiable" condition filter
  - [ ] Export with "All Conditions"

- [ ] **Test Data Quality**
  - [ ] Open CSV files in Excel - verify proper formatting
  - [ ] Open Excel files - verify proper structure
  - [ ] Check for special characters/encoding issues
  - [ ] Verify commas in text are properly escaped

### Production Testing (Railway + Vercel)

After deploying to production:

- [ ] **Authentication**
  - [ ] Verify admin login works
  - [ ] Verify export page loads
  - [ ] Verify authentication headers are sent
  - [ ] Check no "Admin authentication required" errors

- [ ] **All Export Types**
  - [ ] Test all 4 export types (same checklist as localhost)
  - [ ] Verify downloads work in production
  - [ ] Check filenames are correct
  - [ ] Verify data matches localhost

- [ ] **Cross-Browser Testing**
  - [ ] Test in Chrome
  - [ ] Test in Firefox
  - [ ] Test in Safari (if available)
  - [ ] Test in Edge

---

## Deployment Steps

### Step 1: Backup Current Database
```bash
# Create backup before deploying changes
mongodump --uri="YOUR_MONGODB_URI" --out="backup-before-export-update"
```

### Step 2: Test Locally First

```bash
# 1. Install dependencies (if needed)
cd backend
npm install

cd ../frontend
npm install

# 2. Run test script
cd ..
node test-export-functionality.js

# 3. Start backend
cd backend
npm start

# 4. Start frontend (in another terminal)
cd frontend
npm run dev

# 5. Test all exports in admin panel at http://localhost:3000/admin/export
```

### Step 3: Deploy Backend to Railway

```bash
# 1. Commit changes
git add backend/src/controllers/exportController.js
git commit -m "Update export data structure - comprehensive participant data"

# 2. Push to Railway
git push railway main
# OR
git push origin main  # if Railway auto-deploys from GitHub

# 3. Wait for deployment to complete
# Check Railway dashboard for deployment status

# 4. Verify backend is running
# Check Railway logs for any errors
```

### Step 4: Deploy Frontend to Vercel

```bash
# 1. Commit frontend changes
git add frontend/app/admin/export/page.tsx
git commit -m "Update export UI - add identity-linked option for codings"

# 2. Push to Vercel
git push origin main  # Vercel auto-deploys from GitHub

# 3. Wait for deployment to complete
# Check Vercel dashboard for deployment status

# 4. Verify frontend is running
# Visit your production URL
```

### Step 5: Test Production

1. **Login to Admin Panel**
   - Go to production URL
   - Login with admin credentials

2. **Test Each Export Type**
   - Go to /admin/export
   - Test all 8 export options (4 types × 2 formats)
   - Download and open files

3. **Verify Data Quality**
   - Check exported data matches expectations
   - Verify participant names are included/excluded correctly
   - Check for any missing fields

### Step 6: Verify with Client

- [ ] Show client the updated export structure
- [ ] Demonstrate identity-linked exports include names
- [ ] Demonstrate de-identified exports protect privacy
- [ ] Show comprehensive research dataset
- [ ] Get client approval

---

## Rollback Plan

If issues occur in production:

### Quick Rollback (Railway)
```bash
# In Railway dashboard:
1. Go to Deployments
2. Find previous working deployment
3. Click "Redeploy"
```

### Quick Rollback (Vercel)
```bash
# In Vercel dashboard:
1. Go to Deployments
2. Find previous working deployment
3. Click "Promote to Production"
```

### Code Rollback
```bash
# Revert commits
git revert HEAD
git push origin main
git push railway main
```

---

## Monitoring After Deployment

### Check These Metrics

1. **Backend Logs (Railway)**
   - Watch for export errors
   - Monitor memory usage during exports
   - Check for timeout issues

2. **Frontend Logs (Vercel)**
   - Check for client-side errors
   - Monitor download success rate

3. **Database Performance**
   - Monitor query performance
   - Check for slow queries during exports
   - Verify no connection issues

### Common Issues & Solutions

**Issue:** "Admin authentication required" error
- **Solution:** Check frontend authentication headers are properly set
- Verify localStorage/sessionStorage has adminSession token

**Issue:** Export takes too long / timeout
- **Solution:** Implement pagination for large datasets
- Consider adding export queue system

**Issue:** Special characters broken in CSV
- **Solution:** Verify UTF-8 encoding
- Check CSV escaping in convertToCSV function

**Issue:** Excel file won't open
- **Solution:** Verify XLSX package is installed
- Check file size limits

---

## Documentation Updates

After successful deployment:

- [ ] Update EXPORT-DATA-STRUCTURE-UPDATED.md with any findings
- [ ] Document any edge cases discovered
- [ ] Update admin user guide with new export structure
- [ ] Add screenshots of new export options

---

## Success Criteria

✅ All 4 export types work in production
✅ Identity-linked exports include participant names
✅ De-identified exports properly remove PII
✅ CSV and Excel formats both work
✅ Authentication works correctly
✅ No errors in production logs
✅ Client approves the changes
✅ Data quality is verified

---

## Support Information

If issues occur:

1. **Check backend logs in Railway**
2. **Check frontend logs in Vercel**
3. **Check browser console for errors**
4. **Test with test-export-functionality.js**
5. **Review EXPORT-DATA-STRUCTURE-UPDATED.md**

---

## Files Modified

### Backend
- `backend/src/controllers/exportController.js` - ALL export functions updated

### Frontend
- `frontend/app/admin/export/page.tsx` - Export UI updated

### Documentation
- `EXPORT-DATA-STRUCTURE-UPDATED.md` - New documentation
- `EXPORT-UPDATE-DEPLOYMENT.md` - This file
- `test-export-functionality.js` - Test script

---

## Next Steps After Deployment

1. Monitor production for 24 hours
2. Collect any client feedback
3. Make refinements if needed
4. Consider adding:
   - Export progress indicators
   - Export history/audit log
   - Scheduled exports
   - Email export delivery

---

**Deployment Date:** _____________
**Deployed By:** _____________
**Production URL:** _____________
**Status:** _____________
