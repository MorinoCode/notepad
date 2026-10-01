import { mkdirSync, copyFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const STORE_DIR = resolve('store-assets');
mkdirSync(STORE_DIR, { recursive: true });

// 1. Copy 128x128 store icon
copyFileSync('public/icon/128.png', join(STORE_DIR, 'store-icon-128x128.png'));
console.log('✓ Store icon: store-assets/store-icon-128x128.png');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function renderHtmlToImage(htmlContent, outputPath, width, height) {
  const tempHtmlPath = resolve(
    `temp-${Date.now()}-${Math.random().toString(36).substring(7)}.html`,
  );
  writeFileSync(tempHtmlPath, htmlContent, 'utf-8');

  try {
    const fileUrl = 'file:///' + tempHtmlPath.replace(/\\/g, '/');
    execFileSync(chromePath, [
      '--headless=new',
      `--screenshot=${outputPath}`,
      `--window-size=${width},${height}`,
      '--hide-scrollbars',
      '--disable-gpu',
      '--force-device-scale-factor=1',
      fileUrl,
    ]);
    console.log(`✓ Generated: ${outputPath} (${width}x${height})`);
  } finally {
    try {
      unlinkSync(tempHtmlPath);
    } catch {}
  }
}

const baseStyles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #f1f5f9;
    background: #090a10;
    overflow: hidden;
    position: relative;
    -webkit-font-smoothing: antialiased;
  }
  .bg-glow {
    position: absolute;
    width: 800px;
    height: 800px;
    border-radius: 50%;
    filter: blur(140px);
    opacity: 0.25;
    pointer-events: none;
  }
  .glow-indigo { top: -200px; left: 15%; background: #6366f1; }
  .glow-purple { bottom: -200px; right: 15%; background: #a855f7; }
  .glow-blue { top: 30%; right: 25%; background: #3b82f6; opacity: 0.18; }

  .bg-grid {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 40%, transparent 100%);
  }

  .container {
    position: relative;
    z-index: 10;
    width: 1280px;
    height: 800px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding-top: 50px;
  }

  .header {
    text-align: center;
    max-width: 800px;
    margin-bottom: 35px;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    background: rgba(99, 102, 241, 0.15);
    border: 1px solid rgba(99, 102, 241, 0.35);
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 600;
    color: #a5b4fc;
    margin-bottom: 14px;
    letter-spacing: 0.02em;
  }
  .title {
    font-size: 38px;
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.15;
    background: linear-gradient(180deg, #ffffff 30%, #94a3b8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 10px;
  }
  .subtitle {
    font-size: 17px;
    color: #94a3b8;
    line-height: 1.5;
    font-weight: 400;
  }

  /* Popup Mockup */
  .popup-frame {
    width: 390px;
    background: rgba(18, 20, 29, 0.88);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 18px;
    box-shadow: 
      0 30px 70px -10px rgba(0, 0, 0, 0.7),
      0 0 0 1px rgba(255, 255, 255, 0.06),
      0 10px 30px rgba(0, 0, 0, 0.4);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .popup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.03);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .brand-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
  }
  .brand-name {
    font-size: 15px;
    font-weight: 700;
    color: #f8fafc;
    letter-spacing: -0.01em;
  }
  .usage-pill {
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.08);
    color: #94a3b8;
    font-weight: 500;
  }
  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .icon-btn {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    color: #94a3b8;
  }

  .status-tabs {
    display: flex;
    gap: 4px;
    padding: 8px 14px;
    background: rgba(0, 0, 0, 0.15);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  .tab {
    font-size: 12px;
    padding: 4px 10px;
    border-radius: 6px;
    color: #94a3b8;
    font-weight: 500;
  }
  .tab.active {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
    font-weight: 600;
  }

  .composer {
    padding: 12px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .composer-input {
    width: 100%;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 10px 12px;
    color: #f1f5f9;
    font-size: 13.5px;
    outline: none;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
  }
  .composer-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 8px;
  }
  .composer-tools {
    display: flex;
    gap: 6px;
  }
  .tool-tag {
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.06);
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .add-btn {
    padding: 5px 12px;
    background: #4f46e5;
    color: white;
    font-size: 12px;
    font-weight: 600;
    border-radius: 6px;
    border: none;
  }

  .notes-list {
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .note-item {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .note-top {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }
  .checkbox {
    width: 16px;
    height: 16px;
    border-radius: 4px;
    border: 1.5px solid rgba(255, 255, 255, 0.3);
    margin-top: 2px;
    flex-shrink: 0;
  }
  .checkbox.checked {
    background: #10b981;
    border-color: #10b981;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .note-text {
    font-size: 13px;
    color: #e2e8f0;
    line-height: 1.4;
    flex: 1;
  }
  .note-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: 26px;
  }
  .tag {
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 5px;
    font-weight: 500;
  }
  .tag-purple { background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }
  .tag-amber { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
  .tag-blue { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }

  .reminder-badge {
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 5px;
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.3);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  /* Decorative feature callouts */
  .callouts {
    position: absolute;
    bottom: 40px;
    display: flex;
    gap: 20px;
    z-index: 20;
  }
  .callout-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 9999px;
    font-size: 13.5px;
    color: #cbd5e1;
    backdrop-filter: blur(12px);
  }
  .callout-icon {
    color: #818cf8;
    font-size: 16px;
  }
`;

// ==========================================
// 1. Screenshot 1: Instant Capture
// ==========================================
const html1 = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
${baseStyles}
</style>
</head>
<body>
  <div class="bg-glow glow-indigo"></div>
  <div class="bg-glow glow-purple"></div>
  <div class="bg-grid"></div>

  <div class="container">
    <div class="header">
      <div class="badge">⚡ Instant Toolbar Access</div>
      <h1 class="title">Capture Thoughts in One Click</h1>
      <p class="subtitle">Focus immediately on typing with auto-saved drafts and zero friction.</p>
    </div>

    <div class="popup-frame">
      <div class="popup-header">
        <div class="brand">
          <div class="brand-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H13l7 7v6.5A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5z"/><path d="M13 4v7h7"/><path d="M8.5 13.5h6"/><path d="M8.5 16.5h3.5"/></svg>
          </div>
          <span class="brand-name">Notewisp</span>
        </div>
        <div class="header-actions">
          <span class="usage-pill">3 of 10 free notes</span>
          <div class="icon-btn">⚙</div>
        </div>
      </div>

      <div class="status-tabs">
        <div class="tab active">All (3)</div>
        <div class="tab">To do (2)</div>
        <div class="tab">In progress (1)</div>
        <div class="tab">Done (0)</div>
      </div>

      <div class="composer">
        <input class="composer-input" value="Review Q3 analytics and publish team recap..." autofocus />
        <div class="composer-bar">
          <div class="composer-tools">
            <span class="tool-tag">#priority</span>
            <span class="tool-tag">🕒 Set reminder</span>
          </div>
          <button class="add-btn">Save Note</button>
        </div>
      </div>

      <div class="notes-list">
        <div class="note-item">
          <div class="note-top">
            <div class="checkbox"></div>
            <span class="note-text">Finalize release documentation and store assets</span>
          </div>
          <div class="note-meta">
            <span class="tag tag-blue">#work</span>
            <span class="reminder-badge">🔔 Today 5:00 PM</span>
          </div>
        </div>

        <div class="note-item">
          <div class="note-top">
            <div class="checkbox"></div>
            <span class="note-text">Call the dentist to confirm Tuesday checkup</span>
          </div>
          <div class="note-meta">
            <span class="tag tag-amber">#personal</span>
            <span class="reminder-badge">🔔 Tomorrow 9:00 AM</span>
          </div>
        </div>

        <div class="note-item">
          <div class="note-top">
            <div class="checkbox"></div>
            <span class="note-text">Explore Tailwind CSS v4 design tokens in new branch</span>
          </div>
          <div class="note-meta">
            <span class="tag tag-purple">#dev</span>
          </div>
        </div>
      </div>
    </div>

    <div class="callouts">
      <div class="callout-item"><span class="callout-icon">⌨</span> Shortcut Ctrl+Shift+Y</div>
      <div class="callout-item"><span class="callout-icon">💾</span> Never Loses a Draft</div>
      <div class="callout-item"><span class="callout-icon">🔒</span> 100% On-Device & Private</div>
    </div>
  </div>
</body>
</html>`;

// ==========================================
// 2. Screenshot 2: Smart Reminders
// ==========================================
const html2 = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
${baseStyles}
.reminder-modal {
  background: rgba(30, 32, 46, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 14px;
  padding: 14px;
  margin: 12px 14px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
}
.reminder-title {
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.preset-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 10px;
}
.preset-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px;
  color: #e2e8f0;
  text-align: left;
}
.preset-btn.active {
  background: rgba(99, 102, 241, 0.25);
  border-color: #6366f1;
  color: #a5b4fc;
  font-weight: 600;
}
</style>
</head>
<body>
  <div class="bg-glow glow-purple"></div>
  <div class="bg-glow glow-blue"></div>
  <div class="bg-grid"></div>

  <div class="container">
    <div class="header">
      <div class="badge">🔔 Smart Reminders</div>
      <h1 class="title">Survives Restarts. Alerts on Time.</h1>
      <p class="subtitle">Quick presets or custom times with native desktop alerts and badge counts.</p>
    </div>

    <div class="popup-frame">
      <div class="popup-header">
        <div class="brand">
          <div class="brand-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H13l7 7v6.5A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5z"/><path d="M13 4v7h7"/><path d="M8.5 13.5h6"/><path d="M8.5 16.5h3.5"/></svg>
          </div>
          <span class="brand-name">Notewisp</span>
        </div>
        <div class="header-actions">
          <span class="usage-pill">Reminders Active</span>
          <div class="icon-btn">⚙</div>
        </div>
      </div>

      <div class="reminder-modal">
        <div class="reminder-title">
          <span>⏰</span> Set Reminder for note
        </div>
        <div class="preset-grid">
          <div class="preset-btn">In an hour</div>
          <div class="preset-btn active">This evening (6 PM)</div>
          <div class="preset-btn">Tomorrow 9 AM</div>
          <div class="preset-btn">Pick custom date...</div>
        </div>
        <button class="add-btn" style="width: 100%; padding: 8px;">Schedule Reminder</button>
      </div>

      <div class="notes-list">
        <div class="note-item" style="border-color: rgba(99, 102, 241, 0.4); background: rgba(99, 102, 241, 0.08);">
          <div class="note-top">
            <div class="checkbox"></div>
            <span class="note-text">Submit quarterly report before the executive sync</span>
          </div>
          <div class="note-meta">
            <span class="reminder-badge" style="background: rgba(99, 102, 241, 0.2); color: #a5b4fc; border-color: rgba(99, 102, 241, 0.4);">
              🔔 Today at 6:00 PM (in 2h)
            </span>
          </div>
        </div>

        <div class="note-item">
          <div class="note-top">
            <div class="checkbox checked"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
            <span class="note-text" style="text-decoration: line-through; opacity: 0.6;">Send revised contract to design team</span>
          </div>
          <div class="note-meta">
            <span class="tag tag-blue">#contract</span>
          </div>
        </div>
      </div>
    </div>

    <div class="callouts">
      <div class="callout-item"><span class="callout-icon">🎯</span> Toolbar Badge Keeps Count</div>
      <div class="callout-item"><span class="callout-icon">💻</span> Native Desktop Notifications</div>
      <div class="callout-item"><span class="callout-icon">🔄</span> Survives Browser Restarts</div>
    </div>
  </div>
</body>
</html>`;

// ==========================================
// 3. Screenshot 3: Search, Tags & Status
// ==========================================
const html3 = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
${baseStyles}
.tag-bar {
  display: flex;
  gap: 6px;
  padding: 8px 14px;
  overflow-x: auto;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.pill-tag {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
}
.pill-tag.active {
  background: #6366f1;
  color: white;
  font-weight: 600;
}
.search-box {
  padding: 8px 14px;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.search-input {
  background: transparent;
  border: none;
  color: white;
  font-size: 13px;
  outline: none;
  width: 100%;
}
</style>
</head>
<body>
  <div class="bg-glow glow-blue"></div>
  <div class="bg-glow glow-indigo"></div>
  <div class="bg-grid"></div>

  <div class="container">
    <div class="header">
      <div class="badge">🏷️ Tags & Instant Filter</div>
      <h1 class="title">Organize Easily. Find Instantly.</h1>
      <p class="subtitle">Search titles, bodies and hashtags with instant feedback and export to Markdown.</p>
    </div>

    <div class="popup-frame">
      <div class="popup-header">
        <div class="brand">
          <div class="brand-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H13l7 7v6.5A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5z"/><path d="M13 4v7h7"/><path d="M8.5 13.5h6"/><path d="M8.5 16.5h3.5"/></svg>
          </div>
          <span class="brand-name">Notewisp</span>
        </div>
        <div class="header-actions">
          <div class="icon-btn" title="Export Markdown">📥</div>
          <div class="icon-btn">⚙</div>
        </div>
      </div>

      <div class="search-box">
        <span style="color: #6366f1;">🔍</span>
        <input class="search-input" value="meeting" />
      </div>

      <div class="tag-bar">
        <span class="pill-tag">All tags</span>
        <span class="pill-tag active">#meeting (2)</span>
        <span class="pill-tag">#ideas (4)</span>
        <span class="pill-tag">#dev (3)</span>
      </div>

      <div class="notes-list">
        <div class="note-item">
          <div class="note-top">
            <div class="checkbox"></div>
            <span class="note-text">Sync with Product Design regarding the new onboarding flow <span style="background: rgba(99, 102, 241, 0.3); border-radius: 3px; padding: 0 3px;">#meeting</span></span>
          </div>
          <div class="note-meta">
            <span class="tag tag-purple">#meeting</span>
            <span class="reminder-badge">🔔 Tomorrow 10:00 AM</span>
          </div>
        </div>

        <div class="note-item">
          <div class="note-top">
            <div class="checkbox"></div>
            <span class="note-text">Prep agenda and questions for client kickoff <span style="background: rgba(99, 102, 241, 0.3); border-radius: 3px; padding: 0 3px;">#meeting</span></span>
          </div>
          <div class="note-meta">
            <span class="tag tag-purple">#meeting</span>
          </div>
        </div>
      </div>
    </div>

    <div class="callouts">
      <div class="callout-item"><span class="callout-icon">🔍</span> Instant Sub-Millisecond Search</div>
      <div class="callout-item"><span class="callout-icon">📑</span> 1-Click Export to Markdown</div>
      <div class="callout-item"><span class="callout-icon">🎨</span> Five Vibrant Note Accents</div>
    </div>
  </div>
</body>
</html>`;

// ==========================================
// 4. Screenshot 4: Simple Fair Pricing (Paywall)
// ==========================================
const html4 = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
${baseStyles}
.paywall-card {
  padding: 24px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.paywall-star {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  box-shadow: 0 8px 20px rgba(245, 158, 11, 0.35);
  margin-bottom: 16px;
}
.paywall-title {
  font-size: 19px;
  font-weight: 700;
  color: white;
  margin-bottom: 8px;
}
.paywall-desc {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.5;
  margin-bottom: 22px;
}
.paywall-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  font-weight: 700;
  font-size: 14px;
  border-radius: 10px;
  border: none;
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
  margin-bottom: 12px;
}
.restore-btn {
  font-size: 12px;
  color: #818cf8;
  text-decoration: underline;
  background: none;
  border: none;
}
</style>
</head>
<body>
  <div class="bg-glow glow-indigo"></div>
  <div class="bg-glow glow-purple"></div>
  <div class="bg-grid"></div>

  <div class="container">
    <div class="header">
      <div class="badge">💎 Honest & Transparent</div>
      <h1 class="title">10 Notes Free. Then Just $1/Month.</h1>
      <p class="subtitle">No hidden fees, no analytics, no lock-in. Cancel anytime with one click.</p>
    </div>

    <div class="popup-frame">
      <div class="popup-header">
        <div class="brand">
          <div class="brand-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H13l7 7v6.5A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5z"/><path d="M13 4v7h7"/><path d="M8.5 13.5h6"/><path d="M8.5 16.5h3.5"/></svg>
          </div>
          <span class="brand-name">Notewisp Pro</span>
        </div>
        <div class="header-actions">
          <span class="usage-pill" style="color: #fbbf24; background: rgba(245, 158, 11, 0.15);">10 / 10 Used</span>
        </div>
      </div>

      <div class="paywall-card">
        <div class="paywall-star">✨</div>
        <div class="paywall-title">Unlock Unlimited Notes</div>
        <div class="paywall-desc">
          You've used all 10 free notes! Upgrade to Notewisp Pro for unlimited capture, recurring reminders, and priority updates.
        </div>
        <button class="paywall-btn">Upgrade to Pro · $1/month</button>
        <button class="restore-btn">Already subscribed? Restore access</button>
      </div>
    </div>

    <div class="callouts">
      <div class="callout-item"><span class="callout-icon">✨</span> Unlimited Notes & Reminders</div>
      <div class="callout-item"><span class="callout-icon">💳</span> Secure Stripe Payments</div>
      <div class="callout-item"><span class="callout-icon">❌</span> Cancel Anytime in 1 Click</div>
    </div>
  </div>
</body>
</html>`;

// ==========================================
// 5. Promo Small Tile (440 x 280)
// ==========================================
const htmlPromo = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  width: 440px;
  height: 280px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #090a10;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.bg-glow {
  position: absolute;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  filter: blur(70px);
  opacity: 0.35;
}
.glow1 { top: -60px; left: -30px; background: #6366f1; }
.glow2 { bottom: -60px; right: -30px; background: #a855f7; }
.content {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.icon-box {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 25px rgba(99, 102, 241, 0.45);
  margin-bottom: 14px;
}
.title {
  font-size: 26px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.02em;
  margin-bottom: 6px;
}
.tagline {
  font-size: 14px;
  color: #94a3b8;
  font-weight: 500;
  margin-bottom: 14px;
}
.badge-pill {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 12px;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 9999px;
  color: #a5b4fc;
}
</style>
</head>
<body>
  <div class="bg-glow glow1"></div>
  <div class="bg-glow glow2"></div>
  <div class="content">
    <div class="icon-box">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H13l7 7v6.5A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5z"/><path d="M13 4v7h7"/><path d="M8.5 13.5h6"/><path d="M8.5 16.5h3.5"/></svg>
    </div>
    <div class="title">Notewisp</div>
    <div class="tagline">Note it. Forget it. Never lose a thought.</div>
    <div class="badge-pill">Notes & Reminders in One Click</div>
  </div>
</body>
</html>`;

// ==========================================
// 6. Marquee Large Promo Banner (1400 x 560)
// ==========================================
const htmlMarquee = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  width: 1400px;
  height: 560px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #090a10;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 100px;
  color: white;
  -webkit-font-smoothing: antialiased;
}
.bg-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  pointer-events: none;
}
.glow1 { top: -100px; left: 100px; width: 500px; height: 500px; background: #6366f1; opacity: 0.3; }
.glow2 { bottom: -100px; right: 150px; width: 600px; height: 600px; background: #a855f7; opacity: 0.25; }
.glow3 { top: 200px; left: 450px; width: 400px; height: 400px; background: #3b82f6; opacity: 0.15; }

.bg-grid {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 35px 35px;
  mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, #000 50%, transparent 100%);
}

.left-content {
  position: relative;
  z-index: 10;
  max-width: 580px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.brand-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}
.marquee-icon {
  width: 68px;
  height: 68px;
  border-radius: 18px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 30px rgba(99, 102, 241, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.brand-title {
  font-size: 42px;
  font-weight: 800;
  letter-spacing: -0.03em;
  background: linear-gradient(180deg, #ffffff 40%, #cbd5e1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.tagline-badge {
  font-size: 13px;
  font-weight: 600;
  padding: 5px 14px;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.35);
  border-radius: 9999px;
  color: #a5b4fc;
  margin-bottom: 16px;
}
.hero-heading {
  font-size: 34px;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
  margin-bottom: 14px;
}
.hero-desc {
  font-size: 16px;
  color: #94a3b8;
  line-height: 1.6;
  margin-bottom: 26px;
}
.features-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14.5px;
  color: #e2e8f0;
  font-weight: 500;
}
.feature-dot {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: rgba(99, 102, 241, 0.2);
  color: #818cf8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.right-content {
  position: relative;
  z-index: 10;
  margin-right: 40px;
}
.popup-preview {
  width: 370px;
  background: rgba(18, 20, 30, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 18px;
  box-shadow: 
    0 25px 60px -10px rgba(0, 0, 0, 0.8),
    0 0 0 1px rgba(255, 255, 255, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
}
.preview-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
}
.preview-input {
  margin: 12px 14px;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  font-size: 13px;
  color: #94a3b8;
}
.preview-card {
  margin: 0 14px 12px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
</head>
<body>
  <div class="bg-glow glow1"></div>
  <div class="bg-glow glow2"></div>
  <div class="bg-glow glow3"></div>
  <div class="bg-grid"></div>

  <div class="left-content">
    <div class="brand-row">
      <div class="marquee-icon">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H13l7 7v6.5A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5z"/><path d="M13 4v7h7"/><path d="M8.5 13.5h6"/><path d="M8.5 16.5h3.5"/></svg>
      </div>
      <div>
        <div class="brand-title">Notewisp</div>
      </div>
    </div>
    
    <div class="tagline-badge">Chrome Productivity Extension</div>
    <h1 class="hero-heading">Capture Notes & Reminders in One Click</h1>
    <p class="hero-desc">The lightning-fast, distraction-free notepad that lives right inside your toolbar. Auto-saving drafts, desktop alerts, and zero cloud tracking.</p>

    <div class="features-list">
      <div class="feature-item"><div class="feature-dot">⚡</div> Instant toolbar popup with shortcut Ctrl+Shift+Y</div>
      <div class="feature-item"><div class="feature-dot">🔔</div> Smart reminders with scheduled desktop alerts</div>
      <div class="feature-item"><div class="feature-dot">🔒</div> 100% Private & offline-first on your device</div>
    </div>
  </div>

  <div class="right-content">
    <div class="popup-preview">
      <div class="preview-header">
        <div class="preview-title">
          <span style="color: #818cf8;">●</span> Notewisp
        </div>
        <span style="font-size: 11px; padding: 2px 8px; border-radius: 9999px; background: rgba(99, 102, 241, 0.2); color: #a5b4fc;">Active</span>
      </div>
      <div class="preview-input">Capture a note or reminder...</div>
      
      <div class="preview-card" style="border-color: rgba(99, 102, 241, 0.3); background: rgba(99, 102, 241, 0.08);">
        <div style="font-size: 13px; color: #f1f5f9; font-weight: 500;">Review weekly product roadmap #strategy</div>
        <div style="display: flex; gap: 6px; margin-top: 4px;">
          <span style="font-size: 10.5px; padding: 2px 6px; border-radius: 4px; background: rgba(99, 102, 241, 0.3); color: #a5b4fc;">🔔 Today at 5:00 PM</span>
        </div>
      </div>

      <div class="preview-card">
        <div style="font-size: 13px; color: #cbd5e1;">Follow up with design team on dark mode tokens</div>
        <div style="display: flex; gap: 6px; margin-top: 4px;">
          <span style="font-size: 10.5px; padding: 2px 6px; border-radius: 4px; background: rgba(59, 130, 246, 0.2); color: #60a5fa;">#design</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

renderHtmlToImage(html1, join(STORE_DIR, 'screenshot-1-capture.jpg'), 1280, 800);
renderHtmlToImage(html2, join(STORE_DIR, 'screenshot-2-reminders.jpg'), 1280, 800);
renderHtmlToImage(html3, join(STORE_DIR, 'screenshot-3-search-tags.jpg'), 1280, 800);
renderHtmlToImage(html4, join(STORE_DIR, 'screenshot-4-pricing.jpg'), 1280, 800);
renderHtmlToImage(htmlPromo, join(STORE_DIR, 'promo-small-tile-440x280.jpg'), 440, 280);
renderHtmlToImage(htmlMarquee, join(STORE_DIR, 'promo-marquee-1400x560.jpg'), 1400, 560);

console.log('All store assets successfully generated in store-assets/ directory!');
