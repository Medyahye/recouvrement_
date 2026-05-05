import os
from io import BytesIO

from minio import Minio


def get_minio_client() -> Minio:
    return Minio(
        os.getenv("MINIO_ENDPOINT", "127.0.0.1:9000"),
        access_key=os.getenv("MINIO_ACCESS_KEY", "admin"),
        secret_key=os.getenv("MINIO_SECRET_KEY", "password123"),
        secure=False,
    )


def list_fab_files() -> list[str]:
    client = get_minio_client()
    bucket = os.getenv("MINIO_BUCKET", "fab-imports")
    objects = client.list_objects(bucket)
    return [
        obj.object_name
        for obj in objects
        if obj.object_name.lower().endswith((".csv", ".txt"))
    ]


def download_fab_file(object_name: str) -> BytesIO:
    client = get_minio_client()
    bucket = os.getenv("MINIO_BUCKET", "fab-imports")
    response = client.get_object(bucket, object_name)
    return BytesIO(response.read())
