from datetime import datetime, timedelta
from django import http, shortcuts
import pypuppetdb
from rest_framework import exceptions, mixins, response, status, viewsets
import rest_framework.serializers
import requests.exceptions

import models
import serializers
import utils
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
    lookup_field = 'name'
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
class ReportViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    lookup_field = 'transaction'
    lookup_value_regex = validators.report_uuid_regex

    # List reports of the last hour
    def list(self, request, *args, **kwargs):
        try:
            db = utils.puppetdb_connect()
            query = pypuppetdb.QueryBuilder.GreaterEqualOperator('start_time', (datetime.today() - timedelta(hours=1)).strftime("%Y-%m-%d %H:%M:%S"))
            reports = db.reports(query=query)
        except Exception as e:
            if isinstance(e, StopIteration):
                raise http.Http404()
            raise exceptions.APIException('Can\'t get latest reports from PuppetDB: %s' % e)

        # Return result
        serializer = serializers.ReportSerializer_Light(reports, many=True)
        return response.Response(serializer.data)

    # Get one report
    def retrieve(self, request, *args, **kwargs):
        try:
            db = utils.puppetdb_connect()
            query = pypuppetdb.QueryBuilder.EqualsOperator('transaction_uuid', kwargs[self.lookup_field])
            report = db.reports(query=query).next()
        except Exception as e:
            if isinstance(e, StopIteration):
                raise http.Http404()
            raise exceptions.APIException('Can\'t get report from PuppetDB: %s' % e)

        # Return result
        serializer = serializers.ReportSerializer_Full(report)
        return response.Response(serializer.data)

# Parameters (global listing)
class ParameterViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    def list(self, request, *args, **kwargs):
        # Get node and group parameters
        nodeparameters = [{
            'name': parameter.name,
            'group': '',
            'node': parameter.node.name,
            'value': parameter.value if not parameter.encrypted else '',
            'encrypted': parameter.encrypted
        } for parameter in models.NodeParameter.objects.all()]

        groupparameters = [{
            'name': parameter.name,
            'group': parameter.group.name,
            'node': '',
            'value': parameter.value if not parameter.encrypted else '',
            'encrypted': parameter.encrypted
        } for parameter in models.GroupParameter.objects.all()]

        # Return combined result
        serializer = serializers.ParameterSerializer(nodeparameters + groupparameters, many=True)
        return response.Response(serializer.data)

# Groups
class GroupViewSet(viewsets.ModelViewSet):
    lookup_field = 'name'
    lookup_value_regex = validators.group_name_regex
    queryset = models.Group.objects.all()

    def get_serializer_class(self):
        if self.action in ['retrieve', 'create', 'update', 'partial_update']:
            return serializers.GroupSerializer_Full
        else:
            return serializers.GroupSerializer_Light

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
    serializer_class = serializers.GroupSerializer_Light
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
        if self.action in ['retrieve', 'create', 'update', 'partial_update']:
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
    serializer_class = serializers.GroupSerializer_Light
    lookup_field = 'name'
    lookup_value_regex = validators.group_name_regex

    # Nested object attributes
    parent_kwargs = 'node'
    parent_field = 'name'
    nested_field = 'groups'
    model_parent = models.Node
    model_nested = models.Group

class NodeEncViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = serializers.NodeSerializer_Enc

    # Iter a node/group (and his parents) and return classes and parameters
    def iter_object(self, obj, past_objects):
        classes = []
        parameters = {}

        # Prevent infinite loop
        if obj.name in past_objects:
            return (classes, parameters, past_objects)
        past_objects.append(obj.name)

        # Local classes and parameters
        for cls in obj.classes.all():
            classes.append(cls)

        for parameter in obj.parameters.all():
            parameters[parameter.name] = parameter

        # Parent objects
        parents = obj.groups if hasattr(obj, 'groups') else obj.parents
        for parent in parents.all():
            parent_classes, parent_parameters, past_objects = self.iter_object(parent, past_objects)

            # Current parent classes and parameters
            for cls in parent_classes:
                if not cls in classes:
                    classes.append(cls)

            for name, parameter in parent_parameters.iteritems():
                if not name in parameters:
                    parameters[name] = parameter

        # Return result
        return (classes, parameters, past_objects)

    # Get the ENC datas on a node (including recursive lookup of parameters/classes)
    def list(self, request, *args, **kwargs):
        # Get the node
        node = shortcuts.get_object_or_404(models.Node.objects.all(), name=self.kwargs['node__name'])

        # Iter the node and the groups
        classes, parameters, past_objects = self.iter_object(node, [])

        # Return result
        serializer = self.get_serializer({'classes': classes, 'parameters': parameters.values()})
        return response.Response(serializer.data)

