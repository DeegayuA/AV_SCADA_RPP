#!/bin/bash
set -e

PROD_BRANCHES=("Prod_RUSL_Mini_Grid" "Prod_Ranna_2MW")

for BRANCH in "${PROD_BRANCHES[@]}"
do
  echo "Merging main_dev into $BRANCH..."
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
  git merge main_dev --no-edit
  git push origin "$BRANCH"
done

echo "✅ Merge completed for all production branches."