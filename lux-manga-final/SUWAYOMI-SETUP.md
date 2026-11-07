# محرك المصادر في لوكس 5.0

تم تجهيز موصل GraphQL يدعم قائمة المصادر، البحث، الأكثر شعبية، الأحدث، تفاصيل العمل وفصوله وجميع صور الفصل. تمر الصور والمصادقة عبر API لوكس؛ لا تُرسل بيانات المصادقة إلى المتصفح. لا يشغل المتصفح إضافات APK مباشرة.

## الحالة الحالية

تم تشغيل الخادم على Railway وربط بيانات اتصاله السرية ببيئة الإنتاج في Vercel. يحتوي على تخزين دائم 500 ميغابايت، وإضافات Azora وHijala ومانجا أون لاين. نجح اختبار Azora للأعمال والفصول والصور؛ تعثر اختبار فهرسي المصدرين الآخرين، ولا يضمن المحرك تجاوز حظر المصادر. يمكن متابعة الخادم من https://railway.com/project/b1cfe9d9-7f57-4c09-8173-a250ddb663e6 . لا تُخزن كلمات المرور في هذا المستودع.

## تشغيل خادم للاختبار

1. ثبّت Docker Desktop من موقعه الرسمي إن لم يكن مثبتًا.
2. اضبط متغيري البيئة `SUWAYOMI_USERNAME` و`SUWAYOMI_PASSWORD` بقيم خاصة بك في جلسة الطرفية. لا تضعهما في المستودع.
3. من جذر المشروع شغّل:

```powershell
docker compose -f deploy/suwayomi.compose.yml up -d
```

4. افتح `http://localhost:4567` وسجّل الدخول، ثم ثبّت المصادر العربية التي تريدها من متجر الإضافات في واجهة Suwayomi. ملف Compose يستخدم صورة preview الرسمية المتوافقة مع واجهة GraphQL الحالية؛ اختبر تحديثاتها قبل اعتمادها للإنتاج.
5. لتجربة لوكس محليًا، اضبط `SUWAYOMI_URL=http://127.0.0.1:4567` و`SUWAYOMI_AUTH` بترويسة Basic الكاملة المقابلة لبيانات الخادم، ثم شغّل `node scripts/build.mjs` و`node scripts/preview.mjs` في الجلسة نفسها. افتح قسم المانجا واختر Suwayomi من «محرك المكتبة» ثم اختر أحد المصادر المثبتة.

## الربط من Vercel

الخادم يجب أن يستمر بالعمل مع تخزين دائم مستقل. ملف Compose يربط المنفذ محليًا فقط. وفّر له عنوان HTTPS عبر بوابة محمية بالمصادقة على الاستضافة التي تختارها، ثم أضف متغيري البيئة التاليين في Vercel وأعد النشر:

- `SUWAYOMI_URL`: عنوان HTTPS للخادم، مثل `https://reader.example.com`، دون مسار أو بيانات دخول في الرابط.
- `SUWAYOMI_AUTH`: ترويسة Authorization الكاملة، من النوع Secret في Vercel. لمصادقة Basic تكون `Basic ` متبوعة بقيمة Base64 لاسم المستخدم وكلمة المرور. لا تستخدم متغيرًا عامًا أو `NEXT_PUBLIC_` لهذا السر.

لا تستخدم localhost في إعداد Vercel؛ يشير حينها إلى بيئة الوظيفة وليس جهازك. لا حاجة لتفعيل CORS عام على الخادم لأن الاتصال يتم من API لوكس.

## الاختبارات الضرورية

```powershell
node scripts/build.mjs
node scripts/verify.mjs
node scripts/verify-languages.mjs
node scripts/verify-engine.mjs
```

اختبار المحرك يستخدم استجابات GraphQL محلية مضبوطة للتأكد من منطق الربط والحجب وترتيب الصفحات. الاختبار الحي للمصادر العربية يتطلب خادمًا متصلًا ومصادر مثبتة، وقد نُفّذ اختبار حي عبر Azora بنجاح بعد ربط خادم Railway.

المراجع: [Suwayomi](https://github.com/Suwayomi/Suwayomi-Server)، [صورة Docker الرسمية](https://github.com/Suwayomi/Suwayomi-Server-docker)، [Keiyoushi](https://keiyoushi.github.io/docs/guides/getting-started).
