
from marshmallow import Schema, fields, validate


class LoanRequestSchema(Schema):
    amount = fields.Float(required=True, validate=validate.Range(min=10000, max=10000000))
    duration_months = fields.Int(required=True, validate=validate.Range(min=1, max=360))
    purpose = fields.Str(load_default='', validate=validate.Length(max=255))