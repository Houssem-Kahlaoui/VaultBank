from marshmallow import Schema, fields, validate, ValidationError


class RegisterSchema(Schema):
    full_name = fields.Str(required=True, validate=validate.Length(min=2, max=120))
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=6, max=128))
    phone = fields.Str(load_default='', validate=validate.Length(max=30))
    address = fields.Str(load_default='', validate=validate.Length(max=255))


class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True)


class ChangePasswordSchema(Schema):
    current_password = fields.Str(required=True)
    new_password = fields.Str(required=True, validate=validate.Length(min=6, max=128))


def validate_schema(schema_class, data):

    try:
        return schema_class().load(data), None
    except ValidationError as err:
        # Return first error message
        first_field = next(iter(err.messages))
        first_msg = err.messages[first_field]
        if isinstance(first_msg, list):
            first_msg = first_msg[0]
        return None, f'{first_field}: {first_msg}'