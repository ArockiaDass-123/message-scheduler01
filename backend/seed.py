from app.database import SessionLocal, engine, Base
from app import models
from app.security import get_password_hash

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == "admin@scheduler.local").first()
        if not user:
            user = models.User(
                email="admin@scheduler.local",
                hashed_password=get_password_hash("admin123"),
                full_name="Principal / Administrator",
                timezone="Asia/Kolkata",
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            # Create default recipients
            recipients = [
                models.Recipient(user_id=user.id, name="Arockiadass", email="arockiadass123@gmail.com", whatsapp="+919876543210"),
                models.Recipient(user_id=user.id, name="Kumar Sanu", email="kumar@gmail.com", whatsapp="+919876543211"),
                models.Recipient(user_id=user.id, name="Priya Patel", email="priya@gmail.com", whatsapp="+919876543212"),
                models.Recipient(user_id=user.id, name="Sunita Rao", email="sunita@gmail.com", whatsapp="+919876543213"),
            ]
            db.add_all(recipients)
            db.commit()

            # Create default workspace: Monthly Teacher Student Update
            ws1 = models.Workspace(
                user_id=user.id,
                name="Monthly Teacher Student Update",
                description="Monthly review for teachers on student progress, syllabus completion, and attendance.",
                subject="Monthly Student Update - {{month}}",
                message="Dear {{teacher_name}},\n\nPlease send me the monthly update for your students.\n\nPlease include:\n1. What topics were completed this month?\n2. How many students attended?\n3. What activities were conducted?\n4. Which students need additional attention?\n5. Any important issues or updates?\n\nPlease send the details by the requested date.\n\nThank you.",
                send_email=True,
                send_whatsapp=False,
                active=True
            )
            db.add(ws1)

            ws2 = models.Workspace(
                user_id=user.id,
                name="Quarterly Parent Feedback",
                description="Quarterly outreach to gather feedback on curriculum and academic performance.",
                subject="Quarterly Academic Feedback - {{month}}",
                message="Dear {{recipient_name}},\n\nWe would appreciate your valuable feedback regarding student academic progress this quarter.\n\nPlease reply with your suggestions and observations.\n\nWarm regards,\nAcademic Administration",
                send_email=True,
                send_whatsapp=False,
                active=True
            )
            db.add(ws2)
            db.commit()
            db.refresh(ws1)
            db.refresh(ws2)

            for r in recipients:
                db.add(models.WorkspaceRecipient(workspace_id=ws1.id, recipient_id=r.id, is_selected=True))
                db.add(models.WorkspaceRecipient(workspace_id=ws2.id, recipient_id=r.id, is_selected=True))
            db.commit()

            print("Database initialized with default administrator, workspaces, and recipients!")
        else:
            print("Database already contains user.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
