# This file is part of puppet-panel.
#
# puppet-panel is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# puppet-panel is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with puppet-panel.  If not, see <http://www.gnu.org/licenses/>.

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

# Report transaction (UUID) (i.e. c15dc7ce-ed39-46c1-a031-9009f83abb9e)
report_uuid_regex = r'[a-z0-9-]+'
validate_report_uuid = validators.RegexValidator('^%s$' % report_uuid_regex, _error_message % report_uuid_regex, 'invalid')
