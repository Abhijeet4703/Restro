# 🎨 Menu Design Templates

> Canva-style template system for restaurant menus. Each folder contains a self-contained **HTML + CSS + JS** design that can be previewed by opening `index.html` in any browser.

## Templates

| # | Folder | Style | Vibe |
|---|--------|-------|------|
| 1 | `royal-3d/` | **Royal 3D Card Flip** | Luxury gold, 3D card flip on tap, parallax, dark theme |
| 2 | `neon-glow/` | **Neon Glow Scroll** | Cyberpunk neon, glowing cards, animated gradient borders |
| 3 | `minimal-zen/` | **Minimal Zen** | Clean white, soft shadows, Japanese-inspired minimalism |
| 4 | `vintage-paper/` | **Vintage Newspaper** | Old newspaper style, sepia tones, typewriter fonts |
| 5 | `insta-reel/` | **Instagram Reel Card** | Full-screen vertical swipe, story-style, 3D opening animation |

## How to Use

1. **Preview**: Open any `index.html` in a browser
2. **Customize**: Edit colors/fonts in the `<style>` section
3. **Integrate**: The templates use `{{PLACEHOLDER}}` variables that the platform replaces with real menu data
4. **Send to Team**: Just zip the folder and share — no build tools needed!

## Data Placeholders

Templates use these variables (replaced at runtime):
- `{{RESTAURANT_NAME}}` — Restaurant name
- `{{RESTAURANT_LOGO}}` — Logo URL
- `{{CATEGORIES}}` — Menu categories (rendered by JS)
- `{{ITEMS}}` — Menu items (rendered by JS)

## For Developers

The web app at `/menu/[restaurantId]` reads the restaurant's `menuTemplate` field and applies the matching template's styles dynamically. The standalone HTML files here serve as:
1. **Design references** for the team
2. **Preview files** for restaurant owners in the dashboard
3. **Exportable packages** that clients can customize
