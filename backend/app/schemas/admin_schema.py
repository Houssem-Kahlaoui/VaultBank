
from marshmallow import Schema, fields, validate


class CreateUserSchema(Schema):
    full_name = fields.Str(required=True, validate=validate.Length(min=2, max=120))
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=6, max=128))
    role = fields.Str(
        required=True,
        validate=validate.OneOf(['customer', 'gestionnaire', 'admin'])
    )
    phone = fields.Str(load_default='', validate=validate.Length(max=30))
    address = fields.Str(load_default='', validate=validate.Length(max=255))


class CreditAccountSchema(Schema):
    amount = fields.Float(required=True, validate=validate.Range(min=1))
    description = fields.Str(load_default='Dépôt administratif', validate=validate.Length(max=255))