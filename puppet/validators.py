from django.core import validators

_error_message = 'Characters must match regex %s'

# Group names (i.e. My-Model_123)
group_name_regex = r'[\w-]+'
validate_group_name = validators.RegexValidator('^%s$' % group_name_regex, _error_message % group_name_regex, 'invalid')

# Node names (i.e. my-domain.123.tld)
node_name_regex = r'[a-zA-Z0-9.-]+'
validate_node_name = validators.RegexValidator('^%s$' % node_name_regex, _error_message % node_name_regex, 'invalid')

# Parameter names (i.e. my_parameter::name-1.0)
parameter_name_regex = r'[\w:.-]+'
validate_parameter_name = validators.RegexValidator('^%s$' % parameter_name_regex, _error_message % parameter_name_regex, 'invalid')

# Class names (i.e. my_module::my_class)
class_name_regex = r'[\w:]+'
validate_class_name = validators.RegexValidator('^%s$' % class_name_regex, _error_message % class_name_regex, 'invalid')
