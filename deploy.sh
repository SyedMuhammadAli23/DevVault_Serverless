#!/bin/bash

echo "1. Adding all changes..."
git add .

echo "2. Committing..."
git commit -m "committed through script"

echo "3. Pushing to origin main..."
git push origin main

echo "4. Starting local server on port 8000..."
python3 -m http.server 8000