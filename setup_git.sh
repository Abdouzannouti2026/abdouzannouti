
#!/bin/bash

# 1. Initialiser Git
echo "📦 Initialisation de Git..."
git init

# 2. Ajouter tous les fichiers
echo "➕ Ajout des fichiers..."
git add .

# 3. Premier Commit
echo "💾 Création du premier commit..."
git commit -m "First commit: Zenith App Initial Release"

# 4. Renommer la branche en main
git branch -M main

# 5. Demander l'URL du repo
echo "🔗 Entrez le lien de votre repository GitHub (ex: https://github.com/votre-nom/zenith.git) :"
read REPO_URL

if [ -z "$REPO_URL" ]; then
  echo "❌ Erreur : L'URL ne peut pas être vide."
  exit 1
fi

# 6. Ajouter le remote et pousser
echo "🚀 Connexion à GitHub..."
git remote add origin "$REPO_URL"

echo "☁️ Envoi du code vers GitHub..."
git push -u origin main

echo "✅ Terminé ! Votre application est en ligne sur GitHub."
