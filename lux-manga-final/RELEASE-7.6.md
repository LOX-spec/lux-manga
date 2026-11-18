# 7.6 — vertical210%

Vertical reader defaults to210% of Fit Page sizing, with a width cap at the available viewport so wide pages are never cut off. The indicator shows the requested zoom; effective enlargement is capped for images that would overflow. RTL and vertical zoom/fit preferences are stored separately; existing legacy preferences remain the RTL fallback. Users can still change zoom and fit.

QA: real chapter Kneel, Your Grace! chapter1,95 image elements. At390px viewport, first4 loaded images measured270.81/258.08/285.86/344px within348px wrappers; center error<=0.008px, no horizontal overflow in those samples. No console errors in this flow. Screenshot saved. Not every page/chapter/device was tested.

Geometry tests verify uncapped210% can exceed viewport and capped sizing remains within it. Build and UX checks passed.
