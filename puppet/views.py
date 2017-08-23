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

from datetime import datetime, timedelta
from django import http, shortcuts
import pypuppetdb
from rest_framework import exceptions, mixins, response, status, viewsets
import rest_framework.serializers
import requests.exceptions

from panel import generics
import models
import serializers
import utils
import validators

# Classes
class ClassViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.ClassSerializer
    lookup_field = 'name'
    lookup_value_regex = validators.class_name_regex
    queryset = models.Class.objects.all()

class ClassNestedViewSet(generics.ManyToManyNestedViewSet):
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

class GroupParameterViewSet(generics.NestedModelViewSet):
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

class GroupGroupViewSet(generics.ManyToManyNestedViewSet):
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

class NodeParameterViewSet(generics.NestedModelViewSet):
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

class NodeGroupViewSet(generics.ManyToManyNestedViewSet):
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
            self.dedup_classes(classes, parent_classes)
            self.dedup_parameters(parameters, parent_parameters)

        # Return result
        return (classes, parameters, past_objects)

    # Ensure classes are not duplicated in result
    def dedup_classes(self, current_classes, new_classes):
        for cls in new_classes:
            if not cls in current_classes:
                current_classes.append(cls)

    # Ensure parameters are not duplicated in result
    def dedup_parameters(self, current_parameters, new_parameters):
        for name, parameter in new_parameters.iteritems():
            if not name in current_parameters:
                current_parameters[name] = parameter

    # Get the ENC datas on a node (including recursive lookup of parameters/classes)
    def list(self, request, *args, **kwargs):
        # Get the node
        node = shortcuts.get_object_or_404(models.Node.objects.all(), name=self.kwargs['node__name'])

        # Iter the node and the groups
        classes, parameters, past_objects = self.iter_object(node, [])
        self.dedup_classes(classes, classes)
        self.dedup_parameters(parameters, parameters)

        # Iter the default groups
        for group in models.Group.objects.filter(default=True):
            group_classes, group_parameters, past_objects = self.iter_object(group, past_objects)
            self.dedup_classes(classes, group_classes)
            self.dedup_parameters(parameters, group_parameters)

        # Iter the default classes
        default_classes = models.Class.objects.filter(default=True)
        self.dedup_classes(classes, default_classes)

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

# Nodes status
class StatusViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = serializers.StatusSerializer

    # List orphan nodes
    def list(self, request, *args, **kwargs):
        # Get the node with their status
        nodes = serializers.NodeSerializer_Light(models.Node.objects.all(), many=True).data

        # Get a count of each status
        status = {'unchanged': 0, 'changed': 0, 'failed': 0, 'unreported': 0, 'unknown': 0, 'total': 0}
        for node in nodes:
            if node['status'] in status:
                status[node['status']] += 1
            else:
                status['unknown'] += 1
            status['total'] += 1

        # Return result
        serializer = self.get_serializer(status)
        return response.Response(serializer.data)

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
