# لوكس 6.9 — المشاهد والحركة

- تستخدم الخلفيات لوحات خامات فوتوغرافية مولدة مخصصة، مع طبقات Canvas مستقلة للضباب والأوراق والضوء وانعكاس الماء والمطر والشفق. أضيف منجم التنين / الكهف المتوهج وأصبح خيار السماء يستخدم المحرك نفسه.
- ملف scene-atlas-v2.jpg بحجم 453504 بايت؛ لا يُطلب إلا عند تشغيل أحد المناظر الطبيعية، ويُخزن بعد أول استخدام في كاش الرسوم للعمل دون اتصال. نسخة التوليد الأصلية بقيت خارج المستودع.
- انتقالات منزلقة فعلية عبر Web Animations API، ومؤشرات تبويب تتحرك باستخدام transform، ودخول متتابع للبطاقات عند وصولها وظهورها في الشاشة، بما فيها النتائج غير المتزامنة.
- تقليل الحركة يعطل الانتقالات والحركة المستمرة. يوقف المحرك الرسم في الخلفية وأثناء القراءة. ميزانية الرسم 1.4 مليون بكسل كحد مستهدف ودقة جهاز مقيدة. الأداء الفعلي يعتمد على الجهاز والمتصفح.
- فحوصات: build، verify، verify-ux، verify-cosmic، verify-updates، verify-refresh، verify-motion، ومعاينة المتصفح.

## أصل الخامات

الأداة: built-in image_gen، دون CLI أو مفتاح API. المسار النهائي داخل المشروع: scene-atlas-v2.jpg.

موجّه التوليد: production-ready environment texture atlas, precise 3-column by 2-row grid, six equal independent photorealistic environments, edge-to-edge, no borders, no typography, no humans. Top-left volumetric sunlit blue sky; top-middle ancient forest, detailed bark, ferns, golden shafts and mist; top-right moonlit beach with real small waves, wet sand and reflected moon; bottom-left natural jagged cavern with amber/teal minerals, damp reflective floor, dust, no creatures; bottom-middle physically plausible green/violet northern aurora over arctic mountains; bottom-right rainy neon city architecture with cyan/magenta wet reflections, no readable signs. Cinematic photographic lighting and organic texture; no vector, cartoon or low-poly rendering.
