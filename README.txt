BREATHING POINT: SITE REFRESH
=============================
Copy everything in this folder into the ROOT of your breathingpoint.in repository (keep the folders).
Allow it to replace the 7 existing pages.

PAGES (updated)            index.html, programs.html, about.html, gallery.html, yttc.html, contact.html, packages-offers.html
NEW STYLESHEET             css/refresh.css      (every page now loads it after css/style.css)
NEW IMAGES                 assets/img/care/*.svg (4 illustrations)   assets/img/shweta-vaikunthe.jpg

WHAT CHANGED
- index.html: the Care app code that had been pasted after </body> is removed (that is what made the
  home page open the Care registration screen). Care band placed right after the hero; Founder section added.
- All pages: new "Care" tab in the menu, Care link in the footer, stray <li> in the menu fixed, refreshed styling.
- yttc.html: the two loose, inline-styled "Enroll Now" links are now tidy centred buttons. They still point to two
  different places (/portal and ishwari_institute_portal.html): decide which one you want to keep.
- gallery.html: two captions that did not match their photos were corrected (Kids Yoga: Leg Split, Chair Asana: Side Stretch).
- about.html: "Meet your practitioner" is now a full Founder section with Shweta's photo and profile.

CLEAN-UP (optional but recommended)
- css/care-highlight.css is no longer used; you can delete it.
- If your repo root still contains old Care-app files (an assets/index-*.js or index-*.css, sw.js,
  manifest.webmanifest, icons/icon-192.png), delete them. They are not needed at the root.
- The Care app itself stays in the care/ folder (unchanged).

TO USE YOUR OWN AI IMAGES LATER
Replace assets/img/care/card-yoga.svg, card-physio.svg, card-family.svg, care-near-home.svg with your images
(same names, or edit the src in the pages). Card images are shown at a 5:3 ratio.
