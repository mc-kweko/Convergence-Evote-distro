# How to Push Your App to GitHub

## Step 1: Create a GitHub Account (if you don't have one)

1. Go to https://github.com
2. Click "Sign up"
3. Enter your email, create password, choose username
4. Verify your email

---

## Step 2: Install Git (if not installed)

### Check if Git is installed:
Open Command Prompt and type:
```bash
git --version
```

If you see a version number, Git is installed. Skip to Step 3.

### If Git is NOT installed:
1. Download from: https://git-scm.com/download/win
2. Run the installer
3. Use default settings (just click "Next")
4. Restart Command Prompt after installation

---

## Step 3: Configure Git (First Time Only)

Open Command Prompt in your project folder and run:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

Replace with your actual name and email.

---

## Step 4: Create a New Repository on GitHub

1. Go to https://github.com
2. Click the "+" icon (top right) → "New repository"
3. Fill in:
   - **Repository name:** `convergence-e-vote`
   - **Description:** "Electoral Commission voting system for Convergence E-Vote"
   - **Visibility:** Choose "Private" (recommended) or "Public"
   - **DO NOT** check "Initialize with README"
4. Click "Create repository"
5. **Keep this page open** - you'll need the URL

---

## Step 5: Push Your Code to GitHub

### Open Command Prompt in your project folder:
1. Press `Windows + E` to open File Explorer
2. Navigate to: `C:\Users\HP ELITEBOOK 1040 G8\Desktop\Workspace\Voting\b_3WgPq2L0Ww5-1772275216239`
3. Type `cmd` in the address bar and press Enter

### Run these commands one by one:

```bash
# Initialize Git repository
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit - Convergence E-Vote Electoral System"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/convergence-e-vote.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Important:** Replace `YOUR_USERNAME` with your actual GitHub username in the command above.

---

## Step 6: Enter GitHub Credentials

When you run `git push`, you'll be asked to login:

### Option A: GitHub Desktop (Easier)
1. Download GitHub Desktop: https://desktop.github.com
2. Sign in with your GitHub account
3. It will handle authentication automatically

### Option B: Personal Access Token
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name: "Electoral System"
4. Check "repo" scope
5. Click "Generate token"
6. **Copy the token** (you won't see it again!)
7. When Git asks for password, paste the token

---

## Step 7: Verify Upload

1. Go to your GitHub repository page
2. Refresh the page
3. You should see all your files uploaded
4. ✅ Success!

---

## Important Notes

### ✅ What Gets Uploaded:
- All your code files
- Configuration files
- Public assets (images, etc.)

### ❌ What Does NOT Get Uploaded (Protected):
- `.env.local` (your Supabase credentials) ✅ SAFE
- `node_modules/` (dependencies)
- `.next/` (build files)

### 🔒 Security:
Your `.gitignore` file is already configured to protect sensitive data like your Supabase keys. They will NOT be uploaded to GitHub.

---

## Troubleshooting

### Error: "Git is not recognized"
- Install Git from https://git-scm.com/download/win
- Restart Command Prompt

### Error: "Permission denied"
- Use Personal Access Token instead of password
- Or install GitHub Desktop

### Error: "Repository not found"
- Check you replaced YOUR_USERNAME with your actual GitHub username
- Verify repository exists on GitHub

### Error: "Failed to push"
- Check internet connection
- Verify GitHub credentials
- Try: `git push -u origin main --force` (only if first push)

---

## Quick Reference Commands

```bash
# Check Git status
git status

# Add new changes
git add .

# Commit changes
git commit -m "Description of changes"

# Push to GitHub
git push

# Pull latest changes
git pull
```

---

## Next Steps After Pushing to GitHub

1. ✅ Code is now on GitHub
2. Go to Vercel.com
3. Import your GitHub repository
4. Add environment variables (Supabase keys)
5. Deploy!

See **DEPLOYMENT_GUIDE.md** for detailed deployment instructions.


