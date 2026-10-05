# Export Data Structure - Updated

## Overview
The export system has been comprehensively updated to provide complete, accurate data for each export type. All exports now include proper participant identification and comprehensive data fields.

## Export Types

### 1. Participant Data Export
**Purpose:** Export all participant information with demographics and study progress

**What's Included:**
- Participant ID (research ID: P001, P002, etc.)
- **Participant name** (always included in identity-linked export)
- Username
- Age, Gender, University, Department
- Experimental condition (anonymous/identifiable)
- Participant status (active, completed, incomplete, withdrawn)
- Consent information (given, date, version)
- Experiment progress (started, completed, timestamps)
- Completed videos count
- Withdrawal information (if applicable)
- Created and updated timestamps

**De-identified Export:**
- Removes: name, username, age, gender, university, department
- Keeps: participant ID, condition, status, timestamps

**Identity-linked Export:**
- Includes: ALL participant data with names and demographics

---

### 2. Responses Export
**Purpose:** Export participant names along with their video responses

**What's Included:**
- Response ID (R0001, R0002, etc.)
- Participant ID (P001, P002, etc.)
- **Participant name** (always included in identity-linked export)
- Participant username
- Participant demographics (age, gender, university, department)
- Experimental condition
- Video information (title, order, topic)
- **Response text** (full response)
- Response metrics (length, word count, response time)
- Submission timestamp

**De-identified Export:**
- Removes: participant name, username, demographics
- Keeps: participant ID, condition, responses, video info

**Identity-linked Export:**
- Includes: Participant names with ALL response data

---

### 3. Coding Export
**Purpose:** Export participant names + their responses + coding results

**What's Included:**
- Coding ID (C0001, C0002, etc.)
- Response ID (R0001, R0002, etc.)
- Participant ID (P001, P002, etc.)

**Participant Information:**
- **Participant name** (identity-linked only)
- Username, age, gender, university, department
- Experimental condition

**Video Information:**
- Video title, order, topic

**Response Information:**
- Full response text
- Response length, word count
- Response time
- Submission timestamp

**Coding Results:**
- Sentiment analysis (sentiment, score)
- Aggression coding (level, category, score, indicators)
- Cyberbullying coding (present, type, severity, indicators)
- Coding notes
- Coder information (name, username)
- Coding metadata (version, confidence, timestamp)

**De-identified Export:**
- Removes: participant name, username, demographics
- Keeps: ALL response and coding data

**Identity-linked Export:**
- Includes: Participant names + responses + complete coding results

---

### 4. Combined Research Dataset
**Purpose:** Comprehensive dataset with participant names + all responses + all coding data

**What's Included:**
This is the **MOST COMPREHENSIVE** export - combines everything:

**Record Identifiers:**
- Record ID (REC0001, REC0002, etc.)
- Participant ID (P001, P002, etc.)
- Response ID (R0001, R0002, etc.)
- Coding ID (C0001, C0002, etc.)

**Complete Participant Demographics:**
- Name (identity-linked only)
- Username (identity-linked only)
- Age, gender, university, department (identity-linked only)

**Participant Study Information:**
- Experimental condition
- Participant status
- Consent information (given, date)
- Experiment timeline (started, completed)
- Completed videos count

**Video Information:**
- Video title, order, topic

**Complete Response Data:**
- Full response text
- Response length, word count
- Response time
- Submission timestamp

**Complete Coding Results:**
- Coding status (coded yes/no)
- Sentiment (sentiment, score)
- Aggression (level, category, score, indicators)
- Cyberbullying (present, type, severity, indicators)
- Coding notes
- Coder information
- Coding metadata

**Structure:**
- One row per response with full participant context
- If participant has no responses, still includes their demographic data
- Complete participant journey from registration to coding

**De-identified Export:**
- Removes: names, usernames, demographics
- Keeps: Complete response and coding data

**Identity-linked Export:**
- Includes: EVERYTHING - full participant journey with all identifying information

---

## Key Features

### 1. Participant Name Always Included (Identity-Linked)
- All exports now properly include participant names when identity-linked export is selected
- Names are properly removed in de-identified exports for privacy

### 2. Comprehensive Data
- Each export type includes ALL relevant fields
- No data is left out or truncated
- Full response text always included
- Complete coding results with all indicators

### 3. Proper Data Structure
- **Participants Export:** Participant-level data only
- **Responses Export:** One row per response with participant info
- **Codings Export:** One row per coding with participant + response info
- **Research Dataset:** One row per response with complete participant journey

### 4. Authentication Fixed
- All exports now use proper fetch API with authentication headers
- Works correctly in production (Railway + Vercel)

### 5. Filter Support
- All exports support condition filtering (anonymous/identifiable)
- Proper cascading filters applied correctly

---

## Use Cases

### For Statistical Analysis (Recommended)
**Use:** Combined Research Dataset (Identity-linked or De-identified)
- Ready for SPSS, R, Python
- Complete data in single file
- One row per response with all context

### For Participant Review
**Use:** Participants Export (Identity-linked)
- All participant information
- Study progress tracking
- Consent verification

### For Response Analysis
**Use:** Responses Export (Identity-linked)
- See who said what
- Response quality analysis
- Participant engagement tracking

### For Coding Verification
**Use:** Codings Export (Identity-linked)
- Verify coding accuracy
- Review coder work
- Inter-rater reliability analysis

### For Publication
**Use:** Combined Research Dataset (De-identified)
- Privacy-protected
- Complete research data
- No identifying information

---

## File Formats

### CSV Format
- Text-based, universal compatibility
- Opens in Excel, SPSS, R, Python
- Proper comma escaping
- UTF-8 encoding

### Excel Format (.xlsx)
- Native Excel format
- Better formatting preservation
- Larger file size
- Recommended for data exploration

---

## Privacy & Security

### Identity-Linked Exports
- Include: names, usernames, demographics
- **Use only:** For internal analysis
- **Store:** Securely with encryption
- **Never:** Share publicly or via unsecured channels

### De-identified Exports
- Exclude: names, usernames, demographics
- Include: research IDs only
- **Use for:** Publication, public sharing
- **Safe to:** Share with researchers following IRB protocols

---

## Changes Made

1. **exportParticipants:** Now includes ALL participant fields with name
2. **exportResponses:** Now includes participant name + demographics + full response data
3. **exportCodings:** Now includes participant name + responses + complete coding results
4. **exportResearchDataset:** Completely rewritten to provide comprehensive participant journey
5. **Frontend:** Updated descriptions to accurately reflect data structure
6. **Frontend:** Added identity-linked support for codings export

All exports have been tested and verified to work in production.
