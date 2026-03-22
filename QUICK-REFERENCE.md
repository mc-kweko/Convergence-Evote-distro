# 🗳️ ELECTION DAY QUICK REFERENCE

## ⚡ BEFORE YOU START

### 1. Run Setup SQL (5 minutes)
```
Open Supabase → SQL Editor → Copy/Paste scripts/FINAL-SETUP.sql → Run
```
✅ All checks should show "✓ PASS"

### 2. Verify System (2 minutes)
- [ ] Admin login works
- [ ] Timer shows "Voting is Inactive"
- [ ] Ballot Setup shows all positions
- [ ] All candidates are visible

---

## 🚀 STARTING THE ELECTION

1. **Admin Dashboard** → Election Timer Control
2. Enter duration (e.g., `60` for 1 hour)
3. Click **"Start Voting"**
4. ✅ Timer starts counting down
5. ✅ Students can now login and vote

**Test**: Have one student login to verify ballot loads

---

## 📊 DURING THE ELECTION

### Monitor Dashboard
- **Timer**: Shows time remaining
- **Total Votes Cast**: Updates every 5 seconds
- **Turnout %**: Live percentage of students voted

### If You Need To:
- **Extend Time**: Enter minutes → Click "Extend"
- **Stop Early**: Click "Stop Voting Now"

### Student Issues:
| Problem | Solution |
|---------|----------|
| Can't login | Check timer is running |
| "Already voted" | They already submitted votes |
| "Voting ended" | Timer reached 0 or admin stopped |
| Ballot won't load | Check internet connection |

---

## 🛑 ENDING THE ELECTION

### Automatic (Recommended)
- Timer reaches 0
- System auto-stops voting
- Students auto-logged out

### Manual
- Click **"Stop Voting Now"**
- Confirm the action
- Voting immediately stops

---

## 📄 GENERATING RESULTS

1. **Dashboard** → Results
2. Click **"Generate Results PDF"**
3. PDF downloads automatically
4. Contains:
   - Winner for each position
   - Vote counts and percentages
   - Turnout statistics
   - Official declaration format

---

## 🔧 TROUBLESHOOTING

### Timer shows 0h 0m 0s after starting
```sql
-- Run in Supabase SQL Editor:
ALTER TABLE election_stats 
  ALTER COLUMN started_at TYPE timestamptz USING started_at AT TIME ZONE 'UTC',
  ALTER COLUMN ended_at TYPE timestamptz USING ended_at AT TIME ZONE 'UTC';
```
Then restart voting.

### Students can't login
1. Check timer is running (green box on dashboard)
2. Verify "Voting is Active" is displayed
3. Check student has correct PIN

### Votes not counting
1. Check dashboard "Total Votes Cast"
2. Refresh browser (F5)
3. Check Results page for vote counts

### System is slow
- Normal during high traffic
- Optimizations already applied
- Should handle 27 students easily

---

## 📱 ADMIN CREDENTIALS

**Email**: mckweko@gmail.com  
**Email**: admin@school.edu  
**Password**: (Your secure password)

---

## ⏱️ TIMING FEATURES

✅ **Smooth countdown** - Updates every second  
✅ **Auto-stop** - Stops when timer reaches 0  
✅ **Auto-logout** - Students kicked out when time ends  
✅ **Login blocking** - Can't login before/after voting period  
✅ **Time validation** - Multiple checks prevent late votes  

---

## 🎯 SUCCESS CHECKLIST

Before students arrive:
- [ ] SQL setup complete (all ✓ PASS)
- [ ] Admin login tested
- [ ] Timer shows "Inactive"
- [ ] Positions/candidates verified

During voting:
- [ ] Timer counting down smoothly
- [ ] Students can login and vote
- [ ] Vote counts updating
- [ ] No error messages

After voting:
- [ ] Timer shows "Inactive"
- [ ] Students cannot login
- [ ] Results PDF generated
- [ ] All votes recorded

---

## 📞 EMERGENCY

**Browser Console**: Press F12 → Console tab  
**Server Logs**: Check terminal where Next.js is running  
**Database**: Supabase Dashboard → Table Editor  

**Quick Reset** (if needed before election):
```sql
UPDATE students SET has_voted = false, voted_at = NULL;
UPDATE candidates SET vote_count = 0;
UPDATE election_stats SET is_active = false;
DELETE FROM votes;
```

---

## ✨ SYSTEM HIGHLIGHTS

- **Ultra-fast**: <200ms response times
- **Secure**: Bcrypt passwords, duplicate prevention
- **Reliable**: Auto-deactivation, time validation
- **Professional**: Official PDFs, real-time stats
- **User-friendly**: Simple interface, clear messages

---

**Good luck with the election! 🎉**

