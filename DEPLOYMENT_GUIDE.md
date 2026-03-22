# Convergence E-Vote - Deployment Guide

## Quick Deployment to Vercel (5 Minutes)

### Prerequisites
- GitHub account
- Supabase account (already set up)

### Step 1: Push to GitHub

1. Create a new repository on GitHub
2. In your project folder, run:
```bash
git init
git add .
git commit -m "Initial commit - Convergence E-Vote Electoral System"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### Step 2: Deploy to Vercel

1. Go to https://vercel.com
2. Click "Sign Up" and choose "Continue with GitHub"
3. Click "Add New Project"
4. Import your repository
5. Configure project:
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: .next

### Step 3: Add Environment Variables

In Vercel project settings, add these variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Where to find these:**
- Go to your Supabase project
- Settings → API
- Copy the values

### Step 4: Deploy

1. Click "Deploy"
2. Wait 2-3 minutes
3. Get your URL: `https://your-project.vercel.app`

---

## Local Network Deployment (School Network Only)

### Prerequisites
- Windows/Linux server computer
- Node.js installed
- Static IP address on school network

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Build Application
```bash
npm run build
```

### Step 3: Start Server
```bash
npm start
```

### Step 4: Access Application
- Find server IP: `ipconfig` (Windows)
- Students access: `http://SERVER_IP:3000/voting`
- Admin access: `http://SERVER_IP:3000`

### Step 5: Keep Server Running
- Use PM2 for auto-restart:
```bash
npm install -g pm2
pm2 start npm --name "electoral-system" -- start
pm2 save
pm2 startup
```

---

## Post-Deployment Checklist

### 1. Test Admin Login
- [ ] Go to your deployed URL
- [ ] Login with: `admin@school.edu` / `admin123`
- [ ] Verify dashboard loads

### 2. Import Students
- [ ] Go to Students page
- [ ] Download template
- [ ] Fill with student data (Name is mandatory)
- [ ] Import Excel file
- [ ] Verify students appear in list

### 3. Generate Voting Cards
- [ ] Click "Generate Voting Cards"
- [ ] Download PDF
- [ ] Print and distribute to students

### 4. Create Ballot
- [ ] Go to Ballot Setup
- [ ] Add position (e.g., "Head Boy")
- [ ] Add candidates with names, class, stream
- [ ] Repeat for all positions

### 5. Test Voting
- [ ] Go to `/voting` URL
- [ ] Search for a test student
- [ ] Enter their PIN
- [ ] Cast a test vote
- [ ] Verify vote appears in Results

### 6. Monitor Election
- [ ] Check Results page for live updates
- [ ] Monitor voter turnout on Dashboard
- [ ] Export results PDF when complete

---

## URLs to Share

### For Students (Voting):
```
https://your-app.vercel.app/voting
```

### For Admin (Dashboard):
```
https://your-app.vercel.app
```

### For Results (Public View):
```
https://your-app.vercel.app/dashboard/results
```

---

## Security Recommendations

1. **Change Admin Password:**
   - After first login, update admin password in Supabase
   - Go to Supabase → Authentication → Users
   - Find admin user → Reset password

2. **Restrict Admin Access:**
   - Only share admin URL with electoral commission
   - Use strong passwords

3. **Voting Period:**
   - Set clear start/end times
   - Monitor for suspicious activity
   - Use Settings page to clear votes if needed

4. **After Election:**
   - Export results PDF immediately
   - Backup database from Supabase
   - Use Settings → Clear Votes for next election

---

## Troubleshooting

### Students Can't Login
- Verify student was imported correctly
- Check PIN is correct (case-sensitive)
- Ensure student hasn't already voted

### Admin Can't Login
- Verify credentials: `admin@school.edu` / `admin123`
- Check Supabase connection
- Verify environment variables in Vercel

### Votes Not Appearing
- Check browser console for errors
- Verify Supabase SERVICE_ROLE_KEY is set
- Refresh Results page

### Deployment Failed
- Check all environment variables are set
- Verify Node.js version compatibility
- Check build logs in Vercel

---

## Support

For technical issues:
1. Check browser console (F12)
2. Check Vercel deployment logs
3. Check Supabase logs
4. Verify all environment variables

---

## System Requirements

### For Server (Local Deployment):
- Windows 10/11 or Linux
- 4GB RAM minimum
- Node.js 18+ installed
- Stable network connection

### For Users (Students/Admin):
- Modern web browser (Chrome, Firefox, Edge)
- Internet connection (cloud) or school network (local)
- No installation required

---

## Maintenance

### Regular Tasks:
- Backup Supabase database weekly
- Monitor disk space on server
- Update Node.js packages monthly
- Test system before each election

### Before Each Election:
1. Clear previous election data (Settings page)
2. Import new student list
3. Create new ballot
4. Generate new voting cards
5. Test with sample votes

---

## Cost Breakdown

### Cloud Deployment (Vercel + Supabase):
- Vercel: **FREE** (Hobby plan)
- Supabase: **FREE** (up to 500MB database)
- Domain (optional): ~$10/year
- **Total: $0-10/year**

### Local Deployment:
- Server computer: One-time cost
- Electricity: Minimal
- **Total: ~$0/year** (after initial setup)

---

## Recommended Setup for Convergence E-Vote

**Best Approach:**
1. Deploy to Vercel (free, reliable)
2. Use Supabase for database (free, backed up)
3. Custom domain (optional): `portal.school-domain.edu`
4. Total cost: **FREE**

**Benefits:**
- Access from anywhere
- Automatic backups
- No server maintenance
- Professional appearance
- Scales automatically

---

## Next Steps

1. Choose deployment method (Vercel recommended)
2. Follow deployment steps above
3. Complete post-deployment checklist
4. Test thoroughly before election day
5. Train electoral commission on admin panel
6. Prepare student communication about voting process

**Good luck with your election! 🗳️**


