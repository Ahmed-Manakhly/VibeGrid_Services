#!/bin/bash
set -e

KEY_DIR="$(dirname "$0")/../secrets"
mkdir -p "$KEY_DIR"

PRIVATE_KEY="$KEY_DIR/jwt.private.key"
PUBLIC_KEY="$KEY_DIR/jwt.public.key"

if [ ! -f "$PRIVATE_KEY" ]; then
  echo "🔑 Generating RS256 Private/Public key pair for JWT signing..."
  openssl genpkey -algorithm RSA -out "$PRIVATE_KEY" -pkeyopt rsa_keygen_bits:2048
  openssl rsa -in "$PRIVATE_KEY" -pubout -out "$PUBLIC_KEY"
  chmod 600 "$PRIVATE_KEY"
  chmod 644 "$PUBLIC_KEY"
  echo "✅ Keys generated at $KEY_DIR"
else
  echo "ℹ️  JWT Keys already exist at $KEY_DIR"
fi
