import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import User

def inspect_and_fix():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"Total users found: {len(users)}")
        fixed_count = 0
        for u in users:
            print(f"ID: {u.id}, Name: {u.name}, Email: {u.email}, is_admin: {u.is_admin}, type: {type(u.is_admin)}")
            if u.is_admin is None:
                u.is_admin = False
                fixed_count += 1
        if fixed_count > 0:
            db.commit()
            print(f"Fixed {fixed_count} users by setting is_admin = False.")
        else:
            print("No users needed fixing.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_and_fix()
