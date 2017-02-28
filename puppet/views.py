from django import shortcuts
from django.conf import settings
import pypuppetdb
from rest_framework import exceptions, mixins, response, status, viewsets
import rest_framework.serializers
import requests.exceptions

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

# Classes
class ClassViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.ClassSerializer
    lookup_value_regex = validators.class_name_regex
    queryset = models.Class.objects.all()

class ClassNestedViewSet(ManyToManyNestedViewSet):
    # Overwrite this attributes
    parent_kwargs = 'mymodel'
    parent_field = 'name'
    model_parent = None

    # Default attributes
    serializer_class = serializers.ClassSerializer
    lookup_field = 'name'
    lookup_value_regex = validators.class_name_regex

    # Nested object attributes
    nested_field = 'classes'
    model_nested = models.Class

# Reports
class ReportViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = serializers.ReportSerializer
    lookup_field = 'transaction'
    lookup_value_regex = validators.report_uuid_regex

    # Get the connection to PuppetDB API
    def get_report(self, transaction):
        try:
            db = pypuppetdb.connect(host=settings.PUPPETDB_HOST, port=settings.PUPPETDB_PORT)
            return db.report(transaction)
        except Exception as e:
            if isinstance(e, requests.exceptions.HTTPError) and e.response.status_code == 404:
                return []
            raise exceptions.APIException('Can\'t get report from PuppetDB: %s' % e)

    # Get one report
    def retrieve(self, request, *args, **kwargs):
        try:
            db = pypuppetdb.connect(host=settings.PUPPETDB_HOST, port=settings.PUPPETDB_PORT)
            query = pypuppetdb.QueryBuilder.EqualsOperator('transaction_uuid', kwargs[self.lookup_field])
            report = db.reports(query=query).next()
        except Exception as e:
            if isinstance(e, requests.exceptions.HTTPError) and e.response.status_code == 404:
                raise
            raise exceptions.APIException('Can\'t get report from PuppetDB: %s' % e)

        # Return result
        serializer = self.get_serializer(report)
        return response.Response(serializer.data)

# Groups
class GroupViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.GroupSerializer
    lookup_field = 'name'
    lookup_value_regex = validators.group_name_regex
    queryset = models.Group.objects.all()

class GroupParameterViewSet(NestedModelViewSet):
    serializer_class = serializers.GroupParameterSerializer
    lookup_field = 'name'
    lookup_value_regex = validators.parameter_name_regex

    # Nested object attributes
    parent_kwargs_lookup = 'group'
    parent_unique_field = 'name'
    nested_parent_field = 'group_id'
    nested_unique_field = 'name'
    model_parent = models.Group
    model_nested = models.GroupParameter

class GroupClassViewSet(ClassNestedViewSet):
    parent_kwargs = 'group'
    parent_field = 'name'
    model_parent = models.Group

class GroupGroupViewSet(ManyToManyNestedViewSet):
    # Default attributes
    serializer_class = serializers.GroupSerializer
    lookup_field = 'name'
    lookup_value_regex = validators.group_name_regex

    # Nested object attributes
    parent_kwargs = 'group'
    parent_field = 'name'
    nested_field = 'parents'
    model_parent = models.Group
    model_nested = models.Group

# Nodes
class NodeViewSet(viewsets.ModelViewSet):
    lookup_field = 'name'
    lookup_value_regex = validators.node_name_regex
    queryset = models.Node.objects.all()

    def get_serializer_class(self):
        if self.action in ['retrieve']:
            return serializers.NodeSerializer_Full
        else:
            return serializers.NodeSerializer_Light

class NodeParameterViewSet(NestedModelViewSet):
    serializer_class = serializers.NodeParameterSerializer
    lookup_field = 'name'
    lookup_value_regex = validators.parameter_name_regex

    # Nested object attributes
    parent_kwargs_lookup = 'node'
    parent_unique_field = 'name'
    nested_parent_field = 'node_id'
    nested_unique_field = 'name'
    model_parent = models.Node
    model_nested = models.NodeParameter

class NodeClassViewSet(ClassNestedViewSet):
    parent_kwargs = 'node'
    parent_field = 'name'
    model_parent = models.Node

class NodeGroupViewSet(ManyToManyNestedViewSet):
    # Default attributes
    serializer_class = serializers.GroupSerializer
    lookup_field = 'name'
    lookup_value_regex = validators.group_name_regex

    # Nested object attributes
    parent_kwargs = 'node'
    parent_field = 'name'
    nested_field = 'groups'
    model_parent = models.Node
    model_nested = models.Group
