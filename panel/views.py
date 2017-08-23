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

from django import shortcuts
from django.contrib.auth.models import User
from django.views.generic.base import TemplateView
import django_rest_apikey
from rest_framework import mixins, response, status, viewsets
from rest_framework.generics import GenericAPIView

import generics
import serializers

# Web interface "static" files
class ConfigView(TemplateView):
  template_name = 'config.json'

class IndexView(TemplateView):
  template_name = 'index.html'

# Users administration
class UserViewSet(viewsets.ModelViewSet):
  serializer_class = serializers.UserSerializer
  lookup_field = 'username'
  lookup_value_regex = '[\w.@+-]+'
  queryset = User.objects.all()

class UserApiKeyViewSet(generics.NestedModelViewSet, django_rest_apikey.views.APIKeyViewSet):
  # Nested object attributes
  parent_kwargs_lookup = 'user'
  parent_unique_field = 'username'
  nested_parent_field = 'user_id'
  nested_unique_field = 'key'
  model_parent = User
  model_nested = django_rest_apikey.models.APIKey

class UserPasswordViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
  serializer_class = serializers.PasswordSerializer

  def create(self, request, *args, **kwargs):
    # Validate password
    serializer = self.get_serializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    # Get the user
    user = shortcuts.get_object_or_404(User.objects.all(), username=kwargs['user__username'])

    # Update password
    user.set_password(serializer.data['password'])
    user.save()

    # Return result
    return response.Response(status=status.HTTP_204_NO_CONTENT)
