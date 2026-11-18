# 7.5 — centered vertical pages and light navigation

Fixed CSS specificity: the webtoon margin:0 rule overrode image centering. Vertical reader page wrappers now occupy the full available width, and images retain automatic inline margins with no page gaps, including narrow Fit Page images.

Navigation now animates the new page with opacity and a14px slide over220ms; superseded transitions are cancelled. Buttons have160ms press feedback and active-color transitions. No page snapshots or animated images/backgrounds. Reduced motion is respected.

QA: real Azora chapter The Margrave’s 10th-Class Scoundrel, chapter1 (220 image elements). First3 loaded images had center deviation<=0.008px on desktop and390px mobile viewport. At390px the reader inner width was348px; image widths128.33/80.72/102.05px remained centered. This does not claim all220 images loaded.

Mobile navigation between Discover/catalogue/settings worked,24 home cards remained, document width375px within390px viewport, no ambient Canvas and no console errors in tested flow. Viewport override restored. Browser animation timeline inspection was unavailable in the read-only tool; rapid-click cancellation, same-tab, reduced motion and hidden-tab behavior were verified by unit tests. Actual60FPS was not measured.

Build, UX, reader sizing and motion tests passed. No library data migrations or deletions.

Mobile follow-up: moved the return-to-index button into the reader toolbar. Browser geometry confirmed no overlap with the page counter at390px; CSS position is static within the sticky toolbar.
