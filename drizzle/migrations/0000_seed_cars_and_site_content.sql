INSERT INTO public.cars (slug, name, brand, country, year, price, km, km_value, fuel, gearbox, body, state, images, description, published, sort_order) VALUES
('bmw-serie-5-530i', 'Série 5 530i M Sport', 'BMW', 'Germany', 2023, 289000, '18 500 km', 18500, 'Essence', 'Auto', 'Berline', 'Occasion', ARRAY['/__l5e/assets-v1/a88cca0b-418c-421b-808e-d0ef1cc7b2c2/bmw-front.jpg','/__l5e/assets-v1/700ca50d-2773-4f2a-b067-95a2773d39c9/bmw-rear.jpg','/__l5e/assets-v1/7cacaa32-fd0a-4e58-9867-dfb01884a463/bmw-interior.jpg'], 'Berline BMW Série 5 530i M Sport, entretien complet, intérieur cuir, pack M Sport et toit ouvrant. Véhicule inspecté sur 120 points.', true, 1),
('mercedes-glc-300', 'GLC 300 4MATIC', 'Mercedes', 'Germany', 2024, 395000, '6 200 km', 6200, 'Essence', 'Auto', 'SUV', 'Neuf', ARRAY['/__l5e/assets-v1/33dbbe47-0edd-4b27-ac54-f94329615ef8/mercedes-front.jpg','/__l5e/assets-v1/804bb3b0-3c93-483c-8bb7-4ab4b7702a06/mercedes-rear.jpg','/__l5e/assets-v1/c1364996-4e64-4511-b42c-51c7b9586493/mercedes-interior.jpg'], 'SUV Mercedes-Benz GLC 300 4MATIC quasi neuf, sièges chauffants, écran MBUX et aides à la conduite complètes.', true, 2),
('toyota-gr86', 'GR86', 'Toyota', 'Japan', 2023, 215000, '12 000 km', 12000, 'Essence', 'Manuelle', 'Coupé', 'Occasion', ARRAY['/__l5e/assets-v1/7d1d1a05-1804-4934-b6c2-ed5ba6c4156c/gr86-front.jpg','/__l5e/assets-v1/d857fd77-c6dc-4585-9dc4-f8087a906222/gr86-rear.jpg','/__l5e/assets-v1/b89bd4cd-56c4-494d-aeaf-f2e8e4b68b38/gr86-interior.jpg'], 'Coupé sportif Toyota GR86 boîte manuelle, propulsion, état impeccable et historique complet.', true, 3),
('toyota-yaris-hybride', 'Yaris Hybride', 'Toyota', 'Japan', 2024, 98000, '4 500 km', 4500, 'Hybride', 'Auto', 'Citadine', 'Neuf', ARRAY['/__l5e/assets-v1/3d4ec1ad-bc5b-40e5-bbab-5fac33d55444/yaris-front.jpg','/__l5e/assets-v1/8292a7ef-da84-4e6e-ab7a-4f5964ea5e0d/yaris-rear.jpg','/__l5e/assets-v1/ce79f923-d2cc-42e8-b9e5-8cb82312ff1b/yaris-interior.jpg'], 'Citadine hybride très économique, idéale en ville, garantie constructeur encore valable.', true, 4),
('renault-austral', 'Austral', 'Renault', 'France', 2023, 165000, '22 000 km', 22000, 'Diesel', 'Auto', 'SUV', 'Occasion', ARRAY['/__l5e/assets-v1/d338b822-d09f-48dc-b1f1-60b094e23929/renault-front.jpg','/__l5e/assets-v1/019a4ab0-abb1-48cc-b90a-cf29e08d964e/renault-rear.jpg','/__l5e/assets-v1/0b4b593c-7214-482c-80ce-34299593f376/renault-interior.jpg'], 'SUV familial Renault Austral diesel, très bien entretenu, faible consommation et grand coffre.', true, 5),
('alfa-romeo-giulia-veloce', 'Giulia Veloce', 'Alfa Romeo', 'Italy', 2022, 245000, '34 000 km', 34000, 'Essence', 'Auto', 'Berline', 'Occasion', ARRAY['/__l5e/assets-v1/982aca9b-5f84-4b44-85fd-b65fad16e27f/alfa-front.jpg','/__l5e/assets-v1/dd95cfc2-5d23-4bbc-84f4-798005020e95/alfa-rear.jpg','/__l5e/assets-v1/3f73dd60-5b4a-4eef-be6a-110beee95e15/alfa-interior.jpg'], 'Berline sportive Alfa Romeo Giulia Veloce, transmission intégrale Q4, freins et pneus neufs.', true, 6)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.site_content (key, label, value) VALUES
('hero_eyebrow', 'Accueil — petite ligne au-dessus du titre', 'Sfax · Tunisie'),
('hero_title', 'Accueil — grand titre', 'Le showroom automobile'),
('hero_title_accent', 'Accueil — fin du titre (en rouge)', 'premium de Sfax'),
('hero_subtitle', 'Accueil — texte sous le titre', 'Véhicules neufs et d''occasion sélectionnés avec exigence. Financement, reprise et garantie — accompagnés par une équipe qui connaît chaque voiture qu''elle vend.'),
('inventory_title', 'Inventaire — titre', 'Véhicules en vitrine'),
('inventory_subtitle', 'Inventaire — texte', 'Chaque véhicule est inspecté sur 120 points avant d''entrer dans notre showroom.'),
('about_title', 'À propos — titre', 'Auto Kontor Sfax,'),
('about_title_accent', 'À propos — deuxième ligne du titre', 'l''exigence automobile'),
('about_p1', 'À propos — premier paragraphe', 'Depuis 2008, Auto Kontor Sfax accompagne les automobilistes de la région dans l''achat, la reprise et l''importation de véhicules haut de gamme. Notre showroom réunit berlines, SUV et sportives sélectionnés un par un.'),
('about_p2', 'À propos — deuxième paragraphe', 'Transparence sur l''historique, garantie écrite, financement négocié avec nos partenaires bancaires : nous construisons des relations durables, pas des ventes rapides.'),
('contact_title', 'Contact — titre', 'Parlons de votre projet'),
('contact_subtitle', 'Contact — texte', 'Essai, reprise ou commande spécifique — écrivez-nous, on vous répond vite.'),
('footer_tagline', 'Pied de page — description', 'Showroom automobile premium à Sfax. Vente, reprise, financement et importation de véhicules sélectionnés.'),
('contact_address', 'Coordonnées — adresse', 'Route de Tunis km 4, Sfax 3000'),
('contact_phone', 'Coordonnées — téléphone', '+216 74 000 000'),
('contact_email', 'Coordonnées — e-mail', 'contact@autokontorsfax.tn'),
('facebook_url', 'Réseaux — lien Facebook', 'https://facebook.com'),
('instagram_url', 'Réseaux — lien Instagram', 'https://instagram.com')
ON CONFLICT (key) DO NOTHING;