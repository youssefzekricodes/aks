/** Arabic (Tunisian) for accounts, security, sign-in and connectors. */
// E-mails, phone numbers and other Latin values sit between LRI (⁦) and PDI
// (⁩) so they read left to right inside the Arabic sentence.
const ar: Record<string, string> = {
  /* ───────── Administrateurs ───────── */
  Administrateurs: "المسؤولين",
  Administrateur: "مسؤول",
  "Comptes ayant accès à cette administration. Seuls les super administrateurs voient cette page.":
    "الحسابات اللي عندها دخول للإدارة هاذي. كان المسؤولين الرئيسيين يشوفو الصفحة هاذي.",
  "Ajouter un administrateur": "زيد مسؤول",
  "Impossible de charger les administrateurs.": "ما نجّمناش نحمّلو المسؤولين.",
  Vous: "إنت",
  "Dernière connexion : {date}": "آخر دخول: {date}",
  "Dernière connexion": "آخر دخول",
  jamais: "عمرو",
  Jamais: "عمرو",
  "Actions pour {email}": "الإجراءات متاع ⁦{email}⁩",
  Rôle: "الدور",
  "Double authentification": "التحقق بخطوتين",
  Actions: "الإجراءات",
  "Aucun administrateur.": "حتى مسؤول.",
  "Ajoutez un compte pour donner accès à l’administration.": "زيد حساب باش تعطي دخول للإدارة.",
  "Réinitialiser le mot de passe": "بدّل كلمة السر",
  "Passer administrateur": "رجّعو مسؤول",
  "Passer super administrateur": "رجّعو مسؤول رئيسي",
  Supprimer: "فسّخ",
  "{email} est maintenant {role}.": "⁦{email}⁩ ولّى توّا {role}.",
  "Le compte {email} a été supprimé.": "الحساب ⁦{email}⁩ تفسّخ.",
  "Retirer les droits de super administrateur ?": "تنحّي صلاحيات المسؤول الرئيسي؟",
  "Donner les droits de super administrateur ?": "تعطي صلاحيات المسؤول الرئيسي؟",
  "{email} ne pourra plus gérer les administrateurs.":
    "⁦{email}⁩ ما عادش باش ينجّم يتصرّف في المسؤولين.",
  "{email} pourra gérer les administrateurs et devra configurer la double authentification à sa prochaine connexion.":
    "⁦{email}⁩ باش ينجّم يتصرّف في المسؤولين، ولازمو يفعّل التحقق بخطوتين في الدخول الجاي.",
  "Ce compte": "الحساب هذا",
  "ce compte": "الحساب هذا",
  "Supprimer {email} ?": "تفسّخ ⁦{email}⁩؟",
  "Supprimer le compte": "فسّخ الحساب",
  "Ce compte perdra immédiatement l’accès à l’administration. Cette action est définitive.":
    "الحساب هذا باش يخسر الدخول للإدارة طول. العملية هاذي ما فيهاش رجوع.",
  "Catalogue, contenu du site et demandes.": "الكاتالوغ، محتوى السيت والطلبات.",
  "Tout ce que fait un administrateur, plus la gestion des administrateurs. Double authentification obligatoire.":
    "كل شي يعملو المسؤول، وزيد التصرّف في المسؤولين. التحقق بخطوتين إجباري.",

  /* ───────── Modals ───────── */
  Fermer: "سكّر",
  Annuler: "بطّل",
  "Compte {email} créé.": "الحساب ⁦{email}⁩ تعمل.",
  "Le compte peut se connecter immédiatement avec ce mot de passe.":
    "الحساب ينجّم يدخل طول بكلمة السر هاذي.",
  "Créer le compte": "اعمل الحساب",
  "Création…": "قاعد يتعمل…",
  "E-mail": "الإيميل",
  "Saisissez une adresse e-mail valide.": "اكتب إيميل صحيح.",
  "Mot de passe de {email} réinitialisé.": "كلمة السر متاع ⁦{email}⁩ تبدّلت.",
  "l’administrateur": "المسؤول",
  "Enregistrer le mot de passe": "سجّل كلمة السر",
  "Enregistrement…": "قاعد يتسجّل…",
  "Vous serez déconnecté de tous vos appareils, y compris celui-ci.":
    "باش تخرج من الأجهزة الكل متاعك، حتى من هذا.",
  "L’administrateur sera déconnecté de tous ses appareils.":
    "المسؤول باش يخرج من الأجهزة الكل متاعو.",
  "Nouveau mot de passe": "كلمة السر الجديدة",

  /* ───────── Ma sécurité ───────── */
  "Ma sécurité": "الأمان متاعي",
  "À chaque connexion, un code à 6 chiffres est envoyé à votre adresse e-mail après le mot de passe.":
    "في كل دخول، بعد كلمة السر يوصلك كود بـ6 أرقام على الإيميل متاعك.",
  "Ajouter une méthode": "زيد طريقة",
  "Non requise": "موش لازمة",
  "Méthode retirée.": "الطريقة تنحّات.",
  "Toujours active": "ديما مفعّلة",
  Retirer: "نحّي",
  "Aucune méthode configurée.": "حتى طريقة موش مفعّلة.",
  "Ajoutez une application d’authentification ou un numéro de téléphone.":
    "زيد تطبيقة تحقق ولا نومرو تليفون.",
  "Méthode de double authentification ajoutée.": "طريقة التحقق بخطوتين تزادت.",
  "Retirer cette méthode ?": "تنحّي الطريقة هاذي؟",
  "{method} ({label}) ne permettra plus de valider vos connexions.":
    "{method} (⁦{label}⁩) ما عادش باش تنجّم تثبّت بيها الدخول متاعك.",
  "Code par e-mail": "كود بالإيميل",
  "Application d’authentification": "تطبيقة التحقق",
  SMS: "SMS",

  /* ───────── Double authentification (mfa) ───────── */
  Retour: "ارجع",
  "Un code vous a été envoyé il y a moins d’une minute : utilisez celui du dernier e-mail reçu.":
    "تبعثلك كود من أقل من دقيقة: استعمل اللي في آخر إيميل وصلك.",
  "Envoi du code impossible.": "ما نجّمناش نبعثو الكود.",
  "Un code vous a déjà été envoyé : utilisez celui du dernier e-mail reçu.":
    "تبعثلك كود قبل: استعمل اللي في آخر إيميل وصلك.",
  "Demandez d’abord l’envoi d’un code.": "اطلب الكود قبل.",
  "Vérification impossible.": "ما نجّمناش نثبّتو.",
  "Code de vérification": "كود التحقق",
  "Envoi du code par e-mail à {destination}…": "قاعد نبعثو الكود بالإيميل لـ ⁦{destination}⁩…",
  "Envoi du code au {destination}…": "قاعد نبعثو الكود لـ ⁦{destination}⁩…",
  "Code envoyé par e-mail à {destination}. Seul le dernier code reçu est valable.":
    "الكود تبعث بالإيميل لـ ⁦{destination}⁩. كان آخر كود وصلك هو اللي صالح.",
  "Code envoyé au {destination}.": "الكود تبعث لـ ⁦{destination}⁩.",
  "Le code sera envoyé par e-mail à {destination}.": "الكود باش يتبعث بالإيميل لـ ⁦{destination}⁩.",
  "Le code sera envoyé par SMS au {destination}.": "الكود باش يتبعث بـ SMS لـ ⁦{destination}⁩.",
  "Saisissez le code à 6 chiffres affiché dans votre application d’authentification.":
    "اكتب الكود اللي فيه 6 أرقام اللي ظاهر في تطبيقة التحقق متاعك.",
  "Pas reçu ?": "ما وصلكش؟",
  "Renvoyer le code ({seconds} s)": "عاود ابعث الكود ({seconds} ث)",
  "Renvoyer le code": "عاود ابعث الكود",
  "Vérification…": "قاعد نثبّتو…",
  Vérifier: "ثبّت",
  "Aucune méthode de double authentification trouvée.": "ما لقينا حتى طريقة تحقق بخطوتين.",
  "Méthode de vérification": "طريقة التحقق",
  Continuer: "كمّل",
  "Utiliser une autre méthode": "استعمل طريقة أخرى",
  "Activation impossible.": "ما نجّمناش نفعّلو.",
  "Étape obligatoire": "خطوة إجبارية",
  "La double authentification est obligatoire pour les super administrateurs. Configurez une méthode pour accéder à l’administration.":
    "التحقق بخطوتين إجباري للمسؤولين الرئيسيين. فعّل طريقة باش تدخل للإدارة.",
  Méthode: "الطريقة",
  "Application d’authentification (recommandé)": "تطبيقة التحقق (ننصحو بيها)",
  "Google Authenticator, Microsoft Authenticator, 1Password… Fonctionne hors ligne.":
    "Google Authenticator، Microsoft Authenticator، 1Password… تخدم بلا إنترنت.",
  "Un code est envoyé sur votre téléphone à chaque connexion.":
    "في كل دخول يوصلك كود على التليفون متاعك.",
  "Préparation du QR code…": "قاعد نحضّرو الـ QR code…",
  "Ouvrez votre application d’authentification.": "حلّ تطبيقة التحقق متاعك.",
  "Scannez le QR code ou saisissez la clé.": "سكاني الـ QR code ولا اكتب المفتاح.",
  "Entrez le code à 6 chiffres affiché.": "اكتب الكود اللي فيه 6 أرقام اللي ظاهر.",
  "QR code à scanner avec votre application d’authentification":
    "QR code تسكانيه بتطبيقة التحقق متاعك",
  "Clé de configuration": "مفتاح الإعداد",
  "Copier la clé": "انسخ المفتاح",
  Réessayer: "عاود جرّب",
  "Numéro de téléphone": "نومرو التليفون",
  "Format international, par exemple +216 52 144 869.": "بالصيغة الدولية، مثلاً ⁦+216 52 144 869⁩.",
  "Numéro invalide : indicatif du pays puis le numéro, par exemple +216 52 144 869.":
    "النومرو موش صحيح: مفتاح البلاد ومن بعد النومرو، مثلاً ⁦+216 52 144 869⁩.",
  "Envoi…": "قاعد يبعث…",
  "Envoyer le code": "ابعث الكود",

  /* ───────── Mot de passe ───────── */
  "Copié dans le presse-papiers.": "تنسخ.",
  "Copie impossible. Sélectionnez le texte puis copiez-le.":
    "ما نجّمناش ننسخو. اختار النص ومن بعد انسخو.",
  "Masquer le mot de passe": "خبّي كلمة السر",
  "Afficher le mot de passe": "ورّي كلمة السر",
  "{max} caractères maximum.": "{max} حرف على الأكثر.",
  "{min} caractères minimum.": "{min} حرف على الأقل.",
  "Les deux mots de passe ne correspondent pas.": "كلمتين السر موش كيف كيف.",
  "Mot de passe": "كلمة السر",
  "Copier le mot de passe": "انسخ كلمة السر",
  "{count} sur {min} minimum": "{count} من {min} على الأقل",
  caractère: "حرف",
  caractères: "حروف",
  "{min} caractères minimum. Mélangez lettres, chiffres et symboles.":
    "{min} حرف على الأقل. خلّط حروف وأرقام ورموز.",
  "Confirmation du mot de passe": "أكّد كلمة السر",
  "Générer un mot de passe": "اعمل كلمة سر",
  "Transmettez-le par un canal sûr ; il ne sera plus affiché après validation.":
    "ابعثها بطريقة مضمونة؛ ما عادش باش تظهر بعد التسجيل.",
  "Trop court": "قصيرة برشا",
  Faible: "ضعيفة",
  Correct: "مقبولة",
  Robuste: "قوية",

  /* ───────── Ma photo ───────── */
  "Ma photo": "تصويرتي",
  "Affichée dans l’administration, à côté de votre compte.": "تظهر في الإدارة، حذا الحساب متاعك.",
  "Changer la photo": "بدّل التصويرة",
  "Choisir une photo": "اختار تصويرة",
  "Photo de profil enregistrée.": "تصويرة البروفيل تسجّلت.",
  "Envoi de la photo impossible.": "ما نجّمناش نبعثو التصويرة.",
  "Photo de profil retirée.": "تصويرة البروفيل تنحّات.",
  "Suppression impossible.": "ما نجّمناش نفسّخو.",

  /* ───────── Connecteurs ───────── */
  Connecteurs: "الربط",
  "Reliez la Page Facebook et le compte Instagram du showroom : chaque véhicule publié peut alors y être partagé automatiquement, avec ses photos.":
    "اربط صفحة فيسبوك وحساب إنستغرام متاع الشوروم: كل كرهبة تتنشر تنجّم تتشارك غادي وحدها، بتصاورها.",
  "Connexion impossible": "الربط ما نجحش",
  "Connexion à Facebook en cours…": "قاعد نربطو بفيسبوك…",
  "ID d’app Meta incorrect": "الـ ID متاع تطبيقة Meta موش صحيح",
  "Le secret META_APP_ID configuré dans Supabase (« {appId} ») n’est pas un ID d’app Meta. Copiez l’« ID de l’app » (un nombre d’environ 16 chiffres) depuis developers.facebook.com → votre app → Paramètres de l’app → Général, puis remplacez le secret dans Supabase → Edge Functions → Secrets.":
    "الـ secret META_APP_ID المسجّل في Supabase («⁦{appId}⁩») موش ID متاع تطبيقة Meta. انسخ «ID de l’app» (نومرو فيه قريب 16 رقم) من developers.facebook.com ← التطبيقة متاعك ← Paramètres de l’app ← Général، ومن بعد بدّل الـ secret في Supabase ← Edge Functions ← Secrets.",
  vide: "فارغ",
  "Service de publication indisponible": "خدمة النشر موش متوفرة",
  "La publication sur Facebook et Instagram n’est pas encore installée sur ce site. Contactez la personne qui gère le site.":
    "النشر على فيسبوك وإنستغرام مازال موش مركّب في السيت هذا. كلّم الشخص اللي يتصرّف في السيت.",
  "Page Facebook du showroom": "صفحة فيسبوك متاع الشوروم",
  "Changer de Page": "بدّل الصفحة",
  Déconnecter: "فك الربط",
  "Le connecteur Meta n’est pas encore configuré pour ce site : contactez la personne qui gère le site.":
    "الربط مع Meta مازال موش مضبوط في السيت هذا: كلّم الشخص اللي يتصرّف في السيت.",
  "Compte professionnel lié à la Page": "حساب محترف مربوط بالصفحة",
  "Compte Instagram": "حساب إنستغرام",
  "Connecté avec la Page Facebook. Pour en changer, changez de Page ou liez un autre compte à la Page, puis reconnectez.":
    "مربوط مع صفحة فيسبوك. باش تبدّلو، بدّل الصفحة ولا اربط حساب آخر بالصفحة، ومن بعد عاود اربط.",
  "Aucun compte Instagram professionnel n’est lié à la Page « {name} ». Liez-le depuis la Page (Paramètres → Comptes liés → Instagram), puis reconnectez.":
    "حتى حساب إنستغرام محترف موش مربوط بالصفحة «{name}». اربطو من الصفحة (Paramètres ← Comptes liés ← Instagram)، ومن بعد عاود اربط.",
  Reconnecter: "عاود اربط",
  "Se connecte automatiquement avec la Page Facebook, si un compte Instagram professionnel y est lié.":
    "يتربط وحدو مع صفحة فيسبوك، كان فما حساب إنستغرام محترف مربوط بيها.",
  "App Meta utilisée :": "تطبيقة Meta المستعملة:",
  "Elle doit être identique à l’« ID de l’app » affiché sur developers.facebook.com (Paramètres de l’app → Général).":
    "لازم تكون كيف «ID de l’app» اللي ظاهر في developers.facebook.com (Paramètres de l’app ← Général).",
  "Choisissez la Page du showroom": "اختار صفحة الشوروم",
  "Les véhicules seront publiés sur cette Page et sur son compte Instagram.":
    "الكراهب باش يتنشرو على الصفحة هاذي وعلى حساب الإنستغرام متاعها.",
  "compte lié": "حساب مربوط",
  "Pas de compte Instagram lié": "ما فماش حساب إنستغرام مربوط",
  "Déconnecter Facebook et Instagram ?": "تفك الربط مع فيسبوك وإنستغرام؟",
  "Les véhicules ne seront plus partagés. Les publications déjà faites restent en ligne.":
    "الكراهب ما عادش باش يتشاركو. المنشورات اللي تعملت تقعد موجودة.",
  Vérification: "قاعد نثبّتو",
  Connecté: "مربوط",
  "Non connecté": "موش مربوط",
  "Se connecter avec Facebook": "اربط بفيسبوك",
  "Facebook et Instagram (@{username}) connectés.": "فيسبوك وإنستغرام (⁦@{username}⁩) تربطو.",
  "Facebook et Instagram connectés.": "فيسبوك وإنستغرام تربطو.",
  "Page Facebook connectée. Aucun compte Instagram professionnel n’est lié à cette Page.":
    "صفحة فيسبوك تربطت. حتى حساب إنستغرام محترف موش مربوط بالصفحة هاذي.",
  "Facebook et Instagram déconnectés.": "الربط مع فيسبوك وإنستغرام تفك.",

  /* ───────── Connexion (/auth) ───────── */
  "Connexion réussie": "دخلت بنجاح",
  "Connexion impossible.": "ما نجّمناش ندخلوك.",
  "Déconnexion impossible. Veuillez réessayer.": "ما نجّمناش نخرجوك. عاود جرّب.",
  "Auto Kontor Sfax — retour au site": "Auto Kontor Sfax — ارجع للسيت",
  "Auto Kontor Sfax · Administration": "Auto Kontor Sfax · الإدارة",
  Connexion: "الدخول",
  "Connectez-vous avec votre compte administrateur.": "ادخل بحساب المسؤول متاعك.",
  "Connexion…": "قاعد يدخل…",
  "Se connecter": "ادخل",
  "Confirmez votre identité avec votre deuxième méthode de connexion.":
    "ثبّت هويتك بالطريقة الثانية متاع الدخول.",
  "Configurez une deuxième méthode de connexion pour protéger votre compte.":
    "فعّل طريقة دخول ثانية باش تحمي الحساب متاعك.",
  "Se déconnecter": "اخرج",
  "Retour au site": "ارجع للسيت",
  Langue: "اللغة",
};

export default ar;
