# ARVENTAS Homepage

Static homepage (no build step), built with the scroll-site-generator frame-sequence technique: one pinned, full-screen canvas; scroll position drives which frame is drawn.

```
index.html   markup: header, chapter rail, six chapters, footer, inquiry dialog
home.css     design tokens + layout (desktop, mobile, reduced motion)
home.js      scroll timeline, video scrubbing, chapter nav, inquiry form
frames/frame_0001..0182.webp + frames.json   the film as 18 fps WebP frames, 1280 px wide (13 MB)
video/source/arventas-source.mp4   supplied original, untouched
img/still-1..6.jpg   one still per chapter (poster, load-failure fallback, reduced motion)
```

Serve locally: `python3 -m http.server 8765` in this folder.

## Timeline

All timing is in `CHAPTERS` at the top of `home.js`: video start/end in seconds, scroll length in viewport heights (`scroll`), and horizontal focus `fx` used for `object-position` on narrow screens. Total desktop scroll is 700vh plus one screen. The last chapter ends at the real video duration.

| Chapter | Video (s) | Scroll |
|---|---|---|
| 01 Überblick | 0.0 – 1.2 | 90vh |
| 02 Eigentümer | 1.2 – 3.0 | 120vh |
| 03 Objektreport | 3.0 – 4.7 | 120vh |
| 04 Investoren | 4.7 – 6.1 | 120vh |
| 05 Begleitung | 6.1 – 7.6 | 100vh |
| 06 Kontakt | 7.6 – end | 150vh |

## Frame extraction

The supplied MP4 has sparse keyframes, which makes `video.currentTime` scrubbing slow, so the page draws pre-extracted frames instead. The source is kept as is:

```
ffmpeg -i video/source/arventas-source.mp4 -vf "fps=18,scale=1280:-2" frames/f_%04d.png
# convert each PNG to frames/frame_%04d.webp (quality 74) and write frames/frames.json {"count":182,"pattern":"frames/frame_%04d.webp"}
```

The engine fetches the first frames, decodes only a window around the current frame, and fetches the rest in the background. If frames fail to load, still images per chapter are shown instead.

## Missing items / open integrations

- **Inquiry form has no backend.** Set `FORM_ENDPOINT` in `home.js` to a real URL (receives JSON via POST). Until then the form validates and then says the inquiry was **not** sent.
- **Impressum and Datenschutz**: no content or URLs supplied. They are shown in the footer as non-clickable text. Legal company details, a privacy notice and a consent line for the form still need to be supplied.
- **No contact details** (address, phone, e-mail) were supplied, so none are shown.
- **Platform watermark** ("Pippit AI") is visible in the supplied video. Website code does not remove it. A clean export is needed.
- **Website reference screen recording** was not part of the upload, so layout follows the written brief only.
- The footage is illustrative. The page states this in the footer.
- German only. The earlier DE/EN switch was not carried over.
- Claims to confirm before launch: "Persönlich geprüft", "Datenbasiert analysiert", and the personal contact person in chapter 05.
