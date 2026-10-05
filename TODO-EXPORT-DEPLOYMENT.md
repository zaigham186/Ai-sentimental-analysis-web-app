# Export Update - TODO Checklist

## ✅ COMPLETED

- [x] Updated exportParticipants function - includes all participant data with names
- [x] Updated exportResponses function - includes participant names with responses
- [x] Updated exportCodings function - includes names + responses + coding results
- [x] Rewrote exportResearchDataset function - comprehensive participant journey
- [x] Updated frontend export page - added identity-linked option for codings
- [x] Updated all export descriptions
- [x] Created test script (test-export-functionality.js)
- [x] Created comprehensive documentation
- [x] Fixed authentication (already done in previous task)

---

## ⏳ TODO - LOCAL TESTING

### Test Environment Setup
- [ ] Open terminal 1: `cd backend && npm start`
- [ ] Open terminal 2: `cd frontend && npm run dev`
- [ ] Browser: Go to `http://localhost:3000/admin`

### Run Test Script
- [ ] Run: `node test-export-functionality.js`
- [ ] Verify it shows participant data correctly
- [ ] Check that names, responses, and coding data appear

### Test Participants Export (localhost)
- [ ] De-identified CSV - verify no names
- [ ] De-identified Excel - verify no names
- [ ] Identity-linked CSV - verify names included
- [ ] Identity-linked Excel - verify names included

### Test Responses Export (localhost)
- [ ] De-identified CSV - verify no names
- [ ] De-identified Excel - verify no names
- [ ] Identity-linked CSV - verify names + responses
- [ ] Identity-linked Excel - verify names + responses

### Test Codings Export (localhost)
- [ ] De-identified CSV - verify no names
- [ ] De-identified Excel - verify no names
- [ ] Identity-linked CSV - verify names + responses + coding
- [ ] Identity-linked Excel - verify names + responses + coding

### Test Research Dataset (localhost)
- [ ] De-identified CSV - verify comprehensive data, no names
- [ ] De-identified Excel - verify comprehensive data, no names
- [ ] Identity-linked CSV - verify comprehensive with names
- [ ] Identity-linked Excel - verify comprehensive with names

### Test Filters (localhost)
- [ ] Export with "Anonymous" condition
- [ ] Export with "Identifiable" condition
- [ ] Export with "All Conditions"

### Verify Data Quality (localhost)
- [ ] Open CSV in Excel - proper formatting
- [ ] Open Excel files - proper structure
- [ ] Check for encoding issues
- [ ] Verify all expected data is present

---

## ⏳ TODO - PRODUCTION DEPLOYMENT

### Backend Deployment (Railway)
- [ ] Commit changes: `git add backend/src/controllers/exportController.js`
- [ ] Commit: `git commit -m "Update export data structure"`
- [ ] Push to Railway: `git push railway main` (or your railway branch)
- [ ] Wait for Railway deployment to complete
- [ ] Check Railway logs for errors
- [ ] Verify backend is running

### Frontend Deployment (Vercel)
- [ ] Commit changes: `git add frontend/app/admin/export/page.tsx`
- [ ] Commit: `git commit -m "Update export UI"`
- [ ] Push: `git push origin main`
- [ ] Wait for Vercel deployment to complete
- [ ] Check Vercel logs for errors
- [ ] Verify frontend is running

---

## ⏳ TODO - PRODUCTION TESTING

### Access Production
- [ ] Go to your production URL
- [ ] Login to admin panel
- [ ] Navigate to /admin/export

### Test All Exports in Production
- [ ] Participants - De-identified CSV
- [ ] Participants - De-identified Excel
- [ ] Participants - Identity-linked CSV
- [ ] Participants - Identity-linked Excel
- [ ] Responses - De-identified CSV
- [ ] Responses - De-identified Excel
- [ ] Responses - Identity-linked CSV
- [ ] Responses - Identity-linked Excel
- [ ] Codings - De-identified CSV
- [ ] Codings - De-identified Excel
- [ ] Codings - Identity-linked CSV
- [ ] Codings - Identity-linked Excel
- [ ] Research Dataset - De-identified CSV
- [ ] Research Dataset - De-identified Excel
- [ ] Research Dataset - Identity-linked CSV
- [ ] Research Dataset - Identity-linked Excel

### Verify Production Quality
- [ ] All exports download successfully
- [ ] No authentication errors
- [ ] Files open correctly
- [ ] Data matches localhost
- [ ] Participant names are included/excluded correctly
- [ ] All fields are present

### Cross-Browser Testing (Production)
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Edge
- [ ] Test in Safari (if available)

---

## ⏳ TODO - CLIENT APPROVAL

- [ ] Show client the updated export structure
- [ ] Demonstrate Participants export with names
- [ ] Demonstrate Responses export with names + responses
- [ ] Demonstrate Codings export with names + responses + results
- [ ] Demonstrate Research Dataset - comprehensive data
- [ ] Show both identity-linked and de-identified options
- [ ] Explain privacy protection
- [ ] Get client approval
- [ ] Address any client feedback

---

## ⏳ TODO - FINAL STEPS

- [ ] Monitor production for 24 hours
- [ ] Check for any errors in logs
- [ ] Verify client is satisfied
- [ ] Mark task as complete
- [ ] Archive test files (optional)
- [ ] Update project documentation

---

## 🆘 IF PROBLEMS OCCUR

### Issue: Authentication Error
- Check browser console for errors
- Verify admin session token exists
- Try logout and login again
- Check Railway environment variables

### Issue: Export Fails
- Check Railway logs for backend errors
- Check browser console for frontend errors
- Verify database connection
- Run test-export-functionality.js

### Issue: Missing Data
- Verify data exists in database
- Check populate queries in controller
- Test with test script
- Check filter settings

### Issue: Need to Rollback
**Railway:**
1. Go to Railway dashboard → Deployments
2. Find previous working deployment
3. Click "Redeploy"

**Vercel:**
1. Go to Vercel dashboard → Deployments
2. Find previous working deployment
3. Click "Promote to Production"

---

## 📚 REFERENCE DOCUMENTS

Quick guides:
- `EXPORT-UPDATE-SUMMARY.md` - What was changed
- `QUICK-EXPORT-TEST-GUIDE.md` - How to test
- `EXPORT-DATA-STRUCTURE-UPDATED.md` - Data structure details
- `EXPORT-UPDATE-DEPLOYMENT.md` - Detailed deployment guide

Test script:
- `test-export-functionality.js` - Run with: `node test-export-functionality.js`

---

## ✅ COMPLETION CRITERIA

Export update is complete when:
- ✅ All 16 export options work in production
- ✅ Identity-linked exports include participant names
- ✅ De-identified exports protect privacy
- ✅ All data fields are present and accurate
- ✅ No authentication errors
- ✅ Client approves the changes
- ✅ Production stable for 24 hours

---

**Current Status:** Code Complete - Ready for Testing

**Next Step:** Start with "TODO - LOCAL TESTING" section above

**Estimated Time:** 
- Local Testing: 30 minutes
- Deployment: 15 minutes
- Production Testing: 30 minutes
- Client Demo: 15 minutes
- **Total: ~90 minutes**

---

Good luck! 🚀
