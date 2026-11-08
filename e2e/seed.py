"""Provision generated test accounts through existing authorized backend services."""

import json
import os
import secrets
from pathlib import Path

from atelier_api.customers.models import Customer
from atelier_api.database import engine
from atelier_api.users.authentication import UserIdentity
from atelier_api.users.models import User
from atelier_api.users.roles import UserRole
from atelier_api.users.schemas import UserCreate
from atelier_api.users.service import bootstrap_admin, create_user
from sqlmodel import Session


def credentials(label):
    return {
        "email": f"{label}@artelier-e2e.example.com",
        "password": secrets.token_urlsafe(32),
    }


with Session(engine) as session:
    admin = credentials("admin")
    account = bootstrap_admin(UserCreate(**admin), session)
    user = session.get(User, account.id)
    actor = UserIdentity(user_id=user.id, auth_version=user.auth_version)
    employees = []
    for index in range(8):
        data = credentials(f"employee-{index}")
        create_user(UserCreate(**data), session, actor=actor)
        employees.append(data)
    customer = Customer(first_name="Portal", last_name="E2E")
    session.add(customer)
    session.commit()
    session.refresh(customer)
    portal = credentials("portal")
    create_user(
        UserCreate(**portal),
        session,
        actor=actor,
        role=UserRole.CUSTOMER,
        customer_id=customer.id,
    )
    Path(os.environ["E2E_ACCOUNTS"]).write_text(
        json.dumps({"admin": admin, "employees": employees, "portal": portal})
    )
