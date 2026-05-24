from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
import os
import sys
from datetime import datetime

# Adjust path to import from backend/
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from database import SessionLocal
    from models import Detection, Report, User, WorkOrder
    
    db = SessionLocal()
    print("Testing get_admin_stats logic...")
    
    total_detections = db.query(func.count(Detection.id)).scalar() or 0
    print(f"Total Detections: {total_detections}")
    
    total_reports = db.query(func.count(Report.id)).scalar() or 0
    print(f"Total Reports: {total_reports}")
    
    total_users = db.query(func.count(User.id)).scalar() or 0
    print(f"Total Users: {total_users}")
    
    total_work_orders = db.query(func.count(WorkOrder.id)).scalar() or 0
    print(f"Total Work Orders: {total_work_orders}")
    
    pending_reports = db.query(func.count(Report.id)).filter(Report.status == "Pending").scalar() or 0
    print(f"Pending: {pending_reports}")
    
    today = datetime.now().date()
    # Testing func.date logic
    today_reports = db.query(func.count(Report.id)).filter(func.date(Report.timestamp) == today).scalar() or 0
    print(f"Today Reports: {today_reports}")
    
    print("SUCCESS: Logic is sound.")
    db.close()
    
except Exception as e:
    print(f"CRASH DETECTED: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
