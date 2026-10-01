from marshmallow import Schema, fields, validate


class UpdateProfileSchema(Schema):
    full_name = fields.Str(validate=validate.Length(min=2, max=120))
    phone = fields.Str(validate=validate.Length(max=30))
    address = fields.Str(validate=validate.Length(max=255))