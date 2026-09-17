# AKS

Build a premium, dark-themed website for Auto Kontor Sfax (AKS), a car showroom/dealership based in Sfax, Tunisia. The site should feel high-end, automotive, and tactile — like a luxury dealership meets a modern SaaS product, not a generic template.

Brand Identity

Logo: bold angular "AKS" wordmark in white with a red "K", pure black background, sharp aggressive geometric cuts (like a speed/motion mark).

Color palette:

Background: near-black (#0A0A0A / #0D0D0D)

Primary accent: racing red (#E10600 or similar)

Secondary: pure white (#FFFFFF) and steel gray (#8A8A8A, #1C1C1C) for panels

Optional metallic gradient accents (silver/chrome gradient) for a premium automotive feel

Typography: bold, condensed/geometric sans-serif for headings (e.g. Poppins, Space Grotesk, or Orbitron for accents), clean sans-serif for body text (Inter). Headings should feel confident and heavy, like automotive branding.

Overall Design Direction

Dark, premium, "showroom at night" atmosphere — think spotlighted cars on a black background, subtle red glow accents, glassmorphism panels for content sections.

Add depth everywhere: layered shadows, subtle gradients, soft ambient glows behind key elements (especially red glow behind CTAs and hero car image).

Micro-interactions: smooth hover states, slight scale/lift on cards, parallax or fade-in on scroll.

Buttons — Critical Requirement (3D / Tactile, YouTube-style depth)

All primary and secondary buttons must have real tactile depth, not flat design:

Use a layered/skeuomorphic style: a slightly darker "base" shadow layer beneath the button that mimics physical height (like a raised keycap or YouTube's subscribe/like buttons).

On default state: subtle top-light gradient (lighter red/white at top, darker at bottom) plus a crisp drop shadow beneath (e.g. box-shadow: 0 4px 0 #8a0000, 0 6px 12px rgba(0,0,0,0.5)).

On hover: slight lift (translateY(-2px)) with shadow growing softly.

On active/click: button presses down (translateY(2px) or 3px), shadow collapses (0 1px 0), simulating a physical push — exactly like a real button being pressed.

Primary buttons: red gradient with white text. Secondary/outline buttons: dark steel gray with white border, same pressed-depth behavior.

Apply this same tactile treatment consistently to nav CTAs, "Book a Test Drive," "View Inventory," "Contact Us," and filter/sort buttons in the car listings.

Pages / Sections

1. Hero Section

Full-width, full-bleed dark hero with a large premium car image (or car silhouette) and dramatic lighting/red glow.

AKS logo top-left in navbar (transparent navbar over hero, becomes solid black on scroll).

Bold headline (e.g. "Sfax's Premium Auto Showroom" / "Drive Excellence") + short subtext.

Two 3D CTA buttons: "Explore Inventory" (primary, red) and "Book a Test Drive" (secondary, outlined).

2. Featured Vehicles / Inventory

Grid of car cards (image, make/model, year, price, key specs) with dark glass-panel cards, subtle red-glow border on hover, and a 3D "View Details" button on each card.

Filter bar (by brand, price range, body type, new/used) — filter chips should also have the tactile pressed-button style.

3. About Auto Kontor Sfax

Brief brand story, years of experience, trust signals (number of cars sold, brands represented, customer satisfaction), with a stat counter section (animated numbers) on a dark panel with red accents.

4. Services

Icon-based cards: Financing options, Trade-in, After-sales/Maintenance, Import/Export or Custom Orders, Warranty — each in a card with soft depth/shadow.

5. Testimonials

Customer reviews carousel with star ratings, dark cards, subtle glow.

6. Showroom / Location

Embedded map (Sfax location), address, opening hours, and a prominent "Get Directions" 3D button plus WhatsApp/Call CTA buttons (since this is common for Tunisian dealerships).

7. Contact / Footer

Contact form (name, phone, message) with dark input fields with subtle inner shadow (depth on inputs too).

Footer: logo, social links (Facebook/Instagram — common for Tunisian showrooms), quick links, address, phone, and copyright.

Additional Notes

Fully responsive, mobile-first, since many visitors will browse on phones.

Keep animations smooth and premium — avoid anything cheap-feeling or overly bouncy.

Use the red accent sparingly and intentionally (CTAs, highlights, glows) so it stays premium rather than loud.

Site language: French and/or Arabic-friendly layout consideration (Sfax, Tunisia audience) — default content in French, structured so translation/RTL could be added later.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/630ea8e2-4132-4bf2-ad1e-c25d51eefadb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
