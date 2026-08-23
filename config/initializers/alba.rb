# Alba powers the /api/v1 serializers (app/serializers/api/v1/*). The SPA
# consumes camelCase JSON, so serializers declare snake_case Ruby attributes
# and transform the keys on the way out; that needs a real inflector.
Alba.inflector = :active_support
