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
from rest_framework import mixins, response, status, viewsets
import rest_framework.serializers

# A generic view set to be used by nested models (handles parent ID)
class NestedModelViewSet(viewsets.ModelViewSet):
    # Overwrite this attributes
    parent_kwargs_lookup = 'mymodel'
    parent_unique_field = 'name'
    nested_parent_field = 'parent_id'
    nested_unique_field = 'name'
    model_parent = None
    model_nested = None

    # Get the parent
    def get_parent(self):
        return shortcuts.get_object_or_404(
            self.model_parent.objects.all(),
            **{self.parent_unique_field: self.kwargs['%s__%s' % (self.parent_kwargs_lookup, self.parent_unique_field)]}
        )

    # Only return nested objects of the specified parent
    def get_queryset(self):
        parent = self.get_parent()
        parent_field = {self.nested_parent_field: parent.pk}
        return self.model_nested.objects.filter(**parent_field)

    # Add needed parent id to create action
    def create(self, request, *args, **kwargs):
        parent = self.get_parent()
        parent_field = {self.nested_parent_field: parent.pk}
        self.check_object_permissions(request, parent)

        # Manually check for object existance, to prevent IntegrityError exception
        if self.nested_unique_field in request.data:
            nested_field = {self.nested_unique_field: request.data[self.nested_unique_field]}
            nested_field.update(parent_field)
            if self.model_nested.objects.filter(**nested_field).exists():
                raise rest_framework.serializers.ValidationError({self.parent_unique_field: 'Object with this %s already exists.' % self.parent_unique_field})

        # Create, adding the parent id
        new_kwargs = kwargs.copy()
        new_kwargs.update(parent_field)
        return super(NestedModelViewSet, self).create(request, *args, **new_kwargs)

    def perform_create(self, serializer, *args, **kwargs):
        parent = self.get_parent()
        parent_field = {self.nested_parent_field: parent.pk}

        # Save with the parent id
        new_kwargs = kwargs.copy()
        new_kwargs.update(parent_field)
        serializer.save(**new_kwargs)

# A generic view set to be used by nested many to many relations between models (modify the links between the models)
class ManyToManyNestedViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    # Overwrite this attributes
    parent_kwargs = 'mymodel'
    parent_field = 'name'
    nested_field = 'mymodels'
    model_parent = None
    model_nested = None

    # Get the parent
    def get_parent(self):
        return shortcuts.get_object_or_404(
            self.model_parent.objects.all(),
            **{self.parent_field: self.kwargs['%s__%s' % (self.parent_kwargs, self.parent_field)]}
        )

    # List classes of node/group
    def list(self, request, *args, **kwargs):
        parent = self.get_parent()

        # Return result
        serializer = self.get_serializer(getattr(parent, self.nested_field), many=True)
        return response.Response(serializer.data)

    # Add a class
    def create(self, request, *args, **kwargs):
        parent = self.get_parent()

        # Validate provided datas
        if not self.lookup_field in request.data:
            raise rest_framework.serializers.ValidationError({self.lookup_field: 'This attribute must be provided'})

        # Add class
        cls = shortcuts.get_object_or_404(self.model_nested.objects.all(), **{self.lookup_field: request.data[self.lookup_field]})
        if cls in getattr(parent, self.nested_field).all():
            raise rest_framework.serializers.ValidationError({self.lookup_field: 'class with this %s already added' % self.lookup_field})
        getattr(parent, self.nested_field).add(cls)

        # Return result
        serializer = self.get_serializer(cls)
        headers = self.get_success_headers(serializer.data)
        return response.Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    # Remove a class
    def destroy(self, request, *args, **kwargs):
        parent = self.get_parent()

        # Remove class
        cls = shortcuts.get_object_or_404(getattr(parent, self.nested_field).all(), **{self.lookup_field: kwargs[self.lookup_field]})
        getattr(parent, self.nested_field).remove(cls)

        # Return result
        return response.Response(status=status.HTTP_204_NO_CONTENT)
