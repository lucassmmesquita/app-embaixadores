"""
Generate Apple client_secret JWT for Supabase Apple Sign In configuration.

Usage:
  python scripts/generate_apple_jwt.py <path_to_p8_file>

The generated JWT should be pasted into Supabase → Auth → Providers → Apple → Secret Key
"""

import sys
import time
import json
import hashlib
import hmac
import base64
import struct

# ═══ YOUR APPLE CREDENTIALS ═══
TEAM_ID = "J6GQA3K2H6"
KEY_ID = "83CXB3P69S"
CLIENT_ID = "com.embaixadores.app"  # Bundle ID or Service ID

# JWT valid for 180 days (Apple max is 6 months)
EXPIRY_DAYS = 180


def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def generate_apple_client_secret(p8_path: str) -> str:
    """Generate a JWT client_secret for Apple Sign In."""

    # Read the .p8 private key
    with open(p8_path, "r") as f:
        private_key_pem = f.read().strip()

    now = int(time.time())
    exp = now + (EXPIRY_DAYS * 24 * 60 * 60)

    # JWT Header
    header = {
        "alg": "ES256",
        "kid": KEY_ID,
        "typ": "JWT",
    }

    # JWT Payload
    payload = {
        "iss": TEAM_ID,
        "iat": now,
        "exp": exp,
        "aud": "https://appleid.apple.com",
        "sub": CLIENT_ID,
    }

    # We need PyJWT with cryptography to sign with ES256
    try:
        import jwt as pyjwt

        token = pyjwt.encode(
            payload,
            private_key_pem,
            algorithm="ES256",
            headers={"kid": KEY_ID},
        )
        return token
    except ImportError:
        print("❌ PyJWT não encontrado. Instalando...")
        import subprocess
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "PyJWT[crypto]", "--quiet"],
            stdout=subprocess.DEVNULL,
        )
        import jwt as pyjwt

        token = pyjwt.encode(
            payload,
            private_key_pem,
            algorithm="ES256",
            headers={"kid": KEY_ID},
        )
        return token


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate_apple_jwt.py <path_to_p8_file>")
        print("Example: python generate_apple_jwt.py ~/Downloads/AuthKey_83CXB3P69S.p8")
        sys.exit(1)

    p8_path = sys.argv[1]
    print(f"🍎 Gerando Apple client_secret JWT...")
    print(f"   Team ID:   {TEAM_ID}")
    print(f"   Key ID:    {KEY_ID}")
    print(f"   Client ID: {CLIENT_ID}")
    print(f"   Validade:  {EXPIRY_DAYS} dias")
    print()

    jwt_token = generate_apple_client_secret(p8_path)

    print("✅ JWT gerado com sucesso!")
    print()
    print("═" * 60)
    print("Cole este valor no Supabase → Apple → Secret Key:")
    print("═" * 60)
    print()
    print(jwt_token)
    print()
    print("═" * 60)
    print()
    print(f"⚠️  Este JWT expira em {EXPIRY_DAYS} dias.")
    print("   Lembre-se de regenerar antes de expirar!")
