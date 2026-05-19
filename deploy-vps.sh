#!/bin/bash
# ══════════════════════════════════════════════════════════════════
# ABIAL BLOG CMS — Ubuntu VPS Deployment Script
# Run this on your Ubuntu VPS as root or sudo user
# ══════════════════════════════════════════════════════════════════

# ── STEP 1: System Update ─────────────────────────────────────────
apt update && apt upgrade -y

# ── STEP 2: Install Node.js 20 LTS ───────────────────────────────
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version   # Should show v20.x.x
npm --version

# ── STEP 3: Install Nginx ─────────────────────────────────────────
apt install -y nginx
systemctl enable nginx
systemctl start nginx

# ── STEP 4: Install Git ───────────────────────────────────────────
apt install -y git

# ── STEP 5: Clone Repository ──────────────────────────────────────
cd /var/www
git clone https://github.com/abialtechnologies/CMS.git blog-cms
cd blog-cms

# ── STEP 6: Create .env file (ADD YOUR REAL VALUES) ───────────────
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://maggkwqdanapyziqbthl.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
VITE_ALLOWED_EMAIL=gmb1.sheraz@gmail.com
EOF

echo "⚠️  Edit .env with real values: nano /var/www/blog-cms/.env"

# ── STEP 7: Install & Build ───────────────────────────────────────
npm install
npm run build
# Build output goes to /var/www/blog-cms/dist/

# ── STEP 8: Nginx Config ──────────────────────────────────────────
cat > /etc/nginx/sites-available/blog-cms << 'NGINX'
server {
    listen 80;
    server_name cms.abial.ai;   # Change to your domain or VPS IP

    root /var/www/blog-cms/dist;
    index index.html;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # SPA routing — all routes to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Block access to hidden files
    location ~ /\. {
        deny all;
    }
}
NGINX

# Enable site
ln -sf /etc/nginx/sites-available/blog-cms /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo "✅ Nginx configured for port 80"
