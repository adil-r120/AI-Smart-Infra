from fastapi.testclient import TestClient
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from main import app

client = TestClient(app)

print("--- Testing /reports ---")
r = client.get("/reports")
print(f"Status: {r.status_code}")

print("\n--- Testing /admin/stats ---")
try:
    r = client.get("/admin/stats")
    print(f"Status: {r.status_code}")
    if r.status_code == 500:
        print(f"Error detail: {r.text}")
except Exception as e:
    print(f"Crashed during request: {e}")

print("\n--- Testing /work-orders ---")
try:
    r = client.get("/work-orders")
    print(f"Status: {r.status_code}")
except Exception as e:
    print(f"Crashed during request: {e}")
