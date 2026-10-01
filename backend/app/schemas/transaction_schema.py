
from marshmallow import Schema, fields, validate


class TransferSchema(Schema):
    from_account_id = fields.Int(required=True)
    to_account_number = fields.Str(required=True, validate=validate.Length(min=5, max=20))
    amount = fields.Float(required=True, validate=validate.Range(min=1))
    description = fields.Str(load_default='', validate=validate.Length(max=255))