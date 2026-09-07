================================================================================
                     START HERE - SIMPLE INSTRUCTIONS
================================================================================

PROBLEM: Consent button not working

SOLUTION: Run ONE file to fix everything

================================================================================
                          WHAT TO DO RIGHT NOW
================================================================================

1. Double-click:  FIX-AND-START.bat

2. Wait 15 seconds (two windows will open)

3. Open browser to:  http://localhost:3000/test-api

4. Click all 3 test buttons - all should show "✅ SUCCESS"

5. If all pass, go to:  http://localhost:3000/consent

6. Fill form and click "I Agree - Proceed to Registration"

7. Should redirect to registration page!

================================================================================
                           THAT'S IT!
================================================================================

The FIX-AND-START.bat file does EVERYTHING:
  ✓ Kills old processes on port 5000 and 3000
  ✓ Fixes MongoDB index warnings
  ✓ Starts backend server
  ✓ Starts frontend server

Just double-click it and wait!

================================================================================
                      IF YOU NEED TO STOP SERVERS
================================================================================

Double-click:  STOP-ALL.bat

This stops both backend and frontend.

================================================================================
                         TEST PAGE IS YOUR FRIEND
================================================================================

Always test here first:  http://localhost:3000/test-api

This page has 3 buttons that test:
  1. Environment variables
  2. Backend health endpoint
  3. Consent API endpoint

If ALL 3 show ✅ SUCCESS → Consent page WILL work!

================================================================================
                           QUICK REFERENCE
================================================================================

FIX-AND-START.bat   → Fix everything and start (USE THIS ONE!)
STOP-ALL.bat        → Stop all servers
TEST-CONSENT.bat    → Test backend API directly
RESTART-FRONTEND.bat → Only restart frontend

Test page:     http://localhost:3000/test-api
Consent page:  http://localhost:3000/consent

================================================================================
                      CURRENT STATUS: READY ✅
================================================================================

All files created. All fixes applied.

Just run:  FIX-AND-START.bat

Then test at:  http://localhost:3000/test-api
