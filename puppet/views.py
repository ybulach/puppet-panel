from django import shortcuts
from rest_framework import viewsets

import models
import serializers
import validators

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
                raise ValidationError({self.parent_unique_field: 'Object with this %s already exists.' % self.parent_unique_field})

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

# Classes
class ClassViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.ClassSerializer
    lookup_value_regex = validators.class_name_regex
    queryset = models.Class.objects.all()

# Nodes
class NodeViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.NodeSerializer
    lookup_value_regex = validators.node_name_regex
    queryset = models.Node.objects.all()

class NodeParameterViewSet(NestedModelViewSet):
    serializer_class = serializers.NodeParameterSerializer
    lookup_field = 'name'
    lookup_value_regex = validators.parameter_name_regex

    # Nested object attributes
    parent_kwargs_lookup = 'node'
    parent_unique_field = 'pk'
    nested_parent_field = 'node_id'
    nested_unique_field = 'name'
    model_parent = models.Node
    model_nested = models.NodeParameter

# Groups
class GroupViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.GroupSerializer
    lookup_value_regex = validators.group_name_regex
    queryset = models.Group.objects.all()

class GroupParameterViewSet(NestedModelViewSet):
    serializer_class = serializers.GroupParameterSerializer
    lookup_field = 'name'
    lookup_value_regex = validators.parameter_name_regex

    # Nested object attributes
    parent_kwargs_lookup = 'group'
    parent_unique_field = 'pk'
    nested_parent_field = 'group_id'
    nested_unique_field = 'name'
    model_parent = models.Group
    model_nested = models.GroupParameter
