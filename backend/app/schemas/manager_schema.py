
from marshmallow import Schema, fields, validate


class ApproveSchema(Schema):
    comment = fields.Str(load_default='', validate=validate.Length(max=255))


class RejectSchema(Schema):
    comment = fields.Str(required=True, validate=validate.Length(min=1, max=255))