# Orphans
class OrphanViewSet(mixins.ListModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    serializer_class = serializers.OrphanSerializer
    lookup_field = 'name'
    lookup_value_regex = validators.node_name_regex

    # Get the orphans from PuppetDB and PuppetCA
    def get_orphans(self):
        orphans = {}

        # PuppetDB orphans
        try:
            db = utils.puppetdb_connect()

            for node in db.nodes():
                if node.deactivated: continue

                try:
                    models.Node.objects.get(name=node)
                except models.Node.DoesNotExist:
                    orphans[node.name] = {
                        'name': node.name,
                        'source': 'PuppetDB'
                    }
        except Exception as e:
            raise exceptions.APIException('Can\'t get orphan nodes from PuppetDB: %s' % e)

        # PuppetCA orphans
        try:
            ca = utils.puppetca_query('GET', 'certificate_statuses/*')

            for node in ca.json():
                try:
                    models.Node.objects.get(name=node['name'])
                except models.Node.DoesNotExist:
                    if node['name'] in orphans:
                        orphans[node['name']]['source'] += ' & PuppetCA'
                    else:
                        orphans[node['name']] = {
                            'name': node['name'],
                            'source': 'PuppetCA'
                        }
        except Exception as e:
            raise exceptions.APIException('Can\'t get orphan nodes from PuppetCA: %s' % e)

        return orphans

    # List orphan nodes
    def list(self, request, *args, **kwargs):
        orphans = self.get_orphans()

        # Return result
        serializer = self.get_serializer(orphans.values(), many=True)
        return response.Response(serializer.data)

    # Remove an orphan node
    def destroy(self, request, *args, **kwargs):
        orphans = self.get_orphans()
        if not kwargs['name'] in orphans:
            raise exceptions.NotFound()

        # Delete the orphan in PuppetDB
        try:
            db = utils.puppetdb_deactivate_node(kwargs['name'])
        except Exception as e:
            raise exceptions.APIException('Can\'t deactivate orphan in PuppetDB: %s' % e)

        # Revoke the orphan certificate in PuppetCA (only works if state is not 'requested')
        try:
            utils.puppetca_query('PUT', 'certificate_status/%s' % kwargs['name'], data={'desired_state': 'revoked'})
        except Exception as e:
            if not isinstance(e, requests.exceptions.HTTPError) or not e.response.status_code in [404, 409]:
                raise exceptions.APIException('Can\'t revoke orphan certificate in PuppetCA: %s' % e)

        # Delete the orphan in PuppetCA
        try:
            utils.puppetca_query('DELETE', 'certificate_status/%s' % kwargs['name'])
        except Exception as e:
            if not isinstance(e, requests.exceptions.HTTPError) or e.response.status_code != 404:
                raise exceptions.APIException('Can\'t delete orphan in PuppetCA: %s' % e)

        # Return result
        return response.Response(status=status.HTTP_204_NO_CONTENT)

# Certificates
class CertificateViewSet(mixins.ListModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    lookup_field = 'name'
    lookup_value_regex = validators.node_name_regex

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return serializers.CertificateSerializer_Write
        else:
            return serializers.CertificateSerializer_Read

    # List certificates
    def list(self, request, *args, **kwargs):
        try:
            ca = utils.puppetca_query('GET', 'certificate_statuses/*')
            certificates = ca.json()
        except Exception as e:
            raise exceptions.APIException('Can\'t get certificates from PuppetCA: %s' % e)

        # Return result
        serializer = self.get_serializer(certificates, many=True)
        return response.Response(serializer.data)

    # Update a certificate
    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Revoke certificate
        try:
            utils.puppetca_query('PUT', 'certificate_status/%s' % kwargs['name'], data={'desired_state': '%s' % serializer.data['state']})
        except Exception as e:
            if isinstance(e, requests.exceptions.HTTPError):
                if e.response.status_code == 404:
                    raise exceptions.NotFound()
                if e.response.status_code == 409:
                    raise exceptions.ValidationError({'state': 'Can\'t change certificate state to the specified value'})
            raise exceptions.APIException('Can\'t update certificate in PuppetCA: %s' % e)

        # Return result
        return response.Response(status=status.HTTP_204_NO_CONTENT)

    # Remove a certificate
    def destroy(self, request, *args, **kwargs):
        # Revoke certificate (only works if state is not 'requested')
        try:
            utils.puppetca_query('PUT', 'certificate_status/%s' % kwargs['name'], data={'desired_state': 'revoked'})
        except Exception as e:
            if isinstance(e, requests.exceptions.HTTPError) and e.response.status_code == 404:
                raise exceptions.NotFound()
            if not isinstance(e, requests.exceptions.HTTPError) or e.response.status_code != 409:
                raise exceptions.APIException('Can\'t revoke orphan certificate in PuppetCA: %s' % e)

        # Delete certificate
        try:
            utils.puppetca_query('DELETE', 'certificate_status/%s' % kwargs['name'])
        except Exception as e:
            if isinstance(e, requests.exceptions.HTTPError) and e.response.status_code == 404:
                raise exceptions.NotFound()
            raise exceptions.APIException('Can\'t delete certificate in PuppetCA: %s' % e)

        # Return result
        return response.Response(status=status.HTTP_204_NO_CONTENT)
