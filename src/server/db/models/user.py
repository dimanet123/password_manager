from tortoise import fields
from tortoise.models import Model
from tortoise.contrib.pydantic import pydantic_model_creator

class User(Model):
    email = fields.TextField(pk=True)
    salt = fields.TextField()
    edek = fields.JSONField()
    argon_params = fields.JSONField()
    encrypted_data = fields.JSONField()

    class Meta:
        table = "users"


UserSchema = pydantic_model_creator(User)
