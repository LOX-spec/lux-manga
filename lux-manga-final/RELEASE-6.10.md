# LUX LIBRARY 6.10

## التصحيح البصري والحركي

أُبدلت الخامات الفوتوغرافية بستة مشاهد فنية Stylized 3D: السماء والغابة والشاطئ ومنجم التنين والشفق ومدينة النيون. الملف النهائي scene-atlas-v3.jpg بحجم 615595 بايت. يتحرك فوقها ضباب وأوراق وضوء وماء وشفق ووهج، مع استمرار إيقاف الرسم أثناء القراءة أو إخفاء التطبيق. لا يُحمّل ملف الخامات إلا عند اختيار المشهد؛ يُخزّن محلياً بعد أول استخدام.

سبب غياب الحركة الذي تحققنا منه: متصفح الاختبار كان يبلغ prefers-reduced-motion: reduce. أضيف اختيار صريح في إعدادات المظهر: حسب الجهاز / حركة كاملة / تقليل الحركة. اختيار حركة كاملة يحفظ الموافقة محليًا في lux.motion.mode ويتجاوز طلب الجهاز لتقليل الحركة في محرك الرسم وCSS والتنقل معاً. الافتراضي يحترم إعداد الجهاز.

التنقل يستخدم لقطة DOM مؤقتة خاملة وغير تفاعلية للمحتوى السابق، وانزلاق دخول للمحتوى الجديد لمدة 560ms ومسافة تصل إلى 144px. تُزال الطبقة بعد الانتهاء أو الإلغاء. تظهر البطاقات بتتابع 65ms، وتتحرك مؤشرات التبويبات بين مواضعها عبر transform. أضيفت تبويبات أنواع مستقلة داخل المكتبة، مع إبقاء ربط الفصول كما هو.

اختبارات verify-motion تتحقق من وجود حركتي الدخول والخروج، وتنظيف اللقطة، وخمولها، وعدم تكرار دخول البطاقة، وتأخيرات التتابع، واختيار الحركة الكاملة تحت جهاز يطلب تقليلها، وحفظ التفضيل. بقية الفحوصات تشمل المصادر والقارئ والنسخ الاحتياطية والتثبيت. الأداء مرتبط بالجهاز والمتصفح ولا يوجد ضمان شامل لمعدل إطار ثابت.

## أصل الخامات وموجّه التوليد

استُخدمت أداة built-in image_gen دون CLI أو API key. الناتج الأصلي محفوظ في generated_images خارج المستودع، والنسخة النهائية داخل المشروع scene-atlas-v3.jpg.

Prompt: Production asset, one exquisite 3-column by 2-row atlas, six perfectly equal square panels, edge-to-edge, no borders, labels, text or UI. Premium STYLIZED 3D ILLUSTRATED environments for an elegant fantasy reading app; visibly painterly art-directed 3D, not photography or crude low-poly. Rich sculpted organic shapes, sophisticated rounded geometry, layered depth, beautiful volumetric light, soft global illumination and tactile materials. Top-left dreamy sky with sculpted fluffy clouds and floating islands; top-middle lush enchanted forest with sculpted trunks, ferns, golden leaves, warm sunbeams and turquoise mist; top-right tranquil moonlit beach with rounded coastal rocks, turquoise foam and crescent moon; bottom-left dragon mine with cave arches, amber/teal crystals and illuminated stream, no creatures; bottom-middle arctic mountains and green/violet aurora curtains above a reflective lake; bottom-right cozy neon fantasy city with detailed architecture, cyan/magenta lights and wet reflections. Cohesive upscale art direction with restful dark areas, no people.
