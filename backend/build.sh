#!/usr/bin/env bash
# exit on error
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt
pip install email-validator pydantic-settings

# Seed database and train ML model
python scripts/seed.py
python app/ml/train.py
