from sqlalchemy import create_engine, MetaData, Table, insert, select, delete, update
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import and_
import os

load_dotenv()

db_config = {
    'user': os.getenv("DB_USER"),
    'password': os.getenv("DB_PASSWORD"),
    'host': os.getenv("DB_HOST"),
    'database': os.getenv("DB_DATABASE")
}

DATABASE_URL = f"mysql+mysqlconnector://{db_config['user']}:{db_config['password']}@{db_config['host']}/{db_config['database']}"

engine = create_engine(DATABASE_URL, echo=False)
metadata = MetaData()
hash_method = os.getenv("PASSWORD_HASH_METHOD")

users_table = Table("users", metadata, autoload_with=engine)
instruments_table = Table("instruments", metadata, autoload_with=engine)
user_instruments_table = Table("user_instruments", metadata, autoload_with=engine)

friends_table = Table("friends", metadata, autoload_with=engine)

def get_session():
    return Session(engine)


# Return all available instruments for signup and profile selection.
def get_instruments():
    with get_session() as session:
        return session.execute(
            select(instruments_table).order_by(instruments_table.c.instrument_id)
        ).mappings().all()


# Let API routes distinguish invalid selections from database failures.
class InstrumentSelectionError(ValueError):
    pass


# Require a nonempty list of unique, valid instrument IDs that exist in the database.
def validate_instrument_ids(session, instrument_ids):
    if not isinstance(instrument_ids, list) or not instrument_ids:
        raise InstrumentSelectionError("Select at least one instrument")
    if any(type(value) is not int or not 0 < value < 2**64 for value in instrument_ids):
        raise InstrumentSelectionError("instrument_ids must contain positive integer IDs")
    if len(set(instrument_ids)) != len(instrument_ids):
        raise InstrumentSelectionError("Duplicate instrument IDs are not allowed")
    found = session.execute(select(instruments_table.c.instrument_id).where(
        instruments_table.c.instrument_id.in_(instrument_ids))).scalars().all()
    if set(found) != set(instrument_ids):
        raise InstrumentSelectionError("One or more selected instruments do not exist")


# Attach the user's saved instrument list to their account information.
def with_user_instruments(session, user):
    if user is None:
        return None
    query = select(instruments_table).join(
        user_instruments_table,
        instruments_table.c.instrument_id == user_instruments_table.c.instrument_id
    ).where(user_instruments_table.c.user_id == user["user_id"]).order_by(
        instruments_table.c.instrument_id)
    return {**user, "instruments": [dict(row) for row in session.execute(query).mappings()]}


# Create an account and save its selected instruments in one transaction.
def sign_up(user, password, email, instrument_ids):
    # Both the account and its memberships commit together or roll back together.
    with get_session() as session, session.begin():
        validate_instrument_ids(session, instrument_ids)
        query = insert(users_table).values(username=user, password_hash=generate_password_hash(
            password, method=hash_method), email=email)
        result = session.execute(query)
        user_id = result.inserted_primary_key[0]
        session.execute(insert(user_instruments_table), [
            {"user_id": user_id, "instrument_id": value} for value in instrument_ids
        ])
        saved_user = session.execute(select(users_table).where(
            users_table.c.user_id == user_id)).mappings().one()
        return with_user_instruments(session, saved_user)


# Replace a user's selections, preserving the old selections if saving fails.
def update_user_instruments(user_id, instrument_ids):
    with get_session() as session, session.begin():
        # Serialize simultaneous replacements for the same account.
        user = session.execute(select(users_table).where(
            users_table.c.user_id == user_id).with_for_update()).mappings().first()
        if user is None:
            return None
        validate_instrument_ids(session, instrument_ids)
        session.execute(delete(user_instruments_table).where(
            user_instruments_table.c.user_id == user_id))
        session.execute(insert(user_instruments_table), [
            {"user_id": user_id, "instrument_id": value} for value in instrument_ids
        ])
        return with_user_instruments(session, user)


def get_user(user, password):
    session = get_session()
    try:
        query = select(users_table).where(users_table.c.username == user)
        result = session.execute(query).mappings().fetchone()
        if not result:
            return None
        if not check_password_hash(result["password_hash"], password):
            return None
        return with_user_instruments(session, result)
    finally:
        session.close()


def get_user_by_id(user_id):
    session = get_session()
    try:
        query = select(users_table).where(users_table.c.user_id == user_id)
        result = session.execute(query).mappings().fetchone()
        return with_user_instruments(session, result)
    finally:
        session.close()


def delete_user(user_id, password):
    session = get_session()
    try:
        select_query = select(users_table).where(
            users_table.c.user_id == user_id)
        user = session.execute(select_query).mappings().fetchone()

        if not user:
            return False
        if not check_password_hash(user["password_hash"], password):
            return False

        delete_query = delete(users_table).where(
            users_table.c.user_id == user["user_id"])
        result = session.execute(delete_query)
        session.commit()
        return result.rowcount > 0
    finally:
        session.close()


def update_username(user_id, new_user):
    session = get_session()
    try:
        query = update(users_table).where(
            users_table.c.user_id == user_id).values(username=new_user)
        result = session.execute(query)
        if result.rowcount == 0:
            session.rollback()
            return "user_not_found"
        session.commit()
        return "success"
    except IntegrityError:
        session.rollback()
        return "new_username_exists"
    finally:
        session.close()


def update_password(user_id, old_password, new_password):
    session = get_session()
    try:
        select_query = select(users_table).where(
            users_table.c.user_id == user_id)
        user = session.execute(select_query).mappings().fetchone()

        if not user:
            return False
        if not check_password_hash(user["password_hash"], old_password):
            return False

        update_query = update(users_table).where(users_table.c.user_id == user["user_id"]).values(
            password_hash=generate_password_hash(new_password, method=hash_method))
        result = session.execute(update_query)
        session.commit()
        return result.rowcount > 0
    except Exception:
        session.rollback()
        return False
    finally:
        session.close()


def get_all_users():
    session = get_session()
    try:
        query = select(users_table)
        result = session.execute(query).mappings().all()
        return result
    except Exception as e:
        return []
    finally:
        session.close()
